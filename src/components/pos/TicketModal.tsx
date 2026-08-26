import React, { useRef } from 'react';
import { Sale, PharmacySettings, Customer, DebtPayment } from '../../types/pharmacy';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { Printer, X, Download, CheckCircle2, ShieldAlert } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TicketModalProps {
  sale?: Sale | null;
  payment?: DebtPayment | null;
  settings: PharmacySettings;
  customer?: Customer | null;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  sale,
  payment,
  settings,
  customer,
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!sale && !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('p', 'mm', [80, 200]);
    
    // Simple 80mm thermal receipt PDF
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.name, 40, 10, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`RFC: ${settings.rfc}`, 40, 14, { align: 'center' });
    doc.text(settings.address, 40, 18, { align: 'center' });
    doc.text(`Tel: ${settings.phone}`, 40, 22, { align: 'center' });
    doc.line(5, 25, 75, 25);

    if (sale) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`FOLIO DE VENTA: ${sale.folio}`, 40, 30, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${formatDateTime(sale.date)}`, 5, 35);
      doc.text(`Cliente: ${sale.customerName || 'Público General'}`, 5, 39);
      doc.text(`Tipo Pago: ${sale.paymentMethod.toUpperCase()}`, 5, 43);
      doc.line(5, 46, 75, 46);

      let currentY = 51;
      doc.setFont('helvetica', 'bold');
      doc.text('CANT  PRODUCTO', 5, currentY);
      doc.text('TOTAL', 75, currentY, { align: 'right' });
      currentY += 4;
      doc.line(5, currentY - 2, 75, currentY - 2);

      doc.setFont('helvetica', 'normal');
      sale.items.forEach((item) => {
        const lineName = `${item.quantity}x ${item.productName.slice(0, 24)}`;
        doc.text(lineName, 5, currentY);
        doc.text(formatCurrency(item.subtotal), 75, currentY, { align: 'right' });
        currentY += 4;
      });

      doc.line(5, currentY, 75, currentY);
      currentY += 4;
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: ${formatCurrency(sale.total)}`, 75, currentY, { align: 'right' });
      currentY += 4;
      
      if (sale.paymentMethod === 'cash') {
        doc.setFont('helvetica', 'normal');
        doc.text(`Efectivo Recibido: ${formatCurrency(sale.amountPaid)}`, 5, currentY);
        currentY += 4;
        doc.text(`Cambio: ${formatCurrency(sale.change)}`, 5, currentY);
        currentY += 4;
      } else if (sale.paymentMethod === 'credit') {
        doc.setFont('helvetica', 'bold');
        doc.text(`VENTA A CRÉDITO - DEUDA REGISTRADA`, 40, currentY, { align: 'center' });
        currentY += 4;
        if (customer) {
          doc.setFont('helvetica', 'normal');
          doc.text(`Saldo Deudor Total: ${formatCurrency(customer.currentDebt)}`, 5, currentY);
          currentY += 4;
        }
      }

      currentY += 4;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.text(settings.ticketMessage, 40, currentY, { align: 'center', maxWidth: 70 });
    } else if (payment) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`RECIBO DE ABONO: ${payment.folio}`, 40, 30, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${formatDateTime(payment.date)}`, 5, 35);
      doc.text(`Cliente: ${payment.customerName}`, 5, 39);
      doc.line(5, 43, 75, 43);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Monto Abonado: ${formatCurrency(payment.amount)}`, 5, 50);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`Saldo Anterior: ${formatCurrency(payment.previousDebt)}`, 5, 55);
      doc.text(`Saldo Restante: ${formatCurrency(payment.remainingDebt)}`, 5, 60);
      doc.text(`Método: ${payment.paymentMethod.toUpperCase()}`, 5, 65);
      doc.text(`Atendido por: ${payment.registeredBy}`, 5, 70);
    }

    doc.save(`Ticket_${sale ? sale.folio : payment?.folio}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              {sale ? 'Comprobante de Venta' : 'Recibo de Abono'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="p-1.5 text-slate-700 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-300 rounded-md transition-colors cursor-pointer"
              title="Descargar PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span className="text-white">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Receipt Preview (Thermal 80mm styling) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center">
          <div
            ref={printAreaRef}
            id="printable-ticket"
            className="w-full max-w-[340px] bg-white text-slate-900 p-5 rounded-md shadow-xs border border-slate-300 font-mono text-xs leading-tight"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <div className="text-sm font-black uppercase tracking-wider">{settings.name}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">{settings.commercialName}</div>
              <div className="text-[10px] text-slate-600">RFC: {settings.rfc}</div>
              <div className="text-[10px] text-slate-600">{settings.address}</div>
              <div className="text-[10px] text-slate-600">Tel: {settings.phone}</div>
              {settings.licenseNumber && (
                <div className="text-[9px] text-slate-500 mt-0.5">Lic: {settings.licenseNumber}</div>
              )}
            </div>

            {/* Sale / Payment Info */}
            {sale && (
              <>
                <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>FOLIO:</span>
                    <span>{sale.folio}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>FECHA:</span>
                    <span>{formatDateTime(sale.date)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>CLIENTE:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                      {sale.customerName || 'Público General'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>MÉTODO:</span>
                    <span className="uppercase font-semibold">
                      {sale.paymentMethod === 'credit' ? 'CRÉDITO (FIADO)' : sale.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>VENDEDOR:</span>
                    <span>{sale.seller}</span>
                  </div>
                </div>

                {/* Products Table */}
                <div className="py-2.5 border-b border-dashed border-slate-400">
                  <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-1.5 pb-0.5 border-b border-slate-200">
                    <span>DESCRIPCIÓN</span>
                    <span>IMPORTE</span>
                  </div>
                  <div className="space-y-1.5">
                    {sale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-[11px]">
                        <div className="pr-2">
                          <div className="font-medium text-slate-900">
                            {item.quantity}x {item.productName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.presentation} {item.discountPercentage > 0 && `(-${item.discountPercentage}%)`}
                          </div>
                        </div>
                        <div className="font-semibold whitespace-nowrap text-right">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(sale.subtotal)}</span>
                  </div>
                  {sale.discountTotal > 0 && (
                    <div className="flex justify-between text-xs text-rose-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(sale.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-300">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(sale.total)}</span>
                  </div>

                  {sale.paymentMethod === 'cash' && (
                    <>
                      <div className="flex justify-between text-xs pt-1 text-slate-600">
                        <span>Efectivo Entregado:</span>
                        <span>{formatCurrency(sale.amountPaid)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-800">
                        <span>Cambio:</span>
                        <span>{formatCurrency(sale.change)}</span>
                      </div>
                    </>
                  )}

                  {sale.paymentMethod === 'credit' && (
                    <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-300 text-center">
                      <div className="font-bold text-amber-900 text-xs flex items-center justify-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                        CARGO A CRÉDITO / FIADO
                      </div>
                      {customer && (
                        <div className="text-[11px] text-amber-800 mt-1">
                          Saldo deudor actual: <span className="font-bold">{formatCurrency(customer.currentDebt)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {payment && (
              <div className="py-3 border-b border-dashed border-slate-400 space-y-2">
                <div className="text-center font-bold text-xs bg-slate-100 p-1.5 rounded">
                  COMPROBANTE DE ABONO A CUENTA
                </div>
                <div className="flex justify-between">
                  <span>FOLIO ABONO:</span>
                  <span className="font-bold">{payment.folio}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>FECHA:</span>
                  <span>{formatDateTime(payment.date)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CLIENTE:</span>
                  <span className="font-semibold">{payment.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>MÉTODO:</span>
                  <span className="uppercase">{payment.paymentMethod}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Saldo Anterior:</span>
                    <span>{formatCurrency(payment.previousDebt)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-teal-800 bg-teal-50 p-1 rounded">
                    <span>MONTO ABONADO:</span>
                    <span>{formatCurrency(payment.amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Saldo Restante:</span>
                    <span>{formatCurrency(payment.remainingDebt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Message */}
            <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
              <p>{settings.ticketMessage}</p>
              <p className="text-[9px] text-slate-400">Sistema FarmaControl POS</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex justify-between items-center">
          <span className="text-xs text-slate-600 font-medium">Formato Térmico 80mm</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Aceptar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
