import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./firebase";
import {
  CompanyProfile,
  Client,
  Product,
  Bill,
  InventoryTransaction,
  PurchaseBill,
  BillReturn,
  DeadstockItem,
  Expense,
  UploadedFile,
  Note,
  InventoryAddResult,
  ProductConflict,
  SampleBill,
  PaymentMethod,
  PaymentTransaction,
  PurchaseReturn,
  PurchaseReturnItem,
  BankAccount,
  Vendor,
  Expo,
} from "@/types";

// Collection names
const COLLECTIONS = {
  COMPANY: "company",
  CLIENTS: "clients",
  PRODUCTS: "products",
  BILLS: "bills",
  INVENTORY: "inventory",
  BILL_COUNTER: "counters",
  PURCHASE_BILLS: "purchaseBills",
  BILL_RETURNS: "billReturns",
  DEADSTOCK: "deadstock",
  USER_PREFERENCES: "userPreferences",
  EXPENSES: "expenses",
  FILES: "files",
  NOTES: "notes",
  SAMPLE_BILLS: "sampleBills",
  CUSTOMERS: "customers",
  COUNTERS: "counters",
  PURCHASE_RETURNS: "purchaseReturns",
  CREATORS: "creators",
  BANK_ACCOUNTS: "bankAccounts",
  VENDORS: "vendors",
  EXPOS: "expos",
  PRODUCT_ALIASES: "productAliases",
};

interface ProductAliasRecord {
  id: string;
  userId: string;
  productId: string;
  vendorId?: string;
  aliasNameNormalized: string;
  aliasHsnNormalized: string;
  aliasNameRaw?: string;
  aliasHsnRaw?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get user ID (for multi-user support in future)
const getUserId = (): string => {
  // For now, using a default user ID. In future, this can be from auth.currentUser
  return "default";
};

// Helper function to remove undefined values from objects (Firestore doesn't support undefined)
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
};

// Creators
export const getCreators = async (): Promise<any[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.CREATORS),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error: any) {
    console.error("Error getting creators:", error);
    return [];
  }
};

export const saveCreator = async (creator: any): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.CREATORS, creator.id);
    await setDoc(docRef, removeUndefined({ ...creator, userId }), {
      merge: true,
    });
  } catch (error) {
    console.error("Error saving creator:", error);
    throw error;
  }
};

export const deleteCreator = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.CREATORS, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting creator:", error);
    throw error;
  }
};

// Bank Accounts
export const getBankAccounts = async (): Promise<BankAccount[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.BANK_ACCOUNTS),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BankAccount[];
  } catch (error: any) {
    console.error("Error getting bank accounts:", error);
    return [];
  }
};

export const saveBankAccount = async (account: BankAccount): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.BANK_ACCOUNTS, account.id);
    await setDoc(docRef, removeUndefined({ ...account, userId }), {
      merge: true,
    });
  } catch (error) {
    console.error("Error saving bank account:", error);
    throw error;
  }
};

export const deleteBankAccount = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.BANK_ACCOUNTS, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting bank account:", error);
    throw error;
  }
};

// Vendors
export const getVendors = async (): Promise<Vendor[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.VENDORS),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Vendor[];
  } catch (error: any) {
    console.error("Error getting vendors:", error);
    return [];
  }
};

export const saveVendor = async (vendor: Vendor): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.VENDORS, vendor.id);
    await setDoc(docRef, removeUndefined({ ...vendor, userId }), {
      merge: true,
    });
  } catch (error) {
    console.error("Error saving vendor:", error);
    throw error;
  }
};

export const deleteVendor = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.VENDORS, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting vendor:", error);
    throw error;
  }
};

// Expos
export const getExpos = async (): Promise<Expo[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.EXPOS),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Expo[];
  } catch (error: any) {
    console.error("Error getting expos:", error);
    return [];
  }
};

export const saveExpo = async (expo: Expo): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.EXPOS, expo.id);
    await setDoc(docRef, removeUndefined({ ...expo, userId }), { merge: true });
  } catch (error) {
    console.error("Error saving expo:", error);
    throw error;
  }
};

export const deleteExpo = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.EXPOS, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting expo:", error);
    throw error;
  }
};

export const transferStockToExpo = async (
  expoId: string,
  productId: string,
  quantity: number,
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const expoRef = doc(db, COLLECTIONS.EXPOS, expoId);

    const [productSnap, expoSnap] = await Promise.all([
      getDoc(productRef),
      getDoc(expoRef),
    ]);

    if (!productSnap.exists() || !expoSnap.exists()) {
      throw new Error("Product or Expo not found");
    }

    const product = productSnap.data() as Product;
    const expo = expoSnap.data() as Expo;

    if (product.stock < quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    // Update product main stock and expo-specific stock
    const newMainStock = product.stock - quantity;
    const currentExpoStock = product.expoStocks?.[expoId] || 0;
    const newExpoStock = currentExpoStock + quantity;

    batch.update(productRef, {
      stock: newMainStock,
      [`expoStocks.${expoId}`]: newExpoStock,
    });

    // Update expo tracking
    const initialStocks = { ...expo.initialStocks };
    initialStocks[productId] = (initialStocks[productId] || 0) + quantity;
    const remainingStocks = { ...expo.remainingStocks };
    remainingStocks[productId] = (remainingStocks[productId] || 0) + quantity;

    batch.update(expoRef, {
      initialStocks,
      remainingStocks,
    });

    await batch.commit();
  } catch (error) {
    console.error("Error transferring stock to expo:", error);
    throw error;
  }
};

export const endExpoAndReturnStock = async (expoId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const expoRef = doc(db, COLLECTIONS.EXPOS, expoId);
    const expoSnap = await getDoc(expoRef);

    if (!expoSnap.exists()) throw new Error("Expo not found");
    const expo = expoSnap.data() as Expo;

    // Return remaining stocks to main inventory
    for (const [productId, quantity] of Object.entries(expo.remainingStocks)) {
      const qty = Number(quantity);
      if (qty > 0) {
        const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const product = productSnap.data() as Product;
          batch.update(productRef, {
            stock: (Number(product.stock) || 0) + qty,
            [`expoStocks.${expoId}`]: 0,
          });
        }
      }
    }

    batch.update(expoRef, { status: "completed" });
    await batch.commit();
  } catch (error) {
    console.error("Error ending expo:", error);
    throw error;
  }
};

// Company Profile
export const getCompanyProfile = async (): Promise<CompanyProfile | null> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.COMPANY, userId);
    // Use getDoc with no source option to allow offline cache fallback
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as CompanyProfile;
    }
    return null;
  } catch (error: any) {
    // If the error is due to being offline, try to return from cache if possible
    // Firestore SDK usually does this automatically if persistence is enabled
    console.error("Error getting company profile:", error);
    return null;
  }
};

export const saveCompanyProfile = async (
  profile: CompanyProfile,
): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.COMPANY, userId);
    const cleanedData = removeUndefined(profile);
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (error) {
    console.error("Error saving company profile:", error);
    throw error;
  }
};

// Clients
export const getClients = async (): Promise<Client[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.CLIENTS),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);

    const clients = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        billingAddress: data.billingAddress || data.address || "",
        shippingAddress: data.shippingAddress || "",
      } as Client;
    });

    // Sort by createdAt descending in JavaScript (avoids index requirement)
    return clients.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error: any) {
    console.error("Error getting clients:", error);
    return [];
  }
};

export const saveClient = async (client: Client): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.CLIENTS, client.id);
    const cleanedData = removeUndefined({ ...client, userId });
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (error) {
    console.error("Error saving client:", error);
    throw error;
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.CLIENTS, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting client:", error);
    throw error;
  }
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);

    const products = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        purchasePrice: data.purchasePrice || 0,
        sellingPrice: data.sellingPrice || data.price || 0,
        weight:
          typeof data.weight === "string"
            ? parseFloat(data.weight) || 0
            : data.weight || 0,
        weightUnit:
          (data.weightUnit as string) || (data.unit === "kg" ? "kg" : "g"),
        vendorId: data.vendorId || "",
      } as Product;
    });

    // Sort by createdAt descending in JavaScript (avoids index requirement)
    return products.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error: any) {
    console.error("Error getting products:", error);
    return [];
  }
};

export const saveProduct = async (product: Product): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
    const cleanedData = removeUndefined({ ...product, userId });
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (error) {
    console.error("Error saving product:", error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

export const updateProductStock = async (
  productId: string,
  quantity: number,
  type: "sale" | "return",
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const product = docSnap.data() as Product;
      let newStock: number;

      if (type === "sale") {
        newStock = Math.max(0, product.stock - quantity);
      } else {
        newStock = product.stock + quantity;
      }

      // Round to 2 decimal places
      newStock = Math.round(newStock * 100) / 100;

      await updateDoc(docRef, { stock: newStock });
    }
  } catch (error) {
    console.error("Error updating product stock:", error);
    throw error;
  }
};

// Bills
export const getBills = async (): Promise<Bill[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.BILLS),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);

    const bills = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        client: {
          ...data.client,
          billingAddress:
            data.client.billingAddress || data.client.address || "",
          shippingAddress: data.client.shippingAddress || "",
        },
      } as Bill;
    });

    // Sort by createdAt descending in JavaScript (avoids index requirement)
    return bills.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error: any) {
    console.error("Error getting bills:", error);
    return [];
  }
};

