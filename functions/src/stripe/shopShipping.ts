/** Flat-rate shop shipping added as a Checkout line item (cents, USD). */

const DEFAULT_SHOP_FLAT_SHIPPING_CENTS = 800;

export function resolveShopFlatShippingCents(): number {
  const raw = process.env.SHOP_FLAT_SHIPPING_CENTS?.trim();
  if (!raw) return DEFAULT_SHOP_FLAT_SHIPPING_CENTS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_SHOP_FLAT_SHIPPING_CENTS;
  return n;
}
