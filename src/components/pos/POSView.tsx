import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Product, 
  Customer, 
  CartItem, 
  Sale, 
  PaymentMethod, 
  PharmacySettings,
  ProductDepartment 
} from '../../types/pharmacy';
import { formatCurrency, generateFolio } from '../../utils/formatters';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  ArrowRightLeft, 
  UserCheck, 
  AlertCircle, 
  ShieldAlert, 
  Sparkles, 
  Percent, 
  UserPlus, 
  X,
  Pill,
  CheckCircle,
  CheckCircle2,
  Clock,
  Camera,
  Barcode,
  Scan,
  ScanLine,
  Volume2,
  Coffee,
  Candy,
  Sparkle,
  Zap,
  ShoppingBag,
  SlidersHorizontal,
  ChevronUp,
  Receipt,
  Calculator,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';

interface POSViewProps {
  products: Product[];
  customers: Customer[];
  settings: PharmacySettings;
  salesCount: number;
  onCompleteSale: (sale: Sale, updatedProducts: Product[], updatedCustomer?: Customer) => void;
  onOpenCustomerRegistration: () => void;
  onOpenPhotoSearch?: () => void;
  onOpenCashCut?: () => void;
  onOpenCancelSale?: () => void;
  initialProductToAdd?: Product | null;
  onClearInitialProduct?: () => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  customers,
  settings,
  salesCount,
  onCompleteSale,
  onOpenCustomerRegistration,
  onOpenPhotoSearch,
  onOpenCashCut,
  onOpenCancelSale,
  initialProductToAdd,
  onClearInitialProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [prescriptionVerified, setPrescriptionVerified] = useState<boolean>(false);
  const [sellerName, setSellerName] = useState<string>('Cajero / Farmacéutico');
  const [saleNotes, setSaleNotes] = useState<string>('');

  // Mobile cart drawer state
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Barcode Camera Scanner Modal State
  const [isCameraBarcodeOpen, setIsCameraBarcodeOpen] = useState(false);

