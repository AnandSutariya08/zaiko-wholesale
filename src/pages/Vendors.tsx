import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { getVendors, saveVendor, deleteVendor, getPurchaseBills } from "@/lib/storage";
import { Vendor, PurchaseBill } from "@/types";
import { Plus, Edit, Trash2, Store, Eye, Loader2, Search, Receipt, History, Download, FileSpreadsheet, FileText, ArrowLeftRight, RotateCcw, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/billUtils";
import { Badge } from "@/components/ui/badge";
import { pdf } from "@react-pdf/renderer";
import { VendorLedgerPDF } from "@/components/VendorLedgerPDF";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

export default function Vendors() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState({
    start: "",
    end: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    gstin: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadVendors();
    loadPurchaseBills();
  }, []);

  // Reload purchase bills whenever the dialog is opened to ensure fresh data
  useEffect(() => {
    if (isViewOpen && viewingVendor) {
      loadPurchaseBills();
    }
  }, [isViewOpen, viewingVendor]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await getVendors();
      setVendors(data);
    } catch (error) {
      console.error("Error loading vendors:", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseBills = async () => {
    try {
      const data = await getPurchaseBills();
      setPurchaseBills(data);
    } catch (error) {
      console.error("Error loading purchase bills:", error);
    }
  };

  const getVendorTransactions = (vendorId: string, vendorName: string) => {
    const term = vendorName.toLowerCase().trim();
    const vendorBills = purchaseBills.filter(b => 
      (b.vendorId && b.vendorId === vendorId) || 
      (b.vendorName && b.vendorName.toLowerCase().trim() === term)
    );
    const transactions: any[] = [];

    vendorBills.forEach(bill => {
      // Add payments only - Purchase and Return payments
      if (bill.payments) {
        bill.payments.forEach(payment => {
          const isReturnPayment = payment.amount < 0;
          
          transactions.push({
            id: `pay-${payment.id}`,
            date: payment.date,
            displayDate: payment.date,
            type: isReturnPayment ? "Return Payment" : "Purchase Payment",
            reference: isReturnPayment 
              ? `Return Payment from Vendor - Bill #${bill.billNumber || ""}` 
              : `Purchase Payment to Vendor - Bill #${bill.billNumber || ""}`,
            amount: Math.abs(payment.amount),
            method: payment.method,
            billId: bill.id,
            isRefund: isReturnPayment
          });
        });
      }
    });

    return transactions
      .filter(tx => {
        const matchesSearch = tx.reference.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
                             tx.type.toLowerCase().includes(historySearchQuery.toLowerCase());
        
        let matchesDate = true;
        if (dateFilter.start || dateFilter.end) {
          const txDate = new Date(tx.date);
          if (dateFilter.start) {
            const startDate = new Date(dateFilter.start);
            startDate.setHours(0, 0, 0, 0);
            if (txDate < startDate) matchesDate = false;
          }
          if (dateFilter.end) {
            const endDate = new Date(dateFilter.end);
            endDate.setHours(23, 59, 59, 999);
            if (txDate > endDate) matchesDate = false;
          }
        }
        
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => {
        // Sort by full timestamp DESCENDING (newest first - most recent at top)
        // This includes hours, minutes, seconds for precise ordering
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  };

  const getVendorStats = (vendorId: string, vendorName: string) => {
    const term = vendorName.toLowerCase().trim();
    const vendorBills = purchaseBills.filter(b => 
      (b.vendorId && b.vendorId === vendorId) || 
      (b.vendorName && b.vendorName.toLowerCase().trim() === term)
    );
    
    let totalPurchase = 0;
    let totalPaid = 0;
    let totalReturn = 0;

    vendorBills.forEach(bill => {
      totalPurchase += bill.total;
      totalPaid += bill.paidAmount || 0;
      if (bill.returns) {
        bill.returns.forEach(r => totalReturn += r.totalReturnValue, 0);
      }
    });

    const pendingAmount = totalPurchase - totalPaid - totalReturn;

    return {
      totalPurchase,
      totalPaid,
      pendingAmount,
      totalReturn,
      billCount: vendorBills.length
    };
  };

  const downloadExcel = (vendor: Vendor) => {
    try {
      const transactions = getVendorTransactions(vendor.id, vendor.name);
      
      const data = transactions.map(tx => ({
        Date: formatDate(tx.date),
        Type: tx.type,
        Reference: tx.reference,
        Method: tx.method || "-",
        Amount: tx.amount,
        Direction: tx.type === 'Purchase' ? 'DR' : 'CR'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vendor Ledger");
      XLSX.writeFile(wb, `${vendor.name}_Ledger.xlsx`);
      toast.success("Excel ledger downloaded");
    } catch (error) {
      console.error("Excel download error:", error);
      toast.error("Failed to download Excel");
    }
  };

  const downloadPDF = async (vendor: Vendor) => {
    try {
      const transactions = getVendorTransactions(vendor.id, vendor.name);
      const stats = getVendorStats(vendor.id, vendor.name);

      const doc = <VendorLedgerPDF vendor={vendor} transactions={transactions} stats={stats} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${vendor.name}_Ledger.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success("PDF ledger downloaded");
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error("Failed to download PDF");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const vendor: Vendor = {
        id: editingVendor?.id || crypto.randomUUID(),
        ...formData,
        createdAt: editingVendor?.createdAt || new Date().toISOString(),
      };

      await saveVendor(vendor);
      await loadVendors();
      setIsOpen(false);
      resetForm();
      toast.success(editingVendor ? "Vendor updated" : "Vendor added");
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast.error("Failed to save vendor");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      address: vendor.address,
      gstin: vendor.gstin,
      phone: vendor.phone,
      email: vendor.email,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteVendor(id);
    await loadVendors();
    toast.success("Vendor deleted");
  };

  const resetForm = () => {
    setEditingVendor(null);
    setFormData({
      name: "",
      address: "",
      gstin: "",
      phone: "",
      email: "",
    });
  };

  const filteredVendors = vendors
    .filter((v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.gstin.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  if (loading) return <LoadingSpinner size="xl" text="Loading vendors..." fullScreen contentAreaOnly />;

  return (
    <div className="space-y-6 p-4">
      <div className="page-header-controls">
        <div className="page-header-title">
          <div className="page-header-icon">
            <Store className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div>
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">Manage your supply chain</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="page-header-btn"><Plus className="h-5 w-5 mr-2" />Add Vendor</Button>
          </DialogTrigger>
          <DialogContent className="dialog-form-content sm:max-w-[500px]">
            <DialogHeader className="dialog-form-header"><DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="dialog-form-body space-y-4">
              <div className="space-y-2">
                <Label>Vendor Name *</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })} maxLength={15} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div className="dialog-form-footer flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>{editingVendor ? "Update" : "Add"} Vendor</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search vendors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVendors.map((vendor) => (
          <Card key={vendor.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{vendor.name}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setViewingVendor(vendor); setIsViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(vendor)}><Edit className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete Vendor</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {vendor.name}?</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(vendor.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="text-muted-foreground">{vendor.address}</p>
              {vendor.gstin && <p>GSTIN: {vendor.gstin}</p>}
              {vendor.phone && <p>Phone: {vendor.phone}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {viewingVendor && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="dialog-form-content max-w-4xl p-0 flex flex-col h-[90vh] sm:h-[85vh]">
            <DialogHeader className="dialog-form-header shrink-0 flex flex-row items-center justify-between px-4 py-3 border-b">
              <DialogTitle className="text-base font-semibold truncate">
                {viewingVendor.name}
              </DialogTitle>
              <div className="flex gap-2 mr-8">
                <Button variant="outline" size="icon" onClick={() => downloadExcel(viewingVendor)} className="h-8 w-8" title="Export Excel">
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => downloadPDF(viewingVendor)} className="h-8 w-8" title="Export PDF">
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
              {/* Stats Grid - Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-primary/5 border-primary/20 shadow-none">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Purchases</p>
                    <p className="text-lg font-bold truncate">{formatCurrency(getVendorStats(viewingVendor.id, viewingVendor.name).totalPurchase)}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{getVendorStats(viewingVendor.id, viewingVendor.name).billCount} Bills</p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100 shadow-none">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Paid</p>
                    <p className="text-lg font-bold text-emerald-700 truncate">{formatCurrency(getVendorStats(viewingVendor.id, viewingVendor.name).totalPaid)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-100 shadow-none">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-orange-600 uppercase font-bold tracking-wider">Pending</p>
                    <p className="text-lg font-bold text-orange-700 truncate">{formatCurrency(getVendorStats(viewingVendor.id, viewingVendor.name).pendingAmount)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100 shadow-none">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Returns</p>
                    <p className="text-lg font-bold text-blue-700 truncate">{formatCurrency(getVendorStats(viewingVendor.id, viewingVendor.name).totalReturn)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Info Section - Mobile Optimized */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-xl bg-muted/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <Store className="h-5 w-5 text-primary mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vendor Info</p>
                      <p className="font-bold text-base truncate">{viewingVendor.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{viewingVendor.address || "No address provided"}</p>
                      {viewingVendor.gstin && (
                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold">
                          GST: {viewingVendor.gstin}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-xl bg-muted/30 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact Details</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between py-1 border-b border-dashed border-muted-foreground/20">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <span className="text-sm font-bold">{viewingVendor.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm font-bold truncate ml-4">{viewingVendor.email || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs with scrollable content */}
              <Tabs defaultValue="bills" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/50 rounded-lg">
                  <TabsTrigger value="bills" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Receipt className="h-4 w-4 mr-2" /> 
                    <span className="hidden sm:inline">Purchase Bills</span>
                    <span className="sm:hidden">Bills</span>
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <History className="h-4 w-4 mr-2" /> 
                    <span className="hidden sm:inline">Transactions</span>
                    <span className="sm:hidden">History</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="bills" className="mt-4 focus-visible:outline-none">
                  <div className="space-y-3">
                    {(() => {
                      const term = viewingVendor.name.toLowerCase().trim();
                      const filteredBills = purchaseBills.filter(b => 
                        (b.vendorId && b.vendorId === viewingVendor.id) || 
                        (b.vendorName && b.vendorName.toLowerCase().trim() === term)
                      );
                      
                      if (filteredBills.length === 0) {
                        return (
                          <div className="text-center py-10 border-2 border-dashed rounded-xl">
                            <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-muted-foreground font-medium">No purchase bills found</p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 gap-3">
                          {filteredBills.map(bill => {
                            const totalReturns = (bill.returns || []).reduce((sum, r) => sum + r.totalReturnValue, 0);
                            const netTotal = bill.total - totalReturns;
                            const paidAmount = bill.paidAmount || 0;
                            const remainingAmount = netTotal - paidAmount;
                            
                            let currentStatus = bill.paymentStatus;
                            if (remainingAmount < 0) currentStatus = 'overpaid';
                            else if (remainingAmount === 0) currentStatus = 'paid';
                            else if (paidAmount > 0) currentStatus = 'partial';
                            else if (bill.dueDate && new Date(bill.dueDate) < new Date()) currentStatus = 'overdue';
                            else currentStatus = 'pending';

                            return (
                              <Card key={bill.id} className="overflow-hidden border-muted-foreground/10 hover:border-primary/30 transition-colors shadow-none">
                                <div className="p-4 sm:p-5">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="min-w-0">
                                      <p className="font-bold text-sm truncate">#{bill.billNumber || "N/A"}</p>
                                      <p className="text-xs text-muted-foreground">{formatDate(bill.billDate || bill.createdAt)}</p>
                                    </div>
                                    <Badge variant={
                                      currentStatus === 'paid' ? 'default' : 
                                      currentStatus === 'overdue' || currentStatus === 'overpaid' ? 'destructive' : 
                                      currentStatus === 'partial' ? 'secondary' : 'outline'
                                    } className="text-[10px] px-2 py-0">
                                      {currentStatus.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Net Total</p>
                                      <p className="text-sm font-bold">{formatCurrency(netTotal)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Paid</p>
                                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(paidAmount)}</p>
                                    </div>
                                  </div>
                                  <div className="mt-4 pt-3 border-t flex justify-between items-center">
                                    <div className="text-[10px] text-muted-foreground italic">
                                      Balance: {formatCurrency(remainingAmount)}
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-primary px-3" onClick={() => navigate(`/purchase-bills?id=${bill.id}`)}>
                                      Details
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>

                <TabsContent value="transactions" className="mt-4 focus-visible:outline-none">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search payments..." value={historySearchQuery} onChange={(e) => setHistorySearchQuery(e.target.value)} className="pl-9 h-10" />
                      </div>
                      <div className="flex gap-2">
                        <Input type="date" value={dateFilter.start} onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })} className="h-10 text-xs sm:text-sm" />
                        <Input type="date" value={dateFilter.end} onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })} className="h-10 text-xs sm:text-sm" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(() => {
                        const transactions = getVendorTransactions(viewingVendor.id, viewingVendor.name);
                        
                        if (transactions.length === 0) {
                          return (
                            <div className="text-center py-10 border-2 border-dashed rounded-xl">
                              <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                              <p className="text-muted-foreground font-medium">No transaction history found</p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 gap-3">
                            {transactions.map(tx => (
                              <Card key={tx.id} className="shadow-none border-muted-foreground/10">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex gap-3 min-w-0">
                                      <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                                        tx.isRefund ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                                      )}>
                                        {tx.isRefund ? <RotateCcw className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-sm truncate">{tx.type}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{tx.reference}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant="outline" className="text-[9px] font-mono px-1.5 h-4">
                                            {tx.method || "CASH"}
                                          </Badge>
                                          <span className="text-[10px] text-muted-foreground font-medium">{formatDate(tx.date)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className={cn(
                                        "text-base font-bold",
                                        tx.isRefund ? "text-blue-600" : "text-emerald-600"
                                      )}>
                                        {tx.isRefund ? "+" : "-"}{formatCurrency(tx.amount)}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="dialog-form-footer shrink-0 flex justify-end gap-2 p-4 border-t bg-muted/20">
              <Button variant="outline" onClick={() => setIsViewOpen(false)} className="h-10 px-6 font-bold">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
