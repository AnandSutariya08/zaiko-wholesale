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
import { getVendors, saveVendor, deleteVendor } from "@/lib/storage";
import { Vendor } from "@/types";
import { Plus, Edit, Trash2, Store, Eye, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Vendors() {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
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
          <DialogContent>
            <DialogHeader><DialogTitle>Vendor Details</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-muted-foreground">Name</Label><p className="font-medium text-lg">{viewingVendor.name}</p></div>
              <div><Label className="text-muted-foreground">GSTIN</Label><p>{viewingVendor.gstin || "N/A"}</p></div>
              <div><Label className="text-muted-foreground">Address</Label><p>{viewingVendor.address || "N/A"}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Phone</Label><p>{viewingVendor.phone || "N/A"}</p></div>
                <div><Label className="text-muted-foreground">Email</Label><p>{viewingVendor.email || "N/A"}</p></div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
