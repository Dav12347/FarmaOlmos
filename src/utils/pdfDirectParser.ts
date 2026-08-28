import * as pdfjsLib from 'pdfjs-dist';
import { SupplierTicketItem, ProductDepartment, Product } from '../types/pharmacy';

// Configure pdfjs worker to reliable CDN
try {
  // @ts-ignore
  if (pdfjsLib.GlobalWorkerOptions) {
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('PDF Worker setup fallback:', e);
}

export interface DirectPdfParseResult {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  rawText: string;
  lines: string[];
  items: SupplierTicketItem[];
}

/**
 * Extracts raw text items with coordinates from PDF pages
 */
export async function extractTextFromPdfArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group items by vertical position (Y coordinate) to preserve row structure
      const itemsByY: { [y: number]: { x: number; text: string }[] } = {};
      
      textContent.items.forEach((item: any) => {
        if (!item.str || item.str.trim() === '') return;
        
        // Approximate Y coordinate rounding by 3 points to group inline words
        const y = Math.round(item.transform[5] / 3) * 3;
        const x = item.transform[4];
        
        if (!itemsByY[y]) {
          itemsByY[y] = [];
        }
        itemsByY[y].push({ x, text: item.str });
      });

      // Sort lines top to bottom (higher Y in PDF coordinates is near the top of the page)
      const sortedY = Object.keys(itemsByY)
        .map(Number)
        .sort((a, b) => b - a);

      sortedY.forEach(y => {
        // Sort words left to right
        const words = itemsByY[y].sort((a, b) => a.x - b.x).map(w => w.text.trim());
        const lineText = words.join(' ').trim();
        if (lineText) {
          allLines.push(lineText);
        }
      });
    }

    return allLines;
  } catch (err: any) {
    console.error('Error parsing PDF text natively:', err);
    throw new Error(`No se pudo leer el contenido del PDF directamente: ${err.message}`);
  }
}

/**
 * Direct deterministic parser for Mexican pharmaceutical invoices & tickets
 */