export const saveBill = async (bill: Bill): Promise<void> => {
  try {
    const userId = getUserId();
    const batch = writeBatch(db);

    // Check if this is an update by trying to fetch the existing bill
    const billRef = doc(db, COLLECTIONS.BILLS, bill.id);
    const existingBillSnap = await getDoc(billRef);
    const isUpdate = existingBillSnap.exists();

    let existingBill: Bill | null = null;
    if (isUpdate) {
      existingBill = existingBillSnap.data() as Bill;
    }

    const productCache = new Map<string, Product>();

    // Calculate stock adjustments needed
    const stockAdjustments = new Map<string, number>();

    if (isUpdate && existingBill) {
      // For updates, calculate the difference between old and new quantities

      // First, restore stock from original items
      for (const oldItem of existingBill.items) {
        const currentAdjustment = stockAdjustments.get(oldItem.productId) || 0;
        stockAdjustments.set(
          oldItem.productId,
          currentAdjustment + oldItem.quantity,
        );
      }

      // Then, deduct stock for new items
      for (const newItem of bill.items) {
        const currentAdjustment = stockAdjustments.get(newItem.productId) || 0;
        stockAdjustments.set(
          newItem.productId,
          currentAdjustment - newItem.quantity,
        );
      }
    } else {
      // For new bills, deduct full quantities
      for (const item of bill.items) {
        stockAdjustments.set(item.productId, -item.quantity);
      }
    }

    // Validate stock availability for all adjustments
    for (const [productId, adjustment] of stockAdjustments.entries()) {
      if (adjustment < 0) {
        // Only validate if we need to deduct stock (negative adjustment)
        let product = productCache.get(productId);
        if (!product) {
          const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            product = productSnap.data() as Product;
            productCache.set(productId, product);
          }
        }

        if (product) {
          const requiredStock = Math.abs(adjustment);

          if (product.stock < requiredStock) {
            const productName =
              bill.items.find((i) => i.productId === productId)?.productName ||
              "Unknown";
            throw new Error(
              `Insufficient stock for ${productName}. Available: ${product.stock.toFixed(
                2,
              )}, Required: ${requiredStock.toFixed(2)}`,
            );
          }
        } else {
          throw new Error(`Product not found: ${productId}`);
        }
      }
    }

    // Save bill
    const cleanedBillData = removeUndefined({ ...bill, userId });
    batch.set(billRef, cleanedBillData, { merge: true });

    // Update Expo stats if expoId is present
    if (bill.expoId) {
      const expoRef = doc(db, COLLECTIONS.EXPOS, bill.expoId);
      const expoSnap = await getDoc(expoRef);
      if (expoSnap.exists()) {
        const expoData = expoSnap.data() as Expo;
        const soldStocks = { ...(expoData.soldStocks || {}) };
        const remainingStocks = { ...(expoData.remainingStocks || {}) };

        for (const item of bill.items) {
          soldStocks[item.productId] =
            (Number(soldStocks[item.productId]) || 0) + Number(item.quantity);
          remainingStocks[item.productId] =
            (Number(remainingStocks[item.productId]) || 0) -
            Number(item.quantity);
        }

        batch.update(expoRef, {
          soldStocks,
          remainingStocks,
          totalSales: (Number(expoData.totalSales) || 0) + Number(bill.total),
          receivableAmount:
            (Number(expoData.receivableAmount) || 0) +
            (Number(bill.total) - Number(bill.paidAmount)),
          receivedAmount:
            (Number(expoData.receivedAmount) || 0) + Number(bill.paidAmount),
        });
      }
    }

    // Apply stock adjustments
    for (const [productId, adjustment] of stockAdjustments.entries()) {
      if (adjustment !== 0) {
        const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
        let product = productCache.get(productId);
        if (!product) {
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            product = productSnap.data() as Product;
            productCache.set(productId, product);
          }
        }

        if (product) {
          const newStock = Math.max(0, product.stock + adjustment); // adjustment is negative for deduction
          batch.update(productRef, { stock: newStock });
        }
      }
    }

    // Handle inventory transactions
    if (isUpdate && existingBill) {
      // Delete old inventory transactions for this bill
      const oldTransactionsQuery = query(
        collection(db, COLLECTIONS.INVENTORY),
        where("billId", "==", bill.id),
      );
      const oldTransactionsSnap = await getDocs(oldTransactionsQuery);

      oldTransactionsSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Update payment transactions if amount changed
      // Instead of adding new entries, we'll keep the existing ones if possible
      // or just ensure the total paidAmount is correctly reflected.
      // The user wants to update the entry in the passbook, not add another.
      // Since Passbook derives from payments array, we should maintain it.
      if (bill.total !== existingBill.total) {
        // Handle fully paid bills: Adjust the payment to match the new total
        if (
          existingBill.paymentStatus === "paid" &&
          (bill.paidAmount === existingBill.total ||
            bill.paidAmount === bill.total)
        ) {
          bill.paidAmount = bill.total;
          bill.paymentStatus = "paid";

          if (bill.payments && bill.payments.length > 0) {
            // If there's only one payment, adjust it directly
            if (bill.payments.length === 1) {
              bill.payments[0].amount = bill.total;
              bill.payments[0].date = new Date().toISOString(); // Update date to reflect change
            } else {
              // If multiple payments, adjust the last one by the difference
              const diff = bill.total - existingBill.total;
              bill.payments[bill.payments.length - 1].amount += diff;
              bill.payments[bill.payments.length - 1].date =
                new Date().toISOString();
            }
          }
        }
      }
    } else if (!isUpdate && bill.paidAmount > 0) {
      // For new bills with initial payment, ensure it's in the payments array
      if (!bill.payments || bill.payments.length === 0) {
        bill.payments = [
          {
            id: Math.random().toString(36).substr(2, 9),
            amount: bill.paidAmount,
            method: (bill.modeOfPayment as any) || "Cash",
            date: bill.date || new Date().toISOString(),
          },
        ];
      }
    }

    // Create new inventory transaction records
    for (const item of bill.items) {
      const transactionRef = doc(collection(db, COLLECTIONS.INVENTORY));
      const transaction = {
        id: transactionRef.id,
        productId: item.productId,
        billId: bill.id,
        type: "sale" as const,
        quantity: item.quantity,
        purchasePrice:
          typeof item.costAtSale === "number" && item.costAtSale > 0
            ? item.costAtSale
            : item.purchasePrice || 0,
        sellingPrice: item.ratePerUnit || 0,
        date: bill.date,
        userId,
      };
      batch.set(transactionRef, transaction);
    }

    // Ensure payments array exists for new bills
    if (!bill.payments) {
      bill.payments = [];
    }

    await batch.commit();
  } catch (error) {
    console.error("Error saving bill:", error);
    throw error;
  }
};

export const deleteBill = async (id: string): Promise<void> => {
  try {
    const userId = getUserId();
    const billRef = doc(db, COLLECTIONS.BILLS, id);
    const billSnap = await getDoc(billRef);

    if (billSnap.exists()) {
      const bill = billSnap.data() as Bill;
      const batch = writeBatch(db);

      // Delete bill
      batch.delete(billRef);

      // Return items to inventory
      for (const item of bill.items) {
        const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const product = productSnap.data() as Product;
          const newStock = product.stock + item.quantity;
          batch.update(productRef, { stock: newStock });
        }
      }

      await batch.commit();
    }
  } catch (error) {
    console.error("Error deleting bill:", error);
    throw error;
  }
};

export const getBillCounter = async (type?: string): Promise<number> => {
  try {
    const userId = getUserId();
    const docId = type ? `${userId}_${type}` : userId;
    const docRef = doc(db, COLLECTIONS.BILL_COUNTER, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data().counter || 0;
    }
    return 0;
  } catch (error) {
    console.error("Error getting bill counter:", error);
    return 0;
  }
};

export const incrementBillCounter = async (type?: string): Promise<number> => {
  try {
    const userId = getUserId();
    const docId = type ? `${userId}_${type}` : userId;
    const docRef = doc(db, COLLECTIONS.BILL_COUNTER, docId);
    const docSnap = await getDoc(docRef);

    const currentCounter = docSnap.exists() ? docSnap.data().counter || 0 : 0;
    const newCounter = Number(currentCounter) + 1;

    const cleanedData = removeUndefined({ counter: newCounter, userId });
    await setDoc(docRef, cleanedData, { merge: true });
    return newCounter;
  } catch (error) {
    console.error("Error incrementing bill counter:", error);
    throw error;
  }
};

export const uploadProductImage = async (
  productId: string,
  file: File,
): Promise<string> => {
  try {
    const userId = getUserId();
    const storageRef = ref(
      storage,
      `products/${userId}/${productId}_${file.name}`,
    );
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading product image:", error);
    throw error;
  }
};

export const updateBillPayment = async (
  billId: string,
  paidAmount: number,
  paymentType: PaymentMethod,
  note?: string,
  date?: string,
): Promise<void> => {
  try {
    const billRef = doc(db, COLLECTIONS.BILLS, billId);
    const billSnap = await getDoc(billRef);

    if (billSnap.exists()) {
      const bill = billSnap.data() as Bill;
      const newPaidAmount = (bill.paidAmount || 0) + paidAmount;
      const paymentStatus =
        newPaidAmount >= bill.total ? "paid" : bill.paymentStatus;

      const newPayment: PaymentTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        amount: paidAmount,
        method: paymentType,
        date: date || new Date().toISOString(),
        note: note,
      };

      const payments = Array.isArray(bill.payments)
        ? [...bill.payments, newPayment]
        : [newPayment];

      const updateData: any = {
        paidAmount: newPaidAmount,
        paymentStatus,
        paymentType: paymentType, // Update main payment type to last used
        payments: removeUndefined(payments),
      };

      await updateDoc(billRef, updateData);

      // Update Expo stats if expoId is present
      if (bill.expoId) {
        const expoRef = doc(db, COLLECTIONS.EXPOS, bill.expoId);
        const expoSnap = await getDoc(expoRef);
        if (expoSnap.exists()) {
          const expoData = expoSnap.data() as Expo;
          await updateDoc(expoRef, {
            receivedAmount: (Number(expoData.receivedAmount) || 0) + paidAmount,
            receivableAmount: Math.max(
              0,
              (Number(expoData.receivableAmount) || 0) - paidAmount,
            ),
          });
        }
      }
    }
  } catch (error) {
    console.error("Error updating bill payment:", error);
    throw error;
  }
};

