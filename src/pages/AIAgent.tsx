import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  User,
  Send,
  Loader2,
  Download,
  Sparkles,
  X,
  ChevronRight,
  Globe,
  Check,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { GrowthAnalysisPDF } from "@/components/GrowthAnalysisPDF";
import { getBusinessDataForAI } from "@/lib/businessDataCollector";
import { AIMessageRenderer } from "@/components/AIMessageRenderer";
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

export type ReportLanguage = "english" | "hindi" | "gujarati";

interface LanguageOption {
  code: ReportLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "english", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "hindi", label: "Hindi", nativeLabel: "हिंदी", flag: "🇮🇳" },
  { code: "gujarati", label: "Gujarati", nativeLabel: "ગુજરાતી", flag: "🏵️" },
];

const SARVAM_API_URL = "https://api.sarvam.ai/v1/chat/completions";
const getApiKey = () =>
  import.meta.env.VITE_SARVAM_API_KEY || "sk_cgklaer7_PyVfuZMemeppS9aL53Cvbldg";

// ── Language picker modal ──────────────────────────────────────────────────
function LanguageModal({
  onSelect,
  onClose,
}: {
  onSelect: (lang: ReportLanguage) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ReportLanguage>("english");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-[92vw] max-w-sm mx-4 p-6 animate-in zoom-in-95 fade-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950 rounded-xl">
            <Globe className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">
              Report Language
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Choose the language for your Business State Report PDF
            </p>
          </div>
        </div>

        <div className="space-y-2.5 mb-6">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all duration-200 ${
                selected === lang.code
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-blue-200 dark:hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <div className="text-left">
                  <p
                    className={`font-semibold text-sm ${
                      selected === lang.code
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {lang.label}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {lang.nativeLabel}
                  </p>
                </div>
              </div>
              {selected === lang.code && (
                <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        <Button
          className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-sm gap-2"
          onClick={() => onSelect(selected)}
        >
          <FileText size={16} />
          Generate in {LANGUAGES.find((l) => l.code === selected)?.nativeLabel}
        </Button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AIAgent() {
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [rawBusinessData, setRawBusinessData] = useState<any>(null);
  const [pdfData, setPdfData] = useState<string>("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [reportLanguage, setReportLanguage] =
    useState<ReportLanguage>("english");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fullHistoryRef = useRef<Message[]>([]);

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
  }, [displayMessages]);

  // ── Auto-analyse on mount ─────────────────────────────────────────────────
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
            grossProfit:
              processedData.stats.totalSales -
              processedData.stats.totalPurchases,
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
            overdueBills: bills.filter((b) => b.paymentStatus === "pending")
              .length,
            pendingAmount:
              processedData.stats.totalSales -
              processedData.stats.totalCollected,
            pendingPurchases: processedData.stats.totalPurchases,
            netGst: processedData.stats.gstLiability,
            gstPaid: 0,
            paidSubtotal: processedData.stats.totalCollected,
            pendingSubtotal:
              processedData.stats.totalSales -
              processedData.stats.totalCollected,
            overdueSubtotal: 0,
          },
          productAnalytics: {
            topProductsByRevenue: (
              processedData.topPerformingProducts || []
            ).map((p: any) => ({
              name: p.name,
              revenue: p.sales,
              quantity: p.stock,
            })),
          },
          clientAnalytics: {
            topClientsByRevenue: (processedData.clientHealth || []).map(
              (c: any) => ({
                name: c.name,
                revenue: c.totalSales,
                pendingAmount: c.pending,
              }),
            ),
          },
          company: profile,
          monthlyTrends: processedData.monthlyTrends || [],
        });

        const systemMessage: Message = {
          role: "system",
          content: `You are a Business Growth AI for billing software users.
Help the user understand their business situation and grow it using simple, clear language.
Use emojis and short sentences. Always respond in the same language the user writes in.`,
        };

        const initialUserMessage: Message = {
          role: "user",
          content: `Tell me how my business is doing and how to grow. Business data: ${JSON.stringify(processedData)}`,
        };

        fullHistoryRef.current = [systemMessage, initialUserMessage];

        const response = await fetch(SARVAM_API_URL, {
          method: "POST",
          headers: {
            "api-subscription-key": getApiKey(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sarvam-m",
            messages: fullHistoryRef.current,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) throw new Error("AI Connection Failed");
        const data = await response.json();

        if (data?.choices?.[0]) {
          const assistantMessage: Message = {
            role: "assistant",
            content: data.choices[0].message.content,
          };
          fullHistoryRef.current = [
            ...fullHistoryRef.current,
            assistantMessage,
          ];
          setDisplayMessages([assistantMessage]);
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

  // ── Generate PDF from chat ────────────────────────────────────────────────
  const generateReport = async (lang: ReportLanguage) => {
    setShowLangModal(false);
    if (isGeneratingPDF || !rawBusinessData) return;

    setReportLanguage(lang);
    setIsGeneratingPDF(true);
    setPdfReady(false);

    const langInstructions: Record<ReportLanguage, string> = {
      english:
        "Write the ENTIRE report — every word, every heading, every sentence — in English only.",
      hindi:
        "पूरी रिपोर्ट केवल हिंदी में लिखें। हर शब्द, हर heading, हर वाक्य हिंदी में होना चाहिए। अंग्रेजी में कुछ भी न लिखें।",
      gujarati:
        "સમગ્ર રિપોર્ટ ફક્ત ગુજરાતીમાં લખો. દરેક શબ્દ, દરેક heading, દરેક વાક્ય ગુજરાતીમાં હોવું જોઈએ. અંગ્રેજીમાં કંઈ ન લખો.",
    };

    try {
      // Build clean English-only chat transcript so JSON output stays reliable
      const chatTranscript = fullHistoryRef.current
        .filter((m) => m.role !== "system")
        .slice(-12)
        .map((m) => {
          const role = m.role === "user" ? "Business Owner" : "AI Advisor";
          // Transliterate: strip emojis and keep the text substance
          const text = m.content.replace(/[\u{1F300}-\u{1FFFF}]/gu, "").trim();
          return `${role}: ${text}`;
        })
        .join("\n\n");

      const stats = rawBusinessData.stats ?? {};
      const company = rawBusinessData.company ?? {};

      const dataSnapshot = `
Business: ${company.name ?? "Unknown"} (${company.type ?? "Retail"})
Total Revenue: Rs.${stats.totalRevenue ?? 0}
Amount Collected: Rs.${stats.paidSubtotal ?? 0}
Pending Receivables: Rs.${stats.pendingSubtotal ?? 0}
Total Purchases: Rs.${stats.totalPurchases ?? 0}
Total Expenses: Rs.${stats.totalExpenses ?? 0}
Net Profit / Loss: Rs.${stats.profit ?? 0}
Inventory Value: Rs.${stats.inventoryValue ?? 0}
GST Liability: Rs.${stats.netGst ?? 0}
Total Bills: ${stats.totalBills ?? 0}
Total Clients: ${stats.totalClients ?? 0}
Overdue Bills: ${stats.overdueBills ?? 0}
Top Products: ${
        (rawBusinessData.productAnalytics?.topProductsByRevenue ?? [])
          .slice(0, 3)
          .map((p: any) => `${p.name} (Rs.${p.revenue ?? 0})`)
          .join(", ") || "None"
      }
Top Clients: ${
        (rawBusinessData.clientAnalytics?.topClientsByRevenue ?? [])
          .slice(0, 3)
          .map((c: any) => `${c.name} (Rs.${c.revenue ?? 0})`)
          .join(", ") || "None"
      }
      `.trim();

      const messages = [
        {
          role: "system",
          content: `You are a Senior Business Consultant writing a Business State Report.
This report is a formal written summary of what was discussed between a business owner and an AI advisor.

LANGUAGE INSTRUCTION (CRITICAL):
${langInstructions[lang]}

OUTPUT RULES (CRITICAL):
- Output ONLY a valid raw JSON object.
- Absolutely NO markdown fences, NO preamble text, NO explanation outside the JSON.
- Use "Rs." for all currency. Never use the rupee symbol.
- Keep all section headings short (3-5 words max).

JSON structure:
{
  "reportTitle": "Short report title (4-6 words) in chosen language",
  "executiveSummary": "3 paragraphs summarising the business situation discussed in the chat. Cover current health, main issues found, and overall assessment. Min 250 words.",
  "currentState": {
    "heading": "Current Business State (in chosen language, 3-5 words)",
    "points": ["Point 1 based on chat findings", "Point 2", "Point 3", "Point 4", "Point 5"]
  },
  "problemsIdentified": {
    "heading": "Problems Found (in chosen language, 2-4 words)",
    "points": ["Problem 1 from chat", "Problem 2", "Problem 3", "Problem 4"]
  },
  "actionPlan": {
    "heading": "Action Plan (in chosen language, 2-3 words)",
    "steps": ["Step 1 recommended in chat", "Step 2", "Step 3", "Step 4", "Step 5"]
  },
  "financialSummary": "2 paragraphs on financial health based on the data figures and chat discussion. Reference specific numbers.",
  "closingNote": "1 short encouraging closing paragraph in chosen language."
}`,
        },
        {
          role: "user",
          content: `Generate the Business State Report JSON.\n\nBUSINESS FIGURES:\n${dataSnapshot}\n\nCHAT TRANSCRIPT:\n${chatTranscript}`,
        },
      ];

      const response = await fetch(SARVAM_API_URL, {
        method: "POST",
        headers: {
          "api-subscription-key": getApiKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sarvam-m",
          messages,
          temperature: 0.25,
          max_tokens: 3500,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          (errBody as any)?.message || `API error ${response.status}`,
        );
      }

      const data = await response.json();
      const raw: string = data?.choices?.[0]?.message?.content ?? "";

      if (!raw.trim()) {
        throw new Error("AI returned an empty response. Please try again.");
      }

      const cleaned = raw
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");

      JSON.parse(cleaned); // throws if JSON is malformed

      setPdfData(cleaned);
      setPdfReady(true);
      toast.success("Report ready! Click Download to save your PDF.");
    } catch (error: any) {
      console.error("Report Gen Error:", error);
      const msg = error?.message?.includes("empty")
        ? "AI returned empty content — please try again."
        : error instanceof SyntaxError || error?.message?.includes("JSON")
          ? "Report format error — please try again."
          : `Failed to generate: ${error?.message ?? "Unknown error"}`;
      toast.error(msg);
      setPdfReady(false);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ── Send chat message ─────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input };
    setDisplayMessages((prev) => [...prev, userMsg]);
    fullHistoryRef.current = [...fullHistoryRef.current, userMsg];
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(SARVAM_API_URL, {
        method: "POST",
        headers: {
          "api-subscription-key": getApiKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sarvam-m",
          messages: fullHistoryRef.current,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      if (data?.choices?.[0]) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.choices[0].message.content,
        };
        fullHistoryRef.current = [...fullHistoryRef.current, assistantMessage];
        setDisplayMessages((prev) => [...prev, assistantMessage]);
      }
    } catch {
      toast.error("Message delivery failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentLang = LANGUAGES.find((l) => l.code === reportLanguage);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {showLangModal && (
        <LanguageModal
          onSelect={generateReport}
          onClose={() => setShowLangModal(false)}
        />
      )}

      <div className="fixed inset-0 z-40 flex flex-col bg-slate-50 dark:bg-zinc-950 font-sans">
        {/* ── Header ──────────────────────────────────────────── */}
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Online & Ready
                </p>
              </div>
            </div>
          </div>

          {isAnalyzed && rawBusinessData && (
            <div className="flex items-center gap-2">
              {!pdfReady ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => !isGeneratingPDF && setShowLangModal(true)}
                  disabled={isGeneratingPDF}
                  className="flex gap-2 rounded-full border-blue-200 hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-800 transition-all duration-300 h-9 px-4"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  )}
                  <span className="font-bold text-[11px] uppercase tracking-wider">
                    {isGeneratingPDF ? "Generating..." : "Get State Report"}
                  </span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Language switcher pill */}
                  <button
                    onClick={() => {
                      setPdfReady(false);
                      setShowLangModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 transition-all text-xs font-semibold"
                  >
                    <Globe size={13} />
                    {currentLang?.flag} {currentLang?.label}
                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                    <span className="text-blue-500 text-[10px]">Change</span>
                  </button>

                  {/* Download */}
                  <PDFDownloadLink
                    document={
                      <GrowthAnalysisPDF
                        summary={pdfData}
                        companyName={rawBusinessData.company?.name}
                        language={reportLanguage}
                      />
                    }
                    fileName={`Business_Report_${currentLang?.label}_${new Date().toISOString().split("T")[0]}.pdf`}
                  >
                    {({ loading }) => (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex gap-2 rounded-full bg-green-600 hover:bg-green-700 transition-all h-9 px-4"
                        disabled={loading}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="font-bold text-[11px] uppercase tracking-wider">
                          {loading ? "Preparing..." : "Download PDF"}
                        </span>
                      </Button>
                    )}
                  </PDFDownloadLink>
                </div>
              )}

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

        {/* ── Chat area ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <ScrollArea ref={scrollAreaRef} className="h-full px-4 py-6 md:py-10">
            <div className="max-w-3xl mx-auto space-y-8 pb-32">
              {displayMessages.length === 0 && isLoading && (
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
                      Looking at your sales and stock to help you grow.
                    </p>
                  </div>
                </div>
              )}

              {displayMessages
                .filter((m) => m.role !== "system")
                .map((msg, i) =>
                  msg.role === "assistant" ? (
                    <AIMessageRenderer key={i} content={msg.content} />
                  ) : (
                    <div
                      key={i}
                      className="flex justify-end animate-in slide-in-from-bottom-4 duration-500"
                    >
                      <div className="flex gap-2.5 items-end max-w-[80%] md:max-w-[70%]">
                        <div className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm text-[14px] leading-relaxed font-medium">
                          {msg.content}
                        </div>
                        <div className="mb-0.5 h-7 w-7 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                          <User size={14} className="text-white" />
                        </div>
                      </div>
                    </div>
                  ),
                )}

              {isLoading && displayMessages.length > 0 && (
                <div className="flex justify-start animate-in fade-in-0 duration-300">
                  <div className="flex gap-3">
                    <div className="mt-0.5 h-8 w-8 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-700 flex items-center justify-center shadow-sm">
                      <Loader2
                        size={14}
                        className="animate-spin text-blue-600"
                      />
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

          {/* ── Input bar ──────────────────────────────────────── */}
          {isAnalyzed && (
            <div className="absolute bottom-6 left-0 right-0 z-40 px-4">
              <div className="max-w-2xl mx-auto">
                <div className="relative flex items-center bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 p-1.5 pl-4 transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-500/10">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex-1 flex gap-2"
                  >
                    <input
                      placeholder="Type in English · हिंदी में लिखें · ગુજરાતીમાં લખો"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoading}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-900 dark:text-white py-2.5 text-[14px] font-medium placeholder:text-zinc-400"
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
                  Chat · then generate your Business State Report in any
                  language
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