  // Real-time Barcode Scan Toast Feedback
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    subtitle?: string;
  } | null>(null);
  const scanFeedbackTimerRef = useRef<any>(null);

  // Tender Modal States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Audio synthesizer helper for authentic barcode scanner beeps
  const playScanBeep = (type: 'success' | 'error' | 'warning' = 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      // audio context blocked or unsupported
    }
  };

  const triggerScanFeedback = (type: 'success' | 'error' | 'warning', title: string, subtitle?: string) => {
    if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current);
    setScanFeedback({ type, title, subtitle });
    scanFeedbackTimerRef.current = setTimeout(() => {
      setScanFeedback(null);
    }, 2800);
  };

  // Focus search bar on load
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Handle external product addition (e.g. from photo scan)
  useEffect(() => {
    if (initialProductToAdd) {
      addToCart(initialProductToAdd);
      playScanBeep('success');
      triggerScanFeedback(
        'success',
        `+1 ${initialProductToAdd.name} agregado al carrito`,
        formatCurrency(initialProductToAdd.sellingPrice)
      );
      if (onClearInitialProduct) onClearInitialProduct();
    }
  }, [initialProductToAdd]);

  // Department Filters Definition
  const departments = [
    { id: 'todos', label: 'Todos', icon: '🌟', count: products.length },
    { id: 'farmacia', label: 'Farmacia & Medicinas', icon: '💊', count: products.filter(p => p.department === 'farmacia' || !p.department).length },
    { id: 'bebidas', label: 'Aguas y Refrescos', icon: '🥤', count: products.filter(p => p.department === 'bebidas' || p.category.includes('Bebida')).length },
    { id: 'dulces', label: 'Dulces y Golosinas', icon: '🍬', count: products.filter(p => p.department === 'dulces' || p.category.includes('Dulce')).length },
    { id: 'botanas', label: 'Botanas y Snacks', icon: '🥨', count: products.filter(p => p.department === 'botanas' || p.category.includes('Botana')).length },
    { id: 'higiene', label: 'Cuidado e Higiene', icon: '🧴', count: products.filter(p => p.department === 'higiene' || p.category.includes('Higiene')).length },
  ];

  // Quick Access Popular Items (Convenience & Fast sell)
  const quickItems = useMemo(() => {
    // Pick top recognizable fast items
    const picks = ['prod-1', 'prod-6', 'prod-bev-1', 'prod-bev-2', 'prod-dul-1', 'prod-dul-3', 'prod-dul-5', 'prod-bot-1'];
    return products.filter(p => picks.includes(p.id)).slice(0, 8);
  }, [products]);

  // Categories within current department
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (selectedDepartment === 'todos' || p.department === selectedDepartment || (selectedDepartment === 'farmacia' && !p.department)) {
        if (p.category) set.add(p.category);
      }
    });
    return ['Todos', ...Array.from(set)];
  }, [products, selectedDepartment]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return products.filter(p => {
      // Department filter
      if (selectedDepartment !== 'todos') {
        const pDept = p.department || (p.category.includes('Bebida') ? 'bebidas' : p.category.includes('Dulce') ? 'dulces' : p.category.includes('Botana') ? 'botanas' : p.category.includes('Higiene') ? 'higiene' : 'farmacia');
        if (pDept !== selectedDepartment) return false;
      }

      // Sub-category filter
      if (selectedCategory !== 'Todos' && p.category !== selectedCategory) {
        return false;
      }

      if (!q) return true;

      return (
        p.name.toLowerCase().includes(q) ||
        (p.genericName && p.genericName.toLowerCase().includes(q)) ||
        (p.activeIngredient && p.activeIngredient.toLowerCase().includes(q)) ||
        p.barcode.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.batchNumber && p.batchNumber.toLowerCase().includes(q))
      );
    });
  }, [products, searchTerm, selectedDepartment, selectedCategory]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Cart calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  const discountTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const itemDisc = (item.unitPrice * item.quantity * item.discountPercentage) / 100;
      return sum + itemDisc;
    }, 0);
  }, [cart]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountTotal);
  }, [subtotal, discountTotal]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const requiresPrescription = useMemo(() => {
    return cart.some(item => item.product.prescriptionRequired);
  }, [cart]);

  // Add to cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`El artículo "${product.name}" no tiene existencias disponibles en inventario.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`No puedes agregar más unidades de las disponibles en inventario (${product.stock}).`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice * (1 - item.discountPercentage / 100),
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.sellingPrice,
            discountPercentage: 0,
            subtotal: product.sellingPrice,
          },
        ];
      }
    });
  };

  // Core Barcode / SKU Scanner Handler
  const handleBarcodeScanned = (scannedCode: string) => {
    const raw = scannedCode.trim();
    if (!raw) return;

    const lower = raw.toLowerCase();

    // 1. Check exact barcode match (Priority #1)
    let matchedProduct = products.find(
      p => p.barcode && p.barcode.trim().toLowerCase() === lower
    );

    // 2. Check exact internal product code match (Priority #2)
    if (!matchedProduct) {
      matchedProduct = products.find(
        p => p.code && p.code.trim().toLowerCase() === lower
      );
    }

    // 3. Check exact id match
    if (!matchedProduct) {
      matchedProduct = products.find(p => p.id.toLowerCase() === lower);
    }

    // 4. Check exact name match
    if (!matchedProduct) {
      matchedProduct = products.find(
        p => p.name.trim().toLowerCase() === lower
      );
    }

    // 5. If current filtered list only has 1 match and input is non-trivial
    if (!matchedProduct && filteredProducts.length === 1 && raw.length >= 2) {
      matchedProduct = filteredProducts[0];
    }

    if (!matchedProduct) {
      playScanBeep('error');
      triggerScanFeedback(
        'error',
        `Código "${raw}" no encontrado`,
        'No coincide con ningún medicamento o producto en el catálogo.'
      );
      setSearchTerm('');
      searchInputRef.current?.focus();
      return;
    }

    // Check stock
    if (matchedProduct.stock <= 0) {
      playScanBeep('error');
      triggerScanFeedback(
        'error',
        `"${matchedProduct.name}" agotado`,
        'Este artículo no tiene existencias disponibles en inventario.'
      );
      setSearchTerm('');
      searchInputRef.current?.focus();
      return;
    }

    // Check if max units already in cart
    const inCart = cart.find(item => item.product.id === matchedProduct!.id);
    const currentQty = inCart ? inCart.quantity : 0;

    if (currentQty >= matchedProduct.stock) {
      playScanBeep('warning');
      triggerScanFeedback(
        'warning',
        `Límite alcanzado: ${matchedProduct.name}`,
        `Ya tienes todas las unidades disponibles (${matchedProduct.stock}) en el carrito.`
      );
      setSearchTerm('');
      searchInputRef.current?.focus();
      return;
    }

    // Add to cart!
    addToCart(matchedProduct);
    playScanBeep('success');
    const newQty = currentQty + 1;
    triggerScanFeedback(
      'success',
      `+1 ${matchedProduct.name} (${newQty} en carrito)`,
      `${formatCurrency(matchedProduct.sellingPrice)} • Stock restante: ${matchedProduct.stock - newQty}`
    );

    setSearchTerm('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);
  };

  // Global Hardware Barcode Scanner Listener (captures rapid key sequences ending in Enter from USB/BT guns)
  useEffect(() => {
    let keyBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if checkout or camera scanner is open
      if (isCheckoutOpen || isCameraBarcodeOpen) return;

      const target = e.target as HTMLElement;
      const isInsideInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      // If user is focused on the search input, Enter is handled directly by onKeyDown
      if (target === searchInputRef.current) {
        return;
      }

      // If typing in another input (e.g. notes or customer select), ignore
      if (isInsideInput) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Reset buffer if delay between keystrokes > 70ms (indicates human typing, not a barcode gun)
      if (timeDiff > 70) {
        keyBuffer = '';
      }

      if (e.key === 'Enter') {
        if (keyBuffer.length >= 3) {
          e.preventDefault();
          handleBarcodeScanned(keyBuffer);
          keyBuffer = '';
        }
      } else if (e.key.length === 1) {
        keyBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isCheckoutOpen, isCameraBarcodeOpen, products, cart, filteredProducts]);

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) {
              alert(`Solo hay ${item.product.stock} unidades en existencia.`);
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.unitPrice * (1 - item.discountPercentage / 100),
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateDiscount = (productId: string, discountPercentage: number) => {
    const clamped = Math.min(100, Math.max(0, discountPercentage));
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? {
              ...item,
              discountPercentage: clamped,
              subtotal: item.quantity * item.unitPrice * (1 - clamped / 100),
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('¿Desea vaciar todos los productos del carrito actual?')) {
      setCart([]);
      setSelectedCustomerId('');
      setPrescriptionVerified(false);
      setSaleNotes('');
    }
  };

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;

    if (requiresPrescription && !prescriptionVerified) {
      alert('Atención: El carrito contiene medicamentos que requieren receta médica. Marque la casilla de verificación de receta para continuar.');
      return;
    }

    setPaymentMethod('cash');
    setCashReceived(total.toString());
    setCheckoutError('');
    setIsCheckoutOpen(true);
  };

  // Process and finalize sale
  const handleFinalizeSale = () => {
    setCheckoutError('');

    if (paymentMethod === 'credit') {
      if (!selectedCustomer) {
        setCheckoutError('Debe seleccionar un cliente registrado con cuenta abierta para otorgar crédito / fiado.');
        return;
      }

      const availableCredit = selectedCustomer.creditLimit - selectedCustomer.currentDebt;
      if (!settings.allowDebtExceedLimit && total > availableCredit) {
        setCheckoutError(`La venta (${formatCurrency(total)}) excede el límite de crédito disponible del cliente (${formatCurrency(availableCredit)}). Límite total: ${formatCurrency(selectedCustomer.creditLimit)}.`);
        return;
      }
    }

    const cashNum = parseFloat(cashReceived) || 0;
    if (paymentMethod === 'cash' && cashNum < total) {
      setCheckoutError(`El monto en efectivo ingresado (${formatCurrency(cashNum)}) es menor que el total a pagar (${formatCurrency(total)}).`);
      return;
    }

    const folio = generateFolio('V', salesCount + 1);
    const change = paymentMethod === 'cash' ? Math.max(0, cashNum - total) : 0;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      folio,
      date: new Date().toISOString(),
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        presentation: item.product.presentation,
        genericName: item.product.genericName,
        batchNumber: item.product.batchNumber,
        quantity: item.quantity,
        costPrice: item.product.costPrice,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        subtotal: item.subtotal,
      })),
      subtotal,
      discountTotal,
      total,
      paymentMethod,
      amountPaid: paymentMethod === 'cash' ? cashNum : total,
      change,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      seller: sellerName || 'Farmacéutico en Turno',
      notes: saleNotes.trim() || undefined,
      isCredit: paymentMethod === 'credit',
      isSettled: paymentMethod !== 'credit',
    };

    // Deduct stock from products
    const updatedProducts = products.map(prod => {
      const soldItem = cart.find(ci => ci.product.id === prod.id);
      if (soldItem) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - soldItem.quantity),
        };
      }
      return prod;
    });

    // Update customer debt if credit sale
    let updatedCustomer: Customer | undefined = undefined;
    if (paymentMethod === 'credit' && selectedCustomer) {
      updatedCustomer = {
        ...selectedCustomer,
        currentDebt: selectedCustomer.currentDebt + total,
      };
    }

    // Trigger celebration effect
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#0d9488', '#10b981', '#06b6d4'],
    });

    onCompleteSale(newSale, updatedProducts, updatedCustomer);

    // Reset local POS state
    setCart([]);
    setSelectedCustomerId('');
    setPrescriptionVerified(false);
    setSaleNotes('');
    setIsCheckoutOpen(false);
    setIsMobileCartOpen(false);
  };

  return (
    <div className="container-fluid px-2 sm:px-4 py-3 max-w-7xl mx-auto space-y-3 relative">
      
      {/* Floating Barcode Scan Toast Feedback Notification */}
      {scanFeedback && (
        <div
          className={`fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-bounce transition-all duration-300 max-w-md w-[92vw] ${
            scanFeedback.type === 'success'
              ? 'bg-slate-900 text-white border-emerald-500 ring-2 ring-emerald-500/20'
              : scanFeedback.type === 'warning'
              ? 'bg-amber-950 text-white border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-rose-950 text-white border-rose-500 ring-2 ring-rose-500/20'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${
            scanFeedback.type === 'success' 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : scanFeedback.type === 'warning' 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'bg-rose-500/20 text-rose-400'
          }`}>
            {scanFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs sm:text-sm text-white truncate">
              {scanFeedback.title}
            </div>
            {scanFeedback.subtitle && (
              <div className="text-[11px] text-slate-300 truncate">
                {scanFeedback.subtitle}
              </div>
            )}
          </div>
          <button
            onClick={() => setScanFeedback(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Action Top Bar (Bootstrap Responsive Card) */}
      <div className="card shadow-xs border-0 bg-white rounded-2xl p-3 sm:p-4">
        <div className="row g-2 align-items-center">
          
          {/* Main Search Input with Barcode & Scanner Trigger */}
          <div className="col-12 col-md-7 col-lg-8">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchTerm.trim()) {
                      handleBarcodeScanned(searchTerm);
                    }
                  }
                }}
                placeholder="Escanea código de barras con pistola láser o busca medicamento..."
                className="w-full pl-10 pr-28 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 font-medium"
              />
              
              {/* Actions inside search bar */}
              <div className="absolute right-2 flex items-center gap-1">
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Camera Barcode Scanner trigger */}
                <button
                  type="button"
                  onClick={() => setIsCameraBarcodeOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold border border-teal-200 cursor-pointer transition-colors"
                  title="Escanear código de barras con la cámara del dispositivo"
                >
                  <Barcode className="w-3.5 h-3.5 text-teal-600" />
                  <span className="hidden sm:inline">Lector</span>
                </button>
              </div>
            </div>

            {/* Quick Barcode Scanner Active Indicator */}
            <div className="flex items-center gap-2 mt-1.5 px-1">
              <div className="flex items-center gap-1 text-[11px] text-teal-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Lector de código activo:</span>
              </div>
              <span className="text-[10px] text-slate-500 truncate">
                Pasa la pistola láser o presiona Enter para sumar al carrito al instante.
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="col-12 col-md-5 col-lg-4 flex items-center justify-between sm:justify-end gap-1.5 flex-wrap">
            {onOpenCashCut && (
              <button
                type="button"
                onClick={onOpenCashCut}
                className="flex-1 sm:flex-initial btn btn-dark btn-sm bg-slate-900 hover:bg-slate-800 text-white rounded-xl d-flex align-items-center justify-content-center gap-1 text-xs py-2 px-2 sm:px-2.5 cursor-pointer shadow-xs border border-slate-700 font-semibold"
                title="Arqueo de caja, entradas/salidas de efectivo y corte de turno"
              >
                <Calculator className="w-3.5 h-3.5 text-teal-400" />
                <span>Corte</span>
              </button>
            )}

            <button
              onClick={onOpenCustomerRegistration}
              className="flex-1 sm:flex-initial btn btn-outline-secondary btn-sm rounded-xl d-flex align-items-center justify-content-center gap-1 text-xs py-2 px-2 sm:px-2.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-teal-600" />
              <span>+ Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCameraBarcodeOpen(true)}
              className="flex-1 sm:flex-initial btn btn-teal btn-sm bg-teal-600 hover:bg-teal-500 text-white rounded-xl d-flex align-items-center justify-content-center gap-1.5 text-xs py-2 px-2.5 sm:px-3 cursor-pointer shadow-xs font-bold"
            >
              <Barcode className="w-4 h-4 text-white" />
              <span>Lector Cámara</span>
            </button>

            {onOpenPhotoSearch && (
              <button
                onClick={onOpenPhotoSearch}
                className="flex-1 sm:flex-initial btn btn-outline-teal btn-sm text-teal-700 border-teal-300 hover:bg-teal-50 rounded-xl d-flex align-items-center justify-content-center gap-1.5 text-xs py-2 px-2 sm:px-2.5 cursor-pointer"
                title="Búsqueda visual de empaques por foto"
              >
                <Camera className="w-3.5 h-3.5 text-teal-600" />
                <span>Foto</span>
              </button>
            )}
          </div>

        </div>

        {/* Department Filters Bar (Farmacia, Bebidas, Dulces, Botanas, Higiene) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 mt-2 border-t border-slate-100  scrollbar-none">
          {departments.map((dept) => {
            const isSelected = selectedDepartment === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => {
                  setSelectedDepartment(dept.id);
                  setSelectedCategory('Todos');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100  text-slate-600  hover:bg-slate-200 '
                }`}
              >
                <span>{dept.icon}</span>
                <span>{dept.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-teal-700 text-white' : 'bg-slate-200  text-slate-500'
                }`}>
                  {dept.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-category pills if available */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1 overflow-x-auto pt-2 scrollbar-none text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">
              Categoría:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-white   font-bold'
                    : 'bg-transparent text-slate-500 hover:bg-slate-100 '
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Quick Access Popular Convenience Bar (Aguas, Refrescos, Dulces más vendidos) */}
      <div className="card shadow-xs border-0 bg-slate-50/80  rounded-2xl p-2.5 sm:p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Acceso Rápido (1 Clic sin código de barras):
          </span>
          <span className="text-[10px] text-teal-600 font-medium">
            Toque para agregar al carrito
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {quickItems.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white  border border-slate-200  hover:border-teal-500  rounded-xl p-2 flex items-center gap-2 shrink-0 transition-all hover:shadow-xs cursor-pointer group active:scale-95"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-50  text-teal-700  flex items-center justify-center font-bold text-xs shrink-0">
                {item.category.includes('Bebida') ? '🥤' : item.category.includes('Dulce') ? '🍬' : item.category.includes('Botana') ? '🥨' : '💊'}
              </div>
              <div className="text-left min-w-[90px] max-w-[130px]">
                <div className="text-xs font-bold text-slate-800  truncate group-hover:text-teal-600">
                  {item.name}
                </div>
                <div className="text-[10px] font-bold text-teal-600  font-mono">
                  {formatCurrency(item.sellingPrice)}
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-slate-100  flex items-center justify-center text-slate-500 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Plus className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column POS Layout (Left: Products Grid | Right: Cart & Checkout) */}
      <div className="row g-3">
        
        {/* Left Column: Products Catalog (Fluid Grid) */}
        <div className="col-12 col-lg-7 col-xl-8">
          <div className="card shadow-xs border-0 bg-white  rounded-2xl p-3 sm:p-4 min-h-[500px]">
            
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-800  flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-teal-600" />
                Catálogo de Artículos ({filteredProducts.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                {selectedDepartment === 'todos' ? 'Todos los departamentos' : selectedDepartment.toUpperCase()}
              </span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <Pill className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700">
                  {products.length === 0 
                    ? 'Catálogo en blanco (0 productos)' 
                    : `No se encontraron productos con "${searchTerm}"`}
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {products.length === 0
                    ? 'Tu sistema está limpio y listo para recibir tus medicamentos y productos. Ve a la pestaña Inventario para registrar tus artículos o escanéalos.'
                    : 'Verifica la ortografía, cambia de departamento o utiliza la cámara/escáner de código de barras.'}
                </p>
                {onOpenPhotoSearch && products.length > 0 && (
                  <button
                    onClick={onOpenPhotoSearch}
                    className="btn btn-outline-teal btn-sm rounded-xl inline-flex items-center gap-1.5 text-xs text-teal-600 border-teal-500 font-bold px-3 py-2 cursor-pointer mt-2"
                  >
                    <Camera className="w-4 h-4" />
                    Buscar con Cámara o Foto
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                  const inCartItem = cart.find(ci => ci.product.id === product.id);

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      className={`relative p-3 rounded-xl border transition-all flex flex-col justify-between select-none ${
                        isOutOfStock
                          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-teal-500 hover:shadow-md cursor-pointer group active:scale-[0.98]'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {product.code}
                        </span>

                        <div className="flex items-center gap-1">
                          {product.prescriptionRequired && (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded border border-rose-200">
                              Receta
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-800'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {isOutOfStock ? 'Agotado' : `${product.stock} disp.`}
                          </span>
                        </div>
                      </div>

                      {/* Product Name & Description */}
                      <div className="mb-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug group-hover:text-teal-600 line-clamp-2">
                          {product.name}
                        </h4>
                        <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 font-medium">
                          {product.description || product.presentation}
                        </p>
                      </div>

                      {/* Bottom Price & Add Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                        <div>
                          <span className="text-xs text-slate-500 block -mb-0.5 font-medium">Precio:</span>
                          <span className="text-sm sm:text-base font-black text-teal-700 font-mono">
                            {formatCurrency(product.sellingPrice)}
                          </span>
                        </div>

                        {inCartItem ? (
                          <div className="flex items-center gap-1 bg-teal-600 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-xs">
                            <CheckCircle className="w-3 h-3 text-white" />
                            <span className="text-white">{inCartItem.quantity} en carrito</span>
                          </div>
                        ) : (
                          <button
                            disabled={isOutOfStock}
                            className="p-2 rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Cart, Customer Credit & Checkout (Hidden on mobile, toggled via floating drawer) */}
        <div className="col-12 col-lg-5 col-xl-4 d-none d-lg-block">
          
          <div className="card shadow-sm border-0 bg-white rounded-2xl overflow-hidden sticky top-20">
            
            {/* Cart Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-sm text-white">Carrito de Cobro</h3>
                <span className="badge bg-teal-600 text-white rounded-pill text-[10px]">
                  {totalItemsCount} arts.
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-300 hover:text-rose-100 font-semibold cursor-pointer"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Customer Selector for Credit / Fiado */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  Cliente / Crédito (Fiado)
                </span>
                <button
                  onClick={onOpenCustomerRegistration}
                  className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer"
                >
                  + Alta
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="form-select form-select-sm rounded-xl text-xs bg-white border-slate-300 text-slate-900 font-semibold"
              >
                <option value="">Público General (Venta de Contado)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.currentDebt > 0 ? `(Debe: ${formatCurrency(c.currentDebt)})` : '(Al corriente)'}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold text-teal-950">{selectedCustomer.name}</div>
                    <div className="text-[10px] text-teal-800 font-medium">
                      Límite crédito: {formatCurrency(selectedCustomer.creditLimit)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-600 font-medium">Deuda actual:</div>
                    <div className={`font-bold ${selectedCustomer.currentDebt > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatCurrency(selectedCustomer.currentDebt)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 p-2">
              {cart.map(item => (
                <div key={item.product.id} className="py-2 px-2 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {item.product.name}
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium">
                      {formatCurrency(item.unitPrice)} c/u
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 hover:bg-white rounded text-slate-800 font-bold cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold px-1.5 text-slate-900 min-w-[18px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 hover:bg-white rounded text-slate-800 font-bold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-[65px]">
                    <div className="text-xs font-black text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-12 text-center text-slate-600 text-xs">
                  <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  El carrito está vacío. Haz clic en cualquier artículo para agregarlo.
                </div>
              )}
            </div>

            {/* Prescription Check Notice */}
            {requiresPrescription && cart.length > 0 && (
              <div className="p-2.5 bg-amber-50 border-t border-b border-amber-200 text-xs">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prescriptionVerified}
                    onChange={e => setPrescriptionVerified(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="text-amber-900 text-[11px] font-medium leading-tight">
                    <strong className="text-rose-700">Requiere Receta:</strong> Verifiqué la receta médica del paciente.
                  </span>
                </label>
              </div>
            )}

            {/* Totals & Tender Trigger */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2.5">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Total a Pagar:</span>
                  <span className="text-teal-700 font-mono text-lg font-black">{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={handleOpenCheckout}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Banknote className="w-4 h-4 text-white" />
                <span className="text-white">Proceder al Cobro ({formatCurrency(total)})</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Floating Mobile Cart Pill (Smartphone Optimized) */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-20 inset-x-2 sm:inset-x-3 z-30 d-block d-lg-none">
          <div className="bg-slate-900 text-white rounded-2xl p-2.5 sm:p-3 shadow-2xl border border-slate-700 flex items-center justify-between gap-2 sm:gap-3 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-600 flex items-center justify-center font-bold text-white shadow-xs">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs text-slate-300 font-medium">
                  {totalItemsCount} {totalItemsCount === 1 ? 'producto' : 'productos'}
                </div>
                <div className="text-sm sm:text-base font-black text-teal-400 font-mono leading-none">
                  {formatCurrency(total)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setIsMobileCartOpen(true)}
                className="px-2.5 sm:px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Ver Carrito
              </button>

              <button
                onClick={handleOpenCheckout}
                className="px-3.5 sm:px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
              >
                <span>Cobrar</span>
                <ChevronUp className="w-4 h-4 rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Slide-Up Cart Modal */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-xs d-block d-lg-none">
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 w-full max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            {/* Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-sm text-white">Carrito de Cobro ({totalItemsCount})</h3>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Customer Select */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Cliente / Cuenta</span>
                <button
                  onClick={() => {
                    setIsMobileCartOpen(false);
                    onOpenCustomerRegistration();
                  }}
                  className="text-teal-600 font-bold text-[11px]"
                >
                  + Alta Nuevo
                </button>
              </div>
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="form-select form-select-sm rounded-xl text-xs bg-white border-slate-300 text-slate-900 font-semibold"
              >
                <option value="">Público General</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {cart.map(item => (
                <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {item.product.name}
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium">
                      {formatCurrency(item.unitPrice)} c/u
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-800 font-bold border border-slate-300"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-xs px-2 text-slate-900 min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-800 font-bold border border-slate-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-[65px]">
                    <div className="font-bold text-xs text-teal-700 font-mono">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
              <div className="flex justify-between items-center text-base font-black text-slate-900">
                <span>Total a Pagar:</span>
                <span className="text-teal-700 text-lg font-mono font-black">{formatCurrency(total)}</span>
              </div>

              <button
                onClick={handleOpenCheckout}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl shadow-lg cursor-pointer"
              >
                Cobrar ({formatCurrency(total)})
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Tender / Checkout Modal (Bootstrap Modal Styling) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-400" />
                  <span>Cobro de Venta #{salesCount + 1}</span>
                </h3>
                <p className="text-xs text-slate-400">Seleccione el método de pago</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Total Display Banner */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
                <span className="text-xs text-teal-800 font-bold uppercase tracking-wider block">
                  Monto Total a Cobrar
                </span>
                <span className="text-3xl sm:text-4xl font-black text-teal-700 font-mono">
                  {formatCurrency(total)}
                </span>
              </div>

              {checkoutError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Payment Method Selector (Tabs) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Método de Pago:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cash' as PaymentMethod, label: 'Efectivo', icon: Banknote },
                    { id: 'card' as PaymentMethod, label: 'Tarjeta', icon: CreditCard },
                    { id: 'transfer' as PaymentMethod, label: 'Transfer.', icon: ArrowRightLeft },
                    { id: 'credit' as PaymentMethod, label: 'Crédito / Fiado', icon: UserCheck },
                  ].map(m => {
                    const Icon = m.icon;
                    const isSel = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setPaymentMethod(m.id);
                          setCheckoutError('');
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          isSel
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-bold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Change Calculator */}
              {paymentMethod === 'cash' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900">
                      Efectivo Recibido:
                    </label>
                    {parseFloat(cashReceived) >= total && (
                      <span className="text-xs font-black text-emerald-700">
                        Cambio: {formatCurrency(parseFloat(cashReceived) - total)}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-600">$</span>
                    <input
                      type="number"
                      step="any"
                      min={total}
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Quick Denomination Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-600 font-bold mr-1">Rápido:</span>
                    {[total, 50, 100, 200, 500].filter(v => v >= total).slice(0, 5).map(amt => (
                      <button
                        key={amt}
                        onClick={() => setCashReceived(amt.toString())}
                        className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 hover:bg-teal-50 hover:border-teal-400 cursor-pointer"
                      >
                        {formatCurrency(amt)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Credit Notice */}
              {paymentMethod === 'credit' && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>Venta a Crédito / Cuenta por Cobrar</span>
                  </div>
                  {selectedCustomer ? (
                    <div className="text-xs text-amber-900 font-medium">
                      Se cargará a la cuenta de: <strong>{selectedCustomer.name}</strong>.<br />
                      Deuda actual: <strong>{formatCurrency(selectedCustomer.currentDebt)}</strong> → Nueva deuda: <strong>{formatCurrency(selectedCustomer.currentDebt + total)}</strong>
                    </div>
                  ) : (
                    <div className="text-xs text-rose-700 font-bold">
                      ⚠️ Atención: Debe seleccionar un cliente registrado para poder registrar esta venta como fiada / crédito.
                    </div>
                  )}
                </div>
              )}

              {/* Seller / Pharmacist in Turn */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900">
                  Atendido por:
                </label>
                <input
                  type="text"
                  value={sellerName}
                  onChange={e => setSellerName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizeSale}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4 text-white" />
                <span className="text-white">Confirmar e Imprimir Cobro</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Barcode Camera Scanner Modal */}
      {isCameraBarcodeOpen && (
        <CameraBarcodeScannerModal
          isOpen={isCameraBarcodeOpen}
          onClose={() => setIsCameraBarcodeOpen(false)}
          products={products}
          onBarcodeScanned={(code) => {
            handleBarcodeScanned(code);
          }}
        />
      )}

    </div>
  );
};
