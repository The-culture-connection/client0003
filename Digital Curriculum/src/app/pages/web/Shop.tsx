import { useState, useEffect } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  ShoppingBag,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import {
  subscribeShopItems,
  SHOP_CATEGORIES,
  reserveStock,
  releaseStock,
  type ShopCategory,
  type ShopItem,
} from "../../lib/shop";
import { useAuth } from "../../components/auth/AuthProvider";
import { useCart } from "../../lib/cart";
import { SHOP_SIZES, isApparelCategory, type ShopSize } from "../../lib/shop";
import { useNavigate } from "react-router";
import { Label } from "../../components/ui/label";
import { useScreenAnalytics } from "../../analytics/useScreenAnalytics";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

export function WebShop() {
  useScreenAnalytics("shop");
  const [products, setProducts] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, api } = useCart(user?.uid ?? null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, ShopSize>>({});
  const [shopFilter, setShopFilter] = useState<ShopCategory | "All">("All");
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  // Real-time stock so all users see updates (add-to-cart, admin edit, 24h release)
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeShopItems((items) => {
      setProducts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Purge expired cart lines and release stock so 24h expiry updates for everyone
  useEffect(() => {
    if (!user?.uid || !api) return;
    const release = (line: { itemId: string; size?: ShopSize; quantity: number; category: ShopCategory }) =>
      releaseStock({ itemId: line.itemId, size: line.size, quantity: line.quantity, category: line.category }).catch(
        console.error
      );
    api.purgeExpiredAndRelease(release); // run once on mount
    const interval = window.setInterval(() => {
      api.purgeExpiredAndRelease(release);
    }, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [user?.uid, api]);

  useEffect(() => {
    // Initialize default sizes when apparel items are loaded
    if (products.length === 0) return;
    setSelectedSizes((prev) => {
      const next = { ...prev };
      for (const p of products) {
        if (!isApparelCategory(p.category)) continue;
        if (next[p.id]) continue;
        const ss = p.sizeStocks ?? {};
        const defaultSize =
          SHOP_SIZES.find((s) => Number((ss as any)[s] ?? 0) > 0) ?? SHOP_SIZES[0];
        next[p.id] = defaultSize;
      }
      return next;
    });
  }, [products]);

  const getAvailableStock = (p: ShopItem, size?: ShopSize) => {
    if (isApparelCategory(p.category)) {
      if (!size) return 0;
      return Number((p.sizeStocks ?? {})[size] ?? 0);
    }
    return Number(p.stockQuantity ?? 0);
  };

  const visibleProducts =
    shopFilter === "All" ? products : products.filter((p) => p.category === shopFilter);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Shop Mortar</h1>
        <p className="text-muted-foreground">
          Tees, hoodies, crewnecks, household items, and accessories
        </p>
      </div>

      {/* Filter by item type */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-muted-foreground">Filter:</div>
        <select
          value={shopFilter}
          onChange={(e) => {
            const v = e.target.value as ShopCategory | "All";
            setShopFilter(v);
            trackEvent(WEB_ANALYTICS_EVENTS.SHOP_FILTER_CHANGED, { filter: v });
          }}
          className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
        >
          <option value="All">All</option>
          {SHOP_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : visibleProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No items in the shop yet. Check back soon!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-muted relative">
                {product.picture ? (
                  <img
                    src={product.picture}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <Badge variant="outline" className="text-xs mb-2">
                  {product.category}
                </Badge>
                <h3 className="font-semibold text-foreground mb-1">{product.name}</h3>
                <p className="text-lg font-bold text-accent">${Number(product.price).toFixed(2)}</p>

                {isApparelCategory(product.category) && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">Select size</Label>
                    <select
                      value={selectedSizes[product.id] ?? SHOP_SIZES[0]}
                      onChange={(e) => {
                        const sz = e.target.value as ShopSize;
                        setSelectedSizes((prev) => ({
                          ...prev,
                          [product.id]: sz,
                        }));
                        trackEvent(WEB_ANALYTICS_EVENTS.SHOP_SIZE_CHANGED, {
                          item_id: product.id,
                          size: sz,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                    >
                      {SHOP_SIZES.map((size) => {
                        const available = getAvailableStock(product, size);
                        return (
                          <option key={size} value={size} disabled={available <= 0}>
                            {size} {available <= 0 ? "(Out)" : `(${available} in stock)`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {(() => {
                  const size = isApparelCategory(product.category) ? selectedSizes[product.id] : undefined;
                  const available = getAvailableStock(product, size);
                  const outOfStock = available <= 0;
                  const lowStock = !outOfStock && available <= product.lowStockThreshold;
                  const canAdd = !outOfStock && addingItemId !== product.id;
                  return (
                    <>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={outOfStock ? "destructive" : lowStock ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {outOfStock
                            ? "Out of stock"
                            : lowStock
                              ? `Low stock (${available} left)`
                              : `In stock (${available} left)`}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-3 bg-accent hover:bg-accent/90 text-accent-foreground"
                        disabled={!canAdd}
                        onClick={async () => {
                          if (!user?.uid) {
                            alert("Please sign in to add items to your cart.");
                            navigate("/login");
                            return;
                          }
                          if (!api) return;
                          if (available <= 0) {
                            alert("That item/size is out of stock.");
                            return;
                          }

                          const sizeToUse = isApparelCategory(product.category) ? selectedSizes[product.id] : undefined;
                          setAddingItemId(product.id);
                          try {
                            await reserveStock({
                              itemId: product.id,
                              size: sizeToUse,
                              quantity: 1,
                              category: product.category,
                            });
                            api.addLine({
                              itemId: product.id,
                              name: product.name,
                              price: Number(product.price),
                              category: product.category,
                              size: sizeToUse,
                              picture: product.picture,
                              quantity: 1,
                              maxQuantity: available,
                            });
                            trackEvent(WEB_ANALYTICS_EVENTS.SHOP_ADD_TO_CART_CLICKED, {
                              item_id: product.id,
                              category: product.category,
                            });
                          } catch (e) {
                            trackEvent(WEB_ANALYTICS_EVENTS.SHOP_ADD_TO_CART_FAILED, {
                              item_id: product.id,
                              category: product.category,
                            });
                            const msg = e instanceof Error ? e.message : "Failed to add to cart.";
                            alert(msg === "Insufficient stock" || msg === "Insufficient stock for this size" ? "That item/size is out of stock." : msg);
                          } finally {
                            setAddingItemId(null);
                          }
                        }}
                      >
                        {addingItemId === product.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          "Add to Cart"
                        )}
                      </Button>
                    </>
                  );
                })()}
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
