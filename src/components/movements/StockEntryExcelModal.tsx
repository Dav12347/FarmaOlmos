import React, { useState, useRef } from 'react';
import { Product, InventoryMovement, MovementItem, ProductDepartment } from '../../types/pharmacy';
import { formatCurrency, generateFolio } from '../../utils/formatters';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  Package, 
  Sparkles,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExcelEntryRow {
  id: string;
  barcode: string;
  code: string;
  name: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  batchNumber: string;
  expirationDate: string;
  category: string;
  department: ProductDepartment;
  matchedProductId?: string;
  isNewProduct: boolean;
}

interface StockEntryExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onConfirmEntry: (
    updatedProducts: Product[], 
    movement: InventoryMovement, 
    newCount: number, 
    updatedCount: number
  ) => void;
}

export const StockEntryExcelModal: React.FC<StockEntryExcelModalProps> = ({
  isOpen,
  onClose,
  products,
  onConfirmEntry,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [fileName, setFileName] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('Distribuidora Mayorista');
  const [referenceInvoice, setReferenceInvoice] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [rows, setRows] = useState<ExcelEntryRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSuccessFinished, setIsSuccessFinished] = useState<boolean>(false);
  const [successStats, setSuccessStats] = useState<{ newCount: number; updatedCount: number; totalCost: number } | null>(null);

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Código de Barras': '7501008492011',
        'Código / SKU': 'MED-7501001',
        'Nombre del Producto': 'Paracetamol 500mg (20 tabletas)',
        'Cantidad Entrada': 25,
        'Precio Costo Unitario': 18.50,
        'Precio Venta Sugerido': 38.00,
        'Número de Lote': 'L-24098A',
        'Fecha Caducidad (AAAA-MM-DD)': '2027-10-15',
        'Categoría': 'Analgésicos',
        'Departamento (farmacia/bebidas/dulces/botanas/higiene/otros)': 'farmacia'
      },
      {
        'Código de Barras': '7501008492028',
        'Código / SKU': 'MED-7501002',
        'Nombre del Producto': 'Amoxicilina / Ác. Clavulánico 500/125mg',
        'Cantidad Entrada': 15,
        'Precio Costo Unitario': 95.00,
        'Precio Venta Sugerido': 165.00,
        'Número de Lote': 'L-24115B',
        'Fecha Caducidad (AAAA-MM-DD)': '2026-11-20',
        'Categoría': 'Antibióticos',
        'Departamento (farmacia/bebidas/dulces/botanas/higiene/otros)': 'farmacia'
      },
      {
        'Código de Barras': '7501055300078',
        'Código / SKU': 'BEB-7501055',
        'Nombre del Producto': 'Coca-Cola Original 600ml',
        'Cantidad Entrada': 48,
        'Precio Costo Unitario': 13.50,
        'Precio Venta Sugerido': 19.00,
        'Número de Lote': 'BEB-2603',
        'Fecha Caducidad (AAAA-MM-DD)': '2027-08-01',
        'Categoría': 'Bebidas y Aguas',
        'Departamento (farmacia/bebidas/dulces/botanas/higiene/otros)': 'bebidas'
      },
      {
        'Código de Barras': '7501000111029',
        'Código / SKU': 'DLC-7501000',
        'Nombre del Producto': 'Mazapán De la Rosa 28g',
        'Cantidad Entrada': 60,
        'Precio Costo Unitario': 4.80,
        'Precio Venta Sugerido': 8.50,
        'Número de Lote': 'DLC-2612',
        'Fecha Caducidad (AAAA-MM-DD)': '2027-04-10',
        'Categoría': 'Dulces y Golosinas',
        'Departamento (farmacia/bebidas/dulces/botanas/higiene/otros)': 'dulces'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entrada de Stock');
    XLSX.writeFile(wb, 'Plantilla_Entrada_Stock_Farmacia.xlsx');
  };

  // Process uploaded Excel file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawJson.length === 0) {
          setErrorMessage('El archivo Excel está vacío o no contiene filas de datos.');
          setIsProcessing(false);
          return;
        }

        const parsedRows: ExcelEntryRow[] = rawJson.map((row, idx) => {
          // Normalize column headers to support various Spanish naming conventions
          const barcode = String(
            row['Código de Barras'] || 
            row['Codigo de Barras'] || 
            row['Código de barras'] || 
            row['Codigo'] || 
            row['Código'] || 
            row['Barcode'] || 
            row['EAN'] || 
            ''
          ).trim();

          const code = String(
            row['Código / SKU'] || 
            row['Codigo / SKU'] || 
            row['ARTICULO'] || 
            row['Articulo'] || 
            row['ARTÍCULO'] || 
            row['Artículo'] || 
            row['SKU'] || 
            row['Clave'] || 
            barcode || 
            `MED-${100000 + idx}`
          ).trim();

          const name = String(
            row['Nombre del Producto'] || 
            row['Nombre'] || 
            row['Medicamento'] || 
            row['DESCRIPCION'] || 
            row['Descripcion'] || 
            row['Descripción'] || 
            row['Producto'] || 
            `Producto Fila ${idx + 1}`
          ).trim();

          const qtyRaw = row['Cantidad Entrada'] || row['Cantidad'] || row['CANT.'] || row['CANT'] || row['Cant'] || row['Stock'] || row['Piezas'] || 1;
          const quantity = Math.max(1, parseInt(String(qtyRaw).replace(/[^\d]/g, ''), 10) || 1);

          const costRaw = row['Precio Costo Unitario'] || row['Precio de Costo'] || row['P/U'] || row['PU'] || row['Costo'] || row['Precio Costo'] || 0;
          const costPrice = Math.max(0, parseFloat(String(costRaw).replace(/[^0-9.]/g, '')) || 0);

          let sellRaw = row['Precio Venta Sugerido'] || row['Precio de Venta'] || row['Precio Venta'] || row['Venta'] || 0;
          let sellingPrice = parseFloat(String(sellRaw).replace(/[^0-9.]/g, '')) || 0;
          if (sellingPrice <= costPrice) {
            sellingPrice = Number((costPrice * 1.40).toFixed(2));
          }

          const batchNumber = String(
            row['Número de Lote'] || 
            row['Numero de Lote'] || 
            row['Lote'] || 
            ''
          ).trim();

          let expirationDate = '';
          const expRaw = row['Fecha Caducidad (AAAA-MM-DD)'] || row['Fecha Caducidad'] || row['Caducidad'] || row['Vencimiento'] || '';
          if (expRaw instanceof Date) {
            expirationDate = expRaw.toISOString().split('T')[0];
          } else if (typeof expRaw === 'string' && expRaw.trim()) {
            expirationDate = expRaw.trim();
          }

          const category = String(row['Categoría'] || row['Categoria'] || 'Analgésicos').trim();
          
          let deptRaw = String(row['Departamento'] || 'farmacia').toLowerCase().trim();
          const validDepartments: ProductDepartment[] = ['farmacia', 'bebidas', 'dulces', 'botanas', 'higiene', 'otros'];
          const department: ProductDepartment = validDepartments.includes(deptRaw as ProductDepartment)
            ? (deptRaw as ProductDepartment)
            : 'farmacia';

          // Match with existing product
          let matchedProd = products.find(p => barcode && p.barcode && p.barcode.trim() === barcode);
          if (!matchedProd && code) {
            matchedProd = products.find(p => p.code && p.code.toLowerCase() === code.toLowerCase());
          }
          if (!matchedProd && name) {
            matchedProd = products.find(p => p.name.toLowerCase() === name.toLowerCase());
          }

          return {
            id: `excel-row-${idx}-${Date.now()}`,
            barcode: barcode || (matchedProd ? matchedProd.barcode : ''),
            code: code || (matchedProd ? matchedProd.code : `MED-${100000 + idx}`),
            name: name,
            quantity: quantity,
            costPrice: costPrice > 0 ? costPrice : (matchedProd ? matchedProd.costPrice : 0),
            sellingPrice: sellingPrice > 0 ? sellingPrice : (matchedProd ? matchedProd.sellingPrice : 0),
            batchNumber: batchNumber || (matchedProd?.batchNumber || ''),
            expirationDate: expirationDate || (matchedProd?.expirationDate || ''),
            category: category || (matchedProd?.category || 'Analgésicos'),
            department: department || (matchedProd?.department || 'farmacia'),
            matchedProductId: matchedProd ? matchedProd.id : undefined,
            isNewProduct: !matchedProd,
          };
        });

        setRows(parsedRows);
        if (!referenceInvoice) {
          setReferenceInvoice(`EXC-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`);
        }
        setIsProcessing(false);
      } catch (err: any) {
        setErrorMessage('Error al procesar el archivo Excel: ' + err.message);
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Error al leer el archivo desde el dispositivo.');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleRowChange = (index: number, field: keyof ExcelEntryRow, value: any) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'costPrice') {
        const newCost = Number(value) || 0;
        next[index].sellingPrice = Number((newCost * 1.40).toFixed(2));
      }
      return next;
    });
  };

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmStockEntry = () => {
    if (rows.length === 0) {
      alert('No hay medicamentos ni productos en la lista para ingresar.');
      return;
    }

    const invalid = rows.find(r => !r.name.trim() || r.quantity <= 0);
    if (invalid) {
      alert('Verifica que todas las filas tengan nombre y una cantidad de entrada mayor a 0.');
      return;
    }

    let updatedProducts = [...products];
    let newCreatedCount = 0;
    let existingUpdatedCount = 0;
    let totalMovementValue = 0;

    const movementItems: MovementItem[] = rows.map(r => {
      const subtotal = r.quantity * r.costPrice;
      totalMovementValue += subtotal;

      const existingIndex = r.matchedProductId
        ? updatedProducts.findIndex(p => p.id === r.matchedProductId)
        : updatedProducts.findIndex(
            p => (r.barcode && p.barcode === r.barcode) || p.name.toLowerCase() === r.name.toLowerCase()
          );

      if (existingIndex >= 0) {
        const existing = updatedProducts[existingIndex];
        const newStock = existing.stock + r.quantity;
        
        updatedProducts[existingIndex] = {
          ...existing,
          stock: newStock,
          costPrice: r.costPrice > 0 ? r.costPrice : existing.costPrice,
          sellingPrice: r.sellingPrice > 0 ? r.sellingPrice : existing.sellingPrice,
          batchNumber: r.batchNumber || existing.batchNumber,
          expirationDate: r.expirationDate || existing.expirationDate,
        };
        existingUpdatedCount++;

        return {
          productId: existing.id,
          productName: existing.name,
          quantity: r.quantity,
          costPrice: r.costPrice,
          subtotal,
          batchNumber: r.batchNumber || existing.batchNumber,
          expirationDate: r.expirationDate || existing.expirationDate,
        };
      } else {
        const newProdId = `prod-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const newProduct: Product = {
          id: newProdId,
          code: r.code || `MED-${Math.floor(100000 + Math.random() * 900000)}`,
          barcode: r.barcode || r.code || `${Date.now()}`,
          name: r.name,
          description: `Ingresado desde Excel de compra (${supplierName})`,
          unitOfMeasure: 'Pieza',
          presentation: 'Pieza',
          category: r.category || 'Analgésicos',
          department: r.department || 'farmacia',
          costPrice: r.costPrice,
          sellingPrice: r.sellingPrice,
          stock: r.quantity,
          minStock: 5,
          batchNumber: r.batchNumber || '',
          expirationDate: r.expirationDate || '',
          prescriptionRequired: false,
          createdAt: new Date().toISOString(),
        };

        updatedProducts = [newProduct, ...updatedProducts];
        newCreatedCount++;

        return {
          productId: newProdId,
          productName: newProduct.name,
          quantity: r.quantity,
          costPrice: r.costPrice,
          subtotal,
          batchNumber: r.batchNumber,
          expirationDate: r.expirationDate,
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
      totalValue: totalMovementValue,
      supplierOrDestination: supplierName || 'Proveedor / Distribuidor',
      referenceInvoice: referenceInvoice || 'Entrada Excel',
      notes: notes || `Entrada masiva importada desde archivo Excel: ${fileName}. Total productos: ${rows.length}`,
      registeredBy: 'Farmacéutico Encargado',
    };

    onConfirmEntry(updatedProducts, newMovement, newCreatedCount, existingUpdatedCount);

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });

    setSuccessStats({
      newCount: newCreatedCount,
      updatedCount: existingUpdatedCount,
      totalCost: totalMovementValue,
    });
    setIsSuccessFinished(true);
  };

  const handleReset = () => {
    setFileName('');
    setRows([]);
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
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Entrada Masiva de Stock con Archivo Excel (.xlsx / .csv)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Carga compras a proveedores, remisiones o pedidos completos en Excel para sumar existencias y actualizar costos
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
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">¡Entrada desde Excel Aplicada con Éxito!</h3>
                <p className="text-slate-600 text-xs">
                  Se actualizaron las existencias en tu inventario y se registró el movimiento oficial en el Kardex.
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
                  <span className="text-[10px] text-slate-500 font-medium">Inversión de Entrada</span>
                  <div className="text-base font-mono font-bold text-slate-900">{formatCurrency(successStats.totalCost)}</div>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Ver Movimientos en Kardex</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cargar Otro Excel
                </button>
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          {rows.length === 0 && !isSuccessFinished && (
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-xs">¿No tienes el formato de Excel?</h4>
                    <p className="text-[11px] text-emerald-800">
                      Descarga nuestra plantilla oficial con columnas listas de código de barras, cantidad, costo, lote y caducidad.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Plantilla Excel</span>
                </button>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-2xl p-10 text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Haz clic o arrastra tu archivo Excel de entrada aquí (.xlsx / .csv)
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium max-w-md mx-auto">
                  El sistema detectará automáticamente las columnas, sumará el stock a los productos existentes o creará nuevos productos si no estaban registrados.
                </p>
              </div>

              {isProcessing && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <p className="font-bold text-emerald-900">Procesando y validando filas del Excel...</p>
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

          {/* Review Rows Table */}
          {rows.length > 0 && !isSuccessFinished && (
            <div className="space-y-4 animate-in fade-in">
              
              {/* Metadata Banner */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-sm">Datos de la Entrada de Stock</span>
                    <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                      {fileName}
                    </span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Cargar otro archivo</span>
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
                      placeholder="Ej. Nadro / Marzam / Costco"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      No. Factura / Folio Remisión:
                    </label>
                    <input
                      type="text"
                      value={referenceInvoice}
                      onChange={e => setReferenceInvoice(e.target.value)}
                      placeholder="Ej. FAC-9901"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Fecha de Entrada:
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
                      Total de la Entrada:
                    </label>
                    <div className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg font-mono font-bold text-emerald-800 text-xs flex items-center justify-between">
                      <span>{formatCurrency(rows.reduce((acc, r) => acc + (r.quantity * r.costPrice), 0))}</span>
                      <span className="text-[10px] text-emerald-600 font-sans">{rows.length} artículos</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Medicamento / Producto</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Código de Barras</th>
                        <th className="py-2.5 px-2 text-center">Cant. Entrada</th>
                        <th className="py-2.5 px-2 text-right">Costo ($)</th>
                        <th className="py-2.5 px-2 text-right">Venta ($)</th>
                        <th className="py-2.5 px-2 text-right">Subtotal ($)</th>
                        <th className="py-2.5 px-2 min-w-[90px]">Lote</th>
                        <th className="py-2.5 px-2 min-w-[110px]">Caducidad</th>
                        <th className="py-2.5 px-2 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {rows.map((row, idx) => {
                        const subtotal = row.quantity * row.costPrice;
                        const isMatched = !!row.matchedProductId;

                        return (
                          <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3">
                              {isMatched ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 whitespace-nowrap">
                                  🟢 Sumar Existencia
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300 whitespace-nowrap">
                                  ✨ Nuevo Producto
                                </span>
                              )}
                            </td>

                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.name}
                                onChange={e => handleRowChange(idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900 text-xs focus:bg-white"
                              />
                            </td>

                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.barcode}
                                onChange={e => handleRowChange(idx, 'barcode', e.target.value)}
                                placeholder="Sin código"
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] text-slate-800"
                              />
                            </td>

                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={e => handleRowChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-center text-emerald-800 text-xs"
                              />
                            </td>

                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                step="0.10"
                                min="0"
                                value={row.costPrice}
                                onChange={e => handleRowChange(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right text-slate-900 text-xs"
                              />
                            </td>

                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                step="0.10"
                                min="0"
                                value={row.sellingPrice}
                                onChange={e => handleRowChange(idx, 'sellingPrice', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right text-emerald-700 font-bold text-xs"
                              />
                            </td>

                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(subtotal)}
                            </td>

                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.batchNumber}
                                onChange={e => handleRowChange(idx, 'batchNumber', e.target.value)}
                                placeholder="Lote"
                                className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] text-slate-800"
                              />
                            </td>

                            <td className="py-2 px-2">
                              <input
                                type="date"
                                value={row.expirationDate}
                                onChange={e => handleRowChange(idx, 'expirationDate', e.target.value)}
                                className="px-1.5 py-1 bg-slate-50 border border-slate-300 rounded text-[11px] text-slate-800"
                              />
                            </td>

                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
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

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-900">{rows.length}</span> medicamentos listos para ingresar.
                </div>

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
                    onClick={handleConfirmStockEntry}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar e Ingresar a Kardex</span>
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
