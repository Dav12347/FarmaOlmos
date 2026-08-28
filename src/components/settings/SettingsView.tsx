import React, { useState } from 'react';
import { PharmacySettings, AppUser } from '../../types/pharmacy';
import { StorageManager } from '../../utils/storage';
import { 
  exportFullDatabaseToExcel, 
  exportInventoryTemplateForUpdate, 
  exportInventoryToCSV 
} from '../../utils/exportUtils';
import { 
  Settings, 
  Store, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Sparkles,
  Cloud,
  RefreshCw,
  Smartphone,
  Laptop,
  User,
  KeyRound,
  LogOut,
  FileSpreadsheet,
  FileText,
  Database,
  MessageSquare,
  Phone,
  Send,
  Sliders,
  Calendar,
  AlertOctagon,
  Clock
} from 'lucide-react';
import { 
  buildWhatsAppStockAlertMessage, 
  openWhatsAppNotification 
} from '../../utils/whatsappAlerts';

interface SettingsViewProps {
  settings: PharmacySettings;
  onSaveSettings: (settings: PharmacySettings) => void;
  onRefreshData: () => void;
  onWipeAllData?: () => void;
  onLoadDemoData?: () => void;
  isCloudConnected?: boolean;
  onForceSyncToCloud?: () => Promise<{ success: boolean; message: string }>;
  currentUser?: AppUser | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  counts?: {
    products: number;
    customers: number;
    sales: number;
    movements: number;
    payments: number;
    cashCuts: number;
  };
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onRefreshData,
  onWipeAllData,
  onLoadDemoData,
  isCloudConnected = true,
  onForceSyncToCloud,
  currentUser,
  onOpenLogin,
  onLogout,
  counts,
}) => {
  const [formData, setFormData] = useState<PharmacySettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleTriggerCloudSync = async () => {
    if (!onForceSyncToCloud) return;
    setIsSyncingCloud(true);
    setSyncFeedback(null);
    try {
      const res = await onForceSyncToCloud();
      setSyncFeedback(res.message || 'Sincronizado con éxito');
      onRefreshData();
    } catch (err: any) {
      setSyncFeedback('Error al sincronizar: ' + (err?.message || 'Error'));
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportFullDatabaseExcel = () => {
    const products = StorageManager.getProducts();
    const customers = StorageManager.getCustomers();
    const sales = StorageManager.getSales();
    const movements = StorageManager.getMovements();
    const payments = StorageManager.getPayments();
    const cashCuts = StorageManager.getCashCuts();
    const cashMovements = StorageManager.getCashMovements();

    exportFullDatabaseToExcel({
      products,
      customers,
      sales,
      movements,
      payments,
      cashCuts,
      cashMovements,
      settings: formData,
    });
  };

  const handleExportUpdateTemplateExcel = () => {
    const products = StorageManager.getProducts();
    exportInventoryTemplateForUpdate(products, formData);
  };

  const handleExportCSV = () => {
    const products = StorageManager.getProducts();
    exportInventoryToCSV(products);
  };

  const handleExportBackup = () => {
    const jsonStr = StorageManager.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FarmaControl_Respaldo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = StorageManager.importBackupJSON(content);
        if (ok) {
          alert('¡Respaldo restaurado con éxito! Se actualizaron todos los datos de la farmacia.');
          onRefreshData();
        } else {
          alert('El archivo de respaldo no tiene el formato JSON válido.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmWipe = () => {
    StorageManager.wipeAllData(true);
    if (onWipeAllData) onWipeAllData();
    onRefreshData();
    setIsWipeModalOpen(false);
    alert('✅ Sistema limpiado con éxito. Ahora el sistema está completamente virgen (0 productos, 0 clientes, 0 ventas) para que ingreses tu inventario.');
  };

  const handleWipeOnlyMovements = () => {
    if (confirm('¿Desea eliminar TODAS las entradas y salidas de prueba (tanto de inventario como de caja) y dejar el historial de movimientos 100% limpio? Sus productos y clientes se mantendrán intactos.')) {
      StorageManager.wipeAllTestMovements();
      onRefreshData();
      alert('✅ Entradas y salidas de prueba eliminadas con éxito. El historial ha quedado limpio y virgen.');
    }
  };

  const handleLoadDemo = () => {
    if (confirm('¿Deseas cargar productos de prueba para demostración?')) {
      StorageManager.loadDemoCatalog();
      if (onLoadDemoData) onLoadDemoData();
      onRefreshData();
      alert('Se han cargado productos de demostración.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-600" />
          Ajustes y Configuración de la Farmacia
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Personalice los datos fiscales, encabezados de ticket, licencias sanitarias y respaldos
        </p>
      </div>

      {/* Real-time Cloud Synchronization & Multi-device Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl border border-teal-800/40 p-5 sm:p-6 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">Sincronización en la Nube y Multidispositivo</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  isCloudConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {isCloudConnected ? 'Conectado a Firebase' : 'Reconectando...'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Tus datos se guardan en la nube para que puedas abrir el sistema en tu celular, tablet o laptop simultáneamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTriggerCloudSync}
            disabled={isSyncingCloud}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Sincronizando...' : 'Sincronizar a la Nube Ahora'}</span>
          </button>
        </div>

        {syncFeedback && (
          <div className="p-3 bg-teal-900/60 border border-teal-400/40 rounded-xl text-xs font-semibold text-teal-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Productos</span>
            <p className="text-base font-bold text-teal-300">{counts?.products ?? 0}</p>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Clientes</span>
            <p className="text-base font-bold text-teal-300">{counts?.customers ?? 0}</p>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Ventas Totales</span>
            <p className="text-base font-bold text-teal-300">{counts?.sales ?? 0}</p>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Cortes de Caja</span>
            <p className="text-base font-bold text-teal-300">{counts?.cashCuts ?? 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <Laptop className="w-3.5 h-3.5 text-slate-300" />
            <span>Laptop</span>
          </div>
          <span>↔</span>
          <div className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-slate-300" />
            <span>Celular / Tablet</span>
          </div>
          <span className="ml-auto text-slate-400 italic">Los cambios se reflejan al instante en todos tus dispositivos</span>
        </div>
      </div>

      {/* User Account / Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
            {currentUser?.username === 'farmaolmos' ? 'FO' : (currentUser?.name?.charAt(0).toUpperCase() || 'U')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {currentUser ? currentUser.name : 'Sesión no iniciada'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                {currentUser?.role === 'admin' ? 'Administrador' : currentUser ? 'Cajero' : 'Sin Sesión'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Usuario: <strong className="font-mono text-slate-700">{currentUser ? `@${currentUser.username}` : 'Ninguno'}</strong> • Sucursal: {currentUser?.branchName || 'FarmaOlmos Principal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <KeyRound className="w-4 h-4 text-teal-400" />
              <span>{currentUser ? 'Cambiar de Cuenta' : 'Iniciar Sesión'}</span>
            </button>
          )}

          {currentUser && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>¡Configuración guardada correctamente!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 text-xs">
        
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 font-bold text-sm text-slate-900">
          <Store className="w-4 h-4 text-teal-600" />
          <span>Datos Generales del Establecimiento Farmacéutico</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Nombre de la Farmacia: *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. Farmacia Mi Salud"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Nombre Comercial / Eslogan:
            </label>
            <input
              type="text"
              value={formData.commercialName}
              onChange={e => setFormData({ ...formData, commercialName: e.target.value })}
              placeholder="Ej. Tu salud primero"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              RFC o Registro Fiscal:
            </label>
            <input
              type="text"
              value={formData.rfc}
              onChange={e => setFormData({ ...formData, rfc: e.target.value })}
              placeholder="Ej. FSR-920415-K89"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Licencia Sanitaria / COFEPRIS:
            </label>
            <input
              type="text"
              value={formData.licenseNumber}
              onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
              placeholder="Ej. COFEPRIS-FAR-2024-8871"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Teléfono de Atención:
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Ej. 55-1234-5678"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Correo Electrónico:
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="contacto@mifarmacia.com"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Dirección Física:
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="Calle y número exterior / interior"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Ciudad / Estado / CP:
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              placeholder="Ciudad, Estado"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-900 mb-1">
              Mensaje al Pie del Ticket de Venta:
            </label>
            <input
              type="text"
              value={formData.ticketMessage}
              onChange={e => setFormData({ ...formData, ticketMessage: e.target.value })}
              placeholder="¡Gracias por su preferencia!"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

        </div>

        {/* WHATSAPP ALERTS CONFIGURATION SECTION */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Configuración de Alertas por WhatsApp a Celular</span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
              Stock y Caducidades
            </span>
          </div>

          <p className="text-slate-600 text-xs">
            Especifica el número de teléfono donde deseas recibir advertencias automáticas de medicamentos <strong>por caducar</strong>, <strong>ya caducados</strong> o con <strong>existencias bajas / agotadas</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Código de País:
              </label>
              <select
                value={formData.whatsappCountryCode || '52'}
                onChange={e => setFormData({ ...formData, whatsappCountryCode: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                <option value="52">🇲🇽 México (+52)</option>
                <option value="1">🇺🇸 Estados Unidos / Canadá (+1)</option>
                <option value="54">🇦🇷 Argentina (+54)</option>
                <option value="57">🇨🇴 Colombia (+57)</option>
                <option value="56">🇨🇱 Chile (+56)</option>
                <option value="51">🇵🇪 Perú (+51)</option>
                <option value="34">🇪🇸 España (+34)</option>
                <option value="502">🇬🇹 Guatemala (+502)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Número de Celular para Advertencias (WhatsApp): *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  value={formData.whatsappAlertPhone || ''}
                  onChange={e => setFormData({ ...formData, whatsappAlertPhone: e.target.value.replace(/\D/g, '') })}
                  placeholder="5573501782"
                  className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const products = StorageManager.getProducts();
                    const msg = buildWhatsAppStockAlertMessage(products, formData);
                    openWhatsAppNotification(formData.whatsappAlertPhone || '5573501782', msg, formData.whatsappCountryCode || '52');
                  }}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                  title="Probar envío a WhatsApp"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Probar</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Número configurado: <strong>+{formData.whatsappCountryCode || '52'} {formData.whatsappAlertPhone || '5573501782'}</strong>
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Anticipación de Caducidades (Días):
              </label>
              <select
                value={formData.whatsappAlertExpiryDays || 30}
                onChange={e => setFormData({ ...formData, whatsappAlertExpiryDays: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                <option value="15">15 días antes</option>
                <option value="30">30 días antes (Recomendado)</option>
                <option value="45">45 días antes</option>
                <option value="60">60 días antes</option>
                <option value="90">90 días antes</option>
              </select>
            </div>

            {/* Automation Options */}
            <div className="sm:col-span-2 pt-2 border-t border-emerald-200">
              <label className="block font-bold text-emerald-950 mb-2 text-xs uppercase tracking-wide">
                ⚡ Automatizaciones y Envíos Automáticos a WhatsApp:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-emerald-300 cursor-pointer hover:bg-emerald-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.whatsappAutoSendTicket ?? true}
                    onChange={e => setFormData({ ...formData, whatsappAutoSendTicket: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="text-[11px] leading-tight">
                    <span className="font-bold text-slate-900 block">Comprobante de Venta</span>
                    <span className="text-slate-500">Abrir WhatsApp con el ticket digital al concretar venta o abono</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-emerald-300 cursor-pointer hover:bg-emerald-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.whatsappAutoSendCashCut ?? true}
                    onChange={e => setFormData({ ...formData, whatsappAutoSendCashCut: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="text-[11px] leading-tight">
                    <span className="font-bold text-slate-900 block">Corte de Caja</span>
                    <span className="text-slate-500">Enviar reporte y arqueo al cerrar el turno al número de WhatsApp</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-emerald-300 cursor-pointer hover:bg-emerald-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.whatsappAutoSendCancellation ?? true}
                    onChange={e => setFormData({ ...formData, whatsappAutoSendCancellation: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="text-[11px] leading-tight">
                    <span className="font-bold text-slate-900 block">Cancelaciones y Mermas</span>
                    <span className="text-slate-500">Notificar de inmediato cuando se anule o devuelva una venta</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-900 mb-1">
                Módulos Activos en el Reporte de Stock y Caducidad:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.whatsappAlertIncludeOutOfStock ?? true}
                    onChange={e => setFormData({ ...formData, whatsappAlertIncludeOutOfStock: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Agotados (0 Stock)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.whatsappAlertIncludeLowStock ?? true}
                    onChange={e => setFormData({ ...formData, whatsappAlertIncludeLowStock: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Poco Stock</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.whatsappAlertIncludeExpired ?? true}
                    onChange={e => setFormData({ ...formData, whatsappAlertIncludeExpired: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Ya Caducados</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.whatsappAlertIncludeExpiring ?? true}
                    onChange={e => setFormData({ ...formData, whatsappAlertIncludeExpiring: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Por Caducar</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4 text-white" />
            <span>Guardar Datos y Configuración de Farmacia</span>
          </button>
        </div>

      </form>

      {/* Virgin Mode / Purge & Reset Section */}
      <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-xl border border-rose-200 p-6 shadow-xs space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-rose-200 font-bold text-sm text-rose-950">
          <Trash2 className="w-4 h-4 text-rose-600" />
          <span>Modo Sistema Virgen (Limpiar y Empezar de Cero)</span>
        </div>

        <p className="text-slate-700 leading-relaxed">
          Usa estas opciones para <strong>depurar registros de prueba</strong> o vaciar completamente la base de datos para registrar tu propio inventario real.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleWipeOnlyMovements}
            className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg flex items-center gap-2 shadow-xs cursor-pointer transition-all"
            title="Borra únicamente entradas y salidas de prueba de inventario y caja"
          >
            <RotateCcw className="w-4 h-4 text-white" />
            <span>Limpiar Entradas y Salidas de Prueba (Inventario y Caja)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWipeModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-xs cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4 text-white" />
            <span>Vaciar Sistema por Completo (Sistema Virgen)</span>
          </button>

          <button
            type="button"
            onClick={handleLoadDemo}
            className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Cargar Catálogo de Muestra (Demo)</span>
          </button>
        </div>
      </div>

      {/* Database Backup & Export Center */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <span>Centro de Exportación y Respaldo de Base de Datos</span>
          </div>
          <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full font-bold text-[11px]">
            100% Portabilidad de Datos
          </span>
        </div>

        <p className="text-slate-600 leading-relaxed">
          Exporta tu información para respaldarla, auditarla en Excel o preparar actualizaciones masivas de precios y existencias en hojas de cálculo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Base de Datos Completa en Excel */}
          <div className="border border-teal-200 bg-teal-50/40 rounded-xl p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                <h4 className="font-bold text-slate-900 text-xs">Base de Datos Completa en Excel (.xlsx)</h4>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Exporta todas las tablas de tu farmacia (Inventario, Clientes/Deudas, Ventas, Kardex, Abonos y Cortes) en 7 hojas organizadas.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportFullDatabaseExcel}
              className="w-full px-3.5 py-2.5 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Base de Datos (.xlsx)</span>
            </button>
          </div>

          {/* Card 2: Plantilla para Actualización Masiva de Inventario */}
          <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-slate-900 text-xs">Plantilla de Inventario para Actualización</h4>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Descarga tus medicamentos actuales pre-formateados para editar costos, precios o stock en Excel y re-importar con 1 clic.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportUpdateTemplateExcel}
              className="w-full px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Plantilla (.xlsx)</span>
            </button>
          </div>

          {/* Card 3: Respaldo Técnico JSON */}
          <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-700" />
                <h4 className="font-bold text-slate-900 text-xs">Copia de Seguridad Integral (JSON)</h4>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Copia técnica ligera de toda la base de datos para transferir a otro equipo o guardar en una memoria USB.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Respaldo (JSON)</span>
            </button>
          </div>

          {/* Card 4: Restaurar Base de Datos */}
          <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-700" />
                <h4 className="font-bold text-slate-900 text-xs">Restaurar Base de Datos desde Respaldo</h4>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Carga un archivo JSON previamente respaldado para restablecer productos, deudas, ventas y configuraciones.
              </p>
            </div>
            <label className="w-full px-3.5 py-2.5 bg-white border-2 border-teal-600 hover:bg-teal-50 text-teal-800 font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors text-center">
              <Upload className="w-4 h-4 text-teal-600" />
              <span>Seleccionar Archivo de Respaldo (.json)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

        </div>

        {/* Quick CSV Export */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-slate-500 text-[11px]">
            ¿Necesitas un formato plano compatible con otros sistemas?
          </span>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Exportar Catálogo a CSV</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal to Wipe Everything to 0 */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">¿Vaciar sistema por completo?</h3>
                <p className="text-xs text-rose-600 font-medium">Esta acción dejará el sistema virgen (0 registros)</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Se eliminarán todos los productos, clientes, ventas y movimientos registrados tanto localmente como en la nube para que puedas registrar tus propios medicamentos reales desde cero.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsWipeModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWipe}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Vaciar Todo</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