// Inventory Transactions
export const getInventoryTransactions = async (): Promise<
  InventoryTransaction[]
> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.INVENTORY),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);

    const transactions = querySnapshot.docs.map(
      (doc) => doc.data() as InventoryTransaction,
    );

    return transactions;
  } catch (error) {
    console.error("Error getting inventory transactions:", error);
    return [];
  }
};

export const saveInventoryTransaction = async (
  transaction: InventoryTransaction,
): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.INVENTORY, transaction.id);
    const cleanedData = removeUndefined({ ...transaction, userId });
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (error) {
    console.error("Error saving inventory transaction:", error);
    throw error;
  }
};

// Add stock to a product with transaction tracking
export const addStockToProduct = async (
  productId: string,
  quantity: number,
  purchasePrice: number,
): Promise<void> => {
  try {
    const userId = getUserId();
    const batch = writeBatch(db);

    // Get the product
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      throw new Error("Product not found");
    }

    const product = productSnap.data() as Product;
    const newStock = product.stock + quantity;
    const roundedStock = Math.round(newStock * 100) / 100;

    // Update product stock
    batch.update(productRef, { stock: roundedStock });

    // Create inventory transaction
    const transactionRef = doc(collection(db, COLLECTIONS.INVENTORY));
    const transaction: InventoryTransaction = {
      id: transactionRef.id,
      productId,
      type: "purchase",
      quantity,
      date: new Date().toISOString(),
      purchasePrice,
      userId,
    };
    const cleanedTransactionData = removeUndefined(transaction);
    batch.set(transactionRef, cleanedTransactionData);

    await batch.commit();
  } catch (error) {
    console.error("Error adding stock to product:", error);
    throw error;
  }
};

// Get inventory transactions for a specific product
export const getProductTransactions = async (
  productId: string,
): Promise<InventoryTransaction[]> => {
  try {
    const transactions = await getInventoryTransactions();
    return transactions.filter((t) => t.productId === productId);
  } catch (error) {
    console.error("Error getting product transactions:", error);
    return [];
  }
};

// Purchase Bills
export const getPurchaseBills = async (): Promise<PurchaseBill[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.PURCHASE_BILLS),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);

    const bills = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        items: (data.items || []).map((item: any) => ({
          ...item,
          weight:
            typeof item.weight === "string"
              ? parseFloat(item.weight) || 0
              : item.weight || 0,
        })),
      } as PurchaseBill;
    });

    // Sort by createdAt descending in JavaScript (avoids index requirement)
    return bills.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error getting purchase bills:", error);
    return [];
  }
};

const roundToTwoDecimals = (value: number): number =>
  Math.round((Number(value) || 0) * 100) / 100;

const getPurchasePaymentStatus = (
  total: number,
  paidAmount: number,
  dueDate?: string,
): PurchaseBill["paymentStatus"] => {
  const normalizedTotal = roundToTwoDecimals(Math.max(0, total || 0));
  const normalizedPaid = roundToTwoDecimals(paidAmount || 0);

  if (normalizedPaid > normalizedTotal) return "overpaid";
  if (Math.abs(normalizedPaid - normalizedTotal) < 0.01) return "paid";
  if (normalizedPaid > 0) return "partial";

  if (dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (due < today) return "overdue";
  }
  return "pending";
};

const normalizeText = (value?: string): string =>
  (value || "").trim().toLowerCase();

const makeAliasKey = (vendorId: string, name: string, hsn: string): string =>
  `${vendorId || "no-vendor"}|${name}|${hsn}`;

const buildPurchaseConflictKey = (
  item: InventoryItemInput,
  index: number,
  bill: PurchaseBill,
): string => {
  const vendorId = normalizeText(item.vendorId || bill.vendorId || "");
  const name = normalizeText(item.description);
  const hsn = normalizeText(item.hsnCode);
  return `${vendorId}|${name}|${hsn}|${index}`;
};

const getProductAliasesForUser = async (): Promise<ProductAliasRecord[]> => {
  const userId = getUserId();
  const q = query(
    collection(db, COLLECTIONS.PRODUCT_ALIASES),
    where("userId", "==", userId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ProductAliasRecord);
};

const indexAliasesByKey = (aliases: ProductAliasRecord[]) => {
  const map = new Map<string, ProductAliasRecord>();
  aliases.forEach((a) => {
    map.set(
      makeAliasKey(
        normalizeText(a.vendorId),
        normalizeText(a.aliasNameNormalized),
        normalizeText(a.aliasHsnNormalized),
      ),
      a,
    );
  });
  return map;
};

export interface ProductAlias {
  id: string;
  vendorId?: string;
  aliasNameRaw: string;
  aliasHsnRaw: string;
  productId: string;
  productName?: string; // Enriched client-side
  createdAt: string;
  updatedAt: string;
}

export const getProductAliases = async (): Promise<ProductAlias[]> => {
  const userId = getUserId();
  const q = query(
    collection(db, COLLECTIONS.PRODUCT_ALIASES),
    where("userId", "==", userId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as ProductAliasRecord;
    return {
      id: data.id,
      vendorId: data.vendorId,
      aliasNameRaw: data.aliasNameRaw || data.aliasNameNormalized,
      aliasHsnRaw: data.aliasHsnRaw || data.aliasHsnNormalized,
      productId: data.productId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
};

export const deleteProductAlias = async (aliasId: string): Promise<void> => {
  const aliasRef = doc(db, COLLECTIONS.PRODUCT_ALIASES, aliasId);
  await deleteDoc(aliasRef);
};

const resolveProductForPurchaseBillItem = (
  item: PurchaseBill["items"][number],
  products: Product[],
): Product | null => {
  if (item.productId) {
    const byId = products.find((p) => p.id === item.productId);
    if (byId) return byId;
  }

  const name = normalizeText(item.description);
  const hsn = normalizeText(item.hsnCode);

  if (hsn && name) {
    const exact = products.find(
      (p) => normalizeText(p.hsnCode) === hsn && normalizeText(p.name) === name,
    );
    if (exact) return exact;
  }

  if (name) {
    const byName = products.find((p) => normalizeText(p.name) === name);
    if (byName) return byName;
  }

  if (hsn) {
    const byHsn = products.filter((p) => normalizeText(p.hsnCode) === hsn);
    if (byHsn.length === 1) return byHsn[0];
  }

  return null;
};

export const updatePurchaseBill = async (bill: PurchaseBill): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.PURCHASE_BILLS, bill.id);
    const billSnap = await getDoc(docRef);
    if (!billSnap.exists()) {
      throw new Error("Purchase bill not found");
    }

    const existingBill = billSnap.data() as PurchaseBill;
    const userId = getUserId();

    const updatedBill: PurchaseBill = {
      ...bill,
      updatedAt: bill.updatedAt || new Date().toISOString(),
    };

    // Keep payment entries as actually recorded in history.
    // When bill total changes, user should explicitly settle difference
    // (pay remaining or collect overpaid) via payment dialog.
    const existingPayments = Array.isArray(existingBill.payments)
      ? [...existingBill.payments]
      : [];
    const incomingPayments = Array.isArray(updatedBill.payments)
      ? [...updatedBill.payments]
      : [...existingPayments];
    const normalizedPayments = [...incomingPayments];

    const normalizedPaidAmount = roundToTwoDecimals(
      normalizedPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    );
    updatedBill.payments = normalizedPayments;
    updatedBill.paidAmount = normalizedPaidAmount;
    updatedBill.paymentStatus = getPurchasePaymentStatus(
      updatedBill.total || 0,
      normalizedPaidAmount,
      updatedBill.dueDate,
    );

    const shouldReconcileInventory =
      existingBill.itemsAddedToInventory === true ||
      updatedBill.itemsAddedToInventory === true;

    if (!shouldReconcileInventory) {
      await updateDoc(docRef, removeUndefined(updatedBill));
      return;
    }

    const batch = writeBatch(db);
    const products = await getProducts();
    const productById = new Map(products.map((p) => [p.id, p]));

    // Read old posted purchase snapshot for this bill from inventory transactions.
    const oldInventoryQuery = query(
      collection(db, COLLECTIONS.INVENTORY),
      where("billId", "==", bill.id),
    );
    const oldInventorySnap = await getDocs(oldInventoryQuery);

    const oldQtyByProduct = new Map<string, number>();
    oldInventorySnap.docs.forEach((d) => {
      const data = d.data() as InventoryTransaction;
      if (data.type !== "purchase") return;
      const prev = oldQtyByProduct.get(data.productId) || 0;
      oldQtyByProduct.set(
        data.productId,
        roundToTwoDecimals(prev + (data.quantity || 0)),
      );
      batch.delete(d.ref);
    });

    const newQtyByProduct = new Map<string, number>();
    const newValueByProduct = new Map<string, number>();

    for (const item of updatedBill.items || []) {
      const qty = roundToTwoDecimals(item.quantity || 0);
      if (qty <= 0) continue;

      let product = resolveProductForPurchaseBillItem(item, products);
      if (!product) {
        const newProduct: Product = {
          id: crypto.randomUUID(),
          name: item.description || "Unnamed Product",
          hsnCode: item.hsnCode || "",
          gstRate: item.gstRate || 0,
          unit: item.unit || "pcs",
          price: item.rate || 0,
          purchasePrice: item.rate || 0,
          sellingPrice: item.rate || 0,
          stock: 0,
          createdAt: new Date().toISOString(),
          whereToBuy: updatedBill.vendorName || "",
          vendorId: updatedBill.vendorId || "",
          weight: item.weight || 0,
        };
        const newProductRef = doc(db, COLLECTIONS.PRODUCTS, newProduct.id);
        batch.set(newProductRef, removeUndefined({ ...newProduct, userId }));
        product = newProduct;
        products.push(newProduct);
        productById.set(newProduct.id, newProduct);
      }

      const prevQty = newQtyByProduct.get(product.id) || 0;
      newQtyByProduct.set(product.id, roundToTwoDecimals(prevQty + qty));

      const prevValue = newValueByProduct.get(product.id) || 0;
      newValueByProduct.set(
        product.id,
        roundToTwoDecimals(prevValue + qty * (item.rate || 0)),
      );
    }

    const impactedProductIds = new Set<string>([
      ...oldQtyByProduct.keys(),
      ...newQtyByProduct.keys(),
    ]);

    // Validate stock for negative deltas before applying updates.
    for (const productId of impactedProductIds) {
      const oldQty = oldQtyByProduct.get(productId) || 0;
      const newQty = newQtyByProduct.get(productId) || 0;
      const deltaQty = roundToTwoDecimals(newQty - oldQty);
      if (deltaQty >= 0) continue;

      const product = productById.get(productId);
      if (!product) {
        throw new Error(`Product not found while reconciling: ${productId}`);
      }
      const requiredToRemove = Math.abs(deltaQty);
      if ((product.stock || 0) < requiredToRemove) {
        throw new Error(
          `Cannot reduce stock for "${product.name}" by ${requiredToRemove.toFixed(
            2,
          )}. Available: ${(product.stock || 0).toFixed(2)}.`,
        );
      }
    }

    for (const productId of impactedProductIds) {
      const oldQty = oldQtyByProduct.get(productId) || 0;
      const newQty = newQtyByProduct.get(productId) || 0;
      const deltaQty = roundToTwoDecimals(newQty - oldQty);
      if (Math.abs(deltaQty) < 0.01) continue;

      const product = productById.get(productId);
      if (!product) continue;

      const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
      const currentStock = roundToTwoDecimals(product.stock || 0);
      const nextStock = roundToTwoDecimals(currentStock + deltaQty);

      const updates: Partial<Product> = {
        stock: nextStock,
      };

      if (deltaQty > 0) {
        const currentPurchasePrice = roundToTwoDecimals(
          product.purchasePrice || 0,
        );
        const addedValue = newValueByProduct.get(productId) || 0;
        const addedQty = newQtyByProduct.get(productId) || 0;
        const incomingPurchasePrice =
          addedQty > 0 ? roundToTwoDecimals(addedValue / addedQty) : 0;

        if (nextStock > 0) {
          const weightedPurchasePrice = roundToTwoDecimals(
            (currentStock * currentPurchasePrice +
              deltaQty * incomingPurchasePrice) /
              nextStock,
          );
          updates.purchasePrice = weightedPurchasePrice;
        }
      }

      batch.update(productRef, removeUndefined(updates));
      productById.set(productId, {
        ...product,
        ...updates,
      });
    }

    // Recreate purchase inventory transactions for this bill as the latest snapshot.
    for (const [productId, qty] of newQtyByProduct.entries()) {
      if (qty <= 0) continue;
      const transactionRef = doc(collection(db, COLLECTIONS.INVENTORY));
      const qtyValue = roundToTwoDecimals(qty);
      const value = newValueByProduct.get(productId) || 0;
      const purchasePrice =
        qtyValue > 0 ? roundToTwoDecimals(value / qtyValue) : 0;

      const transaction: InventoryTransaction = {
        id: transactionRef.id,
        productId,
        billId: updatedBill.id,
        type: "purchase",
        quantity: qtyValue,
        date: updatedBill.billDate || updatedBill.updatedAt || new Date().toISOString(),
        purchasePrice,
        userId,
      };
      batch.set(transactionRef, removeUndefined(transaction));
    }

    batch.update(docRef, {
      ...removeUndefined(updatedBill),
      itemsAddedToInventory: true,
      inventoryAddedAt:
        updatedBill.inventoryAddedAt || existingBill.inventoryAddedAt || new Date().toISOString(),
    });

    await batch.commit();
  } catch (error) {
    console.error("Error updating purchase bill:", error);
    throw error;
  }
};

export const savePurchaseBill = async (bill: PurchaseBill): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.PURCHASE_BILLS, bill.id);
    const cleanedData = removeUndefined({ ...bill, userId });
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (error) {
    console.error("Error saving purchase bill:", error);
    throw error;
  }
};

