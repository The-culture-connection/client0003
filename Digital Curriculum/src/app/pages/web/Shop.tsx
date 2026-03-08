import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  ShoppingBag,
  Star,
  Package,
  Truck,
  Shield,
  ArrowRight,
} from "lucide-react";

export function WebShop() {
  const products = [
    {
      id: 1,
      name: "Mortar Business Toolkit",
      description: "Essential resources and templates for starting your business",
      price: 49.99,
      originalPrice: 79.99,
      image: "📦",
      category: "Resources",
      featured: true,
    },
    {
      id: 2,
      name: "1-on-1 Mentorship Session",
      description: "Personalized guidance from experienced entrepreneurs",
      price: 150.00,
      image: "👥",
      category: "Services",
      featured: true,
    },
    {
      id: 3,
      name: "Advanced Marketing Course",
      description: "Deep dive into digital marketing strategies",
      price: 199.99,
      originalPrice: 249.99,
      image: "📚",
      category: "Courses",
      featured: false,
    },
    {
      id: 4,
      name: "Legal Document Templates",
      description: "Professional contracts and agreements",
      price: 89.99,
      image: "📄",
      category: "Resources",
      featured: false,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Shop Mortar</h1>
        <p className="text-muted-foreground">
          Discover resources, courses, and services to grow your business
        </p>
      </div>

      {/* Featured Products */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Featured Products</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products
            .filter((p) => p.featured)
            .map((product) => (
              <Card key={product.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="text-5xl">{product.image}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {product.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      </div>
                      {product.featured && (
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        {product.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through mr-2">
                            ${product.originalPrice}
                          </span>
                        )}
                        <span className="text-2xl font-bold text-foreground">
                          ${product.price}
                        </span>
                      </div>
                      <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      </div>

      {/* All Products */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">All Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="p-5 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">{product.image}</div>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-semibold text-foreground">
                  {product.name}
                </h3>
                {product.featured && (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
              </div>
              <Badge variant="outline" className="text-xs mb-2">
                {product.category}
              </Badge>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {product.description}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  {product.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through mr-2">
                      ${product.originalPrice}
                    </span>
                  )}
                  <span className="text-lg font-bold text-foreground">
                    ${product.price}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  Add to Cart
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <Card className="p-6 mt-8 bg-muted/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <Truck className="w-8 h-8 text-accent mb-2" />
            <p className="text-sm font-medium text-foreground">Free Shipping</p>
            <p className="text-xs text-muted-foreground">On orders over $50</p>
          </div>
          <div className="flex flex-col items-center">
            <Shield className="w-8 h-8 text-accent mb-2" />
            <p className="text-sm font-medium text-foreground">Secure Checkout</p>
            <p className="text-xs text-muted-foreground">Your data is protected</p>
          </div>
          <div className="flex flex-col items-center">
            <Package className="w-8 h-8 text-accent mb-2" />
            <p className="text-sm font-medium text-foreground">Instant Access</p>
            <p className="text-xs text-muted-foreground">Digital products available immediately</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
