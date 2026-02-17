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
import { Plus, Edit, Trash2, Store, Eye, Loader2, Search, Receipt, History, Download, FileSpreadsheet, FileText, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/billUtils";
import { Badge } from "@/components/ui/badge";
import { pdf } from "@react-pdf/renderer";
import { VendorLedgerPDF } from "@/components/VendorLedgerPDF";
import * as XLSX from "xlsx";

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
        bill.returns.forEach(r => totalReturn += r.totalReturnValue);
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
      const stats = getVendorStats(vendor.id, vendor.name);
      
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">Manage your supply chain</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="lg"><Plus className="h-5 w-5 mr-2" />Add Vendor</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex justify-end gap-2">
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-center pr-8">
                <DialogTitle>Vendor Details: {viewingVendor.name}</DialogTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadExcel(viewingVendor)} className="h-8 gap-1">
                    <FileSpreadsheet className="h-4 w-4" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadPDF(viewingVendor)} className="h-8 gap-1">
                    <FileText className="h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Total Purchase</p>
                    <p className="text-2xl font-bold">{formatCurrency(getVendorStats(viewingVendor.id, viewingVendor.name).totalPurchase)}</p>
                    <p className="text-[10px] text-muted-foreground">{getVendorStats(viewingVendor.id, viewingVendor.name).billCount} Bills</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <p className="text-xs text-green-600 uppercase font-semibold">Total Paid</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(getVendorStats(viewingVendor.id, viewingVendor.name).totalPaid)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-4">
                    <p className="text-xs text-orange-600 uppercase font-semibold">Pending Amount</p>
                    <p className="text-2xl font-bold text-orange-700">{formatCurrency(getVendorStats(viewingVendor.id, viewingVendor.name).pendingAmount)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <p className="text-xs text-blue-600 uppercase font-semibold">Return Amount</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(getVendorStats(viewingVendor.id, viewingVendor.name).totalReturn)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">General Info</Label>
                  <div className="p-3 border rounded-lg space-y-1">
                    <p className="font-semibold text-lg">{viewingVendor.name}</p>
                    <p className="text-sm text-muted-foreground">{viewingVendor.address || "No address provided"}</p>
                    {viewingVendor.gstin && <p className="text-sm font-mono mt-2 bg-muted p-1 inline-block rounded">GST: {viewingVendor.gstin}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Contact Details</Label>
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Phone:</span><span className="text-sm font-medium">{viewingVendor.phone || "N/A"}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Email:</span><span className="text-sm font-medium">{viewingVendor.email || "N/A"}</span></div>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="bills" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bills" className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Purchase Bills</TabsTrigger>
                  <TabsTrigger value="transactions" className="flex items-center gap-2"><History className="h-4 w-4" /> Transactions</TabsTrigger>
                </TabsList>
                <TabsContent value="bills" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">All Purchase Bills</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(() => {
                          const term = viewingVendor.name.toLowerCase().trim();
                          const filteredBills = purchaseBills.filter(b => 
                            (b.vendorId && b.vendorId === viewingVendor.id) || 
                            (b.vendorName && b.vendorName.toLowerCase().trim() === term)
                          );
                          
                          if (filteredBills.length > 0) {
                            return (
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Bill #</TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Total</TableHead>
                                      <TableHead>Paid</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {filteredBills.map(bill => {
                                      // Calculate real-time values
                                      const totalReturns = (bill.returns || []).reduce((sum, r) => sum + r.totalReturnValue, 0);
                                      const netTotal = bill.total - totalReturns;
                                      const paidAmount = bill.paidAmount || 0;
                                      const remainingAmount = netTotal - paidAmount;
                                      
                                      // Determine current status
                                      let currentStatus: string = bill.paymentStatus;
                                      if (remainingAmount < 0) {
                                        currentStatus = 'overpaid';
                                      } else if (remainingAmount === 0) {
                                        currentStatus = 'paid';
                                      } else if (paidAmount > 0) {
                                        currentStatus = 'partial';
                                      } else if (bill.dueDate && new Date(bill.dueDate) < new Date()) {
                                        currentStatus = 'overdue';
                                      } else {
                                        currentStatus = 'pending';
                                      }
                                      
                                      return (
                                        <TableRow key={bill.id}>
                                          <TableCell className="font-medium">{bill.billNumber || "N/A"}</TableCell>
                                          <TableCell>{formatDate(bill.billDate || bill.createdAt)}</TableCell>
                                          <TableCell>{formatCurrency(netTotal)}</TableCell>
                                          <TableCell>{formatCurrency(paidAmount)}</TableCell>
                                          <TableCell>
                                            <Badge variant={
                                              currentStatus === 'paid' ? 'default' : 
                                              currentStatus === 'overdue' || currentStatus === 'overpaid' ? 'destructive' : 
                                              currentStatus === 'partial' ? 'secondary' : 
                                              'outline'
                                            }>
                                              {currentStatus.toUpperCase()}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/purchase-bills?id=${bill.id}`)}>View</Button>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            );
                          }
                          return <div className="text-center py-8 text-muted-foreground">No purchase bills found for this vendor.</div>;
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="transactions" className="mt-4">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle className="text-sm">Transaction History</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                          <div className="relative flex-1 md:w-48">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              placeholder="Search reference..." 
                              value={historySearchQuery}
                              onChange={(e) => setHistorySearchQuery(e.target.value)}
                              className="pl-7 h-8 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Input 
                              type="date" 
                              value={dateFilter.start}
                              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                              className="h-8 text-xs w-32"
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input 
                              type="date" 
                              value={dateFilter.end}
                              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                              className="h-8 text-xs w-32"
                            />
                            {(dateFilter.start || dateFilter.end || historySearchQuery) && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setDateFilter({ start: "", end: "" });
                                  setHistorySearchQuery("");
                                }}
                                className="h-8 px-2 text-xs"
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(() => {
                          const transactions = getVendorTransactions(viewingVendor.id, viewingVendor.name);
                          if (transactions.length > 0) {
                            return transactions.map(tx => (
                              <div key={tx.id} className={`flex justify-between items-center p-3 border rounded hover:bg-muted/50 transition-colors ${
                                tx.type === 'Purchase Payment' ? 'bg-red-50/30 dark:bg-red-900/10 border-red-100' :
                                tx.type === 'Return Payment' ? 'bg-green-50/30 dark:bg-green-900/10 border-green-100' : ''
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${
                                    tx.type === 'Purchase Payment' ? 'bg-red-100 text-red-600' : 
                                    tx.type === 'Return Payment' ? 'bg-green-100 text-green-600' : ''
                                  }`}>
                                    {tx.type === 'Purchase Payment' ? <Receipt className="h-4 w-4" /> : 
                                     tx.type === 'Return Payment' ? <Plus className="h-4 w-4" /> : null}
                                  </div>
                                  <div>
                                    <p className="font-medium">{tx.type}</p>
                                    <p className="text-xs text-muted-foreground">{tx.reference} • {formatDate(tx.displayDate || tx.date)}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`font-semibold ${
                                    tx.type === 'Purchase Payment' ? 'text-red-600' : 
                                    tx.type === 'Return Payment' ? 'text-green-600' : ''
                                  }`}>
                                    {tx.type === 'Purchase Payment' ? '-' : '+'}{formatCurrency(tx.amount)}
                                  </p>
                                  {tx.method && <p className="text-[10px] text-muted-foreground uppercase">{tx.method}</p>}
                                </div>
                              </div>
                            ));
                          }
                          return <div className="text-center py-8 text-muted-foreground">No transactions found for this vendor.</div>;
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}