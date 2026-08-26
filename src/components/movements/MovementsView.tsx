import React, { useState, useMemo } from 'react';
import { 
  InventoryMovement, 
  MovementType, 
  MovementReason, 
  MovementItem, 
  Product, 
  PharmacySettings 
} from '../../types/pharmacy';
import { 
  formatCurrency, 
  formatDateTime, 
  formatDate, 
  generateFolio 
} from '../../utils/formatters';
import { 
  ArrowLeftRight, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  Package, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Clock, 
  Building2,
  FileSpreadsheet,
  Upload,
  Sparkles
} from 'lucide-react';
import { SupplierTicketModal } from '../inventory/SupplierTicketModal';
import { StockEntryExcelModal } from './StockEntryExcelModal';

interface MovementsViewProps {
  movements: InventoryMovement[];
  products: Product[];
  settings: PharmacySettings;
  movementsCount: number;
  onRegisterMovement: (movement: InventoryMovement, updatedProducts: Product[]) => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  movements,
  products,
  settings,
  movementsCount,
  onRegisterMovement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'entry' | 'exit'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovementDetail, setSelectedMovementDetail] = useState<InventoryMovement | null>(null);

  // Modals for Ticket/PDF and Excel Bulk Entry
  const [isSupplierTicketModalOpen, setIsSupplierTicketModalOpen] = useState(false);
  const [isStockEntryExcelModalOpen, setIsStockEntryExcelModalOpen] = useState(false);

  // New Movement Form State
  const [movementType, setMovementType] = useState<MovementType>('entry');
  const [movementReason, setMovementReason] = useState<MovementReason>('compra');
  const [supplierOrDestination, setSupplierOrDestination] = useState('');
  const [referenceInvoice, setReferenceInvoice] = useState('');
  const [notes, setNotes] = useState('');
  const [registeredBy, setRegisteredBy] = useState('Farmacéutico Responsable');
  
  // Dynamic Items inside the new movement
  const [movementItems, setMovementItems] = useState<Array<{
    productId: string;
    quantity: number;
    costPrice: number;
    batchNumber: string;
    expirationDate: string;
  }>>([]);

  const openNewMovementModal = (type: MovementType) => {
    setMovementType(type);
    setMovementReason(type === 'entry' ? 'compra' : 'caducidad');
    setSupplierOrDestination(type === 'entry' ? 'Distribuidora Farmacéutica' : 'Destrucción / Merma');
    setReferenceInvoice('');
    setNotes('');
    setMovementItems([
      {
        productId: products[0]?.id || '',
        quantity: 1,
        costPrice: products[0]?.costPrice || 0,
        batchNumber: products[0]?.batchNumber || '',
        expirationDate: products[0]?.expirationDate || '',
      }
    ]);
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    const firstProd = products[0];
    setMovementItems(prev => [
      ...prev,
      {
        productId: firstProd?.id || '',
        quantity: 1,
        costPrice: firstProd?.costPrice || 0,
        batchNumber: firstProd?.batchNumber || '',
        expirationDate: firstProd?.expirationDate || '',
      }
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setMovementItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleProductSelectChange = (idx: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setMovementItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          productId,
          costPrice: prod.costPrice,
          batchNumber: prod.batchNumber || '',
          expirationDate: prod.expirationDate || '',
        };
      }
      return item;
    }));
  };

  const handleItemFieldChange = (idx: number, field: string, value: any) => {
    setMovementItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const totalMovementValue = useMemo(() => {
    return movementItems.reduce((sum, it) => sum + (it.costPrice * it.quantity), 0);
  }, [movementItems]);

  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();

    if (movementItems.length === 0) {
      alert('Debe agregar al menos un medicamento al movimiento.');
      return;
    }

    // Validate quantities
    for (const item of movementItems) {
      if (item.quantity <= 0) {
        alert('La cantidad de todos los medicamentos debe ser mayor a 0.');
        return;
      }

      if (movementType === 'exit') {
        const prod = products.find(p => p.id === item.productId);
        if (prod && item.quantity > prod.stock) {
          alert(`No se puede dar salida a ${item.quantity} unidades de "${prod.name}" porque solo hay ${prod.stock} en inventario.`);
          return;
        }
      }
    }

    const folioPrefix = movementType === 'entry' ? 'ENT' : 'SAL';
    const newFolio = generateFolio(folioPrefix, movementsCount);

    const fullItems: MovementItem[] = movementItems.map(it => {
      const prod = products.find(p => p.id === it.productId);
      return {
        productId: it.productId,
        productName: prod ? prod.name : 'Medicamento',
        quantity: Number(it.quantity),
        costPrice: Number(it.costPrice),
        subtotal: Number(it.quantity) * Number(it.costPrice),
        batchNumber: it.batchNumber,
        expirationDate: it.expirationDate,
      };
    });

    const newMovement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      folio: newFolio,
      type: movementType,
      reason: movementReason,
      date: new Date().toISOString(),
      items: fullItems,
      totalValue: totalMovementValue,
      supplierOrDestination,
      referenceInvoice,
      notes,
      registeredBy: registeredBy || 'Responsable',
    };

    // Update product stocks in catalog
    const updatedProducts = products.map(prod => {
      const foundItem = movementItems.find(it => it.productId === prod.id);
      if (foundItem) {
        const delta = movementType === 'entry' ? foundItem.quantity : -foundItem.quantity;
        return {
          ...prod,
          stock: Math.max(0, prod.stock + delta),
          costPrice: movementType === 'entry' && foundItem.costPrice > 0 ? foundItem.costPrice : prod.costPrice,
          batchNumber: movementType === 'entry' && foundItem.batchNumber ? foundItem.batchNumber : prod.batchNumber,
          expirationDate: movementType === 'entry' && foundItem.expirationDate ? foundItem.expirationDate : prod.expirationDate,
        };
      }
      return prod;
    });

    onRegisterMovement(newMovement, updatedProducts);
    setIsModalOpen(false);
  };

  const filteredMovements = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return movements.filter(m => {
      if (filterType !== 'all' && m.type !== filterType) return false;
      if (!q) return true;

      return (
        m.folio.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q) ||
        (m.supplierOrDestination && m.supplierOrDestination.toLowerCase().includes(q)) ||
        (m.referenceInvoice && m.referenceInvoice.toLowerCase().includes(q)) ||
        m.items.some(it => it.productName.toLowerCase().includes(q))
      );
    });
  }, [movements, searchTerm, filterType]);

  const totalEntriesValue = useMemo(() => {
    return movements.filter(m => m.type === 'entry').reduce((sum, m) => sum + m.totalValue, 0);
  }, [movements]);

  const totalExitsValue = useMemo(() => {
    return movements.filter(m => m.type === 'exit').reduce((sum, m) => sum + m.totalValue, 0);
  }, [movements]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900  flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-teal-600" />
            Entradas y Salidas de Inventario (Kardex)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de compras a proveedores, ajustes, mermas, caducidades y donaciones
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cargar Ticket o Factura PDF */}
          <button
            onClick={() => setIsSupplierTicketModalOpen(true)}
            className="px-3 py-2 bg-gradient-to-r from-teal-800 to-teal-900 hover:from-teal-700 hover:to-teal-800 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Ingresar medicamentos reconociendo tickets de compra o facturas PDF con IA"
          >
            <FileText className="w-4 h-4 text-teal-300" />
            <span>📥 Entrada con Ticket / PDF</span>
          </button>

          {/* Importar con Excel */}
          <button
            onClick={() => setIsStockEntryExcelModalOpen(true)}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Cargar entrada masiva de compras desde archivo Excel (.xlsx / .csv)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>📊 Entrada desde Excel</span>
          </button>

          {/* Salida / Merma */}
          <button
            onClick={() => openNewMovementModal('exit')}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>- Salida / Merma</span>
          </button>

          {/* Registrar Entrada Manual */}
          <button
            onClick={() => openNewMovementModal('entry')}
            className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Entrada Manual</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white  p-4 rounded-xl border border-slate-200  shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50  text-teal-600 rounded-xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Entradas (Compras/Ajustes)</span>
            <div className="text-lg font-bold text-teal-700  mt-0.5">
              {formatCurrency(totalEntriesValue)}
            </div>
          </div>
        </div>

        <div className="bg-white  p-4 rounded-xl border border-slate-200  shadow-xs flex items-center gap-3">
          <div className="p-3 bg-rose-50  text-rose-600 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Salidas (Mermas/Caducidades)</span>
            <div className="text-lg font-bold text-rose-700  mt-0.5">
              {formatCurrency(totalExitsValue)}
            </div>
          </div>
        </div>

        <div className="bg-white  p-4 rounded-xl border border-slate-200  shadow-xs flex items-center gap-3">
          <div className="p-3 bg-slate-100  text-slate-600 rounded-xl">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Movimientos Totales</span>
            <div className="text-lg font-bold text-slate-900  mt-0.5">
              {movements.length} registros
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white  p-4 rounded-xl border border-slate-200  shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por folio, proveedor, motivo, medicamento..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50  border border-slate-200  rounded-lg text-xs text-slate-900  focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-800 text-white  '
                : 'bg-slate-100  text-slate-600 '
            }`}
          >
            Todos ({movements.length})
          </button>
          <button
            onClick={() => setFilterType('entry')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterType === 'entry'
                ? 'bg-teal-600 text-white'
                : 'bg-teal-50 text-teal-800  '
            }`}
          >
            Solo Entradas
          </button>
          <button
            onClick={() => setFilterType('exit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterType === 'exit'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800  '
            }`}
          >
            Solo Salidas
          </button>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white  rounded-xl border border-slate-200  shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 ">
            <thead className="bg-slate-50  text-[11px] font-bold text-slate-500  uppercase tracking-wider border-b border-slate-200 ">
              <tr>
                <th className="py-3 px-4">Folio / Fecha</th>
                <th className="py-3 px-4">Tipo y Motivo</th>
                <th className="py-3 px-4">Proveedor / Destino</th>
                <th className="py-3 px-4">Referencia / Factura</th>
                <th className="py-3 px-4">Artículos</th>
                <th className="py-3 px-4">Importe Total</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {filteredMovements.map(m => {
                const isEntry = m.type === 'entry';
                const totalUnits = m.items.reduce((s, i) => s + i.quantity, 0);

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80  transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900  font-mono">{m.folio}</div>
                      <div className="text-[10px] text-slate-500">{formatDateTime(m.date)}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isEntry
                              ? 'bg-teal-100 text-teal-800  '
                              : 'bg-rose-100 text-rose-800  '
                          }`}
                        >
                          {isEntry ? 'ENTRADA' : 'SALIDA'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                        {m.reason.replace('_', ' ')}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 ">
                        {m.supplierOrDestination || '-'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {m.referenceInvoice || '-'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 ">{totalUnits} un.</span>
                      <div className="text-[10px] text-slate-400">({m.items.length} productos)</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`font-bold ${isEntry ? 'text-teal-700 ' : 'text-rose-700 '}`}>
                        {formatCurrency(m.totalValue)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {m.registeredBy}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedMovementDetail(m)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200   text-slate-700  rounded font-semibold text-[11px] cursor-pointer"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    No se encontraron movimientos de inventario registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Movement Modal (Entrada / Salida) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white  rounded-xl shadow-2xl border border-slate-200  w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-200  bg-slate-50  flex justify-between items-center">
              <div className="flex items-center gap-2">
                {movementType === 'entry' ? (
                  <div className="p-1.5 bg-teal-100  text-teal-700 rounded-md">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-rose-100  text-rose-700 rounded-md">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 ">
                    {movementType === 'entry' ? 'Registrar Entrada de Medicamentos' : 'Registrar Salida / Merma de Medicamentos'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Afecta las existencias del catálogo automáticamente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovement} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              
              {/* Shortcut Banner for Bulk / Ticket / PDF / Excel Entry */}
              {movementType === 'entry' && (
                <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 text-teal-900">
                    <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-[11px] font-medium">
                      ¿Tienes una factura en PDF, foto del ticket o archivo Excel de tu proveedor?
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setIsSupplierTicketModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ticket / PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setIsStockEntryExcelModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Motivo del Movimiento:
                  </label>
                  <select
                    value={movementReason}
                    onChange={e => setMovementReason(e.target.value as MovementReason)}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  >
                    {movementType === 'entry' ? (
                      <>
                        <option value="compra">Compra a Proveedor / Distribuidor</option>
                        <option value="ajuste_inventario">Ajuste Positivo de Inventario</option>
                        <option value="devolucion_cliente">Devolución de Cliente</option>
                        <option value="donacion">Donación Recibida</option>
                      </>
                    ) : (
                      <>
                        <option value="caducidad">Medicamento Caducado (Baja Sanitaria)</option>
                        <option value="merma">Merma / Pérdida</option>
                        <option value="danado">Empaque Dañado / Roto</option>
                        <option value="uso_interno">Uso Interno / Botiquín Farmacia</option>
                        <option value="ajuste_negativo">Ajuste Negativo de Inventario</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    {movementType === 'entry' ? 'Proveedor / Origen:' : 'Destino / Acta:'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={movementType === 'entry' ? 'Ej. Distribuidora Marzam / Nadro' : 'Ej. Acta de Destrucción / Merma'}
                    value={supplierOrDestination}
                    onChange={e => setSupplierOrDestination(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Factura / Remisión / Ref:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-99824"
                    value={referenceInvoice}
                    onChange={e => setReferenceInvoice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  />
                </div>
              </div>

              {/* Items Table Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800  flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-teal-600" />
                    Medicamentos a {movementType === 'entry' ? 'Ingresar' : 'Dar de Baja'}:
                  </span>

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 bg-teal-50  text-teal-700  hover:bg-teal-100 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Agregar Medicamento
                  </button>
                </div>

                <div className="border border-slate-200  rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100  text-slate-600 ">
                      <tr>
                        <th className="py-2 px-3">Medicamento</th>
                        <th className="py-2 px-3 w-20">Cantidad</th>
                        <th className="py-2 px-3 w-24">Costo Unit.</th>
                        <th className="py-2 px-3 w-28">Lote</th>
                        <th className="py-2 px-3 w-32">Caducidad</th>
                        <th className="py-2 px-3 w-24">Subtotal</th>
                        <th className="py-2 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 ">
                      {movementItems.map((row, idx) => {
                        const selProd = products.find(p => p.id === row.productId);
                        return (
                          <tr key={idx} className="bg-white ">
                            <td className="py-2 px-2">
                              <select
                                value={row.productId}
                                onChange={e => handleProductSelectChange(idx, e.target.value)}
                                className="w-full p-1.5 bg-slate-50  border border-slate-300  rounded text-xs"
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (Stock: {p.stock})
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={e => handleItemFieldChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full p-1.5 bg-slate-50  border border-slate-300  rounded text-center font-bold"
                              />
                            </td>

                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={row.costPrice}
                                onChange={e => handleItemFieldChange(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                                className="w-full p-1.5 bg-slate-50  border border-slate-300  rounded text-right"
                              />
                            </td>

                            <td className="py-2 px-2">
                              <input
                                type="text"
                                placeholder="Lote"
                                value={row.batchNumber}
                                onChange={e => handleItemFieldChange(idx, 'batchNumber', e.target.value)}
                                className="w-full p-1.5 bg-slate-50  border border-slate-300  rounded"
                              />
                            </td>

                            <td className="py-2 px-2">
                              <input
                                type="date"
                                value={row.expirationDate}
                                onChange={e => handleItemFieldChange(idx, 'expirationDate', e.target.value)}
                                className="w-full p-1.5 bg-slate-50  border border-slate-300  rounded text-[11px]"
                              />
                            </td>

                            <td className="py-2 px-2 text-right font-bold text-slate-900 ">
                              {formatCurrency(row.quantity * row.costPrice)}
                            </td>

                            <td className="py-2 px-2 text-center">
                              {movementItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total Value Row */}
                <div className="mt-2 flex justify-end">
                  <div className="bg-slate-100  px-4 py-2 rounded-lg flex items-center gap-4 text-xs">
                    <span className="font-semibold text-slate-600 ">Valor Total del Movimiento:</span>
                    <span className="text-base font-black text-slate-900 ">
                      {formatCurrency(totalMovementValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes & Responsible */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Registrado por:
                  </label>
                  <input
                    type="text"
                    value={registeredBy}
                    onChange={e => setRegisteredBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Observaciones / Motivo detallado:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Revisión física con proveedor..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200  flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600  hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer ${
                    movementType === 'entry' ? 'bg-teal-600 hover:bg-teal-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirmar {movementType === 'entry' ? 'Entrada de Stock' : 'Salida de Stock'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Movement Detail View Modal */}
      {selectedMovementDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white  rounded-xl shadow-2xl border border-slate-200  w-full max-w-xl overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-200  bg-slate-50  flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-slate-900 ">
                  Detalle de Movimiento: {selectedMovementDetail.folio}
                </h3>
                <p className="text-[11px] text-slate-500">{formatDateTime(selectedMovementDetail.date)}</p>
              </div>
              <button
                onClick={() => setSelectedMovementDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50  rounded-lg border border-slate-200 ">
                <div>
                  <span className="text-slate-400">Tipo:</span>
                  <span className="ml-2 font-bold uppercase">{selectedMovementDetail.type}</span>
                </div>
                <div>
                  <span className="text-slate-400">Motivo:</span>
                  <span className="ml-2 font-semibold">{selectedMovementDetail.reason.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-400">Origen / Destino:</span>
                  <span className="ml-2 font-medium">{selectedMovementDetail.supplierOrDestination || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Factura / Ref:</span>
                  <span className="ml-2 font-mono">{selectedMovementDetail.referenceInvoice || '-'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900  mb-2">Medicamentos Registrados:</h4>
                <div className="border border-slate-200  rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100  text-slate-600  text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Medicamento</th>
                        <th className="py-2 px-3">Cant.</th>
                        <th className="py-2 px-3">Costo</th>
                        <th className="py-2 px-3">Lote / Caducidad</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 ">
                      {selectedMovementDetail.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium">{it.productName}</td>
                          <td className="py-2 px-3 font-bold">{it.quantity} un.</td>
                          <td className="py-2 px-3">{formatCurrency(it.costPrice)}</td>
                          <td className="py-2 px-3 text-[11px] text-slate-500">
                            {it.batchNumber || '-'} {it.expirationDate ? `(${formatDate(it.expirationDate)})` : ''}
                          </td>
                          <td className="py-2 px-3 text-right font-bold">{formatCurrency(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedMovementDetail.notes && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                  <span className="font-bold">Observaciones: </span>
                  {selectedMovementDetail.notes}
                </div>
              )}

              {selectedMovementDetail.attachmentUrl && (
                <div className="p-3 bg-teal-50 rounded-lg border border-teal-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-700" />
                      Comprobante / Ticket de Proveedor Adjunto
                    </span>
                    <a
                      href={selectedMovementDetail.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-teal-700 hover:underline"
                    >
                      Abrir original ↗
                    </a>
                  </div>
                  {selectedMovementDetail.attachmentType === 'photo' && (
                    <div className="max-h-48 overflow-hidden rounded border border-teal-200">
                      <img
                        src={selectedMovementDetail.attachmentUrl}
                        alt="Comprobante"
                        className="w-full h-auto object-contain max-h-48"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200  bg-slate-50  flex justify-between items-center">
              <span className="font-bold text-slate-900 ">
                Total: {formatCurrency(selectedMovementDetail.totalValue)}
              </span>
              <button
                onClick={() => setSelectedMovementDetail(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300  text-slate-800  rounded font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ticket / PDF de Compra */}
      <SupplierTicketModal
        isOpen={isSupplierTicketModalOpen}
        onClose={() => setIsSupplierTicketModalOpen(false)}
        products={products}
        onConfirmRestock={(updatedProductsList, movement) => {
          onRegisterMovement(movement, updatedProductsList);
          setIsSupplierTicketModalOpen(false);
        }}
      />

      {/* Modal: Entrada Masiva desde Excel */}
      <StockEntryExcelModal
        isOpen={isStockEntryExcelModalOpen}
        onClose={() => setIsStockEntryExcelModalOpen(false)}
        products={products}
        onConfirmEntry={(updatedProductsList, movement) => {
          onRegisterMovement(movement, updatedProductsList);
        }}
      />

    </div>
  );
};