export const deletePurchaseBill = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.PURCHASE_BILLS, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting purchase bill:", error);
    throw error;
  }
};

export const updatePurchaseBillPayment = async (
  billId: string,
  paidAmount: number,
  paymentType: PaymentMethod,
  note?: string,
  date?: string,
  paymentId?: string, // Optional ID to edit existing payment
): Promise<void> => {
  try {
    const billRef = doc(db, COLLECTIONS.PURCHASE_BILLS, billId);
    const billSnap = await getDoc(billRef);

    if (billSnap.exists()) {
      const bill = billSnap.data() as PurchaseBill;
      let payments = Array.isArray(bill.payments) ? [...bill.payments] : [];

      if (paymentId) {
        // EDIT existing payment
        const index = payments.findIndex((p) => p.id === paymentId);
        if (index !== -1) {
          payments[index] = {
            ...payments[index],
            amount: paidAmount,
            method: paymentType,
            date: date || payments[index].date,
            note: note !== undefined ? note : payments[index].note,
          };
        }
      } else {
        // ADD new payment
        const newPayment: PaymentTransaction = {
          id: Math.random().toString(36).substr(2, 9),
          amount: paidAmount,
          method: paymentType,
          date: date || new Date().toISOString(),
          note: note,
        };
        payments.push(newPayment);
      }

      // Re-calculate total paid amount from all payments
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const paymentStatus = totalPaid >= bill.total ? "paid" : "pending";

      await updateDoc(billRef, {
        paidAmount: totalPaid,
        paymentStatus,
        payments: removeUndefined(payments),
      });
    }
  } catch (error) {
    console.error("Error updating purchase bill payment:", error);
    throw error;
  }
};

export const deletePurchaseBillPayment = async (
  billId: string,
  paymentId: string,
): Promise<void> => {
  try {
    const billRef = doc(db, COLLECTIONS.PURCHASE_BILLS, billId);
    const billSnap = await getDoc(billRef);

    if (billSnap.exists()) {
      const bill = billSnap.data() as PurchaseBill;
      if (!Array.isArray(bill.payments)) return;

      const payments = bill.payments.filter((p) => p.id !== paymentId);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const paymentStatus = totalPaid >= bill.total ? "paid" : "pending";

      await updateDoc(billRef, {
        paidAmount: totalPaid,
        paymentStatus,
        payments: removeUndefined(payments),
      });
    }
  } catch (error) {
    console.error("Error deleting purchase bill payment:", error);
    throw error;
  }
};

