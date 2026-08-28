import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON (allow up to 50mb for high-res PDF and ticket photos)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Shared Gemini client with lazy initialization
  let genAIClient: GoogleGenAI | null = null;
  function getGenAI(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    if (!genAIClient) {
      genAIClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return genAIClient;
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  // Supplier Ticket / Invoice / PDF Parsing Route with Gemini 3.7 Flash
  app.post("/api/parse-supplier-ticket", async (req, res) => {
    try {
      const { fileBase64, mimeType, customPrompt } = req.body;

      if (!fileBase64) {
        return res.status(400).json({ success: false, error: "fileBase64 is required" });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({ 
          success: false, 
          error: "GEMINI_API_KEY no configurado en el servidor",
          fallbackAvailable: true 
        });
      }

      // Clean base64 string if it contains data URI header
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const validMimeType = mimeType || 'image/jpeg';

      const promptText = `Eres un asistente farmacéutico y contable experto en sistemas de inventario y punto de venta para farmacias y droguerías en México y Latinoamérica.
Tu tarea es leer y extraer con máxima precisión todos los datos de este documento escaneado (factura, nota de remisión, orden de compra, ticket de distribuidora mayorista farmacéutica como RAXO / Generimax, Nadro, Marzam, Fanasa, Saba, Levic, etc.).

La tabla del documento contiene columnas como:
- CANT / CANTIDAD (cantidad de unidades/piezas)
- UNIDAD (Pieza, Caja, Frasco, etc.)
- DESCRIPCION (Nombre comercial y/o genérico del medicamento, concentración y presentación)
- CLAVE (Clave de artículo o código interno del proveedor)
- LABORATORIO (Laboratorio fabricante: ej. Bruluar, Wermar, Novag, Maver, Sons, Amsa, Mavi, Offenbach, Serral, Collins, Biomep, Liferpa, Raam, Loeffler, etc.)
- LOTE (Número de lote de fabricación)
- CAD / CADUCIDAD (Fecha de caducidad: SIEMPRE conviértela a formato ISO YYYY-MM-DD, por ejemplo "18/05/2028" -> "2028-05-18")
- CLAVE SAT (Clave de producto/servicio del SAT mexicano ej: 51101511, 51161800, etc.)
- IVA (Tasa de IVA, 0 o 16% si aplica)
- PRECIO UNITARIO (Costo unitario de compra antes o después de impuestos)
- IMPORTE (Importe total del renglón = Cantidad * Precio Unitario)

Extrae:
1. supplierName: Nombre del emisor / distribuidor mayorista (ej. "RAXO EMPRESARIAL SA DE CV / Generimax", "Marzam", "Nadro", etc.).
2. invoiceNumber: Folio o número de nota de remisión / factura (ej. "A 27135").
3. invoiceDate: Fecha de emisión en formato YYYY-MM-DD.
4. totalAmount: Monto total del documento (ej. 1146.68).
5. items: Lista completa de TODOS los medicamentos y productos listados en la tabla:
   - name: Nombre del medicamento con concentración (ej: "DIMOPEN 500 MG C/12 CAP", "ROSEL T C/15 TAB", "NIPRESOL 100MG C/20 TAB").
   - code: Clave del producto o SKU (ej. "355", "1829", "280").
   - barcode: Código de barras si viene impreso o déjalo vacío "" si no aparece.
   - quantity: Cantidad de piezas/unidades (número).
   - unitOfMeasure: Unidad de medida (ej. "Pieza", "Caja", "Frasco").
   - laboratory: Nombre del laboratorio fabricante (ej. "BRULUAR", "WERMAR", "MAVER", "SONS", "AMSA").
   - batchNumber: Número de lote exacto (ej. "6050714", "251250").
   - expirationDate: Fecha de caducidad en formato YYYY-MM-DD (ej. "2028-05-18").
   - satCode: Clave SAT si aparece (ej. "51101511").
   - costPrice: Precio unitario de costo (ej. 20.43).
   - suggestedSellingPrice: Precio de venta al público sugerido con margen farmacéutico estándar del 35% al 45% sobre el costo (ej: costPrice * 1.40).
   - totalImport: Importe total del renglón (ej. 40.86).
   - presentation: Presentación (ej. "Caja con 12 cápsulas", "Frasco 120ml").
   - category: Categoría sugerida ("Analgésicos", "Antibióticos", "Gastrointestinal", "Respiratorio", "Dermatología", "Material de Curación", "Suplementos", "Otro").
   - department: "farmacia", "bebidas", "dulces", "botanas", "higiene", u "otros".
   - prescriptionRequired: true si es antibiótico o controlado; false si es libre venta / OTC.

${customPrompt ? `Instrucciones adicionales del usuario: ${customPrompt}` : ''}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: validMimeType,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              supplierName: { type: Type.STRING },
              invoiceNumber: { type: Type.STRING },
              invoiceDate: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    barcode: { type: Type.STRING },
                    code: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitOfMeasure: { type: Type.STRING },
                    laboratory: { type: Type.STRING },
                    batchNumber: { type: Type.STRING },
                    expirationDate: { type: Type.STRING },
                    satCode: { type: Type.STRING },
                    costPrice: { type: Type.NUMBER },
                    suggestedSellingPrice: { type: Type.NUMBER },
                    totalImport: { type: Type.NUMBER },
                    presentation: { type: Type.STRING },
                    category: { type: Type.STRING },
                    department: { type: Type.STRING },
                    prescriptionRequired: { type: Type.BOOLEAN },
                  },
                  required: ["name", "quantity", "costPrice"],
                },
              },
            },
            required: ["items"],
          },
        },
      });

      const rawJson = response.text || "{}";
      const parsedData = JSON.parse(rawJson);

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error("Error parsing supplier ticket with Gemini:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al procesar el documento con IA",
        fallbackAvailable: true,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
