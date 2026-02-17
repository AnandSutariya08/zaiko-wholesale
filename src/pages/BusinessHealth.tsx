import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Download,
  Calendar,
  Filter,
} from "lucide-react";
import { formatCurrency, roundToTwoDecimals } from "@/lib/billUtils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// PDF Styles
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: 10, color: '#666', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#333', backgroundColor: '#f8f9fa', padding: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '30%', padding: 10, borderWeight: 1, borderColor: '#eee', borderRadius: 4 },
  cardTitle: { fontSize: 8, color: '#666', marginBottom: 4 },
  cardValue: { fontSize: 12, fontWeight: 'bold' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  progressBar: { height: 6, backgroundColor: '#eee', borderRadius: 3, width: '100%' },
  progressFill: { height: 6, borderRadius: 3 },
  table: { marginTop: 10 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 5 },
  tableHeader: { fontWeight: 'bold', backgroundColor: '#f8f9fa' },
  col1: { flex: 2 },
  col2: { flex: 1, textAlign: 'right' },
});

const HealthPDF = ({ data, dateRange }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Business Health Analysis</Text>
        <Text style={styles.subtitle}>Report Period: {dateRange.start || 'Start'} to {dateRange.end || 'Today'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Health Indicators</Text>
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Sales Trend</Text>
            <Text style={[styles.cardValue, { color: data.salesDrop ? '#ef4444' : '#10b981' }]}>
              {data.salesDrop ? 'Critical Drop' : 'Stable'}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Discount Health</Text>
            <Text style={[styles.cardValue, { color: data.unusualDiscount ? '#f59e0b' : '#10b981' }]}>
              {data.unusualDiscount ? 'High' : 'Normal'}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Refund Status</Text>
            <Text style={[styles.cardValue, { color: data.tooManyRefunds ? '#f97316' : '#10b981' }]}>
              {data.tooManyRefunds ? 'Warning' : 'Good'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Scores</Text>
        {[
          { label: 'Cash Flow Rating', value: data.scores.cashFlow },
          { label: 'Inventory Turnover', value: data.scores.inventoryTurnover },
          { label: 'Profit Health', value: data.scores.profitHealth }
        ].map((score, i) => (
          <View key={i} style={{ marginBottom: 15 }}>
            <View style={styles.scoreRow}>
              <Text>{score.label}</Text>
              <Text>{score.value}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${score.value}%`, backgroundColor: score.value > 70 ? '#10b981' : '#f59e0b' }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventory Insights</Text>
        <Text>Dead Inventory Items: {data.deadInventory}</Text>
        <Text>Low Margin Products: {data.lowMarginProds}</Text>
        <Text>Overstocked Items: {data.stockTooHigh}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Customer</Text>
        <Text>Name: {data.topCustomer?.name || 'N/A'}</Text>
        <Text>Total Revenue: {formatCurrency(data.topCustomer?.totalRevenue || 0)}</Text>
      </View>
    </Page>
  </Document>
);

export default function BusinessHealth() {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  const healthData = useMemo(() => {
    if (!rawData) return null;
    const { bills, products, clients, returns, expenses } = rawData;

    const start = startOfDay(new Date(dateRange.start));
    const end = endOfDay(new Date(dateRange.end));

    const filteredBills = bills.filter((b: any) => isWithinInterval(new Date(b.date), { start, end }));
    const filteredReturns = returns.filter((r: any) => isWithinInterval(new Date(r.date), { start, end }));
    const filteredExpenses = expenses.filter((e: any) => isWithinInterval(new Date(e.date), { start, end }));

    // Logic for Sales Drop
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const todaySales = bills.filter((b: any) => b.date === today).reduce((sum: number, b: any) => sum + b.total, 0);
    const yesterdaySales = bills.filter((b: any) => b.date === yesterday).reduce((sum: number, b: any) => sum + b.total, 0);
    const salesDrop = yesterdaySales > 0 && todaySales < yesterdaySales * 0.7;

    // Charts Data
    const dailyData: Record<string, any> = {};
    filteredBills.forEach((b: any) => {
      const d = b.date;
      if (!dailyData[d]) dailyData[d] = { date: d, sales: 0, profit: 0 };
      dailyData[d].sales += b.total;
      dailyData[d].profit += (b.subtotal - (b.discount || 0)); // Simplified
    });
    const trendData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    // Scores Calculation
    const totalSalesVal = filteredBills.reduce((sum: number, b: any) => sum + b.total, 0);
    const totalReturnsVal = filteredReturns.reduce((sum: number, r: any) => sum + (r.totalReturnValue || 0), 0);
    const totalExpensesVal = filteredExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    
    const refundRate = totalSalesVal > 0 ? (totalReturnsVal / totalSalesVal) * 100 : 0;
    
    // Inventory Turnover (Sales / Average Inventory)
    const invValue = products.reduce((sum: number, p: any) => sum + (p.stock * (p.purchasePrice || 0)), 0);
    const turnoverScore = Math.min(100, (totalSalesVal / (invValue || 1)) * 20);

    const profitHealth = Math.max(0, 100 - (totalExpensesVal / (totalSalesVal || 1)) * 100);

    return {
      salesDrop,
      unusualDiscount: (filteredBills.reduce((s: number, b: any) => s + (b.discount || 0), 0) / (totalSalesVal || 1)) > 0.15,
      tooManyRefunds: refundRate > 5,
      trendData,
      deadInventory: products.filter((p: any) => p.stock > 0 && !new Set(filteredBills.flatMap((b: any) => b.items.map((i: any) => i.productId))).has(p.id)).length,
      lowMarginProds: products.filter((p: any) => p.price < (p.purchasePrice || 0) * 1.1).length,
      topCustomer: clients.sort((a: any, b: any) => (b.totalRevenue || 0) - (a.totalRevenue || 0))[0],
      stockTooHigh: products.filter((p: any) => p.stock > 100).length,
      scores: {
        cashFlow: 85, // Mocked for now
        inventoryTurnover: roundToTwoDecimals(turnoverScore),
        creditRisk: 15, // Mocked
        profitHealth: roundToTwoDecimals(profitHealth)
      },
      notSelling: products.filter((p: any) => p.stock > 0).slice(0, 5)
    };
  }, [rawData, dateRange]);

  useEffect(() => {
    const loadAll = async () => {
      const [bills, products, clients, purchases, deadstock, returns, expenses] = await Promise.all([
        getBills(), getProducts(), getClients(), getPurchaseBills(), getDeadstock(), getBillReturns(), getExpenses()
      ]);
      setRawData({ bills, products, clients, purchases, deadstock, returns, expenses });
      setLoading(false);
    };
    loadAll();
  }, []);

  if (loading || !healthData) return <LoadingSpinner fullScreen />;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Health</h1>
          <p className="text-muted-foreground">Detailed growth analysis and risk monitoring.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-md">
            <Input 
              type="date" 
              value={dateRange.start} 
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="h-8 w-32 border-none bg-transparent"
            />
            <span className="text-muted-foreground">to</span>
            <Input 
              type="date" 
              value={dateRange.end} 
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="h-8 w-32 border-none bg-transparent"
            />
          </div>
          <PDFDownloadLink document={<HealthPDF data={healthData} dateRange={dateRange} />} fileName={`Health_Report_${dateRange.start}_to_${dateRange.end}.pdf`}>
            {({ loading }) => (
              <Button disabled={loading} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {loading ? "Preparing..." : "Download Report"}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthMetricCard 
          title="Sales Trend" 
          value={healthData.salesDrop ? "Dropped" : "Healthy"} 
          desc="Vs. yesterday's performance" 
          icon={healthData.salesDrop ? TrendingDown : TrendingUp}
          variant={healthData.salesDrop ? "destructive" : "success"}
        />
        <HealthMetricCard 
          title="Discount Health" 
          value={healthData.unusualDiscount ? "High" : "Optimal"} 
          desc="Average discount rate" 
          icon={Percent}
          variant={healthData.unusualDiscount ? "warning" : "success"}
        />
        <HealthMetricCard 
          title="Refund Rate" 
          value={healthData.tooManyRefunds ? "High" : "Low"} 
          desc="Return vs Sales volume" 
          icon={ShieldAlert}
          variant={healthData.tooManyRefunds ? "warning" : "success"}
        />
        <HealthMetricCard 
          title="Dead Stock" 
          value={healthData.deadInventory} 
          desc="Items with zero velocity" 
          icon={Package}
          variant={healthData.deadInventory > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales & Profit Analysis</CardTitle>
            <CardDescription>Visualizing business growth over the selected period</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthData.trendData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'MMM dd')} fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `₹${v}`} />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Scores</CardTitle>
            <CardDescription>Core business stability metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScoreItem label="Cash Flow Rating" value={healthData.scores.cashFlow} />
            <ScoreItem label="Inventory Turnover" value={healthData.scores.inventoryTurnover} />
            <ScoreItem label="Credit Risk" value={healthData.scores.creditRisk} inverse />
            <ScoreItem label="Profit Health" value={healthData.scores.profitHealth} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Turnover Analysis</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={healthData.notSelling.slice(0, 5)}>
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {healthData.notSelling.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InsightCard 
            title="Top Customer" 
            value={(healthData.topCustomer as any)?.name || "N/A"} 
            subValue={formatCurrency((healthData.topCustomer as any)?.totalRevenue || 0)}
            icon={Users}
          />
          <InsightCard 
            title="Margin Risks" 
            value={`${healthData.lowMarginProds} Products`} 
            subValue="Selling < 10% margin"
            icon={TrendingDown}
            critical={healthData.lowMarginProds > 0}
          />
          <InsightCard 
            title="Overstock" 
            value={`${healthData.stockTooHigh} Items`} 
            subValue="Stock > 100 units"
            icon={Package}
          />
          <InsightCard 
            title="Dead Stock" 
            value={`${healthData.deadInventory} Items`} 
            subValue="No sales in 30 days"
            icon={AlertCircle}
            critical={healthData.deadInventory > 0}
          />
        </div>
      </div>
    </div>
  );
}

function HealthMetricCard({ title, value, desc, icon: Icon, variant }: any) {
  const colors = {
    success: "text-green-600 bg-green-50 border-green-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    destructive: "text-red-600 bg-red-50 border-red-100",
  };
  return (
    <Card className={cn("border", colors[variant as keyof typeof colors])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs opacity-80">{desc}</p>
      </CardContent>
    </Card>
  );
}

function ScoreItem({ label, value, inverse }: any) {
  const getColor = (v: number) => {
    if (inverse) return v < 30 ? "bg-green-500" : v < 60 ? "bg-amber-500" : "bg-red-500";
    return v > 70 ? "bg-green-500" : v > 40 ? "bg-amber-500" : "bg-red-500";
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold">{value}%</span>
      </div>
      <Progress value={value} className={cn("h-1.5", getColor(value))} />
    </div>
  );
}

function InsightCard({ title, value, subValue, icon: Icon, critical }: any) {
  return (
    <Card className={cn(critical && "border-red-200 bg-red-50/30")}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("h-4 w-4", critical ? "text-red-500" : "text-primary")} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        </div>
        <div className="text-lg font-bold truncate">{value}</div>
        <div className="text-xs text-muted-foreground">{subValue}</div>
      </CardContent>
    </Card>
  );
}
