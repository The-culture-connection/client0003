import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Link as LinkIcon,
  Linkedin,
  ShoppingCart,
  CreditCard,
  Check,
  X,
  ExternalLink,
  Key,
  Shield,
  Zap,
} from "lucide-react";

export function Integrations() {
  const integrations = [
    {
      name: "LinkedIn",
      description: "Share badges and credentials to LinkedIn profiles",
      icon: Linkedin,
      color: "text-[#0077B5]",
      bgColor: "bg-[#0077B5]/10",
      status: "connected",
      features: ["Badge Sharing", "Profile Sync", "Achievement Posts"],
    },
    {
      name: "Shopify",
      description: "Connect your Shopify store for advanced e-commerce",
      icon: ShoppingCart,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      status: "not-connected",
      features: ["Product Sync", "Order Management", "Inventory Tracking"],
    },
    {
      name: "Square",
      description: "Payment processing and shop links",
      icon: CreditCard,
      color: "text-accent",
      bgColor: "bg-accent/10",
      status: "connected",
      features: ["Payment Processing", "Shop Links", "Transaction Reports"],
    },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-500/10">
            <LinkIcon className="w-8 h-8 text-pink-500" />
          </div>
          Platform Integrations
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect external services: LinkedIn, Shopify, and Square
        </p>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {integrations.map((integration, idx) => (
          <Card
            key={idx}
            className={`p-6 bg-gradient-to-br from-card to-muted/20 border-border hover:border-accent transition-all`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${integration.bgColor}`}>
                <integration.icon className={`w-8 h-8 ${integration.color}`} />
              </div>
              <Badge
                className={`text-xs ${
                  integration.status === "connected"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-yellow-500/10 text-yellow-500"
                }`}
              >
                {integration.status === "connected" ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    Not Connected
                  </>
                )}
              </Badge>
            </div>

            <h2 className="text-xl font-bold text-foreground mb-2">{integration.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>

            <div className="mb-4">
              <p className="text-xs font-bold text-foreground mb-2">Features</p>
              <div className="space-y-1">
                {integration.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className={`w-full ${
                integration.status === "connected"
                  ? "bg-card border border-border hover:bg-muted/20"
                  : `${integration.bgColor} ${integration.color} hover:opacity-90`
              }`}
            >
              {integration.status === "connected" ? "Manage" : "Connect"}
            </Button>
          </Card>
        ))}
      </div>

      {/* Detailed Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LinkedIn Configuration */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#0077B5]/10">
              <Linkedin className="w-6 h-6 text-[#0077B5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">LinkedIn Integration</h2>
              <Badge className="bg-green-500/10 text-green-500 text-xs mt-1">
                <Check className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-bold text-foreground mb-2 block">
                Client ID
              </Label>
              <Input type="password" defaultValue="••••••••••••••••" />
            </div>

            <div>
              <Label className="text-sm font-bold text-foreground mb-2 block">
                Client Secret
              </Label>
              <Input type="password" defaultValue="••••••••••••••••" />
            </div>

            <div>
              <Label className="text-sm font-bold text-foreground mb-2 block">
                Redirect URI
              </Label>
              <Input defaultValue="https://mortar.com/auth/linkedin/callback" />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Badge Sharing Settings</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-foreground">Auto-prompt users to share badges</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-foreground">Include Mortar branding</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-foreground">Share to company page</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1 bg-[#0077B5] hover:bg-[#0077B5]/90 text-white">
                Save Changes
              </Button>
              <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10">
                Disconnect
              </Button>
            </div>
          </div>
        </Card>

        {/* Square Configuration */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <CreditCard className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Square Integration</h2>
              <Badge className="bg-green-500/10 text-green-500 text-xs mt-1">
                <Check className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-bold text-foreground mb-2 block">
                Application ID
              </Label>
              <Input type="password" defaultValue="••••••••••••••••" />
            </div>

            <div>
              <Label className="text-sm font-bold text-foreground mb-2 block">
                Access Token
              </Label>
              <Input type="password" defaultValue="sq0atp-••••••••••••••••" />
            </div>

            <div>
              <Label className="text-sm font-bold text-foreground mb-2 block">
                Location ID
              </Label>
              <Input defaultValue="L5T8ABCDEFGH" />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Shop Configuration</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1 block">Shop URL</Label>
                  <div className="flex items-center gap-2">
                    <Input defaultValue="https://square.link/u/mortar-shop" />
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-foreground">Enable embedded checkout</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                Save Changes
              </Button>
              <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10">
                Disconnect
              </Button>
            </div>
          </div>
        </Card>

        {/* Shopify Configuration */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500/10">
              <ShoppingCart className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Shopify Integration</h2>
              <Badge className="bg-yellow-500/10 text-yellow-500 text-xs mt-1">
                <X className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-bold text-foreground mb-2 block">
                Store URL
              </Label>
              <Input placeholder="https://your-store.myshopify.com" />
            </div>

            <div>
              <Label className="text-sm font-bold text-foreground mb-2 block">
                API Key
              </Label>
              <Input placeholder="Enter your Shopify API key" />
            </div>

            <div>
              <Label className="text-sm font-bold text-foreground mb-2 block">
                API Secret
              </Label>
              <Input type="password" placeholder="Enter your API secret" />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Features</h3>
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4" />
                  <span>Product synchronization</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4" />
                  <span>Order management</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4" />
                  <span>Inventory tracking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4" />
                  <span>Customer data sync</span>
                </div>
              </div>
            </div>

            <Button className="w-full bg-green-500 hover:bg-green-500/90 text-white">
              Connect Shopify
            </Button>
          </div>
        </Card>

        {/* API Security */}
        <Card className="p-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-lg font-bold text-foreground">API Security</h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-accent" />
                <p className="text-sm font-bold text-foreground">Secure Key Storage</p>
              </div>
              <p className="text-xs text-muted-foreground">
                All API keys are encrypted and stored securely in Supabase. Keys are never exposed in client-side code.
              </p>
            </div>

            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-accent" />
                <p className="text-sm font-bold text-foreground">Environment Variables</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure sensitive values in the Supabase dashboard under "Edge Functions" → "Secrets"
              </p>
            </div>

            <Button variant="outline" className="w-full border-border">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Supabase Secrets
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
