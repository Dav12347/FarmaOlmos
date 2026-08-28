import React, { useState, useMemo } from 'react';
import { Product } from '../../types/pharmacy';
import { formatCurrency } from '../../utils/formatters';
import { 
  DollarSign, 
  Percent, 
  Search, 
  Check, 
  X, 
  Sliders, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  RotateCcw, 
  Filter, 
  Save, 
  TrendingUp, 
  CheckSquare, 
  Square,
  AlertCircle,
  HelpCircle,
  Pill
} from 'lucide-react';

interface QuickPriceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSaveMultipleProducts: (updatedProducts: Product[]) => void;
}

interface ProductPriceRow {
  product: Product;
  selected: boolean;
  originalCost: number;
  originalPrice: number;
  newCost: number;
  newPrice: number;
  marginPercent: number; // Markup % over cost: ((Price - Cost) / Cost) * 100
  isModified: boolean;
}

export const QuickPriceEditorModal: React.FC<QuickPriceEditorModalProps> = ({
  isOpen,
  onClose,
  products,
  onSaveMultipleProducts,
}) => {
  if (!isOpen) return null;

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterView, setFilterView] = useState<'all' | 'modified' | 'low_margin' | 'no_cost'>('all');

  // Bulk Settings
  const [bulkMarginPercent, setBulkMarginPercent] = useState<number>(35);
  const [bulkCalculationMode, setBulkCalculationMode] = useState<'markup' | 'gross_margin'>('markup');
  const [bulkRounding, setBulkRounding] = useState<'none' | 'integer' | 'half' | 'ninety'>('none');
  const [bulkScope, setBulkScope] = useState<'selected' | 'all' | 'filtered' | 'category'>('selected');
  const [bulkTargetCategory, setBulkTargetCategory] = useState<string>('all');

  // State of all rows
  const [rows, setRows] = useState<ProductPriceRow[]>(() => {
    return products.map(p => {
      const cost = p.costPrice || 0;
      const price = p.sellingPrice || 0;
      const initialMargin = cost > 0 ? Math.round(((price - cost) / cost) * 100) : (price > 0 ? 100 : 35);
      return {
        product: p,
        selected: false,
        originalCost: cost,
        originalPrice: price,
        newCost: cost,
        newPrice: price,
        marginPercent: initialMargin,
        isModified: false,
      };
    });
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Helper to round price according to selected rule
  const applyRounding = (price: number, rule: 'none' | 'integer' | 'half' | 'ninety'): number => {
    if (rule === 'none') {
      return Math.round(price * 100) / 100;
    }
    if (rule === 'integer') {
      return Math.ceil(price);
    }
    if (rule === 'half') {
      // Round to nearest .50 (e.g., 12.20 -> 12.50, 12.60 -> 13.00)
      return Math.ceil(price * 2) / 2;
    }
    if (rule === 'ninety') {
      // Psychological price ending in .90 or .99 (e.g. 14.20 -> 14.90)
      const floor = Math.floor(price);
      return floor + 0.90;
    }
    return Math.round(price * 100) / 100;
  };

  // Helper to calculate price from cost and margin
  const calculatePrice = (cost: number, marginPct: number, mode: 'markup' | 'gross_margin', rounding: 'none' | 'integer' | 'half' | 'ninety'): number => {
    if (cost <= 0) return 0;
    let calculated = 0;
    if (mode === 'markup') {
      // Markup: Price = Cost * (1 + margin / 100)
      calculated = cost * (1 + marginPct / 100);
    } else {
      // Gross margin: Price = Cost / (1 - margin / 100)
      const marginDecimal = marginPct / 100;
      if (marginDecimal >= 1) return cost * 2;
      calculated = cost / (1 - marginDecimal);
    }
    return applyRounding(calculated, rounding);
  };

  // Helper to calculate margin from cost and price
  const calculateMargin = (cost: number, price: number): number => {
    if (cost <= 0) return 0;
    return Math.round(((price - cost) / cost) * 100);
  };

  // Update a single row's cost
  const handleCostChange = (indexInRows: number, newCost: number) => {
    setRows(prev => {
      const copy = [...prev];
      const row = { ...copy[indexInRows] };
      row.newCost = Math.max(0, newCost);
      // Recalculate price using the row's current margin %
      row.newPrice = calculatePrice(row.newCost, row.marginPercent, 'markup', 'none');
      row.isModified = row.newPrice !== row.originalPrice || row.newCost !== row.originalCost;
      copy[indexInRows] = row;
      return copy;
    });
  };

  // Update a single row's margin %
  const handleMarginChange = (indexInRows: number, newMargin: number) => {
    setRows(prev => {
      const copy = [...prev];
      const row = { ...copy[indexInRows] };
      row.marginPercent = newMargin;
      row.newPrice = calculatePrice(row.newCost, newMargin, 'markup', bulkRounding);
      row.isModified = row.newPrice !== row.originalPrice || row.newCost !== row.originalCost;
      copy[indexInRows] = row;
      return copy;
    });
  };

  // Update a single row's selling price
  const handlePriceChange = (indexInRows: number, newPrice: number) => {
    setRows(prev => {
      const copy = [...prev];
      const row = { ...copy[indexInRows] };
      row.newPrice = Math.max(0, newPrice);
      row.marginPercent = calculateMargin(row.newCost, row.newPrice);
      row.isModified = row.newPrice !== row.originalPrice || row.newCost !== row.originalCost;
      copy[indexInRows] = row;
      return copy;
    });
  };

  // Quick preset button on a single row
  const handleApplyPresetToRow = (indexInRows: number, presetMargin: number) => {
    handleMarginChange(indexInRows, presetMargin);
  };

  // Reset a row to original values
  const handleResetRow = (indexInRows: number) => {
    setRows(prev => {
      const copy = [...prev];
      const row = { ...copy[indexInRows] };
      row.newCost = row.originalCost;
      row.newPrice = row.originalPrice;
      row.marginPercent = calculateMargin(row.originalCost, row.originalPrice);
      row.isModified = false;
      copy[indexInRows] = row;
      return copy;
    });
  };

  // Bulk Apply Margin % to Target Rows
  const handleApplyBulkMargin = () => {
    setRows(prev => {
      return prev.map(row => {
        let shouldApply = false;
        if (bulkScope === 'all') {
          shouldApply = true;
        } else if (bulkScope === 'selected') {
          shouldApply = row.selected;
        } else if (bulkScope === 'category') {
          shouldApply = bulkTargetCategory === 'all' || row.product.category === bulkTargetCategory;
        } else if (bulkScope === 'filtered') {
          const matchesSearch = !searchTerm || 
            row.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (row.product.code && row.product.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (row.product.activeIngredient && row.product.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesCategory = selectedCategory === 'all' || row.product.category === selectedCategory;
          shouldApply = matchesSearch && matchesCategory;
        }

        if (!shouldApply) return row;

        const newPrice = calculatePrice(row.newCost, bulkMarginPercent, bulkCalculationMode, bulkRounding);
        const newMargin = bulkCalculationMode === 'markup' 
          ? bulkMarginPercent 
          : calculateMargin(row.newCost, newPrice);

        return {
          ...row,
          marginPercent: newMargin,
          newPrice,
          isModified: newPrice !== row.originalPrice || row.newCost !== row.originalCost,
        };
      });
    });
  };

  // Selection handlers
  const handleToggleSelectAll = (select: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, selected: select })));
  };

  const handleToggleRowSelect = (indexInRows: number) => {
    setRows(prev => {
      const copy = [...prev];
      copy[indexInRows] = { ...copy[indexInRows], selected: !copy[indexInRows].selected };
      return copy;
    });
  };

  // Filtered rows for the table view
  const filteredRowsWithIndices = useMemo(() => {
    return rows.map((row, index) => ({ row, originalIndex: index })).filter(({ row }) => {
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = row.product.name.toLowerCase().includes(query);
        const matchesCode = row.product.code?.toLowerCase().includes(query) || row.product.barcode?.toLowerCase().includes(query);
        const matchesActive = row.product.activeIngredient?.toLowerCase().includes(query);
        const matchesCat = row.product.category?.toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesActive && !matchesCat) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && row.product.category !== selectedCategory) {
        return false;
      }

      // Filter view
      if (filterView === 'modified' && !row.isModified) return false;
      if (filterView === 'low_margin' && row.marginPercent >= 25) return false;
      if (filterView === 'no_cost' && row.newCost > 0) return false;

      return true;
    });
  }, [rows, searchTerm, selectedCategory, filterView]);

  const modifiedCount = useMemo(() => rows.filter(r => r.isModified).length, [rows]);
  const selectedCount = useMemo(() => rows.filter(r => r.selected).length, [rows]);

  // Save all modified products
  const handleSaveAll = () => {
    const modifiedProducts = rows
      .filter(r => r.isModified)
      .map(r => ({
        ...r.product,
        costPrice: r.newCost,
        sellingPrice: r.newPrice,
      }));

    if (modifiedProducts.length === 0) {
      onClose();
      return;
    }

    onSaveMultipleProducts(modifiedProducts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Ajuste Rápido de Precios y Margen de Ganancia</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  {products.length} medicamentos
                </span>
              </h2>
              <p className="text-xs text-teal-100/80">
                Calcula y actualiza precios unitarios por porcentaje de ganancia individual o masivamente con 1 clic
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-teal-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar: Bulk Profit Margin Generator */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Aplicador Masivo de Margen
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-medium">Modificados:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${modifiedCount > 0 ? 'bg-amber-100 text-amber-800 font-mono' : 'bg-slate-200 text-slate-600'}`}>
                {modifiedCount} de {products.length}
              </span>
            </div>
          </div>

          {/* Bulk Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
            
            {/* Margen % Input & Quick Pills */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Porcentaje de Ganancia (%):</span>
                <span className="text-[10px] text-teal-700 font-semibold">{bulkMarginPercent}% s/ Costo</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative w-24">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="1"
                    value={bulkMarginPercent}
                    onChange={e => setBulkMarginPercent(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3 pr-6 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-sm text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
                <div className="flex items-center gap-1 flex-1 flex-wrap">
                  {[25, 30, 35, 40, 50, 60, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setBulkMarginPercent(pct)}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        bulkMarginPercent === pct
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scope / Destino */}
            <div className="lg:col-span-3 space-y-1.5">
              <label className="font-bold text-slate-700">
                Aplicar porcentaje a:
              </label>
              <select
                value={bulkScope}
                onChange={e => setBulkScope(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="selected">Solo seleccionados ({selectedCount})</option>
                <option value="filtered">Filtrados en vista actual ({filteredRowsWithIndices.length})</option>
                <option value="category">Por Categoría específica</option>
                <option value="all">Todo el Catálogo ({products.length})</option>
              </select>
            </div>

            {/* If Category is selected */}
            {bulkScope === 'category' && (
              <div className="lg:col-span-2 space-y-1.5">
                <label className="font-bold text-slate-700">Categoría:</label>
                <select
                  value={bulkTargetCategory}
                  onChange={e => setBulkTargetCategory(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">Todas las Categorías</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Redondeo */}
            <div className={`${bulkScope === 'category' ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-1.5`}>
              <label className="font-bold text-slate-700">Regla de Redondeo:</label>
              <select
                value={bulkRounding}
                onChange={e => setBulkRounding(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="none">Sin redondeo (Centavos exactos)</option>
                <option value="integer">Enteros hacia arriba ($12.00)</option>
                <option value="half">A los $0.50 más cercanos ($12.50)</option>
                <option value="ninety">Terminación .90 ($12.90)</option>
              </select>
            </div>

            {/* Action Button */}
            <div className="lg:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleApplyBulkMargin}
                className="w-full py-2 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
              >
                <Sparkles className="w-4 h-4 text-teal-300" />
                <span>Aplicar a Lista</span>
              </button>
            </div>

          </div>
        </div>

        {/* Search, Filter Tabs & Selection Bar */}
        <div className="p-3 sm:px-5 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, código, activo, categoría..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Categorías ({categories.length})</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterView('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                filterView === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Todos ({rows.length})
            </button>
            <button
              onClick={() => setFilterView('modified')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                filterView === 'modified' ? 'bg-amber-600 text-white' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              Modificados ({modifiedCount})
            </button>
            <button
              onClick={() => setFilterView('low_margin')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                filterView === 'low_margin' ? 'bg-rose-600 text-white' : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              Margen &lt;25%
            </button>
            <button
              onClick={() => setFilterView('no_cost')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                filterView === 'no_cost' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Sin Costo ($0)
            </button>
          </div>

        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] sticky top-0 z-10 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedCount > 0 && selectedCount === rows.length}
                    onChange={e => handleToggleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3 min-w-[200px]">Medicamento / Catálogo</th>
                <th className="py-2.5 px-3 w-28">Costo Compra ($)</th>
                <th className="py-2.5 px-3 w-48">% Margen Ganancia</th>
                <th className="py-2.5 px-3 w-32">Precio Venta ($)</th>
                <th className="py-2.5 px-3 w-28 text-right">Ganancia Neta</th>
                <th className="py-2.5 px-3 w-20 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRowsWithIndices.map(({ row, originalIndex }) => {
                const netProfit = Math.max(0, row.newPrice - row.newCost);
                const priceDiff = row.newPrice - row.originalPrice;
                const isModified = row.isModified;

                return (
                  <tr 
                    key={row.product.id}
                    className={`hover:bg-slate-50 transition-colors ${isModified ? 'bg-amber-50/40 font-medium' : ''} ${row.selected ? 'bg-teal-50/50' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => handleToggleRowSelect(originalIndex)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </td>

                    {/* Medicamento & Código */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-md bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 mt-0.5">
                          <Pill className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{row.product.name}</span>
                            {row.product.prescriptionRequired && (
                              <span className="text-[9px] px-1 py-0.2 bg-rose-100 text-rose-700 rounded font-bold">
                                Receta
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap">
                            <span className="font-mono bg-slate-100 px-1 rounded">{row.product.code}</span>
                            <span>{row.product.category}</span>
                            {row.product.activeIngredient && (
                              <span className="text-slate-400">({row.product.activeIngredient})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Costo Compra (Editable) */}
                    <td className="py-2.5 px-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={row.newCost}
                          onChange={e => handleCostChange(originalIndex, parseFloat(e.target.value) || 0)}
                          className="w-full pl-5 pr-2 py-1 bg-white border border-slate-300 rounded-md font-mono font-bold text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 shadow-2xs"
                        />
                      </div>
                    </td>

                    {/* % Margen Ganancia & Fast Presets */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-16 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="500"
                            step="1"
                            value={row.marginPercent}
                            onChange={e => handleMarginChange(originalIndex, parseFloat(e.target.value) || 0)}
                            className="w-full pl-2 pr-5 py-1 bg-white border border-slate-300 rounded-md font-mono font-bold text-teal-800 text-xs focus:ring-2 focus:ring-teal-500 shadow-2xs text-center"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">%</span>
                        </div>

                        {/* Quick preset buttons */}
                        <div className="flex items-center gap-0.5">
                          {[30, 40, 50].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => handleApplyPresetToRow(originalIndex, pct)}
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                                row.marginPercent === pct
                                  ? 'bg-teal-700 text-white'
                                  : 'bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600'
                              }`}
                            >
                              +{pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Precio Venta (Editable) */}
                    <td className="py-2.5 px-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-teal-700 font-bold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={row.newPrice}
                          onChange={e => handlePriceChange(originalIndex, parseFloat(e.target.value) || 0)}
                          className="w-full pl-5 pr-2 py-1 bg-white border-2 border-teal-500/60 rounded-md font-mono font-bold text-teal-900 text-xs focus:ring-2 focus:ring-teal-600 shadow-2xs"
                        />
                      </div>
                      {priceDiff !== 0 && (
                        <div className={`text-[10px] mt-0.5 font-bold flex items-center gap-0.5 ${priceDiff > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {priceDiff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{priceDiff > 0 ? `+${formatCurrency(priceDiff)}` : formatCurrency(priceDiff)}</span>
                        </div>
                      )}
                    </td>

                    {/* Ganancia Neta por Pieza */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="font-bold text-emerald-700 font-mono">
                        +{formatCurrency(netProfit)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {row.marginPercent}% ganancia
                      </div>
                    </td>

                    {/* Estado & Botón Restablecer */}
                    <td className="py-2.5 px-3 text-center">
                      {isModified ? (
                        <button
                          type="button"
                          onClick={() => handleResetRow(originalIndex)}
                          title="Restablecer a valores originales"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-mono">—</span>
                      )}
                    </td>

                  </tr>
                );
              })}

              {filteredRowsWithIndices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron medicamentos con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer & Bulk Save */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-medium">
              Mostrando <strong className="text-slate-900">{filteredRowsWithIndices.length}</strong> de <strong className="text-slate-900">{products.length}</strong> medicamentos
            </span>
            {modifiedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300/60 flex items-center gap-1 text-[11px]">
                <TrendingUp className="w-3.5 h-3.5" />
                {modifiedCount} con cambios pendientes por guardar
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={modifiedCount === 0}
              className={`px-5 py-2 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                modifiedCount > 0
                  ? 'bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 text-white shadow-teal-900/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Guardar {modifiedCount > 0 ? `(${modifiedCount}) Cambios` : 'Precios'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
