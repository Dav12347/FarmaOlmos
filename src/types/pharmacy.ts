export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';

export type MovementType = 'entry' | 'exit';

export type MovementReason = 
  | 'compra' 
  | 'ajuste_inventario' 
  | 'devolucion_cliente' 
  | 'donacion' 
  | 'merma' 
  | 'caducidad' 
  | 'uso_interno' 
  | 'danado' 
  | 'ajuste_negativo';

export type ProductDepartment = 'farmacia' | 'bebidas' | 'dulces' | 'botanas' | 'higiene' | 'otros';

export interface CustomerDocument {
  id: string;
  name: string;
  type: 'photo' | 'pdf';
  fileData: string; // Base64 data URL
  fileSize?: string;
  category: 'Identificación / INE' | 'Receta Médica' | 'Convenio / Formato' | 'Comprobante Domicilio' | 'Otro';
  uploadDate: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  idNumber?: string; // CURP / RFC / DNI
  creditLimit: number;
  currentDebt: number;
  notes?: string;
  createdAt: string;
  documents: CustomerDocument[];
}

export interface Product {
  id: string;
  code: string; // Unique product code / SKU / barcode
  barcode: string; // Barcode (or code if no physical barcode)
  name: string;
  description?: string; // Detailed product description / indications
  unitOfMeasure: string; // Unidad de medida (e.g. "Pieza", "Caja", "Frasco", "Tabletas", "Botella", "Bolsa", "Lata", "Barra")
  genericName?: string;
  activeIngredient?: string;
  presentation: string; // e.g. "Caja con 20 tabletas", "Botella 600ml", "Bolsa 45g"
  category: string; // "Analgésicos", "Antibióticos", "Bebidas y Aguas", "Dulces y Golosinas", "Botanas y Snacks", "Cuidado e Higiene", etc.
  department?: ProductDepartment;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  batchNumber?: string;
  expirationDate?: string; // YYYY-MM-DD
  laboratory?: string; // e.g. "Bruluar", "Wermar", "Novag", "Maver", "Sons", "Amsa", "Mavi", "Collins", "Biomep", "Liferpa", "Raam", "Loeffler"
  satCode?: string; // Clave SAT e.g. "51101511", "51161800"
  prescriptionRequired: boolean;
  location?: string;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  subtotal: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  presentation: string;
  genericName?: string;
  batchNumber?: string;
  quantity: number;
  costPrice: number;
  unitPrice: number;
  discountPercentage: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  folio: string;
  date: string; // ISO String
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  customerId?: string;
  customerName?: string;
  seller: string;
  notes?: string;
  isCredit: boolean;
  isSettled: boolean; // if credit was settled later
  status?: 'completed' | 'cancelled' | 'refunded';
  cancelledAt?: string;
  cancelledReason?: string;
  cancelledBy?: string;
  refundedAmount?: number;
  refundedItems?: { productId: string; quantity: number }[];
}

export interface CashMovement {
  id: string;
  folio: string;
  type: 'in' | 'out'; // 'in' = Entrada de efectivo / 'out' = Salida/Gasto de caja
  amount: number;
  reason: string;
  date: string; // ISO string
  registeredBy: string;
  notes?: string;
}

export interface CashDenominationCount {
  b1000: number;
  b500: number;
  b200: number;
  b100: number;
  b50: number;
  b20: number;
  m20: number;
  m10: number;
  m5: number;
  m2: number;
  m1: number;
  m05: number;
}

export interface CashCut {
  id: string;
  folio: string;
  openedAt: string;
  closedAt: string;
  cashier: string;
  initialCash: number; // Fondo inicial de caja

  // Ventas por método
  cashSalesTotal: number;
  cardSalesTotal: number;
  transferSalesTotal: number;
  creditSalesTotal: number;
  totalSalesCount: number;

  // Abonos de crédito cobrados
  debtPaymentsCashTotal: number;
  debtPaymentsCardTotal: number;
  debtPaymentsTransferTotal: number;

  // Movimientos de efectivo manuales
  cashInTotal: number;
  cashOutTotal: number;

  // Cancelaciones y devoluciones
  cancelledCashSalesTotal: number;
  refundedCashTotal: number;

  // Resumen del arqueo
  expectedCash: number; // Efectivo que debería haber en el cajón
  actualCashCount: number; // Efectivo real contado físicamente
  difference: number; // actualCashCount - expectedCash (0 = exacto, >0 sobrante, <0 faltante)

  // Retiro y fondo siguiente turno
  cashWithdrawal: number;
  remainingCashForNextShift: number;

  notes?: string;
  denominations?: CashDenominationCount;
}

export interface MovementItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  subtotal: number;
  batchNumber?: string;
  expirationDate?: string;
  laboratory?: string;
  satCode?: string;
}

export interface InventoryMovement {
  id: string;
  folio: string;
  type: MovementType;
  reason: MovementReason;
  date: string;
  items: MovementItem[];
  totalValue: number;
  supplierOrDestination?: string;
  referenceInvoice?: string;
  notes?: string;
  registeredBy: string;
  attachmentUrl?: string;
  attachmentType?: 'photo' | 'pdf';
}

export interface SupplierTicketItem {
  id?: string;
  name: string;
  barcode?: string;
  code?: string;
  quantity: number;
  costPrice: number;
  suggestedSellingPrice: number;
  batchNumber?: string;
  expirationDate?: string;
  presentation?: string;
  unitOfMeasure?: string;
  category?: string;
  department?: ProductDepartment;
  prescriptionRequired?: boolean;
  laboratory?: string;
  satCode?: string;
  taxRate?: number;
  totalImport?: number;
  matchedProductId?: string;
  isNewProduct?: boolean;
}

export interface SupplierTicketParsedResult {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  items: SupplierTicketItem[];
  rawText?: string;
}

export interface DebtPayment {
  id: string;
  folio: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'card' | 'transfer';
  previousDebt: number;
  remainingDebt: number;
  notes?: string;
  registeredBy: string;
}

export interface PharmacySettings {
  name: string;
  commercialName: string;
  rfc: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  licenseNumber: string;
  ticketMessage: string;
  currencySymbol: string;
  taxRate: number; // e.g. 0.16 or 0
  allowDebtExceedLimit: boolean;
  // WhatsApp Alert & Automation Configuration
  whatsappAlertPhone?: string; // e.g. "5573501782"
  whatsappCountryCode?: string; // default "52"
  whatsappAlertsEnabled?: boolean;
  whatsappAlertExpiryDays?: number; // default 30 days
  whatsappAlertIncludeLowStock?: boolean;
  whatsappAlertIncludeOutOfStock?: boolean;
  whatsappAlertIncludeExpired?: boolean;
  whatsappAlertIncludeExpiring?: boolean;
  whatsappAutoSendTicket?: boolean; // Auto open/send ticket on sale
  whatsappAutoSendCashCut?: boolean; // Auto send cash cut summary on shift close
  whatsappAutoSendCancellation?: boolean; // Auto send alert on cancelled sale
}

export type UserRole = 'admin' | 'pharmacist' | 'cashier';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  branchName: string;
  lastLogin?: string;
  avatarColor?: string;
}

export interface AuthSession {
  user: AppUser;
  token?: string;
  rememberMe: boolean;
  loggedAt: string;
}
