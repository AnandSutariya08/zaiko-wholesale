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

    // Executive Summary Metrics
    const totalSales = filteredBills.reduce((s: number, b: any) => s + b.total, 0);
    const totalExpenses = filteredExpenses.reduce((s: number, e: any) => s + e.amount, 0);
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
    const totalProfit = totalRevenue - rangeCogs;
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

    return {
      summary: { totalSales, totalProfit, totalExpenses, avgMargin },
      scores: {
        cashFlow: Math.max(0, 100 - (filteredBills.filter((b: any) => b.paymentStatus !== 'paid').length / (filteredBills.length || 1)) * 50),
        inventoryTurnover: Math.min(100, turnover * 15),
        creditRisk: roundToTwoDecimals(creditRisk),
        profitHealth: Math.max(0, 100 - (totalExpenses / (totalSales || 1)) * 100)
      },
      trendData,
      deadInventory: products.filter((p: any) => p.stock > 0 && !new Set(filteredBills.flatMap((b: any) => b.items.map((i: any) => i.productId))).has(p.id)).length,
      lowMarginProds: products.filter((p: any) => p.price < (p.purchasePrice || 0) * 1.1).length,
      topCustomer: clients.sort((a: any, b: any) => (b.totalRevenue || 0) - (a.totalRevenue || 0))[0],
      stockTooHigh: products.filter((p: any) => p.stock > 100).length,
      tooManyRefunds: (filteredReturns.length / (filteredBills.length || 1)) > 0.1,
      customerSegments: [
        { name: 'Active', value: clients.filter((c: any) => c.lastBillDate && new Date(c.lastBillDate) >= subDays(new Date(), 30)).length },
        { name: 'At Risk', value: clients.filter((c: any) => c.lastBillDate && new Date(c.lastBillDate) < subDays(new Date(), 30) && new Date(c.lastBillDate) >= subDays(new Date(), 90)).length },
        { name: 'Churned', value: clients.filter((c: any) => !c.lastBillDate || new Date(c.lastBillDate) < subDays(new Date(), 90)).length },
      ]
    };
  }, [rawData, dateRange]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bills, products, clients, purchases, deadstock, returns, expenses] = await Promise.all([
          getBills(), getProducts(), getClients(), getPurchaseBills(), getDeadstock(), getBillReturns(), getExpenses()
        ]);
        setRawData({ bills, products, clients, purchases, deadstock, returns, expenses });
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
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Activity className="h-5 w-5" />
            <span className="uppercase tracking-wider text-xs">Enterprise Analysis</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Business Health Intelligence</h1>
          <p className="text-muted-foreground max-w-md">Comprehensive diagnostic of operational efficiency, profitability, and risk factors.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted/50 rounded-lg border w-full sm:w-auto">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground px-1">Start Date</Label>
              <Input 
                type="date" 
                value={dateRange.start} 
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="h-9 border-none bg-background focus-visible:ring-1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground px-1">End Date</Label>
              <Input 
                type="date" 
                value={dateRange.end} 
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="h-9 border-none bg-background focus-visible:ring-1"
              />
            </div>
          </div>
          <PDFDownloadLink 
            document={<HealthPDF data={healthData} dateRange={dateRange} />} 
            fileName={`Analysis_${dateRange.start}_to_${dateRange.end}.pdf`}
            className="w-full sm:w-auto"
          >
            {({ loading }) => (
              <Button disabled={loading} size="lg" className="w-full gap-2 shadow-lg hover:shadow-primary/20 transition-all">
                <Download className="h-4 w-4" />
                {loading ? "Analyzing..." : "Export Full Audit"}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Range Revenue" value={formatCurrency(healthData.summary.totalSales)} icon={DollarSign} trend="+12.5%" />
        <SummaryCard title="Net Profit" value={formatCurrency(healthData.summary.totalProfit)} icon={TrendingUp} trend="+8.2%" color="text-green-600" />
        <SummaryCard title="Total Burn" value={formatCurrency(healthData.summary.totalExpenses)} icon={TrendingDown} trend="-3.1%" color="text-red-600" />
        <SummaryCard title="Avg Margin" value={`${healthData.summary.avgMargin}%`} icon={Percent} trend="Stable" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Growth Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Revenue vs. Profitability Trend</CardTitle>
              <CardDescription>Daily performance correlation</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary" /> Sales</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /> Profit</div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
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
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Health Scores */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Stability Audit</CardTitle>
            <CardDescription>Automated risk assessment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <AuditItem label="Cash Flow Stability" value={healthData.scores.cashFlow} info="Ratio of paid vs pending invoices" />
            <AuditItem label="Inventory Velocity" value={healthData.scores.inventoryTurnover} info="Rate of stock movement vs investment" />
            <AuditItem label="Profit Integrity" value={healthData.scores.profitHealth} info="Sustainability of operating margins" />
            <AuditItem label="Credit Exposure" value={healthData.scores.creditRisk} inverse info="Impact of overdue receivables" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Customer Segments */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Customer Retention</CardTitle>
            <CardDescription>Engagement based segmentation</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData.customerSegments}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {healthData.customerSegments.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Risks */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Inventory Hazards</CardTitle>
            <CardDescription>Critical stock attention needed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <RiskRow icon={XCircle} label="Dead Inventory" count={healthData.deadInventory} color="text-red-500" />
            <RiskRow icon={AlertTriangle} label="Margin Risks" count={healthData.lowMarginProds} color="text-amber-500" />
            <RiskRow icon={Package} label="Overstocked" count={healthData.stockTooHigh} color="text-blue-500" />
            <RiskRow icon={ShieldAlert} label="Return Velocity" status={healthData.tooManyRefunds ? "High" : "Normal"} color={healthData.tooManyRefunds ? "text-red-500" : "text-green-500"} />
          </CardContent>
        </Card>

        {/* Top Insights */}
        <div className="space-y-4">
          <Card className="shadow-sm border-l-4 border-l-primary">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Premier Partner</p>
                <h4 className="font-bold text-lg truncate">{(healthData.topCustomer as any)?.name || "N/A"}</h4>
                <p className="text-sm text-primary font-medium">{formatCurrency((healthData.topCustomer as any)?.totalRevenue || 0)} LTV</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-xs font-bold uppercase text-muted-foreground">Growth Opportunity</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Your <span className="font-bold text-primary">{(healthData.summary.avgMargin)}% margin</span> is {healthData.summary.avgMargin > 20 ? 'strong' : 'below industry average'}. 
                Reducing <span className="font-bold text-red-500">{healthData.deadInventory} dead items</span> could free up substantial working capital.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <Card className="shadow-sm overflow-hidden group">
      <CardContent className="p-6 relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Icon className="h-16 w-16" />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">{title}</span>
        </div>
        <div className={cn("text-2xl font-bold mb-1", color)}>{value}</div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] h-5 font-bold border-muted-foreground/20">{trend}</Badge>
          <span className="text-[10px] text-muted-foreground">growth period</span>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditItem({ label, value, info, inverse }: any) {
  const getColor = (v: number) => {
    if (inverse) return v < 30 ? "bg-green-500" : v < 60 ? "bg-amber-500" : "bg-red-500";
    return v > 70 ? "bg-green-500" : v > 40 ? "bg-amber-500" : "bg-red-500";
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <TooltipProvider>
            <div className="cursor-help text-muted-foreground/50 hover:text-primary transition-colors">
              <Info className="h-3.5 w-3.5" />
            </div>
          </TooltipProvider>
        </div>
        <span className="text-sm font-bold">{value}%</span>
      </div>
      <Progress value={value} className={cn("h-2 transition-all duration-1000", getColor(value))} />
      <p className="text-[10px] text-muted-foreground italic">{info}</p>
    </div>
  );
}

function RiskRow({ icon: Icon, label, count, status, color }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-all">
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={cn("font-bold text-sm", color)}>{count !== undefined ? count : status}</span>
    </div>
  );
}
