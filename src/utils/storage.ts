import { Product, Customer, Sale, InventoryMovement, DebtPayment, PharmacySettings, CashCut, CashMovement, AppUser } from '../types/pharmacy';
import { CloudSyncService } from '../firebase';

export const DEFAULT_USERS: { user: AppUser; passwordHash: string }[] = [
  {
    user: {
      id: 'usr-farmaolmos',
      username: 'farmaolmos',
      name: 'David Olmos (FarmaOlmos)',
      email: 'farmaolmos@farmacia.com',
      role: 'admin',
      branchName: 'FarmaOlmos - Sucursal Matriz',
      avatarColor: 'teal',
    },
    passwordHash: 'david06',
  },
  {
    user: {
      id: 'usr-cajero',
      username: 'cajero',
      name: 'Cajero / Mostrador',
      email: 'caja@farmaolmos.com',
      role: 'cashier',
      branchName: 'FarmaOlmos - Sucursal Matriz',
      avatarColor: 'blue',
    },
    passwordHash: '1234',
  },
];

export const DEFAULT_SETTINGS: PharmacySettings = {
  name: 'Mi Farmacia',
  commercialName: 'Control de Farmacia & Punto de Venta',
  rfc: '',
  phone: '5573501782',
  email: '',
  address: '',
  city: '',
  licenseNumber: '',
  ticketMessage: '¡Gracias por su compra! Cuide su salud.',
  currencySymbol: '$',
  taxRate: 0,
  allowDebtExceedLimit: false,
  whatsappAlertPhone: '5573501782',
  whatsappCountryCode: '52',
  whatsappAlertsEnabled: true,
  whatsappAlertExpiryDays: 30,
  whatsappAlertIncludeLowStock: true,
  whatsappAlertIncludeOutOfStock: true,
  whatsappAlertIncludeExpired: true,
  whatsappAlertIncludeExpiring: true,
};

// Clean/Virgin System Initial State (0 products, 0 customers, 0 sales, 0 movements, 0 debt)
export const SAMPLE_PRODUCTS: Product[] = [];
export const SAMPLE_CUSTOMERS: Customer[] = [];
export const SAMPLE_SALES: Sale[] = [];
export const SAMPLE_MOVEMENTS: InventoryMovement[] = [];
export const SAMPLE_PAYMENTS: DebtPayment[] = [];
export const SAMPLE_CASH_CUTS: CashCut[] = [];
export const SAMPLE_CASH_MOVEMENTS: CashMovement[] = [];

// Optional Demo Catalog (Available if user ever clicks "Cargar datos demo" in Settings)
export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-prod-1',
    code: 'MED-7501001',
    barcode: '7501008492011',
    name: 'Paracetamol 500mg',
    description: 'Analgésico y antipirético para alivio de dolores moderados a leves y fiebre.',
    unitOfMeasure: 'Caja (20 tabletas)',
    genericName: 'Paracetamol',
    activeIngredient: 'Paracetamol',
    presentation: 'Caja con 20 tabletas',
    category: 'Analgésicos',
    department: 'farmacia',
    costPrice: 18.50,
    sellingPrice: 38.00,
    stock: 45,
    minStock: 15,
    batchNumber: 'L-24098A',
    expirationDate: '2027-10-15',
    prescriptionRequired: false,
    location: 'Estante A-1',
    photoUrl: '',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'demo-prod-2',
    code: 'MED-7501002',
    barcode: '7501008492028',
    name: 'Amoxicilina / Ác. Clavulánico 500/125mg',
    description: 'Antibiótico de amplio espectro para infecciones del tracto respiratorio y urinario.',
    unitOfMeasure: 'Caja (14 tabletas)',
    genericName: 'Amoxicilina + Ácido Clavulánico',
    activeIngredient: 'Amoxicilina 500mg / Clavulanato 125mg',
    presentation: 'Caja con 14 tabletas',
    category: 'Antibióticos',
    department: 'farmacia',
    costPrice: 95.00,
    sellingPrice: 165.00,
    stock: 18,
    minStock: 10,
    batchNumber: 'L-24115B',
    expirationDate: '2026-11-20',
    prescriptionRequired: true,
    location: 'Estante Antibióticos B-3',
    photoUrl: '',
    createdAt: '2026-01-12T11:00:00Z',
  },
  {
    id: 'demo-prod-3',
    code: 'MED-7501003',
    barcode: '7501008492035',
    name: 'Ibuprofeno 400mg',
    description: 'Antiinflamatorio no esteroideo (AINE) con acción analgésica rápida.',
    unitOfMeasure: 'Caja (10 cápsulas)',
    genericName: 'Ibuprofeno',
    activeIngredient: 'Ibuprofeno',
    presentation: 'Caja con 10 cápsulas blandas',
    category: 'Analgésicos',
    department: 'farmacia',
    costPrice: 28.00,
    sellingPrice: 55.00,
    stock: 8,
    minStock: 12,
    batchNumber: 'L-24077C',
    expirationDate: '2026-09-10',
    prescriptionRequired: false,
    location: 'Estante A-2',
    photoUrl: '',
    createdAt: '2026-01-15T09:30:00Z',
  },
  {
    id: 'demo-prod-4',
    code: 'CONV-7501055',
    barcode: '7501055300078',
    name: 'Coca-Cola Original 600ml',
    description: 'Refresco sabor cola en botella PET no retornable.',
    unitOfMeasure: 'Botella (600ml)',
    genericName: 'Refresco de cola',
    activeIngredient: '',
    presentation: 'Botella PET 600ml',
    category: 'Bebidas y Aguas',
    department: 'bebidas',
    costPrice: 13.50,
    sellingPrice: 19.00,
    stock: 36,
    minStock: 12,
    batchNumber: 'BEB-2603',
    expirationDate: '2027-08-01',
    prescriptionRequired: false,
    location: 'Refrigerador / Pasillo Central',
    photoUrl: '',
    createdAt: '2026-03-01T08:00:00Z',
  }
];

