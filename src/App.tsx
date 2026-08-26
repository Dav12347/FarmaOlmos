/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Product, 
  Customer, 
  Sale, 
  InventoryMovement, 
  DebtPayment, 
  PharmacySettings,
  CashCut,
  CashMovement,
  AppUser
} from './types/pharmacy';
import { 
  StorageManager, 
  SAMPLE_PRODUCTS, 
  SAMPLE_CUSTOMERS, 
  SAMPLE_SALES, 
  SAMPLE_MOVEMENTS, 
  SAMPLE_PAYMENTS, 
  DEFAULT_SETTINGS,
  DEFAULT_USERS
} from './utils/storage';
import { 
  CloudSyncService, 
  initAuth, 
  testFirestoreConnection 
} from './firebase';
import { generateFolio } from './utils/formatters';
import { Navbar, ActiveTab } from './components/Navbar';
import { POSView } from './components/pos/POSView';
import { InventoryView } from './components/inventory/InventoryView';
import { MovementsView } from './components/movements/MovementsView';
import { CustomersView } from './components/customers/CustomersView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { TicketModal } from './components/pos/TicketModal';
import { PhotoSearchModal } from './components/common/PhotoSearchModal';
import { CashCutModal } from './components/pos/CashCutModal';
import { CancelSaleModal } from './components/pos/CancelSaleModal';
import { LoginModal } from './components/auth/LoginModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  
  // User Authentication & Session
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const stored = StorageManager.getCurrentUser();
    if (stored) return stored;
    const defaultUser = DEFAULT_USERS[0].user;
    StorageManager.setCurrentUser(defaultUser, true);
    return defaultUser;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // Data state (cached locally for instant paint, updated via live cloud sync)
  const [products, setProducts] = useState<Product[]>(() => StorageManager.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(() => StorageManager.getCustomers());
  const [sales, setSales] = useState<Sale[]>(() => StorageManager.getSales());
  const [movements, setMovements] = useState<InventoryMovement[]>(() => StorageManager.getMovements());
  const [payments, setPayments] = useState<DebtPayment[]>(() => StorageManager.getPayments());
  const [settings, setSettings] = useState<PharmacySettings>(() => StorageManager.getSettings());
  const [cashCuts, setCashCuts] = useState<CashCut[]>(() => StorageManager.getCashCuts());
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() => StorageManager.getCashMovements());
  const [activeShift, setActiveShift] = useState<{ openedAt: string; initialCash: number }>(() => StorageManager.getActiveShift());
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // Ticket Modal state
  const [activeTicketSale, setActiveTicketSale] = useState<Sale | null>(null);
  const [activeTicketPayment, setActiveTicketPayment] = useState<DebtPayment | null>(null);
  const [ticketCustomer, setTicketCustomer] = useState<Customer | null>(null);

  // Photo Visual Search Modal state
  const [isPhotoSearchOpen, setIsPhotoSearchOpen] = useState(false);
  const [productForPOSCart, setProductForPOSCart] = useState<Product | null>(null);

  // Cash Cut Modal state
  const [isCashCutOpen, setIsCashCutOpen] = useState(false);

  // Cancel / Refund Sale Modal state
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);

  // Quick Customer Registration trigger from POS
  const [openCustomerModalDirectly, setOpenCustomerModalDirectly] = useState(false);

  // Real-time Cloud Synchronization Setup
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    // Ensure system is in clean virgin state if first time or requested
    StorageManager.ensureVirginModeOnStartup();

    const initializeRealtimeCloud = async () => {
      try {
        // 1. Authenticate session
        await initAuth();

        // 2. Check connection
        const connected = await testFirestoreConnection();
        setIsCloudConnected(connected);

        // 3. Subscribe to Real-Time Cloud Listeners
        const unsubProducts = CloudSyncService.subscribeProducts((cloudProducts) => {
          if (cloudProducts.length > 0) {
            setProducts(cloudProducts);
            StorageManager.saveProducts(cloudProducts, true);
          } else {
            const localProducts = StorageManager.getProducts();
            if (localProducts.length > 0) {
              CloudSyncService.saveProductsBatch(localProducts).catch(console.warn);
            }
          }
          setIsCloudConnected(true);
        }, () => setIsCloudConnected(false));

        const unsubCustomers = CloudSyncService.subscribeCustomers((cloudCustomers) => {
          if (cloudCustomers.length > 0) {
            setCustomers(cloudCustomers);
            StorageManager.saveCustomers(cloudCustomers, true);
          } else {
            const localCustomers = StorageManager.getCustomers();
            if (localCustomers.length > 0) {
              localCustomers.forEach(c => CloudSyncService.saveCustomer(c).catch(console.warn));
            }
          }
          setIsCloudConnected(true);
        }, () => setIsCloudConnected(false));

        const unsubSales = CloudSyncService.subscribeSales((cloudSales) => {
          if (cloudSales.length > 0) {
            setSales(cloudSales);
            StorageManager.saveSales(cloudSales, true);
          } else {
            const localSales = StorageManager.getSales();
            if (localSales.length > 0) {
              CloudSyncService.saveSalesBatch(localSales).catch(console.warn);
            }
          }
          setIsCloudConnected(true);
        }, () => setIsCloudConnected(false));

        const unsubMovements = CloudSyncService.subscribeMovements((cloudMovements) => {
          if (cloudMovements.length > 0) {
            setMovements(cloudMovements);
            StorageManager.saveMovements(cloudMovements, true);
          } else {
            const localMovements = StorageManager.getMovements();
            if (localMovements.length > 0) {
              CloudSyncService.saveMovementsBatch(localMovements).catch(console.warn);
            }
          }
          setIsCloudConnected(true);
        }, () => setIsCloudConnected(false));

        const unsubPayments = CloudSyncService.subscribePayments((cloudPayments) => {
          if (cloudPayments.length > 0) {
            setPayments(cloudPayments);
            StorageManager.savePayments(cloudPayments, true);
          } else {
            const localPayments = StorageManager.getPayments();
            if (localPayments.length > 0) {
              CloudSyncService.savePaymentsBatch(localPayments).catch(console.warn);
            }
          }
          setIsCloudConnected(true);
        }, () => setIsCloudConnected(false));

        const unsubSettings = CloudSyncService.subscribeSettings((cloudSettings) => {
          if (cloudSettings && cloudSettings.name) {
            setSettings(cloudSettings);
            StorageManager.saveSettings(cloudSettings, true);
          } else {
            const localSettings = StorageManager.getSettings();
            if (localSettings && localSettings.name) {
              CloudSyncService.saveSettings(localSettings).catch(console.warn);
            }
          }
          setIsCloudConnected(true);
        }, () => setIsCloudConnected(false));

        const unsubCashCuts = CloudSyncService.subscribeCashCuts((cloudCuts) => {
          if (cloudCuts.length > 0) {
            setCashCuts(cloudCuts);
            StorageManager.saveCashCuts(cloudCuts, true);
          } else {
            const localCuts = StorageManager.getCashCuts();
            if (localCuts.length > 0) {
              CloudSyncService.saveCashCutsBatch(localCuts).catch(console.warn);
            }
          }
          setIsCloudConnected(true);
        }, () => setIsCloudConnected(false));

        const unsubCashMovements = CloudSyncService.subscribeCashMovements((cloudMovs) => {
          if (cloudMovs.length > 0) {
            setCashMovements(cloudMovs);
            StorageManager.saveCashMovements(cloudMovs, true);
          } else {
            const localMovs = StorageManager.getCashMovements();
            if (localMovs.length > 0) {
              CloudSyncService.saveCashMovementsBatch(localMovs).catch(console.warn);
            }
          }
          setIsCloudConnected(true);
        }, () => setIsCloudConnected(false));

        unsubs = [
          unsubProducts,
          unsubCustomers,
          unsubSales,
          unsubMovements,
          unsubPayments,
          unsubSettings,
          unsubCashCuts,
          unsubCashMovements
        ];
      } catch (err) {
        console.warn('Realtime cloud sync init note:', err);
        setIsCloudConnected(false);
      }
    };

    initializeRealtimeCloud();

    return () => {
      unsubs.forEach(unsub => {
        try { unsub(); } catch (e) { /* noop */ }
      });
    };
  }, []);

  // Handle completing a sale in POS (Immediate cloud & local write)
  const handleCompleteSale = async (sale: Sale, updatedProducts: Product[], updatedCustomer?: Customer) => {
    // 1. Update State
    const nextSales = [sale, ...sales];
    const nextProducts = updatedProducts;
    const nextCustomers = updatedCustomer 
      ? customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c)
      : customers;

    setSales(nextSales);
    setProducts(nextProducts);
    setCustomers(nextCustomers);

    if (updatedCustomer) {
      setTicketCustomer(updatedCustomer);
    } else if (sale.customerId) {
      const cust = customers.find(c => c.id === sale.customerId) || null;
      setTicketCustomer(cust);
    } else {
      setTicketCustomer(null);
    }

    // 2. Immediate Local Persistence
    StorageManager.saveSales(nextSales, true);
    StorageManager.saveProducts(nextProducts, true);
    if (updatedCustomer) {
      StorageManager.saveCustomers(nextCustomers, true);
    }

    // 3. Real-time Firestore Cloud Atomic Save
    try {
      await CloudSyncService.saveSale(sale, updatedProducts, updatedCustomer);
    } catch (error) {
      console.warn('Cloud save sale note:', error);
    }

    // Open ticket modal
    setActiveTicketPayment(null);
    setActiveTicketSale(sale);
  };

  // Handle product save / delete
  const handleSaveProduct = async (product: Product) => {
    // 1. Optimistic state & local cache
    const exists = products.some(p => p.id === product.id);
    const nextProducts = exists ? products.map(p => p.id === product.id ? product : p) : [product, ...products];
    setProducts(nextProducts);
    StorageManager.saveProducts(nextProducts, true);

    // 2. Real-time Cloud Save
    try {
      await CloudSyncService.saveProduct(product);
    } catch (e) {
      console.warn('Cloud product save note:', e);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const nextProducts = products.filter(p => p.id !== productId);
    setProducts(nextProducts);
    StorageManager.saveProducts(nextProducts, true);
    try {
      await CloudSyncService.deleteProduct(productId);
    } catch (e) {
      console.warn('Cloud product delete note:', e);
    }
  };

  // Handle movement registered (Entrada / Salida)
  const handleRegisterMovement = async (movement: InventoryMovement, updatedProducts: Product[]) => {
    const nextMovements = [movement, ...movements];
    setMovements(nextMovements);
    setProducts(updatedProducts);

    StorageManager.saveMovements(nextMovements, true);
    StorageManager.saveProducts(updatedProducts, true);

    try {
      await CloudSyncService.saveMovement(movement, updatedProducts);
    } catch (e) {
      console.warn('Cloud movement save note:', e);
    }
  };

  // Handle customer save / delete
  const handleSaveCustomer = async (customer: Customer) => {
    const exists = customers.some(c => c.id === customer.id);
    const nextCustomers = exists ? customers.map(c => c.id === customer.id ? customer : c) : [customer, ...customers];
    setCustomers(nextCustomers);
    StorageManager.saveCustomers(nextCustomers, true);

    try {
      await CloudSyncService.saveCustomer(customer);
    } catch (e) {
      console.warn('Cloud customer save note:', e);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    const nextCustomers = customers.filter(c => c.id !== customerId);
    setCustomers(nextCustomers);
    StorageManager.saveCustomers(nextCustomers, true);
    try {
      await CloudSyncService.deleteCustomer(customerId);
    } catch (e) {
      console.warn('Cloud customer delete note:', e);
    }
  };

  // Handle debt payment (Abono)
  const handleRegisterPayment = async (payment: DebtPayment, updatedCustomer: Customer) => {
    const nextPayments = [payment, ...payments];
    const nextCustomers = customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);

    setPayments(nextPayments);
    setCustomers(nextCustomers);

    StorageManager.savePayments(nextPayments, true);
    StorageManager.saveCustomers(nextCustomers, true);

    try {
      await CloudSyncService.savePayment(payment, updatedCustomer);
    } catch (e) {
      console.warn('Cloud payment save note:', e);
    }

    // Open Receipt ticket
    setActiveTicketSale(null);
    setActiveTicketPayment(payment);
    setTicketCustomer(updatedCustomer);
  };

  // Handle settings update
  const handleSaveSettings = async (newSettings: PharmacySettings) => {
    setSettings(newSettings);
    StorageManager.saveSettings(newSettings, true);
    try {
      await CloudSyncService.saveSettings(newSettings);
    } catch (e) {
      console.warn('Cloud settings save note:', e);
    }
  };

  // Handle Cash Cut save
  const handleSaveCashCut = async (newCut: CashCut) => {
    const nextCuts = [newCut, ...cashCuts];
    setCashCuts(nextCuts);
    StorageManager.saveCashCuts(nextCuts, true);

    // Reset active shift with new initial cash
    const nextShift = {
      openedAt: new Date().toISOString(),
      initialCash: newCut.remainingCashForNextShift,
    };
    setActiveShift(nextShift);
    StorageManager.saveActiveShift(nextShift.openedAt, nextShift.initialCash);

    try {
      await CloudSyncService.saveCashCut(newCut);
    } catch (e) {
      console.warn('Cloud cash cut save error:', e);
    }
  };

  // Handle Cash Movement save (Entrada / Salida de efectivo)
  const handleSaveCashMovement = async (newMov: CashMovement) => {
    const nextMovs = [newMov, ...cashMovements];
    setCashMovements(nextMovs);
    StorageManager.saveCashMovements(nextMovs, true);

    try {
      await CloudSyncService.saveCashMovement(newMov);
    } catch (e) {
      console.warn('Cloud cash movement save error:', e);
    }
  };

  // Update initial cash for active shift
  const handleUpdateActiveInitialCash = (amount: number) => {
    const nextShift = {
      openedAt: activeShift.openedAt || new Date().toISOString(),
      initialCash: amount,
    };
    setActiveShift(nextShift);
    StorageManager.saveActiveShift(nextShift.openedAt, nextShift.initialCash);
  };

  // Handle Cancel / Refund of a Sale (with automatic restock + Kardex movement + debt deduction)
  const handleConfirmCancelSale = async (
    sale: Sale,
    reason: string,
    returnedItems: { productId: string; quantity: number }[]
  ) => {
    const isFull = returnedItems.length === sale.items.length && 
      returnedItems.every(ri => {
        const orig = sale.items.find(si => si.productId === ri.productId);
        return orig && orig.quantity === ri.quantity;
      });

    const now = new Date().toISOString();
    
    // Calculate refund amount
    const refundAmount = returnedItems.reduce((sum, ri) => {
      const orig = sale.items.find(si => si.productId === ri.productId);
      if (!orig) return sum;
      const unitP = orig.unitPrice * (1 - orig.discountPercentage / 100);
      return sum + (unitP * ri.quantity);
    }, 0);

    // 1. Updated Sale status
    const updatedSale: Sale = {
      ...sale,
      status: isFull ? 'cancelled' : 'refunded',
      cancelledAt: now,
      cancelledReason: reason,
      cancelledBy: 'Cajero / Farmacéutico',
      refundedAmount: refundAmount,
      refundedItems: returnedItems,
    };

    const nextSales = sales.map(s => s.id === sale.id ? updatedSale : s);
    setSales(nextSales);
    StorageManager.saveSales(nextSales, true);

    // 2. Restock products in inventory
    const updatedProducts = products.map(prod => {
      const returned = returnedItems.find(ri => ri.productId === prod.id);
      if (returned && returned.quantity > 0) {
        return {
          ...prod,
          stock: prod.stock + returned.quantity,
        };
      }
      return prod;
    });
    setProducts(updatedProducts);
    StorageManager.saveProducts(updatedProducts, true);

    // 3. Create Kardex Movement (Entrada por Devolución de Cliente)
    const restockedProductsList = updatedProducts.filter(p => 
      returnedItems.some(ri => ri.productId === p.id && ri.quantity > 0)
    );

    const movementItems = returnedItems.map(ri => {
      const p = products.find(prod => prod.id === ri.productId);
      const cost = p?.costPrice || 0;
      return {
        productId: ri.productId,
        productName: p?.name || 'Producto Devuelto',
        quantity: ri.quantity,
        costPrice: cost,
        subtotal: ri.quantity * cost,
        batchNumber: p?.batchNumber,
        expirationDate: p?.expirationDate,
      };
    });

    const totalValue = movementItems.reduce((sum, it) => sum + it.subtotal, 0);

    const reversalMovement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      folio: generateFolio('ENT', movements.length + 1),
      type: 'entry',
      reason: 'devolucion_cliente',
      date: now,
      items: movementItems,
      totalValue,
      registeredBy: 'Cajero / Devolución',
      notes: `Devolución aplicada a ticket ${sale.folio}. Motivo: ${reason}`,
    };

    const nextMovements = [reversalMovement, ...movements];
    setMovements(nextMovements);
    StorageManager.saveMovements(nextMovements, true);

    // 4. Update customer debt if credit sale
    let updatedCustomer: Customer | undefined = undefined;
    if (sale.isCredit && sale.customerId) {
      const cust = customers.find(c => c.id === sale.customerId);
      if (cust) {
        updatedCustomer = {
          ...cust,
          currentDebt: Math.max(0, cust.currentDebt - refundAmount),
        };
        const nextCustomers = customers.map(c => c.id === updatedCustomer!.id ? updatedCustomer! : c);
        setCustomers(nextCustomers);
        StorageManager.saveCustomers(nextCustomers, true);
      }
    }

    // 5. Cloud Sync with Firestore
    try {
      await CloudSyncService.cancelSaleInCloud(
        updatedSale,
        restockedProductsList,
        reversalMovement,
        updatedCustomer
      );
    } catch (err) {
      console.warn('Cloud sync cancel sale note:', err);
    }
  };

  const handleAddNewProductWithPhoto = (photoBase64: string, detectedName?: string) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      code: `ART-${randomSuffix}`,
      barcode: `750${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name: detectedName || 'Nuevo Artículo / Producto',
      description: 'Producto registrado mediante captura de fotografía sin código de barras.',
      unitOfMeasure: 'Pieza',
      presentation: 'Pieza individual',
      category: 'Otro',
      department: 'otros',
      costPrice: 10,
      sellingPrice: 20,
      stock: 10,
      minStock: 3,
      prescriptionRequired: false,
      photoUrl: photoBase64,
      createdAt: new Date().toISOString(),
    };

    handleSaveProduct(newProd);
    setActiveTab('inventory');
  };

  const refreshAllData = useCallback(() => {
    setProducts(StorageManager.getProducts());
    setCustomers(StorageManager.getCustomers());
    setSales(StorageManager.getSales());
    setMovements(StorageManager.getMovements());
    setPayments(StorageManager.getPayments());
    setSettings(StorageManager.getSettings());
    setCashCuts(StorageManager.getCashCuts());
    setCashMovements(StorageManager.getCashMovements());
    setActiveShift(StorageManager.getActiveShift());
  }, []);

  const handleForceSyncAll = async () => {
    const currentProducts = products.length > 0 ? products : StorageManager.getProducts();
    const currentCustomers = customers.length > 0 ? customers : StorageManager.getCustomers();
    const currentSales = sales.length > 0 ? sales : StorageManager.getSales();
    const currentMovements = movements.length > 0 ? movements : StorageManager.getMovements();
    const currentPayments = payments.length > 0 ? payments : StorageManager.getPayments();
    const currentSettings = settings;
    const currentCashCuts = cashCuts.length > 0 ? cashCuts : StorageManager.getCashCuts();
    const currentCashMovs = cashMovements.length > 0 ? cashMovements : StorageManager.getCashMovements();

    const res = await CloudSyncService.syncAllLocalToCloud({
      products: currentProducts,
      customers: currentCustomers,
      sales: currentSales,
      movements: currentMovements,
      payments: currentPayments,
      settings: currentSettings,
      cashCuts: currentCashCuts,
      cashMovements: currentCashMovs,
    });
    setIsCloudConnected(true);
    return res;
  };

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    handleForceSyncAll().catch(console.warn);
    refreshAllData();
  };

  const handleLogout = () => {
    StorageManager.logout();
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white">
      
      {/* Top Bar Navigation with live cloud status */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        products={products}
        customers={customers}
        onQuickNewSale={() => {
          setActiveTab('pos');
        }}
        onOpenPhotoSearch={() => setIsPhotoSearchOpen(true)}
        onOpenCashCut={() => setIsCashCutOpen(true)}
        isCloudConnected={isCloudConnected}
        onForceSyncToCloud={handleForceSyncAll}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 md:pb-6">
        {activeTab === 'pos' && (
          <POSView
            products={products}
            customers={customers}
            settings={settings}
            salesCount={sales.length}
            onCompleteSale={handleCompleteSale}
            onOpenCustomerRegistration={() => {
              setActiveTab('customers');
              setOpenCustomerModalDirectly(true);
            }}
            onOpenPhotoSearch={() => setIsPhotoSearchOpen(true)}
            onOpenCashCut={() => setIsCashCutOpen(true)}
            onOpenCancelSale={() => {
              setActiveTab('reports');
            }}
            initialProductToAdd={productForPOSCart}
            onClearInitialProduct={() => setProductForPOSCart(null)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            settings={settings}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onRegisterMovement={handleRegisterMovement}
            movementsCount={movements.length}
            onOpenPhotoSearch={() => setIsPhotoSearchOpen(true)}
            customers={customers}
            sales={sales}
            movements={movements}
            payments={payments}
            cashCuts={cashCuts}
          />
        )}

        {activeTab === 'movements' && (
          <MovementsView
            movements={movements}
            products={products}
            settings={settings}
            movementsCount={movements.length}
            onRegisterMovement={handleRegisterMovement}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            sales={sales}
            payments={payments}
            settings={settings}
            paymentsCount={payments.length}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onRegisterPayment={handleRegisterPayment}
            isAddModalInitiallyOpen={openCustomerModalDirectly}
            onCloseInitialAddModal={() => setOpenCustomerModalDirectly(false)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            sales={sales}
            movements={movements}
            customers={customers}
            products={products}
            payments={payments}
            settings={settings}
            onOpenSaleTicket={(sale) => {
              const cust = customers.find(c => c.id === sale.customerId) || null;
              setActiveTicketSale(sale);
              setTicketCustomer(cust);
            }}
            onCancelSale={(sale) => setSaleToCancel(sale)}
            onOpenCashCut={() => setIsCashCutOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onRefreshData={refreshAllData}
            isCloudConnected={isCloudConnected}
            onForceSyncToCloud={handleForceSyncAll}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onLogout={handleLogout}
            counts={{
              products: products.length,
              customers: customers.length,
              sales: sales.length,
              movements: movements.length,
              payments: payments.length,
              cashCuts: cashCuts.length,
            }}
            onWipeAllData={() => {
              setProducts([]);
              setCustomers([]);
              setSales([]);
              setMovements([]);
              setPayments([]);
              setCashCuts([]);
              setCashMovements([]);
              CloudSyncService.wipeAllDataFromCloud(true).catch(console.warn);
            }}
            onLoadDemoData={() => {
              const demoProducts = StorageManager.getProducts();
              const demoCustomers = StorageManager.getCustomers();
              setProducts(demoProducts);
              setCustomers(demoCustomers);
              CloudSyncService.saveProductsBatch(demoProducts).catch(console.warn);
              CloudSyncService.saveCustomersBatch(demoCustomers).catch(console.warn);
            }}
          />
        )}
      </main>

      {/* User Login & Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={currentUser}
        isBlocking={false}
      />

      {/* Photo Visual Search Modal */}
      {isPhotoSearchOpen && (
        <PhotoSearchModal
          isOpen={isPhotoSearchOpen}
          onClose={() => setIsPhotoSearchOpen(false)}
          products={products}
          onSelectProductForPOS={(prod) => {
            setProductForPOSCart(prod);
            setActiveTab('pos');
            setIsPhotoSearchOpen(false);
          }}
          onSelectProductForInventory={(prod) => {
            setActiveTab('inventory');
            setIsPhotoSearchOpen(false);
          }}
          onAddNewWithPhoto={handleAddNewProductWithPhoto}
        />
      )}

      {/* Cash Cut / Arqueo de Caja Modal */}
      {isCashCutOpen && (
        <CashCutModal
          isOpen={isCashCutOpen}
          onClose={() => setIsCashCutOpen(false)}
          sales={sales}
          payments={payments}
          cashMovements={cashMovements}
          cashCuts={cashCuts}
          settings={settings}
          activeShift={activeShift}
          onSaveCashCut={handleSaveCashCut}
          onSaveCashMovement={handleSaveCashMovement}
          onUpdateActiveInitialCash={handleUpdateActiveInitialCash}
        />
      )}

      {/* Cancel Sale / Refund Modal */}
      {saleToCancel && (
        <CancelSaleModal
          isOpen={!!saleToCancel}
          onClose={() => setSaleToCancel(null)}
          sale={saleToCancel}
          settings={settings}
          onConfirmCancel={handleConfirmCancelSale}
        />
      )}

      {/* Ticket & Receipt Modal */}
      {(activeTicketSale || activeTicketPayment) && (
        <TicketModal
          sale={activeTicketSale}
          payment={activeTicketPayment}
          settings={settings}
          customer={ticketCustomer}
          onClose={() => {
            setActiveTicketSale(null);
            setActiveTicketPayment(null);
            setTicketCustomer(null);
          }}
        />
      )}

      {/* Print Stylesheet overrides */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-ticket, #printable-ticket * {
            visibility: visible;
          }
          #printable-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