// Purchase Returns
export const savePurchaseReturn = async (
  returnOrder: PurchaseReturn,
  adjustStock: boolean = true,
): Promise<void> => {
  try {
    const userId = getUserId();
    const batch = writeBatch(db);

    // 1. Save the return record
    const returnRef = doc(db, COLLECTIONS.PURCHASE_RETURNS, returnOrder.id);
    batch.set(returnRef, removeUndefined({ ...returnOrder, userId }));

    // 2. Update the Purchase Bill
    const billRef = doc(
      db,
      COLLECTIONS.PURCHASE_BILLS,
      returnOrder.purchaseBillId,
    );
    const billSnap = await getDoc(billRef);

    if (billSnap.exists()) {
      const bill = billSnap.data() as PurchaseBill;
      const currentReturns = bill.returns || [];
      const updatedReturns = [...currentReturns, returnOrder];

      // Calculate new totals
      const currentTotal = bill.total || 0;
      const currentPaidAmount = bill.paidAmount || 0;
      const newTotal = currentTotal - returnOrder.totalReturnValue;

      // Update payment status based on new total
      const newPaymentStatus =
        currentPaidAmount >= newTotal
          ? "paid"
          : currentPaidAmount > 0
            ? "partial"
            : "pending";

      batch.update(billRef, {
        returns: removeUndefined(updatedReturns),
        paymentStatus: newPaymentStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Adjust Stock if requested
    if (adjustStock) {
      for (const item of returnOrder.items) {
        // Find product by description and update stock
        const productsQuery = query(
          collection(db, COLLECTIONS.PRODUCTS),
          where("userId", "==", userId),
        );
        const productsSnap = await getDocs(productsQuery);
        const productDoc = productsSnap.docs.find(
          (d) =>
            (d.data().name as string).toLowerCase().trim() ===
            item.description.toLowerCase().trim(),
        );

        if (productDoc) {
          const productRef = productDoc.ref;
          const currentStock = productDoc.data().stock || 0;

          // For PURCHASE return, we are returning items TO the vendor, so stock should DECREASE
          const newStock = currentStock - item.quantity;
          batch.update(productRef, { stock: Math.round(newStock * 100) / 100 });

          // Record inventory transaction for the return
          const transactionRef = doc(collection(db, COLLECTIONS.INVENTORY));
          const transaction = {
            id: transactionRef.id,
            productId: productDoc.id,
            purchaseReturnId: returnOrder.id,
            type: "purchase_return",
            quantity: -item.quantity, // Negative because we are removing from stock
            date: returnOrder.returnDate || new Date().toISOString(),
            userId,
          };
          batch.set(transactionRef, removeUndefined(transaction));
        } else {
          console.warn(
            `Product not found for return item: ${item.description}`,
          );
        }
      }
    }

    await batch.commit();
  } catch (error) {
    console.error("Error saving purchase return:", error);
    throw error;
  }
};

export const deletePurchaseReturn = async (
  returnId: string,
  purchaseBillId: string,
  adjustStock: boolean = true,
): Promise<void> => {
  try {
    const userId = getUserId();
    const batch = writeBatch(db);

    // 1. Delete return record
    const returnRef = doc(db, COLLECTIONS.PURCHASE_RETURNS, returnId);
    const returnSnap = await getDoc(returnRef);
    if (!returnSnap.exists()) return;
    const returnOrder = returnSnap.data() as PurchaseReturn;
    batch.delete(returnRef);

    // 2. Update Purchase Bill
    const billRef = doc(db, COLLECTIONS.PURCHASE_BILLS, purchaseBillId);
    const billSnap = await getDoc(billRef);

    if (billSnap.exists()) {
      const bill = billSnap.data() as PurchaseBill;
      const updatedReturns = (bill.returns || []).filter(
        (r) => r.id !== returnId,
      );

      const currentPaidAmount = bill.paidAmount || 0;
      const currentTotal = bill.total || 0;
      const newPaymentStatus =
        currentPaidAmount >= currentTotal
          ? "paid"
          : currentPaidAmount > 0
            ? "partial"
            : "pending";

      batch.update(billRef, {
        returns: removeUndefined(updatedReturns),
        paymentStatus: newPaymentStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Revert Stock
    if (adjustStock) {
      for (const item of returnOrder.items) {
        const productsQuery = query(
          collection(db, COLLECTIONS.PRODUCTS),
          where("userId", "==", userId),
        );
        const productsSnap = await getDocs(productsQuery);
        const productDoc = productsSnap.docs.find(
          (d) =>
            (d.data().name as string).toLowerCase().trim() ===
            item.description.toLowerCase().trim(),
        );

        if (productDoc) {
          const currentStock = productDoc.data().stock || 0;
          const newStock = currentStock + item.quantity; // Restore stock
          batch.update(productDoc.ref, {
            stock: Math.round(newStock * 100) / 100,
          });

          const q = query(
            collection(db, COLLECTIONS.INVENTORY),
            where("purchaseReturnId", "==", returnId),
          );
          const snap = await getDocs(q);
          snap.forEach((d) => batch.delete(d.ref));
        }
      }
    }

    await batch.commit();
  } catch (error) {
    console.error("Error deleting purchase return:", error);
    throw error;
  }
};

export const addPurchaseItemsToInventory = async (
  bill: PurchaseBill,
  itemsWithSellingPrice: InventoryItemInput[],
  conflictResolutions?: Map<string, string>, // conflictKey -> productId | __create_new__
): Promise<InventoryAddResult> => {
  try {
    const userId = getUserId();
    const products = await getProducts();
    const aliases = await getProductAliasesForUser();
    const aliasIndex = indexAliasesByKey(aliases);
    const batch = writeBatch(db);

    let added = 0;
    let updated = 0;
    const conflicts: ProductConflict[] = [];

    const registerAlias = (
      item: InventoryItemInput,
      productId: string,
      index: number,
    ) => {
      const vendorId = normalizeText(item.vendorId || bill.vendorId || "");
      const name = normalizeText(item.description);
      const hsn = normalizeText(item.hsnCode);
      const key = makeAliasKey(vendorId, name, hsn);
      const now = new Date().toISOString();
      const existingAlias = aliasIndex.get(key);

      if (existingAlias) {
        const aliasRef = doc(db, COLLECTIONS.PRODUCT_ALIASES, existingAlias.id);
        batch.update(aliasRef, {
          productId,
          aliasNameRaw: item.description,
          aliasHsnRaw: item.hsnCode || "",
          updatedAt: now,
        });
        aliasIndex.set(key, {
          ...existingAlias,
          productId,
          updatedAt: now,
        });
        return;
      }

      const aliasRef = doc(collection(db, COLLECTIONS.PRODUCT_ALIASES));
      const alias: ProductAliasRecord = {
        id: aliasRef.id,
        userId,
        productId,
        vendorId: vendorId || "",
        aliasNameNormalized: name,
        aliasHsnNormalized: hsn,
        aliasNameRaw: item.description,
        aliasHsnRaw: item.hsnCode || "",
        createdAt: now,
        updatedAt: now,
      };
      batch.set(aliasRef, removeUndefined(alias));
      aliasIndex.set(key, alias);
    };

    for (let index = 0; index < itemsWithSellingPrice.length; index++) {
      const item = itemsWithSellingPrice[index];
      const conflictKey = item.conflictKey || buildPurchaseConflictKey(item, index, bill);

      // 1. Check for manual product selection (isNewProduct = false)
      if (item.isNewProduct === false && item.productId) {
        const selectedProduct = products.find((p) => p.id === item.productId);
        if (selectedProduct) {
          await updateExistingProduct(
            selectedProduct,
            item,
            bill,
            batch,
            userId,
          );
          registerAlias(item, selectedProduct.id, index);
          updated++;
          continue;
        }
      }

      // 2. Check for manual "Create New" (isNewProduct = true)
      if (item.isNewProduct === true) {
        const created = await createNewProduct(item, bill, batch, userId);
        products.push(created);
        registerAlias(item, created.id, index);
        added++;
        continue;
      }

      // 3. If conflict was already resolved by UI, apply it deterministically.
      const resolvedProductId = conflictResolutions?.get(conflictKey);
      if (resolvedProductId) {
        if (resolvedProductId === "__create_new__") {
          const created = await createNewProduct(item, bill, batch, userId);
          products.push(created);
          registerAlias(item, created.id, index);
          added++;
          continue;
        }

        const resolvedProduct = products.find((p) => p.id === resolvedProductId);
        if (resolvedProduct) {
          await updateExistingProduct(
            resolvedProduct,
            item,
            bill,
            batch,
            userId,
          );
          registerAlias(item, resolvedProduct.id, index);
          updated++;
          continue;
        }
      }

      // 4. Vendor alias exact match
      const normalizedVendorId = normalizeText(item.vendorId || bill.vendorId || "");
      const normalizedName = normalizeText(item.description);
      const normalizedHsn = normalizeText(item.hsnCode);
      const aliasKey = makeAliasKey(
        normalizedVendorId,
        normalizedName,
        normalizedHsn,
      );
      const aliasHit = aliasIndex.get(aliasKey);
      if (aliasHit) {
        const aliasedProduct = products.find((p) => p.id === aliasHit.productId);
        if (aliasedProduct) {
          await updateExistingProduct(aliasedProduct, item, bill, batch, userId);
          registerAlias(item, aliasedProduct.id, index);
          updated++;
          continue;
        }
      }

      // 5. Exact global match by name + HSN
      if (normalizedName && normalizedHsn) {
        const exactMatches = products.filter(
          (p) =>
            normalizeText(p.name) === normalizedName &&
            normalizeText(p.hsnCode) === normalizedHsn,
        );
        if (exactMatches.length === 1) {
          await updateExistingProduct(exactMatches[0], item, bill, batch, userId);
          registerAlias(item, exactMatches[0].id, index);
          updated++;
          continue;
        }
        if (exactMatches.length > 1) {
          conflicts.push({
            item: { ...item, conflictKey },
            existingProducts: exactMatches,
            conflictType: "potential-duplicate",
            conflictKey,
          });
          continue;
        }
      }

      // 6. Name-only strict match when HSN is absent.
      if (!normalizedHsn && normalizedName) {
        const nameMatches = products.filter(
          (p) => normalizeText(p.name) === normalizedName,
        );
        if (nameMatches.length === 1) {
          await updateExistingProduct(nameMatches[0], item, bill, batch, userId);
          registerAlias(item, nameMatches[0].id, index);
          updated++;
          continue;
        }
        if (nameMatches.length > 1) {
          conflicts.push({
            item: { ...item, conflictKey },
            existingProducts: nameMatches,
            conflictType: "potential-duplicate",
            conflictKey,
          });
          continue;
        }
      }

      // 7. No exact match -> either create new or ask explicit mapping.
      const possibleMatches = products.filter((p) => {
        const sameName = normalizedName && normalizeText(p.name) === normalizedName;
        const sameHsn = normalizedHsn && normalizeText(p.hsnCode) === normalizedHsn;
        return Boolean(sameName || sameHsn);
      });

      if (possibleMatches.length === 0) {
        const created = await createNewProduct(item, bill, batch, userId);
        products.push(created);
        registerAlias(item, created.id, index);
        added++;
        continue;
      }

      conflicts.push({
        item: { ...item, conflictKey },
        existingProducts: possibleMatches,
        conflictType: "name-mismatch",
        conflictKey,
      });
    }

    // Only commit if no conflicts or conflicts are resolved
    if (conflicts.length === 0) {
      // Mark bill as inventory added
      const billRef = doc(db, COLLECTIONS.PURCHASE_BILLS, bill.id);
      batch.update(billRef, {
        itemsAddedToInventory: true,
        inventoryAddedAt: new Date().toISOString(),
      });

      await batch.commit();
    }

    return { added, updated, conflicts };
  } catch (error) {
    console.error("Error adding purchase items to inventory:", error);
    throw error;
  }
};

export interface InventoryItemInput {
  description: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate?: number;
  productId?: string;
  vendorId?: string;
  isNewProduct?: boolean;
  conflictKey?: string;
}

const updateExistingProduct = async (
  existingProduct: Product,
  item: InventoryItemInput,
  bill: PurchaseBill,
  batch: any,
  userId: string,
) => {
  const productRef = doc(db, COLLECTIONS.PRODUCTS, existingProduct.id);
  const currentStock = existingProduct.stock || 0;
  const currentPurchasePrice = existingProduct.purchasePrice || 0;

  // Calculate new stock
  const newStock = Math.round((currentStock + item.quantity) * 100) / 100;

  // Calculate new weighted average purchase price
  // Formula: ((Existing Stock * Old Avg Price) + (New Quantity * New Purchase Price)) / New Total Stock
  let newPurchasePrice = item.purchasePrice;
  if (newStock > 0) {
    const existingValue = currentStock * currentPurchasePrice;
    const newValue = item.quantity * item.purchasePrice;
    newPurchasePrice =
      Math.round(((existingValue + newValue) / newStock) * 100) / 100;
  }

  const updates: any = {
    stock: newStock,
    purchasePrice: newPurchasePrice,
  };

  if (item.sellingPrice > 0) {
    updates.sellingPrice = item.sellingPrice;
    updates.price = item.sellingPrice;
  }

  batch.update(productRef, updates);

  // Update in-memory so subsequent calls for the same product within the same bill
  // use the correct cumulative stock/price (Firestore batch last-write-wins otherwise).
  existingProduct.stock = newStock;
  existingProduct.purchasePrice = newPurchasePrice;

  // Create inventory transaction record
  const transactionRef = doc(collection(db, COLLECTIONS.INVENTORY));
  const transaction: InventoryTransaction = {
    id: transactionRef.id,
    productId: existingProduct.id,
    billId: bill.id,
    type: "purchase" as const,
    quantity: item.quantity,
    date: bill.billDate || bill.createdAt,
    purchasePrice: item.purchasePrice,
    userId,
  };
  const cleanedTransactionData = removeUndefined(transaction);
  batch.set(transactionRef, cleanedTransactionData);
};

const updateExistingProductWithNameChange = async (
  existingProduct: Product,
  item: InventoryItemInput,
  chosenName: string,
  bill: PurchaseBill,
  batch: any,
  userId: string,
) => {
  const productRef = doc(db, COLLECTIONS.PRODUCTS, existingProduct.id);
  const currentStock = existingProduct.stock || 0;
  const currentPurchasePrice = existingProduct.purchasePrice || 0;

  // Calculate new stock
  const newStock = Math.round((currentStock + item.quantity) * 100) / 100;

  // Calculate new weighted average purchase price
  let newPurchasePrice = item.purchasePrice;
  if (newStock > 0) {
    const existingValue = currentStock * currentPurchasePrice;
    const newValue = item.quantity * item.purchasePrice;
    newPurchasePrice =
      Math.round(((existingValue + newValue) / newStock) * 100) / 100;
  }

  const updates: any = {
    name: chosenName, // Update name
    stock: newStock,
    purchasePrice: newPurchasePrice,
    gstRate: item.gstRate || existingProduct.gstRate,
    unit: item.unit || existingProduct.unit,
  };

  if (item.sellingPrice > 0) {
    updates.sellingPrice = item.sellingPrice;
    updates.price = item.sellingPrice;
  }

  batch.update(productRef, updates);

  // Update in-memory so subsequent calls for the same product within the same bill
  // use the correct cumulative stock/price (Firestore batch last-write-wins otherwise).
  existingProduct.stock = newStock;
  existingProduct.purchasePrice = newPurchasePrice;

  // Create inventory transaction record
  const transactionRef = doc(collection(db, COLLECTIONS.INVENTORY));
  const transaction: InventoryTransaction = {
    id: transactionRef.id,
    productId: existingProduct.id,
    billId: bill.id,
    type: "purchase" as const,
    quantity: item.quantity,
    date: bill.billDate || bill.createdAt,
    purchasePrice: item.purchasePrice,
    userId,
  };
  const cleanedTransactionData = removeUndefined(transaction);
  batch.set(transactionRef, cleanedTransactionData);
};

const createNewProduct = async (
  item: InventoryItemInput,
  bill: PurchaseBill,
  batch: any,
  userId: string,
): Promise<Product> => {
  const newProduct: Product = {
    id: crypto.randomUUID(),
    name: item.description,
    hsnCode: item.hsnCode || "",
    gstRate: item.gstRate || 0,
    unit: item.unit || "pcs",
    price: item.sellingPrice || item.purchasePrice,
    purchasePrice: item.purchasePrice,
    sellingPrice: item.sellingPrice || item.purchasePrice,
    stock: item.quantity,
    createdAt: new Date().toISOString(),
    whereToBuy: bill.vendorName || "",
    vendorId: bill.vendorId || "",
    weight: 0,
  };

  const productRef = doc(db, COLLECTIONS.PRODUCTS, newProduct.id);
  const cleanedProductData = removeUndefined({ ...newProduct, userId });
  batch.set(productRef, cleanedProductData);

  // Create inventory transaction record
  const transactionRef = doc(collection(db, COLLECTIONS.INVENTORY));
  const transaction: InventoryTransaction = {
    id: transactionRef.id,
    productId: newProduct.id,
    billId: bill.id,
    type: "purchase" as const,
    quantity: item.quantity,
    date: bill.billDate || bill.createdAt,
    purchasePrice: item.purchasePrice,
    userId,
  };
  const cleanedTransactionData = removeUndefined(transaction);
  batch.set(transactionRef, cleanedTransactionData);

  return newProduct;
};

export const isPurchaseBillDuplicate = async (
  billNumber: string,
  vendorName: string,
  excludeId?: string,
): Promise<boolean> => {
  try {
    if (!billNumber) return false;
    const bills = await getPurchaseBills();
    return bills.some(
      (b) =>
        b.id !== excludeId &&
        b.billNumber?.toLowerCase() === billNumber.toLowerCase() &&
        b.vendorName.toLowerCase() === vendorName.toLowerCase(),
    );
  } catch (error) {
    console.error("Error checking purchase bill duplicate:", error);
    return false;
  }
};

export const isPurchaseBillInventoryAdded = async (
  billId: string,
): Promise<boolean> => {
  try {
    const billRef = doc(db, COLLECTIONS.PURCHASE_BILLS, billId);
    const billSnap = await getDoc(billRef);

    if (billSnap.exists()) {
      const bill = billSnap.data() as PurchaseBill;
      return bill.itemsAddedToInventory === true;
    }
    return false;
  } catch (error) {
    console.error("Error checking purchase bill inventory status:", error);
    return false;
  }
};

export const updatePurchaseBillOverdueStatus = async (): Promise<void> => {
  try {
    const bills = await getPurchaseBills();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batch = writeBatch(db);
    let hasChanges = false;

    for (const bill of bills) {
      if (bill.orderStatus === "cancelled") continue;
      if (bill.paymentStatus !== "paid" && bill.dueDate) {
        const dueDate = new Date(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          const billRef = doc(db, COLLECTIONS.PURCHASE_BILLS, bill.id);
          batch.update(billRef, { paymentStatus: "overdue" });
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await batch.commit();
    }
  } catch (error) {
    console.error("Error updating purchase bill overdue status:", error);
  }
};

export const checkStockAvailability = async (
  productId: string,
  requiredQty: number,
): Promise<{ available: boolean; stock: number; productName: string }> => {
  try {
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return { available: false, stock: 0, productName: "Unknown Product" };
    }

    const product = productSnap.data() as Product;
    const available = product.stock >= requiredQty && product.stock > 0;

    return {
      available,
      stock: product.stock,
      productName: product.name,
    };
  } catch (error) {
    console.error("Error checking stock availability:", error);
    return { available: false, stock: 0, productName: "Unknown Product" };
  }
};

export const validateBillStock = async (
  items: { productId: string; quantity: number }[],
): Promise<{ valid: boolean; errors: string[] }> => {
  try {
    const errors: string[] = [];

    for (const item of items) {
      if (item.quantity <= 0) {
        const product = await getDoc(
          doc(db, COLLECTIONS.PRODUCTS, item.productId),
        );
        const productName = product.exists()
          ? (product.data() as Product).name
          : "Unknown Product";
        errors.push(`${productName}: Quantity must be greater than 0`);
        continue;
      }

      const { available, stock, productName } = await checkStockAvailability(
        item.productId,
        item.quantity,
      );
      if (!available) {
        errors.push(
          `${productName}: Required ${item.quantity.toFixed(
            2,
          )}, Available ${stock.toFixed(2)}`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error("Error validating bill stock:", error);
    return { valid: false, errors: ["Error validating stock"] };
  }
};

// Bill Returns
export const getBillReturns = async (): Promise<BillReturn[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.BILL_RETURNS),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);

    const returns = querySnapshot.docs.map((doc) => doc.data() as BillReturn);

    // Sort by createdAt descending in JavaScript (avoids index requirement)
    return returns.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error getting bill returns:", error);
    return [];
  }
};

export const getPurchaseReturns = async (): Promise<PurchaseReturn[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.PURCHASE_RETURNS),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);

    const returns = querySnapshot.docs.map(
      (doc) => doc.data() as PurchaseReturn,
    );

    // Sort by createdAt descending in JavaScript (avoids index requirement)
    return returns.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error getting purchase returns:", error);
    return [];
  }
};

export const saveBillReturn = async (billReturn: BillReturn): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.BILL_RETURNS, billReturn.id);
    const cleanedData = removeUndefined({ ...billReturn, userId });
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (error) {
    console.error("Error saving bill return:", error);
    throw error;
  }
};

// Deadstock
export const getDeadstock = async (): Promise<DeadstockItem[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.DEADSTOCK),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);

    const items = querySnapshot.docs.map((doc) => doc.data() as DeadstockItem);

    // Sort by createdAt descending in JavaScript (avoids index requirement)
    return items.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error getting deadstock:", error);
    return [];
  }
};

