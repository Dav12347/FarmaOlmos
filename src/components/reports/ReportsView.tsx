import React, { useState, useMemo } from 'react';
import { 
  Sale, 
  InventoryMovement, 
  Customer, 
  Product, 
  DebtPayment, 
  PharmacySettings 
} from '../../types/pharmacy';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime 
} from '../../utils/formatters';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  Package, 
  AlertOctagon, 
  FileText, 
  Pill, 
  PieChart,
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  Receipt,
  BarChart3,
  CalendarDays,
  CalendarRange,
  ArrowUpRight,
  Wallet,
  Sparkles,
  RotateCcw,
  Calculator,
  AlertTriangle
} from 'lucide-react';
import { 
  exportMonthlyReportToExcel, 
  exportMonthlyReportToPDF,
  exportDailyReportToExcel,
  exportDailyReportToPDF,
  exportWeeklyReportToExcel
} from '../../utils/exportUtils';

interface ReportsViewProps {
  sales: Sale[];
  movements: InventoryMovement[];
  customers: Customer[];
  products: Product[];
  payments: DebtPayment[];
  settings: PharmacySettings;
  onOpenSaleTicket?: (sale: Sale) => void;
  onCancelSale?: (sale: Sale) => void;
  onOpenCashCut?: () => void;
}

