export interface BillCreator {
  id: string;
  name: string;
  password?: string;
  type?: "Creator" | "Employee" | "CA" | "Expo"; // Added types
  expoId?: string; // For segmented views
  permissions?: string[]; // Array of paths or keys they can access
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchAndIFSC: string;
  upiId?: string;
  isDefault?: boolean;
}

export interface CompanyProfile {
  id: string;
  name: string;
  address: string;
  gstin: string;
  state: string;
  stateCode: string;
  phone: string;
  email: string;
  logo?: string;
  upiId?: string; // Legacy: UPI ID for "Scan & Pay" QR on bills (e.g., name@bank)
  defaultUnit?: string; // Default unit for new products
  unitOptions?: string[]; // Allowed product units
  bankDetails?: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    branchAndIFSC: string;
  };
  themeColor: string;
  gstEnabled: boolean; // GST on/off toggle
  defaultNote?: string; // Default note for bills
  commissionSettings?: {
    defaultCommissionRate: number; // Default commission percentage
    commissionType: "percentage" | "fixed"; // Commission calculation type
    fixedCommissionAmount?: number; // Fixed commission amount (if type is fixed)
  };
  expenseCategories?: string[]; // Custom expense categories
  billCreators?: string[]; // Names of people who can create bills (legacy)
}

export interface Client {
  id: string;
  name: string;
  billingAddress: string;
  shippingAddress?: string;
  gstin: string;
  state: string;
  stateCode: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface Product {
  whereToBuy: string;
  weight: number;
  weightUnit?: string;
  id: string;
  name: string;
  hsnCode: string;
  gstRate: number;
  unit: string;
  price: number; // Selling price (legacy support)
  purchasePrice: number; // Cost price from purchase
  sellingPrice: number; // Selling price for bills
  stock: number;
  expoStocks?: Record<string, number>; // Expo-wise stock levels: { [expoId]: quantity }
  createdAt: string;
  absorbedLoss?: number;
  imageUrl?: string;
}

export interface BillItem {
  productId: string;
  productName: string;
  hsnCode: string;
  gstRate: number;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export type PaymentMethod = "Cash" | "Bank Transfer" | "UPI" | "Cheque" | "Other";

export interface PaymentTransaction {
  id: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  note?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  date: string;
  clientId: string;
  client: Client;
  items: BillItem[];
  subtotal: number;
  totalTax: number;
  discount?: number;
  discountType?: "amount" | "percentage";
  otherCharges?: number;
  expenses?: number;
  roundOff: number;
  total: number;
  createdBy?: string;
  expoId?: string; // Track which expo this bill belongs to
  paymentTerms: number;
  dueDate: string;
  paymentStatus: "paid" | "pending" | "overdue" | "overpaid";
  paidAmount: number;
  paymentType?: PaymentMethod; // For legacy support/display
  payments: PaymentTransaction[]; // Required field for multiple payments
  gstType: "igst" | "cgst_sgst";
  notes?: string;
  returnComment?: string;
  deliveryNote?: string;
  modeOfPayment?: string;
  placeOfSupply?: string;
  createdAt: string;
  updatedAt: string;
  originalItems?: BillItem[];
  bankAccountId?: string;
  bankAccount?: BankAccount;