export const saveDeadstockItem = async (item: DeadstockItem): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.DEADSTOCK, item.id);
    const cleanedData = removeUndefined({ ...item, userId });
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (error) {
    console.error("Error saving deadstock item:", error);
    throw error;
  }
};

export const processBillReturn = async (
  billId: string,
  returnItems: {
    productId: string;
    productName: string;
    quantity: number;
    condition: "good" | "bad";
    returnReason?: string;
    costPrice: number;
  }[],
): Promise<BillReturn> => {
  try {
    const userId = getUserId();
    const billRef = doc(db, COLLECTIONS.BILLS, billId);
    const billSnap = await getDoc(billRef);

    if (!billSnap.exists()) {
      throw new Error("Bill not found");
    }

    const bill = billSnap.data() as Bill;
    const billReturn: BillReturn = {
      id: crypto.randomUUID(),
      billId,
      billNumber: bill.billNumber,
      clientName: bill.client.name,
      items: returnItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        condition: item.condition,
        returnReason: item.returnReason,
      })),
      totalReturnValue: returnItems.reduce(
        (sum, item) => sum + item.quantity * item.costPrice,
        0,
      ),
      returnDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const batch = writeBatch(db);

    // Process each returned item
    for (const item of returnItems) {
      if (item.condition === "good") {
        // Good product - add back to inventory
        const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const product = productSnap.data() as Product;
          const newStock = product.stock + item.quantity;
          // Round to 2 decimal places
          const roundedStock = Math.round(newStock * 100) / 100;
          batch.update(productRef, { stock: roundedStock });
        }
      } else {
        // Bad product - add to deadstock
        const deadstockItem: DeadstockItem = {
          id: crypto.randomUUID(),
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          costPrice: item.costPrice,
          billReturnId: billReturn.id,
          reason: item.returnReason || "Damaged/Defective",
          createdAt: new Date().toISOString(),
        };
        const deadstockRef = doc(db, COLLECTIONS.DEADSTOCK, deadstockItem.id);
        const cleanedDeadstockData = removeUndefined({
          ...deadstockItem,
          userId,
        });
        batch.set(deadstockRef, cleanedDeadstockData);
      }

      // Record inventory transaction
      const transaction: InventoryTransaction = {
        id: crypto.randomUUID(),
        productId: item.productId,
        billId: billReturn.id,
        type: "return",
        quantity: -item.quantity, // Negative because it's a return of a sale (adding back to stock but reducing sale quantity)
        date: new Date().toISOString(),
        userId,
      };
      const transactionRef = doc(db, COLLECTIONS.INVENTORY, transaction.id);
      const cleanedTransactionData = removeUndefined({
        ...transaction,
        userId,
      });
      batch.set(transactionRef, cleanedTransactionData);
    }

    // Update the original bill
    await updateBillAfterReturn(billId, returnItems);

    // Save bill return
    const returnRef = doc(db, COLLECTIONS.BILL_RETURNS, billReturn.id);
    const cleanedReturnData = removeUndefined({ ...billReturn, userId });
    batch.set(returnRef, cleanedReturnData);

    await batch.commit();
    return billReturn;
  } catch (error) {
    console.error("Error processing bill return:", error);
    throw error;
  }
};

