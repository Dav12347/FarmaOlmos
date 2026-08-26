import React, { useState } from 'react';
import { Product, PharmacySettings, Customer, Sale, InventoryMovement, DebtPayment, CashCut } from '../../types/pharmacy';
import { 
  exportInventoryTemplateForUpdate, 
  exportInventoryToCSV, 
  exportInventoryPhysicalAuditPDF, 
  exportProductsToJSON,
  exportFullDatabaseToExcel,
  FullDatabaseExportData 
} from '../../utils/exportUtils';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Database, 
  CheckCircle2, 
  X, 
  Layers, 
  Sparkles, 
  RefreshCw, 
  ClipboardList, 
  FileCode,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { getExpiryStatus } from '../../utils/formatters';

interface ExportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: PharmacySettings;
  customers?: Customer[];
  sales?: Sale[];
  movements?: InventoryMovement[];
  payments?: DebtPayment[];
  cashCuts?: CashCut[];
}

export const ExportInventoryModal: React.FC<ExportInventoryModalProps> = ({
  isOpen,
  onClose,
  products,
  settings,
  customers = [],
  sales = [],
  movements = [],
  payments = [],
  cashCuts = [],
}) => {
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'database'>('inventory');

  if (!isOpen) return null;

  const handleExportDetailedExcel = () => {
    const rows = products.map(p => {
      const exp = getExpiryStatus(p.expirationDate);
      return {
        'Código Único': p.code || p.barcode,
        'Código de Barras': p.barcode,
        'Nombre del Producto': p.name,
        'Descripción': p.description || '-',
        'Unidad de Medida': p.unitOfMeasure || 'Pieza',
        'Genérico / Sustancia': p.genericName || p.activeIngredient || '-',
        'Presentación': p.presentation,
        'Categoría': p.category,
        'Departamento': p.department || 'farmacia',
        'Precio de Costo': p.costPrice,
        'Precio de Venta': p.sellingPrice,
        'Existencia (Stock)': p.stock,
        'Stock Mínimo': p.minStock,
        'Valuación al Costo': p.costPrice * p.stock,
        'Valuación al Público': p.sellingPrice * p.stock,
        'Número de Lote': p.batchNumber || '-',
        'Fecha de Caducidad': p.expirationDate || '-',
        'Días Restantes Caducidad': exp.daysLeft === 9999 ? 'N/A' : exp.daysLeft,
        'Estado de Caducidad': exp.label,
        'Requiere Receta': p.prescriptionRequired ? 'SÍ' : 'NO',
        'Ubicación en Farmacia': p.location || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo de Medicamentos');
    const fileName = `Inventario_Farmacia_${settings.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showFeedback('✅ Archivo Excel descargado con éxito.');
  };

  const handleExportUpdateTemplate = () => {
    exportInventoryTemplateForUpdate(products, settings);
    showFeedback('✅ Plantilla de Actualización descargada. Puedes editar precios o stock y re-importarla en "Entrada Excel".');
  };

  const handleExportCSV = () => {
    exportInventoryToCSV(products);
    showFeedback('✅ Archivo CSV descargado con éxito.');
  };

  const handleExportAuditPDF = () => {
    exportInventoryPhysicalAuditPDF(products, settings);
    showFeedback('✅ Hoja de Conteo Físico e Inventario en PDF generada.');
  };

  const handleExportJSON = () => {
    exportProductsToJSON(products);
    showFeedback('✅ Respaldo JSON de productos descargado.');
  };

  const handleExportFullDB = () => {
    const dbData: FullDatabaseExportData = {
      products,
      customers,
      sales,
      movements,
      payments,
      cashCuts,
      settings,
    };
    exportFullDatabaseToExcel(dbData);
    showFeedback('✅ Base de Datos Completa (Excel multi-hoja) descargada.');
  };

  const showFeedback = (msg: string) => {
    setExportFeedback(msg);
    setTimeout(() => setExportFeedback(null), 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Centro de Exportación y Respaldos</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/30 text-teal-200 border border-teal-400/30 font-semibold">
                  {products.length} productos
                </span>
              </h2>
              <p className="text-xs text-teal-200/80 mt-0.5">
                Exporta tu inventario para editarlo en Excel o descarga la base de datos completa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Inventario</span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'database'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Base de Datos Completa</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {exportFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportFeedback}</span>
            </div>
          )}

          {activeTab === 'inventory' ? (
            <div className="space-y-3">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div className="text-teal-900 leading-relaxed">
                  <p className="font-bold">¿Cómo actualizar tu inventario mediante Excel?</p>
                  <p className="text-[11px] text-teal-800 mt-0.5">
                    Descarga la <strong>Plantilla de Actualización Masiva</strong>, modifica costos, precios o cantidades en Excel y súbela nuevamente usando el botón <strong>📊 Entrada Excel</strong> de la pantalla de inventario.
                  </p>
                </div>
              </div>

              {/* Option 1: Plantilla de Actualización Masiva (Featured) */}
              <div className="border-2 border-teal-500 bg-teal-50/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white">RECOMENDADO</span>
                    <h3 className="font-bold text-slate-900 text-sm">Plantilla Excel para Actualizaciones Masivas (.xlsx)</h3>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Contiene todos tus medicamentos con las columnas exactas para modificar precios, existencias y caducidades en Excel y re-importar con 1 clic.
                  </p>
                </div>
                <button
                  onClick={handleExportUpdateTemplate}
                  className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer whitespace-nowrap transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Descargar Plantilla</span>
                </button>
              </div>

              {/* Option 2: Excel Completo */}
              <div className="border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-slate-900">Catálogo Completo en Excel (.xlsx)</h3>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Incluye todas las columnas detalladas: valuación al costo, valuación al público, semáforo de caducidad y ubicación.
                  </p>
                </div>
                <button
                  onClick={handleExportDetailedExcel}
                  className="w-full sm:w-auto px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel Detallado</span>
                </button>
              </div>

              {/* Option 3: CSV Universal */}
              <div className="border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-slate-900">Formato CSV Universal (.csv)</h3>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Archivo ligero compatible con hojas de cálculo (Excel, Google Sheets, LibreOffice) codificado en UTF-8.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar CSV</span>
                </button>
              </div>

              {/* Option 4: Hoja de Auditoría / Conteo Físico PDF */}
              <div className="border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-amber-600" />
                    <h3 className="font-bold text-slate-900">Hoja de Conteo Físico y Auditoría (PDF)</h3>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Documento imprimible con casillas [ ] y líneas para cotejar existencias físicas en anaqueles y estantes.
                  </p>
                </div>
                <button
                  onClick={handleExportAuditPDF}
                  className="w-full sm:w-auto px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Imprimir PDF</span>
                </button>
              </div>

              {/* Option 5: Respaldo JSON de Productos */}
              <div className="border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-slate-900">Respaldo Técnico de Productos (JSON)</h3>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Estructura de datos para desarrolladores, migración de servidores o importación por código.
                  </p>
                </div>
                <button
                  onClick={handleExportJSON}
                  className="w-full sm:w-auto px-3.5 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Respaldo JSON</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                  <Database className="w-4 h-4" />
                  <span>Respaldo Integral de la Base de Datos</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Exporta todas las tablas de tu farmacia en un solo archivo con pestañas individuales: Inventario, Clientes, Deudas, Ventas, Kardex, Abonos y Cortes de Caja.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400">Productos:</span> <strong className="text-teal-300">{products.length}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Clientes:</span> <strong className="text-teal-300">{customers.length}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Ventas:</span> <strong className="text-teal-300">{sales.length}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Movimientos:</span> <strong className="text-teal-300">{movements.length}</strong>
                  </div>
                </div>
              </div>

              {/* Botón Excel Multi-Pestaña */}
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white shadow-xs">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                    <span>Descargar Toda la Base de Datos en Excel (.xlsx)</span>
                  </h3>
                  <p className="text-slate-600 text-[11px]">
                    Crea un libro de Excel con 7 hojas separadas con todos los registros históricos de tu farmacia.
                  </p>
                </div>
                <button
                  onClick={handleExportFullDB}
                  className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar a Excel</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Exportaciones directas sin límite de registros
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
