import React, { useState } from 'react';
import { PharmacySettings, AppUser } from '../../types/pharmacy';
import { StorageManager } from '../../utils/storage';
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
  LogOut
} from 'lucide-react';

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

  const handleLoadDemo = () => {
    if (confirm('¿Deseas cargar productos de prueba para demostración?')) {
      StorageManager.loadDemoCatalog();
      if (onLoadDemoData) onLoadDemoData();
      onRefreshData();
      alert('Se han cargado productos de demostración.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
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

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4 text-white" />
            <span>Guardar Datos de Farmacia</span>
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
          Usa esta opción para <strong>vaciar completamente la base de datos</strong> (eliminar todos los productos, clientes, ventas, entradas y salidas de ejemplo) y dejar el sistema en blanco (0 productos) para registrar tu propio inventario real.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setIsWipeModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-xs cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4 text-white" />
            <span>Vaciar Sistema a 0 Productos (Sistema Virgen)</span>
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

      {/* Database Backup & Restore Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 font-bold text-sm text-slate-900">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Respaldo y Seguridad de Base de Datos</span>
        </div>

        <p className="text-slate-600">
          Descargue una copia de seguridad en formato JSON de sus productos, clientes, ventas y deudas para guardarla en su computadora o transferirla a otro equipo.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Descargar Respaldo Completo (JSON)</span>
          </button>

          <label className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer">
            <Upload className="w-4 h-4 text-teal-600" />
            <span>Restaurar desde Respaldo</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
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
