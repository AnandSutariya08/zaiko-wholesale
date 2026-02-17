import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Loader2, Download, TrendingUp, ShieldAlert, BadgeCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { DashboardPDF } from "@/components/DashboardPDF";
import { getBusinessDataForAI } from "@/lib/businessDataCollector";
import {
  getBills,
  getProducts,
  getPurchaseBills,
  getExpenses,
  getInventoryTransactions,
  getBillReturns,
  getDeadstock,
  getClients,
  getCompanyProfile,
  getNotes,
} from "@/lib/firebaseService";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function AIAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [rawBusinessData, setRawBusinessData] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const autoAnalyse = async () => {
      if (isAnalyzed || isLoading) return;

      setIsLoading(true);
      try {
        const [
          bills,
          products,
          purchaseBills,
          expenses,
          inventoryTransactions,
          billReturns,
          deadstock,
          clients,
          profile,
          notes,
        ] = await Promise.all([
          getBills(),
          getProducts(),
          getPurchaseBills(),
          getExpenses(),
          getInventoryTransactions(),
          getBillReturns(),
          getDeadstock(),
          getClients(),
          getCompanyProfile(),
          getNotes(),
        ]);

        const processedData = await getBusinessDataForAI();
        setRawBusinessData({
          stats: {
            totalRevenue: processedData.stats.totalSales,
            gstCollected: processedData.stats.gstLiability,
            totalDiscount: 0,
            totalPurchases: processedData.stats.totalPurchases,
            grossProfit: processedData.stats.totalSales - processedData.stats.totalPurchases,
            profit: processedData.stats.netProfit,
            totalCOGS: processedData.stats.totalPurchases,
            totalExpenses: processedData.stats.totalExpenses,
            deadstockLoss: 0,
            inventoryValue: processedData.stats.inventoryValue,
            totalProducts: products.length,
            totalReturns: billReturns.length,
            totalBills: bills.length,
            totalPurchaseBills: purchaseBills.length,
            totalClients: clients.length,
            overdueBills: bills.filter(b => b.paymentStatus === 'Pending').length,
            pendingAmount: processedData.stats.totalSales - processedData.stats.totalCollected,
            pendingPurchases: processedData.stats.totalPurchases,
            netGst: processedData.stats.gstLiability,
            gstPaid: 0,
            paidSubtotal: processedData.stats.totalCollected,
            pendingSubtotal: processedData.stats.totalSales - processedData.stats.totalCollected,
            overdueSubtotal: 0
          },
          chartData: {
            paymentBreakdown: [
              { name: 'Paid', value: processedData.stats.totalCollected },
              { name: 'Pending', value: processedData.stats.totalSales - processedData.stats.totalCollected }
            ],
            monthlySpendVsSales: (processedData.monthlyTrends || []).map((t: any) => ({ period: t.month, sales: t.sales, purchases: 0 })),
            monthlyProfit: (processedData.monthlyTrends || []).map((t: any) => ({ period: t.month, profit: t.sales }))
          },
          productAnalytics: {
            topProductsByRevenue: (processedData.topPerformingProducts || []).map((p: any) => ({ name: p.name, revenue: p.sales, quantity: p.stock, profit: p.sales, margin: 20, productId: p.name })),
            topProductsByProfit: (processedData.topPerformingProducts || []).map((p: any) => ({ name: p.name, revenue: p.sales, profit: p.sales, margin: 20, productId: p.name })),
            mostReturnedProducts: []
          },
          clientAnalytics: {
            topClientsByRevenue: (processedData.clientHealth || []).map((c: any) => ({ name: c.name, revenue: c.totalSales, billCount: 0, avgBillValue: 0, pendingAmount: c.pending, clientId: c.name })),
            topClientsByOrders: [],
            clientReturnStats: []
          },
          company: profile,
          dateRange: { start: '', end: '' }
        });

        const systemMessage: Message = {
          role: "system",
          content: `You are a high-level Strategic Business Growth Consultant for "Invoice MItra" GST Billing Software.
            
            UNIFIED MISSION:
            1. Transform dry billing data into explosive growth strategies.
            2. Identify high-risk clients (Pending > 50%).
            3. Highlight top-performing products and inventory leaks.
            4. Provide actionable advice for the next 30 days.

            UI DESIGN PHILOSOPHY:
            - Responses must be visual, using bold headers, clean lists, and emoji highlights (📈, 🚀, ⚠️).
            - Focus on: PROFITABILITY, CASH FLOW, and CLIENT RETENTION.`,
        };

        const initialMessage: Message = {
          role: "user",
          content: `Analyze my business for growth. Data summary: ${JSON.stringify(processedData)}`,
        };

        const response = await fetch(
          "https://api.sarvam.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "api-subscription-key":
                import.meta.env.VITE_SARVAM_API_KEY ||
                "sk_cgklaer7_PyVfuZMemeppS9aL53Cvbldg",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sarvam-m",
              messages: [systemMessage, initialMessage],
              temperature: 0.7,
              max_tokens: 2000,
            }),
          },
        );

        if (!response.ok) throw new Error("AI Connection Failed");

        const data = await response.json();
        if (data?.choices?.[0]) {
          setMessages([
            { role: "assistant", content: data.choices[0].message.content },
          ]);
          setIsAnalyzed(true);
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("AI Consultant is taking a break. Please retry.");
      } finally {
        setIsLoading(false);
      }
    };

    autoAnalyse();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "https://api.sarvam.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "api-subscription-key":
              import.meta.env.VITE_SARVAM_API_KEY ||
              "sk_cgklaer7_PyVfuZMemeppS9aL53Cvbldg",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sarvam-m",
            messages: [...messages, userMsg],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        },
      );

      const data = await response.json();
      if (data?.choices?.[0]) {
        setMessages(prev => [...prev, { role: "assistant", content: data.choices[0].message.content }]);
      }
    } catch (error) {
      toast.error("Message delivery failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-slate-50/50 dark:bg-zinc-950 overflow-hidden font-sans">
      {/* Premium Header */}
      <div className="sticky top-0 z-30 border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-md opacity-20 animate-pulse" />
            <div className="relative p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg ring-1 ring-white/20">
              <Bot className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Business Growth AI
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Strategic Mode Active
              </p>
            </div>
          </div>
        </div>

        {isAnalyzed && rawBusinessData && (
          <PDFDownloadLink
            document={<DashboardPDF {...rawBusinessData} />}
            fileName={`Business_Growth_Report_${new Date().toISOString().split('T')[0]}.pdf`}
          >
            {({ loading }) => (
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden md:flex gap-2 rounded-full border-blue-200 hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-800 transition-all duration-300"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-blue-600" />}
                <span className="font-semibold text-xs">Growth PDF</span>
              </Button>
            )}
          </PDFDownloadLink>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        <ScrollArea ref={scrollAreaRef} className="h-full px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-10 pb-40">
            {messages.length === 0 && isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                  <div className="relative p-10 rounded-3xl bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 animate-shimmer" />
                    <Sparkles className="h-20 w-20 text-blue-600 dark:text-blue-400 animate-bounce" />
                  </div>
                </div>
                <div className="text-center space-y-4">
                  <h3 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">
                    Crunching the Numbers...
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-sm leading-relaxed">
                    Analyzing your sales velocity, client loyalty, and cash flow to build your success blueprint.
                  </p>
                  <div className="flex justify-center gap-1.5 pt-4">
                    {[0, 150, 300].map((delay) => (
                      <div key={delay} className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-6 duration-500`}>
                <div className={`flex gap-4 max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`mt-1 h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-800 border dark:border-zinc-700'}`}>
                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div className={`relative px-6 py-4 rounded-3xl shadow-sm transition-all duration-300 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-tl-none group-hover:shadow-md'}`}>
                    <div className={`prose prose-sm md:prose-base dark:prose-invert max-w-none break-words ${msg.role === 'user' ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && messages.length > 0 && (
              <div className="flex justify-start animate-in fade-in-0 duration-300">
                <div className="flex gap-4">
                  <div className="mt-1 h-10 w-10 rounded-2xl bg-white dark:bg-zinc-800 border dark:border-zinc-700 flex items-center justify-center shadow-sm">
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-3xl rounded-tl-none px-6 py-4 shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-600/40 rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-blue-600/40 rounded-full animate-pulse [animation-delay:200ms]" />
                      <span className="w-1.5 h-1.5 bg-blue-600/40 rounded-full animate-pulse [animation-delay:400ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Floating Input Bar */}
        {isAnalyzed && (
          <div className="absolute bottom-8 left-0 right-0 z-40 px-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-center bg-white dark:bg-zinc-900/90 backdrop-blur-2xl rounded-3xl border-2 border-blue-50 dark:border-zinc-800 shadow-2xl p-2 pl-4 pr-2 transition-all duration-300 focus-within:border-blue-500/30 focus-within:ring-8 focus-within:ring-blue-500/5 group">
                <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
                  <input
                    placeholder="Ask about expansion, cost cuts, or tax strategies..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-900 dark:text-white placeholder:text-zinc-400 font-medium py-3"
                  />
                  <Button
                    type="submit"
                    className="rounded-2xl h-12 w-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    disabled={isLoading || !input.trim()}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
