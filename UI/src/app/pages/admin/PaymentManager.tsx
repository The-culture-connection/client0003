import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  DollarSign,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  Calendar,
  Users,
  BookOpen,
  Package,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

export function PaymentManager() {
  const revenueData = [
    { month: "Jan", courses: 2400, events: 1200, shop: 800 },
    { month: "Feb", courses: 3200, events: 1600, shop: 1200 },
    { month: "Mar", courses: 4100, events: 2200, shop: 1400 },
    { month: "Apr", courses: 3800, events: 1800, shop: 1100 },
  ];

  const transactions = [
    { id: 1, user: "Alex Rodriguez", item: "Module 2: Customer Discovery", amount: 99, date: "2026-04-12", status: "Completed" },
    { id: 2, user: "Sarah Chen", item: "Networking Workshop", amount: 25, date: "2026-04-11", status: "Completed" },
    { id: 3, user: "Marcus Thompson", item: "Module 3: Financial Modeling", amount: 149, date: "2026-04-10", status: "Pending" },
    { id: 4, user: "Jordan Kim", item: "Pitch Competition", amount: 50, date: "2026-04-09", status: "Completed" },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <DollarSign className="w-8 h-8 text-accent" />
          </div>
          Payment & Revenue Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure pricing, track transactions, and manage revenue streams
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-5 bg-card border-border">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-accent/10">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <Badge className="bg-green-500/10 text-green-500 text-xs">+23%</Badge>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">$24,590</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </Card>

        <Card className="p-5 bg-card border-border">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">$13,700</p>
          <p className="text-xs text-muted-foreground">Course Sales</p>
        </Card>

        <Card className="p-5 bg-card border-border">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">$6,800</p>
          <p className="text-xs text-muted-foreground">Event Tickets</p>
        </Card>

        <Card className="p-5 bg-card border-border">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-green-500/10">
              <ShoppingCart className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">$4,090</p>
          <p className="text-xs text-muted-foreground">Shop Sales</p>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Course Pricing</TabsTrigger>
          <TabsTrigger value="events">Event Pricing</TabsTrigger>
          <TabsTrigger value="shop">Shop Items</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">Revenue by Category</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(250,252,252,0.1)" />
                <XAxis dataKey="month" stroke="#b8b8b8" />
                <YAxis stroke="#b8b8b8" />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#3a3a3a",
                    border: "1px solid rgba(250,252,252,0.15)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="courses" fill="#3b82f6" name="Courses" />
                <Bar dataKey="events" fill="#a855f7" name="Events" />
                <Bar dataKey="shop" fill="#10b981" name="Shop" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        {/* Course Pricing Tab */}
        <TabsContent value="courses" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Course Pricing</h2>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Save Changes
              </Button>
            </div>

            <div className="space-y-3">
              {[
                { course: "Module 1: Idea Validation", currentPrice: 0, sales: 234 },
                { course: "Module 2: Customer Discovery", currentPrice: 99, sales: 156 },
                { course: "Module 3: Financial Modeling", currentPrice: 149, sales: 98 },
                { course: "Module 4: Pitch & Launch", currentPrice: 199, sales: 67 },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.course}</p>
                      <p className="text-xs text-muted-foreground">{item.sales} sales</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">$</Label>
                      <Input
                        type="number"
                        defaultValue={item.currentPrice}
                        className="w-24"
                      />
                    </div>
                    <Badge
                      className={`text-xs ${
                        item.currentPrice === 0
                          ? "bg-green-500/10 text-green-500"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {item.currentPrice === 0 ? "Free" : "Paid"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Event Pricing Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Event Pricing</h2>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Save Changes
              </Button>
            </div>

            <div className="space-y-3">
              {[
                { event: "Networking Workshop", currentPrice: 25, tickets: 42 },
                { event: "Guest Speaker Series", currentPrice: 0, tickets: 87 },
                { event: "Pitch Competition", currentPrice: 50, tickets: 156 },
                { event: "Mentor Mixer", currentPrice: 15, tickets: 34 },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Calendar className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.event}</p>
                      <p className="text-xs text-muted-foreground">{item.tickets} tickets sold</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">$</Label>
                      <Input
                        type="number"
                        defaultValue={item.currentPrice}
                        className="w-24"
                      />
                    </div>
                    <Badge
                      className={`text-xs ${
                        item.currentPrice === 0
                          ? "bg-green-500/10 text-green-500"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {item.currentPrice === 0 ? "Free" : "Paid"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Shop Items Tab */}
        <TabsContent value="shop" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Shop Items</h2>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Manage on Square
              </Button>
            </div>

            <div className="space-y-3">
              {[
                { item: "Mortar Branded Notebook", price: 19.99, stock: 145 },
                { item: "Entrepreneur Starter Kit", price: 49.99, stock: 67 },
                { item: "Business Plan Template Bundle", price: 29.99, stock: 89 },
                { item: "Mortar T-Shirt", price: 24.99, stock: 234 },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Package className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.item}</p>
                      <p className="text-xs text-muted-foreground">{item.stock} in stock</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-foreground">${item.price}</span>
                    <Badge className="bg-green-500/10 text-green-500 text-xs">In Stock</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Recent Transactions</h2>
              <Button variant="outline" className="border-border">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-bold text-foreground">ID</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">User</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">Item</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">Amount</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">Date</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-4 text-sm text-muted-foreground">#{transaction.id}</td>
                      <td className="p-4 text-sm text-foreground">{transaction.user}</td>
                      <td className="p-4 text-sm text-foreground">{transaction.item}</td>
                      <td className="p-4 text-sm font-bold text-foreground">
                        ${transaction.amount}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{transaction.date}</td>
                      <td className="p-4">
                        <Badge
                          className={`text-xs ${
                            transaction.status === "Completed"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {transaction.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
