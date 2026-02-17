import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Loader2, Download, Sparkles, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { GrowthAnalysisPDF } from "@/components/GrowthAnalysisPDF";
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
  const [chatSummary, setChatSummary] = useState<string>("");
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
            overdueBills: bills.filter(b => b.paymentStatus === "pending").length,
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
          content: `You are a simple Business Growth AI for billing software users.
            
            UNIFIED MISSION:
            1. Help the user grow their business using simple, clear language that anyone can understand.
            2. Tell them who owes money and which products are selling best.
            3. Give simple 1-2 step advice for more profit.

            LANGUAGE STYLE:
            - Use very simple words. No business jargon.
            - Instead of "Revenue", say "Money In".
            - Instead of "Liability", say "What you owe".
            - Use big emojis and short sentences.
            - Focus on: "Make more money", "Save money", and "Good customers".`,
        };

        const initialMessage: Message = {
          role: "user",
          content: `Tell me how my business is doing and how to grow. Data: ${JSON.stringify(processedData)}`,
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
          setChatSummary(data.choices[0].message.content);
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
        const assistantMsg = data.choices[0].message.content;
        setMessages(prev => [...prev, { role: "assistant", content: assistantMsg }]);
        
        // Update summary for PDF
        const summaryResponse = await fetch(
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
              messages: [
                { role: "system", content: "Summarize the entire conversation into a professional growth strategy report. Use plain text without markdown symbols for the PDF." },
                ...messages, 
                userMsg, 
                { role: "assistant", content: assistantMsg }
              ],
              temperature: 0.3,
              max_tokens: 1500,
            }),
          }
        );
        const summaryData = await summaryResponse.json();
        if (summaryData?.choices?.[0]) {
          setChatSummary(summaryData.choices[0].message.content);
        }
      }
    } catch (error) {
      toast.error("Message delivery failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-zinc-950 font-sans">
      {/* Premium Header */}
      <div className="sticky top-0 z-30 border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.back()}
            className="md:hidden"
          >
            <ChevronRight className="rotate-180" />
          </Button>
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-xl blur-md opacity-20 animate-pulse" />
            <div className="relative p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg ring-1 ring-white/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Business Growth AI
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Online & Ready
              </p>
            </div>
          </div>
        </div>

        {isAnalyzed && rawBusinessData && (
          <div className="flex items-center gap-2">
            <PDFDownloadLink
              document={<GrowthAnalysisPDF summary={chatSummary} companyName={rawBusinessData.company?.name} />}
              fileName={`Growth_Strategy_${new Date().toISOString().split('T')[0]}.pdf`}
            >
              {({ loading }) => (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex gap-2 rounded-full border-blue-200 hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-800 transition-all duration-300 h-9 px-4"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-blue-600" />}
                  <span className="font-bold text-[11px] uppercase tracking-wider">Growth PDF</span>
                </Button>
              )}
            </PDFDownloadLink>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.history.back()}
              className="hidden md:flex h-9 w-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        <ScrollArea ref={scrollAreaRef} className="h-full px-4 py-6 md:py-10">
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            {messages.length === 0 && isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                  <div className="relative p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-blue-50 dark:border-zinc-800 shadow-2xl">
                    <Sparkles className="h-16 w-16 text-blue-600 dark:text-blue-400 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                    Checking Your Business...
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xs mx-auto leading-relaxed">
                    I'm looking at your sales and stock to help you grow.
                  </p>
                </div>
              </div>
            )}

            {messages.filter(m => m.role !== 'system').map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-4 duration-500`}>
                <div className={`flex gap-3 max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-800 border dark:border-zinc-700'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div className={`relative px-5 py-3.5 rounded-2xl shadow-sm border transition-all duration-300 ${msg.role === 'user' ? 'bg-blue-600 border-blue-700 text-white rounded-tr-none' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-tl-none'}`}>
                    <div className={`prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed ${msg.role === 'user' ? 'text-white prose-invert' : 'text-zinc-800 dark:text-zinc-200'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && messages.length > 0 && (
              <div className="flex justify-start animate-in fade-in-0 duration-300">
                <div className="flex gap-3">
                  <div className="mt-0.5 h-8 w-8 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-700 flex items-center justify-center shadow-sm">
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-1 h-1 bg-blue-600/40 rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-blue-600/40 rounded-full animate-bounce [animation-delay:200ms]" />
                      <span className="w-1 h-1 bg-blue-600/40 rounded-full animate-bounce [animation-delay:400ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Simplified Floating Input Bar */}
        {isAnalyzed && (
          <div className="absolute bottom-6 left-0 right-0 z-40 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="relative flex items-center bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 p-1.5 pl-4 transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-500/10 group">
                <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
                  <input
                    placeholder="Type your question here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-900 dark:text-white py-2.5 text-[15px] font-medium"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-xl h-10 w-10 bg-blue-600 hover:bg-blue-700 shadow-sm active:scale-95 transition-all"
                    disabled={isLoading || !input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
              <p className="text-center text-[10px] text-zinc-400 mt-3 font-medium uppercase tracking-widest">
                Simple Growth Advice for Your Business
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}