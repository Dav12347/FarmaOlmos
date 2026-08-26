import React, { useState } from 'react';
import { PharmacySettings } from '../../types/pharmacy';
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
  Sparkles
} from 'lucide-react';

interface SettingsViewProps {
  settings: PharmacySettings;
  onSaveSettings: (settings: PharmacySettings) => void;
  onRefreshData: () => void;
  onWipeAllData?: () => void;
  onLoadDemoData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onRefreshData,
  onWipeAllData,
  onLoadDemoData,
}) => {
  const [formData, setFormData] = useState<PharmacySettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);

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
