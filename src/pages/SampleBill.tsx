import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSampleBills,
  deleteSampleBill,
  updateSampleBillPayment,
} from "@/lib/storage";
import { SampleBill } from "@/types";
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
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
import { SamplePaymentDialog } from "@/components/SamplePaymentDialog";

export default function SampleBills() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<SampleBill[]>([]);
  const [filteredBills, setFilteredBills] = useState<SampleBill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gstFilter, setGstFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<SampleBill | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadBills();
  }, []);

  useEffect(() => {
    filterAndSortBills();
  }, [bills, searchTerm, statusFilter, gstFilter, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [filteredBills.length, searchTerm, statusFilter, gstFilter, sortBy]);

  const loadBills = async () => {
    try {
      setLoading(true);
      const allBills = await getSampleBills();
      setBills(allBills);
    } catch (error) {
      console.error("Error loading sample bills:", error);
      toast.error("Failed to load sample bills");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortBills = () => {
    let filtered = [...bills];

    if (searchTerm) {
      filtered = filtered.filter(
        (bill) =>
          bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.client.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((bill) => bill.paymentStatus === statusFilter);
    }

    if (gstFilter !== "all") {
      if (gstFilter === "gst") {
        filtered = filtered.filter((bill) => bill.totalTax > 0);
      } else if (gstFilter === "non-gst") {
        filtered = filtered.filter((bill) => bill.totalTax === 0);
      }
    }

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

    setFilteredBills(filtered);
  };

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedBills = filteredBills.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await deleteSampleBill(id);
    await loadBills();
    setDeletingId(null);
    toast.success("Sample bill deleted successfully");
  };

  const handlePaymentCollected = async (amount: number, type: "Cash" | "Bank Transfer" | "UPI" | "Cheque" | "Other") => {
    if (selectedBill) {
      await updateSampleBillPayment(selectedBill.id, amount, type);
      await loadBills();
      toast.success(
        `Payment of ${formatCurrency(amount)} via ${type} collected successfully`
      );
    }
  };

  const openPaymentDialog = (bill: SampleBill) => {
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
      <LoadingSpinner size="xl" text="Loading sample bills..." fullScreen contentAreaOnly />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 p-3 sm:p-4 w-full max-w-full overflow-x-hidden">
      <div className="page-header-controls">
        <div className="page-header-title min-w-0 flex-1">
          <div className="page-header-icon">
            <Receipt className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground break-words">
                Sample Bills
              </h1>
              <Badge variant="outline" className="text-xs">
                Demo
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground break-words">
              Practice bills that don't affect inventory or finances
            </p>
          </div>
        </div>
        <Link to="/sample-bills/new" className="w-full sm:w-auto flex-shrink-0">
          <Button
            size="sm"
            className="page-header-btn w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Sample Bill
          </Button>
        </Link>
      </div>

      {/* Info Banner
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Sample Bills are for practice only
              </p>
              <p className="text-xs text-blue-700 mt-1">
                These bills don't affect your inventory stock, financial
                calculations, or actual business data. Perfect for testing and
                demonstration purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Filters */}
      <Card className="border shadow-sm w-full max-w-full overflow-hidden">
        <CardContent className="pt-4 sm:pt-5 pb-4 sm:pb-5 px-3 sm:px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sample bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 sm:h-11 border-2 text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 sm:h-11 border-2 text-sm">
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

            <Select value={gstFilter} onValueChange={setGstFilter}>
              <SelectTrigger className="h-10 sm:h-11 border-2 text-sm">
                <Receipt className="h-4 w-4 mr-2" />
                <SelectValue placeholder="GST Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bills</SelectItem>
                <SelectItem value="gst">GST Bills</SelectItem>
                <SelectItem value="non-gst">Non-GST Bills</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 sm:h-11 border-2 text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="amount-desc">
                  Amount (High to Low)
                </SelectItem>
                <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <div className="space-y-3">
        {filteredBills.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="text-center py-12">
              <Receipt className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-foreground mb-2">
                No sample bills found
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Create practice bills for testing and demonstration
              </p>
              <Link to="/sample-bills/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Sample Bill
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          pagedBills.map((bill) => (
            <Card
              key={bill.id}
              className="hover:shadow-lg transition-all duration-200 border-l-4 w-full max-w-full overflow-hidden"
              style={{
                borderLeftColor:
                  bill.paymentStatus === "paid"
                    ? "#10b981"
                    : bill.paymentStatus === "overdue"
                    ? "#ef4444"
                    : "#f59e0b",
              }}
            >
              <CardContent className="p-3 sm:p-4 md:p-5">
                <div className="flex flex-col gap-3 sm:gap-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5 sm:mb-2">
                        <span className="font-bold text-base sm:text-lg md:text-xl text-foreground break-words">
                          {bill.billNumber}
                        </span>
                        {getStatusBadge(bill.paymentStatus)}
                        <Badge
                          variant="outline"
                          className="text-xs text-blue-600 border-blue-200"
                        >
                          SAMPLE
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                        </div>
                        <span className="font-medium truncate break-words">
                          {bill.client.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-primary text-lg sm:text-xl md:text-2xl font-bold break-words">
                        {formatCurrency(bill.total)}
                      </p>
                      {bill.paymentStatus !== "paid" && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 break-words">
                          Paid: {formatCurrency(bill.paidAmount)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Details Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-xs sm:text-sm border-t border-border pt-2 sm:pt-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
                        <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600" />
                        </div>
                        <span className="break-words">
                          {formatDate(bill.date)}
                        </span>
                      </div>
                      {bill.paymentStatus === "overdue" && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] sm:text-xs"
                        >
                          Due: {formatDate(bill.dueDate)}
                        </Badge>
                      )}
                    </div>
                    {bill.paymentStatus !== "paid" && (
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-orange-500/10 rounded-md border border-orange-200 w-full sm:w-auto justify-center sm:justify-start">
                        <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                        <span className="text-orange-600 font-semibold text-xs sm:text-sm break-words">
                          Pending:{" "}
                          {formatCurrency(bill.total - bill.paidAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 border-t border-border pt-2 sm:pt-3">
                    {bill.paymentStatus !== "paid" ? (
                      <Button
                        variant="default"
                        size="default"
                        onClick={() => openPaymentDialog(bill)}
                        className="gap-2 flex-1 sm:flex-none text-xs sm:text-sm touch-manipulation"
                      >
                        <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Collect Payment
                      </Button>
                    ) : (
                      <Badge
                        variant="default"
                        className="bg-green-600 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 w-full sm:w-auto justify-center sm:justify-start"
                      >
                        ✓ Fully Paid
                      </Badge>
                    )}

                    <div className="flex gap-1.5 sm:gap-2 justify-end">
                      <Link
                        to={`/sample-bills/${bill.id}`}
                        className="flex-1 sm:flex-none"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 sm:h-9 gap-1.5 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm touch-manipulation"
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </Link>
                      <Link
                        to={`/sample-bills/${bill.id}/edit`}
                        className="flex-1 sm:flex-none"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 sm:h-9 gap-1.5 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm touch-manipulation"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 sm:h-9 w-8 sm:w-9 p-0 text-destructive hover:text-destructive touch-manipulation"
                            disabled={deletingId === bill.id}
                          >
                            {deletingId === bill.id ? (
                              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-base sm:text-lg">
                              Delete Sample Bill
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm break-words">
                              Are you sure you want to delete sample bill{" "}
                              {bill.billNumber}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(bill.id)}
                              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
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

        {filteredBills.length > pageSize && (
          <Card className="w-full max-w-full overflow-hidden">
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <p className="text-xs sm:text-sm font-medium text-foreground break-words text-center sm:text-left">
                  Showing {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, filteredBills.length)} of{" "}
                  {filteredBills.length} sample bills
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="gap-2 text-xs sm:text-sm touch-manipulation flex-1 sm:flex-none"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-muted rounded-md">
                    <span className="text-xs sm:text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-2 text-xs sm:text-sm touch-manipulation flex-1 sm:flex-none"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedBill && (
        <SamplePaymentDialog
          bill={selectedBill}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onPaymentCollected={handlePaymentCollected}
        />
      )}
    </div>
  );
}

