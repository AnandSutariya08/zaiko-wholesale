import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  format,
  subDays,
  isWithinInterval,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Professional PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
    paddingBottom: 15,
  },
  headerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  dateRange: { fontSize: 10, color: "#64748b", marginTop: 5 },
  section: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#0f172a",
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
    paddingLeft: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 15 },
  metricCard: {
    width: "22%",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  metricLabel: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  metricValue: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  scoreCard: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scoreLabel: { fontSize: 11, fontWeight: "bold", color: "#334155" },
  scoreValue: { fontSize: 11, fontWeight: "bold" },
  progressBar: { height: 8, backgroundColor: "#e2e8f0", borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  table: { marginTop: 10, width: "100%" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 8,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  colName: { flex: 3 },
  colValue: { flex: 1, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
});

const HealthPDF = ({ data, dateRange }: any) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <View style={pdfStyles.headerMain}>
          <Text style={pdfStyles.title}>Business Health Report</Text>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: "#3b82f6" }}>
            InoiceMitra
          </Text>
        </View>
        <Text style={pdfStyles.dateRange}>
          Analysis Period: {format(new Date(dateRange.start), "PPP")} -{" "}
          {format(new Date(dateRange.end), "PPP")}
        </Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Executive Summary</Text>
        <View style={pdfStyles.grid}>
          <View style={[pdfStyles.metricCard, { borderLeftColor: "#10b981" }]}>
            <Text style={pdfStyles.metricLabel}>Total Sales</Text>
            <Text style={pdfStyles.metricValue}>
              {formatCurrency(data.summary.totalSales)}
            </Text>
          </View>
          <View style={[pdfStyles.metricCard, { borderLeftColor: "#3b82f6" }]}>
            <Text style={pdfStyles.metricLabel}>Total Profit</Text>
            <Text style={pdfStyles.metricValue}>
              {formatCurrency(data.summary.totalProfit)}
            </Text>
          </View>
          <View style={[pdfStyles.metricCard, { borderLeftColor: "#f59e0b" }]}>
            <Text style={pdfStyles.metricLabel}>Expenses</Text>
            <Text style={pdfStyles.metricValue}>
              {formatCurrency(data.summary.totalExpenses)}
            </Text>
          </View>
          <View style={[pdfStyles.metricCard, { borderLeftColor: "#ef4444" }]}>
            <Text style={pdfStyles.metricLabel}>Margin %</Text>
            <Text style={pdfStyles.metricValue}>{data.summary.avgMargin}%</Text>
          </View>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>
          Operational Performance Scores
        </Text>
        {[
          { label: "Cash Flow Stability", value: data.scores.cashFlow },
          {
            label: "Inventory Efficiency",
            value: data.scores.inventoryTurnover,
          },
          { label: "Profitability Health", value: data.scores.profitHealth },
          {
            label: "Credit Risk (Lower is Better)",
            value: 100 - data.scores.creditRisk,
          },
        ].map((score, i) => (
          <View key={i} style={pdfStyles.scoreCard}>
            <View style={pdfStyles.scoreHeader}>
              <Text style={pdfStyles.scoreLabel}>{score.label}</Text>
              <Text
                style={[
                  pdfStyles.scoreValue,
                  {
                    color:
                      score.value > 70
                        ? "#10b981"
                        : score.value > 40
                          ? "#f59e0b"
                          : "#ef4444",
                  },
                ]}
              >
                {roundToTwoDecimals(score.value)}%
              </Text>
            </View>
            <View style={pdfStyles.progressBar}>
              <View
                style={[
                  pdfStyles.progressFill,
                  {
                    width: `${roundToTwoDecimals(score.value)}%`,
                    backgroundColor:
                      score.value > 70
                        ? "#10b981"
                        : score.value > 40
                          ? "#f59e0b"
                          : "#ef4444",
                  },
                ]}
              />
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
            <Text style={pdfStyles.colValue}>
              {formatCurrency(data.summary.totalReturns)}
            </Text>
          </View>
          <View style={pdfStyles.tableRow}>
            <Text style={pdfStyles.colName}>Purchase Returns</Text>
            <Text style={pdfStyles.colValue}>
              {formatCurrency(data.summary.totalPurchaseReturns)}
            </Text>
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
              <Text style={pdfStyles.colValue}>
                {formatCurrency(v.purchases)}
              </Text>
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
          <Text>
            • Dead Stock Impact: {data.deadInventory} items currently inactive.
          </Text>
          <Text>
            • Margin Warnings: {data.lowMarginProds} products selling with
            &lt;10% markup.
          </Text>
          <Text>
            • Return Velocity:{" "}
            {data.tooManyRefunds
              ? "ALARMING - Refund rate exceeds threshold."
              : "Healthy - Return rates within normal parameters."}
          </Text>
          <Text>
            • Overstock Exposure: {data.stockTooHigh} items exceeding inventory
            limits.
          </Text>
        </View>
      </View>

      <Text style={pdfStyles.footer}>
        Generated on {format(new Date(), "PPP")} • Confidential Business
        Analysis
      </Text>
    </Page>
  </Document>
);

export default function BusinessHealth() {
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  const healthData = useMemo(() => {
    if (!rawData) return null;
    const { bills, products, clients, returns, expenses, purchases } = rawData;

    const start = startOfDay(new Date(dateRange.start));
    const end = endOfDay(new Date(dateRange.end));

    const filteredBills = bills.filter((b: any) =>
      isWithinInterval(new Date(b.date), { start, end }),
    );
    const filteredReturns = returns.filter((r: any) =>
      isWithinInterval(new Date(r.date), { start, end }),
    );
    const filteredExpenses = expenses.filter((e: any) =>
      isWithinInterval(new Date(e.date), { start, end }),
    );
    const filteredPurchases = purchases.filter((p: any) =>
      isWithinInterval(new Date(p.createdAt || p.billDate || p.id), {
        start,
        end,
      }),
    );
    const filteredPurchaseReturns = (rawData.purchaseReturns || []).filter(
      (r: any) => isWithinInterval(new Date(r.date), { start, end }),
    );

    // Granular Analysis: User, Client, Vendor
    const userAnalysis: Record<string, any> = {};
    filteredBills.forEach((b) => {
      const user = b.createdBy || "System";
      if (!userAnalysis[user])
        userAnalysis[user] = { name: user, sales: 0, count: 0 };
      userAnalysis[user].sales += b.total;
      userAnalysis[user].count += 1;
    });

    const clientAnalysis: Record<string, any> = {};
    filteredBills.forEach((b) => {
      const client = b.clientName || "Unknown";
      if (!clientAnalysis[client])
        clientAnalysis[client] = { name: client, sales: 0, count: 0 };
      clientAnalysis[client].sales += b.total;
      clientAnalysis[client].count += 1;
    });

    const vendorAnalysis: Record<string, any> = {};
    filteredPurchases.forEach((p) => {
      const vendor = p.vendorName || "Unknown";
      if (!vendorAnalysis[vendor])
        vendorAnalysis[vendor] = { name: vendor, purchases: 0, count: 0 };
      vendorAnalysis[vendor].purchases += p.total;
      vendorAnalysis[vendor].count += 1;
    });

    // Executive Summary Metrics
    const totalSales = filteredBills.reduce(
      (s: number, b: any) => s + b.total,
      0,
    );
    const totalExpenses = filteredExpenses.reduce(
      (s: number, e: any) => s + e.amount,
      0,
    );
    const totalReturns = filteredReturns.reduce(
      (s: number, r: any) => s + (r.total || 0),
      0,
    );
    const totalPurchaseReturns = filteredPurchaseReturns.reduce(
      (s: number, r: any) => s + (r.total || 0),
      0,
    );
    const totalRevenue = filteredBills.reduce(
      (s: number, b: any) => s + (b.subtotal - (b.discount || 0)),
      0,
    );

    // COGS calculation fix
    let rangeCogs = 0;
    filteredBills.forEach((b: any) => {
      b.items.forEach((item: any) => {
        const prod = products.find((p: any) => p.id === item.productId);
        const cost = (prod as any)?.purchasePrice || (prod as any)?.price || 0;
        rangeCogs += item.quantity * cost;
      });
    });
    const totalProfit = totalRevenue - rangeCogs - totalExpenses;
    const avgMargin =
      totalRevenue > 0
        ? roundToTwoDecimals((totalProfit / totalRevenue) * 100)
        : 0;

    // Trend Analysis
    const dateInterval = eachDayOfInterval({ start, end });
    const trendData = dateInterval.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayBills = filteredBills.filter((b: any) => b.date === dayStr);
      const dayPurchases = filteredPurchases.filter((p: any) =>
        (p.createdAt || p.billDate || p.id).startsWith(dayStr),
      );
      const daySales = dayBills.reduce((s: number, b: any) => s + b.total, 0);
      const dayCost = dayBills.reduce((s: number, b: any) => {
        return (
          s +
          b.items.reduce((is: number, i: any) => {
            const p = products.find((pr: any) => pr.id === i.productId);
            const cost = (p as any)?.purchasePrice || (p as any)?.price || 0;
            return is + i.quantity * cost;
          }, 0)
        );
      }, 0);
      return {
        date: dayStr,
        sales: daySales,
        profit: daySales - dayCost,
        purchases: dayPurchases.reduce((s: number, p: any) => s + p.total, 0),
      };
    });

    // Score Calculations
    const turnover =
      totalSales /
      (products.reduce(
        (s: number, p: any) => s + p.stock * (p.purchasePrice || 0),
        0,
      ) || 1);
    const creditRisk =
      (filteredBills.filter((b: any) => b.paymentStatus === "overdue").length /
        (filteredBills.length || 1)) *
      100;

    const activeClientsCount = clients.filter(
      (c: any) =>
        c.lastBillDate && new Date(c.lastBillDate) >= subDays(new Date(), 30),
    ).length;
    const ltv = activeClientsCount > 0 ? totalRevenue / activeClientsCount : 0;

    const categoryProfit: Record<string, number> = {};
    filteredBills.forEach((b: any) => {
      b.items.forEach((item: any) => {
        const prod = products.find((p: any) => p.id === item.productId);
        const cat = prod?.category || "Uncategorized";
        const cost = (prod as any)?.purchasePrice || (prod as any)?.price || 0;
        const profit = item.amount - item.quantity * cost;
        categoryProfit[cat] = (categoryProfit[cat] || 0) + profit;
      });
    });

    const categoryData = Object.entries(categoryProfit).map(
      ([name, value]) => ({ name, value }),
    );

    return {
      summary: {
        totalSales,
        totalProfit,
        totalExpenses,
        avgMargin,
        ltv,
        totalReturns,
        totalPurchaseReturns,
      },
      scores: {
        cashFlow: Math.max(
          0,
          100 -
            (filteredBills.filter((b: any) => b.paymentStatus !== "paid")
              .length /
              (filteredBills.length || 1)) *
              50,
        ),
        inventoryTurnover: Math.min(100, turnover * 15),
        creditRisk: roundToTwoDecimals(creditRisk),
        profitHealth: Math.max(
          0,
          100 - (totalExpenses / (totalSales || 1)) * 100,
        ),
      },
      trendData,
      categoryData,
      userAnalysis: Object.values(userAnalysis).sort(
        (a, b) => b.sales - a.sales,
      ),
      clientAnalysis: Object.values(clientAnalysis)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10),
      vendorAnalysis: Object.values(vendorAnalysis)
        .sort((a, b) => b.purchases - a.purchases)
        .slice(0, 10),
      expenses: filteredExpenses,
      deadInventory: products.filter(
        (p: any) =>
          p.stock > 0 &&
          !new Set(
            filteredBills.flatMap((b: any) =>
              b.items.map((i: any) => i.productId),
            ),
          ).has(p.id),
      ).length,
      lowMarginProds: products.filter(
        (p: any) => p.price < (p.purchasePrice || 0) * 1.1,
      ).length,
      topCustomer: clients.sort(
        (a: any, b: any) => (b.totalRevenue || 0) - (a.totalRevenue || 0),
      )[0],
      stockTooHigh: products.filter((p: any) => p.stock > 100).length,
      tooManyRefunds:
        filteredReturns.length / (filteredBills.length || 1) > 0.1,
      customerSegments: [
        { name: "Active", value: activeClientsCount },
        {
          name: "At Risk",
          value: clients.filter(
            (c: any) =>
              c.lastBillDate &&
              new Date(c.lastBillDate) < subDays(new Date(), 30) &&
              new Date(c.lastBillDate) >= subDays(new Date(), 90),
          ).length,
        },
        {
          name: "Churned",
          value: clients.filter(
            (c: any) =>
              !c.lastBillDate ||
              new Date(c.lastBillDate) < subDays(new Date(), 90),
          ).length,
        },
      ],
    };
  }, [rawData, dateRange]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          bills,
          products,
          clients,
          purchases,
          deadstock,
          returns,
          expenses,
          purchaseReturns,
        ] = await Promise.all([
          getBills(),
          getProducts(),
          getClients(),
          getPurchaseBills(),
          getDeadstock(),
          getBillReturns(),
          getExpenses(),
          getPurchaseReturns(),
        ]);
        setRawData({
          bills,
          products,
          clients,
          purchases,
          deadstock,
          returns,
          expenses,
          purchaseReturns,
        });
      } catch (e) {
        console.error("Failed to load health data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading || !healthData) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner
          size="xl"
          text="Loading healthData data..."
          fullScreen
          contentAreaOnly
        />
      </div>
    );
  }

  const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="p-2 md:p-8 space-y-4 md:space-y-6 pb-24 max-w-[1600px] mx-auto bg-slate-50/30 min-h-screen">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 bg-white p-4 md:p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-2 md:p-3 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20 shrink-0">
            <Activity className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
              Business Health
            </h1>
            <p className="text-[10px] md:text-sm text-slate-500">
              Enterprise Performance & Risk Analytics
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <div className="flex flex-col px-2 md:px-3 flex-1">
              <span className="text-[9px] uppercase text-slate-400 leading-none mb-1">
                From
              </span>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="h-7 md:h-8 w-full sm:w-32 md:w-36 border-none bg-transparent p-0 text-xs md:text-sm focus-visible:ring-0"
              />
            </div>
            <div className="h-6 md:h-8 w-px bg-slate-200" />
            <div className="flex flex-col px-2 md:px-3 flex-1">
              <span className="text-[9px] uppercase text-slate-400 leading-none mb-1">
                To
              </span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="h-7 md:h-8 w-full sm:w-32 md:w-36 border-none bg-transparent p-0 text-xs md:text-sm focus-visible:ring-0"
              />
            </div>
          </div>

          <PDFDownloadLink
            document={<HealthPDF data={healthData} dateRange={dateRange} />}
            fileName={`BusinessHealth_${dateRange.start}_${dateRange.end}.pdf`}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-medium text-xs md:text-sm shadow-sm hover:shadow-md hover:bg-primary/90 transition-all active:scale-95"
          >
            {({ loading }) =>
              loading ? (
                "Generating..."
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 md:h-4 md:w-4" /> Export
                  Report
                </>
              )
            }
          </PDFDownloadLink>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
        <TabsList className="bg-white border p-1 rounded-xl h-auto flex-nowrap overflow-x-auto justify-start gap-1 shadow-sm scrollbar-none">
          <TabsTrigger
            value="overview"
            className="rounded-lg px-3 md:px-6 py-2 md:py-2.5 font-medium text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shrink-0"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="financials"
            className="rounded-lg px-3 md:px-6 py-2 md:py-2.5 font-medium text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shrink-0"
          >
            Financials
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="rounded-lg px-3 md:px-6 py-2 md:py-2.5 font-medium text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shrink-0"
          >
            Inventory
          </TabsTrigger>
          <TabsTrigger
            value="stakeholders"
            className="rounded-lg px-3 md:px-6 py-2 md:py-2.5 font-medium text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shrink-0"
          >
            Stakeholders
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="space-y-6 focus-visible:outline-none focus-visible:ring-0"
        >
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <SummaryCard
              title="Total Revenue"
              value={formatCurrency(healthData.summary.totalSales)}
              icon={DollarSign}
              trend={`${healthData.trendData.length}d period`}
              color="text-emerald-700"
              cardColor="bg-emerald-50 border-emerald-200"
              iconColor="bg-emerald-100 text-emerald-600"
              badgeColor="bg-emerald-100 text-emerald-700 border-emerald-200"
            />
            <SummaryCard
              title="Net Profit"
              value={formatCurrency(healthData.summary.totalProfit)}
              icon={TrendingUp}
              trend={`${healthData.summary.avgMargin}% Margin`}
              color={
                healthData.summary.totalProfit >= 0
                  ? "text-blue-700"
                  : "text-rose-700"
              }
              cardColor={
                healthData.summary.totalProfit >= 0
                  ? "bg-blue-50 border-blue-200"
                  : "bg-rose-50 border-rose-200"
              }
              iconColor={
                healthData.summary.totalProfit >= 0
                  ? "bg-blue-100 text-blue-600"
                  : "bg-rose-100 text-rose-600"
              }
              badgeColor={
                healthData.summary.totalProfit >= 0
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-rose-100 text-rose-700 border-rose-200"
              }
            />
            <SummaryCard
              title="Op. Expenses"
              value={formatCurrency(healthData.summary.totalExpenses)}
              icon={TrendingDown}
              trend={`${roundToTwoDecimals((healthData.summary.totalExpenses / (healthData.summary.totalSales || 1)) * 100)}% of Rev`}
              color="text-rose-700"
              cardColor="bg-rose-50 border-rose-200"
              iconColor="bg-rose-100 text-rose-600"
              badgeColor="bg-rose-100 text-rose-700 border-rose-200"
            />
            <SummaryCard
              title="Client LTV"
              value={formatCurrency(healthData.summary.ltv)}
              icon={Users}
              trend="Per Active Client"
              color="text-amber-700"
              cardColor="bg-amber-50 border-amber-200"
              iconColor="bg-amber-100 text-amber-600"
              badgeColor="bg-amber-100 text-amber-700 border-amber-200"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Primary Health Matrix */}
            <Card className="lg:col-span-2 shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 px-4 md:px-6 py-3 md:py-4">
                <div className="space-y-0.5 md:space-y-1">
                  <CardTitle className="text-base md:text-lg font-semibold">
                    Health Score Matrix
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time operational efficiency scores
                  </CardDescription>
                </div>
                <div className="p-1.5 md:p-2 bg-white rounded-lg border shadow-sm">
                  <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                {[
                  {
                    label: "Cash Flow Stability",
                    value: healthData.scores.cashFlow,
                    desc: "Payment collection efficiency",
                    icon: DollarSign,
                  },
                  {
                    label: "Inventory Velocity",
                    value: healthData.scores.inventoryTurnover,
                    desc: "Stock movement rate",
                    icon: Package,
                  },
                  {
                    label: "Profitability Index",
                    value: healthData.scores.profitHealth,
                    desc: "Revenue vs Expense ratio",
                    icon: Percent,
                  },
                  {
                    label: "Credit Health",
                    value: 100 - healthData.scores.creditRisk,
                    desc: "Lower overdue transaction rate",
                    icon: ShieldAlert,
                  },
                ].map((score, i) => (
                  <div
                    key={i}
                    className="space-y-2 md:space-y-3 p-3 md:p-4 rounded-xl bg-slate-50/50 border border-slate-100 transition-all hover:border-primary/20 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <score.icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                        <span className="text-xs md:text-sm font-medium text-slate-700">
                          {score.label}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] md:text-sm font-semibold px-1.5 md:px-2 py-0.5 rounded-lg",
                          score.value > 70
                            ? "text-emerald-600 bg-emerald-50"
                            : score.value > 40
                              ? "text-amber-600 bg-amber-50"
                              : "text-rose-600 bg-rose-50",
                        )}
                      >
                        {roundToTwoDecimals(score.value)}%
                      </span>
                    </div>
                    <Progress value={score.value} className="h-1.5 md:h-2" />
                    <p className="text-[8px] md:text-[10px] text-slate-400 uppercase tracking-wider">
                      {score.desc}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Strategic Roadmap */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b bg-slate-50/50 px-4 md:px-6 py-3 md:py-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 text-amber-500 fill-amber-500" />
                  <CardTitle className="text-base md:text-lg font-semibold">
                    Strategic Roadmap
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                {healthData.deadInventory > 0 && (
                  <div className="p-3 md:p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <p className="text-xs md:text-sm leading-relaxed text-rose-900">
                      Liquidate{" "}
                      <span className="font-semibold text-rose-700">
                        {healthData.deadInventory} items
                      </span>{" "}
                      via clearance to unlock working capital.
                    </p>
                  </div>
                )}
                {healthData.summary.avgMargin < 15 && (
                  <div className="p-3 md:p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-xs md:text-sm leading-relaxed text-amber-900">
                      Current margin (
                      <span className="font-semibold text-amber-700">
                        {healthData.summary.avgMargin}%
                      </span>
                      ) is below target. Review unit economics.
                    </p>
                  </div>
                )}
                <div className="p-3 md:p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-xs md:text-sm leading-relaxed text-emerald-900">
                    Prioritize engagement with{" "}
                    <span className="font-semibold text-emerald-700">
                      {(healthData.topCustomer as any)?.name || "top clients"}
                    </span>{" "}
                    to stabilize LTV.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="financials"
          className="space-y-6 focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="px-6 py-4 border-b bg-slate-50/50">
                <CardTitle className="text-lg font-semibold">
                  Growth Dynamics
                </CardTitle>
                <CardDescription>
                  Net Revenue vs Profit trajectories
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={healthData.trendData}>
                    <defs>
                      <linearGradient
                        id="colorSales"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorProfit"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val / 1000}k`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                      itemStyle={{ fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      name="Revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Net Profit"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: "20px", fontSize: "12px" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="px-6 py-4 border-b bg-slate-50/50">
                <CardTitle className="text-lg font-semibold">
                  Burn Analysis
                </CardTitle>
                <CardDescription>
                  Categorized operational expenditures
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-6 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl text-rose-600 shadow-sm">
                      <TrendingDown className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-rose-400 tracking-widest">
                        Total OpEx
                      </p>
                      <p className="text-2xl font-semibold text-rose-700">
                        {formatCurrency(healthData.summary.totalExpenses)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                  {healthData.expenses.length > 0 ? (
                    healthData.expenses.map((exp: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {exp.description}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {format(new Date(exp.date), "dd MMM yyyy")}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-rose-600">
                          -{formatCurrency(exp.amount)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-sm text-slate-400 italic">
                      No expenses recorded in this period
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="inventory"
          className="space-y-6 focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inventory Risks */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="px-6 py-4 border-b bg-slate-50/50">
                <CardTitle className="text-lg font-semibold">
                  Stock Hazards
                </CardTitle>
                <CardDescription>
                  Critical inventory alert levels
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <RiskRow
                  icon={XCircle}
                  label="Dead Inventory"
                  count={healthData.deadInventory}
                  color="text-rose-500"
                />
                <RiskRow
                  icon={AlertTriangle}
                  label="Margin Risks"
                  count={healthData.lowMarginProds}
                  color="text-amber-500"
                />
                <RiskRow
                  icon={Package}
                  label="Overstocked Items"
                  count={healthData.stockTooHigh}
                  color="text-blue-500"
                />
                <RiskRow
                  icon={ShieldAlert}
                  label="Return Velocity"
                  status={healthData.tooManyRefunds ? "High" : "Optimal"}
                  color={
                    healthData.tooManyRefunds
                      ? "text-rose-500"
                      : "text-emerald-500"
                  }
                />
              </CardContent>
            </Card>

            {/* Returns Analysis */}
            <Card className="lg:col-span-2 shadow-sm border-slate-200">
              <CardHeader className="px-6 py-4 border-b bg-slate-50/50">
                <CardTitle className="text-lg font-semibold">
                  Transaction Reversals
                </CardTitle>
                <CardDescription>
                  Net impact of returns and refunds
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                  <p className="text-[10px] uppercase text-amber-500 tracking-widest mb-1">
                    Sales Returns
                  </p>
                  <p className="text-xl font-semibold text-amber-700">
                    {formatCurrency(healthData.summary.totalReturns)}
                  </p>
                  <p className="text-[9px] text-amber-400 mt-2 uppercase">
                    Rev leakage
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                  <p className="text-[10px] uppercase text-blue-500 tracking-widest mb-1">
                    Purchase Returns
                  </p>
                  <p className="text-xl font-semibold text-blue-700">
                    {formatCurrency(healthData.summary.totalPurchaseReturns)}
                  </p>
                  <p className="text-[9px] text-blue-400 mt-2 uppercase">
                    Cap recovery
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-lg">
                  <p className="text-[10px] uppercase text-slate-400 tracking-widest mb-1">
                    Net Impact
                  </p>
                  <p className="text-xl font-semibold text-white">
                    {formatCurrency(
                      healthData.summary.totalReturns -
                        healthData.summary.totalPurchaseReturns,
                    )}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-2 uppercase">
                    Total reversal
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="stakeholders"
          className="space-y-6 focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* User Performance */}
            <Card className="shadow-lg border-slate-200 overflow-hidden bg-white/50 backdrop-blur-sm">
              <CardHeader className="px-6 py-5 border-b bg-slate-50/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-800">
                        Sales Force
                      </CardTitle>
                      <CardDescription>
                        Individual contribution analysis
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700"
                  >
                    {healthData.userAnalysis.length} Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto scrollbar-thin">
                  {healthData.userAnalysis.map((user: any, i: number) => {
                    const share =
                      (user.sales / (healthData.summary.totalSales || 1)) * 100;
                    return (
                      <div
                        key={i}
                        className="group p-6 hover:bg-slate-50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-medium text-lg border-2 border-white shadow-sm group-hover:scale-110 transition-transform">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-base font-medium text-slate-800">
                                {user.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0"
                                >
                                  {user.count} Deals
                                </Badge>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                  {roundToTwoDecimals(share)}% Share
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-emerald-600 leading-none">
                              {formatCurrency(user.sales)}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
                              Net Volume
                            </p>
                          </div>
                        </div>
                        <Progress
                          value={share}
                          className="h-1.5 bg-slate-100"
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Clients */}
            <Card className="shadow-lg border-slate-200 overflow-hidden bg-white/50 backdrop-blur-sm">
              <CardHeader className="px-6 py-5 border-b bg-slate-50/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-800">
                        Key Accounts
                      </CardTitle>
                      <CardDescription>Top 10 revenue partners</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-700"
                  >
                    VIP Priority
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto scrollbar-thin">
                  {healthData.clientAnalysis.map((client: any, i: number) => {
                    const avgTicket = client.sales / (client.count || 1);
                    return (
                      <div
                        key={i}
                        className="group p-6 hover:bg-slate-50 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-medium text-lg border-2 border-white shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {client.name.charAt(0)}
                            </div>
                            <div className="max-w-[140px] md:max-w-[200px]">
                              <p className="text-base font-medium text-slate-800 truncate">
                                {client.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 uppercase">
                                  {client.count} Transactions
                                </span>
                                <div className="h-1 w-1 rounded-full bg-slate-300" />
                                <span className="text-[10px] text-blue-500 uppercase">
                                  Avg {formatCurrency(avgTicket)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-blue-600 leading-none">
                              {formatCurrency(client.sales)}
                            </p>
                            <Badge className="mt-2 text-[9px] bg-slate-100 text-slate-600 border-none">
                              Tier {i < 3 ? "A+" : "A"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Vendors */}
            <Card className="shadow-lg border-slate-200 overflow-hidden bg-white/50 backdrop-blur-sm">
              <CardHeader className="px-6 py-5 border-b bg-slate-50/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                      <Package className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-800">
                        Prime Suppliers
                      </CardTitle>
                      <CardDescription>
                        Supply chain dependency analysis
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-indigo-100 text-indigo-700"
                  >
                    Strategic
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto scrollbar-thin">
                  {healthData.vendorAnalysis.map((vendor: any, i: number) => (
                    <div
                      key={i}
                      className="group p-6 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-medium text-lg border-2 border-white shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            {vendor.name.charAt(0)}
                          </div>
                          <div className="max-w-[140px] md:max-w-[200px]">
                            <p className="text-base font-medium text-slate-800 truncate">
                              {vendor.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 uppercase">
                                {vendor.count} Purchase Orders
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-indigo-600 leading-none">
                            {formatCurrency(vendor.purchases)}
                          </p>
                          <div className="flex items-center gap-1 justify-end mt-2">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="text-[9px] text-slate-400 uppercase">
                              Verified
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Analysis Expansion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-slate-200">
              <CardHeader className="px-6 py-5 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Activity className="h-5 w-5 text-emerald-500" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    Market Segmentation
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {healthData.customerSegments.map(
                    (segment: any, i: number) => (
                      <div
                        key={i}
                        className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 text-center transition-all hover:shadow-md hover:bg-white"
                      >
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                          {segment.name}
                        </p>
                        <p className="text-3xl font-semibold text-slate-800 mb-2">
                          {segment.value}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase italic">
                          Customers
                        </p>
                        <Progress
                          value={
                            (segment.value /
                              (healthData.clientAnalysis.length || 1)) *
                            100
                          }
                          className="h-1.5 mt-4"
                        />
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-200">
              <CardHeader className="px-6 py-5 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    Strategic Insights
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Revenue Concentration
                      </p>
                      <p className="text-xs text-blue-700 leading-relaxed mt-1">
                        Your top 3 clients represent{" "}
                        <span className="font-semibold text-blue-900">
                          {roundToTwoDecimals(
                            (healthData.clientAnalysis
                              .slice(0, 3)
                              .reduce((s: number, c: any) => s + c.sales, 0) /
                              (healthData.summary.totalSales || 1)) *
                              100,
                          )}
                          %
                        </span>{" "}
                        of your total revenue. Consider diversifying your client
                        base to mitigate risk.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <TrendingUp className="h-5 w-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">
                        Sales Velocity
                      </p>
                      <p className="text-xs text-emerald-700 leading-relaxed mt-1">
                        Average deal size for{" "}
                        <span className="font-medium">
                          {healthData.userAnalysis[0]?.name}
                        </span>{" "}
                        is{" "}
                        <span className="font-medium">
                          {formatCurrency(
                            healthData.userAnalysis[0]?.sales /
                              (healthData.userAnalysis[0]?.count || 1),
                          )}
                        </span>
                        . Scale these high-value conversion patterns across the
                        team.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  cardColor,
  iconColor,
  badgeColor,
}: any) {
  return (
    <Card
      className={cn(
        "shadow-md overflow-hidden group border transition-all duration-300 hover:shadow-lg",
        cardColor,
      )}
    >
      <CardContent className="p-4 md:p-8 relative">
        <div className="absolute -top-4 -right-4 p-4 opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-110 transition-all duration-500">
          <Icon className="h-16 w-16 md:h-24 md:w-24" />
        </div>
        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-5">
          <div
            className={cn(
              "p-2 md:p-3 rounded-xl transition-all duration-300",
              iconColor,
            )}
          >
            <Icon className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <span className="text-[10px] md:text-xs uppercase text-muted-foreground tracking-[0.1em] md:tracking-[0.2em]">
            {title}
          </span>
        </div>
        <div
          className={cn(
            "text-xl md:text-3xl font-semibold mb-2 md:mb-3 tracking-tight",
            color,
          )}
        >
          {value}
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[8px] md:text-[10px] px-1.5 md:px-2 py-0 md:py-0.5 uppercase tracking-tighter border",
              badgeColor,
            )}
          >
            {trend}
          </Badge>
          <span className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-wider md:tracking-widest opacity-70">
            period trend
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskRow({ icon: Icon, label, count, status, color }: any) {
  return (
    <div className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-muted/20 border border-transparent hover:border-muted/40 hover:bg-muted/30 transition-all group">
      <div className="flex items-center gap-3 md:gap-4">
        <div
          className={cn(
            "p-1.5 md:p-2 rounded-lg bg-background group-hover:scale-110 transition-transform",
            color,
          )}
        >
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        <span className="text-xs md:text-sm font-medium text-foreground/80">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "font-medium text-[10px] md:text-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-background/50",
          color,
        )}
      >
        {count !== undefined ? count : status}
      </span>
    </div>
  );
}
