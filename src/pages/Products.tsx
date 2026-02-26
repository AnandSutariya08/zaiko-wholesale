import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  getProducts,
  saveProduct,
  deleteProduct,
  getCompanyProfile,
  addStockToProduct,
  getVendors,
  getProductTransactions,
  getInventoryTransactions,
  getInventoryUnits,
  getBills,
  getBillReturns,
} from "@/lib/storage";
import { CompanyProfile, InventoryUnit, Product, Vendor } from "@/types";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  History,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Percent,
  Calculator,
  PlusCircle,
  Search,
  Download,
  FileSpreadsheet,
  FileText as FilePdf,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ProductHistoryScreen } from "@/components/ProductHistoryScreen";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  calculateSellingPriceFromCommission,
  formatCurrency,
  roundToTwoDecimals,
} from "@/lib/billUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ProductsPDF } from "@/components/ProductsPDF";
import { ProductForm } from "@/components/ProductForm";

export default function Products() {
  type StockSortOrder =
    | "none"
    | "stock-low-to-high"
    | "stock-high-to-low"
    | "value-high-to-low"
    | "value-low-to-high"
    | "name-asc"
    | "name-desc";
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryUnits, setInventoryUnits] = useState<InventoryUnit[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null,
  );
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [addingStock, setAddingStock] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedStockVendorId, setSelectedStockVendorId] =
    useState<string>("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stockFormData, setStockFormData] = useState({
    quantity: "",
    purchasePrice: "",
  });
  const [averagePrices, setAveragePrices] = useState<Record<string, number>>(
    {},
  );
  const [currentAveragePrices, setCurrentAveragePrices] = useState<
    Record<string, number>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [avgPriceFilter, setAvgPriceFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    name: "",
    hsnCode: "",
    gstRate: "",
    unit: "kg",
    purchasePrice: "",
    stock: "",
    whereToBuy: "",
    weight: "",
  });
  const [addInitialStock, setAddInitialStock] = useState(false);
  const [initialStockData, setInitialStockData] = useState({
    quantity: "",
    purchasePrice: "",
  });
  const [stockSortOrder, setStockSortOrder] = useState<StockSortOrder>("none");

  // Helper: get effective purchase price for a product (avg if available, else product price)
  const getEffectivePrice = (product: Product) =>
    currentAveragePrices[product.id] || product.purchasePrice || 0;

  // Helper: compute stock value inline — no extra state needed
  const getStockValue = (product: Product) =>
    product.stock * getEffectivePrice(product);

  useEffect(() => {
    loadProducts();
    loadCompanyProfile();
    loadVendors();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      loadAveragePrices();
    }
  }, [products, avgPriceFilter]);

  const loadAveragePrices = async () => {
    const prices: Record<string, number> = {};
    const currentPrices: Record<string, number> = {};

    const now = new Date();

    // Fetch all transactions in parallel — avoids N sequential DB calls
    const allTransactions = await Promise.all(
      products.map((p) => getProductTransactions(p.id)),
    );

    products.forEach((product, index) => {
      const transactions = allTransactions[index] || [];
      const purchaseTransactions = transactions.filter(
        (t) => t.type === "purchase",
      );

      if (purchaseTransactions.length > 0) {
        let filteredTransactions = [...purchaseTransactions].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        if (avgPriceFilter === "last3") {
          filteredTransactions = filteredTransactions.slice(0, 3);
        } else if (avgPriceFilter === "last5") {
          filteredTransactions = filteredTransactions.slice(0, 5);
        } else if (avgPriceFilter === "1month") {
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(now.getMonth() - 1);
          filteredTransactions = filteredTransactions.filter(
            (t) => new Date(t.date) >= oneMonthAgo,
          );
        } else if (avgPriceFilter === "3month") {
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          filteredTransactions = filteredTransactions.filter(
            (t) => new Date(t.date) >= threeMonthsAgo,
          );
        } else if (avgPriceFilter === "6month") {
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          filteredTransactions = filteredTransactions.filter(
            (t) => new Date(t.date) >= sixMonthsAgo,
          );
        }

        const totalPurchaseValue = filteredTransactions.reduce(
          (sum, t) => sum + t.quantity * (t.purchasePrice || 0),
          0,
        );
        const totalPurchaseQuantity = filteredTransactions.reduce(
          (sum, t) => sum + t.quantity,
          0,
        );

        const filteredAvgPurchasePrice =
          totalPurchaseQuantity > 0
            ? totalPurchaseValue / totalPurchaseQuantity
            : product.purchasePrice || 0;

        prices[product.id] = filteredAvgPurchasePrice;
        currentPrices[product.id] = filteredAvgPurchasePrice;
      } else {
        prices[product.id] = product.purchasePrice || 0;
        currentPrices[product.id] = product.purchasePrice || 0;
      }
    });

    setAveragePrices(prices);
    setCurrentAveragePrices(currentPrices);
  };

  const loadCompanyProfile = async () => {
    const profile = await getCompanyProfile();
    setCompanyProfile(profile);
    if (profile?.defaultUnit) {
      setFormData((prev) => ({
        ...prev,
        unit: profile.defaultUnit || prev.unit,
      }));
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [productsData, unitsData] = await Promise.all([
        getProducts(),
        getInventoryUnits(),
      ]);
      setProducts(productsData);
      setInventoryUnits(unitsData);
      setPage(1);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await getVendors();
      setVendors(data);
    } catch (error) {
      console.error("Error loading vendors:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hsnCodeLower = formData.hsnCode.trim().toLowerCase();
    const duplicateProduct = products.find(
      (p) =>
        p.id !== editingProduct?.id &&
        p.hsnCode.trim().toLowerCase() === hsnCodeLower,
    );

    if (duplicateProduct) {
      toast.error(
        `Product with HSN Code "${formData.hsnCode}" already exists: ${duplicateProduct.name}. Please edit the existing product instead.`,
      );
      return;
    }

    setSaving(true);
    try {
      const gstRateNum = parseFloat(formData.gstRate) || 0;
      const purchasePriceNum = parseFloat(formData.purchasePrice) || 0;
      const weightNum = parseFloat(formData.weight) || 0;

      const product: Product = {
        id: editingProduct?.id || crypto.randomUUID(),
        name: formData.name,
        hsnCode: formData.hsnCode.trim(),
        gstRate: gstRateNum,
        unit: formData.unit,
        price: 0,
        purchasePrice: purchasePriceNum,
        sellingPrice: 0,
        stock: editingProduct?.stock || 0,
        whereToBuy: formData.whereToBuy,
        weight: weightNum,
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
      };

      await saveProduct(product);

      if (addInitialStock && !editingProduct) {
        const quantityNum = parseFloat(initialStockData.quantity) || 0;
        const initPurchasePriceNum =
          parseFloat(initialStockData.purchasePrice) || 0;
        if (quantityNum > 0 && initPurchasePriceNum > 0) {
          await addStockToProduct(
            product.id,
            quantityNum,
            initPurchasePriceNum,
          );
          toast.success("Product created and initial stock added");
        } else {
          toast.warning(
            "Invalid initial stock details; product created without stock",
          );
        }
      } else {
        toast.success(editingProduct ? "Product updated" : "Product added");
      }

      await loadProducts();
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setAddInitialStock(false);
    setFormData({
      name: product.name,
      hsnCode: product.hsnCode,
      gstRate: String(product.gstRate),
      unit: product.unit,
      purchasePrice: currentAveragePrices[product.id]
        ? Number(currentAveragePrices[product.id]).toFixed(2)
        : "",
      stock: product.stock ? String(product.stock) : "",
      whereToBuy: product.whereToBuy || "",
      weight: product.weight ? String(product.weight) : "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    await loadProducts();
    toast.success("Product deleted");
  };

  const resetForm = () => {
    setEditingProduct(null);
    setAddInitialStock(false);
    setInitialStockData({ quantity: "", purchasePrice: "" });
    setFormData({
      name: "",
      hsnCode: "",
      gstRate: "",
      unit: companyProfile?.defaultUnit || "kg",
      purchasePrice: "",
      stock: "",
      whereToBuy: "",
      weight: "",
    });
  };

  const resetStockForm = () => {
    setSelectedProductId("");
    setSelectedStockVendorId("");
    setStockFormData({
      quantity: "",
      purchasePrice: "",
    });
  };

  const handleStockProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const selectedProduct = products.find((p) => p.id === productId);
    setSelectedStockVendorId(selectedProduct?.vendorId || "");
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }
    const quantityNum = parseFloat(stockFormData.quantity) || 0;
    const purchasePriceNum = parseFloat(stockFormData.purchasePrice) || 0;
    const selectedProduct = products.find((p) => p.id === selectedProductId);

    if (quantityNum <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (purchasePriceNum <= 0) {
      toast.error("Purchase price must be greater than 0");
      return;
    }
    if (vendors.length > 0 && !selectedStockVendorId) {
      toast.error("Please select a vendor");
      return;
    }

    setAddingStock(true);
    try {
      if (selectedProduct && selectedStockVendorId) {
        const selectedVendor = vendors.find(
          (v) => v.id === selectedStockVendorId,
        );
        if (
          selectedProduct.vendorId !== selectedStockVendorId ||
          (selectedVendor && selectedProduct.whereToBuy !== selectedVendor.name)
        ) {
          await saveProduct({
            ...selectedProduct,
            vendorId: selectedStockVendorId,
            whereToBuy:
              selectedVendor?.name || selectedProduct.whereToBuy || "",
          });
        }
      }

      await addStockToProduct(selectedProductId, quantityNum, purchasePriceNum);
      await loadProducts();
      await loadAveragePrices();
      setIsAddStockOpen(false);
      resetStockForm();
      toast.success("Stock added successfully");
    } catch (error) {
      console.error("Error adding stock:", error);
      toast.error("Failed to add stock");
    } finally {
      setAddingStock(false);
    }
  };

  const handleCreateProductAndAddStock = async () => {
    if (!formData.name || !formData.hsnCode) {
      toast.error("Please fill in product name and HSN code");
      return;
    }
    const quantityNum = parseFloat(stockFormData.quantity) || 0;
    const purchasePriceNum = parseFloat(stockFormData.purchasePrice) || 0;

    if (quantityNum <= 0 || purchasePriceNum <= 0) {
      toast.error("Please enter quantity and purchase price");
      return;
    }

    const hsnCodeLower = formData.hsnCode.trim().toLowerCase();
    const duplicateProduct = products.find(
      (p) => p.hsnCode.trim().toLowerCase() === hsnCodeLower,
    );

    if (duplicateProduct) {
      toast.error(
        `Product with HSN Code "${formData.hsnCode}" already exists: ${duplicateProduct.name}. Please select it from the dropdown instead.`,
      );
      return;
    }

    setSaving(true);
    try {
      const weightNum = parseFloat(formData.weight) || 0;

      const product: Product = {
        id: crypto.randomUUID(),
        name: formData.name,
        hsnCode: formData.hsnCode.trim(),
        gstRate: parseFloat(formData.gstRate) || 0,
        unit: formData.unit,
        price: 0,
        purchasePrice: purchasePriceNum,
        sellingPrice: 0,
        stock: 0,
        whereToBuy: formData.whereToBuy,
        weight: weightNum,
        createdAt: new Date().toISOString(),
      };

      await saveProduct(product);
      await addStockToProduct(product.id, quantityNum, purchasePriceNum);
      await loadProducts();
      await loadAveragePrices();
      setIsOpen(false);
      setIsAddStockOpen(false);
      resetForm();
      resetStockForm();
      toast.success("Product created and stock added");
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  const inventorySummaryByProduct = useMemo(() => {
    const map: Record<
      string,
      {
        totalUnits: number;
        inStock: number;
        sold: number;
        deadstock: number;
        imeiSearchBlob: string;
      }
    > = {};
    for (const unit of inventoryUnits) {
      const key = unit.productId;
      if (!key) continue;
      if (!map[key]) {
        map[key] = {
          totalUnits: 0,
          inStock: 0,
          sold: 0,
          deadstock: 0,
          imeiSearchBlob: "",
        };
      }
      map[key].totalUnits += 1;
      if (unit.status === "in_stock") map[key].inStock += 1;
      if (unit.status === "sold") map[key].sold += 1;
      if (unit.status === "deadstock") map[key].deadstock += 1;
      if (unit.imeiNumber) {
        map[key].imeiSearchBlob += ` ${unit.imeiNumber}`;
      }
    }
    return map;
  }, [inventoryUnits]);

  const filteredProducts = products
    .filter((product) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const inventorySummary = inventorySummaryByProduct[product.id];
      return (
        product.name.toLowerCase().includes(query) ||
        product.hsnCode.toLowerCase().includes(query) ||
        (product.unit && product.unit.toLowerCase().includes(query)) ||
        (product.itemNo && product.itemNo.toLowerCase().includes(query)) ||
        (product.model && product.model.toLowerCase().includes(query)) ||
        (product.barcode && product.barcode.toLowerCase().includes(query)) ||
        (product.storage && product.storage.toLowerCase().includes(query)) ||
        (product.color && product.color.toLowerCase().includes(query)) ||
        ((product.trackingType || "standard").toLowerCase().includes(query)) ||
        (product.whereToBuy && product.whereToBuy.toLowerCase().includes(query)) ||
        (inventorySummary?.imeiSearchBlob || "").toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (stockSortOrder === "stock-low-to-high") return a.stock - b.stock;
      if (stockSortOrder === "stock-high-to-low") return b.stock - a.stock;
      if (stockSortOrder === "name-asc") return a.name.localeCompare(b.name);
      if (stockSortOrder === "name-desc") return b.name.localeCompare(a.name);
      if (stockSortOrder === "value-high-to-low")
        return getStockValue(b) - getStockValue(a);
      if (stockSortOrder === "value-low-to-high")
        return getStockValue(a) - getStockValue(b);
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const calculateStatistics = () => {
    if (products.length === 0) {
      return {
        totalProducts: 0,
        totalStock: 0,
        averagePurchasePrice: 0,
        averageWithCommission: 0,
        totalInventoryValue: 0,
        totalValueWithCommission: 0,
        totalProfitPotential: 0,
        averageMargin: 0,
        averageMarginPercent: 0,
      };
    }

    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

    const totalPurchaseValue = products.reduce(
      (sum, p) => sum + getStockValue(p),
      0,
    );

    const averagePurchasePrice =
      totalStock > 0 ? totalPurchaseValue / totalStock : 0;

    const averageWithCommission = calculateSellingPriceFromCommission(
      averagePurchasePrice,
      companyProfile?.commissionSettings,
    );

    const totalInventoryValue = totalPurchaseValue;

    const totalValueWithCommission = products.reduce((sum, p) => {
      const commissionPrice = calculateSellingPriceFromCommission(
        getEffectivePrice(p),
        companyProfile?.commissionSettings,
      );
      return sum + p.stock * commissionPrice;
    }, 0);

    const totalProfitPotential = totalValueWithCommission - totalInventoryValue;

    const averageMargin = averageWithCommission - averagePurchasePrice;
    const averageMarginPercent =
      averagePurchasePrice > 0
        ? (averageMargin / averagePurchasePrice) * 100
        : 0;

    return {
      totalProducts: products.length,
      totalStock,
      averagePurchasePrice,
      averageWithCommission,
      totalInventoryValue,
      totalValueWithCommission,
      totalProfitPotential,
      averageMargin,
      averageMarginPercent,
    };
  };

  const stats = calculateStatistics();

  const handleDownloadExcel = () => {
    const formatCurr = (amount: number) => `₹${amount.toFixed(2)}`;
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["INVENTORY SUMMARY"],
      ["Company:", companyProfile?.name || "Company Name"],
      ["Generated:", format(new Date(), "dd-MM-yyyy HH:mm:ss")],
      [],
      ["Total Products", stats.totalProducts],
      ["Total Stock", stats.totalStock.toFixed(2)],
      ["Inventory Value", formatCurr(stats.totalInventoryValue)],
      ["Profit Potential", formatCurr(stats.totalProfitPotential)],
      ["Average Margin %", `${stats.averageMarginPercent.toFixed(2)}%`],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const productsData = [
      [
        "Product Name",
        "HSN",
        "GST%",
        "Unit",
        "Stock",
        "Purchase Price",
        "Stock Value",
      ],
    ];
    products.forEach((p) => {
      const currentAvg = getEffectivePrice(p);
      productsData.push([
        p.name,
        p.hsnCode,
        String(p.gstRate),
        p.unit,
        String(p.stock),
        String(currentAvg),
        String(getStockValue(p)),
      ]);
    });
    const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
    productsSheet["!cols"] = [
      { wch: 30 },
      { wch: 12 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, productsSheet, "All Products");

    const topValueData = [["Rank", "Product", "Stock", "Value"]];
    [...products]
      .sort((a, b) => getStockValue(b) - getStockValue(a))
      .slice(0, 20)
      .forEach((p, i) => {
        topValueData.push([
          String(i + 1),
          p.name,
          String(p.stock),
          String(getStockValue(p)),
        ]);
      });
    const topValueSheet = XLSX.utils.aoa_to_sheet(topValueData);
    topValueSheet["!cols"] = [
      { wch: 8 },
      { wch: 30 },
      { wch: 12 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, topValueSheet, "Top by Value");

    XLSX.writeFile(
      workbook,
      `Inventory_${format(new Date(), "dd-MM-yyyy")}.xlsx`,
    );
    toast.success("Excel downloaded successfully");
  };

  const unitOptions: string[] = Array.from(
    new Set(
      (companyProfile?.unitOptions && companyProfile.unitOptions.length > 0
        ? companyProfile.unitOptions
        : ["kg", "pcs", "box"]
      ).concat(
        formData.unit &&
          !(companyProfile?.unitOptions || []).includes(formData.unit)
          ? [formData.unit]
          : [],
      ),
    ),
  );

  if (loading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner
          size="xl"
          text="Loading products..."
          fullScreen
          contentAreaOnly
        />
      </div>
    );
  }

  if (historyProduct) {
    return (
      <ProductHistoryScreen
        product={historyProduct}
        onBack={() => setHistoryProduct(null)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden">
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-slate-50/40 p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center justify-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-border">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left">
                <h1 className="truncate text-2xl font-semibold leading-tight sm:text-3xl">
                  Products
                </h1>
                <p className="text-sm text-muted-foreground">Manage your product inventory</p>
              </div>
            </div>

            <div className="hidden w-full items-center gap-2 rounded-xl border border-border/70 bg-muted/30 p-2 sm:flex lg:w-auto">
              <ProductForm
                open={isOpen}
                onOpenChange={(open) => {
                  setIsOpen(open);
                  if (!open) resetForm();
                }}
                onSuccess={() => {
                  loadProducts();
                }}
                product={editingProduct}
              />
              <Button
                size="sm"
                className="h-10 rounded-xl px-3 text-sm"
                onClick={() => setIsOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Product
              </Button>

              <Dialog
                open={isAddStockOpen}
                onOpenChange={(open) => {
                  setIsAddStockOpen(open);
                  if (!open) resetStockForm();
                }}
              >
                <DialogTrigger asChild>
                  {/* <Button size="sm" variant="outline" className="page-header-btn">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Stock
                  </Button> */}
                </DialogTrigger>
                <DialogContent className="dialog-form-content sm:max-w-[500px]">
                  <DialogHeader className="dialog-form-header">
                    <DialogTitle>Add Stock</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={handleAddStock}
                    className="dialog-form-body space-y-4"
                  >
                    <div className="space-y-2">
                      <Label>Select Product *</Label>
                      <Select
                        value={selectedProductId}
                        onValueChange={handleStockProductChange}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.hsnCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedProductId && (
                        <p className="text-xs text-muted-foreground">
                          Current stock:{" "}
                          {products.find((p) => p.id === selectedProductId)
                            ?.stock || 0}{" "}
                          {products.find((p) => p.id === selectedProductId)
                            ?.unit || ""}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Vendor *</Label>
                      <Select
                        value={selectedStockVendorId}
                        onValueChange={setSelectedStockVendorId}
                        disabled={!selectedProductId}
                      >
                        <SelectTrigger>
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          required
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={stockFormData.quantity}
                          onChange={(e) =>
                            setStockFormData({
                              ...stockFormData,
                              quantity: e.target.value,
                            })
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Purchase Price *</Label>
                        <Input
                          required
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={stockFormData.purchasePrice}
                          onChange={(e) =>
                            setStockFormData({
                              ...stockFormData,
                              purchasePrice: e.target.value,
                            })
                          }
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Product not found?
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setIsAddStockOpen(false);
                          setIsOpen(true);
                        }}
                      >
                        Create New Product
                      </Button>
                    </div>

                    <div className="dialog-form-footer flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddStockOpen(false);
                          resetStockForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={addingStock || !selectedProductId}
                      >
                        {addingStock ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Stock"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <PDFDownloadLink
                      document={
                        <ProductsPDF
                          products={products}
                          stats={stats}
                          averagePrices={averagePrices}
                          currentAveragePrices={currentAveragePrices}
                          stockValues={Object.fromEntries(
                            products.map((p) => [p.id, getStockValue(p)]),
                          )}
                          companyProfile={companyProfile}
                        />
                      }
                      fileName={`Inventory_Report_${new Date().toISOString().split("T")[0]}.pdf`}
                      className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer"
                    >
                      {({ loading }: { loading: boolean }) => (
                        <>
                          <FilePdf className="h-4 w-4 mr-2" />
                          {loading ? "Preparing..." : "PDF"}
                        </>
                      )}
                    </PDFDownloadLink>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-background/70 p-2 sm:p-4">
          <div className="h-full overflow-y-auto space-y-5 pr-1 sm:pr-2">
            <div className="flex flex-col gap-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search by name, model, IMEI, item no, color..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={stockSortOrder}
                  onValueChange={(value) =>
                    setStockSortOrder(value as StockSortOrder)
                  }
                >
                  <SelectTrigger className="h-9 flex-1 min-w-[130px] text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default</SelectItem>
                    <SelectItem value="name-asc">Name: A → Z</SelectItem>
                    <SelectItem value="name-desc">Name: Z → A</SelectItem>
                    <SelectItem value="stock-low-to-high">
                      Stock: Low → High
                    </SelectItem>
                    <SelectItem value="stock-high-to-low">
                      Stock: High → Low
                    </SelectItem>
                    <SelectItem value="value-high-to-low">
                      Value: High → Low
                    </SelectItem>
                    <SelectItem value="value-low-to-high">
                      Value: Low → High
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={avgPriceFilter}
                  onValueChange={setAvgPriceFilter}
                >
                  <SelectTrigger className="h-9 flex-1 min-w-[130px] text-sm">
                    <SelectValue placeholder="Avg Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time Avg</SelectItem>
                    <SelectItem value="last3">Last 3 Bills</SelectItem>
                    <SelectItem value="last5">Last 5 Bills</SelectItem>
                    <SelectItem value="1month">Last 1 Month</SelectItem>
                    <SelectItem value="3month">Last 3 Months</SelectItem>
                    <SelectItem value="6month">Last 6 Months</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex sm:hidden items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-3">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleDownloadExcel}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <PDFDownloadLink
                          document={
                            <ProductsPDF
                              products={products}
                              stats={stats}
                              averagePrices={averagePrices}
                              currentAveragePrices={currentAveragePrices}
                              stockValues={Object.fromEntries(
                                products.map((p) => [p.id, getStockValue(p)]),
                              )}
                              companyProfile={companyProfile}
                            />
                          }
                          fileName={`Inventory_Report_${new Date().toISOString().split("T")[0]}.pdf`}
                          className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer"
                        >
                          {({ loading }: { loading: boolean }) => (
                            <>
                              <FilePdf className="h-4 w-4 mr-2" />
                              {loading ? "Preparing..." : "PDF"}
                            </>
                          )}
                        </PDFDownloadLink>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex sm:hidden items-center gap-2">
                <ProductForm
                  open={isOpen}
                  onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open) resetForm();
                  }}
                  onSuccess={() => {
                    loadProducts();
                  }}
                  product={editingProduct}
                />
                <Button
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => setIsOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create
                </Button>

                <Dialog
                  open={isAddStockOpen}
                  onOpenChange={(open) => {
                    setIsAddStockOpen(open);
                    if (!open) resetStockForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="flex-1 h-9">
                      <PlusCircle className="h-4 w-4 mr-1.5" />
                      Add Stock
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dialog-form-content sm:max-w-[500px]">
                    <DialogHeader className="dialog-form-header">
                      <DialogTitle>Add Stock</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={handleAddStock}
                      className="dialog-form-body space-y-4"
                    >
                      <div className="space-y-2">
                        <Label>Select Product *</Label>
                        <Select
                          value={selectedProductId}
                          onValueChange={handleStockProductChange}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.hsnCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedProductId && (
                          <p className="text-xs text-muted-foreground">
                            Current stock:{" "}
                            {products.find((p) => p.id === selectedProductId)
                              ?.stock || 0}{" "}
                            {products.find((p) => p.id === selectedProductId)
                              ?.unit || ""}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Vendor *</Label>
                        <Select
                          value={selectedStockVendorId}
                          onValueChange={setSelectedStockVendorId}
                          disabled={!selectedProductId}
                        >
                          <SelectTrigger>
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
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Quantity *</Label>
                          <Input
                            required
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={stockFormData.quantity}
                            onChange={(e) =>
                              setStockFormData({
                                ...stockFormData,
                                quantity: e.target.value,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Purchase Price *</Label>
                          <Input
                            required
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={stockFormData.purchasePrice}
                            onChange={(e) =>
                              setStockFormData({
                                ...stockFormData,
                                purchasePrice: e.target.value,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          Product not found?
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setIsAddStockOpen(false);
                            setIsOpen(true);
                          }}
                        >
                          Create New Product
                        </Button>
                      </div>

                      <div className="dialog-form-footer flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddStockOpen(false);
                            resetStockForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={addingStock || !selectedProductId}
                        >
                          {addingStock ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add Stock"
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {searchQuery && (
                <p className="text-xs text-muted-foreground">
                  {filteredProducts.length}{" "}
                  {filteredProducts.length === 1 ? "product" : "products"} found
                </p>
              )}
            </div>

            {products.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-blue-200 bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:border-blue-800">
                  <CardContent className="flex h-full min-h-[124px] flex-col justify-between p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Products
                      </p>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold leading-none">{stats.totalProducts}</p>
                      <p className="text-xs text-muted-foreground">
                        {roundToTwoDecimals(stats.totalStock).toFixed(2)} total stock
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:border-emerald-800">
                  <CardContent className="flex h-full min-h-[124px] flex-col justify-between p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Inventory Value
                      </p>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold leading-none text-emerald-600">
                        {formatCurrency(stats.totalInventoryValue)}
                      </p>
                      <p className="text-xs text-muted-foreground">At purchase price</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:border-purple-800">
                  <CardContent className="flex h-full min-h-[124px] flex-col justify-between p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        With Commission
                      </p>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                        <Calculator className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold leading-none text-purple-600">
                        {formatCurrency(stats.totalValueWithCommission)}
                      </p>
                      <p className="text-xs text-muted-foreground">Potential selling value</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-gradient-to-br from-orange-500/10 to-orange-600/5 dark:border-orange-800">
                  <CardContent className="flex h-full min-h-[124px] flex-col justify-between p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Profit Potential
                      </p>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                        <TrendingUp className="h-5 w-5 text-orange-600" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold leading-none text-orange-600">
                        {formatCurrency(stats.totalProfitPotential)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stats.averageMarginPercent > 0
                          ? `${roundToTwoDecimals(stats.averageMarginPercent).toFixed(1)}% margin`
                          : "No margin"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {products.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    No products added yet
                  </p>
                  <Button onClick={() => setIsOpen(true)}>
                    Add your first product
                  </Button>
                </CardContent>
              </Card>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    No products found matching your search
                  </p>
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedProducts.map((product) => {
                  const purchasePrice = roundToTwoDecimals(
                    product.purchasePrice || 0,
                  );
                  const currentAvgPurchasePrice = roundToTwoDecimals(
                    getEffectivePrice(product),
                  );
                  const productVendorName =
                    vendors.find((v) => v.id === product.vendorId)?.name ||
                    product.whereToBuy ||
                    "N/A";
                  const trackingType = product.trackingType || "standard";
                  const unitSummary = inventorySummaryByProduct[product.id] || {
                    totalUnits: 0,
                    inStock: 0,
                    sold: 0,
                    deadstock: 0,
                    imeiSearchBlob: "",
                  };
                  const imeiInStock = unitSummary.inStock;
                  const imeiSold = unitSummary.sold;
                  const imeiDeadstock = unitSummary.deadstock;
                  const effectiveStock =
                    trackingType === "serialized" ? imeiInStock : product.stock;
                  const stockStateLabel =
                    effectiveStock <= 0
                      ? "Out of stock"
                      : effectiveStock < 5
                        ? "Low stock"
                        : "Healthy stock";
                  const stockStateClass =
                    effectiveStock <= 0
                      ? "bg-red-100 text-red-700"
                      : effectiveStock < 5
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700";
                  // Computed inline — no state lookup needed
                  const stockValue = roundToTwoDecimals(getStockValue(product));
                  const stockValueWithCommission = roundToTwoDecimals(
                    product.stock *
                      calculateSellingPriceFromCommission(
                        currentAvgPurchasePrice,
                        companyProfile?.commissionSettings,
                      ),
                  );
                  const profitPotential = roundToTwoDecimals(
                    stockValueWithCommission - stockValue,
                  );

                  return (
                    <Card
                      key={product.id}
                      className="group relative overflow-hidden border border-border/70 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl"
                    >
                      <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
                      <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />

                      <div className="relative flex gap-3 p-4 pb-3">
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/50">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-bold leading-tight line-clamp-2">
                              {product.name}
                            </h3>
                            <div className="flex flex-shrink-0 gap-1 rounded-xl border border-border/60 bg-background/85 p-1 backdrop-blur">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                onClick={() => handleEdit(product)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Product
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete{" "}
                                      {product.name}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(product.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {product.itemNo && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">
                                {product.itemNo}
                              </span>
                            )}
                            <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                              {product.hsnCode}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              GST: {product.gstRate}%
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                trackingType === "serialized"
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {trackingType === "serialized"
                                ? "IMEI Tracked"
                                : "Standard"}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-semibold ${stockStateClass}`}
                            >
                              {stockStateLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <CardContent className="relative space-y-3 pt-0">
                        <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Product Master
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-md bg-background/70 p-2">
                              <p className="text-muted-foreground">Model</p>
                              <p className="font-medium">{product.model || "N/A"}</p>
                            </div>
                            <div className="rounded-md bg-background/70 p-2">
                              <p className="text-muted-foreground">Unit</p>
                              <p className="font-medium">{product.unit || "pcs"}</p>
                            </div>
                            <div className="rounded-md bg-background/70 p-2">
                              <p className="text-muted-foreground">Vendor</p>
                              <p className="truncate font-medium">{productVendorName}</p>
                            </div>
                            <div className="rounded-md bg-background/70 p-2">
                              <p className="text-muted-foreground">Avg Purchase</p>
                              <p className="font-medium">
                                {formatCurrency(
                                  averagePrices[product.id] || purchasePrice,
                                )}
                              </p>
                            </div>
                          </div>

                          <p className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Inventory Units
                          </p>
                          {trackingType === "serialized" ? (
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
                                <p className="text-muted-foreground">In Stock</p>
                                <p className="text-base font-bold text-emerald-700">
                                  {imeiInStock}
                                </p>
                              </div>
                              <div className="rounded-md border border-blue-200 bg-blue-50 p-2">
                                <p className="text-muted-foreground">Sold</p>
                                <p className="text-base font-bold text-blue-700">
                                  {imeiSold}
                                </p>
                              </div>
                              <div className="rounded-md border border-rose-200 bg-rose-50 p-2">
                                <p className="text-muted-foreground">Deadstock</p>
                                <p className="text-base font-bold text-rose-700">
                                  {imeiDeadstock}
                                </p>
                              </div>
                              <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                                <p className="text-muted-foreground">Total</p>
                                <p className="text-base font-bold text-slate-700">
                                  {unitSummary.totalUnits}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
                              <p className="text-muted-foreground">Current Stock</p>
                              <p className="text-base font-bold text-slate-700">
                                {product.stock % 1 === 0
                                  ? product.stock
                                  : roundToTwoDecimals(product.stock).toFixed(2)}{" "}
                                {product.unit}
                              </p>
                            </div>
                          )}
                        </div>

                        {currentAvgPurchasePrice > 0 && (
                          <div className="space-y-2 rounded-xl border border-emerald-200/50 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                Current Avg Price
                              </span>
                              <span className="font-medium">
                                {formatCurrency(currentAvgPurchasePrice)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Stock Value
                              </span>
                              <span className="font-medium">
                                {formatCurrency(stockValue)}
                              </span>
                            </div>
                            {companyProfile?.commissionSettings && (
                              <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Profit Potential
                                </span>
                                <span className="font-medium text-emerald-600">
                                  {formatCurrency(profitPotential)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Margin %</span>
                                <span className="font-medium">
                                  {roundToTwoDecimals(stats.averageMarginPercent).toFixed(2)}%
                                </span>
                              </div>
                              </>
                            )}
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-border/70 bg-background/90 hover:bg-primary/5"
                          onClick={() => {
                            setHistoryProduct(product);
                          }}
                        >
                          <History className="h-4 w-4 mr-2" />
                          View Detailed History
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
