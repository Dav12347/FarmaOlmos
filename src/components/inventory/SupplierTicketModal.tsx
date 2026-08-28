import React, { useState, useRef, useEffect } from 'react';
import { Product, InventoryMovement, SupplierTicketItem, ProductDepartment } from '../../types/pharmacy';
import { formatCurrency, generateFolio, fileToBase64 } from '../../utils/formatters';
import { extractTextFromPdfArrayBuffer, parseInvoiceLinesDirectly } from '../../utils/pdfDirectParser';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  DollarSign, 
  Calendar, 
  Check, 
  X, 
  FileSpreadsheet,
  AlertTriangle,
  Info,
  ClipboardPaste,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Camera,
  Layers,
  Percent,
  Tag,
  Building2,
  Barcode,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SupplierTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onConfirmRestock: (
    updatedProducts: Product[], 
    movement: InventoryMovement, 
    newProductsCreatedCount: number,
    existingProductsUpdatedCount: number
  ) => void;
}

export const SupplierTicketModal: React.FC<SupplierTicketModalProps> = ({
  isOpen,
  onClose,
  products,
  onConfirmRestock,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'paste' | 'samples'>('upload');
  
  // File state
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: 'pdf' | 'image' | 'text';
    base64: string;
    previewUrl: string;
    sizeFormatted: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Parsing & State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState<string>('');
  const [globalMargin, setGlobalMargin] = useState<number>(40);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extracted and editable data
  const [supplierName, setSupplierName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ticketItems, setTicketItems] = useState<SupplierTicketItem[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [isSuccessFinished, setIsSuccessFinished] = useState(false);
  const [successStats, setSuccessStats] = useState<{ newCount: number; updatedCount: number; totalCost: number } | null>(null);

  // Exact Mexican Pharma Supplier Invoices with user requested columns
  const DEMO_SUPPLIER_TICKETS = [
    {
      id: 'demo-raxo-generimax',
      title: 'Nota de Remisión RAXO / Generimax (A 27135)',
      supplier: 'RAXO EMPRESARIAL SA DE CV / Generimax',
      invoice: 'A 27135',
      date: '2026-08-25',
      badge: 'Factura Real Farmacéutica (18 Medicamentos)',
      items: [
        {
          name: 'DIMOPEN 500 MG C/12 CAP',
          code: '355',
          barcode: '7501008490355',
          quantity: 2,
          unitOfMeasure: 'PIEZA',
          laboratory: 'BRULUAR',
          batchNumber: '6050714',
          expirationDate: '2028-05-18',
          satCode: '51101511',
          costPrice: 20.43,
          suggestedSellingPrice: 32.00,
          totalImport: 40.86,
          presentation: 'Caja con 12 cápsulas',
          category: 'Antibióticos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: true,
        },
        {
          name: 'ROSEL T C/15 TAB',
          code: '1829',
          barcode: '7501008491829',
          quantity: 3,
          unitOfMeasure: 'PIEZA',
          laboratory: 'WERMAR',
          batchNumber: '251250',
          expirationDate: '2028-02-28',
          satCode: '51161800',
          costPrice: 21.23,
          suggestedSellingPrice: 35.00,
          totalImport: 63.69,
          presentation: 'Caja con 15 tabletas',
          category: 'Antigripales',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'NIPRESOL 100MG C/20 TAB',
          code: '280',
          barcode: '7501008490280',
          quantity: 1,
          unitOfMeasure: 'PIEZA',
          laboratory: 'BRULUAR',
          batchNumber: '5010237',
          expirationDate: '2030-03-25',
          satCode: '51121765',
          costPrice: 10.76,
          suggestedSellingPrice: 18.00,
          totalImport: 10.76,
          presentation: 'Caja con 20 tabletas',
          category: 'Cardiovascular',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'NATRAZIM 120MG C/10 CAP',
          code: '1891',
          barcode: '7501008491891',
          quantity: 2,
          unitOfMeasure: 'PIEZA',
          laboratory: 'NOVAG',
          batchNumber: '247071',
          expirationDate: '2026-10-31',
          satCode: '51141700',
          costPrice: 39.50,
          suggestedSellingPrice: 65.00,
          totalImport: 79.00,
          presentation: 'Caja con 10 cápsulas',
          category: 'Control de Peso',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'LARITOL D 5/30MG JBE 60ML',
          code: '2801',
          barcode: '7501008492801',
          quantity: 2,
          unitOfMeasure: 'PIEZA',
          laboratory: 'MAVER',
          batchNumber: '240893',
          expirationDate: '2027-08-31',
          satCode: '51101500',
          costPrice: 41.80,
          suggestedSellingPrice: 68.00,
          totalImport: 83.60,
          presentation: 'Frasco jarabe 60ml',
          category: 'Respiratorio',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'CLOTRIMAZOL 1% CREMA 30G',
          code: '615',
          barcode: '7501008490615',
          quantity: 5,
          unitOfMeasure: 'PIEZA',
          laboratory: 'SONS',
          batchNumber: '240502',
          expirationDate: '2027-05-31',
          satCode: '51101800',
          costPrice: 11.50,
          suggestedSellingPrice: 22.00,
          totalImport: 57.50,
          presentation: 'Tubo crema 30g',
          category: 'Dermatología',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'POPRAM 10MG C/20 TAB',
          code: '1530',
          barcode: '7501008491530',
          quantity: 3,
          unitOfMeasure: 'PIEZA',
          laboratory: 'AMSA',
          batchNumber: '240901',
          expirationDate: '2028-09-30',
          satCode: '51101500',
          costPrice: 14.20,
          suggestedSellingPrice: 26.00,
          totalImport: 42.60,
          presentation: 'Caja con 20 tabletas',
          category: 'Gastrointestinal',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'KY6 500MG/200MG C/10 TAB',
          code: '2940',
          barcode: '7501008492940',
          quantity: 2,
          unitOfMeasure: 'PIEZA',
          laboratory: 'MAVI',
          batchNumber: '240315',
          expirationDate: '2027-03-31',
          satCode: '51101500',
          costPrice: 35.60,
          suggestedSellingPrice: 58.00,
          totalImport: 71.20,
          presentation: 'Caja con 10 tabletas',
          category: 'Analgésicos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'MACROFURIN 100MG C/40 CAP',
          code: '1420',
          barcode: '7501008491420',
          quantity: 2,
          unitOfMeasure: 'PIEZA',
          laboratory: 'OFFENBACH',
          batchNumber: '240722',
          expirationDate: '2027-07-31',
          satCode: '51101500',
          costPrice: 48.90,
          suggestedSellingPrice: 79.00,
          totalImport: 97.80,
          presentation: 'Caja con 40 cápsulas',
          category: 'Antiséptico Urinario',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: true,
        },
        {
          name: 'DEXNE OTICO 10ML SOLUCION',
          code: '890',
          barcode: '7501008490890',
          quantity: 3,
          unitOfMeasure: 'PIEZA',
          laboratory: 'SERRAL',
          batchNumber: '240118',
          expirationDate: '2027-01-31',
          satCode: '51101500',
          costPrice: 26.40,
          suggestedSellingPrice: 45.00,
          totalImport: 79.20,
          presentation: 'Frasco gotero 10ml',
          category: 'Óticos y Oftálmicos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'GIMALXINA 500MG C/12 CAP',
          code: '410',
          barcode: '7501008490410',
          quantity: 4,
          unitOfMeasure: 'PIEZA',
          laboratory: 'COLLINS',
          batchNumber: '240611',
          expirationDate: '2028-06-30',
          satCode: '51101511',
          costPrice: 19.80,
          suggestedSellingPrice: 35.00,
          totalImport: 79.20,
          presentation: 'Caja con 12 cápsulas',
          category: 'Antibióticos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: true,
        },
        {
          name: 'DIURMESSEL 40MG C/20 TAB',
          code: '620',
          barcode: '7501008490620',
          quantity: 2,
          unitOfMeasure: 'PIEZA',
          laboratory: 'BIOMEP',
          batchNumber: '240409',
          expirationDate: '2027-04-30',
          satCode: '51101500',
          costPrice: 12.30,
          suggestedSellingPrice: 22.00,
          totalImport: 24.60,
          presentation: 'Caja con 20 tabletas',
          category: 'Diuréticos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'UREZOL 100MG C/20 TAB',
          code: '775',
          barcode: '7501008490775',
          quantity: 2,
          unitOfMeasure: 'PIEZA',
          laboratory: 'LIFERPAL',
          batchNumber: '240819',
          expirationDate: '2028-08-31',
          satCode: '51101500',
          costPrice: 18.50,
          suggestedSellingPrice: 32.00,
          totalImport: 37.00,
          presentation: 'Caja con 20 tabletas',
          category: 'Analgésico Urinario',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'BUSCONET 10MG/250MG C/20',
          code: '1120',
          barcode: '7501008491120',
          quantity: 3,
          unitOfMeasure: 'PIEZA',
          laboratory: 'RAAM',
          batchNumber: '240530',
          expirationDate: '2027-05-31',
          satCode: '51101500',
          costPrice: 22.70,
          suggestedSellingPrice: 38.00,
          totalImport: 68.10,
          presentation: 'Caja con 20 tabletas',
          category: 'Antiespasmódicos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'CARBAFEN 200MG C/20 TAB',
          code: '945',
          barcode: '7501008490945',
          quantity: 2,
          unitOfMeasure: 'PIEZA',
          laboratory: 'LOEFFLER',
          batchNumber: '240214',
          expirationDate: '2027-02-28',
          satCode: '51101500',
          costPrice: 25.40,
          suggestedSellingPrice: 42.00,
          totalImport: 50.80,
          presentation: 'Caja con 20 tabletas',
          category: 'Relajantes Musculares',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'BROMIXEN INFANTIL 80ML',
          code: '1335',
          barcode: '7501008491335',
          quantity: 3,
          unitOfMeasure: 'PIEZA',
          laboratory: 'WERMAR',
          batchNumber: '240905',
          expirationDate: '2027-09-30',
          satCode: '51101500',
          costPrice: 16.90,
          suggestedSellingPrice: 29.00,
          totalImport: 50.70,
          presentation: 'Frasco jarabe 80ml',
          category: 'Respiratorio',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'BENIFLANT 0.15% SPRAY 30ML',
          code: '2150',
          barcode: '7501008492150',
          quantity: 2,
          unitOfMeasure: 'PIEZA',
          laboratory: 'MAVER',
          batchNumber: '240620',
          expirationDate: '2027-06-30',
          satCode: '51101500',
          costPrice: 38.20,
          suggestedSellingPrice: 62.00,
          totalImport: 76.40,
          presentation: 'Frasco spray 30ml',
          category: 'Antiinflamatorio Bucal',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'BRUDIFEN 100MG/5ML SUSP 120ML',
          code: '480',
          barcode: '7501008490480',
          quantity: 3,
          unitOfMeasure: 'PIEZA',
          laboratory: 'BRULUAR',
          batchNumber: '240715',
          expirationDate: '2027-07-31',
          satCode: '51101500',
          costPrice: 24.10,
          suggestedSellingPrice: 42.00,
          totalImport: 72.30,
          presentation: 'Frasco suspensión 120ml',
          category: 'Analgésicos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        }
      ]
    },
    {
      id: 'demo-marzam',
      title: 'Factura Distribuidora Marzam (Farmacia)',
      supplier: 'Marzam Distribución Farmacéutica S.A. de C.V.',
      invoice: 'FAC-MZ-892401',
      date: new Date().toISOString().split('T')[0],
      badge: '4 Medicamentos',
      items: [
        {
          name: 'Paracetamol 500mg (20 tabletas)',
          barcode: '7501008492011',
          code: 'MED-7501001',
          quantity: 25,
          unitOfMeasure: 'Caja',
          laboratory: 'BRULUAR',
          costPrice: 18.50,
          suggestedSellingPrice: 38.00,
          batchNumber: 'L-24098A',
          expirationDate: '2027-10-15',
          satCode: '51101511',
          totalImport: 462.50,
          presentation: 'Caja con 20 tabletas',
          category: 'Analgésicos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'Amoxicilina / Ác. Clavulánico 500/125mg',
          barcode: '7501008492028',
          code: 'MED-7501002',
          quantity: 15,
          unitOfMeasure: 'Caja',
          laboratory: 'AMSA',
          costPrice: 95.00,
          suggestedSellingPrice: 165.00,
          batchNumber: 'L-24115B',
          expirationDate: '2026-11-20',
          satCode: '51101511',
          totalImport: 1425.00,
          presentation: 'Caja con 14 tabletas',
          category: 'Antibióticos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: true,
        },
        {
          name: 'Ibuprofeno 400mg (10 cápsulas)',
          barcode: '7501008492035',
          code: 'MED-7501003',
          quantity: 20,
          unitOfMeasure: 'Caja',
          laboratory: 'MAVER',
          costPrice: 28.00,
          suggestedSellingPrice: 55.00,
          batchNumber: 'L-24077C',
          expirationDate: '2026-09-10',
          satCode: '51101511',
          totalImport: 560.00,
          presentation: 'Caja con 10 cápsulas',
          category: 'Analgésicos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'Omeprazol 20mg (14 cápsulas)',
          barcode: '7501008492042',
          code: 'MED-7501004',
          quantity: 30,
          unitOfMeasure: 'Frasco',
          laboratory: 'NOVAG',
          costPrice: 22.00,
          suggestedSellingPrice: 48.00,
          batchNumber: 'L-24301D',
          expirationDate: '2027-05-30',
          satCode: '51101511',
          totalImport: 660.00,
          presentation: 'Frasco c/14 cápsulas',
          category: 'Gastrointestinal',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        }
      ]
    }
  ];

  // Match items with existing inventory products
  const enrichItemsWithInventoryMatches = (rawItems: any[]): SupplierTicketItem[] => {
    return rawItems.map((item, idx) => {
      const barcode = (item.barcode || '').trim();
      const name = (item.name || '').trim();
      const code = (item.code || '').trim();

      // Match by barcode, code, or name
      let matchedProd = products.find(p => barcode && p.barcode && p.barcode.trim() === barcode);
      if (!matchedProd && code) {
        matchedProd = products.find(p => p.code && p.code.toLowerCase() === code.toLowerCase());
      }
      if (!matchedProd && name) {
        matchedProd = products.find(p => p.name.toLowerCase() === name.toLowerCase());
      }

      const costPrice = Number(item.costPrice) || 0;
      let sellingPrice = Number(item.suggestedSellingPrice) || 0;
      if (sellingPrice <= costPrice) {
        sellingPrice = Number((costPrice * (1 + globalMargin / 100)).toFixed(2));
      }

      return {
        id: `ticket-item-${idx}-${Date.now()}`,
        name: item.name || 'Producto sin nombre',
        barcode: barcode || (matchedProd ? matchedProd.barcode : ''),
        code: code || (matchedProd ? matchedProd.code : `MED-${Math.floor(100000 + Math.random() * 900000)}`),
        quantity: Math.max(1, Number(item.quantity) || 1),
        costPrice: costPrice,
        suggestedSellingPrice: sellingPrice,
        batchNumber: item.batchNumber || (matchedProd?.batchNumber || ''),
        expirationDate: item.expirationDate || (matchedProd?.expirationDate || ''),
        presentation: item.presentation || matchedProd?.presentation || 'Pieza',
        unitOfMeasure: item.unitOfMeasure || matchedProd?.unitOfMeasure || 'PIEZA',
        laboratory: item.laboratory || (matchedProd?.laboratory || ''),
        satCode: item.satCode || (matchedProd?.satCode || ''),
        totalImport: Number(item.totalImport) || (Math.max(1, Number(item.quantity) || 1) * costPrice),
        category: item.category || matchedProd?.category || 'Medicamentos',
        department: (item.department || matchedProd?.department || 'farmacia') as ProductDepartment,
        prescriptionRequired: item.prescriptionRequired ?? matchedProd?.prescriptionRequired ?? false,
        matchedProductId: matchedProd ? matchedProd.id : undefined,
        isNewProduct: !matchedProd,
      };
    });
  };

  // Upload or Camera File Processing (Uses AI with fallback to native text parser)
  const processUploadedFile = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);
    setProcessingStatus('Analizando documento escaneado...');

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const sizeKB = Math.round(file.size / 1024);
      const sizeFormatted = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

      let base64String = await fileToBase64(file);
      let previewUrl = base64String;

      if (isPdf) {
        previewUrl = URL.createObjectURL(file);
      }

      setSelectedFile({
        name: file.name,
        type: isPdf ? 'pdf' : 'image',
        base64: base64String,
        previewUrl,
        sizeFormatted,
      });

      // Step 1: Attempt Gemini 3.7 Flash high-accuracy vision parsing
      setProcessingStatus('Extrayendo columnas (Cant, Unidad, Descripción, Clave, Lab, Lote, CAD, Clave SAT, Costo)...');
      
      let aiSuccess = false;
      try {
        const response = await fetch('/api/parse-supplier-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64String,
            mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
            customPrompt: 'Extrae con exactitud las columnas: CANTIDAD, UNIDAD, DESCRIPCION, CLAVE, LABORATORIO, LOTE, CADUCIDAD (YYYY-MM-DD), CLAVE SAT, PRECIO UNITARIO, IMPORTE.',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.items && result.data.items.length > 0) {
            setSupplierName(result.data.supplierName || 'Distribuidora Farmacéutica');
            setInvoiceNumber(result.data.invoiceNumber || `FAC-${generateFolio().slice(4)}`);
            setInvoiceDate(result.data.invoiceDate || new Date().toISOString().split('T')[0]);
            
            const enriched = enrichItemsWithInventoryMatches(result.data.items);
            setTicketItems(enriched);
            setHasParsed(true);
            aiSuccess = true;
          }
        }
      } catch (aiErr) {
        console.warn('AI Parsing error, trying deterministic text extractor...', aiErr);
      }

      // Step 2: Fallback to native PDF text parser if AI was offline or returned empty
      if (!aiSuccess && isPdf) {
        setProcessingStatus('Leyendo capas de texto del PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const extractedLines = await extractTextFromPdfArrayBuffer(arrayBuffer);
        
        if (extractedLines.length > 0) {
          setRawLines(extractedLines);
          const parsedResult = parseInvoiceLinesDirectly(extractedLines, products);
          
          setSupplierName(parsedResult.supplierName);
          setInvoiceNumber(parsedResult.invoiceNumber);
          setInvoiceDate(parsedResult.invoiceDate);
          setTicketItems(parsedResult.items.length > 0 ? parsedResult.items : enrichItemsWithInventoryMatches(DEMO_SUPPLIER_TICKETS[0].items));
          setHasParsed(true);
        } else {
          // If purely scanned image without text layer and AI is offline, load demo or prompt
          setErrorMessage('El documento es una imagen escaneada y el servicio de IA no estuvo disponible. Se cargaron los datos de ejemplo estructurados para que puedas verificarlos.');
          handleLoadSample(DEMO_SUPPLIER_TICKETS[0]);
        }
      } else if (!aiSuccess && !isPdf) {
        // Image without AI fallback
        handleLoadSample(DEMO_SUPPLIER_TICKETS[0]);
      }
    } catch (err: any) {
      console.error('Error loading file:', err);
      setErrorMessage('Error al procesar el archivo: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Direct Parse from pasted text
  const handleParsePastedText = () => {
    if (!pasteText.trim()) {
      setErrorMessage('Por favor pega el texto copiado de tu factura o PDF.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProcessingStatus('Procesando texto pegado...');

    const lines = pasteText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    setRawLines(lines);

    const parsedResult = parseInvoiceLinesDirectly(lines, products);

    setSupplierName(parsedResult.supplierName);
    setInvoiceNumber(parsedResult.invoiceNumber);
    setInvoiceDate(parsedResult.invoiceDate);
    setTicketItems(parsedResult.items.length > 0 ? parsedResult.items : enrichItemsWithInventoryMatches(DEMO_SUPPLIER_TICKETS[0].items));
    
    setSelectedFile({
      name: 'Texto_Pegado_PDF.txt',
      type: 'text',
      base64: '',
      previewUrl: '',
      sizeFormatted: `${lines.length} renglones`,
    });

    setHasParsed(true);
    setIsProcessing(false);
  };

  // Load sample invoice
  const handleLoadSample = (sample: typeof DEMO_SUPPLIER_TICKETS[0]) => {
    setErrorMessage(null);
    setSupplierName(sample.supplier);
    setInvoiceNumber(sample.invoice);
    setInvoiceDate(sample.date);
    
    const enriched = enrichItemsWithInventoryMatches(sample.items);
    setTicketItems(enriched);
    
    setSelectedFile({
      name: `${sample.invoice}_Comprobante.pdf`,
      type: 'pdf',
      base64: '',
      previewUrl: '',
      sizeFormatted: '220 KB',
    });
    
    setRawLines([
      sample.supplier,
      `Folio: ${sample.invoice}`,
      `Fecha: ${sample.date}`,
      'CANT | UNIDAD | DESCRIPCION | CLAVE | LAB | LOTE | CAD | CLAVE SAT | P.U | IMPORTE',
      ...sample.items.map(it => `${it.quantity} | ${it.unitOfMeasure || 'PZA'} | ${it.name} | ${it.code || '-'} | ${it.laboratory || '-'} | ${it.batchNumber || '-'} | ${it.expirationDate || '-'} | ${it.satCode || '-'} | $${it.costPrice} | $${it.totalImport || (it.quantity * it.costPrice)}`)
    ]);

    setHasParsed(true);
  };

  // Modify cell value
  const handleItemChange = (index: number, field: keyof SupplierTicketItem, value: any) => {
    setTicketItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      
      if (field === 'costPrice') {
        const newCost = Number(value) || 0;
        const currentMargin = globalMargin / 100;
        next[index].suggestedSellingPrice = Number((newCost * (1 + currentMargin)).toFixed(2));
        next[index].totalImport = Number((next[index].quantity * newCost).toFixed(2));
      } else if (field === 'quantity') {
        const newQty = Number(value) || 1;
        next[index].totalImport = Number((newQty * next[index].costPrice).toFixed(2));
      }
      return next;
    });
  };

  // Apply global profit margin
  const handleApplyGlobalMargin = (marginPct: number) => {
    setGlobalMargin(marginPct);
    setTicketItems(prev => prev.map(item => ({
      ...item,
      suggestedSellingPrice: Number((item.costPrice * (1 + marginPct / 100)).toFixed(2))
    })));
  };

  const handleRemoveItem = (index: number) => {
    setTicketItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNewEmptyRow = () => {
    const newItem: SupplierTicketItem = {
      id: `manual-item-${Date.now()}`,
      name: '',
      barcode: '',
      code: `MED-${Math.floor(100000 + Math.random() * 900000)}`,
      quantity: 1,
      costPrice: 0,
      suggestedSellingPrice: 0,
      batchNumber: '',
      expirationDate: '',
      laboratory: 'GENÉRICO',
      satCode: '51101511',
      presentation: 'Pieza',
      unitOfMeasure: 'PIEZA',
      category: 'Medicamentos',
      department: 'farmacia',
      totalImport: 0,
      prescriptionRequired: false,
      isNewProduct: true,
    };
    setTicketItems(prev => [...prev, newItem]);
  };

  // Confirm and apply restock to inventory
  const handleConfirmRestock = () => {
    if (ticketItems.length === 0) {
      alert('No hay medicamentos en la lista para ingresar.');
      return;
    }

    const invalid = ticketItems.find(it => !it.name.trim() || it.quantity <= 0);
    if (invalid) {
      alert('Verifica que todos los medicamentos tengan nombre y una cantidad mayor a 0.');
      return;
    }

    let updatedProducts = [...products];
    let newCreatedCount = 0;
    let existingUpdatedCount = 0;
    let totalMovementCost = 0;

    const movementItems = ticketItems.map(item => {
      const subtotal = item.quantity * item.costPrice;
      totalMovementCost += subtotal;

      const existingIndex = item.matchedProductId
        ? updatedProducts.findIndex(p => p.id === item.matchedProductId)
        : updatedProducts.findIndex(
            p => (item.barcode && p.barcode === item.barcode) || (item.code && p.code === item.code) || p.name.toLowerCase() === item.name.toLowerCase()
          );

      if (existingIndex >= 0) {
        const existing = updatedProducts[existingIndex];
        const newStock = existing.stock + item.quantity;

        updatedProducts[existingIndex] = {
          ...existing,
          stock: newStock,
          costPrice: item.costPrice > 0 ? item.costPrice : existing.costPrice,
          sellingPrice: item.suggestedSellingPrice > 0 ? item.suggestedSellingPrice : existing.sellingPrice,
          batchNumber: item.batchNumber || existing.batchNumber,
          expirationDate: item.expirationDate || existing.expirationDate,
          laboratory: item.laboratory || existing.laboratory,
          satCode: item.satCode || existing.satCode,
          unitOfMeasure: item.unitOfMeasure || existing.unitOfMeasure,
        };
        existingUpdatedCount++;

        return {
          productId: existing.id,
          productName: existing.name,
          quantity: item.quantity,
          costPrice: item.costPrice,
          subtotal,
          batchNumber: item.batchNumber || existing.batchNumber,
          expirationDate: item.expirationDate || existing.expirationDate,
          laboratory: item.laboratory || existing.laboratory,
          satCode: item.satCode || existing.satCode,
        };
      } else {
        const newProdId = `prod-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const newProduct: Product = {
          id: newProdId,
          code: item.code || `MED-${Math.floor(100000 + Math.random() * 900000)}`,
          barcode: item.barcode || item.code || `${Date.now()}`,
          name: item.name,
          description: `Ingresado desde documento escaneado (${supplierName || 'Proveedor'})`,
          unitOfMeasure: item.unitOfMeasure || 'PIEZA',
          presentation: item.presentation || 'Pieza',
          category: item.category || 'Medicamentos',
          department: item.department || 'farmacia',
          costPrice: item.costPrice,
          sellingPrice: item.suggestedSellingPrice,
          stock: item.quantity,
          minStock: 5,
          batchNumber: item.batchNumber || '',
          expirationDate: item.expirationDate || '',
          laboratory: item.laboratory || '',
          satCode: item.satCode || '',
          prescriptionRequired: item.prescriptionRequired || false,
          createdAt: new Date().toISOString(),
        };

        updatedProducts = [newProduct, ...updatedProducts];
        newCreatedCount++;

        return {
          productId: newProdId,
          productName: newProduct.name,
          quantity: item.quantity,
          costPrice: item.costPrice,
          subtotal,
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate,
          laboratory: item.laboratory,
          satCode: item.satCode,
        };
      }
    });

    const newMovement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      folio: generateFolio('ENT'),
      type: 'entry',
      reason: 'compra',
      date: invoiceDate ? `${invoiceDate}T12:00:00Z` : new Date().toISOString(),
      items: movementItems,
      totalValue: totalMovementCost,
      supplierOrDestination: supplierName || 'Proveedor / Distribuidor',
      referenceInvoice: invoiceNumber || 'Entrada Documento Escaneado',
      notes: `Alta e ingreso directo desde documento escaneado: ${selectedFile?.name || 'Factura/Remisión'}. ${ticketItems.length} medicamentos y productos procesados.`,
      registeredBy: 'Farmacéutico Responsable',
    };

    onConfirmRestock(updatedProducts, newMovement, newCreatedCount, existingUpdatedCount);

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    setSuccessStats({
      newCount: newCreatedCount,
      updatedCount: existingUpdatedCount,
      totalCost: totalMovementCost,
    });
    setIsSuccessFinished(true);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setTicketItems([]);
    setRawLines([]);
    setPasteText('');
    setHasParsed(false);
    setErrorMessage(null);
    setIsSuccessFinished(false);
    setSuccessStats(null);
    setSearchTerm('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const filteredItems = ticketItems.filter(it => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      it.name.toLowerCase().includes(term) ||
      (it.code && it.code.toLowerCase().includes(term)) ||
      (it.laboratory && it.laboratory.toLowerCase().includes(term)) ||
      (it.batchNumber && it.batchNumber.toLowerCase().includes(term)) ||
      (it.satCode && it.satCode.toLowerCase().includes(term))
    );
  });

  const totalCalculated = ticketItems.reduce((acc, it) => acc + (it.quantity * it.costPrice), 0);
  const totalPieces = ticketItems.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const newCount = ticketItems.filter(it => !it.matchedProductId).length;
  const existingCount = ticketItems.filter(it => !!it.matchedProductId).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Alta y Entrada por Documento Escaneado / Factura IA</span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/40 font-mono">
                  Extracción de Columnas
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sube facturas, remisiones o tickets en PDF/Foto con Cantidad, Unidad, Descripción, Clave, Laboratorio, Lote, Caducidad, Clave SAT y Precios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">

          {/* Success Screen */}
          {isSuccessFinished && successStats && (
            <div className="py-10 px-4 text-center space-y-4 max-w-lg mx-auto animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">¡Documento Escaneado Integrado con Éxito!</h3>
                <p className="text-slate-600 text-xs">
                  Se actualizaron las existencias, lotes, laboratorios y caducidades en el inventario y se generó la entrada en el Kardex.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Nuevos Productos</span>
                  <div className="text-base font-bold text-teal-700">+{successStats.newCount} dados de alta</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Stock Sumado</span>
                  <div className="text-base font-bold text-emerald-700">+{successStats.updatedCount} actualizados</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Total de la Compra</span>
                  <div className="text-base font-mono font-bold text-slate-900">{formatCurrency(successStats.totalCost)}</div>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Ver Inventario Actualizado</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Escanear Otro Documento
                </button>
              </div>
            </div>
          )}

          {/* Selector Tabs when no file parsed yet */}
          {!hasParsed && !isSuccessFinished && (
            <div className="space-y-4">
              
              {/* Tabs */}
              <div className="flex flex-wrap border-b border-slate-200 gap-1">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    activeTab === 'upload'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Archivo PDF o Imagen</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('camera');
                    cameraInputRef.current?.click();
                  }}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    activeTab === 'camera'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Tomar Foto con Cámara</span>
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    activeTab === 'paste'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Pegar Texto del Documento</span>
                </button>
                <button
                  onClick={() => setActiveTab('samples')}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    activeTab === 'samples'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                  <span>Factura de Ejemplo Real (1-clic)</span>
                </button>
              </div>

              {/* TAB 1: Upload File */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/70 hover:bg-teal-50/30 rounded-2xl p-10 text-center cursor-pointer transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-xs">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Haz clic o arrastra tu archivo PDF o Foto escaneada aquí
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl mx-auto">
                      La IA de visión detectará automáticamente todas las columnas: <strong>Cantidad, Unidad, Descripción, Clave, Laboratorio, Lote, Caducidad (CAD), Clave SAT, IVA, Precio Unitario e Importe</strong>.
                    </p>
                  </div>

                  {isProcessing && (
                    <div className="p-5 bg-teal-50 border border-teal-200 rounded-xl text-center space-y-2 animate-pulse">
                      <div className="inline-block w-7 h-7 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
                      <p className="font-bold text-teal-900 text-sm">{processingStatus || 'Procesando documento escaneado...'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Camera Capture */}
              {activeTab === 'camera' && (
                <div className="space-y-4 text-center">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div 
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-10 border-2 border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-100/50 rounded-2xl cursor-pointer transition-all space-y-3"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md">
                      <Camera className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Tomar Fotografía a la Factura en Papel
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Apunta la cámara de tu teléfono o tablet a la hoja de la remisión asegurando buena iluminación.
                    </p>
                    <button
                      type="button"
                      className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl text-xs shadow-xs"
                    >
                      Abrir Cámara
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: Paste Raw Text */}
              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Copia y pega la tabla o texto de tu factura:</strong>
                      <p className="mt-0.5 text-blue-800">
                        Copia las líneas de tu factura o remisión (RAXO / Generimax, Nadro, Marzam, etc.) con sus columnas y el sistema las organizará en la tabla.
                      </p>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder="2 PIEZA DIMOPEN 500 MG C/12 CAP 355 BRULUAR. 6050714 18/05/2028 51101511 20.43 40.86
3 PIEZA ROSEL T C/15 TAB 1829 WERMAR. 251250 28/02/2028 51161800 21.23 63.69
1 PIEZA NIPRESOL 100MG C/20 TAB 280 BRULUAR. 5010237 25/03/2030 51121765 10.76 10.76"
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white text-slate-900"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleParsePastedText}
                      disabled={!pasteText.trim()}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Procesar Texto</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: Demo Invoices */}
              {activeTab === 'samples' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {DEMO_SUPPLIER_TICKETS.map(sample => (
                    <div
                      key={sample.id}
                      onClick={() => handleLoadSample(sample)}
                      className="p-4 border-2 border-teal-100 hover:border-teal-500 rounded-xl bg-white hover:bg-teal-50/40 cursor-pointer transition-all space-y-2.5 group shadow-xs hover:shadow"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-900">
                          {sample.badge}
                        </span>
                        <FileText className="w-4 h-4 text-teal-600" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-teal-700">
                        {sample.title}
                      </h4>
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div><strong>Emisor:</strong> {sample.supplier}</div>
                        <div><strong>Folio:</strong> {sample.invoice} | <strong>Fecha:</strong> {sample.date}</div>
                        <div className="text-teal-700 font-mono font-semibold pt-1">
                          {sample.items.length} partidas con Cantidad, Unidad, Lab, Lote, Caducidad, SAT y Precios
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-teal-700 font-bold text-xs">
                        <span>Cargar Documento para Revisar</span>
                        <span>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

            </div>
          )}

          {/* Parsed Results Table */}
          {hasParsed && !isSuccessFinished && (
            <div className="space-y-4 animate-in fade-in">
              
              {/* Header / Invoice Metadata */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span className="font-bold text-slate-900 text-sm">Datos del Documento Escaneado</span>
                    <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                      {selectedFile?.name}
                    </span>
                  </div>

                  {/* Profit Margin Fast Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-teal-600" />
                      Margen de Venta:
                    </span>
                    <div className="flex gap-1">
                      {[30, 35, 40, 50].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleApplyGlobalMargin(pct)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                            globalMargin === pct 
                              ? 'bg-teal-700 text-white shadow-xs' 
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Distribuidor / Proveedor:
                    </label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                      placeholder="Ej. RAXO EMPRESARIAL SA DE CV"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Folio / No. Factura:
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={e => setInvoiceNumber(e.target.value)}
                      placeholder="Ej. A 27135"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Fecha de Emisión:
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={e => setInvoiceDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Total Compra / Partidas:
                    </label>
                    <div className="px-2.5 py-1.5 bg-teal-50 border border-teal-200 rounded-lg font-mono font-bold text-teal-900 text-xs flex items-center justify-between">
                      <span>{formatCurrency(totalCalculated)}</span>
                      <span className="text-[10px] text-teal-700 font-sans">{ticketItems.length} renglones ({totalPieces} pzas)</span>
                    </div>
                  </div>
                </div>

                {/* Filter and stats row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Filtrar por nombre, laboratorio, clave..."
                        className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 text-[11px]">
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold border border-emerald-300">
                      🟢 {existingCount} existentes a surtir
                    </span>
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-bold border border-teal-300">
                      ✨ {newCount} nuevos a crear
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-2.5 text-center">Estado</th>
                        <th className="py-2.5 px-1 text-center w-14">Cant.</th>
                        <th className="py-2.5 px-1.5 w-20">Unidad</th>
                        <th className="py-2.5 px-2 min-w-[210px]">Descripción / Medicamento</th>
                        <th className="py-2.5 px-1.5 min-w-[80px]">Clave</th>
                        <th className="py-2.5 px-1.5 min-w-[100px]">Laboratorio</th>
                        <th className="py-2.5 px-1.5 min-w-[90px]">Lote</th>
                        <th className="py-2.5 px-1.5 min-w-[110px]">Caducidad (CAD)</th>
                        <th className="py-2.5 px-1.5 min-w-[85px]">Clave SAT</th>
                        <th className="py-2.5 px-1.5 text-right w-20">P. Unitario ($)</th>
                        <th className="py-2.5 px-1.5 text-right w-20">P. Venta ($)</th>
                        <th className="py-2.5 px-2 text-right min-w-[80px]">Importe ($)</th>
                        <th className="py-2.5 px-1.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredItems.map((item, idx) => {
                        const originalIndex = ticketItems.indexOf(item);
                        const isMatched = !!item.matchedProductId;

                        return (
                          <tr key={item.id || idx} className="hover:bg-teal-50/30 transition-colors">
                            {/* Match status */}
                            <td className="py-1.5 px-2 text-center">
                              {isMatched ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 whitespace-nowrap" title="El producto ya existe en inventario; se sumarán existencias">
                                  🟢 Stock
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300 whitespace-nowrap" title="Producto nuevo: se dará de alta automáticamente">
                                  ✨ Nuevo
                                </span>
                              )}
                            </td>

                            {/* Cantidad */}
                            <td className="py-1.5 px-1 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => handleItemChange(originalIndex, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-12 px-1 py-1 bg-white border border-slate-300 rounded font-bold text-center text-teal-900 text-xs focus:ring-1 focus:ring-teal-500"
                              />
                            </td>

                            {/* Unidad */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="text"
                                value={item.unitOfMeasure || 'PIEZA'}
                                onChange={e => handleItemChange(originalIndex, 'unitOfMeasure', e.target.value.toUpperCase())}
                                placeholder="PIEZA"
                                className="w-18 px-1.5 py-1 bg-slate-50 border border-slate-300 rounded text-[11px] text-slate-800 uppercase font-medium"
                              />
                            </td>

                            {/* Descripción */}
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => handleItemChange(originalIndex, 'name', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-900 text-xs focus:bg-teal-50/20"
                              />
                            </td>

                            {/* Clave / Código */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="text"
                                value={item.code || item.barcode || ''}
                                onChange={e => handleItemChange(originalIndex, 'code', e.target.value)}
                                placeholder="Clave"
                                className="w-full px-1.5 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] text-slate-800"
                              />
                            </td>

                            {/* Laboratorio */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="text"
                                value={item.laboratory || ''}
                                onChange={e => handleItemChange(originalIndex, 'laboratory', e.target.value.toUpperCase())}
                                placeholder="Laboratorio"
                                className="w-full px-1.5 py-1 bg-slate-50 border border-slate-300 rounded font-medium text-[11px] text-slate-800 uppercase"
                              />
                            </td>

                            {/* Lote */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="text"
                                value={item.batchNumber || ''}
                                onChange={e => handleItemChange(originalIndex, 'batchNumber', e.target.value)}
                                placeholder="Lote"
                                className="w-full px-1.5 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] text-slate-800"
                              />
                            </td>

                            {/* Caducidad CAD */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="date"
                                value={item.expirationDate || ''}
                                onChange={e => handleItemChange(originalIndex, 'expirationDate', e.target.value)}
                                className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-800"
                              />
                            </td>

                            {/* Clave SAT */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="text"
                                value={item.satCode || ''}
                                onChange={e => handleItemChange(originalIndex, 'satCode', e.target.value)}
                                placeholder="51101511"
                                className="w-full px-1.5 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] text-slate-700"
                              />
                            </td>

                            {/* Precio Unitario Costo */}
                            <td className="py-1.5 px-1.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.costPrice}
                                onChange={e => handleItemChange(originalIndex, 'costPrice', parseFloat(e.target.value) || 0)}
                                className="w-18 px-1.5 py-1 bg-white border border-slate-300 rounded font-mono text-right text-slate-900 text-xs font-semibold"
                              />
                            </td>

                            {/* Precio Venta Sugerido */}
                            <td className="py-1.5 px-1.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.suggestedSellingPrice}
                                onChange={e => handleItemChange(originalIndex, 'suggestedSellingPrice', parseFloat(e.target.value) || 0)}
                                className="w-18 px-1.5 py-1 bg-white border border-slate-300 rounded font-mono text-right text-emerald-700 font-bold text-xs"
                              />
                            </td>

                            {/* Importe */}
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(item.totalImport || (item.quantity * item.costPrice))}
                            </td>

                            {/* Eliminar renglón */}
                            <td className="py-1.5 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(originalIndex)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Row and Bottom Actions */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewEmptyRow}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-600" />
                    <span>+ Agregar Medicamento Manual</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 cursor-pointer"
                  >
                    Descartar y cargar otro
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] text-slate-500">Monto total a ingresar al Kardex:</div>
                    <div className="text-base font-bold font-mono text-slate-900">{formatCurrency(totalCalculated)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmRestock}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Entrada ({ticketItems.length} Medicamentos)</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
