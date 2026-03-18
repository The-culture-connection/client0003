import { useEffect, useMemo, useState } from "react";
import type { ShopCategory, ShopSize } from "./shop";

export type CartItemKey = string;

export interface CartLine {
  itemId: string;
  name: string;
  price: number;
  category: ShopCategory;
  size?: ShopSize;
  quantity: number;
  picture?: string;
  addedAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

function getCartStorageKey(uid: string) {
  return `mortar_cart_${uid}`;
}

function getLineKey(itemId: string, size?: ShopSize) {
  return `${itemId}__${size ?? ""}`;
}

function loadCartFromStorage(uid: string): CartLine[] {
  try {
    const raw = localStorage.getItem(getCartStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    const cleaned = parsed
      .filter((l) => typeof l.expiresAt === "number" && l.expiresAt > now)
      .map((l) => ({
        ...l,
        // Backfill addedAt for old cart entries (should be rare).
        addedAt: typeof l.addedAt === "number" ? l.addedAt : now,
        expiresAt: l.expiresAt,
      }));
    if (cleaned.length !== parsed.length) {
      saveCartToStorage(uid, cleaned);
      emitCartUpdated();
    }
    return cleaned;
  } catch {
    return [];
  }
}

/**
 * Remove expired cart lines, call onRelease for each (so Firestore stock can be released),
 * save the cart and emit. Call this periodically (e.g. from Shop) so 24h-expired
 * reservations return stock for everyone.
 */
export async function purgeExpiredLines(
  uid: string,
  cart: CartLine[],
  onRelease: (line: CartLine) => void | Promise<void>
): Promise<CartLine[]> {
  const now = Date.now();
  const valid: CartLine[] = [];
  const expired: CartLine[] = [];
  for (const l of cart) {
    if (typeof l.expiresAt === "number" && l.expiresAt > now) {
      valid.push(l);
    } else {
      expired.push(l);
    }
  }
  if (expired.length === 0) return cart;
  for (const line of expired) {
    await Promise.resolve(onRelease(line));
  }
  saveCartToStorage(uid, valid);
  emitCartUpdated();
  return valid;
}

function saveCartToStorage(uid: string, cart: CartLine[]) {
  localStorage.setItem(getCartStorageKey(uid), JSON.stringify(cart));
}

function emitCartUpdated() {
  window.dispatchEvent(new Event("mortar_cart_updated"));
}

export function addCartLine(params: {
  uid: string;
  cart: CartLine[];
  itemId: string;
  name: string;
  price: number;
  category: ShopCategory;
  size?: ShopSize;
  picture?: string;
  quantity: number;
  maxQuantity?: number; // inventory cap
}): CartLine[] {
  const {
    uid,
    cart,
    itemId,
    name,
    price,
    category,
    size,
    picture,
    quantity,
    maxQuantity,
  } = params;

  const key = getLineKey(itemId, size);
  const next = [...cart];
  const idx = next.findIndex((l) => getLineKey(l.itemId, l.size) === key);
  const existingQty = idx >= 0 ? next[idx]!.quantity : 0;
  const now = Date.now();
  const ttlMs = 24 * 60 * 60 * 1000; // 1 day cart hold

  const cap = maxQuantity ?? Number.POSITIVE_INFINITY;
  const targetQty = Math.min(cap, existingQty + quantity);

  if (targetQty <= existingQty) {
    // No room to add
    saveCartToStorage(uid, next);
    emitCartUpdated();
    return next;
  }

  if (idx >= 0) {
    const existing = next[idx]!;
    // Extend expiry when the user adds more of the same line.
    next[idx] = { ...existing, quantity: targetQty, expiresAt: now + ttlMs };
  } else {
    next.push({
      itemId,
      name,
      price,
      category,
      size,
      quantity: targetQty,
      picture,
      addedAt: now,
      expiresAt: now + ttlMs,
    });
  }

  saveCartToStorage(uid, next);
  emitCartUpdated();
  return next;
}

export function removeCartLine(params: { uid: string; cart: CartLine[]; itemId: string; size?: ShopSize }): CartLine[] {
  const { uid, cart, itemId, size } = params;
  const key = getLineKey(itemId, size);
  const next = cart.filter((l) => getLineKey(l.itemId, l.size) !== key);
  saveCartToStorage(uid, next);
  emitCartUpdated();
  return next;
}

export function clearCart(uid: string): void {
  saveCartToStorage(uid, []);
  emitCartUpdated();
}

export function useCart(uid?: string | null) {
  const safeUid = uid ?? null;
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    if (!safeUid) {
      setCart([]);
      return;
    }
    setCart(loadCartFromStorage(safeUid));
  }, [safeUid]);

  useEffect(() => {
    if (!safeUid) return;
    const onUpdate = () => setCart(loadCartFromStorage(safeUid));
    window.addEventListener("mortar_cart_updated", onUpdate);
    return () => window.removeEventListener("mortar_cart_updated", onUpdate);
  }, [safeUid]);

  // Periodically purge expired lines while the page is open.
  useEffect(() => {
    if (!safeUid) return;
    const interval = window.setInterval(() => {
      setCart(loadCartFromStorage(safeUid));
    }, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [safeUid]);

  const itemCount = useMemo(() => cart.reduce((sum, l) => sum + l.quantity, 0), [cart]);

  const api = useMemo(() => {
    if (!safeUid) return null;
    return {
      addLine: (p: Omit<Parameters<typeof addCartLine>[0], "cart" | "uid">) => {
        setCart((prev) => addCartLine({ ...p, uid: safeUid, cart: prev }));
      },
      removeLine: (p: { itemId: string; size?: ShopSize }) => {
        setCart((prev) => removeCartLine({ ...p, uid: safeUid, cart: prev }));
      },
      clear: () => clearCart(safeUid),
      /** Remove expired lines and call onRelease for each so Firestore stock can be returned. */
      purgeExpiredAndRelease: async (onRelease: (line: CartLine) => void | Promise<void>) => {
        const next = await purgeExpiredLines(safeUid, cart, onRelease);
        if (next.length !== cart.length) setCart(next);
      },
    };
  }, [safeUid, cart]);

  return { cart, itemCount, api };
}