type PeriodTab = 'daily' | 'weekly' | 'monthly' | 'custom';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  movements,
  customers,
  products,
  payments,
  settings,
  onOpenSaleTicket,
  onCancelSale,
  onOpenCashCut,
}) => {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<PeriodTab>('daily');

  // --- STATE FOR DAILY VIEW ---
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // --- STATE FOR WEEKLY VIEW ---
  // Default to the monday of the current week
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  });

  // --- STATE FOR MONTHLY VIEW ---
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  // --- STATE FOR CUSTOM VIEW ---
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Search filter inside sales tables
  const [searchQuery, setSearchQuery] = useState('');

  // =========================================================================
  // 1. DATA COMPUTATION FOR DAILY SALES
  // =========================================================================
  const selectedDayDate = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateStr]);

  const dailySales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = new Date(s.date);
      const y = saleDate.getFullYear();
      const m = String(saleDate.getMonth() + 1).padStart(2, '0');
      const d = String(saleDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}` === selectedDateStr;
    });
  }, [sales, selectedDateStr]);

  const dailyPayments = useMemo(() => {
    return payments.filter(p => {
      const payDate = new Date(p.date);
      const y = payDate.getFullYear();
      const m = String(payDate.getMonth() + 1).padStart(2, '0');
      const d = String(payDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}` === selectedDateStr;
    });
  }, [payments, selectedDateStr]);

  const dailyMovements = useMemo(() => {
    return movements.filter(mv => {
      const mvDate = new Date(mv.date);
      const y = mvDate.getFullYear();
      const m = String(mvDate.getMonth() + 1).padStart(2, '0');
      const d = String(mvDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}` === selectedDateStr;
    });
  }, [movements, selectedDateStr]);

  // Daily Metrics
  const dailyTotalSales = useMemo(() => dailySales.reduce((sum, s) => sum + s.total, 0), [dailySales]);
  const dailyTotalCost = useMemo(() => {
    return dailySales.reduce((sum, s) => {
      return sum + s.items.reduce((isum, it) => isum + (it.costPrice * it.quantity), 0);
    }, 0);
  }, [dailySales]);
  const dailyGrossProfit = dailyTotalSales - dailyTotalCost;
  const dailyMargin = dailyTotalSales > 0 ? ((dailyGrossProfit / dailyTotalSales) * 100).toFixed(1) : '0';
  const dailyAverageTicket = dailySales.length > 0 ? (dailyTotalSales / dailySales.length) : 0;
  const dailyTotalUnitsSold = useMemo(() => {
    return dailySales.reduce((sum, s) => sum + s.items.reduce((isum, it) => isum + it.quantity, 0), 0);
  }, [dailySales]);

  // Daily Payment Methods (Corte de Caja)
  const dailyCashSales = useMemo(() => dailySales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0), [dailySales]);
  const dailyCardSales = useMemo(() => dailySales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0), [dailySales]);
  const dailyTransferSales = useMemo(() => dailySales.filter(s => s.paymentMethod === 'transfer').reduce((sum, s) => sum + s.total, 0), [dailySales]);
  const dailyCreditSales = useMemo(() => dailySales.filter(s => s.isCredit).reduce((sum, s) => sum + s.total, 0), [dailySales]);
  const dailyTotalCashInDrawer = dailyCashSales;

  // Hourly Breakdown for Daily Chart
  const dailyHourlyData = useMemo(() => {
    const hoursMap = new Map<number, { amount: number; count: number }>();
    for (let h = 8; h <= 22; h++) {
      hoursMap.set(h, { amount: 0, count: 0 });
    }

    dailySales.forEach(s => {
      const h = new Date(s.date).getHours();
      const current = hoursMap.get(h) || { amount: 0, count: 0 };
      current.amount += s.total;
      current.count += 1;
      hoursMap.set(h, current);
    });

    return Array.from(hoursMap.entries()).map(([hour, data]) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      amount: data.amount,
      count: data.count,
    }));
  }, [dailySales]);

  const maxHourlyAmount = useMemo(() => {
    const max = Math.max(...dailyHourlyData.map(h => h.amount));
    return max > 0 ? max : 100;
  }, [dailyHourlyData]);

  // Top products today
  const dailyTopProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    dailySales.forEach(s => {
      s.items.forEach(it => {
        const existing = map.get(it.productId) || { name: it.productName, quantity: 0, revenue: 0 };
        existing.quantity += it.quantity;
        existing.revenue += it.subtotal;
        map.set(it.productId, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [dailySales]);

  // =========================================================================
  // 2. DATA COMPUTATION FOR WEEKLY SALES
  // =========================================================================
  const weekRange = useMemo(() => {
    const start = new Date(selectedWeekDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [selectedWeekDate]);

  const weeklySales = useMemo(() => {
    return sales.filter(s => {
      const d = new Date(s.date);
      return d >= weekRange.start && d <= weekRange.end;
    });
  }, [sales, weekRange]);

  const weeklyPayments = useMemo(() => {
    return payments.filter(p => {
      const d = new Date(p.date);
      return d >= weekRange.start && d <= weekRange.end;
    });
  }, [payments, weekRange]);

  const weeklyTotalSales = useMemo(() => weeklySales.reduce((sum, s) => sum + s.total, 0), [weeklySales]);
  const weeklyTotalCost = useMemo(() => {
    return weeklySales.reduce((sum, s) => {
      return sum + s.items.reduce((isum, it) => isum + (it.costPrice * it.quantity), 0);
    }, 0);
  }, [weeklySales]);
  const weeklyGrossProfit = weeklyTotalSales - weeklyTotalCost;
  const weeklyMargin = weeklyTotalSales > 0 ? ((weeklyGrossProfit / weeklyTotalSales) * 100).toFixed(1) : '0';
  const weeklyDailyAverage = weeklyTotalSales / 7;

  // Weekly breakdown by day (Mon to Sun)
  const weeklyDayBreakdown = useMemo(() => {
    const days: { date: Date; dayName: string; dateStr: string; amount: number; count: number; cash: number; credit: number }[] = [];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekRange.start);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${dayNum}`;

      const daySales = sales.filter(s => {
        const sDate = new Date(s.date);
        return sDate.getFullYear() === y && (sDate.getMonth() + 1) === (d.getMonth() + 1) && sDate.getDate() === d.getDate();
      });

      const dayAmount = daySales.reduce((sum, s) => sum + s.total, 0);
      const dayCash = daySales.filter(s => !s.isCredit).reduce((sum, s) => sum + s.total, 0);
      const dayCredit = daySales.filter(s => s.isCredit).reduce((sum, s) => sum + s.total, 0);

      days.push({
        date: d,
        dayName: dayNames[i],
        dateStr: `${d.getDate()} de ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`,
        amount: dayAmount,
        count: daySales.length,
        cash: dayCash,
        credit: dayCredit,
      });
    }

    return days;
  }, [weekRange, sales]);

  const maxWeeklyDayAmount = useMemo(() => {
    const max = Math.max(...weeklyDayBreakdown.map(d => d.amount));
    return max > 0 ? max : 100;
  }, [weeklyDayBreakdown]);

  const bestWeeklyDay = useMemo(() => {
    return [...weeklyDayBreakdown].sort((a, b) => b.amount - a.amount)[0];
  }, [weeklyDayBreakdown]);

  // Weekly Top Products
  const weeklyTopProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    weeklySales.forEach(s => {
      s.items.forEach(it => {
        const existing = map.get(it.productId) || { name: it.productName, quantity: 0, revenue: 0 };
        existing.quantity += it.quantity;
        existing.revenue += it.subtotal;
        map.set(it.productId, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 8);
  }, [weeklySales]);

  // =========================================================================
  // 3. DATA COMPUTATION FOR MONTHLY SALES
  // =========================================================================
  const monthlySales = useMemo(() => {
    return sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [sales, selectedMonth, selectedYear]);

  const monthlyMovements = useMemo(() => {
    return movements.filter(m => {
      const d = new Date(m.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [movements, selectedMonth, selectedYear]);

  const monthlyPayments = useMemo(() => {
    return payments.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [payments, selectedMonth, selectedYear]);

  const monthlyTotalSales = useMemo(() => monthlySales.reduce((sum, s) => sum + s.total, 0), [monthlySales]);
  const monthlyTotalCost = useMemo(() => {
    return monthlySales.reduce((sum, s) => {
      return sum + s.items.reduce((isum, it) => isum + (it.costPrice * it.quantity), 0);
    }, 0);
  }, [monthlySales]);
  const monthlyGrossProfit = monthlyTotalSales - monthlyTotalCost;
  const monthlyMargin = monthlyTotalSales > 0 ? ((monthlyGrossProfit / monthlyTotalSales) * 100).toFixed(1) : '0';
  const monthlyCreditSales = useMemo(() => monthlySales.filter(s => s.isCredit).reduce((sum, s) => sum + s.total, 0), [monthlySales]);
  const monthlyCashSales = monthlyTotalSales - monthlyCreditSales;
  const monthlyCollectedDebt = useMemo(() => monthlyPayments.reduce((sum, p) => sum + p.amount, 0), [monthlyPayments]);
  const monthlyEntriesAmount = useMemo(() => monthlyMovements.filter(m => m.type === 'entry').reduce((sum, m) => sum + m.totalValue, 0), [monthlyMovements]);
  const monthlyExitsLosses = useMemo(() => monthlyMovements.filter(m => m.type === 'exit').reduce((sum, m) => sum + m.totalValue, 0), [monthlyMovements]);
  const totalActiveDebt = useMemo(() => customers.reduce((sum, c) => sum + c.currentDebt, 0), [customers]);
  const currentInventoryCostValue = useMemo(() => products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0), [products]);

  // Monthly breakdown by weeks (Semana 1, 2, 3, 4, 5)
  const monthlyWeeksBreakdown = useMemo(() => {
    const weeks: { weekLabel: string; amount: number; count: number }[] = [
      { weekLabel: 'Días 1 - 7', amount: 0, count: 0 },
      { weekLabel: 'Días 8 - 14', amount: 0, count: 0 },
      { weekLabel: 'Días 15 - 21', amount: 0, count: 0 },
      { weekLabel: 'Días 22 - 28', amount: 0, count: 0 },
      { weekLabel: 'Días 29+', amount: 0, count: 0 },
    ];

    monthlySales.forEach(s => {
      const day = new Date(s.date).getDate();
      if (day <= 7) {
        weeks[0].amount += s.total;
        weeks[0].count += 1;
      } else if (day <= 14) {
        weeks[1].amount += s.total;
        weeks[1].count += 1;
      } else if (day <= 21) {
        weeks[2].amount += s.total;
        weeks[2].count += 1;
      } else if (day <= 28) {
        weeks[3].amount += s.total;
        weeks[3].count += 1;
      } else {
        weeks[4].amount += s.total;
        weeks[4].count += 1;
      }
    });

    return weeks;
  }, [monthlySales]);

  const maxMonthlyWeekAmount = useMemo(() => {
    const max = Math.max(...monthlyWeeksBreakdown.map(w => w.amount));
    return max > 0 ? max : 100;
  }, [monthlyWeeksBreakdown]);

  // Monthly top products
  const monthlyTopProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number; presentation: string }>();
    monthlySales.forEach(s => {
      s.items.forEach(it => {
        const existing = map.get(it.productId) || {
          name: it.productName,
          quantity: 0,
          revenue: 0,
          presentation: it.presentation,
        };
        existing.quantity += it.quantity;
        existing.revenue += it.subtotal;
        map.set(it.productId, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [monthlySales]);

  const maxMonthlySoldQty = monthlyTopProducts[0]?.quantity || 1;

  // Monthly sales by category
  const salesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthlySales.forEach(s => {
      s.items.forEach(it => {
        const prod = products.find(p => p.id === it.productId);
        const cat = prod?.category || 'General';
        map.set(cat, (map.get(cat) || 0) + it.subtotal);
      });
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthlySales, products]);

  // =========================================================================
  // 4. DATA COMPUTATION FOR CUSTOM RANGE
  // =========================================================================
  const customSales = useMemo(() => {
    const start = new Date(`${customStartDate}T00:00:00`);
    const end = new Date(`${customEndDate}T23:59:59`);
    return sales.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
  }, [sales, customStartDate, customEndDate]);

  const customTotalSales = useMemo(() => customSales.reduce((sum, s) => sum + s.total, 0), [customSales]);
  const customTotalCost = useMemo(() => {
    return customSales.reduce((sum, s) => {
      return sum + s.items.reduce((isum, it) => isum + (it.costPrice * it.quantity), 0);
    }, 0);
  }, [customSales]);
  const customGrossProfit = customTotalSales - customTotalCost;

  // =========================================================================
  // HANDLERS FOR EXPORTS & NAVIGATION
  // =========================================================================
  const handleExportDailyExcel = () => {
    exportDailyReportToExcel({
      date: selectedDayDate,
      sales: dailySales,
      payments: dailyPayments,
      movements: dailyMovements,
      settings,
    });
  };

  const handleExportDailyPDF = () => {
    exportDailyReportToPDF({
      date: selectedDayDate,
      sales: dailySales,
      payments: dailyPayments,
      movements: dailyMovements,
      settings,
    });
  };

  const handleExportWeeklyExcel = () => {
    exportWeeklyReportToExcel({
      startDate: weekRange.start,
      endDate: weekRange.end,
      sales: weeklySales,
      payments: weeklyPayments,
      settings,
    });
  };

  const handleExportMonthlyExcel = () => {
    exportMonthlyReportToExcel({
      monthName: MONTH_NAMES[selectedMonth],
      year: selectedYear,
      startDate: new Date(selectedYear, selectedMonth, 1),
      endDate: new Date(selectedYear, selectedMonth + 1, 0),
      sales: monthlySales,
      movements: monthlyMovements,
      customers,
      products,
      payments: monthlyPayments,
      settings,
    });
  };

  const handleExportMonthlyPDF = () => {
    exportMonthlyReportToPDF({
      monthName: MONTH_NAMES[selectedMonth],
      year: selectedYear,
      startDate: new Date(selectedYear, selectedMonth, 1),
      endDate: new Date(selectedYear, selectedMonth + 1, 0),
      sales: monthlySales,
      movements: monthlyMovements,
      customers,
      products,
      payments: monthlyPayments,
      settings,
    });
  };

  // Helper to change day quickly
  const shiftDay = (days: number) => {
    const current = new Date(selectedDayDate);
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDateStr(`${y}-${m}-${d}`);
  };

  // Helper to change week quickly
  const shiftWeek = (weeks: number) => {
    const current = new Date(selectedWeekDate);
    current.setDate(current.getDate() + (weeks * 7));
    setSelectedWeekDate(current);
  };

  // Filtered sales in the active view table
  const activeDisplaySales = useMemo(() => {
    let list = dailySales;
    if (activeTab === 'weekly') list = weeklySales;
    else if (activeTab === 'monthly') list = monthlySales;
    else if (activeTab === 'custom') list = customSales;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(s => 
      s.folio.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      s.items.some(i => i.productName.toLowerCase().includes(q)) ||
      s.paymentMethod.toLowerCase().includes(q)
    );
  }, [activeTab, dailySales, weeklySales, monthlySales, customSales, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
      {/* 1. Header & Main Period Selector Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Control de Ventas y Reportes Financieros
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Auditoría en tiempo real de ventas diarias, semanales y mensuales con corte de caja y márgenes
              </p>
            </div>
          </div>
        </div>

        {/* 4 Main View Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start lg:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'daily'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>Ventas Diarias</span>
          </button>

          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'weekly'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
            <span>Ventas Semanales</span>
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'monthly'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
            <span>Ventas Mensuales</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'custom'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 text-teal-600" />
            <span>Rango Libre</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. TAB: VENTAS DIARIAS (HOY / FECHA SELECCIONADA / CORTE DE CAJA)     */}
      {/* ===================================================================== */}
      {activeTab === 'daily' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {/* Daily Date Controller Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDay(-1)}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={selectedDateStr}
                onChange={e => setSelectedDateStr(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              <button
                onClick={() => shiftDay(1)}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const y = today.getFullYear();
                  const m = String(today.getMonth() + 1).padStart(2, '0');
                  const d = String(today.getDate()).padStart(2, '0');
                  setSelectedDateStr(`${y}-${m}-${d}`);
                }}
                className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Hoy
              </button>
            </div>

            <div className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span className="capitalize">
                {selectedDayDate.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenCashCut && (
                <button
                  onClick={onOpenCashCut}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs border border-slate-700"
                >
                  <Calculator className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-white">Arqueo & Corte</span>
                </button>
              )}

              <button
                onClick={handleExportDailyExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Excel Corte</span>
              </button>

              <button
                onClick={handleExportDailyPDF}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span className="text-white">PDF Corte</span>
              </button>
            </div>

          </div>

          {/* Daily 4 Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Total Sales of Day */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">Ventas Totales del Día</span>
                <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(dailyTotalSales)}
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100 flex justify-between">
                <span>Tickets: <strong>{dailySales.length}</strong></span>
                <span>Unidades: <strong>{dailyTotalUnitsSold}</strong></span>
              </div>
            </div>

            {/* Daily Gross Profit */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">Ganancia Bruta del Día</span>
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {formatCurrency(dailyGrossProfit)}
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100 flex justify-between">
                <span>Margen: <strong className="text-emerald-800 font-bold">{dailyMargin}%</strong></span>
                <span>Costo: {formatCurrency(dailyTotalCost)}</span>
              </div>
            </div>

            {/* Daily Average Ticket */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">Ticket Promedio</span>
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <Receipt className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-blue-700 font-mono">
                {formatCurrency(dailyAverageTicket)}
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100">
                <span>Promedio por cliente atendido hoy</span>
              </div>
            </div>

            {/* Cash in Drawer Today (Ventas Efectivo) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">Efectivo Cobrado en Ventas</span>
                <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {formatCurrency(dailyCashSales)}
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100 flex justify-between">
                <span>Ventas Efectivo: {formatCurrency(dailyCashSales)}</span>
                <span>Tickets: {dailySales.filter(s => s.paymentMethod === 'cash').length}</span>
              </div>
            </div>

          </div>

          {/* Corte de Caja & Métodos de Pago Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-base text-white">
                  Corte de Caja Diario y Cuadre de Turno
                </h3>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                Fecha de Auditoría: {selectedDayDate.toLocaleDateString('es-MX')}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 space-y-1">
                <div className="text-[11px] font-bold text-slate-300 uppercase">1. Efectivo Cobrado</div>
                <div className="text-lg font-black text-emerald-400 font-mono">
                  {formatCurrency(dailyCashSales)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {dailySales.filter(s => s.paymentMethod === 'cash').length} tickets en efectivo
                </div>
              </div>

              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 space-y-1">
                <div className="text-[11px] font-bold text-slate-300 uppercase">2. Tarjetas (Terminal)</div>
                <div className="text-lg font-black text-sky-400 font-mono">
                  {formatCurrency(dailyCardSales)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Débito y Crédito bancario
                </div>
              </div>

              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 space-y-1">
                <div className="text-[11px] font-bold text-slate-300 uppercase">3. Transferencias SPEI</div>
                <div className="text-lg font-black text-purple-400 font-mono">
                  {formatCurrency(dailyTransferSales)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Depósitos y pagos móviles
                </div>
              </div>

              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 space-y-1">
                <div className="text-[11px] font-bold text-slate-300 uppercase">4. Crédito / Fiado</div>
                <div className="text-lg font-black text-amber-400 font-mono">
                  {formatCurrency(dailyCreditSales)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Cargado a cuentas de clientes
                </div>
              </div>

            </div>
          </div>

          {/* Two Columns: Hourly Activity Chart + Top Daily Products */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Hourly Sales Activity */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Afluencia y Ventas por Hora del Día
                </h3>
                <span className="text-[11px] text-slate-600 font-medium">08:00 a 22:00 hrs</span>
              </div>

              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-15 gap-1 items-end h-36 border-b border-slate-200 pb-2 px-1">
                  {dailyHourlyData.map((hd, idx) => {
                    const heightPct = Math.round((hd.amount / maxHourlyAmount) * 100);
                    const hasSales = hd.amount > 0;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group relative">
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap transition-opacity z-10 shadow-md">
                          {hd.hour}: {formatCurrency(hd.amount)} ({hd.count} v.)
                        </div>
                        
                        <div
                          className={`w-full rounded-t transition-all ${
                            hasSales ? 'bg-teal-600 group-hover:bg-teal-500' : 'bg-slate-100'
                          }`}
                          style={{ height: `${Math.max(4, heightPct)}%` }}
                        />
                        <span className="text-[9px] text-slate-500 font-mono">
                          {hd.hour.slice(0, 2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-[10px] text-slate-500 font-medium">
                  Pasa el cursor sobre las barras para ver monto exacto y cantidad de tickets en cada hora.
                </div>
              </div>
            </div>

            {/* Top Products Today */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-teal-600" />
                  Líderes de Venta de Hoy
                </h3>
                <span className="text-[11px] text-slate-600 font-medium">Más despachados</span>
              </div>

              <div className="space-y-3">
                {dailyTopProducts.map((p, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-900 truncate max-w-[200px]">
                        {idx + 1}. {p.name}
                      </span>
                      <span className="text-teal-700 font-bold whitespace-nowrap">
                        {p.quantity} un. ({formatCurrency(p.revenue)})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full"
                        style={{ width: `${Math.round((p.quantity / (dailyTopProducts[0]?.quantity || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}

                {dailyTopProducts.length === 0 && (
                  <div className="py-8 text-center text-slate-500 text-xs font-medium">
                    No hay ventas registradas en la fecha seleccionada.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. TAB: VENTAS SEMANALES (ESTA SEMANA / DÍA A DÍA / COMPARATIVA)      */}
      {/* ===================================================================== */}
      {activeTab === 'weekly' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {/* Weekly Date Controller Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftWeek(-1)}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const d = new Date();
                  const day = d.getDay();
                  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                  setSelectedWeekDate(new Date(d.setDate(diff)));
                }}
                className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Esta Semana
              </button>

              <button
                onClick={() => shiftWeek(1)}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-800 font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>
                Semana del {weekRange.start.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} al {weekRange.end.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportWeeklyExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Excel Semanal</span>
              </button>
            </div>

          </div>

          {/* Weekly 4 Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Total Sales in Week */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">Ventas de la Semana</span>
                <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(weeklyTotalSales)}
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100 flex justify-between">
                <span>Tickets: <strong>{weeklySales.length}</strong></span>
                <span>Promedio diario: <strong>{formatCurrency(weeklyDailyAverage)}</strong></span>
              </div>
            </div>

            {/* Weekly Gross Profit */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">Ganancia Semanal</span>
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {formatCurrency(weeklyGrossProfit)}
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100 flex justify-between">
                <span>Margen: <strong className="text-emerald-800 font-bold">{weeklyMargin}%</strong></span>
                <span>Costo: {formatCurrency(weeklyTotalCost)}</span>
              </div>
            </div>

            {/* Best Sales Day in Week */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">Día Más Fuerte</span>
                <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-purple-700">
                {bestWeeklyDay?.amount > 0 ? bestWeeklyDay.dayName : 'Sin ventas'}
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100">
                <span>{bestWeeklyDay?.amount > 0 ? formatCurrency(bestWeeklyDay.amount) : '$0.00'}</span>
              </div>
            </div>

            {/* Ventas en Efectivo de la Semana */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">Ventas en Efectivo</span>
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {formatCurrency(weeklySales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0))}
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100">
                <span>{weeklySales.filter(s => s.paymentMethod === 'cash').length} tickets cobrados en efectivo</span>
              </div>
            </div>

          </div>

          {/* Weekly Interactive Bar Chart (Lunes a Domingo) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Comportamiento de Ventas Día por Día (Lunes a Domingo)
              </h3>
              <span className="text-xs text-slate-600 font-medium">Comparativa semanal</span>
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 border-b border-slate-200 pb-3 pt-6">
              {weeklyDayBreakdown.map((d, idx) => {
                const heightPct = Math.round((d.amount / maxWeeklyDayAmount) * 100);
                const hasSales = d.amount > 0;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group relative">
                    {/* Amount label above bar */}
                    {hasSales && (
                      <span className="text-[10px] font-black text-slate-800 font-mono">
                        {formatCurrency(d.amount)}
                      </span>
                    )}

                    <div
                      className={`w-full rounded-t transition-all ${
                        hasSales ? 'bg-teal-600 group-hover:bg-teal-500' : 'bg-slate-100'
                      }`}
                      style={{ height: `${Math.max(6, heightPct)}%` }}
                    />
                    
                    <div className="text-center">
                      <div className="text-xs font-bold text-slate-900">{d.dayName.slice(0, 3)}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{d.dateStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Breakdown Table for Days of the Week */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-left text-slate-900">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Día</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Tickets</th>
                    <th className="py-2.5 px-3">Contado</th>
                    <th className="py-2.5 px-3">Crédito</th>
                    <th className="py-2.5 px-3 text-right">Total del Día</th>
                    <th className="py-2.5 px-3 text-right">% Semanal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyDayBreakdown.map((d, idx) => {
                    const pct = weeklyTotalSales > 0 ? ((d.amount / weeklyTotalSales) * 100).toFixed(1) : '0';
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{d.dayName}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{d.dateStr}</td>
                        <td className="py-2.5 px-3 font-semibold">{d.count} ventas</td>
                        <td className="py-2.5 px-3 text-emerald-800 font-medium">{formatCurrency(d.cash)}</td>
                        <td className="py-2.5 px-3 text-amber-800 font-medium">{formatCurrency(d.credit)}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 text-right font-mono">{formatCurrency(d.amount)}</td>
                        <td className="py-2.5 px-3 text-right text-teal-800 font-bold">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Top Selling Products in Week */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600" />
                Medicamentos Más Vendidos en la Semana
              </h3>
              <span className="text-[11px] text-slate-600 font-medium">Top 8 productos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {weeklyTopProducts.map((p, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">{idx + 1}. {p.name}</div>
                  <div className="text-sm font-black text-teal-700 font-mono">{formatCurrency(p.revenue)}</div>
                  <div className="text-[11px] text-slate-600 font-medium">{p.quantity} unidades despachadas</div>
                </div>
              ))}
              {weeklyTopProducts.length === 0 && (
                <div className="col-span-full py-6 text-center text-slate-500 text-xs">
                  Sin ventas registradas en esta semana.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. TAB: VENTAS MENSUALES (ESTE MES / MESES / AUDITORÍA CONTABLE)      */}
      {/* ===================================================================== */}
      {activeTab === 'monthly' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {/* Monthly Month/Year Controller Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 rounded-lg border border-slate-300 p-1">
                <Calendar className="w-4 h-4 text-slate-500 ml-2" />
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 py-1 px-2 focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 py-1 px-2 border-l border-slate-300 focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map(yr => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setSelectedMonth(today.getMonth());
                  setSelectedYear(today.getFullYear());
                }}
                className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Mes Actual
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-800 font-bold">
              Informe Mensual: {MONTH_NAMES[selectedMonth]} {selectedYear}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportMonthlyExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Excel Mensual</span>
              </button>

              <button
                onClick={handleExportMonthlyPDF}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span className="text-white">PDF Mensual</span>
              </button>
            </div>

          </div>

          {/* Primary Monthly KPI Grid (6 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            
            {/* Total Sales */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Ventas Totales del Mes</span>
                <span className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(monthlyTotalSales)}
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100 font-medium">
                <span>Contado: {formatCurrency(monthlyCashSales)}</span>
                <span>Crédito: {formatCurrency(monthlyCreditSales)}</span>
              </div>
            </div>

            {/* Gross Profit & Margin */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Ganancia Bruta Estimada</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {formatCurrency(monthlyGrossProfit)}
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100 font-medium">
                <span>Margen: <strong className="text-emerald-800 font-bold">{monthlyMargin}%</strong></span>
                <span>Costo merc.: {formatCurrency(monthlyTotalCost)}</span>
              </div>
            </div>

            {/* Abonos Cobrados */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Cobranza de Deudas (Abonos)</span>
                <span className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-teal-700 font-mono">
                {formatCurrency(monthlyCollectedDebt)}
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100 font-medium">
                <span>Recibos: {monthlyPayments.length} abonos</span>
                <span className="text-amber-700 font-bold">Cartera: {formatCurrency(totalActiveDebt)}</span>
              </div>
            </div>

            {/* Entradas / Compras */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Compras a Proveedores</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-blue-700 font-mono">
                {formatCurrency(monthlyEntriesAmount)}
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100 font-medium">
                <span>Movimientos: {monthlyMovements.filter(m => m.type === 'entry').length}</span>
                <span>Inv. al costo: {formatCurrency(currentInventoryCostValue)}</span>
              </div>
            </div>

            {/* Salidas / Mermas / Caducidades */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Mermas y Caducidades</span>
                <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <AlertOctagon className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-rose-700 font-mono">
                {formatCurrency(monthlyExitsLosses)}
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100 font-medium">
                <span>Bajas: {monthlyMovements.filter(m => m.type === 'exit').length}</span>
                <span>Pérdida asumida</span>
              </div>
            </div>

            {/* Cartera de Deudores Activa */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Cartera Total por Cobrar</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {formatCurrency(totalActiveDebt)}
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100 font-medium">
                <span>Deudores: {customers.filter(c => c.currentDebt > 0).length} clientes</span>
                <span>Total clientes: {customers.length}</span>
              </div>
            </div>

          </div>

          {/* Monthly Weeks Breakdown Bar Graph */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Distribución de Ventas por Semanas del Mes
              </h3>
              <span className="text-xs text-slate-600 font-medium">{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
            </div>

            <div className="grid grid-cols-5 gap-3 items-end h-36 border-b border-slate-200 pb-3 pt-4">
              {monthlyWeeksBreakdown.map((w, idx) => {
                const heightPct = Math.round((w.amount / maxMonthlyWeekAmount) * 100);
                const hasSales = w.amount > 0;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    {hasSales && (
                      <span className="text-[10px] font-black text-slate-800 font-mono">
                        {formatCurrency(w.amount)}
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t transition-all ${
                        hasSales ? 'bg-teal-600 group-hover:bg-teal-500' : 'bg-slate-100'
                      }`}
                      style={{ height: `${Math.max(6, heightPct)}%` }}
                    />
                    <div className="text-center">
                      <div className="text-xs font-bold text-slate-900">{w.weekLabel}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{w.count} tickets</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two Columns: Top 10 Medicamentos + Desglose por Categoría */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Top 10 Medicamentos Más Vendidos */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-teal-600" />
                  Medicamentos Más Vendidos en {MONTH_NAMES[selectedMonth]} {selectedYear}
                </h3>
                <span className="text-[11px] text-slate-600 font-medium">Por unidades</span>
              </div>

              <div className="space-y-3">
                {monthlyTopProducts.map((p, idx) => {
                  const pct = ((p.quantity / maxMonthlySoldQty) * 100).toFixed(0);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-900 truncate max-w-[240px]">
                          {idx + 1}. {p.name}
                        </span>
                        <span className="text-teal-700 font-bold whitespace-nowrap font-mono">
                          {p.quantity} un. ({formatCurrency(p.revenue)})
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {monthlyTopProducts.length === 0 && (
                  <div className="py-8 text-center text-slate-500 text-xs font-medium">
                    No hay ventas registradas en {MONTH_NAMES[selectedMonth]} {selectedYear}.
                  </div>
                )}
              </div>
            </div>

            {/* Desglose por Categoría */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-teal-600" />
                  Ventas por Categoría Farmacéutica
                </h3>
                <span className="text-[11px] text-slate-600 font-medium">Monto total</span>
              </div>

              <div className="space-y-2.5">
                {salesByCategory.map((c, idx) => {
                  const pct = monthlyTotalSales > 0 ? ((c.amount / monthlyTotalSales) * 100).toFixed(1) : '0';
                  return (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                        <span className="font-semibold text-slate-900">{c.category}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-bold text-slate-900">{formatCurrency(c.amount)}</span>
                        <span className="text-[10px] text-slate-600 ml-2 font-medium">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}

                {salesByCategory.length === 0 && (
                  <div className="py-8 text-center text-slate-500 text-xs font-medium">
                    Sin datos de categorías en este período.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. TAB: RANGO LIBRE PERSONALIZADO                                     */}
      {/* ===================================================================== */}
      {activeTab === 'custom' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Desde:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Hasta:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="text-xs font-bold text-slate-700">
              Ventas en Rango: <span className="text-teal-700 font-mono">{formatCurrency(customTotalSales)}</span> ({customSales.length} ventas)
            </div>
          </div>

          {/* 3 Metric Cards for Custom Range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="text-xs font-bold uppercase text-slate-600">Total Facturado en Rango</div>
              <div className="text-2xl font-black text-slate-900 font-mono">{formatCurrency(customTotalSales)}</div>
              <div className="text-[11px] text-slate-600 font-medium">{customSales.length} transacciones registradas</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="text-xs font-bold uppercase text-slate-600">Ganancia Bruta en Rango</div>
              <div className="text-2xl font-black text-emerald-700 font-mono">{formatCurrency(customGrossProfit)}</div>
              <div className="text-[11px] text-slate-600 font-medium">Margen: {customTotalSales > 0 ? ((customGrossProfit/customTotalSales)*100).toFixed(1) : 0}%</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="text-xs font-bold uppercase text-slate-600">Costo de Mercancía</div>
              <div className="text-2xl font-black text-blue-700 font-mono">{formatCurrency(customTotalCost)}</div>
              <div className="text-[11px] text-slate-600 font-medium">Inversión en stock vendido</div>
            </div>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. COMMON SALES LOG TABLE (WITH SEARCH & TICKET RE-PRINT)             */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Registro de Ventas ({activeDisplaySales.length} {activeDisplaySales.length === 1 ? 'venta' : 'ventas'})
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {activeTab === 'daily' && `Ventas del ${selectedDayDate.toLocaleDateString('es-MX')}`}
                {activeTab === 'weekly' && `Ventas del ${weekRange.start.toLocaleDateString('es-MX')} al ${weekRange.end.toLocaleDateString('es-MX')}`}
                {activeTab === 'monthly' && `Ventas de ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                {activeTab === 'custom' && `Ventas del ${customStartDate} al ${customEndDate}`}
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por folio, cliente, producto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-900">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Folio / Fecha</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Medicamentos Vendidos</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Subtotal</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeDisplaySales.map(s => {
                const isCancelled = s.status === 'cancelled' || s.status === 'refunded';
                return (
                  <tr key={s.id} className={`transition-colors ${isCancelled ? 'bg-rose-50/60 opacity-80' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-4">
                      <span className={`font-bold font-mono ${isCancelled ? 'line-through text-rose-800' : 'text-slate-900'}`}>{s.folio}</span>
                      <div className="text-[10px] text-slate-500 font-medium">{formatDateTime(s.date)}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {s.customerName || 'Público General'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 max-w-xs sm:max-w-sm">
                        {s.items.map((it, idx) => (
                          <div key={idx} className={`text-[11px] ${isCancelled ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                            <strong className="text-slate-900">{it.quantity}x</strong> {it.productName} ({formatCurrency(it.subtotal)})
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.isCredit
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : s.paymentMethod === 'cash'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : s.paymentMethod === 'card'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-purple-100 text-purple-900 border border-purple-300'
                        }`}
                      >
                        {s.isCredit ? 'CRÉDITO' : s.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isCancelled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300" title={`Motivo: ${s.cancelledReason || 'Cancelado'}`}>
                          <AlertTriangle className="w-3 h-3" />
                          CANCELADA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          COMPLETADA
                        </span>
                      )}
                    </td>
                    <td className={`py-3 px-4 font-mono ${isCancelled ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {formatCurrency(s.subtotal)}
                    </td>
                    <td className={`py-3 px-4 font-black font-mono text-sm ${isCancelled ? 'line-through text-rose-700' : 'text-slate-900'}`}>
                      {formatCurrency(s.total)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onOpenSaleTicket && (
                          <button
                            onClick={() => onOpenSaleTicket(s)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer border border-slate-300"
                            title="Ver / Imprimir Ticket"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ticket</span>
                          </button>
                        )}
                        {onCancelSale && !isCancelled && (
                          <button
                            onClick={() => onCancelSale(s)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Cancelar Venta / Devolución"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Cancelar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {activeDisplaySales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs font-medium">
                    No se encontraron ventas para este período o criterio de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
