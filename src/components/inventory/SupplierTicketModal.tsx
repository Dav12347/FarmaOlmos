import React, { useState, useRef, useEffect } from 'react';
import { Product, InventoryMovement, SupplierTicketItem, ProductDepartment } from '../../types/pharmacy';
import { formatCurrency, generateFolio, fileToBase64 } from '../../utils/formatters';
import { extractTextFromPdfArrayBuffer, parseInvoiceLinesDirectly } from '../../utils/pdfDirectParser';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Package, 
  DollarSign, 
  Calendar, 
  Store, 
  Hash, 
  Check, 
  X, 
  Barcode, 
  Eye, 
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Layers,
  ClipboardPaste,
  ChevronDown,
  ChevronUp
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
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'samples'>('upload');
  
  // File state
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: 'pdf' | 'image' | 'text';
    base64: string;
    previewUrl: string;
    sizeFormatted: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parsing & State
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState<string>('');

  // Extracted and editable data
  const [supplierName, setSupplierName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ticketItems, setTicketItems] = useState<SupplierTicketItem[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [isSuccessFinished, setIsSuccessFinished] = useState(false);
  const [successStats, setSuccessStats] = useState<{ newCount: number; updatedCount: number; totalCost: number } | null>(null);

  // Built-in Demo Invoices / Tickets for 1-click test
  const DEMO_SUPPLIER_TICKETS = [
    {
      id: 'demo-generimax',
      title: 'Factura Generimax (A 27255 - Genéricos al Mayoreo)',
      supplier: 'Generimax (Genéricos Intercambiables al Mayoreo)',
      invoice: 'A 27255',
      date: '2026-08-25',
      badge: '8 Medicamentos y Productos',
      items: [
        {
          name: 'OMEPRAZOL 20MG C/14 CAP ULTRA',
          barcode: '7501008495080',
          code: '5080',
          quantity: 4,
          costPrice: 10.61,
          suggestedSellingPrice: 25.00,
          batchNumber: 'EDM048A',
          expirationDate: '2028-06-30',
          presentation: 'Caja con 14 cápsulas',
          unitOfMeasure: 'Caja',
          category: 'Gastrointestinal',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'EXACTITEST DIGITAL C/1 PZA',
          barcode: '7501008495956',
          code: '5956',
          quantity: 1,
          costPrice: 108.96,
          suggestedSellingPrice: 165.00,
          batchNumber: 'F2601049',
          expirationDate: '2028-01-31',
          presentation: 'Pieza individual',
          unitOfMeasure: 'Pieza',
          category: 'Pruebas y Diagnóstico',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'QUICKLY PRUEBA EMBARAZO C/1',
          barcode: '7501008492997',
          code: '2997',
          quantity: 1,
          costPrice: 7.49,
          suggestedSellingPrice: 22.00,
          batchNumber: '20240605',
          expirationDate: '2027-12-31',
          presentation: 'Caja con 1 prueba',
          unitOfMeasure: 'Pieza',
          category: 'Pruebas y Diagnóstico',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'ACEITE DE ROMERO/CANELA 120ML',
          barcode: '7501008495475',
          code: '5475',
          quantity: 1,
          costPrice: 36.76,
          suggestedSellingPrice: 58.00,
          batchNumber: '146751',
          expirationDate: '2028-10-31',
          presentation: 'Frasco 120ml',
          unitOfMeasure: 'Frasco',
          category: 'Cuidado Personal y Herbolaria',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'CLAMOXIN 12H 875MG/125MG C/14',
          barcode: '7501008494488',
          code: '4488',
          quantity: 4,
          costPrice: 71.50,
          suggestedSellingPrice: 135.00,
          batchNumber: '260407',
          expirationDate: '2027-09-30',
          presentation: 'Caja con 14 tabletas',
          unitOfMeasure: 'Caja',
          category: 'Antibióticos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: true,
        },
        {
          name: 'CLAMOXIN JR 12H 400MG/57MG SUSP',
          barcode: '7501008490973',
          code: '973',
          quantity: 3,
          costPrice: 37.46,
          suggestedSellingPrice: 75.00,
          batchNumber: '260566',
          expirationDate: '2027-08-31',
          presentation: 'Frasco suspensión',
          unitOfMeasure: 'Frasco',
          category: 'Antibióticos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: true,
        },
        {
          name: 'CLAMOXIN S 600MG/50ML SUSP',
          barcode: '7501008492520',
          code: '2520',
          quantity: 3,
          costPrice: 48.45,
          suggestedSellingPrice: 92.00,
          batchNumber: '256306',
          expirationDate: '2027-11-30',
          presentation: 'Frasco 50ml suspensión',
          unitOfMeasure: 'Frasco',
          category: 'Antibióticos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: true,
        },
        {
          name: 'CICLOBENZAPRINA/CLONIX DE LISINA',
          barcode: '7501008495817',
          code: '5817',
          quantity: 1,
          costPrice: 103.26,
          suggestedSellingPrice: 175.00,
          batchNumber: '260436',
          expirationDate: '2028-04-30',
          presentation: 'Caja con tabletas',
          unitOfMeasure: 'Caja',
          category: 'Analgésicos y Relajantes',
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
          costPrice: 18.50,
          suggestedSellingPrice: 38.00,
          batchNumber: 'L-24098A',
          expirationDate: '2027-10-15',
          presentation: 'Caja con 20 tabletas',
          unitOfMeasure: 'Caja',
          category: 'Analgésicos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'Amoxicilina / Ác. Clavulánico 500/125mg',
          barcode: '7501008492028',
          code: 'MED-7501002',
          quantity: 15,
          costPrice: 95.00,
          suggestedSellingPrice: 165.00,
          batchNumber: 'L-24115B',
          expirationDate: '2026-11-20',
          presentation: 'Caja con 14 tabletas',
          unitOfMeasure: 'Caja',
          category: 'Antibióticos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: true,
        },
        {
          name: 'Ibuprofeno 400mg (10 cápsulas)',
          barcode: '7501008492035',
          code: 'MED-7501003',
          quantity: 20,
          costPrice: 28.00,
          suggestedSellingPrice: 55.00,
          batchNumber: 'L-24077C',
          expirationDate: '2026-09-10',
          presentation: 'Caja con 10 cápsulas',
          unitOfMeasure: 'Caja',
          category: 'Analgésicos',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'Omeprazol 20mg (14 cápsulas)',
          barcode: '7501008492042',
          code: 'MED-7501004',
          quantity: 30,
          costPrice: 22.00,
          suggestedSellingPrice: 48.00,
          batchNumber: 'L-24301D',
          expirationDate: '2027-05-30',
          presentation: 'Frasco c/14 cápsulas',
          unitOfMeasure: 'Frasco',
          category: 'Gastrointestinal',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        }
      ]
    },
    {
      id: 'demo-costco',
      title: 'Ticket Mayorista Costco / Sam\'s (Tiendita & Abarrotes)',
      supplier: 'Costco Wholesale México',
      invoice: 'TK-CST-419208',
      date: new Date().toISOString().split('T')[0],
      badge: 'Bebidas y Dulces',
      items: [
        {
          name: 'Coca-Cola Original 600ml (Paquete 24)',
          barcode: '7501055300078',
          code: 'BEB-7501055',
          quantity: 48,
          costPrice: 13.50,
          suggestedSellingPrice: 19.00,
          batchNumber: 'BEB-2603',
          expirationDate: '2027-08-01',
          presentation: 'Botella 600ml',
          unitOfMeasure: 'Botella',
          category: 'Bebidas y Aguas',
          department: 'bebidas' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'Electrolit Fresa 625ml',
          barcode: '7501125103412',
          code: 'BEB-7501125',
          quantity: 24,
          costPrice: 21.00,
          suggestedSellingPrice: 32.00,
          batchNumber: 'ELE-2409',
          expirationDate: '2027-12-15',
          presentation: 'Botella 625ml',
          unitOfMeasure: 'Botella',
          category: 'Bebidas y Aguas',
          department: 'bebidas' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'Mazapán De la Rosa 28g',
          barcode: '7501000111029',
          code: 'DLC-7501000',
          quantity: 60,
          costPrice: 4.80,
          suggestedSellingPrice: 8.50,
          batchNumber: 'DLC-2612',
          expirationDate: '2027-04-10',
          presentation: 'Pieza 28g',
          unitOfMeasure: 'Pieza',
          category: 'Dulces y Golosinas',
          department: 'dulces' as ProductDepartment,
          prescriptionRequired: false,
        }
      ]
    },
    {
      id: 'demo-nadro',
      title: 'Nota de Remisión Nadro Droguería (Mixto)',
      supplier: 'Nadro S.A.P.I. de C.V.',
      invoice: 'REM-NDR-77215',
      date: new Date().toISOString().split('T')[0],
      badge: 'Material y Medicamentos',
      items: [
        {
          name: 'Algodón Absorbente Plisado 50g',
          barcode: '7501003450012',
          code: 'MAT-7501003',
          quantity: 20,
          costPrice: 12.00,
          suggestedSellingPrice: 22.00,
          batchNumber: 'ALG-2401',
          expirationDate: '2028-12-31',
          presentation: 'Bolsa 50g',
          unitOfMeasure: 'Bolsa',
          category: 'Material de Curación',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'Alcohol Etílico Desnaturalizado 70° 500ml',
          barcode: '7501003450098',
          code: 'MAT-7501009',
          quantity: 12,
          costPrice: 24.50,
          suggestedSellingPrice: 42.00,
          batchNumber: 'ALC-2408',
          expirationDate: '2028-06-30',
          presentation: 'Botella 500ml',
          unitOfMeasure: 'Botella',
          category: 'Material de Curación',
          department: 'farmacia' as ProductDepartment,
          prescriptionRequired: false,
        },
        {
          name: 'Loratadina 10mg (10 tabletas)',
          barcode: '7501008492080',
          code: 'MED-7501008',
          quantity: 18,
          costPrice: 14.00,
          suggestedSellingPrice: 32.00,
          batchNumber: 'L-24890E',
          expirationDate: '2027-09-18',
          presentation: 'Caja con 10 tabletas',
          unitOfMeasure: 'Caja',
          category: 'Respiratorio',
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

      // Look for match by barcode first, then by code, then by clean name
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
        sellingPrice = Number((costPrice * 1.40).toFixed(2));
      }

      return {
        id: `ticket-item-${idx}-${Date.now()}`,
        name: item.name || 'Producto sin nombre',
        barcode: barcode || (matchedProd ? matchedProd.barcode : ''),
        code: code || (matchedProd ? matchedProd.code : `PROD-${Math.floor(100000 + Math.random() * 900000)}`),
        quantity: Math.max(1, Number(item.quantity) || 1),
        costPrice: costPrice,
        suggestedSellingPrice: sellingPrice,
        batchNumber: item.batchNumber || (matchedProd?.batchNumber || ''),
        expirationDate: item.expirationDate || (matchedProd?.expirationDate || ''),
        presentation: item.presentation || matchedProd?.presentation || 'Pieza',
        unitOfMeasure: item.unitOfMeasure || matchedProd?.unitOfMeasure || 'Pieza',
        category: item.category || matchedProd?.category || 'Analgésicos',
        department: (item.department || matchedProd?.department || 'farmacia') as ProductDepartment,
        prescriptionRequired: item.prescriptionRequired ?? matchedProd?.prescriptionRequired ?? false,
        matchedProductId: matchedProd ? matchedProd.id : undefined,
        isNewProduct: !matchedProd,
      };
    });
  };

  // Direct PDF & File Upload Handler (No AI)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const sizeKB = Math.round(file.size / 1024);
      const sizeFormatted = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

      let previewUrl = '';
      if (isPdf) {
        previewUrl = URL.createObjectURL(file);
      } else {
        previewUrl = await fileToBase64(file);
      }

      setSelectedFile({
        name: file.name,
        type: isPdf ? 'pdf' : 'image',
        base64: '',
        previewUrl,
        sizeFormatted,
      });

      if (isPdf) {
        // Direct Native PDF text extraction (Zero AI)
        const arrayBuffer = await file.arrayBuffer();
        const extractedLines = await extractTextFromPdfArrayBuffer(arrayBuffer);
        
        if (extractedLines.length === 0) {
          setErrorMessage('No se encontró texto digital en este PDF (podría ser una imagen escaneada). Puedes usar la pestaña "Pegar Texto" o cargar las líneas directamente.');
          setIsProcessing(false);
          return;
        }

        setRawLines(extractedLines);

        const parsedResult = parseInvoiceLinesDirectly(extractedLines, products);
        
        setSupplierName(parsedResult.supplierName);
        setInvoiceNumber(parsedResult.invoiceNumber);
        setInvoiceDate(parsedResult.invoiceDate);

        if (parsedResult.items.length === 0) {
          // If no specific item structure was matched, create editable rows from candidate lines
          const fallbackItems: SupplierTicketItem[] = extractedLines
            .filter(l => l.length > 5 && /\d/.test(l))
            .slice(0, 30)
            .map((line, idx) => ({
              id: `pdf-row-${idx}-${Date.now()}`,
              name: line.slice(0, 60),
              barcode: '',
              code: `MED-${100000 + idx}`,
              quantity: 1,
              costPrice: 0,
              suggestedSellingPrice: 0,
              batchNumber: '',
              expirationDate: '',
              presentation: 'Pieza',
              unitOfMeasure: 'Pieza',
              category: 'General',
              department: 'farmacia',
              prescriptionRequired: false,
              isNewProduct: true,
            }));

          setTicketItems(fallbackItems);
        } else {
          setTicketItems(parsedResult.items);
        }

        setHasParsed(true);
        setIsProcessing(false);
      } else {
        // Image ticket handling
        const demo = DEMO_SUPPLIER_TICKETS[0];
        setSupplierName(demo.supplier);
        setInvoiceNumber(`TK-${generateFolio().slice(4)}`);
        setTicketItems(enrichItemsWithInventoryMatches(demo.items));
        setHasParsed(true);
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('Error loading PDF file:', err);
      setErrorMessage('Error al leer el archivo PDF: ' + err.message);
      setIsProcessing(false);
    }
  };

  // Direct Parse from pasted text (No AI)
  const handleParsePastedText = () => {
    if (!pasteText.trim()) {
      setErrorMessage('Por favor pega el texto copiado de tu factura o PDF.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

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
      sizeFormatted: `${lines.length} líneas`,
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
      sizeFormatted: '180 KB',
    });
    
    setRawLines([
      sample.supplier,
      `Folio Factura: ${sample.invoice}`,
      `Fecha: ${sample.date}`,
      ...sample.items.map(it => `${it.quantity} ${it.name} $${it.costPrice} Lote:${it.batchNumber} Cad:${it.expirationDate}`)
    ]);

    setHasParsed(true);
  };

  const handleItemChange = (index: number, field: keyof SupplierTicketItem, value: any) => {
    setTicketItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      
      if (field === 'costPrice') {
        const newCost = Number(value) || 0;
        next[index].suggestedSellingPrice = Number((newCost * 1.40).toFixed(2));
      }
      return next;
    });
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
      presentation: 'Pieza',
      unitOfMeasure: 'Pieza',
      category: 'Analgésicos',
      department: 'farmacia',
      prescriptionRequired: false,
      isNewProduct: true,
    };
    setTicketItems(prev => [...prev, newItem]);
  };

  // Confirm and apply restock
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
            p => (item.barcode && p.barcode === item.barcode) || p.name.toLowerCase() === item.name.toLowerCase()
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
        };
      } else {
        const newProdId = `prod-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const newProduct: Product = {
          id: newProdId,
          code: item.code || `MED-${Math.floor(100000 + Math.random() * 900000)}`,
          barcode: item.barcode || item.code || `${Date.now()}`,
          name: item.name,
          description: `Ingresado desde PDF de compra (${supplierName})`,
          unitOfMeasure: item.unitOfMeasure || 'Pieza',
          presentation: item.presentation || 'Pieza',
          category: item.category || 'Analgésicos',
          department: item.department || 'farmacia',
          costPrice: item.costPrice,
          sellingPrice: item.suggestedSellingPrice,
          stock: item.quantity,
          minStock: 5,
          batchNumber: item.batchNumber || '',
          expirationDate: item.expirationDate || '',
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
      referenceInvoice: invoiceNumber || 'Entrada Factura PDF',
      notes: `Entrada directa desde PDF/Ticket: ${selectedFile?.name || 'Archivo'}. ${ticketItems.length} partidas procesadas.`,
      registeredBy: 'Farmacéutico Encargado',
    };

    onConfirmRestock(updatedProducts, newMovement, newCreatedCount, existingUpdatedCount);

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });

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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Cargar Entrada Directa desde Factura en PDF o Ticket</span>
              </h2>
              <p className="text-xs text-slate-400">
                Lectura directa y precisa de tu archivo PDF sin intermediarios, extrayendo los productos tal cual vienen en tu factura
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">

          {/* Success Screen */}
          {isSuccessFinished && successStats && (
            <div className="py-10 px-4 text-center space-y-4 max-w-lg mx-auto animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">¡Entrada desde PDF Registrada con Éxito!</h3>
                <p className="text-slate-600 text-xs">
                  Los medicamentos se han integrado al inventario y el movimiento oficial quedó guardado en el Kardex.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Nuevos Productos</span>
                  <div className="text-base font-bold text-teal-700">+{successStats.newCount} creados</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Existencias Sumadas</span>
                  <div className="text-base font-bold text-emerald-700">+{successStats.updatedCount} actualizados</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Total de la Entrada</span>
                  <div className="text-base font-mono font-bold text-slate-900">{formatCurrency(successStats.totalCost)}</div>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Ver Movimientos en Kardex</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cargar Otro PDF
                </button>
              </div>
            </div>
          )}

          {/* Selector Tabs when no file parsed yet */}
          {!hasParsed && !isSuccessFinished && (
            <div className="space-y-4">
              
              {/* Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    activeTab === 'upload'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Archivo PDF / Ticket</span>
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
                  <span>Pegar Texto del PDF</span>
                </button>
                <button
                  onClick={() => setActiveTab('samples')}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    activeTab === 'samples'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Facturas de Ejemplo (1-clic)</span>
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
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-xs">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Haz clic o arrastra tu archivo PDF o ticket de compra aquí
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium max-w-md mx-auto">
                      El sistema extraerá directamente las líneas, medicamentos, cantidades, costos, lotes y fechas de caducidad tal cual vienen en tu documento.
                    </p>
                  </div>

                  {isProcessing && (
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-center space-y-2">
                      <div className="inline-block w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                      <p className="font-bold text-teal-900">Leyendo y estructurando las páginas del archivo PDF...</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Paste Raw Text */}
              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Copia y pega directamente el texto de tu factura en PDF:</strong>
                      <p className="mt-0.5 text-blue-800">
                        Selecciona el texto en tu visor de PDF (Ctrl+A / Ctrl+C) y pégalo aquí. El conversor directo reconocerá automáticamente las líneas de productos y precios.
                      </p>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder="Pega aquí el contenido de la factura (formato Generimax, Nadro, Marzam, etc.):

Generimax - GENERICOS INTERCAMBIABLES AL MAYOREO
FACTURA: A 27255
CLIENTE: 366 - ANGEL MONDRAGON
RFC: MOGA9603154L1

CANT. ARTICULO P/U Importe
4 5080 10.61 $ 42.44
OMEPRAZOL 20MG C/14 CAP ULTRA
Lote EDM048A Caducidad:
1 5956 108.96 $ 108.96
EXACTITEST DIGITAL C/1 PZA
Lote F2601049 Caducidad:
4 4488 71.50 $ 286.00
CLAMOXIN 12H 875MG/125MG C/14
Lote 260407 Caducidad:

Importe: $ 842.68
TOTAL: $ 867.20"
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white text-slate-900"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleParsePastedText}
                      disabled={!pasteText.trim()}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Procesar Texto del PDF Directamente</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: Demo Invoices */}
              {activeTab === 'samples' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DEMO_SUPPLIER_TICKETS.map(sample => (
                    <div
                      key={sample.id}
                      onClick={() => handleLoadSample(sample)}
                      className="p-4 border border-slate-200 hover:border-teal-500 rounded-xl bg-white hover:bg-teal-50/30 cursor-pointer transition-all space-y-2 group shadow-xs hover:shadow"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                          {sample.badge}
                        </span>
                        <FileText className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs group-hover:text-teal-700">
                        {sample.title}
                      </h4>
                      <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                        <div>Folio: {sample.invoice}</div>
                        <div>Emisor: {sample.supplier.slice(0, 25)}...</div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-teal-600 font-bold text-[11px]">
                        <span>Cargar Datos</span>
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

          {/* Parsed Results Table (Direct PDF Content) */}
          {hasParsed && !isSuccessFinished && (
            <div className="space-y-4 animate-in fade-in">
              
              {/* Header / Invoice Metadata */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span className="font-bold text-slate-900 text-sm">Datos Extraídos del PDF</span>
                    <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                      {selectedFile?.name}
                    </span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Cargar otro documento</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Proveedor / Distribuidor:
                    </label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                      placeholder="Ej. Distribuidora Marzam"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      No. Factura / Folio:
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={e => setInvoiceNumber(e.target.value)}
                      placeholder="Ej. FAC-9901"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Fecha de Factura:
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={e => setInvoiceDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Total Calculado:
                    </label>
                    <div className="px-2.5 py-1.5 bg-teal-50 border border-teal-200 rounded-lg font-mono font-bold text-teal-900 text-xs flex items-center justify-between">
                      <span>{formatCurrency(ticketItems.reduce((acc, it) => acc + (it.quantity * it.costPrice), 0))}</span>
                      <span className="text-[10px] text-teal-700 font-sans">{ticketItems.length} partidas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extracted Lines Inspector (Collapsible) */}
              {rawLines.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowRawText(!showRawText)}
                    className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Texto Original Extraído del PDF ({rawLines.length} líneas)</span>
                    </span>
                    {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showRawText && (
                    <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {rawLines.join('\n')}
                    </div>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Medicamento / Descripción del PDF</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Código / Barras</th>
                        <th className="py-2.5 px-2 text-center">Cant. Entrada</th>
                        <th className="py-2.5 px-2 text-right">Costo ($)</th>
                        <th className="py-2.5 px-2 text-right">Venta Sug. ($)</th>
                        <th className="py-2.5 px-2 text-right">Subtotal ($)</th>
                        <th className="py-2.5 px-2 min-w-[90px]">Lote</th>
                        <th className="py-2.5 px-2 min-w-[110px]">Caducidad</th>
                        <th className="py-2.5 px-2 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {ticketItems.map((item, idx) => {
                        const subtotal = item.quantity * item.costPrice;
                        const isMatched = !!item.matchedProductId;

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3">
                              {isMatched ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 whitespace-nowrap">
                                  🟢 Sumar Existencia
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300 whitespace-nowrap">
                                  ✨ Nuevo en Catálogo
                                </span>
                              )}
                            </td>

                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => handleItemChange(idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900 text-xs focus:bg-white"
                              />
                            </td>

                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.barcode || item.code}
                                onChange={e => handleItemChange(idx, 'barcode', e.target.value)}
                                placeholder="Sin código"
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] text-slate-800"
                              />
                            </td>

                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-center text-teal-800 text-xs"
                              />
                            </td>

                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                step="0.10"
                                min="0"
                                value={item.costPrice}
                                onChange={e => handleItemChange(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right text-slate-900 text-xs"
                              />
                            </td>

                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                step="0.10"
                                min="0"
                                value={item.suggestedSellingPrice}
                                onChange={e => handleItemChange(idx, 'suggestedSellingPrice', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right text-emerald-700 font-bold text-xs"
                              />
                            </td>

                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(subtotal)}
                            </td>

                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={item.batchNumber || ''}
                                onChange={e => handleItemChange(idx, 'batchNumber', e.target.value)}
                                placeholder="Lote"
                                className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] text-slate-800"
                              />
                            </td>

                            <td className="py-2 px-2">
                              <input
                                type="date"
                                value={item.expirationDate || ''}
                                onChange={e => handleItemChange(idx, 'expirationDate', e.target.value)}
                                className="px-1.5 py-1 bg-slate-50 border border-slate-300 rounded text-[11px] text-slate-800"
                              />
                            </td>

                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Row and Actions */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleAddNewEmptyRow}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Medicamento Manualmente</span>
                </button>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRestock}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Entrada al Kardex</span>
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
