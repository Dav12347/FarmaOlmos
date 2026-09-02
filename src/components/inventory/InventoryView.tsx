import React, { useState, useMemo } from 'react';
import { Product, PharmacySettings, InventoryMovement } from '../../types/pharmacy';
import { 
  formatCurrency, 
  formatDate, 
  getExpiryStatus, 
  fileToBase64,
  generateFolio
} from '../../utils/formatters';
import { 
  Search, 
  Plus, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  X, 
  Upload, 
  Image as ImageIcon,
  Check,
  Pill,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Layers,
  Calendar,
  DollarSign,
  AlertOctagon,
  Percent,
  CheckCircle2,
  Tag,
  FileText,
  Download,
  MessageSquare,
  Send,
  Phone,
  Sliders
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SupplierTicketModal } from './SupplierTicketModal';
import { StockEntryExcelModal } from '../movements/StockEntryExcelModal';
import { ExportInventoryModal } from './ExportInventoryModal';
import { WhatsAppAlertModal } from './WhatsAppAlertModal';
import { QuickPriceEditorModal } from './QuickPriceEditorModal';
import { Customer, Sale, DebtPayment, CashCut } from '../../types/pharmacy';
import { 
  analyzeInventoryForAlerts, 
  buildSingleProductWhatsAppMessage, 
  buildWhatsAppStockAlertMessage, 
  formatPhoneDisplay, 
  openWhatsAppNotification 
} from '../../utils/whatsappAlerts';

interface InventoryViewProps {
  products: Product[];
  settings: PharmacySettings;
  onSaveProduct: (product: Product) => void;
  onSaveMultipleProducts?: (products: Product[]) => void;
  onDeleteProduct: (productId: string) => void;
  onRegisterMovement?: (movement: InventoryMovement, updatedProducts: Product[]) => void;
  onSaveSettings?: (newSettings: PharmacySettings) => void;
  movementsCount?: number;
  onOpenPhotoSearch?: () => void;
  customers?: Customer[];
  sales?: Sale[];
  movements?: InventoryMovement[];
  payments?: DebtPayment[];
  cashCuts?: CashCut[];
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  settings,
  onSaveProduct,
  onSaveMultipleProducts,
  onDeleteProduct,
  onRegisterMovement,
  onSaveSettings,
  movementsCount = 0,
  onOpenPhotoSearch,
  customers = [],
  sales = [],
  movements = [],
  payments = [],
  cashCuts = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low_stock' | 'critical_expiry' | 'warning_expiry' | 'expired' | 'prescription'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick Stock Movement Modal State (Entrada / Salida rápida)
  const [isStockMovementModalOpen, setIsStockMovementModalOpen] = useState(false);
  const [movementActionType, setMovementActionType] = useState<'entry' | 'exit'>('entry');
  const [targetProductForMovement, setTargetProductForMovement] = useState<Product | null>(null);
  const [movementQuantity, setMovementQuantity] = useState<number>(1);
  const [movementReason, setMovementReason] = useState<string>('compra');
  const [movementSupplierOrDestination, setMovementSupplierOrDestination] = useState<string>('');
  const [movementReference, setMovementReference] = useState<string>('');
  const [movementCostPrice, setMovementCostPrice] = useState<number>(0);
  const [movementBatch, setMovementBatch] = useState<string>('');
  const [movementExpiry, setMovementExpiry] = useState<string>('');
  const [movementNotes, setMovementNotes] = useState<string>('');

  // Expiration Alert Center Modal State
  const [isExpiryCenterOpen, setIsExpiryCenterOpen] = useState(false);

  // Supplier Ticket / PDF Restock Modal State
  const [isSupplierTicketModalOpen, setIsSupplierTicketModalOpen] = useState(false);

  // Stock Entry from Excel Modal State
  const [isStockEntryExcelModalOpen, setIsStockEntryExcelModalOpen] = useState(false);

  // Export / Backup Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Quick Price & Profit Margin Modal State
  const [isQuickPriceModalOpen, setIsQuickPriceModalOpen] = useState(false);

  // Inline Fast Price Edit Mode directly in table
  const [isInlinePriceEditMode, setIsInlinePriceEditMode] = useState(false);
  const [inlinePriceDrafts, setInlinePriceDrafts] = useState<Record<string, { costPrice: number; sellingPrice: number; marginPercent: number; saved?: boolean }>>({});
  
  // Profit Margin in Product Form Modal
  const [formMarginPercent, setFormMarginPercent] = useState<number>(35);

  // WhatsApp Alert Modal & Inline State
  const [isWhatsAppAlertModalOpen, setIsWhatsAppAlertModalOpen] = useState(false);
  const [whatsAppPhoneInput, setWhatsAppPhoneInput] = useState<string>(
    settings.whatsappAlertPhone || '5573501782'
  );
  const [whatsAppCountryCodeInput, setWhatsAppCountryCodeInput] = useState<string>(
    settings.whatsappCountryCode || '52'
  );
  const [isPhoneSavedSuccess, setIsPhoneSavedSuccess] = useState(false);

  // Keep phone input synced if settings change
  React.useEffect(() => {
    if (settings.whatsappAlertPhone) {
      setWhatsAppPhoneInput(settings.whatsappAlertPhone);
    }
    if (settings.whatsappCountryCode) {
      setWhatsAppCountryCodeInput(settings.whatsappCountryCode);
    }
  }, [settings.whatsappAlertPhone, settings.whatsappCountryCode]);

  // Inventory analysis for WhatsApp alerts
  const whatsAppAlertsData = useMemo(() => {
    return analyzeInventoryForAlerts(products, {
      expiryDays: settings.whatsappAlertExpiryDays || 30,
      includeOutOfStock: settings.whatsappAlertIncludeOutOfStock ?? true,
      includeLowStock: settings.whatsappAlertIncludeLowStock ?? true,
      includeExpired: settings.whatsappAlertIncludeExpired ?? true,
      includeExpiring: settings.whatsappAlertIncludeExpiring ?? true,
    });
  }, [products, settings]);

  const handleSaveInlineWhatsAppPhone = () => {
    const cleanNumber = whatsAppPhoneInput.replace(/\D/g, '') || '5573501782';
    const updatedSettings: PharmacySettings = {
      ...settings,
      whatsappAlertPhone: cleanNumber,
      whatsappCountryCode: whatsAppCountryCodeInput.trim() || '52',
      whatsappAlertsEnabled: true,
    };
    if (onSaveSettings) {
      onSaveSettings(updatedSettings);
    }
    setIsPhoneSavedSuccess(true);
    setTimeout(() => setIsPhoneSavedSuccess(false), 2500);
  };

  const handleSendAllWhatsAppAlerts = () => {
    const phoneToUse = whatsAppPhoneInput.replace(/\D/g, '') || settings.whatsappAlertPhone || '5573501782';
    const message = buildWhatsAppStockAlertMessage(products, settings, {
      expiryDays: settings.whatsappAlertExpiryDays || 30,
    });
    openWhatsAppNotification(phoneToUse, message, whatsAppCountryCodeInput || '52');
  };

  const handleSendSingleProductWhatsApp = (prod: Product, type: 'stock' | 'expiry') => {
    const phoneToUse = whatsAppPhoneInput.replace(/\D/g, '') || settings.whatsappAlertPhone || '5573501782';
    const message = buildSingleProductWhatsAppMessage(prod, settings, type);
    openWhatsAppNotification(phoneToUse, message, whatsAppCountryCodeInput || '52');
  };