export const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'demo-cust-1',
    name: 'Cliente Mostrador / Ejemplo',
    phone: '55-0000-0000',
    email: '',
    address: 'Conocido',
    notes: 'Cuenta de ejemplo para crédito',
    creditLimit: 1000,
    currentDebt: 0,
    createdAt: '2026-01-05T00:00:00Z',
    documents: [],
  }
];

const STORAGE_KEYS = {
  PRODUCTS: 'farmacontrol_products_v1',
  CUSTOMERS: 'farmacontrol_customers_v1',
  SALES: 'farmacontrol_sales_v1',
  MOVEMENTS: 'farmacontrol_movements_v1',
  PAYMENTS: 'farmacontrol_debt_payments_v1',
  SETTINGS: 'farmacontrol_settings_v1',
  CASH_CUTS: 'farmacontrol_cash_cuts_v1',
  CASH_MOVEMENTS: 'farmacontrol_cash_movements_v1',
  ACTIVE_SHIFT_START: 'farmacontrol_active_shift_start_v1',
  ACTIVE_INITIAL_CASH: 'farmacontrol_active_initial_cash_v1',
  VIRGIN_INITIALIZED: 'farmacontrol_virgin_mode_applied_v1',
  CURRENT_USER: 'farmacontrol_current_user_v1',
  CUSTOM_USERS: 'farmacontrol_custom_users_v1',
};