export function parseInvoiceLinesDirectly(
  lines: string[], 
  catalogProducts: Product[] = []
): DirectPdfParseResult {
  let supplierName = '';
  let invoiceNumber = '';
  let invoiceDate = new Date().toISOString().split('T')[0];
  let totalAmount = 0;
  const rawText = lines.join('\n');
  const items: SupplierTicketItem[] = [];

  const KNOWN_LABS = [
    'BRULUAR', 'WERMAR', 'NOVAG', 'MAVER', 'SONS', 'AMSA', 'MAVI', 
    'OFFENBACH', 'SERRAL', 'COLLINS', 'BIOMEP', 'LIFERPAL', 'RAAM', 
    'LOEFFLER', 'ULTRA', 'MEDLEY', 'KENER', 'GENOMMA', 'PFIZER', 
    'BAYER', 'SANOFI', 'ALPHARMA', 'CHINOIN', 'SENOSIAIN', 'BUSSIE'
  ];

  // 1. Detect Supplier and Header info from top 25 lines
  const headerLines = lines.slice(0, 25);
  for (const line of headerLines) {
    const lower = line.toLowerCase();
    
    // Detect Supplier
    if (!supplierName) {
      if (lower.includes('raxo') || lower.includes('generimax') || lower.includes('genericos intercambiables') || lower.includes('generamos más')) {
        supplierName = 'RAXO EMPRESARIAL SA DE CV / Generimax';
      } else if (lower.includes('marzam')) {
        supplierName = 'Marzam Distribución Farmacéutica S.A. de C.V.';
      } else if (lower.includes('nadro')) {
        supplierName = 'Nadro S.A.P.I. de C.V.';
      } else if (lower.includes('fanasa') || lower.includes('nacional de drogas')) {
        supplierName = 'Fármacos Nacionales (Fanasa)';
      } else if (lower.includes('saba')) {
        supplierName = 'Distribuidora Saba Farma';
      } else if (lower.includes('levic')) {
        supplierName = 'Laboratorios Levic S.A. de C.V.';
      } else if (lower.includes('costco')) {
        supplierName = 'Costco Wholesale México';
      } else if (lower.includes('sam\'s') || lower.includes('sams')) {
        supplierName = 'Sam\'s Club México';
      } else if (lower.includes('droguería') || lower.includes('drogueria') || lower.includes('distribuidora') || lower.includes('farmaceutica') || lower.includes('laboratorios')) {
        supplierName = line.trim();
      }
    }

    // Detect Invoice / Remission Number
    if (!invoiceNumber) {
      const matchFolio = line.match(/(?:factura|folio|remisi[oó]n|ticket|nota|docto|fac|f-)\s*[:#.]?\s*([A-Z0-9\s-]{3,20})/i);
      if (matchFolio && matchFolio[1]) {
        invoiceNumber = matchFolio[1].trim();
      }
    }

    // Detect Date
    const matchDate = line.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/);
    if (matchDate) {
      const dateStr = matchDate[0];
      if (dateStr.includes('-') && dateStr.length === 10 && dateStr.startsWith('20')) {
        invoiceDate = dateStr;
      } else {
        const parts = dateStr.split(/[-/.]/);
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            // DD/MM/YYYY
            const y = parts[2];
            const m = parts[1].padStart(2, '0');
            const d = parts[0].padStart(2, '0');
            invoiceDate = `${y}-${m}-${d}`;
          } else if (parts[0].length === 4) {
            // YYYY/MM/DD
            invoiceDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        }
      }
    }
  }

  if (!supplierName && lines.length > 0) {
    supplierName = lines[0].slice(0, 50).trim();
  }

  // 2. Identify Total Amount
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
    const line = lines[i];
    const matchTotal = line.match(/total\s*(?:a\s*pagar|neto|general)?\s*[:$]?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (matchTotal && matchTotal[1]) {
      const val = parseFloat(matchTotal[1].replace(/,/g, ''));
      if (val > 0) {
        totalAmount = val;
        break;
      }
    }
  }

  // 3. Extract Products/Items from lines using Multi-Line and Single-Line scanning
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    const lower = line.toLowerCase();
    // Skip general header & footer noise
    if (
      lower.startsWith('página') || lower.startsWith('pagina') || 
      lower.startsWith('rfc:') || lower.startsWith('dirección:') || 
      lower.startsWith('direccion:') || lower.startsWith('tel:') || 
      lower.startsWith('cant. articulo') || lower.startsWith('cant articulo') || 
      lower.startsWith('cant.') || lower.startsWith('subtotal') || 
      lower.startsWith('iva ') || lower.startsWith('total ') || 
      lower.startsWith('importe:') || lower.startsWith('descuento:') ||
      lower.startsWith('importe con letra') || lower.startsWith('lugar y fecha') ||
      lower.startsWith('generamos más') || lower.startsWith('plaza capuchinas') ||
      lower.startsWith('col. loma') || lower.startsWith('allende #') ||
      lower.startsWith('centro del.') || lower.startsWith('acambay')
    ) {
      i++;
      continue;
    }

    // Pattern A: Generimax / Raxo style row with quantities and prices
    const generimaxHeaderMatch = line.match(/^(\d{1,4})\s+(\d{2,8})\s+(\d+(?:\.\d{1,2})?)\s*\$?\s*(\d+(?:\.\d{1,2})?)/);
    
    if (generimaxHeaderMatch) {
      const quantity = parseInt(generimaxHeaderMatch[1], 10);
      const skuCode = generimaxHeaderMatch[2];
      const costPrice = parseFloat(generimaxHeaderMatch[3]);
      const lineImport = parseFloat(generimaxHeaderMatch[4]) || (quantity * costPrice);
      
      let name = '';
      let batchNumber = '';
      let expirationDate = '';
      let laboratory = '';

      // Lookahead next 1-3 lines for Description and Lote/Caducidad
      let lookaheadIdx = i + 1;
      while (lookaheadIdx < lines.length && lookaheadIdx <= i + 3) {
        const nextLine = lines[lookaheadIdx].trim();
        const nextLower = nextLine.toLowerCase();

        // Check if nextLine is a new row or total footer
        if (
          nextLine.match(/^(\d{1,4})\s+(\d{2,8})\s+(\d+(?:\.\d{1,2})?)/) ||
          nextLower.startsWith('importe:') || nextLower.startsWith('subtotal') ||
          nextLower.startsWith('total') || nextLower.startsWith('iva')
        ) {
          break;
        }

        // Check if nextLine contains Lote / Caducidad
        if (nextLower.includes('lote') || nextLower.includes('caducidad') || nextLower.includes('cad:') || nextLower.includes('exp:')) {
          const loteMatch = nextLine.match(/lote\s*[:#.]?\s*([A-Z0-9-]{3,18})/i);
          if (loteMatch) {
            batchNumber = loteMatch[1].trim();
          }
          const cadMatch = nextLine.match(/(?:caducidad|cad|venc|exp)\s*[:#.]?\s*(\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{2,4}|\d{2}[-/.]\d{4}|\d{6,8})/i);
          if (cadMatch) {
            expirationDate = cadMatch[1].trim();
          }
        } else if (!name && nextLine.length > 2) {
          name = nextLine;
          for (const lab of KNOWN_LABS) {
            if (name.toUpperCase().includes(lab)) {
              laboratory = lab;
              break;
            }
          }
        }

        lookaheadIdx++;
      }

      if (!name) {
        name = `Artículo Clave ${skuCode}`;
      }

      let matchedProd = catalogProducts.find(p => p.code && p.code.toLowerCase() === skuCode.toLowerCase());
      if (!matchedProd) {
        matchedProd = catalogProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
      }

      const finalCode = matchedProd ? matchedProd.code : skuCode;
      let sellingPrice = Number((costPrice * 1.40).toFixed(2));
      if (matchedProd && matchedProd.sellingPrice > 0) {
        sellingPrice = matchedProd.sellingPrice;
      }

      let category = 'Medicamentos';
      let department: ProductDepartment = 'farmacia';
      const lowerName = name.toLowerCase();

      if (lowerName.includes('omeprazol') || lowerName.includes('ranitidina') || lowerName.includes('pantoprazol')) {
        category = 'Gastrointestinal';
      } else if (lowerName.includes('clamoxin') || lowerName.includes('amoxicilina') || lowerName.includes('ampicilina') || lowerName.includes('cefalexina') || lowerName.includes('dimopen') || lowerName.includes('susp')) {
        category = 'Antibióticos';
      } else if (lowerName.includes('embarazo') || lowerName.includes('exactitest') || lowerName.includes('quickly') || lowerName.includes('prueba')) {
        category = 'Pruebas y Diagnóstico';
      } else if (lowerName.includes('ciclobenzaprina') || lowerName.includes('clonix') || lowerName.includes('paracetamol') || lowerName.includes('ibuprofeno') || lowerName.includes('brudifen')) {
        category = 'Analgésicos y Relajantes';
      } else if (lowerName.includes('aceite') || lowerName.includes('romero') || lowerName.includes('canela')) {
        category = 'Cuidado Personal y Herbolaria';
      }

      items.push({
        id: `gen-item-${items.length}-${Date.now()}`,
        name: matchedProd ? matchedProd.name : name,
        barcode: matchedProd ? matchedProd.barcode : '',
        code: finalCode,
        quantity: Math.max(1, quantity),
        costPrice: costPrice,
        suggestedSellingPrice: sellingPrice,
        batchNumber: batchNumber || (matchedProd?.batchNumber || ''),
        expirationDate: expirationDate || (matchedProd?.expirationDate || ''),
        presentation: matchedProd?.presentation || (lowerName.includes('susp') ? 'Suspensión' : lowerName.includes('cap') ? 'Cápsulas' : 'Pieza'),
        unitOfMeasure: matchedProd?.unitOfMeasure || (lowerName.includes('susp') ? 'Frasco' : lowerName.includes('cap') ? 'Caja' : 'Pieza'),
        category: matchedProd?.category || category,
        department: matchedProd ? matchedProd.department : department,
        laboratory: laboratory || (matchedProd?.laboratory || ''),
        totalImport: lineImport,
        prescriptionRequired: matchedProd ? matchedProd.prescriptionRequired : (category === 'Antibióticos'),
        matchedProductId: matchedProd ? matchedProd.id : undefined,
        isNewProduct: !matchedProd,
      });

      i = lookaheadIdx;
      continue;
    }

    // Pattern B: Single line product (e.g. with quantities and costs)
    if (/\d/.test(line) && line.length >= 8 && !line.toLowerCase().includes('lote') && !line.toLowerCase().includes('caducidad')) {
      let quantity = 1;
      let costPrice = 0;
      let barcode = '';
      let code = '';
      let batchNumber = '';
      let expirationDate = '';
      let laboratory = '';
      let name = line;

      for (const lab of KNOWN_LABS) {
        if (name.toUpperCase().includes(lab)) {
          laboratory = lab;
          break;
        }
      }

      // Detect Barcode (8 to 14 digits)
      const matchBarcode = line.match(/\b(750\d{10}|\d{8,14})\b/);
      if (matchBarcode) {
        barcode = matchBarcode[0];
        name = name.replace(barcode, ' ');
      }

      // Detect Batch / Lote
      const matchLote = line.match(/(?:lote|lot|l-)\s*[:#.]?\s*([A-Z0-9-]{3,15})/i);
      if (matchLote) {
        batchNumber = matchLote[1].trim();
        name = name.replace(matchLote[0], ' ');
      }

      // Detect Expiration Date
      const matchExp = line.match(/(?:cad|venc|exp|caducidad)\s*[:#.]?\s*(\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{4}|\d{2}[-/.]\d{2}[-/.]\d{2,4})/i);
      if (matchExp) {
        expirationDate = matchExp[1].trim();
        name = name.replace(matchExp[0], ' ');
      }

      // Extract all money/number tokens in line
      const numMatches = line.match(/(\b\d+(?:,\d{3})*(?:\.\d{1,2})?\b)/g) || [];
      const numbers = numMatches.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));

      if (numbers.length >= 2) {
        const possibleQtys = numbers.filter(n => Number.isInteger(n) && n >= 1 && n <= 5000);
        const possiblePrices = numbers.filter(n => n > 0 && n < 50000 && (!Number.isInteger(n) || n > 5));

        if (possibleQtys.length > 0) quantity = possibleQtys[0];
        if (possiblePrices.length > 0) costPrice = possiblePrices[0];
      } else if (numbers.length === 1) {
        if (Number.isInteger(numbers[0]) && numbers[0] <= 100) {
          quantity = numbers[0];
        } else {
          costPrice = numbers[0];
        }
      }

      name = name
        .replace(/\$[\s\d.,]+/g, ' ')
        .replace(/\b(?:cant|cantidad|costo|precio|unit|p\.u\.|subtotal|pza|caja|frasco|lote|cad)\b[:.]?/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (name.length >= 3) {
        let matchedProd = catalogProducts.find(p => barcode && p.barcode && p.barcode.trim() === barcode);
        if (!matchedProd && name) {
          matchedProd = catalogProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
        }
        if (!matchedProd && barcode) {
          code = `MED-${barcode.slice(-6)}`;
        } else {
          code = matchedProd ? matchedProd.code : `MED-${100000 + items.length}`;
        }

        if (matchedProd && costPrice === 0) {
          costPrice = matchedProd.costPrice;
        }

        let sellingPrice = Number((costPrice * 1.40).toFixed(2));
        if (matchedProd && matchedProd.sellingPrice > 0) {
          sellingPrice = matchedProd.sellingPrice;
        }

        let department: ProductDepartment = 'farmacia';
        const lowerName = name.toLowerCase();
        if (lowerName.includes('coca') || lowerName.includes('pepsi') || lowerName.includes('agua') || lowerName.includes('jugo') || lowerName.includes('electrolit') || lowerName.includes('bebida') || lowerName.includes('suero')) {
          department = 'bebidas';
        } else if (lowerName.includes('dulce') || lowerName.includes('chocolate') || lowerName.includes('paleta') || lowerName.includes('mazapan') || lowerName.includes('chicle') || lowerName.includes('gomita')) {
          department = 'dulces';
        } else if (lowerName.includes('sabritas') || lowerName.includes('papas') || lowerName.includes('cacahuate') || lowerName.includes('galletas') || lowerName.includes('barrita')) {
          department = 'botanas';
        } else if (lowerName.includes('shampoo') || lowerName.includes('jabon') || lowerName.includes('pasta') || lowerName.includes('toallas') || lowerName.includes('desodorante')) {
          department = 'higiene';
        }

        items.push({
          id: `pdf-item-${items.length}-${Date.now()}`,
          name: matchedProd ? matchedProd.name : name,
          barcode: barcode || (matchedProd ? matchedProd.barcode : ''),
          code: code,
          quantity: Math.max(1, Math.round(quantity)),
          costPrice: costPrice,
          suggestedSellingPrice: sellingPrice,
          batchNumber: batchNumber || (matchedProd?.batchNumber || ''),
          expirationDate: expirationDate || (matchedProd?.expirationDate || ''),
          presentation: matchedProd?.presentation || 'Pieza',
          unitOfMeasure: matchedProd?.unitOfMeasure || 'Pieza',
          category: matchedProd?.category || (department === 'farmacia' ? 'Medicamentos' : 'General'),
          department: matchedProd ? matchedProd.department : department,
          laboratory: laboratory || (matchedProd?.laboratory || ''),
          totalImport: quantity * costPrice,
          prescriptionRequired: matchedProd ? matchedProd.prescriptionRequired : false,
          matchedProductId: matchedProd ? matchedProd.id : undefined,
          isNewProduct: !matchedProd,
        });
      }
    }

    i++;
  }

  return {
    supplierName: supplierName || 'Proveedor / Distribuidor',
    invoiceNumber: invoiceNumber || `FAC-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
    invoiceDate,
    totalAmount: totalAmount > 0 ? totalAmount : items.reduce((acc, it) => acc + (it.quantity * it.costPrice), 0),
    rawText,
    lines,
    items,
  };
}
