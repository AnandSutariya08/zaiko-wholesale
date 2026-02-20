import { useEffect, useState } from "react";
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
  getProductTransactions,
  getInventoryTransactions,
  getBills,
  getBillReturns,
} from "@/lib/storage";
import { Product } from "@/types";
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
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [addingStock, setAddingStock] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
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
    price: "",
    purchasePrice: "",
    sellingPrice: "",
    stock: "",
    whereToBuy: "",
    weight: "",
  });
  const [addInitialStock, setAddInitialStock] = useState(false);
  const [initialStockData, setInitialStockData] = useState({
    quantity: "",
    purchasePrice: "",
  });
  const [stockSortOrder, setStockSortOrder] = useState<
    | "none"
    | "stock-low-to-high"
    | "stock-high-to-low"
    | "value-high-to-low"
    | "value-low-to-high"
    | "name-asc"
    | "name-desc"
  >("none");

  // Helper: get effective purchase price for a product (avg if available, else product price)
  const getEffectivePrice = (product: Product) =>
    currentAveragePrices[product.id] || product.purchasePrice || 0;

  // Helper: compute stock value inline — no extra state needed
  const getStockValue = (product: Product) =>
    product.stock * getEffectivePrice(product);

  useEffect(() => {
    loadProducts();
    loadCompanyProfile();
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

      if (transactions.length > 0) {
        let filteredTransactions = [...transactions].sort(
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
      const productsData = await getProducts();
      setProducts(productsData);
      setPage(1);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
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
      const sellingPriceNum =
        parseFloat(formData.sellingPrice) || parseFloat(formData.price) || 0;
      const weightNum = parseFloat(formData.weight) || 0;

      const product: Product = {
        id: editingProduct?.id || crypto.randomUUID(),
        name: formData.name,
        hsnCode: formData.hsnCode.trim(),
        gstRate: gstRateNum,
        unit: formData.unit,
        price: sellingPriceNum || purchasePriceNum,
        purchasePrice: purchasePriceNum,
        sellingPrice: sellingPriceNum,
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
      price: product.price ? String(product.price) : "",
      purchasePrice: currentAveragePrices[product.id]
        ? Number(currentAveragePrices[product.id]).toFixed(2)
        : "",
      sellingPrice: product.sellingPrice
        ? String(product.sellingPrice)
        : product.price
          ? String(product.price)
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
      price: "",
      purchasePrice: "",
      sellingPrice: "",
      stock: "",
      whereToBuy: "",
      weight: "",
    });
  };

  const resetStockForm = () => {
    setSelectedProductId("");
    setStockFormData({
      quantity: "",
      purchasePrice: "",
    });
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }
    const quantityNum = parseFloat(stockFormData.quantity) || 0;
    const purchasePriceNum = parseFloat(stockFormData.purchasePrice) || 0;

    if (quantityNum <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (purchasePriceNum <= 0) {
      toast.error("Purchase price must be greater than 0");
      return;
    }

    setAddingStock(true);
    try {
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
        price:
          parseFloat(formData.sellingPrice) ||
          parseFloat(formData.price) ||
          purchasePriceNum,
        purchasePrice: purchasePriceNum,
        sellingPrice:
          parseFloat(formData.sellingPrice) ||
          parseFloat(formData.price) ||
          purchasePriceNum,
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

  const filteredProducts = products
    .filter((product) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        product.name.toLowerCase().includes(query) ||
        product.hsnCode.toLowerCase().includes(query) ||
        (product.unit && product.unit.toLowerCase().includes(query))
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
        averageSellingPrice: 0,
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

    const totalSellingValue = products.reduce(
      (sum, p) => sum + p.stock * (p.sellingPrice || p.price || 0),
      0,
    );

    const averagePurchasePrice =
      totalStock > 0 ? totalPurchaseValue / totalStock : 0;

    const averageSellingPrice =
      totalStock > 0 ? totalSellingValue / totalStock : 0;

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

    const averageMargin = averageSellingPrice - averagePurchasePrice;
    const averageMarginPercent =
      averagePurchasePrice > 0
        ? (averageMargin / averagePurchasePrice) * 100
        : 0;

    return {
      totalProducts: products.length,
      totalStock,
      averagePurchasePrice,
      averageSellingPrice,
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
        "Selling Price",
        "Stock Value",
        "Margin %",
      ],
    ];
    products.forEach((p) => {
      const currentAvg = getEffectivePrice(p);
      const selling = p.sellingPrice || p.price || 0;
      const margin =
        currentAvg > 0 ? ((selling - currentAvg) / currentAvg) * 100 : 0;
      productsData.push([
        p.name,
        p.hsnCode,
        String(p.gstRate),
        p.unit,
        String(p.stock),
        String(currentAvg),
        String(selling),
        String(getStockValue(p)),
        margin.toFixed(2),
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
      { wch: 15 },
      { wch: 10 },
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
    <div className="-mx-3 h-[calc(100dvh-8.5rem)] overflow-hidden px-2 sm:-mx-4 sm:h-[calc(100dvh-9.5rem)] sm:px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="relative flex h-full min-h-0 flex-col rounded-[28px] border border-border/70 bg-background p-3 shadow-sm sm:p-5 lg:p-6">
        <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-background/95 p-3 backdrop-blur sm:p-4">
          <div className="page-header-controls">
            <div className="page-header-title">
              <div className="page-header-icon">
                <Package className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div>
                <h1 className="page-title">Products</h1>
                <p className="page-subtitle">Manage your product inventory</p>
              </div>
            </div>

            <div className="hidden sm:flex page-header-actions">
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
                className="page-header-btn"
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
                  <Button size="sm" variant="outline" className="page-header-btn">
                    <PlusCircle className="h-4 w-4 mr-2" />
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
                        onValueChange={setSelectedProductId}
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
                          {products.find((p) => p.id === selectedProductId)?.unit ||
                            ""}
                        </p>
                      )}
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
        <div className="mt-4 flex-1 min-h-0 rounded-2xl border border-border/70 bg-background/60 p-2 sm:p-3">
          <div className="h-full overflow-y-auto space-y-6 pr-1 sm:pr-2">

      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by name or HSN code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={stockSortOrder}
            onValueChange={(value: any) => setStockSortOrder(value)}
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

          <Select value={avgPriceFilter} onValueChange={setAvgPriceFilter}>
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
                    onValueChange={setSelectedProductId}
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
                      {products.find((p) => p.id === selectedProductId)?.unit ||
                        ""}
                    </p>
                  )}
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
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Products
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {stats.totalProducts}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {roundToTwoDecimals(stats.totalStock).toFixed(2)} total
                    stock
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200 dark:border-emerald-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Inventory Value
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {formatCurrency(stats.totalInventoryValue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    At purchase price
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    With Commission
                  </p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {formatCurrency(stats.totalValueWithCommission)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Potential selling value
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Calculator className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Profit Potential
                  </p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {formatCurrency(stats.totalProfitPotential)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.averageMarginPercent > 0
                      ? `${roundToTwoDecimals(stats.averageMarginPercent).toFixed(1)}% margin`
                      : "No margin"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {products.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">No products added yet</p>
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
            const sellingPrice = roundToTwoDecimals(
              product.sellingPrice || product.price || 0,
            );
            const purchasePrice = roundToTwoDecimals(
              product.purchasePrice || 0,
            );
            const currentAvgPurchasePrice = roundToTwoDecimals(
              getEffectivePrice(product),
            );
            const margin = roundToTwoDecimals(
              sellingPrice - currentAvgPurchasePrice,
            );
            const marginPercent =
              currentAvgPurchasePrice > 0
                ? roundToTwoDecimals((margin / currentAvgPurchasePrice) * 100)
                : 0;
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
                className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary overflow-hidden"
              >
                <div className="flex gap-3 p-4 pb-2">
                  <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted border">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-base font-bold leading-tight line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
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
                                Are you sure you want to delete {product.name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                        {product.hsnCode}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        GST: {product.gstRate}%
                      </span>
                    </div>
                  </div>
                </div>

                <CardContent className="pt-2 space-y-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Stock
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          product.stock < 10
                            ? "text-orange-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {product.stock % 1 === 0
                          ? product.stock
                          : roundToTwoDecimals(product.stock).toFixed(2)}{" "}
                        {product.unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Avg Purchase Price</span>
                      <span className="font-medium">
                        {formatCurrency(
                          averagePrices[product.id] || purchasePrice,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                      <span>Weight</span>
                      <span className="font-medium">
                        {product.weight != null ? product.weight : "N/A"}{" "}
                        {product.weightUnit || ""}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                      <span>Bought from where</span>
                      <span className="font-medium">
                        {product.whereToBuy || "N/A"}
                      </span>
                    </div>
                  </div>

                  {currentAvgPurchasePrice > 0 && (
                    <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-3 rounded-lg space-y-2 border border-emerald-200/50">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">Current Avg Price</span>
                        <span className="font-medium">
                          {formatCurrency(currentAvgPurchasePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Stock Value
                        </span>
                        <span className="font-medium">
                          {formatCurrency(stockValue)}
                        </span>
                      </div>
                      {companyProfile?.commissionSettings && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            Selling Price
                          </span>
                          <span className="font-medium text-purple-600">
                            {formatCurrency(sellingPrice)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
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
    </div>
  );
}