export class StorageManager {
  static getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading products cache', e);
      return [];
    }
  }

  static saveProducts(products: Product[], skipCloud = false): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
    if (!skipCloud) {
      CloudSyncService.saveProductsBatch(products).catch(err => {
        console.warn('Realtime cloud batch product save note:', err);
      });
    }
  }

  static getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading customers cache', e);
      return [];
    }
  }

  static saveCustomers(customers: Customer[], skipCloud = false): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
    if (!skipCloud) {
      customers.forEach(c => CloudSyncService.saveCustomer(c).catch(console.warn));
    }
  }

  static getSales(): Sale[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading sales cache', e);
      return [];
    }
  }

  static saveSales(sales: Sale[], skipCloud = false): void {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
  }

  static getMovements(): InventoryMovement[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading movements cache', e);
      return [];
    }
  }

  static saveMovements(movements: InventoryMovement[], skipCloud = false): void {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
  }

  static getPayments(): DebtPayment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading payments cache', e);
      return [];
    }
  }

  static savePayments(payments: DebtPayment[], skipCloud = false): void {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
  }

  static getCashCuts(): CashCut[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CASH_CUTS);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading cash cuts cache', e);
      return [];
    }
  }

  static saveCashCuts(cuts: CashCut[], skipCloud = false): void {
    localStorage.setItem(STORAGE_KEYS.CASH_CUTS, JSON.stringify(cuts));
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
    if (!skipCloud) {
      cuts.forEach(cut => CloudSyncService.saveCashCut(cut).catch(console.warn));
    }
  }

  static getCashMovements(): CashMovement[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CASH_MOVEMENTS);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading cash movements cache', e);
      return [];
    }
  }

  static saveCashMovements(movements: CashMovement[], skipCloud = false): void {
    localStorage.setItem(STORAGE_KEYS.CASH_MOVEMENTS, JSON.stringify(movements));
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
    if (!skipCloud) {
      movements.forEach(m => CloudSyncService.saveCashMovement(m).catch(console.warn));
    }
  }

  static getActiveShift(): { openedAt: string; initialCash: number } {
    try {
      const openedAt = localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFT_START) || new Date().toISOString();
      const initialCash = parseFloat(localStorage.getItem(STORAGE_KEYS.ACTIVE_INITIAL_CASH) || '500');
      return { openedAt, initialCash };
    } catch {
      return { openedAt: new Date().toISOString(), initialCash: 500 };
    }
  }

  static saveActiveShift(openedAt: string, initialCash: number): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SHIFT_START, openedAt);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_INITIAL_CASH, initialCash.toString());
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
  }

  static getSettings(): PharmacySettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        return DEFAULT_SETTINGS;
      }
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        whatsappAlertPhone: parsed.whatsappAlertPhone || DEFAULT_SETTINGS.whatsappAlertPhone,
        whatsappCountryCode: parsed.whatsappCountryCode || DEFAULT_SETTINGS.whatsappCountryCode,
        whatsappAlertExpiryDays: parsed.whatsappAlertExpiryDays ?? DEFAULT_SETTINGS.whatsappAlertExpiryDays,
      };
    } catch (e) {
      console.error('Error reading settings cache', e);
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: PharmacySettings, skipCloud = false): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
    if (!skipCloud) {
      CloudSyncService.saveSettings(settings).catch(console.warn);
    }
  }

  // User Authentication & Session
  static getCurrentUser(): AppUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading current user session', e);
      return null;
    }
  }

  static setCurrentUser(user: AppUser | null, remember: boolean = true): void {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      const serialized = JSON.stringify(user);
      if (remember) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, serialized);
      } else {
        sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, serialized);
      }
    }
    window.dispatchEvent(new Event('farmacontrol_auth_updated'));
  }

  static validateAndLogin(usernameOrEmail: string, passwordInput: string, remember: boolean = true): { success: boolean; user?: AppUser; message?: string } {
    const cleanUser = usernameOrEmail.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    // Check against FarmaOlmos / default accounts
    const match = DEFAULT_USERS.find(u => 
      (u.user.username.toLowerCase() === cleanUser || (u.user.email && u.user.email.toLowerCase() === cleanUser)) &&
      u.passwordHash === cleanPass
    );

    if (match) {
      const loggedUser: AppUser = {
        ...match.user,
        lastLogin: new Date().toISOString(),
      };
      this.setCurrentUser(loggedUser, remember);
      return { success: true, user: loggedUser };
    }

    // Check custom registered users if any
    try {
      const customRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_USERS);
      if (customRaw) {
        const customUsers: { user: AppUser; passwordHash: string }[] = JSON.parse(customRaw);
        const cMatch = customUsers.find(u => 
          (u.user.username.toLowerCase() === cleanUser || (u.user.email && u.user.email.toLowerCase() === cleanUser)) &&
          u.passwordHash === cleanPass
        );
        if (cMatch) {
          const loggedUser: AppUser = {
            ...cMatch.user,
            lastLogin: new Date().toISOString(),
          };
          this.setCurrentUser(loggedUser, remember);
          return { success: true, user: loggedUser };
        }
      }
    } catch (e) {
      console.warn('Error reading custom users:', e);
    }

    return { 
      success: false, 
      message: 'Usuario o contraseña incorrectos. Verifique sus credenciales (ej. farmaolmos / david06).' 
    };
  }

  static registerCustomUser(user: AppUser, passwordInput: string): boolean {
    try {
      const customRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_USERS);
      const list: { user: AppUser; passwordHash: string }[] = customRaw ? JSON.parse(customRaw) : [];
      list.push({ user, passwordHash: passwordInput.trim() });
      localStorage.setItem(STORAGE_KEYS.CUSTOM_USERS, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Error saving custom user', e);
      return false;
    }
  }

  static logout(): void {
    this.setCurrentUser(null);
  }

  // Wipes all data to leave system completely clean/virgin (ONLY when user explicitly requests it in Settings)
  static wipeAllData(keepSettings: boolean = true): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CASH_CUTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CASH_MOVEMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VIRGIN_INITIALIZED, 'true');

    if (!keepSettings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    // Purge Firestore Cloud collections
    CloudSyncService.wipeAllDataFromCloud(keepSettings).catch(console.warn);

    window.dispatchEvent(new Event('farmacontrol_data_updated'));
  }

  // Clears all exit movements (salidas de inventario) leaving 0 salidas
  static wipeAllExits(): void {
    const currentMovements = this.getMovements();
    const onlyEntries = currentMovements.filter(m => m.type !== 'exit');
    this.saveMovements(onlyEntries, true);
    CloudSyncService.wipeExitMovementsFromCloud().catch(console.warn);
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
  }

  // Clears all test inventory movements and test cash movements leaving the system 100% clean and virgin
  static wipeAllTestMovements(): void {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CASH_MOVEMENTS, JSON.stringify([]));
    CloudSyncService.wipeMovementsFromCloud().catch(console.warn);
    CloudSyncService.wipeCashMovementsFromCloud().catch(console.warn);
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
  }

  // Clears all payments and resets any outstanding debts while keeping products and sales completely intact
  static wipePaymentsAndResetDebts(): void {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    try {
      const customers = this.getCustomers().map(c => ({ ...c, currentDebt: 0 }));
      this.saveCustomers(customers);
    } catch (e) {
      console.warn('Error clearing customer debts:', e);
    }
    CloudSyncService.wipePaymentsFromCloud().catch(console.warn);
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
  }

  // Safe startup check that clears old test abonos/payments, test movements and exits to leave system virgin
  static ensureVirginModeOnStartup(): void {
    const isExitsClean = localStorage.getItem('farmacontrol_exits_purged_v2');
    if (!isExitsClean) {
      this.wipeAllExits();
      localStorage.setItem('farmacontrol_exits_purged_v2', 'true');
    }

    const isMovementsClean = localStorage.getItem('farmacontrol_test_movements_purged_v2');
    if (!isMovementsClean) {
      this.wipeAllTestMovements();
      localStorage.setItem('farmacontrol_test_movements_purged_v2', 'true');
    }

    const isClean = localStorage.getItem('farmacontrol_abonos_purged_v2');
    if (!isClean) {
      this.wipePaymentsAndResetDebts();
      localStorage.setItem('farmacontrol_abonos_purged_v2', 'true');
    }
    const isVirgin = localStorage.getItem(STORAGE_KEYS.VIRGIN_INITIALIZED);
    if (!isVirgin) {
      localStorage.setItem(STORAGE_KEYS.VIRGIN_INITIALIZED, 'true');
    }
  }

  static resetToDefault(): void {
    this.wipeAllData(true);
  }

  // Load demo items if user explicitly wants demo data
  static loadDemoCatalog(): void {
    this.saveProducts(DEMO_PRODUCTS);
    this.saveCustomers(DEMO_CUSTOMERS);
    localStorage.setItem(STORAGE_KEYS.VIRGIN_INITIALIZED, 'true');
    window.dispatchEvent(new Event('farmacontrol_data_updated'));
  }

  static exportBackupJSON(): string {
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      sales: this.getSales(),
      movements: this.getMovements(),
      payments: this.getPayments(),
      cashCuts: this.getCashCuts(),
      cashMovements: this.getCashMovements(),
      settings: this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  }

  static importBackupJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.products) {
        this.saveProducts(parsed.products);
      }
      if (parsed.customers) {
        this.saveCustomers(parsed.customers);
      }
      if (parsed.sales) {
        this.saveSales(parsed.sales);
        parsed.sales.forEach((s: Sale) => CloudSyncService.saveSale(s).catch(console.warn));
      }
      if (parsed.movements) {
        this.saveMovements(parsed.movements);
        parsed.movements.forEach((m: InventoryMovement) => CloudSyncService.saveMovement(m).catch(console.warn));
      }
      if (parsed.payments) {
        this.savePayments(parsed.payments);
      }
      if (parsed.cashCuts) {
        this.saveCashCuts(parsed.cashCuts);
      }
      if (parsed.cashMovements) {
        this.saveCashMovements(parsed.cashMovements);
      }
      if (parsed.settings) {
        this.saveSettings(parsed.settings);
      }
      localStorage.setItem(STORAGE_KEYS.VIRGIN_INITIALIZED, 'true');
      window.dispatchEvent(new Event('farmacontrol_data_updated'));
      return true;
    } catch (e) {
      console.error('Failed to import backup', e);
      return false;
    }
  }
}
