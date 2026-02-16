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
import { ProductHistory } from "@/components/ProductHistory";
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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
  const [stockValues, setStockValues] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [avgPriceFilter, setAvgPriceFilter] = useState<string>("all");
  const [stockSortOrder, setStockSortOrder] = useState<
    "none" | "low-to-high" | "high-to-low"
  >("none");
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
    const stockValues: Record<string, number> = {};

    const now = new Date();

    for (const product of products) {
      // Get all data needed for calculations
      const [bills, transactions] = await Promise.all([
        getBills(),
        getProductTransactions(product.id),
      ]);

      if (transactions && transactions.length > 0) {
        // Sort transactions by date descending to handle "last X bills"
        let filteredTransactions = [...transactions].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        // Apply time/count filter
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

        // Calculate total purchase value and quantity
        const totalPurchaseValue = filteredTransactions.reduce(
          (sum, t) => sum + t.quantity * (t.purchasePrice || 0),
          0,
        );
        const totalPurchaseQuantity = filteredTransactions.reduce(
          (sum, t) => sum + t.quantity,
          0,
        );

        // Overall weighted average purchase price for filtered period
        const filteredAvgPurchasePrice =
          totalPurchaseQuantity > 0
            ? totalPurchaseValue / totalPurchaseQuantity
            : product.purchasePrice || 0;

        prices[product.id] = filteredAvgPurchasePrice;

        // Current Average Price (Avg Buy) - this part should probably stay as product latest price or global avg
        // but user specifically asked for "Avg Purchase Price" calculation filter
        currentPrices[product.id] = filteredAvgPurchasePrice;
        stockValues[product.id] = product.stock * filteredAvgPurchasePrice;
      } else {
        // No purchase history, use product's purchase price
        prices[product.id] = product.purchasePrice || 0;
        currentPrices[product.id] = product.purchasePrice || 0;
        stockValues[product.id] = product.stock * (product.purchasePrice || 0);
      }
    }

    setAveragePrices(prices);
    setCurrentAveragePrices(currentPrices);
    setStockValues(stockValues);
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

    // Check for duplicate HSN code (case-insensitive)
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
        price: sellingPriceNum || purchasePriceNum, // Legacy support
        purchasePrice: purchasePriceNum,
        sellingPrice: sellingPriceNum,
        stock: editingProduct?.stock || 0, // Keep existing stock or default to 0
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
    setAddInitialStock(false); // No initial stock for edit
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

    // Check for duplicate HSN code (case-insensitive)
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
        stock: 0, // Will be updated by addStockToProduct
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

  // Filter products based on search query
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
      if (stockSortOrder === "low-to-high") {
        return a.stock - b.stock;
      } else if (stockSortOrder === "high-to-low") {
        return b.stock - a.stock;
      }
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Reset to page 1 when search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Calculate overall statistics
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

    // Use current average prices (remaining stock valued at latest cost basis)
    const totalPurchaseValue = products.reduce((sum, p) => {
      const currentAvgPrice =
        currentAveragePrices[p.id] || p.purchasePrice || 0;
      return sum + p.stock * currentAvgPrice;
    }, 0);

    const totalSellingValue = products.reduce(
      (sum, p) => sum + p.stock * (p.sellingPrice || p.price || 0),
      0,
    );

    // Weighted averages based on current stock
    const averagePurchasePrice =
      totalStock > 0 ? totalPurchaseValue / totalStock : 0;

    const averageSellingPrice =
      totalStock > 0 ? totalSellingValue / totalStock : 0;

    // Average with Commission — now based on current average purchase price
    const averageWithCommission = calculateSellingPriceFromCommission(
      averagePurchasePrice,
      companyProfile?.commissionSettings,
    );

    // Total inventory value at current average cost
    const totalInventoryValue = totalPurchaseValue;

    // Total Value with Commission — using current average price per product
    const totalValueWithCommission = products.reduce((sum, p) => {
      const currentAvgPrice =
        currentAveragePrices[p.id] || p.purchasePrice || 0;
      const commissionPrice = calculateSellingPriceFromCommission(
        currentAvgPrice,
        companyProfile?.commissionSettings,
      );
      return sum + p.stock * commissionPrice;
    }, 0);

    // Profit potential based on current cost basis
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

    // SHEET 1: Summary
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

    // SHEET 2: All Products
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
      const currentAvg = currentAveragePrices[p.id] || p.purchasePrice || 0;
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
        String(stockValues[p.id] || 0),
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

    // SHEET 3: Top by Value
    const topValueData = [["Rank", "Product", "Stock", "Value"]];
    [...products]
      .sort((a, b) => (stockValues[b.id] || 0) - (stockValues[a.id] || 0))
      .slice(0, 20)
      .forEach((p, i) => {
        topValueData.push([
          String(i + 1),
          p.name,
          String(p.stock),
          String(stockValues[p.id] || 0),
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

    // Write file
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

  return (
    <div className="space-y-6 p-4">
      <div className="items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your product inventory</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto pt-8">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div> */}
            <Select
              value={stockSortOrder}
              onValueChange={(value: any) => setStockSortOrder(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default Sort</SelectItem>
                <SelectItem value="low-to-high">Stock: Low to High</SelectItem>
                <SelectItem value="high-to-low">Stock: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="lg" onClick={() => setIsOpen(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Create Product
          </Button>
          <Select value={avgPriceFilter} onValueChange={setAvgPriceFilter}>
            <SelectTrigger className="w-[180px]">
              <Calculator className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Avg Price Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time Average</SelectItem>
              <SelectItem value="last3">Last 3 Bills</SelectItem>
              <SelectItem value="last5">Last 5 Bills</SelectItem>
              <SelectItem value="1month">Last 1 Month</SelectItem>
              <SelectItem value="3month">Last 3 Months</SelectItem>
              <SelectItem value="6month">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem>
                <PDFDownloadLink
                  document={
                    <ProductsPDF
                      products={products}
                      stats={stats}
                      averagePrices={averagePrices}
                      currentAveragePrices={currentAveragePrices}
                      stockValues={stockValues}
                      companyProfile={companyProfile}
                    />
                  }
                  fileName={`Inventory_Report_${new Date().toISOString().split("T")[0]}.pdf`}
                  className="w-full"
                >
                  {({ loading }: { loading: boolean }) => (
                    <div className="flex items-center text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm w-full">
                      <FilePdf className="h-4 w-4 mr-2" />
                      {loading ? "Preparing PDF..." : "PDF"}
                    </div>
                  )}
                </PDFDownloadLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <Dialog
            open={isAddStockOpen}
            onOpenChange={(open) => {
              setIsAddStockOpen(open);
              if (!open) resetStockForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="lg" variant="outline">
                <PlusCircle className="h-5 w-5 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Stock</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddStock} className="space-y-4">
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

                <div className="flex gap-2 justify-end">
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
      </div>

      {/* Search Bar */}
      {products.length > 0 && (
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products by name or HSN code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full text-sm sm:text-base"
              />
            </div>
            {searchQuery && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Found {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "product" : "products"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics and Analytics Section */}
      {products.length > 0 && (
        <div className="space-y-4">
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
                        ? `${roundToTwoDecimals(
                            stats.averageMarginPercent,
                          ).toFixed(1)}% margin`
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

            // Use current average price for commission and profit calculations
            const currentAvgPurchasePrice = roundToTwoDecimals(
              currentAveragePrices[product.id] || purchasePrice,
            );

            const margin = roundToTwoDecimals(
              sellingPrice - currentAvgPurchasePrice,
            );
            const marginPercent =
              currentAvgPurchasePrice > 0
                ? roundToTwoDecimals((margin / currentAvgPurchasePrice) * 100)
                : 0;

            const stockValue = roundToTwoDecimals(
              product.stock * currentAvgPurchasePrice,
            );

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
                {product.imageUrl && (
                  <div className="w-full h-48 bg-muted">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {product.hsnCode}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          GST: {product.gstRate}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
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
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stock Information */}
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

                  {/* Profit Analysis */}
                  {currentAvgPurchasePrice > 0 && (
                    <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-3 rounded-lg space-y-2 border border-emerald-200/50">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-sm font-medium">
                          Current Avg Purchase Price
                        </span>
                        <span className="font-medium text-black-600">
                          {" "}
                          {formatCurrency(
                            currentAveragePrices[product.id] || purchasePrice,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Stock Value
                        </span>
                        <span className="font-medium">
                          {formatCurrency(stockValues[product.id])}
                        </span>
                      </div>
                      {companyProfile?.commissionSettings && (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              Selling Price
                            </span>
                            <span className="font-medium text-purple-600">
                              {formatCurrency(stockValueWithCommission)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setHistoryProduct(product);
                      setIsHistoryOpen(true);
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
      {filteredProducts.length > pageSize && (
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

      {historyProduct && (
        <ProductHistory
          product={historyProduct}
          open={isHistoryOpen}
          onOpenChange={(open) => {
            setIsHistoryOpen(open);
            if (!open) {
              setHistoryProduct(null);
            }
          }}
        />
      )}
    </div>
  );
}
