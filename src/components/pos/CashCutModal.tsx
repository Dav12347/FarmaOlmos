import React, { useState, useMemo } from 'react';
import { 
  Sale, 
  DebtPayment, 
  CashCut, 
  CashMovement, 
  CashDenominationCount, 
  PharmacySettings 
} from '../../types/pharmacy';
import { formatCurrency, formatDateTime, formatDate, generateFolio } from '../../utils/formatters';
import { 
  X, 
  DollarSign, 
  Calculator, 
  Receipt, 
  Printer, 
  Download, 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Coins, 
  Banknote, 
  ArrowUpRight, 
  ArrowDownRight,
  ArrowRightLeft,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';

interface CashCutModalProps {
  sales: Sale[];
  payments: DebtPayment[];
  cashCuts: CashCut[];
  cashMovements: CashMovement[];
  activeShift: { openedAt: string; initialCash: number };
  settings: PharmacySettings;
  sellerName?: string;
  onClose: () => void;
  onSaveCashCut: (cashCut: CashCut, newShiftInitialCash: number) => void;
  onSaveCashMovement: (movement: CashMovement) => void;
  onUpdateActiveInitialCash: (initialCash: number) => void;
}

export const CashCutModal: React.FC<CashCutModalProps> = ({
  sales,
  payments,
  cashCuts,
  cashMovements,
  activeShift,
  settings,
  sellerName = 'Cajero en Turno',
  onClose,
  onSaveCashCut,
  onSaveCashMovement,
  onUpdateActiveInitialCash,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'movements' | 'history'>('current');

  // Initial cash editable
  const [isEditingInitialCash, setIsEditingInitialCash] = useState(false);
  const [initialCashInput, setInitialCashInput] = useState(activeShift.initialCash.toString());

  // Cash count mode: by denominations or direct total
  const [countMode, setCountMode] = useState<'denominations' | 'direct'>('denominations');
  const [directCashInput, setDirectCashInput] = useState('');
  
  // Denominations count state
  const [denominations, setDenominations] = useState<CashDenominationCount>({
    b1000: 0,
    b500: 0,
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 0,
    m20: 0,
    m10: 0,
    m5: 0,
    m2: 0,
    m1: 0,
    m05: 0,
  });

  // Cash cut notes and withdrawal
  const [cutNotes, setCutNotes] = useState('');
  const [cashToWithdraw, setCashToWithdraw] = useState('');
  const [nextShiftFloat, setNextShiftFloat] = useState(activeShift.initialCash.toString());

  // Cash Movement Modal inline state
  const [isAddingMovement, setIsAddingMovement] = useState(false);
  const [movementType, setMovementType] = useState<'in' | 'out'>('out');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementNotes, setMovementNotes] = useState('');

  // Selected historic cut for ticket view
  const [viewingHistoricCut, setViewingHistoricCut] = useState<CashCut | null>(null);

  // Shift start time filter (since activeShift.openedAt)
  const shiftStartTime = new Date(activeShift.openedAt).getTime();

  // Filter sales completed during this active shift
  const currentShiftSales = useMemo(() => {
    return sales.filter(s => new Date(s.date).getTime() >= shiftStartTime);
  }, [sales, shiftStartTime]);

  // Filter payments received during this active shift
  const currentShiftPayments = useMemo(() => {
    return payments.filter(p => new Date(p.date).getTime() >= shiftStartTime);
  }, [payments, shiftStartTime]);

  // Filter manual cash movements during this active shift
  const currentShiftMovements = useMemo(() => {
    return cashMovements.filter(m => new Date(m.date).getTime() >= shiftStartTime);
  }, [cashMovements, shiftStartTime]);

  // --- Financial Calculations for Active Shift ---
  // Active (non-cancelled) sales by payment method
  const activeSales = currentShiftSales.filter(s => s.status !== 'cancelled');
  const cancelledSales = currentShiftSales.filter(s => s.status === 'cancelled');

  const cashSalesTotal = activeSales
    .filter(s => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + s.total, 0);

  const cardSalesTotal = activeSales
    .filter(s => s.paymentMethod === 'card')
    .reduce((sum, s) => sum + s.total, 0);

  const transferSalesTotal = activeSales
    .filter(s => s.paymentMethod === 'transfer')
    .reduce((sum, s) => sum + s.total, 0);

  const creditSalesTotal = activeSales
    .filter(s => s.paymentMethod === 'credit')
    .reduce((sum, s) => sum + s.total, 0);

  const totalSalesRevenue = cashSalesTotal + cardSalesTotal + transferSalesTotal + creditSalesTotal;

  // Debt payments (abonos) received
  const debtPaymentsCashTotal = currentShiftPayments
    .filter(p => p.paymentMethod === 'cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const debtPaymentsCardTotal = currentShiftPayments
    .filter(p => p.paymentMethod === 'card')
    .reduce((sum, p) => sum + p.amount, 0);

  const debtPaymentsTransferTotal = currentShiftPayments
    .filter(p => p.paymentMethod === 'transfer')
    .reduce((sum, p) => sum + p.amount, 0);

  // Manual cash movements
  const cashInTotal = currentShiftMovements
    .filter(m => m.type === 'in')
    .reduce((sum, m) => sum + m.amount, 0);

  const cashOutTotal = currentShiftMovements
    .filter(m => m.type === 'out')
    .reduce((sum, m) => sum + m.amount, 0);

  // Cancelled sales in cash
  const cancelledCashSalesTotal = cancelledSales
    .filter(s => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + s.total, 0);

  // Expected cash in drawer
  const expectedCash = 
    activeShift.initialCash + 
    cashSalesTotal + 
    debtPaymentsCashTotal + 
    cashInTotal - 
    cashOutTotal;

  // Real cash counted
  const countedFromDenominations = useMemo(() => {
    return (
      (denominations.b1000 || 0) * 1000 +
      (denominations.b500 || 0) * 500 +
      (denominations.b200 || 0) * 200 +
      (denominations.b100 || 0) * 100 +
      (denominations.b50 || 0) * 50 +
      (denominations.b20 || 0) * 20 +
      (denominations.m20 || 0) * 20 +
      (denominations.m10 || 0) * 10 +
      (denominations.m5 || 0) * 5 +
      (denominations.m2 || 0) * 2 +
      (denominations.m1 || 0) * 1 +
      (denominations.m05 || 0) * 0.5
    );
  }, [denominations]);

  const actualCashCount = countMode === 'denominations' 
    ? countedFromDenominations 
    : (parseFloat(directCashInput) || 0);

  const difference = actualCashCount - expectedCash;

  // Handle Save Initial Cash Float change
  const handleSaveInitialCash = () => {
    const val = parseFloat(initialCashInput);
    if (isNaN(val) || val < 0) {
      alert('Por favor ingrese un monto válido para el fondo de caja.');
      return;
    }
    onUpdateActiveInitialCash(val);
    setIsEditingInitialCash(false);
  };

  // Handle Register Manual Cash Movement
  const handleCreateMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(movementAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Por favor ingrese un monto válido mayor a $0.');
      return;
    }
    if (!movementReason.trim()) {
      alert('Por favor especifique el concepto o motivo del movimiento de efectivo.');
      return;
    }

    const newMov: CashMovement = {
      id: `mov-${Date.now()}`,
      folio: generateFolio(movementType === 'in' ? 'EC' : 'SC', cashMovements.length + 1),
      type: movementType,
      amount: amountNum,
      reason: movementReason.trim(),
      date: new Date().toISOString(),
      registeredBy: sellerName,
      notes: movementNotes.trim() || undefined,
    };

    onSaveCashMovement(newMov);
    setMovementAmount('');
    setMovementReason('');
    setMovementNotes('');
    setIsAddingMovement(false);
  };

  // Finalize Cash Cut / Close Register Shift
  const handleFinalizeCashCut = () => {
    if (actualCashCount === 0 && !window.confirm('El efectivo contado actualmente es $0.00. ¿Desea proceder con el corte de caja?')) {
      return;
    }

    const withdrawNum = parseFloat(cashToWithdraw) || Math.max(0, actualCashCount - (parseFloat(nextShiftFloat) || 0));
    const nextFloatNum = parseFloat(nextShiftFloat) || activeShift.initialCash;

    const folio = generateFolio('CORTE', cashCuts.length + 1);
    const closedAt = new Date().toISOString();

    const newCashCut: CashCut = {
      id: `cut-${Date.now()}`,
      folio,
      openedAt: activeShift.openedAt,
      closedAt,
      cashier: sellerName,
      initialCash: activeShift.initialCash,

      cashSalesTotal,
      cardSalesTotal,
      transferSalesTotal,
      creditSalesTotal,
      totalSalesCount: activeSales.length,

      debtPaymentsCashTotal,
      debtPaymentsCardTotal,
      debtPaymentsTransferTotal,

      cashInTotal,
      cashOutTotal,

      cancelledCashSalesTotal,
      refundedCashTotal: 0,

      expectedCash,
      actualCashCount,
      difference,

      cashWithdrawal: withdrawNum,
      remainingCashForNextShift: nextFloatNum,

      notes: cutNotes.trim() || undefined,
      denominations: countMode === 'denominations' ? denominations : undefined,
    };

    if (window.confirm(`¿Confirmar cierre de turno y corte de caja ${folio}?\n\n- Efectivo Esperado: ${formatCurrency(expectedCash)}\n- Efectivo Contado: ${formatCurrency(actualCashCount)}\n- Diferencia: ${formatCurrency(difference)}\n- Retiro: ${formatCurrency(withdrawNum)}\n- Fondo próximo turno: ${formatCurrency(nextFloatNum)}`)) {
      onSaveCashCut(newCashCut, nextFloatNum);
      setViewingHistoricCut(newCashCut);
    }
  };

  // PDF Ticket Generator for Cash Cut
  const handleDownloadCutPDF = (cut: CashCut) => {
    const doc = new jsPDF('p', 'mm', [80, 240]);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.name, 40, 10, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`RFC: ${settings.rfc}`, 40, 14, { align: 'center' });
    doc.text(settings.address, 40, 18, { align: 'center' });
    doc.line(5, 21, 75, 21);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`CORTE DE CAJA: ${cut.folio}`, 40, 26, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Apertura: ${formatDateTime(cut.openedAt)}`, 5, 31);
    doc.text(`Cierre: ${formatDateTime(cut.closedAt)}`, 5, 35);
    doc.text(`Cajero: ${cut.cashier}`, 5, 39);
    doc.line(5, 42, 75, 42);

    let y = 47;
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE VENTAS', 5, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`Ventas Efectivo (${cut.totalSalesCount}):`, 5, y);
    doc.text(formatCurrency(cut.cashSalesTotal), 75, y, { align: 'right' });
    y += 4;
    doc.text('Ventas Tarjeta:', 5, y);
    doc.text(formatCurrency(cut.cardSalesTotal), 75, y, { align: 'right' });
    y += 4;
    doc.text('Ventas Transferencia:', 5, y);
    doc.text(formatCurrency(cut.transferSalesTotal), 75, y, { align: 'right' });
    y += 4;
    doc.text('Ventas a Crédito (Fiado):', 5, y);
    doc.text(formatCurrency(cut.creditSalesTotal), 75, y, { align: 'right' });
    y += 5;
    doc.line(5, y, 75, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('ARQUEO DE EFECTIVO', 5, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text('(+) Fondo Inicial:', 5, y);
    doc.text(formatCurrency(cut.initialCash), 75, y, { align: 'right' });
    y += 4;
    doc.text('(+) Ventas Efectivo:', 5, y);
    doc.text(formatCurrency(cut.cashSalesTotal), 75, y, { align: 'right' });
    y += 4;
    doc.text('(+) Abonos a Deuda Efectivo:', 5, y);
    doc.text(formatCurrency(cut.debtPaymentsCashTotal), 75, y, { align: 'right' });
    y += 4;
    doc.text('(+) Entradas de Efectivo:', 5, y);
    doc.text(formatCurrency(cut.cashInTotal), 75, y, { align: 'right' });
    y += 4;
    doc.text('(-) Salidas / Gastos Efectivo:', 5, y);
    doc.text(`-${formatCurrency(cut.cashOutTotal)}`, 75, y, { align: 'right' });
    y += 5;
    doc.line(5, y, 75, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Efectivo Esperado en Caja:', 5, y);
    doc.text(formatCurrency(cut.expectedCash), 75, y, { align: 'right' });
    y += 4;
    doc.text('Efectivo Real Contado:', 5, y);
    doc.text(formatCurrency(cut.actualCashCount), 75, y, { align: 'right' });
    y += 4;
    
    doc.text(`Diferencia:`, 5, y);
    doc.text(`${cut.difference >= 0 ? '+' : ''}${formatCurrency(cut.difference)}`, 75, y, { align: 'right' });
    y += 6;
    doc.line(5, y, 75, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.text('Retiro de Efectivo:', 5, y);
    doc.text(formatCurrency(cut.cashWithdrawal), 75, y, { align: 'right' });
    y += 4;
    doc.text('Fondo Siguiente Turno:', 5, y);
    doc.text(formatCurrency(cut.remainingCashForNextShift), 75, y, { align: 'right' });
    y += 12;

    doc.line(15, y, 65, y);
    y += 3.5;
    doc.setFontSize(6.5);
    doc.text('Firma de Conformidad Cajero / Supervisor', 40, y, { align: 'center' });

    doc.save(`CorteCaja_${cut.folio}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-600/30 text-teal-400 border border-teal-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                Corte de Caja & Arqueo de Turno
              </h2>
              <p className="text-xs text-slate-300">
                Turno iniciado: <span className="font-semibold text-teal-400">{formatDateTime(activeShift.openedAt)}</span> • Cajero: <span className="text-white font-semibold">{sellerName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 bg-slate-100 border-b border-slate-200">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'current'
                  ? 'border-teal-600 text-teal-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Arqueo y Cierre de Turno Activo</span>
            </button>

            <button
              onClick={() => setActiveTab('movements')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'movements'
                  ? 'border-teal-600 text-teal-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Entradas y Salidas ({currentShiftMovements.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'border-teal-600 text-teal-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historial de Cortes ({cashCuts.length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Efectivo Esperado:</span>
            <span className="font-mono font-black text-teal-700 text-sm">{formatCurrency(expectedCash)}</span>
          </div>
        </div>

        {/* Tab 1: Current Shift Reconciliation (Arqueo) */}
        {activeTab === 'current' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Top Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* Card 1: Fondo Inicial */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase">
                  <span>Fondo Inicial</span>
                  {!isEditingInitialCash ? (
                    <button
                      onClick={() => setIsEditingInitialCash(true)}
                      className="text-teal-600 hover:underline text-[10px] font-bold cursor-pointer"
                    >
                      Editar
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveInitialCash}
                      className="text-emerald-700 hover:underline text-[10px] font-bold cursor-pointer"
                    >
                      Guardar
                    </button>
                  )}
                </div>

                {isEditingInitialCash ? (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-bold">$</span>
                    <input
                      type="number"
                      value={initialCashInput}
                      onChange={e => setInitialCashInput(e.target.value)}
                      className="w-full p-1 bg-white border border-slate-300 rounded text-xs font-bold font-mono"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="text-lg font-black text-slate-800 font-mono mt-1">
                    {formatCurrency(activeShift.initialCash)}
                  </div>
                )}
                <span className="text-[10px] text-slate-500">Monto base del cajón</span>
              </div>

              {/* Card 2: Ventas Efectivo */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                <span className="text-emerald-800 text-[11px] font-bold uppercase">Ventas Efectivo</span>
                <div className="text-lg font-black text-emerald-950 font-mono mt-1">
                  +{formatCurrency(cashSalesTotal)}
                </div>
                <span className="text-[10px] text-emerald-800 font-medium">
                  {activeSales.filter(s => s.paymentMethod === 'cash').length} ventas de contado
                </span>
              </div>

              {/* Card 3: Abonos + Entradas */}
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex flex-col justify-between">
                <span className="text-teal-800 text-[11px] font-bold uppercase">Abonos + Entradas</span>
                <div className="text-lg font-black text-teal-950 font-mono mt-1">
                  +{formatCurrency(debtPaymentsCashTotal + cashInTotal)}
                </div>
                <span className="text-[10px] text-teal-800 font-medium">
                  Abonos: {formatCurrency(debtPaymentsCashTotal)} • Entradas: {formatCurrency(cashInTotal)}
                </span>
              </div>

              {/* Card 4: Salidas / Gastos */}
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col justify-between">
                <span className="text-rose-800 text-[11px] font-bold uppercase">Salidas / Gastos</span>
                <div className="text-lg font-black text-rose-950 font-mono mt-1">
                  -{formatCurrency(cashOutTotal)}
                </div>
                <span className="text-[10px] text-rose-800 font-medium">
                  {currentShiftMovements.filter(m => m.type === 'out').length} gastos registrados
                </span>
              </div>

            </div>

            {/* Other Payment Methods (Cards, Transfers, Credit) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>Otros Métodos Cobrados en el Turno (No afectan cajón físico de efectivo):</span>
                <span className="text-slate-500 font-mono text-[11px]">Total General: {formatCurrency(totalSalesRevenue)}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Tarjeta / Terminal</span>
                  <span className="font-bold text-slate-800 font-mono">{formatCurrency(cardSalesTotal + debtPaymentsCardTotal)}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Transferencias</span>
                  <span className="font-bold text-slate-800 font-mono">{formatCurrency(transferSalesTotal + debtPaymentsTransferTotal)}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Crédito / Fiado Otorgado</span>
                  <span className="font-bold text-amber-700 font-mono">{formatCurrency(creditSalesTotal)}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Ventas Canceladas</span>
                  <span className="font-bold text-rose-700 font-mono">{cancelledSales.length} tickets ({formatCurrency(cancelledSales.reduce((s, x) => s + x.total, 0))})</span>
                </div>
              </div>
            </div>

            {/* 2-Column Arqueo Breakdown (Left: Physical Denominations Count | Right: Balancing & Closure) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left: Physical Denominations Counter */}
              <div className="lg:col-span-7 border border-slate-200 rounded-xl p-3 sm:p-4 bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                      Conteo Físico de Billetes y Monedas
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setCountMode('denominations')}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        countMode === 'denominations' ? 'bg-white shadow-xs text-teal-700' : 'text-slate-500'
                      }`}
                    >
                      Por denominación
                    </button>
                    <button
                      type="button"
                      onClick={() => setCountMode('direct')}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        countMode === 'direct' ? 'bg-white shadow-xs text-teal-700' : 'text-slate-500'
                      }`}
                    >
                      Monto directo
                    </button>
                  </div>
                </div>

                {countMode === 'direct' ? (
                  <div className="py-6 space-y-2 text-center max-w-xs mx-auto">
                    <label className="text-xs font-bold text-slate-700 block">
                      Ingresa el total de efectivo contado en el cajón:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-lg">$</span>
                      <input
                        type="number"
                        step="0.50"
                        value={directCashInput}
                        onChange={e => setDirectCashInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-2 text-lg font-black font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Billetes Grid */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        💵 Billetes
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { key: 'b1000', val: 1000, label: '$1,000' },
                          { key: 'b500', val: 500, label: '$500' },
                          { key: 'b200', val: 200, label: '$200' },
                          { key: 'b100', val: 100, label: '$100' },
                          { key: 'b50', val: 50, label: '$50' },
                          { key: 'b20', val: 20, label: '$20' },
                        ].map(b => (
                          <div key={b.key} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                            <span className="text-[10px] font-bold text-slate-600 block">{b.label}</span>
                            <input
                              type="number"
                              min="0"
                              value={denominations[b.key as keyof CashDenominationCount] || ''}
                              onChange={e => {
                                const v = parseInt(e.target.value) || 0;
                                setDenominations(prev => ({ ...prev, [b.key]: Math.max(0, v) }));
                              }}
                              placeholder="0"
                              className="w-full text-center p-1 bg-white border border-slate-300 rounded text-xs font-bold font-mono mt-1"
                            />
                            <span className="text-[9px] text-teal-700 font-mono block mt-0.5 font-semibold">
                              {formatCurrency((denominations[b.key as keyof CashDenominationCount] || 0) * b.val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monedas Grid */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        🪙 Monedas
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { key: 'm20', val: 20, label: '$20' },
                          { key: 'm10', val: 10, label: '$10' },
                          { key: 'm5', val: 5, label: '$5' },
                          { key: 'm2', val: 2, label: '$2' },
                          { key: 'm1', val: 1, label: '$1' },
                          { key: 'm05', val: 0.5, label: '$0.50' },
                        ].map(m => (
                          <div key={m.key} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                            <span className="text-[10px] font-bold text-slate-600 block">{m.label}</span>
                            <input
                              type="number"
                              min="0"
                              value={denominations[m.key as keyof CashDenominationCount] || ''}
                              onChange={e => {
                                const v = parseInt(e.target.value) || 0;
                                setDenominations(prev => ({ ...prev, [m.key]: Math.max(0, v) }));
                              }}
                              placeholder="0"
                              className="w-full text-center p-1 bg-white border border-slate-300 rounded text-xs font-bold font-mono mt-1"
                            />
                            <span className="text-[9px] text-teal-700 font-mono block mt-0.5 font-semibold">
                              {formatCurrency((denominations[m.key as keyof CashDenominationCount] || 0) * m.val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Counter Footer Total */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Total Físico Contado:</span>
                  <span className="font-black text-sm text-teal-700 font-mono bg-teal-50 px-2 py-1 rounded-lg border border-teal-200">
                    {formatCurrency(actualCashCount)}
                  </span>
                </div>
              </div>

              {/* Right: Reconciliation, Difference & Shift Closure */}
              <div className="lg:col-span-5 flex flex-col justify-between border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                
                {/* Cuadre & Difference Result */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Balance del Cuadre de Caja
                  </h4>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Efectivo Esperado en Sistema:</span>
                      <span className="font-bold font-mono text-slate-900">{formatCurrency(expectedCash)}</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Efectivo Real Contado:</span>
                      <span className="font-bold font-mono text-teal-700">{formatCurrency(actualCashCount)}</span>
                    </div>

                    <div className={`pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold ${
                      Math.abs(difference) < 0.01 
                        ? 'text-emerald-700' 
                        : difference > 0 
                        ? 'text-cyan-700' 
                        : 'text-rose-700'
                    }`}>
                      <span>Diferencia:</span>
                      <span className="font-mono text-base">
                        {difference > 0 ? `+${formatCurrency(difference)} (Sobrante)` : difference < 0 ? `${formatCurrency(difference)} (Faltante)` : '$0.00 (Cuadre Exacto)'}
                      </span>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                    Math.abs(difference) < 0.01
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      : difference > 0
                      ? 'bg-cyan-100 text-cyan-950 border-cyan-300'
                      : 'bg-rose-100 text-rose-950 border-rose-300'
                  }`}>
                    {Math.abs(difference) < 0.01 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>¡Caja perfectamente cuadrada! Sin faltantes ni sobrantes.</span>
                      </>
                    ) : difference > 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-cyan-700 shrink-0" />
                        <span>Hay un sobrante de {formatCurrency(difference)} en el cajón.</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                        <span>Atención: Hay un faltante de {formatCurrency(Math.abs(difference))} en el cajón.</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Withdrawal & Next Shift Float inputs */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block text-[11px] mb-1">
                        Fondo Próx. Turno ($):
                      </label>
                      <input
                        type="number"
                        value={nextShiftFloat}
                        onChange={e => setNextShiftFloat(e.target.value)}
                        placeholder="500"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block text-[11px] mb-1">
                        Retiro / Entrega ($):
                      </label>
                      <input
                        type="number"
                        value={cashToWithdraw}
                        onChange={e => setCashToWithdraw(e.target.value)}
                        placeholder={formatCurrency(Math.max(0, actualCashCount - (parseFloat(nextShiftFloat) || 0)))}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block text-[11px] mb-1">
                      Observaciones o Notas del Cierre:
                    </label>
                    <input
                      type="text"
                      value={cutNotes}
                      onChange={e => setCutNotes(e.target.value)}
                      placeholder="Ej. Todo entregado en orden a turno vespertino..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Finalize Button */}
                <button
                  type="button"
                  onClick={handleFinalizeCashCut}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Realizar Corte de Caja & Cerrar Turno</span>
                </button>

              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Manual Cash Movements (Entradas / Salidas) */}
        {activeTab === 'movements' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Entradas y Salidas de Efectivo del Turno
                </h3>
                <p className="text-xs text-slate-500">
                  Registra salidas para gastos menores o aportaciones de cambio sin afectar el kardex de medicamentos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingMovement(true)}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Registrar Movimiento</span>
              </button>
            </div>

            {/* Inline Add Movement Form Modal / Box */}
            {isAddingMovement && (
              <form onSubmit={handleCreateMovement} className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-teal-950 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-teal-700" />
                    Nuevo Movimiento Manual de Caja
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingMovement(false)}
                    className="p-1 text-teal-700 hover:text-teal-900 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-teal-900 block mb-1">
                      Tipo de Movimiento:
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setMovementType('out')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          movementType === 'out'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}
                      >
                        Salida / Gasto
                      </button>
                      <button
                        type="button"
                        onClick={() => setMovementType('in')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          movementType === 'in'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}
                      >
                        Entrada / Cambio
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-teal-900 block mb-1">
                      Monto en Efectivo ($):
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      min="0.5"
                      value={movementAmount}
                      onChange={e => setMovementAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2 bg-white border border-teal-300 rounded-lg text-xs font-bold font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-teal-900 block mb-1">
                      Concepto / Motivo:
                    </label>
                    <input
                      type="text"
                      value={movementReason}
                      onChange={e => setMovementReason(e.target.value)}
                      placeholder="Ej. Pago garrafón de agua, flete, etc."
                      className="w-full p-2 bg-white border border-teal-300 rounded-lg text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingMovement(false)}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs"
                  >
                    Guardar Movimiento
                  </button>
                </div>
              </form>
            )}

            {/* Movements List Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Folio</th>
                    <th className="p-3">Hora</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Concepto / Motivo</th>
                    <th className="p-3">Registró</th>
                    <th className="p-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentShiftMovements.map(mov => (
                    <tr key={mov.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-800">{mov.folio}</td>
                      <td className="p-3 text-slate-600">{formatDateTime(mov.date)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          mov.type === 'in' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {mov.type === 'in' ? '+ Entrada' : '- Salida'}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-900">{mov.reason}</td>
                      <td className="p-3 text-slate-600">{mov.registeredBy}</td>
                      <td className={`p-3 font-black font-mono text-right ${
                        mov.type === 'in' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {mov.type === 'in' ? '+' : '-'}{formatCurrency(mov.amount)}
                      </td>
                    </tr>
                  ))}

                  {currentShiftMovements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No se han registrado entradas ni salidas manuales en este turno.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 3: History of Past Cash Cuts */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Historial de Cortes de Caja Realizados
                </h3>
                <p className="text-xs text-slate-500">
                  Consulta, reimprime y descarga el comprobante en PDF de cualquier turno anterior.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Folio</th>
                    <th className="p-3">Fecha Cierre</th>
                    <th className="p-3">Cajero</th>
                    <th className="p-3 text-right">Ventas Totales</th>
                    <th className="p-3 text-right">Esperado</th>
                    <th className="p-3 text-right">Contado</th>
                    <th className="p-3 text-right">Diferencia</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashCuts.map(cut => {
                    const totalSales = cut.cashSalesTotal + cut.cardSalesTotal + cut.transferSalesTotal + cut.creditSalesTotal;
                    return (
                      <tr key={cut.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-teal-700">{cut.folio}</td>
                        <td className="p-3 text-slate-600">{formatDateTime(cut.closedAt)}</td>
                        <td className="p-3 font-medium text-slate-800">{cut.cashier}</td>
                        <td className="p-3 font-mono font-bold text-right text-slate-900">
                          {formatCurrency(totalSales)}
                        </td>
                        <td className="p-3 font-mono text-right text-slate-600">
                          {formatCurrency(cut.expectedCash)}
                        </td>
                        <td className="p-3 font-mono font-bold text-right text-slate-900">
                          {formatCurrency(cut.actualCashCount)}
                        </td>
                        <td className={`p-3 font-mono font-bold text-right ${
                          Math.abs(cut.difference) < 0.01 
                            ? 'text-emerald-700' 
                            : cut.difference > 0 
                            ? 'text-cyan-700' 
                            : 'text-rose-700'
                        }`}>
                          {cut.difference >= 0 ? `+${formatCurrency(cut.difference)}` : formatCurrency(cut.difference)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingHistoricCut(cut)}
                              className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                              title="Ver Comprobante de Corte"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadCutPDF(cut)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Descargar PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {cashCuts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        Aún no se han registrado cortes de caja en el sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Historic Ticket Modal Preview Overlay */}
        {viewingHistoricCut && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">Comprobante de Corte de Caja</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadCutPDF(viewingHistoricCut)}
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                    title="Descargar PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                    title="Imprimir"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewingHistoricCut(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Thermal 80mm printable style content */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center">
                <div className="w-full max-w-[340px] bg-white text-slate-900 p-5 rounded shadow-xs border border-slate-300 font-mono text-xs leading-tight space-y-3">
                  
                  <div className="text-center pb-2 border-b border-dashed border-slate-400">
                    <div className="text-sm font-black uppercase">{settings.name}</div>
                    <div className="text-[10px] text-slate-600">{settings.commercialName}</div>
                    <div className="text-[10px] text-slate-600">RFC: {settings.rfc}</div>
                    <div className="text-[10px] text-slate-600">{settings.address}</div>
                  </div>

                  <div className="py-1 border-b border-dashed border-slate-400 space-y-1">
                    <div className="text-center font-bold text-xs bg-slate-100 p-1 rounded">
                      CORTE DE CAJA: {viewingHistoricCut.folio}
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Apertura:</span>
                      <span>{formatDateTime(viewingHistoricCut.openedAt)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Cierre:</span>
                      <span>{formatDateTime(viewingHistoricCut.closedAt)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Cajero:</span>
                      <span>{viewingHistoricCut.cashier}</span>
                    </div>
                  </div>

                  {/* Sales Breakdown */}
                  <div className="py-1 border-b border-dashed border-slate-400 space-y-1">
                    <div className="font-bold text-[11px] text-slate-800 mb-1">VENTAS POR MÉTODO:</div>
                    <div className="flex justify-between text-[11px]">
                      <span>Efectivo ({viewingHistoricCut.totalSalesCount} vts):</span>
                      <span className="font-bold">{formatCurrency(viewingHistoricCut.cashSalesTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Tarjeta / Terminal:</span>
                      <span>{formatCurrency(viewingHistoricCut.cardSalesTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Transferencia:</span>
                      <span>{formatCurrency(viewingHistoricCut.transferSalesTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Crédito (Fiado):</span>
                      <span>{formatCurrency(viewingHistoricCut.creditSalesTotal)}</span>
                    </div>
                  </div>

                  {/* Cash Flow Drawer Breakdown */}
                  <div className="py-1 border-b border-dashed border-slate-400 space-y-1">
                    <div className="font-bold text-[11px] text-slate-800 mb-1">MOVIMIENTO EN CAJÓN:</div>
                    <div className="flex justify-between text-[11px]">
                      <span>(+) Fondo Inicial:</span>
                      <span>{formatCurrency(viewingHistoricCut.initialCash)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>(+) Ventas Efectivo:</span>
                      <span>{formatCurrency(viewingHistoricCut.cashSalesTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>(+) Abonos Efectivo:</span>
                      <span>{formatCurrency(viewingHistoricCut.debtPaymentsCashTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>(+) Entradas Efectivo:</span>
                      <span>{formatCurrency(viewingHistoricCut.cashInTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-rose-700">
                      <span>(-) Salidas / Gastos:</span>
                      <span>-{formatCurrency(viewingHistoricCut.cashOutTotal)}</span>
                    </div>
                  </div>

                  {/* Reconciliation Totals */}
                  <div className="py-1 border-b border-dashed border-slate-400 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Efectivo Esperado:</span>
                      <span>{formatCurrency(viewingHistoricCut.expectedCash)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-teal-800">
                      <span>Efectivo Contado:</span>
                      <span>{formatCurrency(viewingHistoricCut.actualCashCount)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-slate-900 pt-1 border-t border-slate-300">
                      <span>Diferencia:</span>
                      <span>{viewingHistoricCut.difference >= 0 ? `+${formatCurrency(viewingHistoricCut.difference)}` : formatCurrency(viewingHistoricCut.difference)}</span>
                    </div>
                  </div>

                  {/* Withdrawal & Float */}
                  <div className="py-1 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>Retiro de Efectivo:</span>
                      <span className="font-bold">{formatCurrency(viewingHistoricCut.cashWithdrawal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fondo Próximo Turno:</span>
                      <span className="font-bold">{formatCurrency(viewingHistoricCut.remainingCashForNextShift)}</span>
                    </div>
                  </div>

                  <div className="pt-6 text-center border-t border-dashed border-slate-400 text-[10px] text-slate-500">
                    <div className="w-36 h-0.5 bg-slate-400 mx-auto mb-1"></div>
                    <p>Firma Cajero / Supervisor</p>
                  </div>

                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingHistoricCut(null)}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
