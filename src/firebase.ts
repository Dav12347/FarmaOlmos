import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch,
  getDocFromServer,
  Unsubscribe 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  Product, 
  Customer, 
  Sale, 
  InventoryMovement, 
  DebtPayment, 
  PharmacySettings,
  CashCut,
  CashMovement
} from './types/pharmacy';

// Initialize Firebase App singleton
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(firebaseApp);

// Initialize Firestore
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

// Ensure user is signed in anonymously for real-time Firestore operations (optional/safe)
export const initAuth = async (): Promise<User | null> => {
  return new Promise((resolve) => {
    try {
      const unsub = onAuthStateChanged(auth, async (user) => {
        unsub();
        if (user) {
          resolve(user);
        } else {
          try {
            const cred = await signInAnonymously(auth);
            resolve(cred.user);
          } catch (error) {
            // Project might not have anonymous auth enabled, which is fine if rules allow public access
            console.info('Firebase auth note (anonymous auth):', error);
            resolve(null);
          }
        }
      });
    } catch (e) {
      console.info('Firebase auth init note:', e);
      resolve(null);
    }
  });
};

// Firestore collections names
export const COLLECTIONS = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  MOVEMENTS: 'movements',
  PAYMENTS: 'payments',
  SETTINGS: 'settings',
  CASH_CUTS: 'cash_cuts',
  CASH_MOVEMENTS: 'cash_movements',
};

// Deep Sanitizer: Firestore throws an error if any field is undefined.
// This function removes undefined values and cleans nested objects/arrays.
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return '' as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  const cleanObj: any = {};
  for (const [key, value] of Object.entries(data as any)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    } else {
      // Default to empty string or null instead of undefined
      cleanObj[key] = '';
    }
  }
  return cleanObj;
}

// Test Firestore Connection
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    // If not found, connection reached the server successfully
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline');
      return false;
    }
    return true;
  }
}

// Realtime cloud synchronization service
export class CloudSyncService {
  