export const updateBillAfterReturn = async (
  billId: string,
  returnItems: {
    productId: string;
    quantity: number;
    costPrice: number;
    productName?: string;
    returnReason?: string;
  }[],
): Promise<void> => {
  try {
    const billRef = doc(db, COLLECTIONS.BILLS, billId);
    const billSnap = await getDoc(billRef);

    if (!billSnap.exists()) return;

    const bill = billSnap.data() as Bill;
    let totalReturnValue = 0;

    // Update item quantities in the bill
    const isIGST = bill.gstType === "igst";
    const updatedItems = bill.items
      .map((item) => {
        const returnItem = returnItems.find(
          (r) => r.productId === item.productId,
        );
        if (returnItem) {
          const newQuantity = item.quantity - returnItem.quantity;
          const newAmount = newQuantity * item.ratePerUnit;

          // Recalculate GST based on bill's GST type
          let cgst = 0;
          let sgst = 0;
          let igst = 0;

          if (bill.totalTax > 0) {
            // Only calculate GST if bill has GST
            if (isIGST) {
              igst = (newAmount * item.gstRate) / 100;
            } else {
              cgst = (newAmount * item.gstRate) / 200;
              sgst = (newAmount * item.gstRate) / 200;
            }
          }

          totalReturnValue += returnItem.quantity * item.ratePerUnit;

          return {
            ...item,
            quantity: newQuantity,
            amount: newAmount,
            cgst,
            sgst,
            igst,
          };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);

    // Recalculate bill totals
    const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    const totalTax = updatedItems.reduce(
      (sum, item) => sum + item.cgst + item.sgst + (item.igst || 0),
      0,
    );
    const rawTotal = subtotal + totalTax;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = roundedTotal - rawTotal;

    const existingComment = bill.returnComment || "";
    const returnDate = new Date().toISOString();
    const returnInfo = returnItems
      .map((r) => {
        const name = r.productName || "Item";
        const reason = r.returnReason ? ` (Reason: ${r.returnReason})` : "";
        return `${name}: ${r.quantity} returned${reason}`;
      })
      .join("; ");
    const returnComment = existingComment
      ? `${existingComment}\n${new Date(returnDate).toLocaleString("en-IN")}: ${returnInfo}`
      : `${new Date(returnDate).toLocaleString("en-IN")}: ${returnInfo}`;

    await updateDoc(billRef, {
      items: updatedItems,
      subtotal,
      totalTax,
      roundOff,
      total: roundedTotal,
      returnComment,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating bill after return:", error);
    throw error;
  }
};

export const getBillReturnsByBillId = async (
  billId: string,
): Promise<BillReturn[]> => {
  try {
    const returns = await getBillReturns();
    return returns.filter((r) => r.billId === billId);
  } catch (error) {
    console.error("Error getting bill returns by bill ID:", error);
    return [];
  }
};

export const getReturnedQuantity = async (
  billId: string,
  productId: string,
): Promise<number> => {
  try {
    const returns = await getBillReturnsByBillId(billId);
    return returns.reduce((sum, ret) => {
      const item = ret.items.find((i) => i.productId === productId);
      return sum + (item?.quantity || 0);
    }, 0);
  } catch (error) {
    console.error("Error getting returned quantity:", error);
    return 0;
  }
};

export const getTotalDeadstockLoss = async (): Promise<number> => {
  try {
    const deadstock = await getDeadstock();
    return deadstock.reduce(
      (sum, item) => sum + item.quantity * item.costPrice,
      0,
    );
  } catch (error) {
    console.error("Error getting total deadstock loss:", error);
    return 0;
  }
};

// Reconcile stock for all products by recalculating from inventory transactions and bill data.
// This fixes gaps caused by the batch-overwrite bug (multiple items of the same product in one
// purchase bill) where only the last item's quantity was applied to product.stock.
export const reconcileAllProductStocks = async (): Promise<{
  fixedCount: number;
  changes: Array<{ name: string; oldStock: number; newStock: number }>;
}> => {
  const userId = getUserId();
  const [products, allTransactions, bills, billReturns] = await Promise.all([
    getProducts(),
    getInventoryTransactions(),
    getBills(),
    getBillReturns(),
  ]);

  const changes: Array<{ name: string; oldStock: number; newStock: number }> = [];
  const productRefs: Array<{ ref: any; stock: number }> = [];

  for (const product of products) {
    const productTxns = allTransactions.filter((t) => t.productId === product.id);

    // Purchases: sum all purchase-type transactions (source of truth for received qty)
    const totalPurchased = productTxns
      .filter((t) => t.type === "purchase")
      .reduce((sum, t) => sum + (t.quantity || 0), 0);

    // Purchase returns: transactions have negative quantities
    const purchaseReturned = productTxns
      .filter((t) => t.type === "purchase_return")
      .reduce((sum, t) => sum + (t.quantity || 0), 0);

    // Sales: use bills directly (authoritative, handles edits correctly)
    const totalSold = bills.reduce((sum, bill) => {
      return (
        sum +
        bill.items
          .filter((item) => item.productId === product.id)
          .reduce((s, item) => s + (item.quantity || 0), 0)
      );
    }, 0);

    // Good customer returns: add back to stock
    const goodReturned = billReturns.reduce((sum, br) => {
      const items = (br as any).items || [];
      return (
        sum +
        items
          .filter(
            (item: any) =>
              String(item.productId) === String(product.id) &&
              item.condition === "good",
          )
          .reduce((s: number, item: any) => s + (Number(item.quantity) || 0), 0)
      );
    }, 0);

    // Safety guard: if no purchase transactions exist but product has stock,
    // it was manually set (direct edit). Skip — we cannot safely reconcile it.
    if (totalPurchased === 0 && (product.stock || 0) > 0) continue;

    const correctStock = Math.round(
      (totalPurchased + purchaseReturned - totalSold + goodReturned) * 100,
    ) / 100;

    if (Math.abs(correctStock - (product.stock || 0)) >= 0.01) {
      productRefs.push({
        ref: doc(db, COLLECTIONS.PRODUCTS, product.id),
        stock: correctStock,
      });
      changes.push({
        name: product.name,
        oldStock: product.stock || 0,
        newStock: correctStock,
      });
    }
  }

  // Commit in batches of 400 (Firestore limit is 500 per batch)
  for (let i = 0; i < productRefs.length; i += 400) {
    const batch = writeBatch(db);
    productRefs.slice(i, i + 400).forEach(({ ref, stock }) => {
      batch.update(ref, { stock, userId });
    });
    await batch.commit();
  }

  return { fixedCount: changes.length, changes };
};

export const getCostOfGoodsSold = async (): Promise<number> => {
  try {
    const bills = await getBills();
    const products = await getProducts();

    let totalCost = 0;
    bills.forEach((bill) => {
      bill.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        const costPrice =
          (typeof item.costAtSale === "number" && item.costAtSale > 0
            ? item.costAtSale
            : typeof item.purchasePrice === "number" && item.purchasePrice > 0
              ? item.purchasePrice
              : product?.purchasePrice ?? product?.price ?? 0) || 0;
        totalCost += item.quantity * costPrice;
      });
    });

    return totalCost;
  } catch (error) {
    console.error("Error getting cost of goods sold:", error);
    return 0;
  }
};

// User Preferences (for theme, PWA settings, etc.)
export const getUserPreference = async (
  key: string,
): Promise<string | null> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const prefs = docSnap.data();
      return prefs[key] || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting user preference:", error);
    return null;
  }
};

export const setUserPreference = async (
  key: string,
  value: string,
): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const cleanedData = removeUndefined({ [key]: value, userId });
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (error) {
    console.error("Error setting user preference:", error);
    throw error;
  }
};

