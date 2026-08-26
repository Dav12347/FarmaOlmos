import React, { useState, useMemo } from 'react';
import { 
  Customer, 
  CustomerDocument, 
  Sale, 
  DebtPayment, 
  PharmacySettings 
} from '../../types/pharmacy';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime, 
  generateFolio, 
  fileToBase64 
} from '../../utils/formatters';
import { 
  Users, 
  UserPlus, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Camera, 
  Upload, 
  DollarSign, 
  FileSpreadsheet, 
  Download, 
  Eye, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Plus, 
  Receipt, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  CreditCard,
  Zap,
  Pencil,
  SlidersHorizontal,
  Banknote,
  ArrowRightLeft,
  Percent,
  Check
} from 'lucide-react';
import { exportCustomerAccountStatementPDF } from '../../utils/exportUtils';
import { DocumentViewerModal } from '../common/DocumentViewerModal';

interface CustomersViewProps {
  customers: Customer[];
  sales: Sale[];
  payments: DebtPayment[];
  settings: PharmacySettings;
  paymentsCount: number;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onRegisterPayment: (payment: DebtPayment, updatedCustomer: Customer) => void;
  isAddModalInitiallyOpen?: boolean;
  onCloseInitialAddModal?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  sales,
  payments,
  settings,
  paymentsCount,
  onSaveCustomer,
  onDeleteCustomer,
  onRegisterPayment,
  isAddModalInitiallyOpen = false,
  onCloseInitialAddModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  
  // Registration / Edit Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(isAddModalInitiallyOpen);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Selected Customer for Detailed Profile & Ledger
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeCustomerTab, setActiveCustomerTab] = useState<'documents' | 'sales' | 'payments'>('documents');

  // Document Viewer Modal
  const [viewingDocument, setViewingDocument] = useState<CustomerDocument | null>(null);

  // Abono / Liquidar Debt Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetCustomer, setPaymentTargetCustomer] = useState<Customer | null>(null);
  const [paymentMode, setPaymentMode] = useState<'liquidar' | 'abono'>('abono');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentRegisteredBy, setPaymentRegisteredBy] = useState<string>('Cajero Principal');

  // Quick Debt Adjustment Modal (Ajuste Manual / Condonación)
  const [isAdjustDebtModalOpen, setIsAdjustDebtModalOpen] = useState(false);
  const [adjustTargetCustomer, setAdjustTargetCustomer] = useState<Customer | null>(null);
  const [newDebtAmount, setNewDebtAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Customer Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formIdNumber, setFormIdNumber] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState<number>(1000);
  const [formCurrentDebt, setFormCurrentDebt] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');
  const [formDocuments, setFormDocuments] = useState<CustomerDocument[]>([]);

  // New Document Upload inside form or profile
  const [newDocCategory, setNewDocCategory] = useState<CustomerDocument['category']>('Identificación / INE');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [isAddingDocInline, setIsAddingDocInline] = useState(false);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return customers.filter(c => {
      if (filterDebtOnly && c.currentDebt <= 0) return false;
      if (!q) return true;

      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.idNumber && c.idNumber.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    });
  }, [customers, searchTerm, filterDebtOnly]);

  const openNewCustomerModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormIdNumber('');
    setFormCreditLimit(1000);
    setFormCurrentDebt(0);
    setFormNotes('');
    setFormDocuments([]);
    setIsCustomerModalOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormIdNumber(customer.idNumber || '');
    setFormCreditLimit(customer.creditLimit);
    setFormCurrentDebt(customer.currentDebt);
    setFormNotes(customer.notes || '');
    setFormDocuments(customer.documents || []);
    setIsCustomerModalOpen(true);
  };

  // Open payment modal for liquidation or partial payment
  const openPaymentModalForCustomer = (customer: Customer, mode: 'liquidar' | 'abono' = 'abono') => {
    setPaymentTargetCustomer(customer);
    setPaymentMode(mode);
    setPaymentAmount(mode === 'liquidar' ? customer.currentDebt.toString() : '');
    setPaymentMethod('cash');
    setCashTendered(mode === 'liquidar' ? customer.currentDebt.toString() : '');
    setPaymentNotes(mode === 'liquidar' ? 'Liquidación total de saldo pendiente' : '');
    setIsPaymentModalOpen(true);
  };

  // Open manual debt adjustment modal
  const openAdjustDebtModal = (customer: Customer) => {
    setAdjustTargetCustomer(customer);
    setNewDebtAmount(customer.currentDebt.toString());
    setAdjustReason('');
    setIsAdjustDebtModalOpen(true);
  };

  const handleSaveDebtAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetCustomer) return;

    const parsedNewDebt = Math.max(0, parseFloat(newDebtAmount) || 0);
    const updated: Customer = {
      ...adjustTargetCustomer,
      currentDebt: parsedNewDebt,
      notes: adjustReason 
        ? `${adjustTargetCustomer.notes ? adjustTargetCustomer.notes + ' | ' : ''}[Ajuste Saldo ${new Date().toLocaleDateString()}: de ${formatCurrency(adjustTargetCustomer.currentDebt)} a ${formatCurrency(parsedNewDebt)} - Motivo: ${adjustReason}]`
        : adjustTargetCustomer.notes,
    };

    onSaveCustomer(updated);
    setIsAdjustDebtModalOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'form' | 'profile') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;

      const newDoc: CustomerDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: isPdf ? 'pdf' : 'photo',
        fileData: base64,
        fileSize: sizeStr,
        category: newDocCategory,
        uploadDate: new Date().toISOString(),
        notes: newDocNotes || (isPdf ? 'Formato / Documento en PDF' : 'Fotografía adjunta'),
      };

      if (target === 'form') {
        setFormDocuments(prev => [...prev, newDoc]);
      } else if (target === 'profile' && selectedCustomer) {
        const updated = {
          ...selectedCustomer,
          documents: [...(selectedCustomer.documents || []), newDoc],
        };
        onSaveCustomer(updated);
      }

      setNewDocNotes('');
      setIsAddingDocInline(false);
      e.target.value = '';
    } catch (err) {
      alert('Error al leer el archivo. Por favor intente con otra imagen o PDF.');
    }
  };

  const handleRemoveFormDoc = (docId: string) => {
    setFormDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleRemoveProfileDoc = (docId: string) => {
    if (!selectedCustomer) return;
    if (confirm('¿Eliminar este documento del expediente del cliente?')) {
      const updated = {
        ...selectedCustomer,
        documents: selectedCustomer.documents.filter(d => d.id !== docId),
      };
      onSaveCustomer(updated);
    }
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('El nombre del cliente es obligatorio.');
      return;
    }
    if (!formPhone.trim()) {
      alert('El teléfono de contacto es obligatorio para cuentas de crédito.');
      return;
    }

    const customerRecord: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}`,
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      address: formAddress.trim(),
      idNumber: formIdNumber.trim(),
      creditLimit: Number(formCreditLimit) || 0,
      currentDebt: Number(formCurrentDebt) || 0,
      notes: formNotes.trim(),
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
      documents: formDocuments,
    };

    onSaveCustomer(customerRecord);
    setIsCustomerModalOpen(false);
    if (onCloseInitialAddModal) onCloseInitialAddModal();
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const target = paymentTargetCustomer || selectedCustomer;
    if (!target) return;

    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      alert('El monto del pago debe ser mayor a $0.00');
      return;
    }

    if (amount > target.currentDebt) {
      if (!confirm(`El monto abonado (${formatCurrency(amount)}) supera la deuda actual (${formatCurrency(target.currentDebt)}). ¿Desea continuar?`)) {
        return;
      }
    }

    const isFullSettlement = amount >= target.currentDebt;
    const payFolio = generateFolio('ABO', paymentsCount);
    const prevDebt = target.currentDebt;
    const remainingDebt = Math.max(0, prevDebt - amount);

    const paymentRecord: DebtPayment = {
      id: `pay-${Date.now()}`,
      folio: payFolio,
      customerId: target.id,
      customerName: target.name,
      amount,
      date: new Date().toISOString(),
      paymentMethod,
      previousDebt: prevDebt,
      remainingDebt,
      notes: paymentNotes || (isFullSettlement ? 'Liquidación Total de Cuenta' : 'Abono Parcial a Cuenta'),
      registeredBy: paymentRegisteredBy || 'Cajero Principal',
    };

    const updatedCustomer: Customer = {
      ...target,
      currentDebt: remainingDebt,
    };

    onRegisterPayment(paymentRecord, updatedCustomer);
    setIsPaymentModalOpen(false);
  };

  const totalOutstandingDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.currentDebt, 0);
  }, [customers]);

  const totalCreditLimit = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.creditLimit, 0);
  }, [customers]);

  const totalDebtorsCount = useMemo(() => {
    return customers.filter(c => c.currentDebt > 0).length;
  }, [customers]);

  // Customer sales and payments
  const customerSales = useMemo(() => {
    if (!selectedCustomer) return [];
    return sales.filter(s => s.customerId === selectedCustomer.id);
  }, [sales, selectedCustomer]);

  const customerPayments = useMemo(() => {
    if (!selectedCustomer) return [];
    return payments.filter(p => p.customerId === selectedCustomer.id);
  }, [payments, selectedCustomer]);

  const activeTarget = paymentTargetCustomer || selectedCustomer;
  const parsedPayAmount = parseFloat(paymentAmount) || 0;
  const parsedCashTendered = parseFloat(cashTendered) || 0;
  const calculatedChange = Math.max(0, parsedCashTendered - parsedPayAmount);
  const remainingDebtPreview = activeTarget ? Math.max(0, activeTarget.currentDebt - parsedPayAmount) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            Cuentas de Crédito, Deudores y Expedientes de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión completa: Liquidar deudas, registrar abonos, editar clientes y controlar expedientes con Foto o PDF
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openNewCustomerModal}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            + Alta de Cliente con Foto/PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Deuda Total por Cobrar (Fiados)</span>
            <div className="text-lg font-bold text-amber-700 mt-0.5">
              {formatCurrency(totalOutstandingDebt)}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Clientes con Saldo Deudor</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {totalDebtorsCount} de {customers.length} clientes
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Límite de Crédito Otorgado</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {formatCurrency(totalCreditLimit)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Customer Table on Left (7 cols) + Selected Customer Profile on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Customer Directory */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, teléfono, INE, dirección..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterDebtOnly(!filterDebtOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  filterDebtOnly
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Solo con Deuda ({totalDebtorsCount})
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Cliente / Contacto</th>
                    <th className="py-3 px-3">Deuda Actual</th>
                    <th className="py-3 px-3">Límite</th>
                    <th className="py-3 px-3">Expediente</th>
                    <th className="py-3 px-3 text-center">Acciones Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map(c => {
                    const hasDebt = c.currentDebt > 0;
                    const isExceeded = c.currentDebt > c.creditLimit;
                    const isSelected = selectedCustomerId === c.id;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50/80 border-l-4 border-l-teal-600'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {c.name}
                            {isExceeded && (
                              <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded font-semibold">
                                Excedido
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" /> {c.phone}</span>
                            {c.idNumber && <span>• {c.idNumber}</span>}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`font-bold ${hasDebt ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {formatCurrency(c.currentDebt)}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {hasDebt ? 'Pendiente' : 'Al corriente'}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          {formatCurrency(c.creditLimit)}
                        </td>

                        <td className="py-3 px-3">
                          {c.documents && c.documents.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-semibold border border-teal-200">
                              <FileText className="w-3 h-3" />
                              {c.documents.length} doc(s)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sin docs</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                            {hasDebt && (
                              <>
                                <button
                                  onClick={() => openPaymentModalForCustomer(c, 'liquidar')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                  title={`Liquidar deuda total de ${formatCurrency(c.currentDebt)}`}
                                >
                                  <Zap className="w-3 h-3" />
                                  Liquidar
                                </button>

                                <button
                                  onClick={() => openPaymentModalForCustomer(c, 'abono')}
                                  className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Registrar abono parcial"
                                >
                                  <Receipt className="w-3 h-3" />
                                  Abonar
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => openEditCustomerModal(c)}
                              className="p-1 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                              title="Editar datos, límite y saldo del cliente"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setSelectedCustomerId(c.id)}
                              className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              Ver
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                        No se encontraron clientes registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Detailed Customer Ledger & Documents Expediente */}
        <div className="lg:col-span-5 space-y-4 sticky top-20">
          
          {selectedCustomer ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col text-xs">
              
              {/* Profile Top Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{selectedCustomer.name}</h3>
                    {selectedCustomer.currentDebt > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">
                        Saldo Pendiente
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 space-y-0.5">
                    <p>Tel: {selectedCustomer.phone} {selectedCustomer.email && `• ${selectedCustomer.email}`}</p>
                    {selectedCustomer.address && <p>Dir: {selectedCustomer.address}</p>}
                    {selectedCustomer.idNumber && <p>ID/RFC: {selectedCustomer.idNumber}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditCustomerModal(selectedCustomer)}
                    className="p-1.5 text-slate-600 hover:text-teal-600 rounded-md hover:bg-slate-200 border border-slate-200 flex items-center gap-1 text-[11px] font-semibold"
                    title="Editar datos, saldo y crédito"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => setSelectedCustomerId(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Debt & Credit Status Box */}
              <div className="p-4 bg-teal-50/50 border-b border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500">Deuda Actual</span>
                  <div className={`text-base font-bold ${selectedCustomer.currentDebt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(selectedCustomer.currentDebt)}
                  </div>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500">Límite Crédito</span>
                  <div className="text-base font-bold text-slate-800">
                    {formatCurrency(selectedCustomer.creditLimit)}
                  </div>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500">Disponible</span>
                  <div className="text-base font-bold text-teal-700">
                    {formatCurrency(Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentDebt))}
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar: Liquidar / Abonar / Editar / Ajustar Saldo / PDF */}
              <div className="p-3 bg-white border-b border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={selectedCustomer.currentDebt <= 0}
                    onClick={() => openPaymentModalForCustomer(selectedCustomer, 'liquidar')}
                    className={`py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs ${
                      selectedCustomer.currentDebt > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Liquidar Total ({formatCurrency(selectedCustomer.currentDebt)})
                  </button>

                  <button
                    disabled={selectedCustomer.currentDebt <= 0}
                    onClick={() => openPaymentModalForCustomer(selectedCustomer, 'abono')}
                    className={`py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs ${
                      selectedCustomer.currentDebt > 0
                        ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    Abonar Parcial
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditCustomerModal(selectedCustomer)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Editar información general, límite y teléfono"
                  >
                    <Pencil className="w-3.5 h-3.5 text-teal-600" />
                    Editar Cliente
                  </button>

                  <button
                    onClick={() => openAdjustDebtModal(selectedCustomer)}
                    className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Ajuste manual de deuda o condonación de saldo"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                    Ajustar Saldo
                  </button>

                  <button
                    onClick={() => exportCustomerAccountStatementPDF(selectedCustomer, sales, payments, settings)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Exportar Estado de Cuenta en PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    PDF
                  </button>
                </div>
              </div>

              {/* Sub-tabs: Documentos / Compras a Crédito / Abonos */}
              <div className="flex border-b border-slate-200 text-xs bg-slate-50">
                <button
                  onClick={() => setActiveCustomerTab('documents')}
                  className={`flex-1 py-2 font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                    activeCustomerTab === 'documents'
                      ? 'border-teal-600 text-teal-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Expediente ({selectedCustomer.documents?.length || 0})
                </button>
                <button
                  onClick={() => setActiveCustomerTab('sales')}
                  className={`flex-1 py-2 font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                    activeCustomerTab === 'sales'
                      ? 'border-teal-600 text-teal-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Compras ({customerSales.length})
                </button>
                <button
                  onClick={() => setActiveCustomerTab('payments')}
                  className={`flex-1 py-2 font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                    activeCustomerTab === 'payments'
                      ? 'border-teal-600 text-teal-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Abonos ({customerPayments.length})
                </button>
              </div>

              {/* Sub-tab content */}
              <div className="p-4 max-h-[340px] overflow-y-auto space-y-3">
                
                {/* TAB 1: DOCUMENTS (Foto o PDF) */}
                {activeCustomerTab === 'documents' && (
                  <div className="space-y-3">
                    
                    {/* Add document widget */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-teal-600" />
                          Adjuntar Foto o Formato PDF:
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newDocCategory}
                          onChange={e => setNewDocCategory(e.target.value as any)}
                          className="p-1.5 bg-white border border-slate-300 rounded text-xs"
                        >
                          <option value="Identificación / INE">Identificación / INE</option>
                          <option value="Receta Médica">Receta Médica</option>
                          <option value="Convenio / Formato">Convenio / Formato PDF</option>
                          <option value="Comprobante Domicilio">Comprobante Domicilio</option>
                          <option value="Otro">Otro Documento</option>
                        </select>

                        <label className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-semibold cursor-pointer flex items-center justify-center gap-1 text-center shadow-xs">
                          <Upload className="w-3.5 h-3.5" />
                          Seleccionar Archivo
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={e => handleFileUpload(e, 'profile')}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Document List */}
                    <div className="space-y-2">
                      {selectedCustomer.documents && selectedCustomer.documents.length > 0 ? (
                        selectedCustomer.documents.map(doc => (
                          <div
                            key={doc.id}
                            className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2 hover:border-teal-400 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 rounded bg-teal-50 text-teal-700 shrink-0">
                                {doc.type === 'pdf' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-slate-900 truncate">{doc.name}</h5>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                  <span>{doc.category}</span>
                                  <span>•</span>
                                  <span>{formatDate(doc.uploadDate)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setViewingDocument(doc)}
                                className="p-1.5 text-teal-600 hover:bg-teal-50 rounded cursor-pointer"
                                title="Ver documento"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveProfileDoc(doc.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                title="Eliminar documento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No hay fotos ni formatos PDF en el expediente de este cliente.
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* TAB 2: SALES */}
                {activeCustomerTab === 'sales' && (
                  <div className="space-y-2">
                    {customerSales.length > 0 ? (
                      customerSales.map(s => (
                        <div key={s.id} className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                          <div className="flex justify-between font-bold">
                            <span>{s.folio}</span>
                            <span className="text-teal-700">{formatCurrency(s.total)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex justify-between">
                            <span>{formatDateTime(s.date)}</span>
                            <span className="uppercase font-semibold">{s.paymentMethod === 'credit' ? 'A Crédito' : 'Contado'}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 line-clamp-1">
                            {s.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs">Sin compras registradas</div>
                    )}
                  </div>
                )}

                {/* TAB 3: PAYMENTS / ABONOS */}
                {activeCustomerTab === 'payments' && (
                  <div className="space-y-2">
                    {customerPayments.length > 0 ? (
                      customerPayments.map(p => (
                        <div key={p.id} className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                          <div className="flex justify-between font-bold">
                            <span>{p.folio}</span>
                            <span className="text-emerald-600 font-black">+{formatCurrency(p.amount)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex justify-between">
                            <span>{formatDateTime(p.date)}</span>
                            <span>Método: {p.paymentMethod.toUpperCase()}</span>
                          </div>
                          {p.notes && (
                            <div className="text-[10px] text-slate-600 italic">
                              "{p.notes}"
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400">
                            Saldo restante tras pago: <span className="font-semibold text-slate-700">{formatCurrency(p.remainingDebt)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs">Sin abonos registrados</div>
                    )}
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 text-sm">Seleccione un Cliente</h4>
              <p className="text-xs mt-1">
                Haga clic en un cliente de la lista para liquidar deudas, abonar, editar su expediente y generar estados de cuenta.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Customer Registration / Edit Modal with Photo / PDF */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
            
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-teal-600" />
                  {editingCustomer ? 'Editar Datos y Condiciones del Cliente' : 'Alta de Cliente con Expediente (Foto / PDF)'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editingCustomer ? 'Modifique datos personales, límite de crédito y saldo deudor' : 'Cree una cuenta para crédito, fiados y recetas médicas'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCustomerModalOpen(false);
                  if (onCloseInitialAddModal) onCloseInitialAddModal();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre Completo del Cliente / Paciente: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carmen Mendoza Ruiz"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Teléfono de Contacto: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 55-1234-5678"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Correo Electrónico (Opcional):
                  </label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Domicilio Completo:
                  </label>
                  <input
                    type="text"
                    placeholder="Calle, número, colonia, municipio..."
                    value={formAddress}
                    onChange={e => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Identificación / CURP / RFC:
                  </label>
                  <input
                    type="text"
                    placeholder="Clave de Elector / CURP"
                    value={formIdNumber}
                    onChange={e => setFormIdNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Límite de Crédito Autorizado ($):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formCreditLimit}
                    onChange={e => setFormCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-teal-700 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>{editingCustomer ? 'Saldo Deudor Actual ($):' : 'Deuda Inicial / Saldo Anterior ($):'}</span>
                    {editingCustomer && (
                      <span className="text-[10px] text-amber-600 font-normal">Edición directa</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formCurrentDebt}
                    onChange={e => setFormCurrentDebt(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-amber-600 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Modificar este valor ajusta directamente el saldo pendiente de cobro.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Notas Médicas / Convenio:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Tratamiento crónico, convenio vecinal..."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

              </div>

              {/* Section: Upload Document (Photo or PDF) */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    Adjuntar Foto o Formato PDF de Alta / Receta:
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tipo de Documento:
                      </label>
                      <select
                        value={newDocCategory}
                        onChange={e => setNewDocCategory(e.target.value as any)}
                        className="w-full p-2 bg-white border border-slate-300 rounded"
                      >
                        <option value="Identificación / INE">Identificación / INE (Foto)</option>
                        <option value="Receta Médica">Receta Médica (Foto o PDF)</option>
                        <option value="Convenio / Formato">Convenio de Crédito / Formato PDF</option>
                        <option value="Comprobante Domicilio">Comprobante Domicilio</option>
                        <option value="Otro">Otro Formato</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shadow-xs">
                        <Upload className="w-4 h-4" />
                        Subir Foto o Archivo PDF
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={e => handleFileUpload(e, 'form')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Attached documents preview */}
                  {formDocuments.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500">Documentos adjuntos ({formDocuments.length}):</span>
                      {formDocuments.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                          <div className="flex items-center gap-2">
                            {d.type === 'pdf' ? <FileText className="w-4 h-4 text-rose-600" /> : <ImageIcon className="w-4 h-4 text-teal-600" />}
                            <div>
                              <span className="font-semibold text-slate-800">{d.name}</span>
                              <span className="text-[10px] text-slate-400 ml-2">({d.category})</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormDoc(d.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomerModalOpen(false);
                    if (onCloseInitialAddModal) onCloseInitialAddModal();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingCustomer ? 'Guardar Cambios' : 'Guardar Cliente'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Record Debt Payment / Liquidar Modal */}
      {isPaymentModalOpen && activeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    {paymentMode === 'liquidar' ? '⚡ Liquidación Total de Deuda' : '💵 Registrar Abono a Deuda'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    paymentMode === 'liquidar' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
                  }`}>
                    {paymentMode === 'liquidar' ? 'Liquidación 100%' : 'Abono Parcial'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{activeTarget.name} • Tel: {activeTarget.phone}</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 border-b border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setPaymentMode('liquidar');
                  setPaymentAmount(activeTarget.currentDebt.toString());
                  setCashTendered(activeTarget.currentDebt.toString());
                  setPaymentNotes('Liquidación total de saldo pendiente');
                }}
                className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMode === 'liquidar'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Liquidar Todo ({formatCurrency(activeTarget.currentDebt)})
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMode('abono');
                  if (paymentAmount === activeTarget.currentDebt.toString()) {
                    setPaymentAmount('');
                  }
                  setPaymentNotes('');
                }}
                className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMode === 'abono'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Abono Parcial / A Medida
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              
              {/* Debt overview box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-500">Deuda Actual:</span>
                  <div className="text-sm font-black text-amber-700">
                    {formatCurrency(activeTarget.currentDebt)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Monto Pago:</span>
                  <div className="text-sm font-black text-teal-700">
                    {formatCurrency(parsedPayAmount)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Nuevo Saldo:</span>
                  <div className={`text-sm font-black ${remainingDebtPreview === 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {formatCurrency(remainingDebtPreview)}
                  </div>
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Selección Rápida de Monto:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentAmount(activeTarget.currentDebt.toString());
                      setCashTendered(activeTarget.currentDebt.toString());
                      setPaymentMode('liquidar');
                    }}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors"
                  >
                    ⚡ Liquidar 100% ({formatCurrency(activeTarget.currentDebt)})
                  </button>

                  {activeTarget.currentDebt >= 20 && (
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.round(activeTarget.currentDebt / 2);
                        setPaymentAmount(half.toString());
                        setCashTendered(half.toString());
                        setPaymentMode('abono');
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      50% ({formatCurrency(Math.round(activeTarget.currentDebt / 2))})
                    </button>
                  )}

                  {[50, 100, 200, 500, 1000].map(val => {
                    if (val >= activeTarget.currentDebt) return null;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setPaymentAmount(val.toString());
                          setCashTendered(val.toString());
                          setPaymentMode('abono');
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                      >
                        ${val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monto a Pagar / Abonar ($): *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={activeTarget.currentDebt * 2}
                    required
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-white border-2 border-teal-600 rounded-xl text-lg font-black text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Método de Pago:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash' as const, label: 'Efectivo', icon: Banknote },
                    { id: 'card' as const, label: 'Tarjeta', icon: CreditCard },
                    { id: 'transfer' as const, label: 'Transferencia', icon: ArrowRightLeft },
                  ].map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash tendered & Change calculator if cash */}
              {paymentMethod === 'cash' && (
                <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-teal-900 mb-1">
                      Cliente Paga Con ($):
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                      placeholder={paymentAmount}
                      className="w-full px-3 py-1.5 bg-white border border-teal-300 rounded-lg text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-teal-800 font-medium">Cambio a entregar:</span>
                    <div className="text-base font-black text-teal-900">
                      {formatCurrency(calculatedChange)}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notas / Referencia del Cobro:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Pago en caja, liquidación de cuenta, transferencia #9021..."
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              {remainingDebtPreview === 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-[11px]">
                    ¡Excelente! Esta operación dejará la cuenta en $0.00 (Totalmente Liquidada).
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${
                    paymentMode === 'liquidar' || remainingDebtPreview === 0
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-teal-600 hover:bg-teal-500'
                  }`}
                >
                  {paymentMode === 'liquidar' || remainingDebtPreview === 0 ? <Zap className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                  {paymentMode === 'liquidar' || remainingDebtPreview === 0
                    ? `Confirmar Liquidación (${formatCurrency(parsedPayAmount)})`
                    : `Registrar Abono (${formatCurrency(parsedPayAmount)})`}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Manual Debt Adjustment Modal (Ajustar / Condonar) */}
      {isAdjustDebtModalOpen && adjustTargetCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-xs">
            
            <div className="px-6 py-4 border-b border-slate-200 bg-amber-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                  Ajuste Manual de Saldo / Condonación
                </h3>
                <p className="text-[11px] text-amber-700">{adjustTargetCustomer.name}</p>
              </div>
              <button
                onClick={() => setIsAdjustDebtModalOpen(false)}
                className="p-1 text-amber-700 hover:text-amber-900 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDebtAdjustment} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Deuda Registrada Actualmente:</span>
                <span className="text-base font-black text-amber-700">
                  {formatCurrency(adjustTargetCustomer.currentDebt)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nuevo Saldo Deudor Directo ($): *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={newDebtAmount}
                    onChange={e => setNewDebtAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setNewDebtAmount('0')}
                    className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-bold"
                  >
                    Poner en $0.00 (Condonar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDebtAmount(adjustTargetCustomer.currentDebt.toString())}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                  >
                    Restablecer
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo o Justificación del Ajuste: *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej. Corrección por error de dedo en cobro anterior, descuento especial acordado..."
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustDebtModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar Ajuste de Saldo
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewerModal
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}

    </div>
  );
};
