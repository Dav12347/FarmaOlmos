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

      const promptText = `Eres un asistente farmacéutico y contable experto en sistemas de inventario y punto de venta para farmacias y droguerías.
Tu tarea es leer y extraer con máxima precisión todos los datos de este ticket, nota de remisión, orden de compra o factura en PDF/imagen de un distribuidor mayorista farmacéutico o comercial (ej. Nadro, Marzam, Fanasa, Saba, Farmacias de Genéricos, Costco, Sam's, etc.).

Extrae:
1. supplierName: Nombre de la distribuidora / proveedor / mayorista que emite el ticket o factura.
2. invoiceNumber: Folio o número de remisión / factura / ticket de compra.
3. invoiceDate: Fecha de la compra o emisión en formato YYYY-MM-DD si es identificable, o texto.
4. totalAmount: Monto total pagado o facturado en la compra (número).
5. items: Lista exhaustiva de TODOS los productos / medicamentos surtidos en el documento. Para cada uno:
   - name: Nombre comercial y/o genérico claro, con concentración y presentación breve (ej: "Paracetamol 500mg c/20 tabs", "Amoxicilina + Ác. Clavulánico 500/125mg", "Ibuprofeno 400mg", "Electrolit Fresa 625ml", "Coca Cola 600ml", "Algodón Plisado 50g").
   - barcode: Código de barras si viene impreso (EAN-13, UPC) o déjalo vacío "" si no aparece.
   - code: Clave de artículo o SKU del proveedor o inventario si aparece.
   - quantity: Cantidad de piezas, cajas o paquetes recibidos (número positivo).
   - costPrice: Precio unitario de costo / compra por pieza o caja (número).
   - suggestedSellingPrice: Precio de venta al público sugerido (si no viene explícito en el ticket, calcula un margen de ganancia estándar del 35% al 45% sobre el costo: costPrice * 1.40).
   - batchNumber: Número de lote / serie si viene impreso en la factura.
   - expirationDate: Fecha de caducidad en formato YYYY-MM-DD si viene en la factura.
   - presentation: Presentación (ej: "Caja con 20 tabletas", "Frasco 120ml", "Botella 600ml", "Pieza").
   - unitOfMeasure: Unidad de medida ("Caja", "Pieza", "Botella", "Frasco", "Tabletas", "Paquete", "Blíster", etc.).
   - category: Categoría sugerida ("Analgésicos", "Antibióticos", "Gastrointestinal", "Respiratorio", "Dermatología", "Material de Curación", "Suplementos", "Bebidas y Aguas", "Dulces y Golosinas", "Botanas y Snacks", "Cuidado e Higiene", "Otro").
   - department: Uno de estos valores exactos: "farmacia", "bebidas", "dulces", "botanas", "higiene", "otros".
   - prescriptionRequired: true si es antibiótico, psicotrópico o requiere receta médica obligatoria; false si es analgésico OTC, material de curación o libre venta.

${customPrompt ? `Instrucciones adicionales del farmacéutico: ${customPrompt}` : ''}`;

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
                    costPrice: { type: Type.NUMBER },
                    suggestedSellingPrice: { type: Type.NUMBER },
                    batchNumber: { type: Type.STRING },
                    expirationDate: { type: Type.STRING },
                    presentation: { type: Type.STRING },
                    unitOfMeasure: { type: Type.STRING },
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
