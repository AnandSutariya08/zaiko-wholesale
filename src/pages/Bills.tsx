import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBills, deleteBill, updateBillPayment } from "@/lib/storage";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/firebaseService";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

export default function Bills() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [updatingGst, setUpdatingGst] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [activeTab, setActiveTab] = useState("all");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, sortBy, activeTab]);

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

  const toggleGst = async (enabled: boolean) => {
    if (!company) return;
    try {
      setUpdatingGst(true);
      const updatedProfile = { ...company, gstEnabled: enabled };
      await saveCompanyProfile(updatedProfile);
      setCompany(updatedProfile);
      toast.success(`GST Billing ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error updating GST setting:", error);
      toast.error("Failed to update GST setting");
    } finally {
      setUpdatingGst(false);
    }
  };

  const getFilteredBills = () => {
    let filtered = [...bills];

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

    // Tab filter (GST/Non-GST)
    if (activeTab === "gst") {
      filtered = filtered.filter((bill) => bill.totalTax > 0);
    } else if (activeTab === "non-gst") {
      filtered = filtered.filter((bill) => bill.totalTax === 0);
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
        className="text-xs"
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
    <div className="space-y-4 p-3 sm:p-4 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground">Bills</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track your invoices
          </p>
        </div>
        {/* <div className="flex items-center space-x-2 bg-card border px-3 py-2 rounded-md shadow-sm">
          <Switch
            id="gst-toggle"
            checked={company?.gstEnabled || false}
            onCheckedChange={toggleGst}
            disabled={updatingGst || !company}
          />
          <Label htmlFor="gst-toggle" className="text-sm font-medium cursor-pointer">
            GST {company?.gstEnabled ? 'ON' : 'OFF'}
          </Label>
        </div> */}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="grid grid-cols-3 w-full sm:w-[400px]">
            <TabsTrigger value="all">All Bills</TabsTrigger>
            <TabsTrigger value="gst">GST Bills</TabsTrigger>
            <TabsTrigger value="non-gst">Non-GST</TabsTrigger>
          </TabsList>

          {/* <div className="flex gap-2 w-full sm:w-auto">
            {activeTab === "gst" ? (
              <Link to="/gst-bill" className="flex-1 sm:flex-initial">
                <Button className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Create GST Bill
                </Button>
              </Link>
            ) : activeTab === "non-gst" ? (
              <Link to="/non-gst-bill" className="flex-1 sm:flex-initial">
                <Button className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Create Non-GST Bill
                </Button>
              </Link>
            ) : (
              <Link to="/bills/new" className="flex-1 sm:flex-initial">
                <Button className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Create Bill
                </Button>
              </Link>
            )}
          </div> */}
        </div>

        {/* Unified Search and Filter UI */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search number, client, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 border-2"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 border-2">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 border-2">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="amount-desc">
                    Amount (High to Low)
                  </SelectItem>
                  <SelectItem value="amount-asc">
                    Amount (Low to High)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                        : "Get started by creating your first invoice"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              pagedBills.map((bill) => (
                <Card
                  key={bill.id}
                  className="hover:shadow-md transition-shadow border-l-4"
                  style={{
                    borderLeftColor:
                      bill.paymentStatus === "paid"
                        ? "#10b981"
                        : bill.paymentStatus === "overdue"
                          ? "#ef4444"
                          : "#f59e0b",
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-lg">
                              {bill.billNumber}
                            </span>
                            {getStatusBadge(bill.paymentStatus)}
                            {bill.totalTax > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase"
                              >
                                GST
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="font-medium truncate">
                              {bill.client.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-primary text-xl font-bold">
                            {formatCurrency(bill.total)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs sm:text-sm border-t pt-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(bill.date)}</span>
                          </div>
                        </div>
                        {bill.paymentStatus !== "paid" && (
                          <div className="flex items-center gap-1 text-orange-600 font-semibold">
                            <IndianRupee className="h-3.5 w-3.5" />
                            <span>
                              Pending:{" "}
                              {formatCurrency(bill.total - bill.paidAmount)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t pt-2">
                        {bill.paymentStatus !== "paid" ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openPaymentDialog(bill)}
                            className="h-8 gap-1.5 text-xs"
                          >
                            <IndianRupee className="h-3.5 w-3.5" />
                            Collect
                          </Button>
                        ) : (
                          <Badge
                            variant="default"
                            className="bg-green-600 text-white h-8"
                          >
                            ✓ Paid
                          </Badge>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
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
                            className="h-8 w-8 p-0"
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
                            className="h-8 w-8 p-0"
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
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link to={`/bills/${bill.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
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
                                className="h-8 w-8 p-0 text-destructive"
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
  );
}