// Expenses
export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const userId = getUserId();
    // Try to query with orderBy, but if it fails (due to missing index), fall back to client-side sorting
    let querySnapshot;
    try {
      const q = query(
        collection(db, COLLECTIONS.EXPENSES),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
      );
      querySnapshot = await getDocs(q);
    } catch (orderByError) {
      // If orderBy fails (likely due to missing composite index), get all and sort client-side
      console.warn("OrderBy failed, sorting client-side:", orderByError);
      const q = query(
        collection(db, COLLECTIONS.EXPENSES),
        where("userId", "==", userId),
      );
      querySnapshot = await getDocs(q);
    }

    const expenses = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Expense,
    );

    // Sort by createdAt descending (most recent first), with fallback to date if createdAt is missing
    return expenses.sort((a, b) => {
      const dateA = a.createdAt || a.date || "";
      const dateB = b.createdAt || b.date || "";
      return dateB.localeCompare(dateA);
    });
  } catch (error) {
    console.error("Error getting expenses:", error);
    return [];
  }
};

export const saveExpense = async (expense: Expense): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.EXPENSES, expense.id);
    const expenseData = {
      ...expense,
      userId,
      // Preserve createdAt if it exists, otherwise set it to now
      createdAt: expense.createdAt || new Date().toISOString(),
    };
    const cleanedData = removeUndefined(expenseData);
    await setDoc(docRef, cleanedData, { merge: true });

    // Update Expo expenses if expoId is present
    if (expense.expoId) {
      const expoRef = doc(db, COLLECTIONS.EXPOS, expense.expoId);
      const expoSnap = await getDoc(expoRef);
      if (expoSnap.exists()) {
        const expoData = expoSnap.data() as Expo;
        await updateDoc(expoRef, {
          expenses: (Number(expoData.expenses) || 0) + Number(expense.amount),
        });
      }
    }
  } catch (error) {
    console.error("Error saving expense:", error);
    throw error;
  }
};

export const deleteExpense = async (expenseId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.EXPENSES, expenseId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};

// File Management
export const uploadFile = async (file: File): Promise<UploadedFile> => {
  try {
    const userId = getUserId();
    const fileId = crypto.randomUUID();
    const timestamp = Date.now();

    // Get file extension safely
    const fileNameParts = file.name.split(".");
    const fileExtension =
      fileNameParts.length > 1 ? fileNameParts.pop() || "" : "";

    // Sanitize file name for storage (remove special characters that might cause issues)
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageFileName = `${timestamp}_${fileId}${fileExtension ? `.${fileExtension}` : ""}`;
    const storagePath = `files/${userId}/${storageFileName}`;

    // Upload file to Firebase Storage
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);

    // Use the file.name as displayed name (which may be custom)
    const displayName = file.name;

    // Create file record in Firestore
    const uploadedFile: UploadedFile = {
      id: fileId,
      name: displayName,
      originalName: displayName,
      type: file.type || "application/octet-stream",
      size: file.size,
      downloadUrl,
      storagePath,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const docRef = doc(db, COLLECTIONS.FILES, fileId);
    const cleanedData = removeUndefined({ ...uploadedFile, userId });
    await setDoc(docRef, cleanedData);

    return uploadedFile;
  } catch (error) {
    console.error("Error uploading file:", error);
    // Provide more detailed error message
    if (error instanceof Error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    throw new Error("Failed to upload file. Please try again.");
  }
};

export const getFiles = async (): Promise<UploadedFile[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, COLLECTIONS.FILES),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);

    const files = querySnapshot.docs.map((doc) => doc.data() as UploadedFile);

    // Sort by uploadedAt descending
    return files.sort((a, b) => {
      const dateA = new Date(a.uploadedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.uploadedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error getting files:", error);
    return [];
  }
};

export const deleteFile = async (
  fileId: string,
  storagePath: string,
): Promise<void> => {
  try {
    // Delete from Firestore
    const docRef = doc(db, COLLECTIONS.FILES, fileId);
    await deleteDoc(docRef);

    // Delete from Storage
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

export const downloadFile = async (
  downloadUrl: string,
  fileName: string,
): Promise<void> => {
  try {
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
};

// Notes Management
export const getNotes = async (date?: string): Promise<Note[]> => {
  try {
    const userId = getUserId();
    let q;

    if (date) {
      q = query(
        collection(db, COLLECTIONS.NOTES),
        where("userId", "==", userId),
        where("date", "==", date),
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.NOTES),
        where("userId", "==", userId),
      );
    }

    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map((doc) => doc.data() as Note);

    // Sort by createdAt descending
    return notes.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error getting notes:", error);
    return [];
  }
};

export const getNotesByDate = async (date: string): Promise<Note[]> => {
  return getNotes(date);
};

export const saveNote = async (note: Note): Promise<void> => {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.NOTES, note.id);
    const noteData = {
      ...note,
      userId,
      updatedAt: new Date().toISOString(),
    };
    const cleanedData = removeUndefined(noteData);
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (error) {
    console.error("Error saving note:", error);
    throw error;
  }
};

export const deleteNote = async (noteId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.NOTES, noteId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
};

export const updateNoteStatus = async (
  noteId: string,
  isDone: boolean,
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.NOTES, noteId);
    await updateDoc(docRef, {
      isDone,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating note status:", error);
    throw error;
  }
};

export const getProductSalesData = async (productId: string) => {
  const allBills = await getBills();

  let totalSoldQty = 0;
  let totalSaleRevenue = 0;

  for (const bill of allBills) {
    for (const item of bill.items) {
      if (item.productId === productId) {
        totalSoldQty += item.quantity;
        totalSaleRevenue += item.quantity * item.ratePerUnit;
      }
    }
  }

  return { totalSoldQty, totalSaleRevenue };
};

const SAMPLE_BILLS_COLLECTION = "sampleBills";
const SAMPLE_BILL_COUNTER_DOC = "sampleBillCounter";

export const getSampleBills = async (): Promise<SampleBill[]> => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, SAMPLE_BILLS_COLLECTION),
      where("userId", "==", userId),
    );
    const querySnapshot = await getDocs(q);

    const bills = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        client: {
          ...data.client,
          billingAddress:
            data.client.billingAddress || data.client.address || "",
          shippingAddress: data.client.shippingAddress || "",
        },
      } as SampleBill;
    });

    // Sort by createdAt descending
    return bills.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error getting sample bills:", error);
    return [];
  }
};

// Get single sample bill by ID
export const getSampleBillById = async (
  id: string,
): Promise<SampleBill | null> => {
  try {
    const billRef = doc(db, SAMPLE_BILLS_COLLECTION, id);
    const billSnap = await getDoc(billRef);

    if (billSnap.exists()) {
      const data = billSnap.data();
      return {
        ...data,
        client: {
          ...data.client,
          billingAddress:
            data.client.billingAddress || data.client.address || "",
          shippingAddress: data.client.shippingAddress || "",
        },
      } as SampleBill;
    }
    return null;
  } catch (error) {
    console.error("Error getting sample bill:", error);
    return null;
  }
};

// Save sample bill (NO STOCK UPDATES)
export const saveSampleBill = async (bill: SampleBill): Promise<void> => {
  try {
    const userId = getUserId();
    const billRef = doc(db, SAMPLE_BILLS_COLLECTION, bill.id);
    const cleanedBillData = removeUndefined({
      ...bill,
      userId,
      isSample: true,
    });
    await setDoc(billRef, cleanedBillData, { merge: true });
  } catch (error) {
    console.error("Error saving sample bill:", error);
    throw error;
  }
};

// Delete sample bill (NO STOCK RESTORATION)
export const deleteSampleBill = async (id: string): Promise<void> => {
  try {
    const billRef = doc(db, SAMPLE_BILLS_COLLECTION, id);
    await deleteDoc(billRef);
  } catch (error) {
    console.error("Error deleting sample bill:", error);
    throw error;
  }
};

// Update sample bill payment
export const updateSampleBillPayment = async (
  billId: string,
  paidAmount: number,
  paymentType: PaymentMethod,
  note?: string,
): Promise<void> => {
  try {
    const billRef = doc(db, SAMPLE_BILLS_COLLECTION, billId);
    const billSnap = await getDoc(billRef);

    if (billSnap.exists()) {
      const bill = billSnap.data() as SampleBill;
      const newPaidAmount = bill.paidAmount + paidAmount;
      const paymentStatus =
        newPaidAmount >= bill.total ? "paid" : bill.paymentStatus;

      const newPayment: PaymentTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        amount: paidAmount,
        method: paymentType,
        date: new Date().toISOString(),
        note: note,
      };

      const payments = Array.isArray(bill.payments)
        ? [...bill.payments, newPayment]
        : [newPayment];

      await updateDoc(billRef, {
        paidAmount: newPaidAmount,
        paymentStatus,
        paymentType: paymentType,
        payments: removeUndefined(payments),
      });
    }
  } catch (error) {
    console.error("Error updating sample bill payment:", error);
    throw error;
  }
};

// Get sample bill counter
export const getSampleBillCounter = async (): Promise<number> => {
  try {
    const userId = getUserId();
    const counterRef = doc(
      db,
      COLLECTIONS.COUNTERS,
      `${userId}_${SAMPLE_BILL_COUNTER_DOC}`,
    );
    const counterSnap = await getDoc(counterRef);

    if (counterSnap.exists()) {
      return counterSnap.data().value || 0;
    }
    return 0;
  } catch (error) {
    console.error("Error getting sample bill counter:", error);
    return 0;
  }
};

// Increment sample bill counter
export const incrementSampleBillCounter = async (): Promise<number> => {
  try {
    const userId = getUserId();
    const counterRef = doc(
      db,
      COLLECTIONS.COUNTERS,
      `${userId}_${SAMPLE_BILL_COUNTER_DOC}`,
    );
    const counterSnap = await getDoc(counterRef);

    let newValue = 1;
    if (counterSnap.exists()) {
      newValue = (counterSnap.data().value || 0) + 1;
    }

    await setDoc(counterRef, { value: newValue });
    return newValue;
  } catch (error) {
    console.error("Error incrementing sample bill counter:", error);
    throw error;
  }
};
