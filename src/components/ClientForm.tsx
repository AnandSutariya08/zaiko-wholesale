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

    setSaving(true);
    try {
      const client: Client = {
        id: crypto.randomUUID(),
        ...formData,
        gstin: formData.gstin.trim().toUpperCase(),
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
      <DialogContent className="dialog-form-content sm:max-w-[600px]">
        <DialogHeader className="dialog-form-header">
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="dialog-form-body space-y-5">
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

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={formData.billingAddress}
                onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                placeholder="Enter address (optional)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>GSTIN (Optional)</Label>
              <Input
                value={formData.gstin}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                  setFormData({ ...formData, gstin: value });
                }}
                placeholder="Optional"
                maxLength={15}
              />
            </div>
          </div>

          <div className="dialog-form-footer flex gap-2 justify-end">
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




