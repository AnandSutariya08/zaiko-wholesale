import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Client } from "@/types";
import { saveClient } from "@/lib/storage";

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (client: Client) => void;
}

export function ClientForm({ open, onOpenChange, onSuccess }: ClientFormProps) {
  const [saving, setSaving] = useState(false);
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

  const resetForm = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedGstin = formData.gstin.trim().toUpperCase();

    if (trimmedGstin) {
      if (trimmedGstin.length !== 15) {
        toast.error("GSTIN must be exactly 15 characters");
        return;
      }
      if (!/^[0-9A-Z]{15}$/.test(trimmedGstin)) {
        toast.error("GSTIN must contain only letters and numbers");
        return;
      }
      if (!formData.state.trim()) {
        toast.error("State is required when GSTIN is provided");
        return;
      }
      if (!formData.stateCode.trim()) {
        toast.error("State Code is required when GSTIN is provided");
        return;
      }
    }

    setSaving(true);
    try {
      const client: Client = {
        id: crypto.randomUUID(),
        ...formData,
        gstin: trimmedGstin,
        createdAt: new Date().toISOString(),
      };

      await saveClient(client);
      onSuccess(client);
      onOpenChange(false);
      resetForm();
      toast.success("Client added successfully");
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter client name"
              />
            </div>

            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input
                value={formData.gstin}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                  setFormData({ ...formData, gstin: value });
                }}
                placeholder="Enter 15-digit GSTIN (optional)"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label>Billing Address *</Label>
              <Textarea
                required
                value={formData.billingAddress}
                onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                placeholder="Enter billing address"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Shipping Address (if different)</Label>
              <Textarea
                value={formData.shippingAddress}
                onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Gujarat"
                />
              </div>

              <div className="space-y-2">
                <Label>State Code {formData.gstin.trim() ? "*" : ""}</Label>
                <Input
                  required={!!formData.gstin.trim()}
                  value={formData.stateCode}
                  onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                  placeholder="24"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add Client
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
