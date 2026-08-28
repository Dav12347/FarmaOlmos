import React, { useState, useMemo } from 'react';
import { Product, PharmacySettings } from '../../types/pharmacy';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  Phone, 
  AlertTriangle, 
  Clock, 
  Package, 
  ShieldAlert, 
  Sliders, 
  Save, 
  Sparkles,
  ExternalLink,
  MessageSquare,
  AlertOctagon,
  Calendar
} from 'lucide-react';
import { 
  analyzeInventoryForAlerts, 
  buildWhatsAppStockAlertMessage, 
  formatPhoneDisplay, 
  getWhatsAppCleanPhone, 
  openWhatsAppNotification,
  WhatsAppAlertOptions
} from '../../utils/whatsappAlerts';

interface WhatsAppAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: PharmacySettings;
  onSaveSettings: (newSettings: PharmacySettings) => void;
}

export const WhatsAppAlertModal: React.FC<WhatsAppAlertModalProps> = ({
  isOpen,
  onClose,
  products,
  settings,
  onSaveSettings,
}) => {
  const [phone, setPhone] = useState<string>(settings.whatsappAlertPhone || '5573501782');
  const [countryCode, setCountryCode] = useState<string>(settings.whatsappCountryCode || '52');
  const [expiryDays, setExpiryDays] = useState<number>(settings.whatsappAlertExpiryDays || 30);
  
  const [includeOutOfStock, setIncludeOutOfStock] = useState<boolean>(
    settings.whatsappAlertIncludeOutOfStock ?? true
  );
  const [includeLowStock, setIncludeLowStock] = useState<boolean>(
    settings.whatsappAlertIncludeLowStock ?? true
  );
  const [includeExpired, setIncludeExpired] = useState<boolean>(
    settings.whatsappAlertIncludeExpired ?? true
  );
  const [includeExpiring, setIncludeExpiring] = useState<boolean>(
    settings.whatsappAlertIncludeExpiring ?? true
  );

  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'send' | 'config'>('send');

  const alertOptions: WhatsAppAlertOptions = useMemo(() => ({
    expiryDays,
    includeOutOfStock,
    includeLowStock,
    includeExpired,
    includeExpiring,
  }), [expiryDays, includeOutOfStock, includeLowStock, includeExpired, includeExpiring]);

  // Inventory analysis
  const { outOfStock, lowStock, expired, expiring, totalAlertsCount } = useMemo(() => {
    return analyzeInventoryForAlerts(products, alertOptions);
  }, [products, alertOptions]);

  // Generated message text
  const messageText = useMemo(() => {
    return buildWhatsAppStockAlertMessage(products, settings, alertOptions);
  }, [products, settings, alertOptions]);

  if (!isOpen) return null;

  const handleSavePhoneAndConfig = () => {
    const updatedSettings: PharmacySettings = {
      ...settings,
      whatsappAlertPhone: phone.trim(),
      whatsappCountryCode: countryCode.trim(),
      whatsappAlertExpiryDays: expiryDays,
      whatsappAlertIncludeOutOfStock: includeOutOfStock,
      whatsappAlertIncludeLowStock: includeLowStock,
      whatsappAlertIncludeExpired: includeExpired,
      whatsappAlertIncludeExpiring: includeExpiring,
      whatsappAlertsEnabled: true,
    };

    onSaveSettings(updatedSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    // Auto-save settings first so the updated number is stored
    handleSavePhoneAndConfig();
    openWhatsAppNotification(phone, messageText, countryCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-200 shadow-inner">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Alertas Sanitarias y de Stock por WhatsApp
                <span className="text-[10px] bg-emerald-400/20 text-emerald-200 font-bold px-2 py-0.5 rounded-full border border-emerald-300/30">
                  FarmaControl POS
                </span>
              </h2>
              <p className="text-xs text-emerald-100/80 font-medium">
                Notificaciones automáticas a celular para medicamentos agotados, stock bajo y próximos a vencer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('send')}
            className={`pb-2.5 px-3 font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'send'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Enviar Reporte y Vista Previa</span>
            {totalAlertsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full">
                {totalAlertsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Configurar Número y Filtros</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Quick Phone Banner (Editable in-place) */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Número de Celular Destino (WhatsApp):
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center bg-white border border-emerald-300 rounded-lg px-2.5 py-1 shadow-xs">
                    <span className="font-bold text-slate-500 text-xs mr-1.5">+{countryCode}</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="5573501782"
                      className="w-32 sm:w-40 font-mono font-bold text-sm text-slate-900 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSavePhoneAndConfig}
                    className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Guardar este número permanentemente"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
            </div>

            {savedSuccess && (
              <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>¡Número guardado con éxito!</span>
              </div>
            )}
          </div>

          {activeTab === 'send' ? (
            <>
              {/* Alert Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className={`p-3 rounded-xl border ${outOfStock.length > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">Agotados (0 Stock)</span>
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="text-xl font-black font-mono mt-1 text-rose-700">{outOfStock.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Sin existencias</div>
                </div>

                <div className={`p-3 rounded-xl border ${lowStock.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">Poco Stock</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-xl font-black font-mono mt-1 text-amber-700">{lowStock.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Menor al mínimo</div>
                </div>

                <div className={`p-3 rounded-xl border ${expired.length > 0 ? 'bg-red-50 border-red-300 text-red-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">Caducados</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div className="text-xl font-black font-mono mt-1 text-red-700">{expired.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Retiro sanitario</div>
                </div>

                <div className={`p-3 rounded-xl border ${expiring.length > 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">Por Caducar</span>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-xl font-black font-mono mt-1 text-amber-700">{expiring.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">En menos de {expiryDays}d</div>
                </div>
              </div>

              {/* Message Live Preview container */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    Vista Previa del Mensaje de WhatsApp:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <div className="bg-[#0b141a] text-slate-100 p-4 rounded-xl font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto border border-slate-800 shadow-inner whitespace-pre-wrap selection:bg-emerald-600 selection:text-white">
                  {messageText}
                </div>
              </div>
            </>
          ) : (
            /* CONFIGURATION TAB */
            <div className="space-y-4">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  Número de Celular y País
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Código de País:
                    </label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
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
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Número a 10 dígitos:
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="5573501782"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Formato actual de envío: <strong>+{countryCode} {phone}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Threshold Days */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Anticipación de Caducidades
                </h3>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Notificar medicamentos que caduquen dentro de los próximos:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[15, 30, 45, 60, 90, 120].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setExpiryDays(days)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          expiryDays === days
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {days} días
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Toggles */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <h3 className="font-bold text-slate-900 text-xs mb-1">
                  Secciones a Incluir en el Mensaje de WhatsApp:
                </h3>

                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <div>
                      <span className="font-bold text-slate-900 text-xs">Medicamentos Agotados (Stock 0)</span>
                      <p className="text-[10px] text-slate-500">Productos con 0 existencias</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeOutOfStock}
                    onChange={(e) => setIncludeOutOfStock(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-bold text-slate-900 text-xs">Poco Stock (Stock Mínimo)</span>
                      <p className="text-[10px] text-slate-500">Productos que están por agotarse</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeLowStock}
                    onChange={(e) => setIncludeLowStock(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <div>
                      <span className="font-bold text-slate-900 text-xs">Medicamentos Ya Caducados</span>
                      <p className="text-[10px] text-slate-500">Para retiro inmediato y merma sanitaria</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeExpired}
                    onChange={(e) => setIncludeExpired(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-bold text-slate-900 text-xs">Próximos a Caducar</span>
                      <p className="text-[10px] text-slate-500">Medicamentos por vencer en los próximos {expiryDays} días</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeExpiring}
                    onChange={(e) => setIncludeExpiring(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </label>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 text-center sm:text-left">
            Destino configurado: <strong>+{countryCode} {phone}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Alerta a WhatsApp (+{countryCode} {phone})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
