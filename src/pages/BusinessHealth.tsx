import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getBills,
  getProducts,
  getClients,
  getPurchaseBills,
  getDeadstock,
  getBillReturns,
  getExpenses,
} from "@/lib/storage";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  Users,
  DollarSign,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Percent,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, roundToTwoDecimals } from "@/lib/billUtils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";

export default function BusinessHealth() {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    const loadHealthData = async () => {
      setLoading(true);
      try {
        const [bills, products, clients, purchases, deadstock, returns, expenses] = await Promise.all([
          getBills(),
          getProducts(),
          getClients(),
          getPurchaseBills(),
          getDeadstock(),
          getBillReturns(),
          getExpenses(),
        ]);

        // Logic for "Today's sales drop suddenly" (Comparison with yesterday)
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const todaySales = bills.filter(b => b.date === today).reduce((sum, b) => sum + b.total, 0);
        const yesterdaySales = bills.filter(b => b.date === yesterday).reduce((sum, b) => sum + b.total, 0);
        const salesDrop = yesterdaySales > 0 ? ((yesterdaySales - todaySales) / yesterdaySales) * 100 : 0;

        // Unusual discount (average discount > 10% in recent bills)
        const recentBills = bills.slice(-10);
        const avgDiscount = recentBills.reduce((sum, b) => sum + (b.discount || 0), 0) / (recentBills.length || 1);
        const avgTotal = recentBills.reduce((sum, b) => sum + b.total, 0) / (recentBills.length || 1);
        const discountRate = avgTotal > 0 ? (avgDiscount / avgTotal) * 100 : 0;

        // Staff refunds (Rate of returns vs sales)
        const totalReturnsVal = returns.reduce((sum, r) => sum + (r.totalReturnValue || 0), 0);
        const totalSalesVal = bills.reduce((sum, b) => sum + b.total, 0);
        const refundRate = totalSalesVal > 0 ? (totalReturnsVal / totalSalesVal) * 100 : 0;

        // Best performing product (highest quantity sold this week)
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        const weekBills = bills.filter(b => new Date(b.date) >= weekAgo);
        const prodSales: Record<string, { name: string; qty: number }> = {};
        weekBills.forEach(b => b.items.forEach(i => {
          prodSales[i.productId] = {
            name: i.productName,
            qty: (prodSales[i.productId]?.qty || 0) + i.quantity
          };
        }));
        const bestProduct = Object.values(prodSales).sort((a, b) => b.qty - a.qty)[0];

        // Dead inventory (products with 0 sales in 30 days but high stock)
        const monthAgo = new Date(Date.now() - 30 * 86400000);
        const monthBills = bills.filter(b => new Date(b.date) >= monthAgo);
        const soldInMonth = new Set(monthBills.flatMap(b => b.items.map(i => i.productId)));
        const deadInventory = products.filter(p => p.stock > 0 && !soldInMonth.has(p.id)).length;

        // Product losing margin (Price < Purchase Price + 10%)
        const lowMarginProds = products.filter(p => p.price < (p.purchasePrice || 0) * 1.1).length;

        // Scores (Simulated based on real data metrics)
        const totalReceivable = bills.reduce((sum, b) => sum + (b.total - (b.paidAmount || 0)), 0);
        const cashFlowScore = Math.max(0, 100 - (totalReceivable / (totalSalesVal || 1)) * 50);
        const turnoverScore = Math.min(100, (totalSalesVal / ((products.reduce((sum, p) => sum + (p.stock * (p.purchasePrice || 0)), 0) || 1))) * 20);
        const creditRisk = Math.min(100, (bills.filter(b => b.paymentStatus === 'overdue').length / (bills.length || 1)) * 200);
        const profitHealth = Math.max(0, 100 - (expenses.reduce((sum, e) => sum + e.amount, 0) / (totalSalesVal || 1)) * 100);

        setHealthData({
          salesDrop: salesDrop > 20,
          unusualDiscount: discountRate > 15,
          tooManyRefunds: refundRate > 5,
          bestProduct,
          deadInventory,
          lowMarginProds,
          topCustomer: clients.sort((a, b) => ((b as any).totalRevenue || 0) - ((a as any).totalRevenue || 0))[0],
          notSelling: products.filter(p => p.stock > 0 && !soldInMonth.has(p.id)).slice(0, 3),
          stockTooHigh: products.filter(p => p.stock > 100).length,
          scores: {
            cashFlow: roundToTwoDecimals(cashFlowScore),
            inventoryTurnover: roundToTwoDecimals(turnoverScore),
            creditRisk: roundToTwoDecimals(creditRisk),
            profitHealth: roundToTwoDecimals(profitHealth)
          }
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadHealthData();
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;

  const getScoreColor = (score: number, inverse = false) => {
    if (inverse) {
      if (score < 20) return "bg-green-500";
      if (score < 50) return "bg-yellow-500";
      return "bg-red-500";
    }
    if (score > 80) return "bg-green-500";
    if (score > 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Business Health</h1>
        <p className="text-muted-foreground">Comprehensive overview of your business performance and risks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Alerts Section */}
        {healthData.salesDrop && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Sales Drop Alert</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">Significant Drop</div>
              <p className="text-xs text-red-600/80">Today's sales have dropped suddenly compared to yesterday.</p>
            </CardContent>
          </Card>
        )}
        
        {healthData.unusualDiscount && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">High Discounts</CardTitle>
              <Percent className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">Unusual Rates</div>
              <p className="text-xs text-amber-600/80">Average discounts are higher than normal operational levels.</p>
            </CardContent>
          </Card>
        )}

        {healthData.tooManyRefunds && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Refund Warning</CardTitle>
              <ShieldAlert className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">High Return Rate</div>
              <p className="text-xs text-orange-600/80">Staff are processing more refunds than the historical average.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Best Performing</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{healthData.bestProduct?.name || "N/A"}</div>
            <p className="text-xs text-muted-foreground">Top selling product this week.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Critical Indicators */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Health Scores</CardTitle>
            <CardDescription>Performance metrics across key business areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cash Flow Rating</span>
                <span className="text-sm font-bold">{healthData.scores.cashFlow}%</span>
              </div>
              <Progress value={healthData.scores.cashFlow} className={cn("h-2", getScoreColor(healthData.scores.cashFlow))} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Inventory Turnover Score</span>
                <span className="text-sm font-bold">{healthData.scores.inventoryTurnover}%</span>
              </div>
              <Progress value={healthData.scores.inventoryTurnover} className={cn("h-2", getScoreColor(healthData.scores.inventoryTurnover))} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Credit Risk Score (Lower is better)</span>
                <span className="text-sm font-bold">{healthData.scores.creditRisk}%</span>
              </div>
              <Progress value={healthData.scores.creditRisk} className={cn("h-2", getScoreColor(healthData.scores.creditRisk, true))} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Profit Health Score</span>
                <span className="text-sm font-bold">{healthData.scores.profitHealth}%</span>
              </div>
              <Progress value={healthData.scores.profitHealth} className={cn("h-2", getScoreColor(healthData.scores.profitHealth))} />
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Top Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold">{(healthData.topCustomer as any)?.name || "N/A"}</div>
              <div className="text-sm text-muted-foreground">{formatCurrency((healthData.topCustomer as any)?.totalRevenue || 0)} Revenue</div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Dead Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthData.deadInventory} Products</div>
              <p className="text-xs text-muted-foreground">No sales in last 30 days despite having stock.</p>
            </CardContent>
          </Card>
          
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Margin Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthData.lowMarginProds} Items</div>
              <p className="text-xs text-muted-foreground">Products selling close to or below cost price.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Slow Moving Stock</CardTitle>
            <CardDescription>Items with high stock but low sales velocity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {healthData.notSelling.length > 0 ? healthData.notSelling.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-muted-foreground/50" />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">Stock: {p.stock} units</div>
                    </div>
                  </div>
                  <Badge variant="outline">Not Selling</Badge>
                </div>
              )) : <div className="text-center py-4 text-muted-foreground">No critical items found</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Concentration</CardTitle>
            <CardDescription>Overstocked items requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="text-4xl font-bold text-primary">{healthData.stockTooHigh}</div>
            <div className="text-sm font-medium mt-2">Overstocked Products</div>
            <p className="text-xs text-muted-foreground mt-1 text-center">Items with more than 100 units in stock. Consider clearance or promotion.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
