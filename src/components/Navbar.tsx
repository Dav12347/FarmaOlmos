import React from 'react';
import { 
  ShoppingCart, 
  Package, 
  ArrowLeftRight, 
  Users, 
  FileSpreadsheet, 
  Settings, 
  Camera,
  Coffee,
  Sparkles,
  Calculator
} from 'lucide-react';
import { Product, Customer } from '../types/pharmacy';
import { getExpiryStatus } from '../utils/formatters';

export type ActiveTab = 'pos' | 'inventory' | 'movements' | 'customers' | 'reports' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  products: Product[];
  customers: Customer[];
  onQuickNewSale: () => void;
  onOpenPhotoSearch?: () => void;
  onOpenCashCut?: () => void;
  isCloudConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  products,
  customers,
  onQuickNewSale,
  onOpenPhotoSearch,
  onOpenCashCut,
  isCloudConnected = true,
}) => {
  // Compute critical count (expired / low stock)
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const criticalExpiryCount = products.filter(p => {
    const st = getExpiryStatus(p.expirationDate);
    return st.status === 'expired' || st.status === 'critical';
  }).length;
  const totalDebtors = customers.filter(c => c.currentDebt > 0).length;

  const navLinks = [
    { id: 'pos' as ActiveTab, label: 'Punto de Venta', icon: ShoppingCart, count: 0 },
    { id: 'inventory' as ActiveTab, label: 'Inventario', icon: Package, count: lowStockCount + criticalExpiryCount, badgeColor: 'bg-rose-500 text-white' },
    { id: 'movements' as ActiveTab, label: 'Entradas/Salidas', icon: ArrowLeftRight, count: 0 },
    { id: 'customers' as ActiveTab, label: 'Créditos y Deudas', icon: Users, count: totalDebtors, badgeColor: 'bg-amber-600 text-white' },
    { id: 'reports' as ActiveTab, label: 'Ventas y Reportes', icon: FileSpreadsheet, count: 0 },
    { id: 'settings' as ActiveTab, label: 'Ajustes', icon: Settings, count: 0 },
  ];

  return (
    <>
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 text-white select-none shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-2 shrink-0">
            <div 
              onClick={() => setActiveTab('pos')} 
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white shadow-xs group-hover:bg-teal-500 transition-colors">
                <span className="text-base sm:text-lg">✚</span>
              </div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white font-mono uppercase whitespace-nowrap">
                FarmaControl
              </span>
            </div>

            {/* Real-time Cloud status indicator */}
            <div 
              className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-300"
              title={isCloudConnected ? "Conectado y sincronizando en tiempo real con Firebase Firestore" : "Modo local / reconectando"}
            >
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="whitespace-nowrap">
                {isCloudConnected ? 'Nube en vivo' : 'Conectando'}
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Hidden on small mobile screens in favor of bottom bar) */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.count > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        item.badgeColor || 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Actions (Photo Search + Cash Cut + Quick Sale) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenCashCut && (
              <button
                onClick={onOpenCashCut}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 hover:border-teal-500/50 text-xs font-bold py-2 px-2.5 sm:px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-xs"
                title="Corte de caja, arqueo y movimientos de efectivo"
              >
                <Calculator className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="hidden sm:inline">Corte</span>
              </button>
            )}

            {onOpenPhotoSearch && (
              <button
                onClick={onOpenPhotoSearch}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 text-xs font-bold py-2 px-2.5 sm:px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-xs"
                title="Buscar producto por foto (cámara o galería)"
              >
                <Camera className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="hidden sm:inline">Buscar x Foto</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('pos');
                onQuickNewSale();
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-semibold py-2 px-3 sm:px-3.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>+ Cobro</span>
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Fixed for smartphone users) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 md:hidden flex items-center justify-around py-1.5 px-2 safe-area-inset-bottom shadow-2xl">
        
        {/* POS */}
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'pos' ? 'text-teal-400 font-bold scale-105' : 'text-slate-400'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Venta</span>
        </button>

        {/* Photo Search */}
        {onOpenPhotoSearch && (
          <button
            onClick={onOpenPhotoSearch}
            className="flex flex-col items-center justify-center p-1.5 rounded-xl text-teal-300 transition-all cursor-pointer active:scale-95"
          >
            <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center -mt-4 shadow-lg border-2 border-slate-900">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-bold text-teal-300">Foto</span>
          </button>
        )}

        {/* Inventario */}
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl relative transition-all cursor-pointer ${
            activeTab === 'inventory' ? 'text-teal-400 font-bold scale-105' : 'text-slate-400'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Inventario</span>
          {(lowStockCount + criticalExpiryCount) > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 bg-rose-500 rounded-full" />
          )}
        </button>

        {/* Movimientos */}
        <button
          onClick={() => setActiveTab('movements')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'movements' ? 'text-teal-400 font-bold scale-105' : 'text-slate-400'
          }`}
        >
          <ArrowLeftRight className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Kardex</span>
        </button>

        {/* Créditos */}
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl relative transition-all cursor-pointer ${
            activeTab === 'customers' ? 'text-teal-400 font-bold scale-105' : 'text-slate-400'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Crédito</span>
          {totalDebtors > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 bg-amber-500 rounded-full" />
          )}
        </button>

        {/* Reportes */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'reports' ? 'text-teal-400 font-bold scale-105' : 'text-slate-400'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Reportes</span>
        </button>

        {/* Ajustes */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'settings' ? 'text-teal-400 font-bold scale-105' : 'text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Ajustes</span>
        </button>

      </div>
    </>
  );
};

