import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Loader2, Upload, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { Product, Vendor } from "@/types";
import {
  saveProduct,
  getCompanyProfile,
  addStockToProduct,
  uploadProductImage,
  getVendors,
} from "@/lib/storage";
import { calculateSellingPriceFromCommission } from "@/lib/billUtils";

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (product: Product) => void;
  product?: Product | null;
}

export function ProductForm({
  open,
  onOpenChange,
  onSuccess,
  product: editingProduct,
}: ProductFormProps) {
  const [saving, setSaving] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [addInitialStock, setAddInitialStock] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    hsnCode: "",
    barcode: "",
    gstRate: "",
    unit: "kg",
    purchasePrice: "",
    sellingPrice: "",
    whereToBuy: "",
    vendorId: "",
    weight: "",
    weightUnit: "g",
  });

  const [initialStock, setInitialStock] = useState({
    quantity: "",
    purchasePrice: "",
  });

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        hsnCode: editingProduct.hsnCode,
        barcode: editingProduct.barcode || "",
        gstRate: String(editingProduct.gstRate),
        unit: editingProduct.unit,
        purchasePrice: String(editingProduct.purchasePrice),
        sellingPrice: String(editingProduct.sellingPrice),
        whereToBuy: editingProduct.whereToBuy || "",
        vendorId: editingProduct.vendorId || "",
        weight: editingProduct.weight ? String(editingProduct.weight) : "",
        weightUnit: editingProduct.weightUnit || "g",
      });
      setImagePreview(editingProduct.imageUrl || null);
    } else {
      resetForm();
    }
  }, [editingProduct]);

  useEffect(() => {
    const loadData = async () => {
      const [profile, vendorsData] = await Promise.all([
        getCompanyProfile(),
        getVendors(),
      ]);
      setCompanyProfile(profile);
      setVendors(vendorsData);
      if (profile?.defaultUnit && !editingProduct) {
        setFormData((prev) => ({
          ...prev,
          unit: profile.defaultUnit,
        }));
      }
    };
    loadData();
  }, [editingProduct]);

  const resetForm = () => {
    setAddInitialStock(false);
    setImageFile(null);
    setImagePreview(null);
    setFormData({
      name: "",
      hsnCode: "",
      barcode: "",
      gstRate: "",
      unit: companyProfile?.defaultUnit || "kg",
      purchasePrice: "",
      sellingPrice: "",
      whereToBuy: "",
      vendorId: "",
      weight: "",
      weightUnit: "g",
    });
    setInitialStock({ quantity: "", purchasePrice: "" });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const purchasePriceNum = parseFloat(formData.purchasePrice) || 0;
      const sellingPriceNum = parseFloat(formData.sellingPrice) || 0;
      const productId = editingProduct?.id || crypto.randomUUID();

      let imageUrl = editingProduct?.imageUrl || "";
      if (imageFile) {
        imageUrl = await uploadProductImage(productId, imageFile);
      }

      const product: Product = {
        id: productId,
        name: formData.name,
        hsnCode: formData.hsnCode.trim(),
        barcode: formData.barcode.trim(),
        gstRate: parseFloat(formData.gstRate) || 0,
        unit: formData.unit,
        price: sellingPriceNum,
        purchasePrice: purchasePriceNum,
        sellingPrice: sellingPriceNum,
        stock: editingProduct?.stock || 0,
        whereToBuy: formData.whereToBuy,
        vendorId: formData.vendorId,
        weight: parseFloat(formData.weight) || 0,
        weightUnit: formData.weightUnit,
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
        imageUrl: imageUrl,
      };

      await saveProduct(product);

      if (addInitialStock && !editingProduct) {
        const qty = parseFloat(initialStock.quantity) || 0;
        const price = parseFloat(initialStock.purchasePrice) || 0;

        if (qty > 0 && price > 0) {
          await addStockToProduct(product.id, qty, price);
        }
      }

      toast.success(
        editingProduct
          ? "Product updated successfully"
          : "Product created successfully",
      );
      onSuccess(product);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const unitOptions =
    companyProfile?.unitOptions?.length > 0
      ? companyProfile.unitOptions
      : ["kg", "pcs", "box"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Edit Product" : "Create Product"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {imagePreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product Image</Label>
            <p className="text-xs text-muted-foreground">
              Click the box above to upload or change image
            </p>
          </div>

          <div className="space-y-2">
            <Label>Product Name *</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>HSN Code *</Label>
              <Input
                required
                value={formData.hsnCode}
                onChange={(e) =>
                  setFormData({ ...formData, hsnCode: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Barcode (Scan or Type)</Label>
              <Input
                value={formData.barcode}
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                placeholder="Scan barcode"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>GST Rate (%) *</Label>
              <Input
                required
                type="number"
                step="0.01"
                value={formData.gstRate}
                onChange={(e) =>
                  setFormData({ ...formData, gstRate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) =>
                  setFormData({ ...formData, unit: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((unit: string) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Purchase Price *</Label>
              <Input
                required
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => {
                  const price = parseFloat(e.target.value) || 0;
                  const selling = calculateSellingPriceFromCommission(
                    price,
                    companyProfile?.commissionSettings,
                  );
                  setFormData({
                    ...formData,
                    purchasePrice: e.target.value,
                    sellingPrice: price ? String(selling) : "",
                  });
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Selling Price (with Commission) *</Label>
            <Input
              required
              type="number"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) =>
                setFormData({ ...formData, sellingPrice: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weight</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  className="flex-1"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({ ...formData, weight: e.target.value })
                  }
                />
                <Select
                  value={formData.weightUnit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, weightUnit: value })
                  }
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="mg">mg</SelectItem>
                    <SelectItem value="ct">ct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vendor *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.vendorId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vendorId: value })
                  }
                  required
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.vendorId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const v = vendors.find((v) => v.id === formData.vendorId);
                      if (v) setViewingVendor(v);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bought From (Optional)</Label>
              <Input
                value={formData.whereToBuy}
                onChange={(e) =>
                  setFormData({ ...formData, whereToBuy: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={addInitialStock}
                onCheckedChange={(v) => setAddInitialStock(!!v)}
              />
              <Label>Add initial stock?</Label>
            </div>

            {addInitialStock && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={initialStock.quantity}
                  onChange={(e) =>
                    setInitialStock({
                      ...initialStock,
                      quantity: e.target.value,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Purchase Price"
                  value={initialStock.purchasePrice}
                  onChange={(e) =>
                    setInitialStock({
                      ...initialStock,
                      purchasePrice: e.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingProduct ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </form>

        {viewingVendor && (
          <Dialog
            open={!!viewingVendor}
            onOpenChange={(open) => !open && setViewingVendor(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vendor Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium text-lg">{viewingVendor.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">GSTIN</Label>
                  <p>{viewingVendor.gstin || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <p>{viewingVendor.address || "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p>{viewingVendor.phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{viewingVendor.email || "N/A"}</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
