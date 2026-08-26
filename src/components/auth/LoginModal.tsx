import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  KeyRound, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Cloud, 
  Laptop, 
  Smartphone, 
  Building2,
  LogIn,
  X
} from 'lucide-react';
import { AppUser } from '../../types/pharmacy';
import { StorageManager, DEFAULT_USERS } from '../../utils/storage';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: AppUser) => void;
  currentUser?: AppUser | null;
  isBlocking?: boolean; // If true, cannot close without logging in
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
  isBlocking = false,
}) => {
  const [activeTab, setActiveTab] = useState<'farmaolmos' | 'manual' | 'info'>('farmaolmos');
  
  // FarmaOlmos Quick Login Tab state
  const [farmaUser, setFarmaUser] = useState('farmaolmos');
  const [farmaPass, setFarmaPass] = useState('david06');
  const [showFarmaPass, setShowFarmaPass] = useState(false);

  // Manual Login Tab state
  const [manualUser, setManualUser] = useState('');
  const [manualPass, setManualPass] = useState('');
  const [showManualPass, setShowManualPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickFarmaLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Simulate snappy auth feel
    setTimeout(() => {
      const res = StorageManager.validateAndLogin(farmaUser, farmaPass, rememberMe);
      if (res.success && res.user) {
        setSuccessMessage('¡Bienvenido FarmaOlmos! Sincronizando datos con la nube...');
        setTimeout(() => {
          setLoading(false);
          onLoginSuccess(res.user!);
          if (onClose) onClose();
        }, 600);
      } else {
        setLoading(false);
        setErrorMessage(res.message || 'Credenciales incorrectas');
      }
    }, 300);
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUser.trim() || !manualPass.trim()) {
      setErrorMessage('Por favor ingrese su usuario y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    setTimeout(() => {
      const res = StorageManager.validateAndLogin(manualUser, manualPass, rememberMe);
      if (res.success && res.user) {
        setSuccessMessage(`¡Bienvenido ${res.user.name}! Sincronizando sesión...`);
        setTimeout(() => {
          setLoading(false);
          onLoginSuccess(res.user!);
          if (onClose) onClose();
        }, 600);
      } else {
        setLoading(false);
        setErrorMessage(res.message || 'Usuario o contraseña no válidos.');
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 p-5 sm:p-6 border-b border-slate-800 relative">
          {!isBlocking && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">Acceso a FarmaControl</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Nube en Vivo
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Inicia sesión para sincronizar tu inventario y ventas en todos tus dispositivos.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-5 bg-slate-800/90 p-1 rounded-2xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('farmaolmos');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'farmaolmos'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>FarmaOlmos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'manual'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Otro Usuario</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('info');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'info'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Sincronización</span>
            </button>
          </div>
        </div>

        {/* Tab 1: FarmaOlmos Quick Login */}
        {activeTab === 'farmaolmos' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Account Card */}
            <div className="bg-slate-800/70 border border-teal-500/30 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 opacity-10">
                <ShieldCheck className="w-32 h-32 text-teal-400" />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center font-black text-white text-lg shadow-sm">
                  FO
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Cuenta FarmaOlmos</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Administrador
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    David Olmos • Sucursal Principal & Matriz
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700/70 text-xs">
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Usuario</span>
                  <span className="font-mono font-bold text-teal-300">farmaolmos</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Contraseña</span>
                  <span className="font-mono font-bold text-teal-300">david06</span>
                </div>
              </div>
            </div>

            {/* Editable Fields for FarmaOlmos */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={farmaUser}
                    onChange={(e) => setFarmaUser(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono focus:border-teal-500 focus:outline-none"
                    placeholder="farmaolmos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showFarmaPass ? 'text' : 'password'}
                    value={farmaPass}
                    onChange={(e) => setFarmaPass(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white font-mono focus:border-teal-500 focus:outline-none"
                    placeholder="david06"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFarmaPass(!showFarmaPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showFarmaPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback messages */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs font-semibold text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs font-semibold text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleQuickFarmaLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-teal-900/30 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Accediendo...' : 'Ingresar como FarmaOlmos'}</span>
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 bg-slate-800"
                  />
                  <span>Mantener sesión iniciada en esta laptop/celular</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Manual / Other User Login */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualLogin} className="p-5 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Usuario o Correo Electrónico
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualUser}
                  onChange={(e) => setManualUser(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                  placeholder="ej. farmaolmos o cajero"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showManualPass ? 'text' : 'password'}
                  value={manualPass}
                  onChange={(e) => setManualPass(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowManualPass(!showManualPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showManualPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 bg-slate-800"
                />
                <span>Recordar sesión</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setManualUser('farmaolmos');
                  setManualPass('david06');
                }}
                className="text-teal-400 hover:text-teal-300 text-xs font-semibold"
              >
                Usar FarmaOlmos
              </button>
            </div>

            {/* Quick user presets pills */}
            <div className="pt-1">
              <span className="text-[11px] text-slate-400 block mb-1.5">Cuentas disponibles:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualUser('farmaolmos');
                    setManualPass('david06');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-teal-300 font-medium cursor-pointer"
                >
                  farmaolmos / david06 (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualUser('cajero');
                    setManualPass('1234');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-medium cursor-pointer"
                >
                  cajero / 1234 (Cajero)
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs font-semibold text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs font-semibold text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-teal-900/30 transition-all cursor-pointer mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
            </button>
          </form>
        )}

        {/* Tab 3: Cloud & Multi-device Info */}
        {activeTab === 'info' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Sincronización en la Nube</h4>
                  <p className="text-xs text-slate-300">Conexión en vivo con Firebase Firestore</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Al iniciar sesión con tu cuenta <strong className="text-teal-300">farmaolmos</strong>, el sistema enlaza tus ventas, catálogo de productos, clientes con saldo a crédito y cortes de caja con la base de datos central.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex flex-col items-center text-center">
                <Laptop className="w-6 h-6 text-teal-400 mb-1" />
                <span className="font-bold text-white">En tu Laptop</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Captura inventario, genera reportes y ventas de mostrador.</span>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex flex-col items-center text-center">
                <Smartphone className="w-6 h-6 text-teal-400 mb-1" />
                <span className="font-bold text-white">En tu Celular / Tablet</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Abre tu enlace web y visualiza tus ventas en vivo.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab('farmaolmos');
                handleQuickFarmaLogin();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Continuar con FarmaOlmos</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>FarmaControl POS • FarmaOlmos</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Servidor Activo
          </span>
        </div>

      </div>
    </div>
  );
};
