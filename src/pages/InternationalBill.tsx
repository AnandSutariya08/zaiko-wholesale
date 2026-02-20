import { useEffect, useState } from "react";
import { BillForm } from "@/components/BillForm";
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  FileText,
  Eye,
  Trash2,
  Globe,
  User,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getBills, deleteBill, updateBillPayment } from "@/lib/storage";
import { Bill, PaymentMethod } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/billUtils";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PaymentDialog } from "@/components/PaymentDialog";

export default function InternationalBill() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      const allBills = await getBills();
      setBills(allBills.filter((b) => b.billType === "international"));
    } catch (error) {
      console.error("Error loading bills:", error);
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills
    .filter((bill) => {
      const matchesSearch =
        bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bill.client.phone && bill.client.phone.includes(searchTerm));

      const matchesDate = !dateFilter || bill.date.includes(dateFilter);

      return matchesSearch && matchesDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteBill(id);
    await loadBills();
    setDeletingId(null);
    toast.success("International bill deleted successfully");
  };

  const handlePaymentCollected = async (
    amount: number,
    type: PaymentMethod,
    note?: string,
    date?: string,
  ) => {
    if (selectedBill) {
      await updateBillPayment(selectedBill.id, amount, type, note, date);
      await loadBills();
      toast.success(`Payment collected successfully`);
    }
  };

  if (showForm) {
    return (
      <div className="space-y-4 md:space-y-6 pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowForm(false)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Create International Bill</h1>
        </div>
        <BillForm initialGstEnabled={false} billType="international" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-8.5rem)] w-full overflow-hidden sm:h-[calc(100dvh-9.5rem)]">
      <div className="relative flex h-full min-h-0 flex-col rounded-[28px] border border-border/70 bg-background p-3 shadow-sm sm:p-5 lg:p-6">
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-background/95 p-3 backdrop-blur sm:p-4">
      <div className="page-header-controls">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/bills")}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="page-header-title min-w-0 flex-1">
            <div className="page-header-icon">
              <Globe className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
              International Bills
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your International invoices
            </p>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="page-header-btn w-full sm:w-auto gap-2"
        >
          <Plus className="h-4 w-4" />
          Create International Bill
        </Button>
      </div>
      </div>

      <div className="mt-4 flex-1 min-h-0 rounded-2xl border border-border/70 bg-background/60 p-2 sm:p-3">
      <div className="h-full overflow-y-auto space-y-4 md:space-y-6 pr-1 sm:pr-2">

      <Card className="border shadow-sm">
        <CardContent className="pt-4 px-3 sm:px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Smart search (Number, Client, Phone)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 border-2"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 h-10 border-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingSpinner
          size="xl"
          text="Loading International bills..."
          contentAreaOnly
        />
      ) : (
        <div className="space-y-3">
          {filteredBills.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="text-center py-12">
                <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-foreground mb-2">
                  No International bills found
                </p>
                <Button variant="outline" onClick={() => setShowForm(true)}>
                  Create Your First International Bill
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredBills.map((bill) => (
              <Card
                key={bill.id}
                className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-lg">
                            {bill.billNumber}
                          </span>
                          <Badge
                            variant={
                              bill.paymentStatus === "paid"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {bill.paymentStatus.toUpperCase()}
                          </Badge>
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
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(bill.date)}</span>
                      </div>
                      {bill.paymentStatus !== "paid" && (
                        <div className="flex items-center gap-1 text-orange-600 font-semibold">
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
                          onClick={() => {
                            setSelectedBill(bill);
                            setPaymentDialogOpen(true);
                          }}
                          className="h-8 gap-1.5 text-xs"
                        >
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
                          title="Share on WhatsApp"
                          onClick={() => {
                            const phone = bill.client.phone?.replace(/\D/g, "");
                            if (!phone) {
                              toast.error("Client phone number not available");
                              return;
                            }
                            const billLink = `${window.location.origin}/view/bill/${bill.id}`;
                            const text = encodeURIComponent(
                              `Hello ${bill.client.name}, please find your international bill ${bill.billNumber} here: ${billLink}`,
                            );
                            window.open(
                              `https://wa.me/${phone}?text=${text}`,
                              "_blank",
                            );
                          }}
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/bills/${bill.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          disabled={
                            deletingId === bill.id || bill.paidAmount > 0
                          }
                          onClick={() => handleDelete(bill.id)}
                        >
                          {deletingId === bill.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

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
    </div>
  );
}

