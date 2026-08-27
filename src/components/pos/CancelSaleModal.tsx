import React, { useState } from 'react';
import { Sale, Product, Customer, PharmacySettings } from '../../types/pharmacy';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { 
  X, 
  AlertTriangle, 
  RotateCcw, 
  PackageCheck, 
  CheckCircle2, 
  DollarSign, 
  UserCheck, 
  Receipt,
  FileText
} from 'lucide-react';

interface CancelSaleModalProps {
  isOpen?: boolean;
  sale: Sale | null;
  products?: Product[];
  customers?: Customer[];
  settings?: PharmacySettings;
  sellerName?: string;
  onClose: () => void;
  onConfirmCancel: (
    sale: Sale, 
    reason: string, 
    returnedItems: { productId: string; quantity: number }[]
  ) => void;
}

export const CancelSaleModal: React.FC<CancelSaleModalProps> = ({
  isOpen = true,
  sale,
  products = [],
  customers = [],
  settings,
  sellerName = 'Cajero en Turno',
  onClose,
  onConfirmCancel,
}) => {
  if (!isOpen || !sale) return null;

  const isAlreadyCancelled = sale.status === 'cancelled' || sale.status === 'refunded';

  const [cancelMode, setCancelMode] = useState<'full' | 'partial'>('full');
  const [reason, setReason] = useState('');
  const [selectedQuickReason, setSelectedQuickReason] = useState('');
  
  // Track quantities to return for each item in the sale
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    sale.items.forEach(item => {
      initial[item.productId] = item.quantity;
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickReasons = [
    'Cliente solicitó devolución / cambio',
    'Error de captura / cobro de cajero',
    'Producto o medicamento equivocado',
    'Medicamento no requerido o duplicado',
    'Cobro duplicado por tarjeta / sistema',
  ];

  const handleQuickReasonClick = (qReason: string) => {
    setSelectedQuickReason(qReason);
    setReason(qReason);
  };

  const handleQuantityChange = (productId: string, newQty: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(maxQty, newQty));
    setItemQuantities(prev => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  // Calculate items and total to return
  const returnedItemsList = sale.items
    .map(item => ({
      productId: item.productId,
      productName: item.productName,
      presentation: item.presentation,
      unitPrice: item.unitPrice,
      quantity: cancelMode === 'full' ? item.quantity : (itemQuantities[item.productId] || 0),
      subtotal: (cancelMode === 'full' ? item.quantity : (itemQuantities[item.productId] || 0)) * item.unitPrice * (1 - item.discountPercentage / 100),
    }))
    .filter(item => item.quantity > 0);

  const totalRefundAmount = returnedItemsList.reduce((sum, item) => sum + item.subtotal, 0);
  const totalUnitsToRestock = returnedItemsList.reduce((sum, item) => sum + item.quantity, 0);

  const customer = customers.find(c => c.id === sale.customerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyCancelled) return;

    if (!reason.trim()) {
      alert('Por favor ingrese o seleccione el motivo de la cancelación o devolución.');
      return;
    }

    if (returnedItemsList.length === 0) {
      alert('Debe seleccionar al menos 1 producto con cantidad mayor a 0 para procesar la devolución.');
      return;
    }

    const confirmMessage = cancelMode === 'full'
      ? `¿Está seguro de cancelar COMPLETAMENTE la venta con Folio ${sale.folio} por ${formatCurrency(sale.total)}?\n\n- Se devolverán ${totalUnitsToRestock} unidades a sus existencias en inventario.\n- Se registrará el movimiento en el Kardex.\n${sale.isCredit ? '- Se descontará el importe de la deuda del cliente.' : '- Se registrará la salida del efectivo en el corte de caja.'}`
      : `¿Está seguro de procesar la DEVOLUCIÓN PARCIAL de la venta ${sale.folio} por ${formatCurrency(totalRefundAmount)}?\n\n- Se devolverán ${totalUnitsToRestock} unidades al inventario.\n- Se registrará en Kardex y corte de caja.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsSubmitting(true);
    try {
      onConfirmCancel(
        sale,
        reason.trim(),
        returnedItemsList.map(item => ({ productId: item.productId, quantity: item.quantity }))
      );
      onClose();
    } catch (err) {
      console.error('Error cancelling sale:', err);
      alert('Ocurrió un error al procesar la cancelación.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-rose-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-800/80 text-rose-200">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                Cancelar Venta / Registrar Devolución
              </h3>
              <p className="text-xs text-rose-200">
                Folio: <span className="font-mono font-bold text-white">{sale.folio}</span> • {formatDateTime(sale.date)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-rose-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Already Cancelled Alert */}
          {isAlreadyCancelled ? (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-rose-900">
                Esta venta ya fue CANCELADA previamente
              </div>
              <div className="text-xs text-rose-700 space-y-1">
                <p>Fecha de cancelación: {sale.cancelledAt ? formatDateTime(sale.cancelledAt) : 'No disponible'}</p>
                <p>Motivo: <span className="font-semibold">{sale.cancelledReason || 'Sin motivo registrado'}</span></p>
                {sale.cancelledBy && <p>Cancelado por: <span className="font-semibold">{sale.cancelledBy}</span></p>}
              </div>
            </div>
          ) : (
            <>
              {/* Sale Overview Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Venta</span>
                  <span className="font-black text-sm text-slate-900 font-mono">{formatCurrency(sale.total)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Método Pago</span>
                  <span className="font-bold text-slate-800 uppercase">{sale.paymentMethod === 'credit' ? 'Crédito' : sale.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Cliente</span>
                  <span className="font-semibold text-slate-800 truncate block">{sale.customerName || 'Público General'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Artículos</span>
                  <span className="font-bold text-slate-800">{sale.items.reduce((s, i) => s + i.quantity, 0)} unidades</span>
                </div>
              </div>

              {/* Mode Switch: Total or Partial Return */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Tipo de Cancelación:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelMode('full')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      cancelMode === 'full'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cancelación Total (100%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCancelMode('partial')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      cancelMode === 'partial'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Devolución Parcial de Artículos</span>
                  </button>
                </div>
              </div>

              {/* Items Table with Quantity to Return */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 flex justify-between items-center border-b border-slate-200">
                  <span>Productos en el Ticket</span>
                  <span>{cancelMode === 'full' ? 'Se devolverán todos' : 'Ajusta unidades a devolver'}</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {sale.items.map(item => {
                    const currentProd = products.find(p => p.id === item.productId);
                    const qtyToReturn = cancelMode === 'full' ? item.quantity : (itemQuantities[item.productId] || 0);

                    return (
                      <div key={item.productId} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {item.productName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Comprado: <span className="font-semibold">{item.quantity} unids.</span> a {formatCurrency(item.unitPrice)} c/u
                            {currentProd && (
                              <span className="text-teal-700 font-medium ml-2">
                                (Stock actual: {currentProd.stock})
                              </span>
                            )}
                          </div>
                        </div>

                        {cancelMode === 'partial' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-medium">Devolver:</span>
                            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.productId, (itemQuantities[item.productId] || 0) - 1, item.quantity)}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold border-r border-slate-200"
                              >
                                -
                              </button>
                              <span className="px-2.5 py-1 font-bold text-xs text-slate-900 min-w-[28px] text-center">
                                {qtyToReturn}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.productId, (itemQuantities[item.productId] || 0) + 1, item.quantity)}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold border-l border-slate-200"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="badge bg-rose-100 text-rose-800 font-bold text-[11px]">
                              +{item.quantity} al stock
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {formatCurrency(item.subtotal)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Automatic Effects Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Acciones automáticas al confirmar:
                </div>
                <ul className="list-disc list-inside text-[11px] text-emerald-900 space-y-0.5 ml-1">
                  <li>
                    <span className="font-semibold">Re-ingreso a Inventario:</span> Se sumarán <span className="font-bold">+{totalUnitsToRestock} unidades</span> automáticamente al inventario activo.
                  </li>
                  <li>
                    <span className="font-semibold">Registro en Kardex:</span> Se creará un movimiento tipo "Entrada por Devolución de Cliente" para auditoría.
                  </li>
                  {sale.isCredit && customer ? (
                    <li>
                      <span className="font-semibold">Ajuste de Crédito:</span> Se restará <span className="font-bold">{formatCurrency(totalRefundAmount)}</span> de la deuda actual de <span className="font-bold">{customer.name}</span>.
                    </li>
                  ) : (
                    <li>
                      <span className="font-semibold">Reembolso / Caja:</span> El monto de <span className="font-bold">{formatCurrency(totalRefundAmount)}</span> se registrará como devolución para el corte de caja.
                    </li>
                  )}
                </ul>
              </div>

              {/* Reason Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Motivo de la Cancelación / Devolución <span className="text-rose-600">*</span>
                </label>

                {/* Quick pills */}
                <div className="flex flex-wrap gap-1.5">
                  {quickReasons.map((qr) => (
                    <button
                      key={qr}
                      type="button"
                      onClick={() => handleQuickReasonClick(qr)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer text-left ${
                        selectedQuickReason === qr
                          ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {qr}
                    </button>
                  ))}
                </div>

                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Detalla la razón de la cancelación o devolución..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          {!isAlreadyCancelled && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || returnedItemsList.length === 0}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-white" />
              <span>Confirmar Cancelación & Re-cargar Inventario</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