  // International Bill Fields
  billType?: "domestic" | "international"; // Bill type selection
  internationalDetails?: {
    preCarriageBy?: string; // Pre-Carriage By
    vesselsFlightNo?: string; // Vessels/Flight No.
    portOfDischarge?: string; // Port of Discharge
    placeOfReceiptByPreCarriage?: string; // Place Of Receipt By Pre-Carriage
    portOfLoading?: string; // Port of Loading
    finalDestination?: string; // Final Destination
    grossWeight?: number; // Gross Weight
    netWeight?: number; // Net Weight
    countryOfOrigin?: string; // Country Of Origin Of Goods
    countryOfFinalDestination?: string; // Country Of Final Destination
  };
}

export interface SampleBill {
  id: string;
  billNumber: string;
  date: string;
  clientId: string;
  client: Client;
  items: BillItem[];
  subtotal: number;
  totalTax: number;
  discount?: number;
  discountType?: "amount" | "percentage";
  otherCharges?: number;
  roundOff: number;
  total: number;
  createdBy?: string;
  paymentTerms: number;
  dueDate: string;
  paymentStatus: "paid" | "pending" | "overdue" | "overpaid";
  paidAmount: number;
  paymentType?: PaymentMethod; // For legacy support/display
  payments: PaymentTransaction[]; // Required field for multiple payments
  gstType: "igst" | "cgst_sgst";
  notes?: string;
  deliveryNote?: string;
  modeOfPayment?: string;
  placeOfSupply?: string;
  createdAt: string;
  updatedAt: string;
  isSample: true; // Flag to identify sample bills
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  billId?: string; // Optional for manual stock additions
  type: "sale" | "return" | "purchase";
  quantity: number;
  date: string;
  purchasePrice?: number;
  userId: string; // Purchase price for stock additions
}

// Return types
export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  condition: "good" | "bad"; // good = back to inventory, bad = deadstock/loss
  returnReason?: string;
}

export interface BillReturn {
  id: string;
  billId: string;
  billNumber: string;
  clientName: string;
  items: ReturnItem[];
  totalReturnValue: number;
  returnDate: string;
  createdAt: string;
}

// Deadstock for damaged/bad returns
export interface DeadstockItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number; // This is the loss
  billReturnId: string;
  reason: string;
  createdAt: string;
}

// Expense types
export interface Expense {
  id: string;
  date: string;
  time: string;
  amount: number;
  description: string;
  category: string;
  paymentMethod: "Cash" | "Bank";
  bankAccountId?: string;
  expoId?: string; // Track which expo this expense belongs to
  createdAt: string;
}

export interface InventoryItemInput {
  description: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate?: number;
}

export interface InventoryAddResult {
  added: number;
  updated: number;
  conflicts?: ProductConflict[];
}

export interface ProductConflict {
  item: InventoryItemInput;
  existingProducts?: Product[]; // Multiple potential matches
  conflictType: "name-mismatch" | "potential-duplicate" | "new-item";
}


export interface PurchaseBillItem {
  description: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate?: number;
  gstAmount?: number;
  whereToBuy?: string; // Added to support item-level tracking
  weight?: number; // Added to support item-level tracking
  weightUnit?: string; // Added to support item-level tracking
  hasError?: boolean; // Flag for AI extraction errors
  errorMessage?: string; // Error message from AI
}

export interface AIExtractionError {
  field: string;
  message: string;
  severity: "warning" | "error";
  suggestion?: string;
}

export interface PurchaseReturnItem {
  description: string;
  productName: string; // Ensure this is present
  quantity: number;
  rate: number;
  amount: number;
  gstRate?: number;
  gstAmount?: number;
  condition: "good" | "bad"; // Ensure this is present
}

export interface PurchaseReturn {
  id: string;
  purchaseBillId: string;
  vendorName: string;
  billNumber?: string;
  items: PurchaseReturnItem[];
  totalReturnValue: number;
  returnDate: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseBill {
  id: string;
  billImage: string; // Base64 or URL of uploaded bill image
  vendorName: string;
  vendorAddress?: string;
  vendorGstin?: string;
  billNumber?: string;
  billDate?: string;
  dueDate?: string; // Payment due date
  paymentTerms?: number; // Payment terms in days
  items: PurchaseBillItem[];
  returns?: PurchaseReturn[]; // Track returns
  subtotal: number;
  totalTax: number;
  total: number;
  paymentStatus: "paid" | "pending" | "overdue" | "overpaid";
  paidAmount: number;
  payments: PaymentTransaction[];
  notes?: string;
  extractedRawText?: string; // Raw text from AI extraction
  extractionErrors?: AIExtractionError[]; // Errors detected during AI extraction
  itemsAddedToInventory?: boolean; // Track if items were added to inventory
  inventoryAddedAt?: string; // When items were added to inventory
  createdAt: string;
  updatedAt: string;
}

// File Management Types
export interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  type: string;
  size: number;
  downloadUrl: string;
  storagePath: string;
  uploadedAt: string;
  createdAt: string;
}

// Note Types
export interface Note {
  id: string;
  date: string; // Date in YYYY-MM-DD format
  content: string;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
}
