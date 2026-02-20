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
import { getClients, saveClient, deleteClient } from "@/lib/storage";
import { Client } from "@/types";
import { Plus, Edit, Trash2, Users, Eye, Search, MapPin, Phone, Mail, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { ClientDetailScreen } from "@/components/ClientDetailScreen";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Clients() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isOpen, setIsOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    billingAddress: "",
    shippingAddress: "",
    gstin: "",
    state: "",
    stateCode: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await getClients();
      setClients(clientsData);
      setPage(1);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedGstin = formData.gstin.trim().toUpperCase();

    // Validate GSTIN format only if provided
    if (trimmedGstin) {
      if (trimmedGstin.length !== 15) {
        toast.error("GSTIN must be exactly 15 characters");
        return;
      }

      if (!/^[0-9A-Z]{15}$/.test(trimmedGstin)) {
        toast.error("GSTIN must contain only letters and numbers");
        return;
      }

      // If GSTIN is provided, state and state code are required
      if (!formData.state.trim()) {
        toast.error("State is required when GSTIN is provided");
        return;
      }

      if (!formData.stateCode.trim()) {
        toast.error("State Code is required when GSTIN is provided");
        return;
      }

      // Check for duplicate GSTIN - enforce one client per GSTIN (only if GSTIN is provided)
      const existingClientWithGstin = clients.find(
        (client) =>
          client.gstin &&
          client.gstin.trim().toUpperCase() === trimmedGstin &&
          client.id !== editingClient?.id // Exclude self when editing
      );

      if (existingClientWithGstin) {
        toast.error(
          `A client with GSTIN "${trimmedGstin}" already exists (${existingClientWithGstin.name}). Only one client per GSTIN is allowed.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const client: Client = {
        id: editingClient?.id || crypto.randomUUID(),
        ...formData,
        gstin: trimmedGstin, // Normalize GSTIN
        createdAt: editingClient?.createdAt || new Date().toISOString(),
      };

      await saveClient(client);
      await loadClients();
      setIsOpen(false);
      resetForm();
      toast.success(editingClient ? "Client updated" : "Client added");
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Failed to save client");
    } finally {
      setSaving(false);
    }
  };
  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      billingAddress: client.billingAddress,
      shippingAddress: client.shippingAddress || "",
      gstin: client.gstin,
      state: client.state,
      stateCode: client.stateCode,
      phone: client.phone || "",
      email: client.email || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteClient(id);
    await loadClients();
    toast.success("Client deleted");
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      billingAddress: "",
      shippingAddress: "",
      gstin: "",
      state: "",
      stateCode: "",
      phone: "",
      email: "",
    });
  };

  // Filter clients based on search query
  const filteredClients = clients.filter((client) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      client.name.toLowerCase().includes(query) ||
      client.gstin.toLowerCase().includes(query) ||
      client.billingAddress.toLowerCase().includes(query) ||
      (client.shippingAddress &&
        client.shippingAddress.toLowerCase().includes(query)) ||
      (client.phone && client.phone.toLowerCase().includes(query)) ||
      (client.email && client.email.toLowerCase().includes(query)) ||
      (client.state && client.state.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedClients = filteredClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner size="xl" text="Loading clients..." fullScreen contentAreaOnly />
      </div>
    );
  }

  if (viewingClient) {
    return (
      <ClientDetailScreen
        client={viewingClient}
        onBack={() => setViewingClient(null)}
      />
    );
  }

  return (
    <div className="-mx-3 h-[calc(100dvh-8.5rem)] overflow-hidden px-2 sm:-mx-4 sm:h-[calc(100dvh-9.5rem)] sm:px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="relative flex h-full min-h-0 flex-col rounded-[28px] border border-border/70 bg-background p-3 shadow-sm sm:p-5 lg:p-6">
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-background/95 p-3 backdrop-blur sm:p-4">
      <div className="page-header-controls">
        <div className="page-header-title">
          <div className="page-header-icon">
            <Users className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Manage your client information</p>
          </div>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="page-header-btn">
              <Plus className="h-5 w-5 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="dialog-form-content sm:max-w-[600px]">
            <DialogHeader className="dialog-form-header">
              <DialogTitle>
                {editingClient ? "Edit Client" : "Add Client"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="dialog-form-body space-y-5">
              {/* Client Details Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Client Name *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter client name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input
                    value={formData.gstin}
                    onChange={(e) => {
                      const value = e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "");
                      setFormData({ ...formData, gstin: value });
                    }}
                    placeholder="Enter 15-digit GSTIN (optional)"
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. If provided, one client can be created per GSTIN.
                    GSTIN must be exactly 15 characters.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Billing Address *</Label>
                  <Textarea
                    required
                    value={formData.billingAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: e.target.value,
                      })
                    }
                    placeholder="Enter billing address"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Shipping Address (if different)</Label>
                  <Textarea
                    value={formData.shippingAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingAddress: e.target.value,
                      })
                    }
                    placeholder="Enter shipping address (leave empty if same as billing)"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State {formData.gstin.trim() ? "*" : ""}</Label>
                    <Input
                      required={!!formData.gstin.trim()}
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      placeholder="Gujarat"
                    />
                    {formData.gstin.trim() && (
                      <p className="text-xs text-muted-foreground">
                        Required when GSTIN is provided
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>State Code {formData.gstin.trim() ? "*" : ""}</Label>
                    <Input
                      required={!!formData.gstin.trim()}
                      value={formData.stateCode}
                      onChange={(e) =>
                        setFormData({ ...formData, stateCode: e.target.value })
                      }
                      placeholder="24"
                    />
                    {formData.gstin.trim() && (
                      <p className="text-xs text-muted-foreground">
                        Required when GSTIN is provided
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
              </div>

              <div className="dialog-form-footer flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  {editingClient ? "Update" : "Add"} Client
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      <div className="mt-4 flex-1 min-h-0 rounded-2xl border border-border/70 bg-background/60 p-2 sm:p-3">
      <div className="h-full overflow-y-auto space-y-6 pr-1 sm:pr-2">

      {/* Search Bar */}
      {clients.length > 0 && (
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search clients by name, GSTIN, phone, email, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full text-sm sm:text-base"
              />
            </div>
            {searchQuery && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Found {filteredClients.length}{" "}
                {filteredClients.length === 1 ? "client" : "clients"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {clients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">No clients added yet</p>
            <Button onClick={() => setIsOpen(true)}>
              Add your first client
            </Button>
          </CardContent>
        </Card>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">
              No clients found matching your search
            </p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagedClients.map((client) => (
            <Card
              key={client.id}
              className="group relative overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-cyan-500/10 blur-2xl" />
              <CardHeader className="relative pb-3">
                <CardTitle className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
                      <span className="text-base font-semibold">
                        {client.name?.charAt(0).toUpperCase() || "C"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold leading-tight">{client.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Client Profile
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 rounded-xl border border-border/60 bg-background/85 p-1 backdrop-blur">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      onClick={() => {
                        setViewingClient(client);
                      }}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      onClick={() => handleEdit(client)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Client</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {client.name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(client.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-3 pt-0 text-sm">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Billing Address
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/90">{client.billingAddress}</p>
                </div>
                {client.shippingAddress && (
                  <p className="rounded-lg border border-dashed border-border/70 bg-background/70 px-2.5 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/90">Ship to:</span> {client.shippingAddress}
                  </p>
                )}
                <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-3">
                  {client.gstin && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">GSTIN</span>
                      <span className="max-w-[60%] truncate rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                        {client.gstin}
                      </span>
                    </div>
                  )}
                  {client.state && client.stateCode && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">State</span>
                      <span className="truncate text-xs font-medium">
                        {client.state} ({client.stateCode})
                      </span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        Phone
                      </span>
                      <span className="truncate text-xs font-medium">{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        Email
                      </span>
                      <span className="max-w-[65%] truncate text-xs font-medium">{client.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {filteredClients.length > pageSize && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
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
      </div>
      </div>
      </div>
    </div>
  );
}