  // Form State for Add/Edit Product
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '',
    barcode: '',
    name: '',
    description: '',
    unitOfMeasure: 'Pieza',
    genericName: '',
    activeIngredient: '',
    presentation: '',
    category: 'Analgésicos',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    minStock: 5,
    batchNumber: '',
    expirationDate: '',
    prescriptionRequired: false,
    location: '',
    photoUrl: '',
    notes: '',
  });

  const categories = useMemo(() => {
    return [
      'Analgésicos', 
      'Antibióticos', 
      'Gastrointestinal', 
      'Respiratorio', 
      'Dermatología', 
      'Material de Curación', 
      'Suplementos', 
      'Infantil', 
      'Cardiovascular',
      'Bebidas y Aguas',
      'Dulces y Golosinas',
      'Botanas y Snacks',
      'Cuidado e Higiene',
      'Otro'
    ];
  }, []);

  const unitsOfMeasure = useMemo(() => {
    return [
      'Pieza',
      'Caja',
      'Botella',
      'Lata',
      'Bolsa',
      'Paquete',
      'Barra',
      'Frasco',
      'Tabletas',
      'Blíster',
      'Ampolleta',
      'Mililitros (ml)',
      'Gramos (g)',
      'Sobres',
      'Tubo / Pomada',
      'Kilogramos (kg)'
    ];
  }, []);

  // Expiration analytics
  const expiredProducts = useMemo(() => {
    return products.filter(p => getExpiryStatus(p.expirationDate).status === 'expired');
  }, [products]);

  const criticalExpiryProducts = useMemo(() => {
    return products.filter(p => getExpiryStatus(p.expirationDate).status === 'critical');
  }, [products]);

  const warningExpiryProducts = useMemo(() => {
    return products.filter(p => getExpiryStatus(p.expirationDate).status === 'warning');
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return products.filter(p => {
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

      // Filter pills
      if (filterType === 'low_stock' && p.stock > p.minStock) return false;
      if (filterType === 'prescription' && !p.prescriptionRequired) return false;
      
      const expStatus = getExpiryStatus(p.expirationDate);
      if (filterType === 'expired' && expStatus.status !== 'expired') return false;
      if (filterType === 'critical_expiry' && expStatus.status !== 'critical') return false;
      if (filterType === 'warning_expiry' && expStatus.status !== 'warning') return false;

      if (!q) return true;

      return (
        (p.code && p.code.toLowerCase().includes(q)) ||
        p.barcode.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.genericName && p.genericName.toLowerCase().includes(q)) ||
        (p.activeIngredient && p.activeIngredient.toLowerCase().includes(q)) ||
        (p.unitOfMeasure && p.unitOfMeasure.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.batchNumber && p.batchNumber.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q))
      );
    });
  }, [products, searchTerm, filterType, selectedCategory]);

  // Bulk save products callback
  const handleBulkSaveProducts = (updatedProds: Product[]) => {
    if (onSaveMultipleProducts) {
      onSaveMultipleProducts(updatedProds);
    } else {
      updatedProds.forEach(p => onSaveProduct(p));
    }
  };

  // Inline table row price draft management
  const getRowPriceDraft = (p: Product) => {
    if (inlinePriceDrafts[p.id]) {
      return inlinePriceDrafts[p.id];
    }
    const cost = p.costPrice || 0;
    const price = p.sellingPrice || 0;
    const margin = cost > 0 ? Math.round(((price - cost) / cost) * 100) : (price > 0 ? 100 : 35);
    return { costPrice: cost, sellingPrice: price, marginPercent: margin };
  };

  const handleInlineCostChange = (p: Product, newCost: number) => {
    const draft = getRowPriceDraft(p);
    const cost = Math.max(0, newCost);
    const newPrice = Math.round(cost * (1 + draft.marginPercent / 100) * 100) / 100;
    setInlinePriceDrafts(prev => ({
      ...prev,
      [p.id]: {
        costPrice: cost,
        sellingPrice: newPrice,
        marginPercent: draft.marginPercent,
        saved: false,
      }
    }));
  };

  const handleInlineMarginChange = (p: Product, newMargin: number) => {
    const draft = getRowPriceDraft(p);
    const newPrice = Math.round(draft.costPrice * (1 + newMargin / 100) * 100) / 100;
    setInlinePriceDrafts(prev => ({
      ...prev,
      [p.id]: {
        costPrice: draft.costPrice,
        sellingPrice: newPrice,
        marginPercent: newMargin,
        saved: false,
      }
    }));
  };

  const handleInlinePriceChange = (p: Product, newPrice: number) => {
    const draft = getRowPriceDraft(p);
    const price = Math.max(0, newPrice);
    const margin = draft.costPrice > 0 ? Math.round(((price - draft.costPrice) / draft.costPrice) * 100) : 0;
    setInlinePriceDrafts(prev => ({
      ...prev,
      [p.id]: {
        costPrice: draft.costPrice,
        sellingPrice: price,
        marginPercent: margin,
        saved: false,
      }
    }));
  };

  const handleSaveInlineProductPrice = (p: Product) => {
    const draft = getRowPriceDraft(p);
    const updatedProd: Product = {
      ...p,
      costPrice: draft.costPrice,
      sellingPrice: draft.sellingPrice,
    };
    onSaveProduct(updatedProd);
    setInlinePriceDrafts(prev => ({
      ...prev,
      [p.id]: {
        ...draft,
        saved: true,
      }
    }));
    setTimeout(() => {
      setInlinePriceDrafts(prev => {
        if (!prev[p.id]) return prev;
        const copy = { ...prev };
        delete copy[p.id].saved;
        return copy;
      });
    }, 2500);
  };

  // Pricing synchronization in Product Modal
  const handleFormCostPriceChange = (newCost: number) => {
    const cost = Math.max(0, newCost);
    const calculatedPrice = Math.round(cost * (1 + formMarginPercent / 100) * 100) / 100;
    setFormData(prev => ({
      ...prev,
      costPrice: cost,
      sellingPrice: calculatedPrice,
    }));
  };

  const handleFormMarginPercentChange = (newMargin: number) => {
    setFormMarginPercent(newMargin);
    const cost = Number(formData.costPrice) || 0;
    const calculatedPrice = Math.round(cost * (1 + newMargin / 100) * 100) / 100;
    setFormData(prev => ({
      ...prev,
      sellingPrice: calculatedPrice,
    }));
  };

  const handleFormSellingPriceChange = (newPrice: number) => {
    const price = Math.max(0, newPrice);
    const cost = Number(formData.costPrice) || 0;
    const calculatedMargin = cost > 0 ? Math.round(((price - cost) / cost) * 100) : 0;
    setFormMarginPercent(calculatedMargin);
    setFormData(prev => ({
      ...prev,
      sellingPrice: price,
    }));
  };

  const openNewProductModal = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setEditingProduct(null);
    setFormMarginPercent(100);
    setFormData({
      code: `MED-${randomSuffix}`,
      barcode: `750${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name: '',
      description: '',
      unitOfMeasure: 'Caja',
      genericName: '',
      activeIngredient: '',
      presentation: 'Caja con 20 tabletas',
      category: 'Analgésicos',
      costPrice: 20,
      sellingPrice: 40,
      stock: 10,
      minStock: 5,
      batchNumber: `L-${new Date().getFullYear().toString().slice(-2)}${Math.floor(100 + Math.random() * 900)}`,
      expirationDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      prescriptionRequired: false,
      location: 'Estante A-1',
      photoUrl: '',
      notes: '',
    });
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    const cost = p.costPrice || 0;
    const price = p.sellingPrice || 0;
    const margin = cost > 0 ? Math.round(((price - cost) / cost) * 100) : 35;
    setFormMarginPercent(margin);
    setFormData({
      ...p,
      code: p.code || p.barcode || '',
      description: p.description || '',
      unitOfMeasure: p.unitOfMeasure || 'Pieza',
    });
    setIsProductModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setFormData(prev => ({ ...prev, photoUrl: base64 }));
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('El nombre del medicamento es obligatorio.');
      return;
    }
    if (!formData.barcode?.trim() && !formData.code?.trim()) {
      alert('El código único o código de barras es obligatorio.');
      return;
    }

    const uniqueCode = formData.code?.trim() || formData.barcode?.trim() || `MED-${Date.now().toString().slice(-6)}`;
    const barcodeVal = formData.barcode?.trim() || uniqueCode;

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      code: uniqueCode,
      barcode: barcodeVal,
      name: formData.name || '',
      description: formData.description || '',
      unitOfMeasure: formData.unitOfMeasure || 'Pieza',
      genericName: formData.genericName || '',
      activeIngredient: formData.activeIngredient || '',
      presentation: formData.presentation || '',
      category: formData.category || 'Otro',
      costPrice: Number(formData.costPrice) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      stock: Number(formData.stock) || 0,
      minStock: Number(formData.minStock) || 0,
      batchNumber: formData.batchNumber || '',
      expirationDate: formData.expirationDate || '',
      prescriptionRequired: !!formData.prescriptionRequired,
      location: formData.location || '',
      photoUrl: formData.photoUrl || '',
      notes: formData.notes || '',
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
    };

    onSaveProduct(newProd);
    setIsProductModalOpen(false);
  };

  // Open quick movement modal for entry or exit
  const handleOpenQuickMovement = (type: 'entry' | 'exit', product?: Product) => {
    const defaultProduct = product || products[0] || null;
    setMovementActionType(type);
    setTargetProductForMovement(defaultProduct);
    setMovementQuantity(type === 'entry' ? 10 : 1);
    setMovementReason(type === 'entry' ? 'compra' : 'caducidad');
    setMovementSupplierOrDestination(type === 'entry' ? 'Distribuidora Farmacéutica' : 'Merma / Baja Sanitaria');
    setMovementReference('');
    setMovementCostPrice(defaultProduct ? defaultProduct.costPrice : 0);
    setMovementBatch(defaultProduct?.batchNumber || '');
    setMovementExpiry(defaultProduct?.expirationDate || '');
    setMovementNotes('');
    setIsStockMovementModalOpen(true);
  };

  // Submit quick movement (Updates stock & optionally creates Kardex log)
  const handleSaveQuickMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductForMovement) {
      alert('Seleccione un producto válido.');
      return;
    }
    if (movementQuantity <= 0) {
      alert('La cantidad debe ser mayor a cero.');
      return;
    }

    if (movementActionType === 'exit' && movementQuantity > targetProductForMovement.stock) {
      alert(`No se puede dar salida a ${movementQuantity} unidades porque solo hay ${targetProductForMovement.stock} en stock.`);
      return;
    }

    const delta = movementActionType === 'entry' ? movementQuantity : -movementQuantity;
    const updatedStock = Math.max(0, targetProductForMovement.stock + delta);

    const updatedTargetProduct: Product = {
      ...targetProductForMovement,
      stock: updatedStock,
      costPrice: movementActionType === 'entry' && movementCostPrice > 0 ? movementCostPrice : targetProductForMovement.costPrice,
      batchNumber: movementActionType === 'entry' && movementBatch ? movementBatch : targetProductForMovement.batchNumber,
      expirationDate: movementActionType === 'entry' && movementExpiry ? movementExpiry : targetProductForMovement.expirationDate,
    };

    if (onRegisterMovement) {
      const folioPrefix = movementActionType === 'entry' ? 'ENT' : 'SAL';
      const newFolio = generateFolio(folioPrefix, movementsCount);
      const unitCost = movementActionType === 'entry' && movementCostPrice > 0 ? movementCostPrice : targetProductForMovement.costPrice;

      const movement: InventoryMovement = {
        id: `mov-${Date.now()}`,
        folio: newFolio,
        type: movementActionType,
        reason: movementReason as any,
        date: new Date().toISOString(),
        items: [
          {
            productId: targetProductForMovement.id,
            productName: targetProductForMovement.name,
            quantity: movementQuantity,
            costPrice: unitCost,
            subtotal: unitCost * movementQuantity,
            batchNumber: movementBatch || targetProductForMovement.batchNumber,
            expirationDate: movementExpiry || targetProductForMovement.expirationDate,
          }
        ],
        totalValue: unitCost * movementQuantity,
        supplierOrDestination: movementSupplierOrDestination,
        referenceInvoice: movementReference,
        notes: movementNotes || `${movementActionType === 'entry' ? 'Entrada' : 'Salida'} directa desde inventario`,
        registeredBy: 'Farmacéutico Responsable',
      };

      const updatedProductsList = products.map(p => p.id === updatedTargetProduct.id ? updatedTargetProduct : p);
      onRegisterMovement(movement, updatedProductsList);
    } else {
      onSaveProduct(updatedTargetProduct);
    }

    setIsStockMovementModalOpen(false);
  };

  // Quick discard/merma of expired product directly from Expiry Alert Center
  const handleQuickDiscardExpired = (p: Product) => {
    if (confirm(`¿Dar de baja total (${p.stock} unidades) de "${p.name}" por caducidad? Se registrará como salida de merma sanitaria.`)) {
      if (onRegisterMovement) {
        const movement: InventoryMovement = {
          id: `mov-${Date.now()}`,
          folio: generateFolio('SAL', movementsCount),
          type: 'exit',
          reason: 'caducidad',
          date: new Date().toISOString(),
          items: [
            {
              productId: p.id,
              productName: p.name,
              quantity: p.stock,
              costPrice: p.costPrice,
              subtotal: p.costPrice * p.stock,
              batchNumber: p.batchNumber,
              expirationDate: p.expirationDate,
            }
          ],
          totalValue: p.costPrice * p.stock,
          supplierOrDestination: 'Destrucción / Baja Sanitaria por Caducidad',
          referenceInvoice: `ACTA-CAD-${p.batchNumber || 'SIN-LOTE'}`,
          notes: `Baja automática por fecha de vencimiento alcanzada (${p.expirationDate})`,
          registeredBy: 'Farmacéutico Responsable',
        };

        const updatedProductsList = products.map(item => item.id === p.id ? { ...item, stock: 0 } : item);
        onRegisterMovement(movement, updatedProductsList);
      } else {
        onSaveProduct({ ...p, stock: 0 });
      }
    }
  };

  // Apply clearance discount to near-expiry item
  const handleApplyDiscountToNearExpiry = (p: Product, discountPct: number) => {
    const discountedPrice = Math.round(p.sellingPrice * (1 - discountPct / 100));
    const updatedProd: Product = {
      ...p,
      sellingPrice: Math.max(p.costPrice, discountedPrice),
      notes: `${p.notes ? p.notes + ' | ' : ''}Precio de remate por próxima caducidad (${discountPct}% desc)`,
    };
    onSaveProduct(updatedProd);
  };

  // Export full catalog with all requested product properties
  const handleExportCatalog = () => {
    const rows = products.map(p => {
      const exp = getExpiryStatus(p.expirationDate);
      return {
        'Código Único': p.code || p.barcode,
        'Código de Barras': p.barcode,
        'Nombre del Producto': p.name,
        'Descripción': p.description || '-',
        'Unidad de Medida': p.unitOfMeasure || 'Pieza',
        'Genérico / Sustancia': p.genericName || p.activeIngredient || '-',
        'Presentación': p.presentation,
        'Categoría': p.category,
        'Precio de Costo': p.costPrice,
        'Precio de Venta': p.sellingPrice,
        'Existencia (Stock)': p.stock,
        'Stock Mínimo': p.minStock,
        'Número de Lote': p.batchNumber || '-',
        'Fecha de Caducidad': p.expirationDate || '-',
        'Días Restantes Caducidad': exp.daysLeft === 9999 ? 'N/A' : exp.daysLeft,
        'Estado de Caducidad': exp.label,
        'Requiere Receta': p.prescriptionRequired ? 'SÍ' : 'NO',
        'Ubicación en Farmacia': p.location || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo de Medicamentos');
    XLSX.writeFile(wb, `Inventario_Farmacia_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Total valuations
  const totalValuationCost = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
  }, [products]);

  const totalValuationRetail = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.sellingPrice * p.stock), 0);
  }, [products]);

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
      {/* Top Header & Fast Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600 shrink-0" />
            <span>Sistema de Gestión de Inventario y Medicamentos</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catálogo completo con código único, unidad de medida, control de entradas, salidas por ventas/mermas y semáforo de caducidades
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Photo Search Button */}
          {onOpenPhotoSearch && (
            <button
              onClick={onOpenPhotoSearch}
              className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              title="Buscar o dar de alta mediante fotografía con cámara"
            >
              <ImageIcon className="w-4 h-4 text-teal-600" />
              <span>Foto</span>
            </button>
          )}

          {/* Quick Exit / Merma Button */}
          <button
            onClick={() => handleOpenQuickMovement('exit')}
            className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            title="Registrar salida de productos por mermas, caducidad o daños"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>- Merma</span>
          </button>

          {/* Quick Entry Button */}
          <button
            onClick={() => handleOpenQuickMovement('entry')}
            className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            title="Registrar entrada de nuevos productos o compras de stock"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>+ Entrada</span>
          </button>

          {/* Ajuste Rápido de Precios y Margen de Ganancia */}
          <button
            onClick={() => setIsQuickPriceModalOpen(true)}
            className="flex-1 sm:flex-initial px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow ring-1 ring-amber-400/30"
            title="Modificar rápidamente precios de compra y venta agregando porcentaje de ganancia individual o masivamente"
          >
            <Percent className="w-4 h-4 text-amber-200" />
            <span>💲 Precios & Margen</span>
          </button>

          {/* Surtir con Documento Escaneado / Ticket / Factura PDF */}
          <button
            onClick={() => setIsSupplierTicketModalOpen(true)}
            className="flex-1 sm:flex-initial px-3 py-2 bg-gradient-to-r from-teal-800 to-teal-900 hover:from-teal-700 hover:to-teal-800 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow ring-1 ring-teal-500/30"
            title="Escanear o subir documento/factura de proveedor (PDF o Foto) para dar de alta automáticamente con Cantidad, Unidad, Descripción, Clave, Laboratorio, Lote, Caducidad, Clave SAT y Precios"
          >
            <FileText className="w-4 h-4 text-teal-300" />
            <span>📄 Escanear Documento</span>
          </button>

          {/* Entrada Masiva desde Excel */}
          <button
            onClick={() => setIsStockEntryExcelModalOpen(true)}
            className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
            title="Cargar compras masivas desde archivo Excel (.xlsx / .csv)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>📊 Excel</span>
          </button>

          {/* WhatsApp Alert Center Button */}
          <button
            onClick={() => setIsWhatsAppAlertModalOpen(true)}
            className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow relative"
            title="Enviar advertencias a celular por WhatsApp sobre medicamentos por caducar o agotados"
          >
            <MessageSquare className="w-4 h-4 text-emerald-200" />
            <span>📲 WhatsApp</span>
            {whatsAppAlertsData.totalAlertsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-xs">
                {whatsAppAlertsData.totalAlertsCount}
              </span>
            )}
          </button>

          {/* Export Options (Excel, CSV, PDF, Update Template, Full DB) */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-2 bg-white border border-teal-300 text-teal-800 text-xs font-bold rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            title="Exportar inventario en Excel, CSV, PDF o Plantilla de Actualización"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>Exportar</span>
          </button>

          {/* New Product Registration */}
          <button
            onClick={openNewProductModal}
            className="w-full sm:w-auto px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Alta de Producto</span>
          </button>
        </div>
      </div>

      {/* Prominent Expiration & Risk Alert Banner */}
      {(expiredProducts.length > 0 || criticalExpiryProducts.length > 0 || warningExpiryProducts.length > 0) && (
        <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50    border border-amber-300  rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-lg shrink-0 shadow-xs">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900  flex items-center gap-2">
                  <span>Alerta de Control Sanitario y Semáforo de Caducidad</span>
                  {expiredProducts.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-bold animate-pulse">
                      {expiredProducts.length} VENCIDOS
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-600  mt-0.5">
                  Hay <strong className="text-rose-700 ">{expiredProducts.length} caducados</strong>, <strong className="text-amber-700 ">{criticalExpiryProducts.length} por vencer en &lt;30 días</strong> y <strong className="text-yellow-700 ">{warningExpiryProducts.length} en riesgo a 90 días</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsExpiryCenterOpen(true)}
                className="w-full sm:w-auto px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                Gestionar Caducidades
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APARTADO DE ALERTAS POR WHATSAPP A CELULAR (STOCK Y CADUCIDADES) */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Info & Phone Config */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
                <MessageSquare className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                    Apartado de Alertas por WhatsApp a Celular
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    Notificaciones en Tiempo Real
                  </span>
                </div>
                <p className="text-xs text-emerald-100/80">
                  Recibe en tu WhatsApp avisos de medicamentos <strong>por caducar</strong>, <strong>ya caducados</strong>, <strong>agotados</strong> o con <strong>poco stock</strong>.
                </p>
              </div>
            </div>

            {/* In-Place Phone Editor */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-emerald-200">
                Número para recibir advertencias:
              </span>
              <div className="flex items-center bg-white/10 border border-emerald-400/40 rounded-lg px-2.5 py-1 backdrop-blur-xs">
                <span className="text-xs font-bold text-emerald-300 mr-1.5">+{whatsAppCountryCodeInput}</span>
                <input
                  type="tel"
                  value={whatsAppPhoneInput}
                  onChange={(e) => setWhatsAppPhoneInput(e.target.value)}
                  placeholder="5573501782"
                  className="w-32 bg-transparent text-white font-mono font-bold text-xs focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveInlineWhatsAppPhone}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                title="Guardar este número permanentemente en el sistema"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Número</span>
              </button>

              {isPhoneSavedSuccess && (
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500 px-2 py-0.5 rounded-md animate-in fade-in">
                  ✓ Número guardado: +{whatsAppCountryCodeInput} {whatsAppPhoneInput}
                </span>
              )}
            </div>
          </div>

          {/* Right: Badges & Direct Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 lg:self-center">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-center sm:justify-start">
              {whatsAppAlertsData.outOfStock.length > 0 && (
                <span className="px-2.5 py-1 bg-rose-500/30 border border-rose-400/50 text-rose-200 text-xs font-bold rounded-lg flex items-center gap-1" title="Medicamentos agotados">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  <span>{whatsAppAlertsData.outOfStock.length} Agotados</span>
                </span>
              )}
              {whatsAppAlertsData.lowStock.length > 0 && (
                <span className="px-2.5 py-1 bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold rounded-lg flex items-center gap-1" title="Medicamentos con poco stock">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{whatsAppAlertsData.lowStock.length} Poco Stock</span>
                </span>
              )}
              {(whatsAppAlertsData.expired.length > 0 || whatsAppAlertsData.expiring.length > 0) && (
                <span className="px-2.5 py-1 bg-yellow-500/30 border border-yellow-400/50 text-yellow-200 text-xs font-bold rounded-lg flex items-center gap-1" title="Medicamentos caducados o por caducar">
                  <Clock className="w-3.5 h-3.5 text-yellow-300" />
                  <span>{whatsAppAlertsData.expired.length + whatsAppAlertsData.expiring.length} Caducidades</span>
                </span>
              )}
            </div>

            {/* Direct WhatsApp Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendAllWhatsAppAlerts}
                className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                title={`Enviar reporte sanitario y de existencias por WhatsApp a +${whatsAppCountryCodeInput} ${whatsAppPhoneInput}`}
              >
                <Send className="w-4 h-4 text-slate-950" />
                <span>📲 Enviar Alerta WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWhatsAppAlertModalOpen(true)}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-colors cursor-pointer"
                title="Configurar opciones avanzadas y ver vista previa del mensaje"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white  p-3.5 rounded-xl border border-slate-200  shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Catálogo Activo</span>
            <Package className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg font-bold text-slate-900  mt-1">
            {products.length} productos
          </div>
          <span className="text-[10px] text-slate-400">
            {products.reduce((s, p) => s + p.stock, 0)} unidades totales
          </span>
        </div>

        <div className="bg-white  p-3.5 rounded-xl border border-slate-200  shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Valoración (Costo)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-teal-700  mt-1">
            {formatCurrency(totalValuationCost)}
          </div>
          <span className="text-[10px] text-slate-400">
            Venta: {formatCurrency(totalValuationRetail)}
          </span>
        </div>

        <div 
          onClick={() => setFilterType(filterType === 'low_stock' ? 'all' : 'low_stock')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterType === 'low_stock'
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-white  border-slate-200  hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-medium ${filterType === 'low_stock' ? 'text-amber-100' : 'text-slate-500'}`}>
              Stock Bajo / Reorden
            </span>
            <AlertTriangle className={`w-4 h-4 ${filterType === 'low_stock' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className={`text-lg font-bold mt-1 ${filterType === 'low_stock' ? 'text-white' : 'text-amber-600'}`}>
            {lowStockProducts.length} alertas
          </div>
          <span className={`text-[10px] ${filterType === 'low_stock' ? 'text-amber-100' : 'text-slate-400'}`}>
            Existencia &le; Mínimo
          </span>
        </div>

        <div 
          onClick={() => setFilterType(filterType === 'critical_expiry' ? 'all' : 'critical_expiry')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterType === 'critical_expiry'
              ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
              : 'bg-white  border-slate-200  hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-medium ${filterType === 'critical_expiry' ? 'text-rose-100' : 'text-slate-500'}`}>
              Próximos a Vencer (&lt;30d)
            </span>
            <Clock className={`w-4 h-4 ${filterType === 'critical_expiry' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <div className={`text-lg font-bold mt-1 ${filterType === 'critical_expiry' ? 'text-white' : 'text-rose-600'}`}>
            {criticalExpiryProducts.length + expiredProducts.length} productos
          </div>
          <span className={`text-[10px] ${filterType === 'critical_expiry' ? 'text-rose-100' : 'text-slate-400'}`}>
            {expiredProducts.length > 0 ? `${expiredProducts.length} ya caducados` : 'Riesgo inminente'}
          </span>
        </div>
      </div>

      {/* Search, Category Selector & Filter Pills */}
      <div className="bg-white  p-4 rounded-xl border border-slate-200  shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          
          {/* Universal Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por código único, nombre, descripción, unidad, sustancia, lote, ubicación..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50  border border-slate-200  rounded-lg text-xs text-slate-900  focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50  border border-slate-200  rounded-lg text-xs text-slate-900  font-medium focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Todas las Categorías ({products.length})</option>
              {categories.map(c => {
                const count = products.filter(p => p.category === c).length;
                return (
                  <option key={c} value={c}>
                    {c} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex flex-wrap gap-2 text-xs pt-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-800 text-white   font-bold'
                : 'bg-slate-100  text-slate-600 '
            }`}
          >
            Todos ({products.length})
          </button>

          <button
            onClick={() => setFilterType('low_stock')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'low_stock'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50  text-amber-800  border border-amber-200 '
            }`}
          >
            Stock Bajo ({lowStockProducts.length})
          </button>

          <button
            onClick={() => setFilterType('critical_expiry')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'critical_expiry'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-rose-50  text-rose-800  border border-rose-200 '
            }`}
          >
            Próximos a Caducar &lt;30d ({criticalExpiryProducts.length})
          </button>

          <button
            onClick={() => setFilterType('warning_expiry')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'warning_expiry'
                ? 'bg-yellow-600 text-white font-bold'
                : 'bg-yellow-50  text-yellow-800  border border-yellow-200 '
            }`}
          >
            Alerta 30-90d ({warningExpiryProducts.length})
          </button>

          {expiredProducts.length > 0 && (
            <button
              onClick={() => setFilterType('expired')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'expired'
                  ? 'bg-red-700 text-white font-bold'
                  : 'bg-red-100  text-red-800  border border-red-300 '
              }`}
            >
              Vencidos ({expiredProducts.length})
            </button>
          )}

          <button
            onClick={() => setFilterType('prescription')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'prescription'
                ? 'bg-teal-700 text-white font-bold'
                : 'bg-teal-50  text-teal-800  border border-teal-200 '
            }`}
          >
            Requiere Receta Médica
          </button>

          {/* Toggle Quick Inline Price Edit Mode */}
          <button
            onClick={() => setIsInlinePriceEditMode(!isInlinePriceEditMode)}
            className={`ml-auto px-3 py-1 rounded-md font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isInlinePriceEditMode
                ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-sm'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
            }`}
            title="Activar o desactivar la edición directa e instantánea de precios y porcentaje de ganancia en cada renglón de la tabla"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isInlinePriceEditMode ? '✓ Modo Edición de Precios Activo' : '⚡ Edición Rápida en Tabla'}</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white  rounded-xl border border-slate-200  shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 ">
            <thead className="bg-slate-50  text-[11px] font-bold text-slate-500  uppercase tracking-wider border-b border-slate-200 ">
              <tr>
                <th className="py-3 px-4">Código Único / SKU</th>
                <th className="py-3 px-4">Medicamento / Descripción</th>
                <th className="py-3 px-4">Unidad / Cat.</th>
                <th className="py-3 px-4 min-w-[220px]">
                  <div className="flex items-center gap-1">
                    <span>Costo / Margen / Venta</span>
                    {isInlinePriceEditMode && (
                      <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold">Editando</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Caducidad / Semáforo</th>
                <th className="py-3 px-4">Lote / Ubicación</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {filteredProducts.map(p => {
                const exp = getExpiryStatus(p.expirationDate);
                const isLowStock = p.stock <= p.minStock;
                const margin = p.sellingPrice > 0 ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(0) : '0';
                const draft = getRowPriceDraft(p);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80  transition-colors">
                    
                    {/* Código Único */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="font-bold text-slate-900  bg-slate-100  px-2 py-0.5 rounded inline-block">
                        {p.code || p.barcode}
                      </div>
                      {p.barcode && p.barcode !== p.code && (
                        <div className="text-[10px] text-slate-400 mt-0.5">EAN: {p.barcode}</div>
                      )}
                    </td>

                    {/* Nombre & Descripción */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-start gap-2.5">
                        {p.photoUrl ? (
                          <img
                            src={p.photoUrl}
                            alt={p.name}
                            className="w-9 h-9 object-cover rounded-md border border-slate-200 shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-teal-50  border border-teal-200  flex items-center justify-center text-teal-600 shrink-0 mt-0.5">
                            <Pill className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900  flex items-center gap-1.5 flex-wrap">
                            {p.name}
                            {p.prescriptionRequired && (
                              <span className="text-[9px] bg-rose-100  text-rose-700  px-1 py-0.2 rounded font-semibold border border-rose-200 ">
                                Receta
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600  line-clamp-1 mt-0.5">
                            {p.description || p.presentation}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {p.activeIngredient && `Fórmula: ${p.activeIngredient}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Unidad de Medida & Categoría */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 ">
                        {p.unitOfMeasure || 'Pieza'}
                      </div>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100  text-[10px] font-medium text-slate-600  mt-0.5">
                        {p.category}
                      </span>
                    </td>

                    {/* Precios y Margen (Soporta visualización normal y edición rápida en tabla) */}
                    <td className="py-2.5 px-4">
                      {isInlinePriceEditMode ? (
                        <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5 min-w-[210px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-[9px] font-bold text-slate-600 block">Costo ($)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={draft.costPrice}
                                onChange={e => handleInlineCostChange(p, parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                            <div className="w-16">
                              <label className="text-[9px] font-bold text-amber-800 block">% Ganancia</label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="500"
                                value={draft.marginPercent}
                                onChange={e => handleInlineMarginChange(p, parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-1 text-xs font-bold bg-white border border-amber-300 text-amber-900 rounded focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[9px] font-bold text-teal-800 block">Venta ($)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={draft.sellingPrice}
                                onChange={e => handleInlinePriceChange(p, parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-1 text-xs font-bold bg-white border-2 border-teal-500 text-teal-900 rounded focus:ring-1 focus:ring-teal-500"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            {/* Preset Pills */}
                            <div className="flex items-center gap-1">
                              {[30, 40, 50, 100].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => handleInlineMarginChange(p, pct)}
                                  className={`px-1 py-0.2 text-[9px] font-bold rounded cursor-pointer ${
                                    draft.marginPercent === pct
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-100'
                                  }`}
                                >
                                  +{pct}%
                                </button>
                              ))}
                            </div>
                            {/* Instant Save Button */}
                            <button
                              type="button"
                              onClick={() => handleSaveInlineProductPrice(p)}
                              className={`px-2 py-0.5 text-[10px] font-black rounded flex items-center gap-1 transition-all cursor-pointer ${
                                draft.saved
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-2xs'
                              }`}
                            >
                              {draft.saved ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>¡Listo!</span>
                                </>
                              ) : (
                                <span>Guardar</span>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative">
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-slate-900 text-sm">
                              {formatCurrency(p.sellingPrice)}
                            </div>
                            <button
                              onClick={() => setIsQuickPriceModalOpen(true)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-amber-600 hover:bg-amber-50 rounded"
                              title="Ajustar precios y margen de ganancia"
                            >
                              <Percent className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <span>Costo: {formatCurrency(p.costPrice)}</span>
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded border border-emerald-200/60">
                              +{p.costPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.costPrice) * 100) : 0}% ganancia
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Stock Actual vs Mínimo */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm ${isLowStock ? 'text-amber-600 ' : 'text-slate-900 '}`}>
                          {p.stock}
                        </span>
                        <span className="text-[10px] text-slate-400">un.</span>
                        {isLowStock && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title={`Stock mínimo: ${p.minStock}`} />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">Mín: {p.minStock} un.</div>
                    </td>

                    {/* Caducidad y Semáforo */}
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${exp.badgeClass}`}>
                        {exp.label}
                      </span>
                      {p.expirationDate && (
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(p.expirationDate)}
                        </div>
                      )}
                    </td>

                    {/* Lote y Ubicación */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div>{p.batchNumber ? `Lt: ${p.batchNumber}` : '-'}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{p.location || 'Sin ubicación'}</div>
                    </td>

                    {/* Botones de Acción */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Stock Entry */}
                        <button
                          onClick={() => handleOpenQuickMovement('entry', p)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50  rounded-md transition-colors cursor-pointer"
                          title="Entrada rápida de stock (+)"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Stock Exit / Merma */}
                        <button
                          onClick={() => handleOpenQuickMovement('exit', p)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50  rounded-md transition-colors cursor-pointer"
                          title="Salida rápida por merma/daño (-)"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick WhatsApp Alert for this specific product */}
                        {(isLowStock || exp.daysLeft <= 60 || p.stock === 0) && (
                          <button
                            onClick={() => handleSendSingleProductWhatsApp(p, exp.daysLeft <= 60 ? 'expiry' : 'stock')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title={`Enviar aviso por WhatsApp a ${whatsAppPhoneInput} sobre ${p.name}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Product */}
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100  rounded-md transition-colors cursor-pointer"
                          title="Editar producto"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Product */}
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar definitivamente "${p.name}" del catálogo?`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50  rounded-md transition-colors cursor-pointer"
                          title="Eliminar del catálogo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500 text-xs">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {products.length === 0 ? 'Inventario en Blanco (Listo para tus productos)' : 'No se encontraron productos'}
                        </p>
                        <p className="text-slate-500 mt-1 text-xs">
                          {products.length === 0 
                            ? 'El sistema está completamente limpio. Comienza registrando tu primer medicamento o producto con su código de barras, precios y existencia.'
                            : 'Intenta cambiar el término de búsqueda o los filtros de categoría.'}
                        </p>
                      </div>
                      {products.length === 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsSupplierTicketModalOpen(true)}
                            className="px-4 py-2.5 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                          >
                            <FileText className="w-4 h-4 text-teal-300" />
                            <span>📥 Cargar con Ticket o Factura PDF de Proveedor</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(null);
                              setIsProductModalOpen(true);
                            }}
                            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                          >
                            <Plus className="w-4 h-4" />
                            <span>+ Alta Manual</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiration Alert Center Modal */}
      {isExpiryCenterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white  rounded-xl shadow-2xl border border-slate-200  w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-200  bg-rose-50  flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-600 text-white rounded-lg">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 ">
                    Centro de Alertas de Caducidad y Mermas Sanitarias
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Control preventivo de fechas de vencimiento, bajas de inventario y remates
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpiryCenterOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              
              {/* Vencidos Section */}
              {expiredProducts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-rose-700  flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
                    Medicamentos Caducados ({expiredProducts.length}) - Retiro Inmediato Obligatorio
                  </h4>
                  <div className="border border-rose-200  rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-rose-100  text-rose-900  font-bold text-[10px]">
                        <tr>
                          <th className="p-2.5">Código / Medicamento</th>
                          <th className="p-2.5">Lote</th>
                          <th className="p-2.5">Fecha Caducidad</th>
                          <th className="p-2.5">Stock Afectado</th>
                          <th className="p-2.5">Pérdida en Costo</th>
                          <th className="p-2.5 text-right">Acción Sanitaria</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 ">
                        {expiredProducts.map(p => (
                          <tr key={p.id} className="bg-rose-50/50 ">
                            <td className="p-2.5">
                              <span className="font-bold text-slate-900 ">{p.name}</span>
                              <span className="block text-[10px] text-slate-500">{p.code} • {p.unitOfMeasure}</span>
                            </td>
                            <td className="p-2.5 font-mono">{p.batchNumber || 'Sin lote'}</td>
                            <td className="p-2.5 font-bold text-rose-700 ">
                              {formatDate(p.expirationDate || '')}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900 ">
                              {p.stock} unidades
                            </td>
                            <td className="p-2.5 font-bold text-rose-700 ">
                              {formatCurrency(p.costPrice * p.stock)}
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => handleQuickDiscardExpired(p)}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px] shadow-xs cursor-pointer"
                              >
                                Dar de Baja Sanitaria
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Critical Expiry Section (<30 days) */}
              <div className="space-y-3">
                <h4 className="font-bold text-amber-700  flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  Próximos a Vencer en menos de 30 días ({criticalExpiryProducts.length})
                </h4>
                {criticalExpiryProducts.length > 0 ? (
                  <div className="border border-amber-200  rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-amber-100  text-amber-900  font-bold text-[10px]">
                        <tr>
                          <th className="p-2.5">Medicamento</th>
                          <th className="p-2.5">Caducidad</th>
                          <th className="p-2.5">Stock</th>
                          <th className="p-2.5">Precio Venta</th>
                          <th className="p-2.5 text-right">Acciones Rápidas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100 ">
                        {criticalExpiryProducts.map(p => {
                          const exp = getExpiryStatus(p.expirationDate);
                          return (
                            <tr key={p.id} className="bg-amber-50/50 ">
                              <td className="p-2.5">
                                <span className="font-bold text-slate-900 ">{p.name}</span>
                                <span className="block text-[10px] text-slate-500">{p.code} • {p.unitOfMeasure}</span>
                              </td>
                              <td className="p-2.5 font-bold text-amber-800 ">
                                {formatDate(p.expirationDate || '')} ({exp.daysLeft} días)
                              </td>
                              <td className="p-2.5 font-bold text-slate-900 ">
                                {p.stock} un.
                              </td>
                              <td className="p-2.5 font-bold">
                                {formatCurrency(p.sellingPrice)}
                              </td>
                              <td className="p-2.5 text-right space-x-1.5">
                                <button
                                  onClick={() => handleApplyDiscountToNearExpiry(p, 25)}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[10px] cursor-pointer"
                                  title="Aplicar 25% descuento para acelerar venta"
                                >
                                  -25% Remate
                                </button>
                                <button
                                  onClick={() => handleOpenQuickMovement('exit', p)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold text-[10px] cursor-pointer"
                                >
                                  Salida / Merma
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No hay productos que caduquen en los próximos 30 días.</p>
                )}
              </div>

              {/* Warning Expiry Section (30 to 90 days) */}
              <div className="space-y-3">
                <h4 className="font-bold text-yellow-700  flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  Alerta Preventiva: Caducidad a 30-90 días ({warningExpiryProducts.length})
                </h4>
                {warningExpiryProducts.length > 0 ? (
                  <div className="border border-yellow-200  rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-yellow-100  text-yellow-900  font-bold text-[10px]">
                        <tr>
                          <th className="p-2.5">Medicamento</th>
                          <th className="p-2.5">Lote / Caducidad</th>
                          <th className="p-2.5">Stock</th>
                          <th className="p-2.5">Ubicación</th>
                          <th className="p-2.5 text-right">Estrategia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-yellow-100 ">
                        {warningExpiryProducts.map(p => {
                          const exp = getExpiryStatus(p.expirationDate);
                          return (
                            <tr key={p.id} className="bg-yellow-50/40 ">
                              <td className="p-2.5">
                                <span className="font-bold text-slate-900 ">{p.name}</span>
                                <span className="block text-[10px] text-slate-500">{p.code} • {p.unitOfMeasure}</span>
                              </td>
                              <td className="p-2.5">
                                {formatDate(p.expirationDate || '')} ({exp.daysLeft} días)
                              </td>
                              <td className="p-2.5 font-bold text-slate-900 ">
                                {p.stock} un.
                              </td>
                              <td className="p-2.5 text-slate-500">
                                {p.location || 'Mostrador'}
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  onClick={() => handleApplyDiscountToNearExpiry(p, 15)}
                                  className="px-2.5 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold text-[10px] cursor-pointer"
                                >
                                  Promoción -15%
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No hay medicamentos en ventana preventiva de 30-90 días.</p>
                )}
              </div>

            </div>

            <div className="px-6 py-3 border-t border-slate-200  bg-slate-50  flex justify-end">
              <button
                onClick={() => setIsExpiryCenterOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white   rounded-lg font-bold text-xs cursor-pointer"
              >
                Cerrar Centro de Alertas
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quick Stock Movement Modal (Entrada de Compras o Salida de Mermas) */}
      {isStockMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white  rounded-xl shadow-2xl border border-slate-200  w-full max-w-lg overflow-hidden">
            
            <div className={`px-6 py-4 border-b border-slate-200  flex justify-between items-center ${
              movementActionType === 'entry' ? 'bg-emerald-50 ' : 'bg-rose-50 '
            }`}>
              <div className="flex items-center gap-2">
                {movementActionType === 'entry' ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                )}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 ">
                    {movementActionType === 'entry' ? 'Registrar Entrada de Stock (Compra / Recepción)' : 'Registrar Salida de Stock (Merma / Baja / Caducidad)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {movementActionType === 'entry' ? 'Incrementa las existencias del catálogo' : 'Descuenta las existencias del catálogo'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsStockMovementModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickMovement} className="p-6 space-y-4 text-xs">
              
              {/* Shortcut Banner for Bulk / Ticket / PDF / Excel Entry */}
              {movementActionType === 'entry' && (
                <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 text-teal-900">
                    <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-[11px] font-medium">
                      ¿Deseas ingresar varios medicamentos con ticket, PDF o Excel?
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsStockMovementModalOpen(false);
                        setIsSupplierTicketModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ticket / PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsStockMovementModalOpen(false);
                        setIsStockEntryExcelModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Product selector */}
              <div>
                <label className="block font-semibold text-slate-700  mb-1">
                  Medicamento / Producto: *
                </label>
                <select
                  value={targetProductForMovement?.id || ''}
                  onChange={e => {
                    const found = products.find(p => p.id === e.target.value) || null;
                    setTargetProductForMovement(found);
                    if (found) {
                      setMovementCostPrice(found.costPrice);
                      setMovementBatch(found.batchNumber || '');
                      setMovementExpiry(found.expirationDate || '');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg text-xs font-medium"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} (Stock Actual: {p.stock} {p.unitOfMeasure})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Quantity */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Cantidad a {movementActionType === 'entry' ? 'Ingresar' : 'Dar de Baja'}: *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={movementQuantity}
                    onChange={e => setMovementQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg font-bold text-sm"
                  />
                  {targetProductForMovement && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Unidad: {targetProductForMovement.unitOfMeasure} • Stock resultará: {
                        movementActionType === 'entry'
                          ? targetProductForMovement.stock + movementQuantity
                          : Math.max(0, targetProductForMovement.stock - movementQuantity)
                      }
                    </span>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Motivo:
                  </label>
                  <select
                    value={movementReason}
                    onChange={e => setMovementReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg text-xs"
                  >
                    {movementActionType === 'entry' ? (
                      <>
                        <option value="compra">Compra a Proveedor</option>
                        <option value="ajuste_inventario">Ajuste Positivo</option>
                        <option value="devolucion_cliente">Devolución de Cliente</option>
                        <option value="donacion">Donación Recibida</option>
                      </>
                    ) : (
                      <>
                        <option value="caducidad">Medicamento Caducado</option>
                        <option value="merma">Merma / Pérdida</option>
                        <option value="danado">Empaque Dañado / Roto</option>
                        <option value="uso_interno">Uso Interno / Botiquín</option>
                        <option value="ajuste_negativo">Ajuste Negativo</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Supplier or Destination */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    {movementActionType === 'entry' ? 'Proveedor:' : 'Destino / Acta:'}
                  </label>
                  <input
                    type="text"
                    placeholder={movementActionType === 'entry' ? 'Distribuidora Marzam / Nadro' : 'Baja Sanitaria / Merma'}
                    value={movementSupplierOrDestination}
                    onChange={e => setMovementSupplierOrDestination(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  />
                </div>

                {/* Invoice / Reference */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Factura / Remisión / Ref:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-10928"
                    value={movementReference}
                    onChange={e => setMovementReference(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  />
                </div>

                {/* Batch & Expiry (if entry) */}
                {movementActionType === 'entry' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700  mb-1">
                        Lote del Lote Recibido:
                      </label>
                      <input
                        type="text"
                        value={movementBatch}
                        onChange={e => setMovementBatch(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700  mb-1">
                        Nueva Fecha Caducidad:
                      </label>
                      <input
                        type="date"
                        value={movementExpiry}
                        onChange={e => setMovementExpiry(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg text-[11px]"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700  mb-1">
                  Notas u Observaciones:
                </label>
                <input
                  type="text"
                  placeholder="Detalles adicionales del movimiento..."
                  value={movementNotes}
                  onChange={e => setMovementNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200  flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStockMovementModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600  hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer ${
                    movementActionType === 'entry' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar {movementActionType === 'entry' ? 'Entrada de Stock' : 'Salida / Merma'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal with ALL requested fields */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white  rounded-xl shadow-2xl border border-slate-200  w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-200  bg-slate-50  flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-900  flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600" />
                {editingProduct ? 'Editar Medicamento del Catálogo' : 'Alta de Nuevo Medicamento en Inventario'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Código Único */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Código Único / SKU: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. MED-750101"
                    value={formData.code}
                    onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                  />
                </div>

                {/* Código de Barras */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Código de Barras / EAN: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 7501008492011"
                    value={formData.barcode}
                    onChange={e => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Categoría Farmacéutica: *
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg focus:ring-2 focus:ring-teal-500 font-medium"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Nombre Comercial */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700  mb-1">
                    Nombre del Medicamento / Producto: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Paracetamol 500mg, Amoxicilina 500mg..."
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>

                {/* Unidad de Medida */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Unidad de Medida: *
                  </label>
                  <select
                    value={formData.unitOfMeasure}
                    onChange={e => setFormData(prev => ({ ...prev, unitOfMeasure: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg focus:ring-2 focus:ring-teal-500 font-semibold"
                  >
                    {unitsOfMeasure.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Descripción Detallada */}
                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700  mb-1">
                    Descripción / Indicaciones / Especificaciones:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Analgésico y antipirético para alivio de dolores de cabeza, musculares y control de fiebre..."
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg resize-none"
                  />
                </div>

                {/* Sustancia Activa & Presentación */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Sustancia Activa:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Paracetamol 500mg"
                    value={formData.activeIngredient}
                    onChange={e => setFormData(prev => ({ ...prev, activeIngredient: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Presentación:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Caja con 20 tabletas"
                    value={formData.presentation}
                    onChange={e => setFormData(prev => ({ ...prev, presentation: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Ubicación / Anaquel:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Estante A-1 / Nevera"
                    value={formData.location}
                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  />
                </div>

                {/* Precios & Margen de Ganancia con cálculo automático */}
                <div className="sm:col-span-3 bg-teal-50/70 p-4 rounded-xl border border-teal-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                      <DollarSign className="w-4 h-4 text-teal-700" />
                      Estructura de Precios y Porcentaje de Ganancia
                    </span>
                    {(formData.costPrice || 0) > 0 && (formData.sellingPrice || 0) > 0 && (
                      <span className="text-[11px] font-bold text-teal-900 bg-teal-200/80 px-2.5 py-0.5 rounded-full border border-teal-300">
                        Ganancia: {formatCurrency(Math.max(0, (formData.sellingPrice || 0) - (formData.costPrice || 0)))} / unidad
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Cost Price */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        1. Precio Costo (Compra): *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          required
                          value={formData.costPrice}
                          onChange={e => handleFormCostPriceChange(parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Profit Margin % */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        2. % Ganancia deseado:
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="1000"
                          value={formMarginPercent}
                          onChange={e => handleFormMarginPercentChange(parseFloat(e.target.value) || 0)}
                          className="w-full pl-3 pr-7 py-2 bg-white border border-slate-300 rounded-lg font-bold text-amber-900 focus:ring-2 focus:ring-teal-500"
                          placeholder="35"
                        />
                        <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                      
                      {/* Preset Pills */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {[20, 25, 30, 35, 40, 50, 60, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleFormMarginPercentChange(pct)}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                              formMarginPercent === pct
                                ? 'bg-teal-700 text-white shadow-2xs'
                                : 'bg-white hover:bg-teal-100 text-teal-800 border border-teal-200'
                            }`}
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        3. Precio Venta al Público: *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-700 font-bold">$</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          required
                          value={formData.sellingPrice}
                          onChange={e => handleFormSellingPriceChange(parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-2 bg-white border-2 border-teal-500 rounded-lg font-bold text-teal-950 text-sm focus:ring-2 focus:ring-teal-600 shadow-2xs"
                          placeholder="0.00"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Margen s/ venta: {formData.sellingPrice && Number(formData.sellingPrice) > 0 ? Math.round((((formData.sellingPrice - (formData.costPrice || 0)) / formData.sellingPrice) * 100)) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Cantidad en Stock: *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={e => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Stock Mínimo de Alerta:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={e => setFormData(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Número de Lote:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. L-24110A"
                    value={formData.batchNumber}
                    onChange={e => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg font-mono"
                  />
                </div>

                {/* Fecha de Caducidad */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Fecha de Caducidad: *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expirationDate}
                    onChange={e => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50  border border-slate-300  rounded-lg font-medium"
                  />
                </div>

                {/* Prescription Required */}
                <div className="sm:col-span-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none p-3 bg-slate-50  rounded-lg border border-slate-200 ">
                    <input
                      type="checkbox"
                      checked={formData.prescriptionRequired}
                      onChange={e => setFormData(prev => ({ ...prev, prescriptionRequired: e.target.checked }))}
                      className="w-4 h-4 rounded text-teal-600"
                    />
                    <span className="font-bold text-rose-700  flex items-center gap-1.5 text-xs">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      Requiere Receta Médica Retenida / Medicamento Controlado
                    </span>
                  </label>
                </div>

                {/* Photo Upload */}
                <div className="sm:col-span-3 pt-2 border-t border-slate-200 ">
                  <label className="block font-semibold text-slate-700  mb-1">
                    Fotografía del Producto (Opcional):
                  </label>
                  <div className="flex items-center gap-3">
                    {formData.photoUrl ? (
                      <div className="relative">
                        <img
                          src={formData.photoUrl}
                          alt="Foto"
                          className="w-14 h-14 object-cover rounded-lg border border-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-100  border border-dashed border-slate-300  flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}

                    <label className="px-3 py-1.5 bg-slate-100  hover:bg-slate-200  rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 border border-slate-200 ">
                      <Upload className="w-3.5 h-3.5 text-teal-600" />
                      Subir Imagen
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200  flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600  hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Guardar Producto
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Supplier Ticket & PDF Ingestion Modal */}
      <SupplierTicketModal
        isOpen={isSupplierTicketModalOpen}
        onClose={() => setIsSupplierTicketModalOpen(false)}
        products={products}
        onConfirmRestock={(updatedProducts, movement) => {
          if (onRegisterMovement) {
            onRegisterMovement(movement, updatedProducts);
          }
        }}
      />

      {/* Stock Entry Excel Bulk Import Modal */}
      <StockEntryExcelModal
        isOpen={isStockEntryExcelModalOpen}
        onClose={() => setIsStockEntryExcelModalOpen(false)}
        products={products}
        onConfirmEntry={(updatedProducts, movement) => {
          if (onRegisterMovement) {
            onRegisterMovement(movement, updatedProducts);
          }
        }}
      />

      {/* Export Inventory & Database Modal */}
      <ExportInventoryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        products={products}
        settings={settings}
        customers={customers}
        sales={sales}
        movements={movements}
        payments={payments}
        cashCuts={cashCuts}
      />

      {/* WhatsApp Alerts & Phone Configuration Modal */}
      <WhatsAppAlertModal
        isOpen={isWhatsAppAlertModalOpen}
        onClose={() => setIsWhatsAppAlertModalOpen(false)}
        products={products}
        settings={settings}
        onSaveSettings={(newSettings) => {
          if (onSaveSettings) {
            onSaveSettings(newSettings);
          }
        }}
      />

      {/* Quick Price & Profit Margin Bulk Editor Modal */}
      <QuickPriceEditorModal
        isOpen={isQuickPriceModalOpen}
        onClose={() => setIsQuickPriceModalOpen(false)}
        products={products}
        onSaveMultipleProducts={handleBulkSaveProducts}
      />

    </div>
  );
};
