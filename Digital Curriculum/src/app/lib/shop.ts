/**
 * Shop items: admin-managed catalog (name, price, picture, category).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export const SHOP_CATEGORIES = [
  "Tees",
  "Hoodies",
  "Crewnecks",
  "Household",
  "Accessories",
] as const;
export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

export const SHOP_SIZES = [
  "Small",
  "Medium",
  "Large",
  "XL",
  "2XL",
] as const;
export type ShopSize = (typeof SHOP_SIZES)[number];

export const APPAREL_CATEGORIES = ["Tees", "Hoodies", "Crewnecks"] as const;
export type ApparelCategory = (typeof APPAREL_CATEGORIES)[number];

export function isApparelCategory(category: ShopCategory): category is ApparelCategory {
  return (APPAREL_CATEGORIES as readonly string[]).includes(category);
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  picture: string; // URL
  category: ShopCategory;
  stockQuantity: number;
  lowStockThreshold: number;
  /**
   * For apparel categories only (Tees/Hoodies/Crewnecks).
   * Stored as a map so each size can have its own stock quantity.
   */
  sizeStocks?: Partial<Record<ShopSize, number>>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const COLLECTION = "shopItems";

function getShopRef() {
  return collection(db, COLLECTION);
}

function docToShopItem(id: string, data: Record<string, unknown>): ShopItem {
  return {
    id,
    ...data,
    createdAt: (data.createdAt as Timestamp) ?? Timestamp.now(),
    updatedAt: (data.updatedAt as Timestamp) ?? Timestamp.now(),
    stockQuantity: Number((data as any).stockQuantity ?? 0),
    lowStockThreshold: Number((data as any).lowStockThreshold ?? 5),
    sizeStocks: (data as any).sizeStocks ?? undefined,
  } as ShopItem;
}

/**
 * Subscribe to shop items in real time so all users and admin see
 * stockQuantity updates (add-to-cart, admin edit, 24h release) immediately.
 */
export function subscribeShopItems(callback: (items: ShopItem[]) => void): Unsubscribe {
  const q = query(getShopRef(), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => docToShopItem(d.id, d.data()));
    callback(items);
  });
}

/**
 * List all shop items (newest first). Prefer subscribeShopItems for real-time updates.
 */
export async function getShopItems(): Promise<ShopItem[]> {
  const q = query(getShopRef(), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => docToShopItem(d.id, d.data()));
}

/**
 * Get a single shop item by ID.
 */
export async function getShopItem(id: string): Promise<ShopItem | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...snap.data(),
    createdAt: snap.data().createdAt ?? Timestamp.now(),
    updatedAt: snap.data().updatedAt ?? Timestamp.now(),
    stockQuantity: Number((snap.data() as any).stockQuantity ?? 0),
    lowStockThreshold: Number((snap.data() as any).lowStockThreshold ?? 5),
    sizeStocks: (snap.data() as any).sizeStocks ?? undefined,
  } as ShopItem;
}

/**
 * Create a new shop item (admin only).
 */
export async function createShopItem(data: {
  name: string;
  price: number;
  picture: string;
  category: ShopCategory;
  stockQuantity?: number;
  lowStockThreshold?: number;
  sizeStocks?: Partial<Record<ShopSize, number>>;
}): Promise<string> {
  const stockQuantityComputed = (() => {
    if (data.stockQuantity !== undefined) return Number(data.stockQuantity);
    if (data.sizeStocks) {
      return Object.values(data.sizeStocks).reduce((sum, v) => sum + Number(v ?? 0), 0);
    }
    return 0;
  })();

  const payload: Record<string, unknown> = {
    name: data.name.trim(),
    price: Number(data.price),
    picture: data.picture.trim(),
    category: data.category,
    stockQuantity: stockQuantityComputed,
    lowStockThreshold: Number(data.lowStockThreshold ?? 5),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Firestore does not allow `undefined` field values; include only when defined.
  if (data.sizeStocks !== undefined) {
    payload.sizeStocks = data.sizeStocks;
  }

  const ref = await addDoc(getShopRef(), payload);
  return ref.id;
}

/**
 * Update a shop item (admin only).
 */
export async function updateShopItem(
  id: string,
  data: Partial<{
    name: string;
    price: number;
    picture: string;
    category: ShopCategory;
    stockQuantity: number;
    lowStockThreshold: number;
    sizeStocks: Partial<Record<ShopSize, number>>;
  }>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.price !== undefined) update.price = Number(data.price);
  if (data.picture !== undefined) update.picture = data.picture.trim();
  if (data.category !== undefined) update.category = data.category;
  if (data.stockQuantity !== undefined) update.stockQuantity = Number(data.stockQuantity);
  if (data.lowStockThreshold !== undefined) update.lowStockThreshold = Number(data.lowStockThreshold);
  if (data.sizeStocks !== undefined) update.sizeStocks = data.sizeStocks;
  await updateDoc(ref, update);
}

/**
 * Delete a shop item (admin only).
 */
export async function deleteShopItem(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * Reserve stock in Firestore when a user adds to cart. Decrements stockQuantity
 * (and sizeStocks[size] for apparel) so all users see updated availability.
 */
export async function reserveStock(params: {
  itemId: string;
  size?: ShopSize;
  quantity: number;
  category: ShopCategory;
}): Promise<void> {
  const { itemId, size, quantity, category } = params;
  if (quantity <= 0) return;

  const ref = doc(db, COLLECTION, itemId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Shop item not found");

    const data = snap.data() as Record<string, unknown>;
    const isApparel = isApparelCategory((category ?? data.category) as ShopCategory);

    if (isApparel && size) {
      const sizeStocks = { ...((data.sizeStocks as Partial<Record<ShopSize, number>>) ?? {}) };
      const current = Number(sizeStocks[size] ?? 0);
      if (current < quantity) throw new Error("Insufficient stock for this size");
      sizeStocks[size] = current - quantity;
      const newTotal = Object.values(sizeStocks).reduce((s, v) => s + Number(v ?? 0), 0);
      tx.update(ref, {
        sizeStocks,
        stockQuantity: newTotal,
        updatedAt: serverTimestamp(),
      });
    } else {
      const current = Number((data as any).stockQuantity ?? 0);
      if (current < quantity) throw new Error("Insufficient stock");
      tx.update(ref, {
        stockQuantity: current - quantity,
        updatedAt: serverTimestamp(),
      });
    }
  });
}

/**
 * Release stock back to Firestore when user removes from cart or cart line expires (24h).
 */
export async function releaseStock(params: {
  itemId: string;
  size?: ShopSize;
  quantity: number;
  category: ShopCategory;
}): Promise<void> {
  const { itemId, size, quantity, category } = params;
  if (quantity <= 0) return;

  const ref = doc(db, COLLECTION, itemId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const data = snap.data() as Record<string, unknown>;
    const isApparel = isApparelCategory((category ?? data.category) as ShopCategory);

    if (isApparel && size) {
      const sizeStocks = { ...((data.sizeStocks as Partial<Record<ShopSize, number>>) ?? {}) };
      const current = Number(sizeStocks[size] ?? 0);
      sizeStocks[size] = current + quantity;
      const newTotal = Object.values(sizeStocks).reduce((s, v) => s + Number(v ?? 0), 0);
      tx.update(ref, {
        sizeStocks,
        stockQuantity: newTotal,
        updatedAt: serverTimestamp(),
      });
    } else {
      const current = Number((data as any).stockQuantity ?? 0);
      tx.update(ref, {
        stockQuantity: current + quantity,
        updatedAt: serverTimestamp(),
      });
    }
  });
}
