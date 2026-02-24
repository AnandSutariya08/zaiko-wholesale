import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { getBills, deleteBill, updateBillPayment } from "@/lib/storage";
import { getCompanyProfile } from "@/lib/firebaseService";
import { Bill, PaymentMethod, CompanyProfile } from "@/types";
import { formatCurrency, formatDate } from "@/lib/billUtils";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Filter,
  IndianRupee,
  Loader2,
  Calendar,
  User,
  Receipt,
  FileText,
  Download,
  Share2,
  MessageCircle,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { PaymentDialog } from "@/components/PaymentDialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BillPDF } from "@/components/BillView";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Bills() {
  const location = useLocation();
  const resolveTabFromPath = (pathname: string): string => {
    if (pathname.startsWith("/bills/gst")) return "gst";
    if (pathname.startsWith("/bills/non-gst")) return "non-gst";
    if (pathname.startsWith("/bills/international")) return "international";
    return "all";
  };
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [activeTab, setActiveTab] = useState(() =>
    resolveTabFromPath(location.pathname),
  );
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedDate, statusFilter, sortBy, activeTab]);

  useEffect(() => {
    setActiveTab(resolveTabFromPath(location.pathname));
  }, [location.pathname]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allBills, companyProfile] = await Promise.all([
        getBills(),
        getCompanyProfile(),
      ]);
      setBills(allBills);
      setCompany(companyProfile);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredBills = () => {
    let filtered = [...bills];

    // Date filter first: then search works on selected-date bills
    if (selectedDate) {
      filtered = filtered.filter((bill) => {
        const d = new Date(bill.date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}` === selectedDate;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (bill) =>
          bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (bill.client.phone && bill.client.phone.includes(searchTerm)),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((bill) => bill.paymentStatus === statusFilter);
    }

    // Tab filter (GST/Non-GST/International)
    if (activeTab === "gst") {
      filtered = filtered.filter((bill) => bill.totalTax > 0 && bill.billType !== "international");
    } else if (activeTab === "non-gst") {
      filtered = filtered.filter((bill) => bill.totalTax === 0 && bill.billType !== "international");
    } else if (activeTab === "international") {
      filtered = filtered.filter((bill) => bill.billType === "international");
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-desc":
          return b.total - a.total;
        case "amount-asc":
          return a.total - b.total;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredBills = getFilteredBills();
  const pendingCount = filteredBills.filter(
    (bill) => bill.paymentStatus === "pending",
  ).length;
  const paidCount = filteredBills.filter(
    (bill) => bill.paymentStatus === "paid",
  ).length;
  const overdueCount = filteredBills.filter(
    (bill) => bill.paymentStatus === "overdue",
  ).length;
  const totalSales = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
  const totalPaid = filteredBills.reduce(
    (sum, bill) => sum + (bill.paidAmount || 0),
    0,
  );
  const totalPending = filteredBills.reduce(
    (sum, bill) => sum + (bill.total - (bill.paidAmount || 0)),
    0,
  );
  const totalReturn = filteredBills.reduce(
    (sum, bill) =>
      sum +
      (bill.returns?.reduce((rSum, r) => rSum + (r.totalReturnValue || 0), 0) ||
        0),
    0,
  );
  const tabLabelMap: Record<string, string> = {
    all: "All Bills",
    gst: "GST Bills",
    "non-gst": "Non-GST",
    international: "International",
  };
  const pageTitleMap: Record<string, string> = {
    all: "All Bills",
    gst: "GST Bills",
    "non-gst": "Non-GST Bills",
    international: "International Bills",
  };
  const pageSubtitleMap: Record<string, string> = {
    all: "Manage and track all invoices",
    gst: "Manage GST invoices",
    "non-gst": "Manage non-GST invoices",
    international: "Manage international invoices",
  };
  const createBillLabelMap: Record<string, string> = {
    all: "Create Bill",
    gst: "Create GST Bill",
    "non-gst": "Create Non-GST Bill",
    international: "Create International Bill",
  };
  const createBillPathMap: Record<string, string> = {
    all: "/bills/new",
    gst: "/bills/new?mode=gst",
    "non-gst": "/bills/new?mode=non-gst",
    international: "/bills/new?mode=international",
  };
  const statusLabelMap: Record<string, string> = {
    all: "All Status",
    paid: "Paid",
    pending: "Pending",
    overdue: "Overdue",
  };
  const sortLabelMap: Record<string, string> = {
    "date-desc": "Date (Newest)",
    "date-asc": "Date (Oldest)",
    "amount-desc": "Amount (High to Low)",
    "amount-asc": "Amount (Low to High)",
  };
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedBills = filteredBills.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await deleteBill(id);
    await loadData();
    setDeletingId(null);
    toast.success("Bill deleted successfully");
  };

  const handlePaymentCollected = async (
    amount: number,
    type: PaymentMethod,
    note?: string,
    date?: string,
  ) => {
    if (selectedBill) {
      await updateBillPayment(selectedBill.id, amount, type, note, date);
      await loadData();
      toast.success(
        `Payment of ${formatCurrency(amount)} via ${type} collected successfully`,
      );
    }
  };

  const openPaymentDialog = (bill: Bill) => {
    setSelectedBill(bill);
    setPaymentDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: "default",
      pending: "secondary",
      overdue: "destructive",
    } as const;

    const labels = {
      paid: "Paid",
      pending: "Pending",
      overdue: "Overdue",
    };

    return (
      <Badge
        variant={variants[status as keyof typeof variants]}
        className="inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium"
      >
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <LoadingSpinner
        size="xl"
        text="Loading bills..."
        fullScreen
        contentAreaOnly
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden">
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-background p-2 shadow-sm sm:p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center justify-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-border">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-left">
              <h1 className="truncate text-2xl font-semibold leading-tight sm:text-3xl">
                {pageTitleMap[activeTab] || "Bills"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {pageSubtitleMap[activeTab] || "Manage and track your invoices"}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 rounded-xl border border-border/60 bg-muted/20 p-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start lg:w-auto lg:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-full items-center gap-2 rounded-lg bg-background sm:w-auto"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Manage
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 max-h-[60vh] overflow-y-auto overscroll-contain"
            >
                <DropdownMenuLabel>Bill Type</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setActiveTab("all")}>
                  {activeTab === "all" ? "* " : ""}All Bills
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("gst")}>
                  {activeTab === "gst" ? "* " : ""}GST Bills
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("non-gst")}>
                  {activeTab === "non-gst" ? "* " : ""}Non-GST
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("international")}>
                  {activeTab === "international" ? "* " : ""}International
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Payment Status</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  {statusFilter === "all" ? "* " : ""}All Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("paid")}>
                  {statusFilter === "paid" ? "* " : ""}Paid
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                  {statusFilter === "pending" ? "* " : ""}Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("overdue")}>
                  {statusFilter === "overdue" ? "* " : ""}Overdue
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sort</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSortBy("date-desc")}>
                  {sortBy === "date-desc" ? "* " : ""}Date (Newest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("date-asc")}>
                  {sortBy === "date-asc" ? "* " : ""}Date (Oldest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("amount-desc")}>
                  {sortBy === "amount-desc" ? "* " : ""}Amount (High to Low)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("amount-asc")}>
                  {sortBy === "amount-asc" ? "* " : ""}Amount (Low to High)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setActiveTab("all");
                    setStatusFilter("all");
                    setSortBy("date-desc");
                    setSearchTerm("");
                    setSelectedDate("");
                  }}
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Reset All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full items-center gap-2 rounded-lg bg-background sm:w-auto"
            >
              <FileText className="h-4 w-4" />
              {filteredBills.length} Bills
            </Button>
            {activeTab !== "all" && (
              <Link to={createBillPathMap[activeTab] || "/bills/new"} className="w-full sm:w-auto">
                <Button size="sm" className="h-10 w-full rounded-lg px-4 shadow-sm sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  {createBillLabelMap[activeTab] || "Create Bill"}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-2xl border border-border/70 bg-background/60 p-2 sm:p-3">
      <div className="h-full overflow-y-auto space-y-4 pr-1 sm:pr-2">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {tabLabelMap[activeTab]} - {statusLabelMap[statusFilter]} - {sortLabelMap[sortBy]}
              {selectedDate ? ` - ${selectedDate}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[11px]">
                Pending {pendingCount}
              </Badge>
              <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[11px]">
                Paid {paidCount}
              </Badge>
              <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[11px]">
                Overdue {overdueCount}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          <Card className="rounded-2xl border-primary/30 ">
            <CardContent className="px-4 py-3.5 sm:px-5 sm:py-4">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-muted-foreground/90">
                Total Sales
              </p>
              <p className="mt-2 text-[20px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
                {formatCurrency(totalSales)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-emerald-300/60 ">
            <CardContent className="px-4 py-3.5 sm:px-5 sm:py-4">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-muted-foreground/90">
                Total Paid
              </p>
              <p className="mt-2 text-[20px] font-semibold leading-none tracking-tight text-emerald-700 tabular-nums">
                {formatCurrency(totalPaid)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-amber-300/60 ">
            <CardContent className="px-4 py-3.5 sm:px-5 sm:py-4">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-muted-foreground/90">
                Total Pending
              </p>
              <p className="mt-2 text-[20px] font-semibold leading-none tracking-tight text-amber-700 tabular-nums">
                {formatCurrency(totalPending)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-rose-300/60 ">
            <CardContent className="px-4 py-3.5 sm:px-5 sm:py-4">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-muted-foreground/90">
                Total Return
              </p>
              <p className="mt-2 text-[20px] font-semibold leading-none tracking-tight text-rose-700 tabular-nums">
                {formatCurrency(totalReturn)}
              </p>
            </CardContent>
          </Card>
        </div>
        <Card className="mb-4 overflow-hidden border border-border/70 bg-gradient-to-br from-slate-50/80 via-background to-sky-50/70 shadow-sm">
          <CardContent className="p-3 sm:p-5">
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-left transition hover:border-primary/30"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Filter className="h-4 w-4 text-primary" />
                  </span>
                  <p className="text-base font-semibold">Search & Filters</p>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {tabLabelMap[activeTab]} - {statusLabelMap[statusFilter]} - {sortLabelMap[sortBy]}
                  {selectedDate ? ` - ${selectedDate}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="h-8 rounded-lg px-3 text-xs font-semibold">
                  {filteredBills.length} Results
                </Badge>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${showFilters ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {showFilters && (
              <div className="mt-4 space-y-3 rounded-2xl border border-border/60 bg-background/70 p-3 sm:p-4">
                <div className="grid gap-3 md:grid-cols-12">
                  <div className="relative md:col-span-8">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by bill number, client name, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-12 rounded-xl border border-border/70 bg-white pl-12 text-base shadow-sm transition focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="h-12 rounded-xl border border-border/70 bg-white text-sm shadow-sm"
                      />
                      {selectedDate && (
                        <Button
                          variant="outline"
                          className="h-12 rounded-xl px-3"
                          onClick={() => setSelectedDate("")}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-10 rounded-xl bg-background">
                        {tabLabelMap[activeTab]}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem onClick={() => setActiveTab("all")}>All Bills</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActiveTab("gst")}>GST Bills</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActiveTab("non-gst")}>Non-GST</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActiveTab("international")}>International</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-10 rounded-xl bg-background">
                        {statusLabelMap[statusFilter]}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("paid")}>Paid</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Pending</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("overdue")}>Overdue</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-10 rounded-xl bg-background">
                        {sortLabelMap[sortBy]}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuItem onClick={() => setSortBy("date-desc")}>Date (Newest)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("date-asc")}>Date (Oldest)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("amount-desc")}>Amount (High to Low)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("amount-asc")}>Amount (Low to High)</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    className="h-10 rounded-xl px-3 text-sm"
                    onClick={() => {
                      setActiveTab("all");
                      setStatusFilter("all");
                      setSortBy("date-desc");
                      setSearchTerm("");
                      setSelectedDate("");
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>


        <TabsContent value={activeTab} className="mt-0">
          <div className="space-y-3">
            {filteredBills.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    No bills found
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {activeTab === "gst"
                      ? "No GST bills matching your criteria."
                      : activeTab === "non-gst"
                        ? "No Non-GST bills matching your criteria."
                        : activeTab === "international"
                          ? "No International bills matching your criteria."
                          : "Get started by creating your first invoice"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              pagedBills.map((bill) => (
                <Card
                  key={bill.id}
                  className={`group overflow-hidden rounded-2xl border shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:ring-primary/10 ${
                    bill.paymentStatus === "paid"
                      ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-background to-background"
                      : bill.paymentStatus === "overdue"
                        ? "border-rose-200/80 bg-gradient-to-br from-rose-50/70 via-background to-background"
                        : "border-sky-200/80 bg-gradient-to-br from-sky-50/80 via-background to-background"
                  }`}
                >
                  <CardContent className="p-3.5 pb-5 sm:p-4 sm:pb-6">
                    <div className="space-y-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex min-h-[48px] items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 self-center text-sm text-muted-foreground">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium leading-none text-foreground/90">
                                  {bill.client.name}
                                </p>
                                {bill.client.phone && (
                                  <p className="mt-1 text-xs leading-none text-muted-foreground/80">
                                    {bill.client.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5 self-center">
                            <span className="inline-flex h-8 items-center rounded-lg bg-foreground/[0.04] px-2.5 text-sm font-semibold tracking-tight">
                              {bill.billNumber}
                            </span>
                            {getStatusBadge(bill.paymentStatus)}
                            {bill.totalTax > 0 && (
                              <Badge
                                variant="outline"
                                className="inline-flex h-8 items-center rounded-full border-primary/30 bg-primary/5 px-2 text-[10px] uppercase"
                              >
                                GST
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-xl border border-border/60 bg-background/90 px-3 py-2.5 shadow-sm">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Date</p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDate(bill.date)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Paid</p>
                            <p className="mt-1 text-base font-bold text-foreground">
                              {formatCurrency(bill.paidAmount)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Pending</p>
                            <p className="mt-1 text-base font-bold text-foreground">
                              {formatCurrency(bill.total - bill.paidAmount)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-sky-200/60 bg-sky-50/50 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Bill Total</p>
                            <p className="mt-1 text-base font-bold text-foreground">
                              {formatCurrency(bill.total)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 border-y border-border/60 py-3 sm:flex-row sm:items-center sm:justify-between">
                        {bill.paymentStatus !== "paid" ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openPaymentDialog(bill)}
                            className="h-9 w-full gap-1.5 rounded-xl px-4 text-sm shadow-sm sm:w-auto"
                          >
                            <IndianRupee className="h-3.5 w-3.5" />
                            Collect Payment
                          </Button>
                        ) : (
                          <Badge variant="default" className="h-7 w-fit rounded-full bg-green-600 text-white">
                            Paid
                          </Badge>
                        )}

                        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-background/90 p-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 rounded-lg p-0 bg-background/80 hover:bg-primary/5"
                            title="Download Bill"
                            onClick={async () => {
                              toast.info("Generating PDF...");
                              try {
                                const qrDataURL = await QRCode.toDataURL(window.location.origin + `/bills/${bill.id}`);
                                const doc = <BillPDF bill={bill} company={company} qrDataURL={qrDataURL} />;
                                const blob = await pdf(doc).toBlob();
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `Bill_${bill.billNumber}.pdf`;
                                link.click();
                                URL.revokeObjectURL(url);
                                toast.success("PDF downloaded successfully");
                              } catch (error) {
                                console.error("Error generating PDF:", error);
                                toast.error("Failed to generate PDF");
                              }
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 rounded-lg p-0 bg-background/80 hover:bg-primary/5"
                            title="Share on WhatsApp"
                            onClick={() => {
                              const phone = bill.client.phone?.replace(/\D/g, "");
                              if (!phone) {
                                toast.error("Client phone number not available");
                                return;
                              }
                              // Direct share link for public bill view page
                              const billLink = `${window.location.origin}/view/bill/${bill.id}`;
                              const text = encodeURIComponent(`Hello ${bill.client.name}, please find your bill ${bill.billNumber} here: ${billLink}`);
                              window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                            }}
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 rounded-lg p-0 bg-background/80 hover:bg-primary/5"
                            title="Share Bill"
                            onClick={() => {
                              const publicUrl = `${window.location.origin}/view/bill/${bill.id}`;
                              if (navigator.share) {
                                navigator.share({
                                  title: `Bill ${bill.billNumber}`,
                                  text: `Check out bill ${bill.billNumber} for ${bill.client.name}`,
                                  url: publicUrl,
                                }).catch(console.error);
                              } else {
                                navigator.clipboard.writeText(publicUrl);
                                toast.success("Link copied to clipboard");
                              }
                            }}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                          <Link to={`/bills/${bill.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0 bg-background/80 hover:bg-primary/5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link to={`/bills/${bill.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0 bg-background/80 hover:bg-primary/5"
                              disabled={bill.paymentStatus === "paid"}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 rounded-lg p-0 text-destructive bg-background/80 hover:bg-destructive/10"
                                disabled={
                                  deletingId === bill.id || bill.paidAmount > 0
                                }
                              >
                                {deletingId === bill.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Bill</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(bill.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {filteredBills.length > pageSize && (
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredBills.length)} of{" "}
                {filteredBills.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedBill && (
        <PaymentDialog
          bill={selectedBill}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onPaymentCollected={handlePaymentCollected}
        />
      )}
      </div>
      </div>
    </div>
  );
}

