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
  getVendors,
  getCreators,
  getPurchaseReturns,
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
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  ArrowRight,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatCurrency, roundToTwoDecimals } from "@/lib/billUtils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { format, subDays, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, isSameDay } from "date-fns";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Professional PDF Styles
const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#3b82f6', paddingBottom: 15 },
  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  dateRange: { fontSize: 10, color: '#64748b', marginTop: 5 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#0f172a', borderLeftWidth: 4, borderLeftColor: '#3b82f6', paddingLeft: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  metricCard: { width: '22%', padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3 },
  metricLabel: { fontSize: 8, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  scoreCard: { marginBottom: 15, padding: 15, backgroundColor: '#f8fafc', borderRadius: 8 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  scoreLabel: { fontSize: 11, fontWeight: 'bold', color: '#334155' },
  scoreValue: { fontSize: 11, fontWeight: 'bold' },
  progressBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  table: { marginTop: 10, width: '100%' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 8, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  colName: { flex: 3 },
  colValue: { flex: 1, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
});

const HealthPDF = ({ data, dateRange }: any) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <View style={pdfStyles.headerMain}>
          <Text style={pdfStyles.title}>Business Health Report</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#3b82f6' }}>Zaiko Enterprise</Text>
        </View>
        <Text style={pdfStyles.dateRange}>Analysis Period: {format(new Date(dateRange.start), 'PPP')} - {format(new Date(dateRange.end), 'PPP')}</Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Executive Summary</Text>
        <View style={pdfStyles.grid}>
          <View style={[pdfStyles.metricCard, { borderLeftColor: '#10b981' }]}>
            <Text style={pdfStyles.metricLabel}>Total Sales</Text>
            <Text style={pdfStyles.metricValue}>{formatCurrency(data.summary.totalSales)}</Text>
          </View>
          <View style={[pdfStyles.metricCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={pdfStyles.metricLabel}>Total Profit</Text>
            <Text style={pdfStyles.metricValue}>{formatCurrency(data.summary.totalProfit)}</Text>
          </View>
          <View style={[pdfStyles.metricCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={pdfStyles.metricLabel}>Expenses</Text>
            <Text style={pdfStyles.metricValue}>{formatCurrency(data.summary.totalExpenses)}</Text>
          </View>
          <View style={[pdfStyles.metricCard, { borderLeftColor: '#ef4444' }]}>
            <Text style={pdfStyles.metricLabel}>Margin %</Text>
            <Text style={pdfStyles.metricValue}>{data.summary.avgMargin}%</Text>
          </View>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Operational Performance Scores</Text>
        {[
          { label: 'Cash Flow Stability', value: data.scores.cashFlow },
          { label: 'Inventory Efficiency', value: data.scores.inventoryTurnover },
          { label: 'Profitability Health', value: data.scores.profitHealth },
          { label: 'Credit Risk (Lower is Better)', value: 100 - data.scores.creditRisk }
        ].map((score, i) => (
          <View key={i} style={pdfStyles.scoreCard}>
            <View style={pdfStyles.scoreHeader}>
              <Text style={pdfStyles.scoreLabel}>{score.label}</Text>
              <Text style={[pdfStyles.scoreValue, { color: score.value > 70 ? '#10b981' : score.value > 40 ? '#f59e0b' : '#ef4444' }]}>{score.value}%</Text>
            </View>
            <View style={pdfStyles.progressBar}>
              <View style={[pdfStyles.progressFill, { width: `${score.value}%`, backgroundColor: score.value > 70 ? '#10b981' : score.value > 40 ? '#f59e0b' : '#ef4444' }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Financial Summary</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colName}>Description</Text>
            <Text style={pdfStyles.colValue}>Amount</Text>
          </View>
          <View style={pdfStyles.tableRow}>
            <Text style={pdfStyles.colName}>Sales Returns</Text>
            <Text style={pdfStyles.colValue}>{formatCurrency(data.summary.totalReturns)}</Text>
          </View>
          <View style={pdfStyles.tableRow}>
            <Text style={pdfStyles.colName}>Purchase Returns</Text>
            <Text style={pdfStyles.colValue}>{formatCurrency(data.summary.totalPurchaseReturns)}</Text>
          </View>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>User Performance</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colName}>User</Text>
            <Text style={pdfStyles.colValue}>Sales</Text>
          </View>
          {data.userAnalysis.map((u: any, i: number) => (
            <View key={i} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.colName}>{u.name}</Text>
              <Text style={pdfStyles.colValue}>{formatCurrency(u.sales)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Top Clients</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colName}>Client</Text>
            <Text style={pdfStyles.colValue}>Total Value</Text>
          </View>
          {data.clientAnalysis.map((c: any, i: number) => (
            <View key={i} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.colName}>{c.name}</Text>
              <Text style={pdfStyles.colValue}>{formatCurrency(c.sales)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Vendor Performance</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colName}>Vendor</Text>
            <Text style={pdfStyles.colValue}>Purchases</Text>
          </View>
          {data.vendorAnalysis.map((v: any, i: number) => (
            <View key={i} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.colName}>{v.name}</Text>
              <Text style={pdfStyles.colValue}>{formatCurrency(v.purchases)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Expenses Detail</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colName}>Description</Text>
            <Text style={pdfStyles.colValue}>Amount</Text>
          </View>
          {data.expenses.map((e: any, i: number) => (
            <View key={i} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.colName}>{e.description}</Text>
              <Text style={pdfStyles.colValue}>{formatCurrency(e.amount)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Risk Assessment</Text>
        <View style={{ gap: 8 }}>
          <Text>• Dead Stock Impact: {data.deadInventory} items currently inactive.</Text>
          <Text>• Margin Warnings: {data.lowMarginProds} products selling with &lt;10% markup.</Text>
          <Text>• Return Velocity: {data.tooManyRefunds ? 'ALARMING - Refund rate exceeds threshold.' : 'Healthy - Return rates within normal parameters.'}</Text>
          <Text>• Overstock Exposure: {data.stockTooHigh} items exceeding inventory limits.</Text>
        </View>
      </View>

      <Text style={pdfStyles.footer}>Generated on {format(new Date(), 'PPP')} • Confidential Business Analysis</Text>
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
    const { bills, products, clients, returns, expenses, purchases } = rawData;

    const start = startOfDay(new Date(dateRange.start));
    const end = endOfDay(new Date(dateRange.end));

    const filteredBills = bills.filter((b: any) => isWithinInterval(new Date(b.date), { start, end }));
    const filteredReturns = returns.filter((r: any) => isWithinInterval(new Date(r.date), { start, end }));
    const filteredExpenses = expenses.filter((e: any) => isWithinInterval(new Date(e.date), { start, end }));
    const filteredPurchases = purchases.filter((p: any) => isWithinInterval(new Date(p.createdAt || p.billDate || p.id), { start, end }));
    const filteredPurchaseReturns = (rawData.purchaseReturns || []).filter((r: any) => isWithinInterval(new Date(r.date), { start, end }));

    // Granular Analysis: User, Client, Vendor
    const userAnalysis: Record<string, any> = {};
    filteredBills.forEach(b => {
      const user = b.createdBy || "System";
      if (!userAnalysis[user]) userAnalysis[user] = { name: user, sales: 0, count: 0 };
      userAnalysis[user].sales += b.total;
      userAnalysis[user].count += 1;
    });

    const clientAnalysis: Record<string, any> = {};
    filteredBills.forEach(b => {
      const client = b.clientName || "Unknown";
      if (!clientAnalysis[client]) clientAnalysis[client] = { name: client, sales: 0, count: 0 };
      clientAnalysis[client].sales += b.total;
      clientAnalysis[client].count += 1;
    });

    const vendorAnalysis: Record<string, any> = {};
    filteredPurchases.forEach(p => {
      const vendor = p.vendorName || "Unknown";
      if (!vendorAnalysis[vendor]) vendorAnalysis[vendor] = { name: vendor, purchases: 0, count: 0 };
      vendorAnalysis[vendor].purchases += p.total;
      vendorAnalysis[vendor].count += 1;
    });

    // Executive Summary Metrics
    const totalSales = filteredBills.reduce((s: number, b: any) => s + b.total, 0);
    const totalExpenses = filteredExpenses.reduce((s: number, e: any) => s + e.amount, 0);
    const totalReturns = filteredReturns.reduce((s: number, r: any) => s + (r.total || 0), 0);
    const totalPurchaseReturns = filteredPurchaseReturns.reduce((s: number, r: any) => s + (r.total || 0), 0);
    const totalRevenue = filteredBills.reduce((s: number, b: any) => s + (b.subtotal - (b.discount || 0)), 0);
    
    // COGS calculation fix: Ensure we're using current purchasePrice or default to 0
    let rangeCogs = 0;
    filteredBills.forEach((b: any) => {
      b.items.forEach((item: any) => {
        const prod = products.find((p: any) => p.id === item.productId);
        const cost = (prod as any)?.purchasePrice || (prod as any)?.price || 0;
        rangeCogs += item.quantity * cost;
      });
    });
    const totalProfit = totalRevenue - rangeCogs - totalExpenses;
    const avgMargin = totalRevenue > 0 ? roundToTwoDecimals((totalProfit / totalRevenue) * 100) : 0;

    // Trend Analysis (Daily filling for charts)
    const dateInterval = eachDayOfInterval({ start, end });
    const trendData = dateInterval.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayBills = filteredBills.filter((b: any) => b.date === dayStr);
      const dayPurchases = filteredPurchases.filter((p: any) => (p.createdAt || p.billDate || p.id).startsWith(dayStr));
      const daySales = dayBills.reduce((s: number, b: any) => s + b.total, 0);
      const dayCost = dayBills.reduce((s: number, b: any) => {
        return s + b.items.reduce((is: number, i: any) => {
          const p = products.find((pr: any) => pr.id === i.productId);
          const cost = (p as any)?.purchasePrice || (p as any)?.price || 0;
          return is + (i.quantity * cost);
        }, 0);
      }, 0);
      return {
        date: dayStr,
        sales: daySales,
        profit: daySales - dayCost,
        purchases: dayPurchases.reduce((s: number, p: any) => s + p.total, 0)
      };
    });

    // Score Calculations
    const turnover = totalSales / (products.reduce((s: number, p: any) => s + (p.stock * (p.purchasePrice || 0)), 0) || 1);
    const creditRisk = (filteredBills.filter((b: any) => b.paymentStatus === 'overdue').length / (filteredBills.length || 1)) * 100;

    // Advanced Metrics
    const activeClientsCount = clients.filter((c: any) => c.lastBillDate && new Date(c.lastBillDate) >= subDays(new Date(), 30)).length;
    const ltv = activeClientsCount > 0 ? totalRevenue / activeClientsCount : 0;
    
    // Profitability by Category (Assuming category exists on products)
    const categoryProfit: Record<string, number> = {};
    filteredBills.forEach((b: any) => {
      b.items.forEach((item: any) => {
        const prod = products.find((p: any) => p.id === item.productId);
        const cat = prod?.category || "Uncategorized";
        const cost = (prod as any)?.purchasePrice || (prod as any)?.price || 0;
        const profit = item.amount - (item.quantity * cost);
        categoryProfit[cat] = (categoryProfit[cat] || 0) + profit;
      });
    });

    const categoryData = Object.entries(categoryProfit).map(([name, value]) => ({ name, value }));

    return {
      summary: { totalSales, totalProfit, totalExpenses, avgMargin, ltv, totalReturns, totalPurchaseReturns },
      scores: {
        cashFlow: Math.max(0, 100 - (filteredBills.filter((b: any) => b.paymentStatus !== 'paid').length / (filteredBills.length || 1)) * 50),
        inventoryTurnover: Math.min(100, turnover * 15),
        creditRisk: roundToTwoDecimals(creditRisk),
        profitHealth: Math.max(0, 100 - (totalExpenses / (totalSales || 1)) * 100)
      },
      trendData,
      categoryData,
      userAnalysis: Object.values(userAnalysis).sort((a,b) => b.sales - a.sales),
      clientAnalysis: Object.values(clientAnalysis).sort((a,b) => b.sales - a.sales).slice(0, 10),
      vendorAnalysis: Object.values(vendorAnalysis).sort((a,b) => b.purchases - a.purchases).slice(0, 10),
      expenses: filteredExpenses,
      deadInventory: products.filter((p: any) => p.stock > 0 && !new Set(filteredBills.flatMap((b: any) => b.items.map((i: any) => i.productId))).has(p.id)).length,
      lowMarginProds: products.filter((p: any) => p.price < (p.purchasePrice || 0) * 1.1).length,
      topCustomer: clients.sort((a: any, b: any) => (b.totalRevenue || 0) - (a.totalRevenue || 0))[0],
      stockTooHigh: products.filter((p: any) => p.stock > 100).length,
      tooManyRefunds: (filteredReturns.length / (filteredBills.length || 1)) > 0.1,
      customerSegments: [
        { name: 'Active', value: activeClientsCount },
        { name: 'At Risk', value: clients.filter((c: any) => c.lastBillDate && new Date(c.lastBillDate) < subDays(new Date(), 30) && new Date(c.lastBillDate) >= subDays(new Date(), 90)).length },
        { name: 'Churned', value: clients.filter((c: any) => !c.lastBillDate || new Date(c.lastBillDate) < subDays(new Date(), 90)).length },
      ]
    };
  }, [rawData, dateRange]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bills, products, clients, purchases, deadstock, returns, expenses, purchaseReturns] = await Promise.all([
          getBills(), getProducts(), getClients(), getPurchaseBills(), getDeadstock(), getBillReturns(), getExpenses(), getPurchaseReturns()
        ]);
        setRawData({ bills, products, clients, purchases, deadstock, returns, expenses, purchaseReturns });
      } catch (e) {
        console.error("Failed to load health data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading || !healthData) return <LoadingSpinner fullScreen />;

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="p-8 space-y-10 pb-24 max-w-[1500px] mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-card p-8 rounded-2xl border shadow-md">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-primary font-bold">
            <Activity className="h-6 w-6" />
            <span className="uppercase tracking-widest text-xs">Enterprise Analysis</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Business Health Intelligence</h1>
          <p className="text-muted-foreground max-w-lg text-lg">Comprehensive diagnostic of operational efficiency, profitability, and risk factors across your enterprise.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="grid grid-cols-2 gap-4 p-2 bg-muted/40 rounded-xl border w-full sm:w-auto">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground px-2">Start Date</Label>
              <Input 
                type="date" 
                value={dateRange.start} 
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="h-10 border-none bg-background focus-visible:ring-2 px-3 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground px-2">End Date</Label>
              <Input 
                type="date" 
                value={dateRange.end} 
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="h-10 border-none bg-background focus-visible:ring-2 px-3 rounded-lg"
              />
            </div>
          </div>
          <PDFDownloadLink 
            document={<HealthPDF data={healthData} dateRange={dateRange} />} 
            fileName={`Analysis_${dateRange.start}_to_${dateRange.end}.pdf`}
            className="w-full sm:w-auto"
          >
            {({ loading }) => (
              <Button disabled={loading} size="lg" className="w-full h-14 px-8 gap-3 shadow-xl hover:shadow-primary/30 transition-all font-bold text-base">
                <Download className="h-5 w-5" />
                {loading ? "Analyzing..." : "Export Full Audit"}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="Range Revenue" value={formatCurrency(healthData.summary.totalSales)} icon={DollarSign} trend="+12.5%" />
        <SummaryCard title="Net Profit" value={formatCurrency(healthData.summary.totalProfit)} icon={TrendingUp} trend="+8.2%" color="text-green-600" />
        <SummaryCard title="Customer LTV" value={formatCurrency(healthData.summary.ltv)} icon={Users} trend="Avg Revenue/Client" />
        <SummaryCard title="Avg Margin" value={`${healthData.summary.avgMargin}%`} icon={Percent} trend="Stable" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Growth Chart */}
        <Card className="lg:col-span-2 shadow-md border-muted/60">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">Revenue vs. Profitability Trend</CardTitle>
              <CardDescription className="text-sm">Daily performance correlation across chosen interval</CardDescription>
            </div>
            <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-primary" /> Sales</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500" /> Profit</div>
            </div>
          </CardHeader>
          <CardContent className="h-[400px] pt-4 px-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthData.trendData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
                <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'dd MMM')} fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Categories Analysis */}
        <Card className="shadow-md border-muted/60">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Profit by Category</CardTitle>
            <CardDescription className="text-sm">Highest contributing segments by gross volume</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] pt-4 px-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={healthData.categoryData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={11} width={100} stroke="#94a3b8" />
                <RechartsTooltip cursor={{fill: 'transparent'}} formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Granular Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* User Wise Analysis */}
        <Card className="shadow-md border-muted/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">User Performance</CardTitle>
            <CardDescription>Sales contribution by staff members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {healthData.userAnalysis.map((user: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-transparent hover:border-border transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.count} bills generated</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-foreground">{formatCurrency(user.sales)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Client Wise Analysis */}
        <Card className="shadow-md border-muted/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Top 10 Clients</CardTitle>
            <CardDescription>Revenue generated per customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {healthData.clientAnalysis.map((client: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/40 border border-transparent hover:border-border transition-all group">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.count} transactions</p>
                </div>
                <p className="text-sm font-extrabold text-primary">{formatCurrency(client.sales)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Vendor Wise Analysis */}
        <Card className="shadow-md border-muted/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Top 10 Vendors</CardTitle>
            <CardDescription>Procurement volume tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {healthData.vendorAnalysis.map((vendor: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/40 border border-transparent hover:border-border transition-all group">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-bold truncate group-hover:text-amber-600 transition-colors">{vendor.name}</p>
                  <p className="text-xs text-muted-foreground">{vendor.count} purchases</p>
                </div>
                <p className="text-sm font-extrabold text-amber-600">{formatCurrency(vendor.purchases)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Detailed Expenses Analysis */}
        <Card className="shadow-md border-muted/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Expense Breakdown</CardTitle>
            <CardDescription>Detailed operational burn during period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="flex items-center justify-between p-6 rounded-2xl bg-red-50/50 border border-red-100/50 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-red-100 rounded-xl text-red-600"><TrendingDown className="h-6 w-6" /></div>
                <div>
                  <p className="text-xs uppercase font-extrabold text-red-600 tracking-wider">Total Operational Expenses</p>
                  <p className="text-3xl font-black text-red-700">{formatCurrency(healthData.summary.totalExpenses)}</p>
                </div>
              </div>
            </div>
            <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-muted">
              {healthData.expenses.map((exp: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 border-b border-muted/40 last:border-0 hover:bg-muted/10 transition-colors rounded-lg">
                  <div>
                    <p className="text-sm font-bold">{exp.description}</p>
                    <p className="text-xs text-muted-foreground font-medium">{format(new Date(exp.date), 'dd MMM yyyy')}</p>
                  </div>
                  <p className="text-sm font-black text-red-600">-{formatCurrency(exp.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Returns Analysis */}
        <Card className="shadow-md border-muted/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Returns Analysis</CardTitle>
            <CardDescription>Impact of transaction reversals on net revenue</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-6 pt-2">
            <div className="p-6 rounded-2xl bg-orange-50/50 border border-orange-100/50 text-center shadow-sm">
              <p className="text-xs uppercase font-extrabold text-orange-600 mb-2 tracking-wider">Sales Returns</p>
              <p className="text-2xl font-black text-orange-700">{formatCurrency(healthData.summary.totalReturns)}</p>
              <p className="text-[10px] text-orange-500 mt-2 font-bold uppercase">Revenue Leakage</p>
            </div>
            <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100/50 text-center shadow-sm">
              <p className="text-xs uppercase font-extrabold text-blue-600 mb-2 tracking-wider">Purchase Returns</p>
              <p className="text-2xl font-black text-blue-700">{formatCurrency(healthData.summary.totalPurchaseReturns)}</p>
              <p className="text-[10px] text-blue-500 mt-2 font-bold uppercase">Capital Recovery</p>
            </div>
            <div className="col-span-2 p-6 rounded-2xl bg-muted/20 border border-muted/40 text-center">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Net Return Impact</p>
              <p className="text-2xl font-black text-foreground">
                {formatCurrency(healthData.summary.totalReturns - healthData.summary.totalPurchaseReturns)}
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">Difference between customer refunds and supplier returns</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Customer Segments */}
        <Card className="shadow-md border-muted/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Customer Retention</CardTitle>
            <CardDescription>Behavioral engagement segments</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData.customerSegments}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {healthData.customerSegments.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} />
                <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Risks */}
        <Card className="shadow-md border-muted/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Inventory Hazards</CardTitle>
            <CardDescription>Critical stock metrics requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <RiskRow icon={XCircle} label="Dead Inventory" count={healthData.deadInventory} color="text-red-500" />
            <RiskRow icon={AlertTriangle} label="Margin Risks" count={healthData.lowMarginProds} color="text-amber-500" />
            <RiskRow icon={Package} label="Overstocked Items" count={healthData.stockTooHigh} color="text-blue-500" />
            <RiskRow icon={ShieldAlert} label="Return Velocity" status={healthData.tooManyRefunds ? "High" : "Optimal"} color={healthData.tooManyRefunds ? "text-red-500" : "text-green-500"} />
          </CardContent>
        </Card>

        {/* Top Insights */}
        <div className="space-y-6">
          <Card className="shadow-md border-l-[6px] border-l-primary overflow-hidden">
            <CardContent className="p-6 flex items-start gap-5">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                <Users className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">MVP Partner</p>
                <h4 className="font-black text-xl truncate text-foreground">{(healthData.topCustomer as any)?.name || "N/A"}</h4>
                <p className="text-base text-primary font-bold mt-1">{formatCurrency((healthData.topCustomer as any)?.totalRevenue || 0)} LTV</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-l-[6px] border-l-green-500">
            <CardHeader className="pb-3 pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg"><Zap className="h-5 w-5 text-yellow-600 fill-yellow-600" /></div>
                <span className="text-sm font-black uppercase text-muted-foreground tracking-tighter">Strategic Roadmap</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              {healthData.deadInventory > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50/30 border border-red-100/30">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  <p className="text-sm leading-relaxed">Liquidate <span className="font-black text-red-700">{healthData.deadInventory} stagnant items</span> via clearance sales to unlock working capital.</p>
                </div>
              )}
              {healthData.summary.avgMargin < 15 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/30 border border-amber-100/30">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <p className="text-sm leading-relaxed">Average margin ({healthData.summary.avgMargin}%) is below target. Optimize unit economics for best-sellers.</p>
                </div>
              )}
              {healthData.scores.cashFlow < 70 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/30 border border-blue-100/30">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <p className="text-sm leading-relaxed">Resolve <span className="font-black text-blue-700">{healthData.scores.creditRisk}% overdue</span> receivables to stabilize operational cash flows.</p>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50/30 border border-green-100/30">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <p className="text-sm leading-relaxed">Incentivize <span className="font-black text-green-700">{(healthData.topCustomer as any)?.name || "top clients"}</span> with loyalty programs to maximize long-term value.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <Card className="shadow-md overflow-hidden group border-muted/60 hover:border-primary/40 transition-all duration-300">
      <CardContent className="p-8 relative">
        <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
          <Icon className="h-24 w-24" />
        </div>
        <div className="flex items-center gap-4 mb-5">
          <div className="p-3 bg-muted/50 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em]">{title}</span>
        </div>
        <div className={cn("text-3xl font-black mb-3 tracking-tight", color)}>{value}</div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-black border-muted-foreground/30 bg-muted/20 uppercase tracking-tighter">{trend}</Badge>
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">period trend</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskRow({ icon: Icon, label, count, status, color }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-transparent hover:border-muted/40 hover:bg-muted/30 transition-all group">
      <div className="flex items-center gap-4">
        <div className={cn("p-2 rounded-lg bg-background group-hover:scale-110 transition-transform", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-bold text-foreground/80">{label}</span>
      </div>
      <span className={cn("font-black text-sm px-3 py-1 rounded-full bg-background/50", color)}>{count !== undefined ? count : status}</span>
    </div>
  );
}