  // Real-time products listener
  static subscribeProducts(
    onUpdate: (products: Product[]) => void, 
    onError?: (error: Error) => void
  ): Unsubscribe {
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    return onSnapshot(productsRef, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Product);
      });
      // Sort with newest or alphabetically
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onUpdate(items);
    }, (error) => {
      console.error('Realtime products listener error:', error);
      if (onError) onError(error);
    });
  }

  // Real-time customers listener
  static subscribeCustomers(
    onUpdate: (customers: Customer[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const customersRef = collection(db, COLLECTIONS.CUSTOMERS);
    return onSnapshot(customersRef, (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Customer);
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(items);
    }, (error) => {
      console.error('Realtime customers listener error:', error);
      if (onError) onError(error);
    });
  }

  // Real-time sales listener
  static subscribeSales(
    onUpdate: (sales: Sale[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const salesRef = collection(db, COLLECTIONS.SALES);
    return onSnapshot(salesRef, (snapshot) => {
      const items: Sale[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Sale);
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    }, (error) => {
      console.error('Realtime sales listener error:', error);
      if (onError) onError(error);
    });
  }

  // Real-time movements listener
  static subscribeMovements(
    onUpdate: (movements: InventoryMovement[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const movementsRef = collection(db, COLLECTIONS.MOVEMENTS);
    return onSnapshot(movementsRef, (snapshot) => {
      const items: InventoryMovement[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as InventoryMovement);
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    }, (error) => {
      console.error('Realtime movements listener error:', error);
      if (onError) onError(error);
    });
  }

  // Real-time debt payments listener
  static subscribePayments(
    onUpdate: (payments: DebtPayment[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
    return onSnapshot(paymentsRef, (snapshot) => {
      const items: DebtPayment[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as DebtPayment);
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    }, (error) => {
      console.error('Realtime payments listener error:', error);
      if (onError) onError(error);
    });
  }

  // Real-time cash cuts listener
  static subscribeCashCuts(
    onUpdate: (cashCuts: CashCut[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const cutsRef = collection(db, COLLECTIONS.CASH_CUTS);
    return onSnapshot(cutsRef, (snapshot) => {
      const items: CashCut[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as CashCut);
      });
      items.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
      onUpdate(items);
    }, (error) => {
      console.error('Realtime cash cuts listener error:', error);
      if (onError) onError(error);
    });
  }

  // Real-time cash movements listener
  static subscribeCashMovements(
    onUpdate: (movements: CashMovement[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const movsRef = collection(db, COLLECTIONS.CASH_MOVEMENTS);
    return onSnapshot(movsRef, (snapshot) => {
      const items: CashMovement[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as CashMovement);
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    }, (error) => {
      console.error('Realtime cash movements listener error:', error);
      if (onError) onError(error);
    });
  }

  // Real-time settings listener
  static subscribeSettings(
    onUpdate: (settings: PharmacySettings) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const settingsDocRef = doc(db, COLLECTIONS.SETTINGS, 'pharmacy_config');
    return onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as PharmacySettings);
      }
    }, (error) => {
      console.error('Realtime settings listener error:', error);
      if (onError) onError(error);
    });
  }

  // Save single product
  static async saveProduct(product: Product): Promise<void> {
    const cleanProduct = sanitizeForFirestore(product);
    const ref = doc(db, COLLECTIONS.PRODUCTS, cleanProduct.id);
    await setDoc(ref, cleanProduct, { merge: true });
  }

  // Save multiple products (e.g. after a bulk stock entry or sale)
  static async saveProductsBatch(products: Product[]): Promise<void> {
    if (!products || products.length === 0) return;

    // Chunk in slices of 250 items to stay safely under Firestore's 500 batch limit
    const chunkSize = 250;
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      try {
        const batch = writeBatch(db);
        chunk.forEach((prod) => {
          const cleanProd = sanitizeForFirestore(prod);
          const ref = doc(db, COLLECTIONS.PRODUCTS, cleanProd.id);
          batch.set(ref, cleanProd, { merge: true });
        });
        await batch.commit();
      } catch (batchErr) {
        console.warn('Batch write product warning, writing individually:', batchErr);
        for (const prod of chunk) {
          try {
            const cleanProd = sanitizeForFirestore(prod);
            const ref = doc(db, COLLECTIONS.PRODUCTS, cleanProd.id);
            await setDoc(ref, cleanProd, { merge: true });
          } catch (singleErr) {
            console.error('Failed to save individual product to Firestore:', prod.id, singleErr);
          }
        }
      }
    }
  }

  // Delete product
  static async deleteProduct(productId: string): Promise<void> {
    const ref = doc(db, COLLECTIONS.PRODUCTS, productId);
    await deleteDoc(ref);
  }

  // Save single customer
  static async saveCustomer(customer: Customer): Promise<void> {
    const cleanCustomer = sanitizeForFirestore(customer);
    const ref = doc(db, COLLECTIONS.CUSTOMERS, cleanCustomer.id);
    await setDoc(ref, cleanCustomer, { merge: true });
  }

  // Delete customer
  static async deleteCustomer(customerId: string): Promise<void> {
    const ref = doc(db, COLLECTIONS.CUSTOMERS, customerId);
    await deleteDoc(ref);
  }

  // Save Sale in real time
  static async saveSale(sale: Sale, updatedProducts?: Product[], updatedCustomer?: Customer): Promise<void> {
    const cleanSale = sanitizeForFirestore(sale);
    const saleRef = doc(db, COLLECTIONS.SALES, cleanSale.id);

    try {
      const batch = writeBatch(db);
      
      // 1. Add Sale doc
      batch.set(saleRef, cleanSale);

      // 2. Update stock for sold products
      if (updatedProducts && updatedProducts.length > 0) {
        // Limit batch to remaining slots
        const prodsToBatch = updatedProducts.slice(0, 300);
        prodsToBatch.forEach((prod) => {
          const cleanProd = sanitizeForFirestore(prod);
          const prodRef = doc(db, COLLECTIONS.PRODUCTS, cleanProd.id);
          batch.set(prodRef, cleanProd, { merge: true });
        });
      }

      // 3. Update customer if credit
      if (updatedCustomer) {
        const cleanCust = sanitizeForFirestore(updatedCustomer);
        const custRef = doc(db, COLLECTIONS.CUSTOMERS, cleanCust.id);
        batch.set(custRef, cleanCust, { merge: true });
      }

      await batch.commit();
    } catch (err) {
      console.warn('Batch sale save failed, saving individually:', err);
      await setDoc(saleRef, cleanSale);
      if (updatedProducts && updatedProducts.length > 0) {
        await this.saveProductsBatch(updatedProducts);
      }
      if (updatedCustomer) {
        await this.saveCustomer(updatedCustomer);
      }
    }
  }

  // Save Inventory Movement in real time
  static async saveMovement(movement: InventoryMovement, updatedProducts?: Product[]): Promise<void> {
    const cleanMovement = sanitizeForFirestore(movement);
    const movRef = doc(db, COLLECTIONS.MOVEMENTS, cleanMovement.id);

    try {
      // 1. Save movement doc
      await setDoc(movRef, cleanMovement);

      // 2. Update associated products
      if (updatedProducts && updatedProducts.length > 0) {
        await this.saveProductsBatch(updatedProducts);
      }
    } catch (err) {
      console.error('Error saving movement or restocked products to Firestore:', err);
      throw err;
    }
  }

  // Save Debt Payment in real time
  static async savePayment(payment: DebtPayment, updatedCustomer: Customer): Promise<void> {
    const cleanPayment = sanitizeForFirestore(payment);
    const cleanCustomer = sanitizeForFirestore(updatedCustomer);

    const payRef = doc(db, COLLECTIONS.PAYMENTS, cleanPayment.id);
    const custRef = doc(db, COLLECTIONS.CUSTOMERS, cleanCustomer.id);

    try {
      const batch = writeBatch(db);
      batch.set(payRef, cleanPayment);
      batch.set(custRef, cleanCustomer, { merge: true });
      await batch.commit();
    } catch (err) {
      console.warn('Batch payment write failed, saving individually:', err);
      await setDoc(payRef, cleanPayment);
      await setDoc(custRef, cleanCustomer, { merge: true });
    }
  }

  // Save Cash Cut
  static async saveCashCut(cashCut: CashCut): Promise<void> {
    const cleanCut = sanitizeForFirestore(cashCut);
    const cutRef = doc(db, COLLECTIONS.CASH_CUTS, cleanCut.id);
    await setDoc(cutRef, cleanCut, { merge: true });
  }

  // Save Cash Movement (in/out)
  static async saveCashMovement(movement: CashMovement): Promise<void> {
    const cleanMovement = sanitizeForFirestore(movement);
    const movRef = doc(db, COLLECTIONS.CASH_MOVEMENTS, cleanMovement.id);
    await setDoc(movRef, cleanMovement, { merge: true });
  }

  // Cancel/Refund sale in Firestore (updates sale, restocks products, adjusts customer debt and creates Kardex movement atomically)
  static async cancelSaleInCloud(
    updatedSale: Sale,
    restockedProducts: Product[],
    reversalMovement: InventoryMovement,
    updatedCustomer?: Customer
  ): Promise<void> {
    const cleanSale = sanitizeForFirestore(updatedSale);
    const cleanMov = sanitizeForFirestore(reversalMovement);
    const saleRef = doc(db, COLLECTIONS.SALES, cleanSale.id);
    const movRef = doc(db, COLLECTIONS.MOVEMENTS, cleanMov.id);

    try {
      const batch = writeBatch(db);
      
      // 1. Update sale record with cancelled status
      batch.set(saleRef, cleanSale, { merge: true });

      // 2. Add inventory entry movement for returned stock
      batch.set(movRef, cleanMov);

      // 3. Restock products in inventory
      if (restockedProducts && restockedProducts.length > 0) {
        restockedProducts.forEach(prod => {
          const cleanProd = sanitizeForFirestore(prod);
          const prodRef = doc(db, COLLECTIONS.PRODUCTS, cleanProd.id);
          batch.set(prodRef, cleanProd, { merge: true });
        });
      }

      // 4. Update customer debt if credit sale was cancelled
      if (updatedCustomer) {
        const cleanCust = sanitizeForFirestore(updatedCustomer);
        const custRef = doc(db, COLLECTIONS.CUSTOMERS, cleanCust.id);
        batch.set(custRef, cleanCust, { merge: true });
      }

      await batch.commit();
    } catch (err) {
      console.warn('Batch cancel sale write failed, saving individually:', err);
      await setDoc(saleRef, cleanSale, { merge: true });
      await setDoc(movRef, cleanMov);
      if (restockedProducts && restockedProducts.length > 0) {
        await this.saveProductsBatch(restockedProducts);
      }
      if (updatedCustomer) {
        await this.saveCustomer(updatedCustomer);
      }
    }
  }

  // Save Settings in real time
  static async saveSettings(settings: PharmacySettings): Promise<void> {
    const cleanSettings = sanitizeForFirestore(settings);
    const ref = doc(db, COLLECTIONS.SETTINGS, 'pharmacy_config');
    await setDoc(ref, cleanSettings, { merge: true });
  }

  // Wipe all data from Cloud Firestore (only when explicitly requested by user in Settings)
  static async wipeAllDataFromCloud(keepSettings = true): Promise<void> {
    try {
      const collectionsToWipe = [
        COLLECTIONS.PRODUCTS,
        COLLECTIONS.CUSTOMERS,
        COLLECTIONS.SALES,
        COLLECTIONS.MOVEMENTS,
        COLLECTIONS.PAYMENTS,
        COLLECTIONS.CASH_CUTS,
        COLLECTIONS.CASH_MOVEMENTS,
      ];

      for (const collName of collectionsToWipe) {
        const snap = await getDocs(collection(db, collName));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      }

      if (!keepSettings) {
        await deleteDoc(doc(db, COLLECTIONS.SETTINGS, 'pharmacy_config')).catch(() => {});
      }
      console.log('Collections purged from Firestore Cloud successfully.');
    } catch (error) {
      console.warn('Error purging Firestore Cloud data:', error);
    }
  }

  // Seed initial cloud data if Firestore is currently empty
  static async seedInitialDataIfEmpty(
    initialProducts: Product[],
    initialCustomers: Customer[],
    initialSales: Sale[],
    initialMovements: InventoryMovement[],
    initialPayments: DebtPayment[],
    initialSettings: PharmacySettings
  ): Promise<boolean> {
    try {
      if (!initialProducts || initialProducts.length === 0) {
        return false;
      }
      const prodSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
      if (!prodSnap.empty) {
        return false;
      }

      await this.saveProductsBatch(initialProducts);
      if (initialCustomers.length > 0) {
        for (const c of initialCustomers) {
          await this.saveCustomer(c);
        }
      }
      if (initialSettings) {
        await this.saveSettings(initialSettings);
      }
      return true;
    } catch (e) {
      console.warn('Initial seeding note:', e);
      return false;
    }
  }
}
