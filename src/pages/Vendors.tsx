import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, Store, Eye, Loader2, Search, Receipt, History } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/billUtils";
import { Badge } from "@/components/ui/badge";

export default function Vendors() {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  const getVendorTransactions = (vendorId: string) => {
    const vendorBills = purchaseBills.filter(b => b.vendorId === vendorId);
    const transactions: any[] = [];

    vendorBills.forEach(bill => {
      // Add the bill itself as a "Purchase" transaction
      transactions.push({
        id: `bill-${bill.id}`,
        date: bill.billDate || bill.createdAt,
        type: "Purchase",
        reference: bill.billNumber || "N/A",
        amount: bill.total,
        status: bill.paymentStatus
      });

      // Add payments
      if (bill.payments) {
        bill.payments.forEach(payment => {
          transactions.push({
            id: `pay-${payment.id}`,
            date: payment.date,
            type: "Payment",
            reference: `For Bill #${bill.billNumber || ""}`,
            amount: payment.amount,
            method: payment.method
          });
        });
      }

      // Add returns
      if (bill.returns) {
        bill.returns.forEach(ret => {
          transactions.push({
            id: `ret-${ret.id}`,
            date: ret.returnDate,
            type: "Return",
            reference: `From Bill #${bill.billNumber || ""}`,
            amount: ret.totalReturnValue,
            notes: ret.notes
          });
        });
      }
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.gstin.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}{editingVendor ? "Update" : "Add"} Vendor</Button>
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
            <DialogHeader><DialogTitle>Vendor Details: {viewingVendor.name}</DialogTitle></DialogHeader>
            <div className="space-y-6">
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
                        {purchaseBills.filter(b => b.vendorId === viewingVendor.id).length > 0 ? (
                          purchaseBills.filter(b => b.vendorId === viewingVendor.id).map(bill => (
                            <div key={bill.id} className="flex justify-between items-center p-3 border rounded hover:bg-muted/50 transition-colors">
                              <div>
                                <p className="font-medium">Bill #{bill.billNumber || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(bill.billDate || bill.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatCurrency(bill.total)}</p>
                                <Badge variant={bill.paymentStatus === 'paid' ? 'default' : bill.paymentStatus === 'overdue' ? 'destructive' : 'outline'}>
                                  {bill.paymentStatus.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">No purchase bills found for this vendor.</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="transactions" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Transaction History</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {getVendorTransactions(viewingVendor.id).length > 0 ? (
                          getVendorTransactions(viewingVendor.id).map(tx => (
                            <div key={tx.id} className="flex justify-between items-center p-3 border rounded hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${tx.type === 'Purchase' ? 'bg-orange-100 text-orange-600' : tx.type === 'Payment' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {tx.type === 'Purchase' ? <Receipt className="h-4 w-4" /> : tx.type === 'Payment' ? <Plus className="h-4 w-4" /> : <History className="h-4 w-4" />}
                                </div>
                                <div>
                                  <p className="font-medium">{tx.type}</p>
                                  <p className="text-xs text-muted-foreground">{tx.reference} • {formatDate(tx.date)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-semibold ${tx.type === 'Purchase' ? 'text-destructive' : 'text-green-600'}`}>
                                  {tx.type === 'Purchase' ? '-' : '+'}{formatCurrency(tx.amount)}
                                </p>
                                {tx.method && <p className="text-[10px] text-muted-foreground uppercase">{tx.method}</p>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">No transactions found for this vendor.</div>
                        )}
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

