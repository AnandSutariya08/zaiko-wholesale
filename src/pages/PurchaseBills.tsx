import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPurchaseBills,
  getProducts,
  savePurchaseBill,
  deletePurchaseBill,
  updatePurchaseBillPayment,
  deletePurchaseBillPayment,
  savePurchaseReturn,
  deletePurchaseReturn,
  addPurchaseItemsToInventory,
  isPurchaseBillDuplicate,
  updatePurchaseBillOverdueStatus,
  isPurchaseBillInventoryAdded,
  updatePurchaseBill,
  InventoryItemInput,
  getCompanyProfile,
  getVendors,
} from "@/lib/storage";
import { extractBillFromImage } from "@/lib/aiExtractor";
import {
  PurchaseBill,
  PurchaseBillItem,
  AIExtractionError,
  ProductConflict,
  Vendor,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "@/components/PaymentDialog";
import {
  formatCurrency,
  formatDate,
  calculateSellingPriceFromCommission,
} from "@/lib/billUtils";
import { PurchaseReturnForm } from "@/components/PurchaseReturnForm";
import {
  RotateCcw,
  Upload,
  Camera,
  Search,
  Eye,
  Trash2,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  ImageIcon,
  PackagePlus,
  AlertTriangle,
  Edit2,
  Save,
  X,
  AlertCircle,
  Image,
  IndianRupee,
  Calendar,
  BookOpen,
  Download,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PurchaseBillPDF } from "@/components/PurchaseBillPDF";
import { Textarea } from "@/components/ui/textarea";
import { ConflictResolutionDialog } from "@/components/ConflictResolutionDialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { compressFile, getBase64SizeKB } from "@/lib/imageCompression";
import { ProductAutocomplete } from "@/components/ProductAutocomplete";

function PurchaseBills() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [filteredBills, setFilteredBills] = useState<PurchaseBill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gstFilter, setGstFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedBill, setSelectedBill] = useState<PurchaseBill | null>(null);
  const [viewImageBill, setViewImageBill] = useState<PurchaseBill | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBillForHistory, setSelectedBillForHistory] =
    useState<PurchaseBill | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedBillForReturn, setSelectedBillForReturn] =
    useState<PurchaseBill | null>(null);

  const openHistoryDialog = (bill: PurchaseBill) => {
    setSelectedBillForHistory(bill);
    setHistoryDialogOpen(true);
  };

  const getPurchaseHistory = (bill: PurchaseBill) => {
    const history: any[] = [];

    // Add payments
    if (bill.payments && bill.payments.length > 0) {
      bill.payments.forEach((payment) => {
        const isReturnPayment = payment.amount < 0;
        history.push({
          id: `payment-${payment.id}`,
          date: payment.date,
          type: isReturnPayment ? "return_payment" : "purchase_payment",
          description: isReturnPayment 
            ? `Return Payment from Vendor (${payment.method})${payment.note ? ` - ${payment.note}` : ""}`
            : `Purchase Payment to Vendor (${payment.method})${payment.note ? ` - ${payment.note}` : ""}`,
          amount: Math.abs(payment.amount),
          quantity: 0,
        });
      });
    }

    // Sort by date descending
    return history.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  };

  const getAvailableStockForBill = (bill: PurchaseBill) => {
    if (!bill || !products) return 0;
    const billProductIds = new Set(
      bill.items
        .map((item) => {
          const p = products.find(
            (p) =>
              p.name.toLowerCase().trim() ===
                item.description.toLowerCase().trim() ||
              (item.hsnCode && p.hsnCode === item.hsnCode),
          );
          return p?.id;
        })
        .filter(Boolean),
    );

    return products
      .filter((p) => billProductIds.has(p.id))
      .reduce((sum, p) => sum + (p.stock || 0), 0);
  };

  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [transactionAmount, setTransactionAmount] = useState<string>("");

  const [editingReturn, setEditingReturn] = useState<any>(null);

  const handleEditTransaction = (entry: any) => {
    if (entry.type === "payment") {
      setEditingTransaction(entry);
      setTransactionAmount(entry.amount.toString());
    } else if (entry.type === "return") {
      const returnObj = selectedBillForHistory?.returns?.find(
        (r) => `return-${r.id}` === entry.id,
      );
      if (returnObj && selectedBillForHistory) {
        setEditingReturn(returnObj);
        setSelectedBillForReturn(selectedBillForHistory);
        setReturnDialogOpen(true);
      }
    }
  };

  const saveEditedTransaction = async () => {
    if (!editingTransaction || !selectedBillForHistory) return;
    setIsUpdatingTransaction(editingTransaction.id);
    try {
      const amount = parseFloat(transactionAmount);
      if (isNaN(amount)) return;

      const paymentId = editingTransaction.id.replace("payment-", "");
      await updatePurchaseBillPayment(
        selectedBillForHistory.id,
        amount,
        editingTransaction.method || "Cash",
        editingTransaction.note,
        editingTransaction.date,
        paymentId,
      );

      toast({ title: "Success", description: "Payment updated successfully" });
      setEditingTransaction(null);
      await loadBills();
      // Update history dialog view
      const updatedBill = bills.find((b) => b.id === selectedBillForHistory.id);
      if (updatedBill) setSelectedBillForHistory(updatedBill);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTransaction(null);
    }
  };

  const handleDeleteTransaction = async (entry: any) => {
    if (!selectedBillForHistory) return;
    setIsUpdatingTransaction(entry.id);
    try {
      if (entry.type === "payment") {
        const paymentId = entry.id.replace("payment-", "");
        await deletePurchaseBillPayment(selectedBillForHistory.id, paymentId);
        toast({ title: "Deleted", description: "Payment removed" });
      } else if (entry.type === "return") {
        const returnId = entry.id.replace("return-", "");
        await deletePurchaseReturn(returnId, selectedBillForHistory.id);
        toast({
          title: "Deleted",
          description: "Return removed and stock reverted",
        });
      }
      await loadBills();
      const updatedBill = bills.find((b) => b.id === selectedBillForHistory.id);
      if (updatedBill) setSelectedBillForHistory(updatedBill);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTransaction(null);
    }
  };
  const [editedBill, setEditedBill] = useState<PurchaseBill | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] =
    useState<PurchaseBill | null>(null);
  const [loadingPayment, setLoadingPayment] = useState<string | null>(null);
  const [loadingInventory, setLoadingInventory] = useState<string | null>(null);
  const [savingEditedBill, setSavingEditedBill] = useState(false);
  const [productConflicts, setProductConflicts] = useState<ProductConflict[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingTransaction, setIsUpdatingTransaction] = useState<string | null>(null);
  const [pendingInventoryBill, setPendingInventoryBill] =
    useState<PurchaseBill | null>(null);
  const [pendingInventoryItems, setPendingInventoryItems] = useState<
    InventoryItemInput[]
  >([]);
  const [lastInventoryError, setLastInventoryError] = useState<string | null>(
    null,
  );

  // Inventory dialog state
  const [inventoryDialogBill, setInventoryDialogBill] =
    useState<PurchaseBill | null>(null);
  const [inventoryItems, setInventoryItems] = useState<
    {
      description: string;
      hsnCode: string;
      quantity: number;
      unit: string;
      purchasePrice: number;
      sellingPrice: number;
      gstRate: number;
      weight: number;
      weightUnit: string;
      barcode?: string; // Added barcode field
      vendorId?: string; // Added vendor selection
      productId?: string;
      isNewProduct?: boolean;
    }[]
  >([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    // Update overdue status on load
    updatePurchaseBillOverdueStatus().catch(console.error);
    loadBills();
    loadCompanyProfile();
    loadProducts();
    loadVendors();
  }, []);

  const loadVendors = async () => {
    const data = await getVendors();
    setVendors(data);
  };

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  const formatErrorForUser = (error: unknown) => {
    try {
      const e = error as any;
      const basic =
        typeof e?.message === "string"
          ? e.message
          : typeof error === "string"
            ? error
            : "Unknown error";

      const meta: any = {};
      if (e?.code) meta.code = e.code;
      if (e?.name) meta.name = e.name;
      if (e?.stack) meta.stack = e.stack;

      return [
        `Message: ${basic}`,
        meta.code ? `Code: ${meta.code}` : null,
        meta.name ? `Name: ${meta.name}` : null,
        `Online: ${typeof navigator !== "undefined" ? navigator.onLine : "unknown"}`,
        `UserAgent: ${
          typeof navigator !== "undefined" ? navigator.userAgent : "unknown"
        }`,
        meta.stack ? `\nStack:\n${meta.stack}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    } catch {
      return "Unknown error (failed to format error details)";
    }
  };

  const loadCompanyProfile = async () => {
    const profile = await getCompanyProfile();
    setCompanyProfile(profile);
  };

  useEffect(() => {
    filterAndSortBills();
  }, [bills, searchTerm, statusFilter, gstFilter, sortBy]);

  const loadBills = async () => {
    setLoading(true);
    const data = await getPurchaseBills();
    setBills(data);
    setPage(1);
    setLoading(false);
  };

  const filterAndSortBills = () => {
    let filtered = [...bills];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (bill) =>
          bill.vendorName.toLowerCase().includes(term) ||
          bill.billNumber?.toLowerCase().includes(term) ||
          bill.items.some((item) =>
            item.description.toLowerCase().includes(term),
          ),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((bill) => {
        if (statusFilter === "overpaid") {
          const netTotal =
            bill.total -
            (bill.returns?.reduce((sum, r) => sum + r.totalReturnValue, 0) ||
              0);
          return netTotal - (bill.paidAmount || 0) < 0;
        }
        return bill.paymentStatus === statusFilter;
      });
    }

    // GST filter
    if (gstFilter !== "all") {
      if (gstFilter === "gst") {
        filtered = filtered.filter((bill) => bill.totalTax > 0);
      } else if (gstFilter === "non-gst") {
        filtered = filtered.filter((bill) => bill.totalTax === 0);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "date-asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "amount-desc":
          return b.total - a.total;
        case "amount-asc":
          return a.total - b.total;
        case "vendor":
          return a.vendorName.localeCompare(b.vendorName);
        case "due-date":
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        default:
          return 0;
      }
    });

    setFilteredBills(filtered);
  };

  useEffect(() => {
    setPage(1);
  }, [filteredBills.length, searchTerm, statusFilter, gstFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedBills = filteredBills.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setIsCompressing(true);

    toast({
      title: "Processing Image",
      description: "Optimizing image for AI processing...",
    });

    try {
      const compressedBase64 = await compressFile(file, 900);
      const sizeKB = getBase64SizeKB(compressedBase64);

      if (sizeKB > 1000) {
        toast({
          title: "Image Too Large",
          description: `Image is ${sizeKB.toFixed(
            0,
          )} KB. Please try a different photo.`,
          variant: "destructive",
        });
        setIsCompressing(false);
        return;
      }

      await processImage(compressedBase64);
    } catch (error) {
      console.error("Error processing image:", error);
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompressing(false);
    }

    e.target.value = "";
  };

  const processImage = async (imageBase64: string) => {
    setIsExtracting(true);

    try {
      toast({
        title: "Processing",
        description: "AI is extracting bill information...",
      });

      const extracted = await extractBillFromImage(imageBase64);

      // Check for duplicate bill
      if (
        extracted.billNumber &&
        (await isPurchaseBillDuplicate(
          extracted.billNumber,
          extracted.vendorName,
        ))
      ) {
        toast({
          title: "Duplicate Bill",
          description: `Bill #${extracted.billNumber} from ${extracted.vendorName} already exists`,
          variant: "destructive",
        });
        setIsExtracting(false);
        return;
      }

      // Calculate due date from payment terms if not provided
      let dueDate = extracted.dueDate;
      if (!dueDate && extracted.paymentTerms && extracted.billDate) {
        const billDate = new Date(extracted.billDate);
        billDate.setDate(billDate.getDate() + extracted.paymentTerms);
        dueDate = billDate.toISOString();
      }

      const newBill: PurchaseBill = {
        id: crypto.randomUUID(),
        billImage: imageBase64,
        vendorId: vendors.find(v => v.name.toLowerCase().trim() === extracted.vendorName.toLowerCase().trim())?.id,
        vendorName: extracted.vendorName,
        vendorAddress: extracted.vendorAddress,
        vendorGstin: extracted.vendorGstin,
        billNumber: extracted.billNumber,
        billDate: extracted.billDate ? new Date(extracted.billDate).toISOString() : new Date().toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        paymentTerms: extracted.paymentTerms,
        items: extracted.items,
        subtotal: extracted.subtotal,
        totalTax: extracted.totalTax,
        total: extracted.total,
        paymentStatus: "pending",
        paidAmount: 0,
        payments: [],
        extractedRawText: extracted.rawText,
        extractionErrors: extracted.errors,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePurchaseBill(newBill);
      await loadBills();

      // Show warnings if any
      if (extracted.errors.length > 0) {
        toast({
          title: "Bill Extracted with Warnings",
          description: `${extracted.errors.length} issue(s) found. Please review and fix.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Success",
          description: "Bill extracted and saved successfully!",
        });
      }

      // Open the detail view
      setSelectedBill(newBill);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process bill",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deletePurchaseBill(id);
      await loadBills();
      toast({
        title: "Deleted",
        description: "Purchase bill deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handlePaymentCollected = async (
    amount: number,
    type: any,
    note?: string,
    date?: string,
  ) => {
    if (selectedBillForPayment) {
      setLoadingPayment(selectedBillForPayment.id);
      try {
        // Handle negative amount for overpayment collection
        const actualAmount = amount;
        
        await updatePurchaseBillPayment(
          selectedBillForPayment.id,
          actualAmount,
          type,
          note,
          date,
        );
        await loadBills();
        toast({
          title: actualAmount < 0 ? "Overpayment Collected" : "Payment Recorded",
          description: `${actualAmount < 0 ? "Collected" : "Recorded"} ${formatCurrency(Math.abs(actualAmount))} via ${type}.`,
        });
      } catch (error) {
        console.error("Error collecting payment:", error);
        toast({
          title: "Error",
          description: "Failed to record payment",
          variant: "destructive",
        });
      } finally {
        setLoadingPayment(null);
      }
    }
  };

  const openPaymentDialog = (bill: PurchaseBill) => {
    setSelectedBillForPayment(bill);
    setPaymentDialogOpen(true);
  };

  const handleTogglePayment = async (bill: PurchaseBill) => {
    // Legacy support or fallback
    openPaymentDialog(bill);
  };

  const handleAddToInventory = async (bill: PurchaseBill) => {
    // Check if already added using the storage function
    const isAdded = await isPurchaseBillInventoryAdded(bill.id);
    if (bill.itemsAddedToInventory || isAdded) {
      toast({
        title: "Already Added",
        description: `Items were added to inventory on ${formatDate(
          bill.inventoryAddedAt || bill.createdAt,
        )}`,
        variant: "destructive",
      });
      return;
    }

    // Open dialog to enter selling prices
    // Use commission settings from company profile to calculate default selling price
    const products = await getProducts();
    const items = bill.items.map((item) => {
      const existingProduct = products.find(
        (p) =>
          p.name.toLowerCase() === item.description.toLowerCase() ||
          p.hsnCode === item.hsnCode,
      );

      return {
        description: item.description,
        hsnCode: item.hsnCode || "",
        barcode: "", // Added barcode field for inventory addition
        quantity: item.quantity,
        unit: item.unit,
        purchasePrice: item.rate,
        sellingPrice: calculateSellingPriceFromCommission(
          item.rate,
          companyProfile?.commissionSettings,
        ),
        gstRate: item.gstRate || 0,
        whereToBuy: (item as any).whereToBuy || bill.vendorName || "",
        weight: (item as any).weight || 0,
        weightUnit: (item as any).weightUnit || "g",
        vendorId: bill.vendorId || "",
        productId: existingProduct?.id,
        isNewProduct: !existingProduct,
      };
    });

    setInventoryItems(items);
    setInventoryDialogBill(bill);
    
    // Update the bill object itself if vendor is selected in the inventory items
    // This ensures that when confirmAddToInventory is called, the bill already has the vendor
    if (items.length > 0 && items[0].vendorId) {
      const vendor = vendors.find(v => v.id === items[0].vendorId);
      if (vendor) {
        setSelectedBill({
          ...bill,
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorGstin: vendor.gstin || "",
          vendorAddress: vendor.address || ""
        });
      }
    }
  };

  const confirmAddToInventory = async (
    conflictResolutions?: Map<string, string>,
  ) => {
    if (!inventoryDialogBill) return;

    setLoadingInventory(inventoryDialogBill.id);
    try {
      // First update the bill with the selected vendor if it has changed
      // Use the vendor from the first inventory item as they should be consistent
      const firstItemVendorId = inventoryItems[0]?.vendorId;
      if (firstItemVendorId) {
        const vendor = vendors.find(v => v.id === firstItemVendorId);
        if (vendor) {
          const updatedBill = {
            ...inventoryDialogBill,
            vendorId: vendor.id,
            vendorName: vendor.name,
            vendorGstin: vendor.gstin || "",
            vendorAddress: vendor.address || ""
          };
          await updatePurchaseBill(updatedBill);
          // Update the local bills state
          setBills(prev => prev.map(b => b.id === updatedBill.id ? updatedBill : b));
          // If this bill is currently selected, update that too
          if (selectedBill && selectedBill.id === updatedBill.id) {
            setSelectedBill(updatedBill);
          }
        }
      }

      // Validate all selling prices
      const hasInvalidPrices = inventoryItems.some(
        (item) => item.sellingPrice <= 0,
      );
      if (hasInvalidPrices) {
        toast({
          title: "Invalid Prices",
          description: "Please enter valid selling prices for all items",
          variant: "destructive",
        });
        setLoadingInventory(null);
        return;
      }

      const itemsInput: InventoryItemInput[] = inventoryItems.map((item) => ({
        description: item.description,
        hsnCode: item.hsnCode,
        barcode: item.barcode, // Pass barcode to inventory service
        quantity: item.quantity,
        unit: item.unit,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        gstRate: item.gstRate,
        productId: item.productId,
        isNewProduct: item.isNewProduct,
        whereToBuy: item.isNewProduct ? (inventoryDialogBill as any).vendorName : undefined,
        weight: item.weight,
        weightUnit: item.weightUnit,
      }));

      const result = await addPurchaseItemsToInventory(
        inventoryDialogBill,
        itemsInput,
        conflictResolutions,
      );

      // Check if there are conflicts
      if (result.conflicts && result.conflicts.length > 0) {
        // Store the data for later use
        setPendingInventoryBill(inventoryDialogBill);
        setPendingInventoryItems(itemsInput);
        setProductConflicts(result.conflicts);
        setInventoryDialogBill(null); // Close the selling price dialog
        setLoadingInventory(null);
        return;
      }

      setInventoryDialogBill(null);
      setInventoryItems([]);

      toast({
        title: "Added to Inventory",
        description: `${result.added} new product(s), ${result.updated} updated`,
      });

      // Reload bills in a separate step.
      // On mobile, a transient reload failure was showing as "add failed"
      // even when the inventory add succeeded.
      try {
        await loadBills();
      } catch (reloadErr) {
        const details = formatErrorForUser(reloadErr);
        setLastInventoryError(details);
        toast({
          title: "Added, but refresh failed",
          description:
            "Inventory was updated, but the list couldn't refresh. Open details and copy the error if it keeps happening.",
          variant: "destructive",
        });
      }

      // Update selectedBill state if it matches
      if (selectedBill && selectedBill.id === inventoryDialogBill.id) {
        setSelectedBill({
          ...selectedBill,
          itemsAddedToInventory: true,
          inventoryAddedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error adding to inventory:", error);
      const details = formatErrorForUser(error);
      setLastInventoryError(details);
      toast({
        title: "Error",
        description:
          "Failed to add items to inventory. Tap 'Details' to copy the error.",
        variant: "destructive",
      });
    } finally {
      setLoadingInventory(null);
    }
  };

  const handleConflictCancel = () => {
    setProductConflicts([]);
    setPendingInventoryBill(null);
    setPendingInventoryItems([]);
  };

  const handleConflictResolution = async (resolutions: Map<string, string>) => {
    if (!pendingInventoryBill || !pendingInventoryItems) return;

    setLoadingInventory(pendingInventoryBill.id);
    try {
      const result = await addPurchaseItemsToInventory(
        pendingInventoryBill,
        pendingInventoryItems,
        resolutions,
      );

      await loadBills();

      if (selectedBill && selectedBill.id === pendingInventoryBill.id) {
        setSelectedBill({
          ...selectedBill,
          itemsAddedToInventory: true,
          inventoryAddedAt: new Date().toISOString(),
        });
      }

      setProductConflicts([]);
      setPendingInventoryBill(null);
      setPendingInventoryItems([]);

      toast({
        title: "Added to Inventory",
        description: `${result.added} new product(s), ${result.updated} updated`,
      });
    } catch (error) {
      console.error("Error adding to inventory:", error);
      toast({
        title: "Error",
        description: "Failed to add items to inventory",
        variant: "destructive",
      });
    } finally {
      setLoadingInventory(null);
    }
  };

  const updateInventoryItemSellingPrice = (
    index: number,
    sellingPrice: number,
  ) => {
    const items = [...inventoryItems];
    items[index].sellingPrice = sellingPrice;
    setInventoryItems(items);
  };

  const startEditing = (bill: PurchaseBill) => {
    const clone: PurchaseBill = JSON.parse(JSON.stringify(bill));
    // Auto-fill item-level "Bought from" with Vendor Name if missing
    clone.items = (clone.items || []).map((it) => ({
      ...it,
      whereToBuy:
        (it as any).whereToBuy && String((it as any).whereToBuy).trim()
          ? (it as any).whereToBuy
          : clone.vendorName || "",
    }));
    setEditedBill(clone);
    setIsEditing(true);
  };

  const addEditedItemRow = () => {
    if (!editedBill) return;
    const newItem: PurchaseBillItem = {
      description: "",
      hsnCode: "",
      quantity: 1,
      unit: "pcs",
      rate: 0,
      amount: 0,
      gstRate: 0,
      gstAmount: 0,
      whereToBuy: editedBill.vendorName || "",
      weight: 0,
      hasError: false,
    };
    setEditedBill({ ...editedBill, items: [...editedBill.items, newItem] });
  };

  const removeEditedItemRow = (index: number) => {
    if (!editedBill) return;
    const items = editedBill.items.filter((_, i) => i !== index);
    setEditedBill({ ...editedBill, items });
  };

  const saveEditedBill = async () => {
    if (!editedBill) return;

    setSavingEditedBill(true);
    try {
      // Recalculate totals
      const subtotal = editedBill.items.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      const totalTax = editedBill.items.reduce(
        (sum, item) => sum + (item.gstAmount || 0),
        0,
      );
      const total = subtotal + totalTax;

      const updatedBill: PurchaseBill = {
        ...editedBill,
        subtotal,
        totalTax,
        total,
        extractionErrors: [], // Clear errors after manual fix
        updatedAt: new Date().toISOString(),
      };

      await updatePurchaseBill(updatedBill);
      await loadBills();
      if (selectedBill && selectedBill.id === updatedBill.id) {
        setSelectedBill(updatedBill);
      }
      setIsEditing(false);
      setEditedBill(null);

      toast({
        title: "Saved",
        description: "Bill updated successfully",
      });
    } catch (error) {
      console.error("Error saving edited bill:", error);
      toast({
        title: "Error",
        description: "Failed to save bill",
        variant: "destructive",
      });
    } finally {
      setSavingEditedBill(false);
    }
  };

  const updateEditedItem = (
    index: number,
    field: keyof PurchaseBillItem,
    value: any,
  ) => {
    if (!editedBill) return;

    const items = [...editedBill.items];
    const item = { ...items[index] };

    (item as any)[field] = value;

    // Recalculate amount
    if (field === "quantity" || field === "rate") {
      item.amount = item.quantity * item.rate;
      item.gstAmount = (item.amount * (item.gstRate || 0)) / 100;
    }
    if (field === "gstRate") {
      item.gstAmount = (item.amount * (value || 0)) / 100;
    }

    // Clear error flag after edit
    item.hasError = false;
    item.errorMessage = undefined;

    items[index] = item;
    setEditedBill({ ...editedBill, items });
  };

  const handleProductSelect = (index: number, product: any) => {
    if (!editedBill) return;
    const items = [...editedBill.items];
    const item = { ...items[index] };

    item.description = product.name; // Update description
    if (product.hsnCode) item.hsnCode = product.hsnCode; // Update HSN if available
    
    // Update rate if available (assuming purchasePrice is the buying rate)
    if (product.purchasePrice) item.rate = product.purchasePrice;
    
    // Update GST rate
    if (product.gstRate !== undefined) item.gstRate = product.gstRate;
    
    // Update Unit
    if (product.unit) item.unit = product.unit;

    // Recalculate amounts
    item.amount = item.quantity * item.rate;
    item.gstAmount = (item.amount * (item.gstRate || 0)) / 100;
    
    // Clear error flag after edit
    item.hasError = false;
    item.errorMessage = undefined;

    items[index] = item;
    setEditedBill({ ...editedBill, items });
  };

  const isOverdue = (bill: PurchaseBill) => {
    if (bill.paymentStatus === "paid" || !bill.dueDate) return false;
    const dueDate = new Date(bill.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const getDaysUntilDue = (bill: PurchaseBill) => {
    if (!bill.dueDate || bill.paymentStatus === "paid") return null;
    const dueDate = new Date(bill.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPaymentStatusBadge = (bill: PurchaseBill) => {
    const isOverdueVal = isOverdue(bill);
    const status = bill.paymentStatus;
    const paidAmount = bill.paidAmount || 0;
    const netTotal =
      bill.total -
      (bill.returns?.reduce((sum, r) => sum + r.totalReturnValue, 0) || 0);
    const remaining = netTotal - paidAmount;

    if (remaining < 0) {
      return (
        <Badge variant="default" className="bg-orange-600 hover:bg-orange-700">
          <IndianRupee className="h-3 w-3 mr-1" /> Overpaid
        </Badge>
      );
    }

    if (remaining === 0) {
      return (
        <Badge
          variant="default"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <CheckCircle className="h-3 w-3 mr-1" /> Paid
        </Badge>
      );
    }

    if (paidAmount > 0) {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-400">
          <Clock className="h-3 w-3 mr-1" /> Partial (
          {formatCurrency(paidAmount)})
        </Badge>
      );
    }

    if (isOverdueVal || status === "overdue") {
      return (
        <Badge variant="destructive" className="animate-pulse">
          <AlertCircle className="h-3 w-3 mr-1" /> Overdue
        </Badge>
      );
    }

    const daysUntilDue = getDaysUntilDue(bill);
    if (daysUntilDue !== null && daysUntilDue <= 3) {
      return (
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-800 border-amber-300"
        >
          <Clock className="h-3 w-3 mr-1" /> Due in {daysUntilDue} day(s)
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" /> Pending
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner size="xl" text="Loading products..." fullScreen contentAreaOnly />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            Purchase Bills
          </h1>
          <p className="page-subtitle">
            AI-powered bill extraction with validation
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isExtracting || isCompressing || loading}
          >
            {isCompressing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            {isCompressing ? "Processing..." : "Camera"}
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting || isCompressing || loading}
          >
            {isCompressing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isExtracting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isCompressing
              ? "Processing..."
              : isExtracting
                ? "Extracting..."
                : "Upload Bill"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendor, bill number, items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="overpaid">Overpaid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gstFilter} onValueChange={setGstFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="GST Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bills</SelectItem>
            <SelectItem value="gst">GST Bills</SelectItem>
            <SelectItem value="non-gst">Non-GST Bills</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="due-date">Due Date</SelectItem>
            <SelectItem value="amount-desc">Amount (High)</SelectItem>
            <SelectItem value="amount-asc">Amount (Low)</SelectItem>
            <SelectItem value="vendor">Vendor Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isExtracting && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-3 text-foreground font-medium">
              AI is analyzing your bill...
            </p>
            <p className="text-sm text-muted-foreground">
              Extracting vendor info, items, amounts, and validating
              calculations
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bills List */}
      {filteredBills.length === 0 && !isExtracting ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              No purchase bills found
            </p>
            <p className="text-sm text-muted-foreground">
              Upload a bill image to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pagedBills.map((bill) => (
            <Card
              key={bill.id}
              className={`hover:shadow-md transition-shadow ${
                isOverdue(bill) || bill.paymentStatus === "overdue"
                  ? "border-destructive/50 bg-destructive/5"
                  : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Bill Image Thumbnail */}
                  <div
                    className="w-full sm:w-20 h-20 bg-muted rounded-lg overflow-hidden cursor-pointer flex-shrink-0"
                    onClick={() => setViewImageBill(bill)}
                  >
                    <img
                      src={bill.billImage}
                      alt="Bill"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Bill Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground truncate">
                          {bill.vendorName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {bill.billNumber
                            ? `#${bill.billNumber}`
                            : "No bill number"}{" "}
                          • {formatDate(bill.billDate || bill.createdAt)}
                        </p>
                        {bill.dueDate && (
                          <p
                            className={`text-xs mt-1 ${
                              isOverdue(bill)
                                ? "text-destructive font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            Due: {formatDate(bill.dueDate)}
                            {bill.paymentTerms
                              ? ` (${bill.paymentTerms} days)`
                              : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className={`cursor-pointer ${
                            loadingPayment === bill.id
                              ? "opacity-50 pointer-events-none"
                              : ""
                          }`}
                          onClick={() => openPaymentDialog(bill)}
                        >
                          {loadingPayment === bill.id ? (
                            <Badge variant="secondary">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />{" "}
                              Updating...
                            </Badge>
                          ) : (
                            <div className="flex flex-col gap-1 items-end">
                              {getPaymentStatusBadge(bill)}
                              {bill.paymentStatus !== "paid" && (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  Paid: {formatCurrency(bill.paidAmount || 0)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {bill.extractionErrors &&
                          bill.extractionErrors.length > 0 && (
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-400"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />{" "}
                              {bill.extractionErrors.length} issue(s)
                            </Badge>
                          )}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <PackagePlus className="h-3.5 w-3.5" />
                        <span>{bill.items.length} item(s)</span>
                      </div>
                      {bill.vendorGstin && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">GSTIN:</span>
                          <span>{bill.vendorGstin}</span>
                        </div>
                      )}
                      {bill.itemsAddedToInventory && (
                        <Badge
                          variant="outline"
                          className="text-emerald-600 border-emerald-500 bg-emerald-50/50 h-5 text-[11px]"
                        >
                          <PackagePlus className="h-3 w-3 mr-1" /> In Inventory
                        </Badge>
                      )}
                    </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t pt-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-bold">
                              Total:
                            </span>
                            <p className="text-[10px] sm:text-base font-black text-foreground">
                              {formatCurrency(
                                bill.total -
                                  (bill.returns?.reduce(
                                    (sum, r) => sum + r.totalReturnValue,
                                    0,
                                  ) || 0),
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-bold">
                              Remaining:
                            </span>
                            <p
                              className={`text-sm sm:text-base font-black text-foreground ${
                                bill.total -
                                  (bill.returns?.reduce(
                                    (sum, r) => sum + r.totalReturnValue,
                                    0,
                                  ) || 0) -
                                  (bill.paidAmount || 0) <
                                0
                                  ? "text-red-600"
                                  : "text-black-600"
                              }`}
                            >
                              {formatCurrency(
                                bill.total -
                                  (bill.returns?.reduce(
                                    (sum, r) => sum + r.totalReturnValue,
                                    0,
                                  ) || 0) -
                                  (bill.paidAmount || 0),
                              )}
                            </p>
                          </div>
                          {bill.returns && bill.returns.length > 0 && (
                            <p className="text-[11px] sm:text-xs text-orange-600 font-bold">
                              Ret:{" "}
                              {formatCurrency(
                                bill.returns.reduce(
                                  (sum, r) => sum + r.totalReturnValue,
                                  0,
                                ),
                              )}
                            </p>
                          )}
                          {bill.paidAmount > 0 &&
                            bill.payments &&
                            bill.payments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(
                                  bill.payments.reduce(
                                    (acc, p) => {
                                      acc[p.method] =
                                        (acc[p.method] || 0) + p.amount;
                                      return acc;
                                    },
                                    {} as Record<string, number>,
                                  ),
                                ).map(([method, amount]) => (
                                  <Badge
                                    key={method}
                                    variant="outline"
                                    className={`text-[10px] sm:text-[11px] px-2 py-0 h-5 flex items-center gap-1 font-bold ${
                                      amount < 0 
                                        ? "bg-green-50 border-green-200 text-green-700" 
                                        : "bg-red-50 border-red-200 text-red-700"
                                    }`}
                                  >
                                    <span>{method}:</span>
                                    <span>{formatCurrency(Math.abs(amount))}</span>
                                  </Badge>
                                ))}
                              </div>
                            )}
                        </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-foreground"
                          onClick={() => setSelectedBill(bill)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => openPaymentDialog(bill)}
                              disabled={(() => {
                                const totalReturns = (bill.returns || []).reduce((sum, r) => sum + r.totalReturnValue, 0);
                                const netTotal = bill.total - totalReturns;
                                const isOverpaid = (bill.paidAmount || 0) > netTotal;
                                return bill.paymentStatus === "paid" && !isOverpaid;
                              })()}
                              className="gap-2"
                            >
                              <IndianRupee className="h-4 w-4" />
                              Pay Now
                            </DropdownMenuItem>

                            {!bill.itemsAddedToInventory && (
                              <DropdownMenuItem
                                onClick={() => handleAddToInventory(bill)}
                                disabled={loadingInventory === bill.id}
                                className="gap-2 text-emerald-600 focus:text-emerald-600"
                              >
                                {loadingInventory === bill.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <PackagePlus className="h-4 w-4" />
                                )}
                                Add to Inventory
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedBillForReturn(bill);
                                setReturnDialogOpen(true);
                              }}
                              className="gap-2 text-orange-600 focus:text-orange-600"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Purchase Return
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => openHistoryDialog(bill)}
                              className="gap-2"
                            >
                              <Clock className="h-4 w-4" />
                              Transaction History
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setViewImageBill(bill)}
                              className="gap-2"
                            >
                              <ImageIcon className="h-4 w-4" />
                              View Bill Image
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="gap-2 text-destructive focus:text-destructive"
                                  disabled={bill.itemsAddedToInventory}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Bill
                                  {bill.itemsAddedToInventory && (
                                    <span className="text-[10px] ml-auto opacity-70">
                                      (In Inventory)
                                    </span>
                                  )}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Purchase Bill?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone and will remove
                                    all associated payment and return records.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(bill.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={!!isDeleting}
                                  >
                                    {isDeleting === bill.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredBills.length > pageSize && (
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
      )}

      {/* Image View Dialog */}
      <Dialog
        open={!!viewImageBill}
        onOpenChange={() => setViewImageBill(null)}
      >
        <DialogContent
          className="w-[100vw] sm:w-[90vw] lg:w-[85vw] max-w-4xl
          h-[100dvh] sm:h-[90vh] max-h-[100dvh] sm:max-h-[90vh]
          left-0 top-0 translate-x-0 translate-y-0
          sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]
          rounded-none sm:rounded-lg
          p-0 flex flex-col gap-0"
        >
          <DialogHeader className="px-6 sm:px-8 py-5 border-b shrink-0 bg-background sticky top-0 z-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <DialogTitle>Original Bill Image</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
            {viewImageBill && (
              <img
                src={viewImageBill.billImage}
                alt="Bill"
                className="w-full rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      {/* Detail View Dialog */}
      <Dialog
        open={!!selectedBill}
        onOpenChange={() => {
          setSelectedBill(null);
          setIsEditing(false);
          setEditedBill(null);
        }}
      >
        <DialogContent
          className="w-[100vw] sm:w-[90vw] lg:w-[85vw] xl:w-[80vw] max-w-[1800px]
          h-[100dvh] sm:h-[90vh] max-h-[100dvh] sm:max-h-[90vh]
          left-0 top-0 translate-x-0 translate-y-0
          sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]
          rounded-none sm:rounded-lg
          p-0 flex flex-col gap-0"
        >
          {/* Fixed Header */}
          <DialogHeader className="px-6 sm:px-8 py-4 border-b shrink-0 bg-background sticky top-0 z-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <DialogTitle className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <span className="text-xl lg:text-2xl font-bold">
                Extracted Bill Details
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedBill && !isEditing && (
                  <>
                    <PDFDownloadLink
                      document={<PurchaseBillPDF bill={selectedBill} />}
                      fileName={`Bill_${selectedBill.billNumber || selectedBill.id}.pdf`}
                    >
                      {({ loading }) => (
                        <Button
                          variant="outline"
                          size="default"
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Download PDF
                        </Button>
                      )}
                    </PDFDownloadLink>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => startEditing(selectedBill)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" /> Edit
                    </Button>
                  </>
                )}
                {isEditing && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedBill(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" /> Cancel
                    </Button>
                    <Button
                      size="default"
                      onClick={saveEditedBill}
                      loading={savingEditedBill}
                    >
                      <Save className="h-4 w-4 mr-2" /> Save
                    </Button>
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
            {/* Extraction Errors Alert */}
            {selectedBill?.extractionErrors &&
              selectedBill.extractionErrors.length > 0 &&
              !isEditing && (
                <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20 mb-6">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <p className="font-semibold text-base text-amber-800 dark:text-amber-200">
                          AI detected potential issues:
                        </p>
                        <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                          {selectedBill.extractionErrors.map((error, i) => (
                            <li
                              key={i}
                              className="flex flex-col lg:flex-row lg:items-start gap-2"
                            >
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  error.severity === "error"
                                    ? "bg-destructive/20 text-destructive"
                                    : "bg-amber-200 text-amber-800"
                                }`}
                              >
                                {error.severity.toUpperCase()}
                              </span>
                              <div className="flex-1">
                                <span className="block text-sm">
                                  {error.message}
                                </span>
                                {error.suggestion && (
                                  <span className="block text-xs text-amber-600 mt-1">
                                    Suggestion: {error.suggestion}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 border-amber-400 text-amber-700"
                          onClick={() => startEditing(selectedBill)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" /> Fix Issues
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {(isEditing ? editedBill : selectedBill) && (
              <div className="space-y-6">
                {/* Vendor Information */}
                <Card className="overflow-hidden shadow-sm">
                  <CardHeader className="bg-muted/40 px-5 py-3.5">
                    <CardTitle className="text-lg lg:text-xl font-semibold">
                      Vendor Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 px-5 pb-5">
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                          <Label className="text-sm font-medium">Vendor</Label>
                          <Select
                            value={editedBill?.vendorId || ""}
                            onValueChange={(val) => {
                              const vendor = vendors.find(v => v.id === val);
                              setEditedBill(prev => prev ? {
                                ...prev,
                                vendorId: val,
                                vendorName: vendor?.name || prev.vendorName,
                                vendorAddress: vendor?.address || prev.vendorAddress,
                                vendorGstin: vendor?.gstin || prev.vendorGstin
                              } : null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Vendor" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendors.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">
                            Vendor Name (Override)
                          </Label>
                          <Input
                            value={editedBill?.vendorName || ""}
                            onChange={(e) =>
                              setEditedBill((prev) =>
                                prev
                                  ? { ...prev, vendorName: e.target.value }
                                  : null,
                              )
                            }
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">GSTIN</Label>
                          <Input
                            value={editedBill?.vendorGstin || ""}
                            onChange={(e) =>
                              setEditedBill((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      vendorGstin: e.target.value.toUpperCase(),
                                    }
                                  : null,
                              )
                            }
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">
                            Bill Number
                          </Label>
                          <Input
                            value={editedBill?.billNumber || ""}
                            onChange={(e) =>
                              setEditedBill((prev) =>
                                prev
                                  ? { ...prev, billNumber: e.target.value }
                                  : null,
                              )
                            }
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">
                            Bill Date
                          </Label>
                          <Input
                            type="date"
                            value={editedBill?.billDate?.split("T")[0] || ""}
                            onChange={(e) => {
                              const newDate = new Date(e.target.value);
                              const now = new Date();
                              newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                              setEditedBill((prev) =>
                                prev
                                  ? { ...prev, billDate: newDate.toISOString() }
                                  : null,
                              );
                            }}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">
                            Due Date
                          </Label>
                          <Input
                            type="date"
                            value={editedBill?.dueDate?.split("T")[0] || ""}
                            onChange={(e) => {
                              const newDate = new Date(e.target.value);
                              const now = new Date();
                              newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                              setEditedBill((prev) =>
                                prev
                                  ? { ...prev, dueDate: newDate.toISOString() }
                                  : null,
                              );
                            }}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">
                            Payment Terms (Days)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={editedBill?.paymentTerms || ""}
                            onChange={(e) =>
                              setEditedBill((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      paymentTerms:
                                        parseInt(e.target.value) || 0,
                                    }
                                  : null,
                              )
                            }
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                          <Label className="text-sm font-medium">Address</Label>
                          <Textarea
                            value={editedBill?.vendorAddress || ""}
                            onChange={(e) =>
                              setEditedBill((prev) =>
                                prev
                                  ? { ...prev, vendorAddress: e.target.value }
                                  : null,
                              )
                            }
                            rows={3}
                            className="resize-none text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Vendor Name
                            </span>
                            <p className="font-semibold text-lg mt-1 break-words">
                              {selectedBill?.vendorName}
                            </p>
                          </div>
                          {selectedBill?.vendorAddress && (
                            <div>
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                Address
                              </span>
                              <p className="mt-1 whitespace-pre-line break-words">
                                {selectedBill.vendorAddress}
                              </p>
                            </div>
                          )}
                          {selectedBill?.vendorGstin && (
                            <div>
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                GSTIN
                              </span>
                              <p className="mt-1 font-medium break-all">
                                {selectedBill.vendorGstin}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Bill Number
                            </span>
                            <p className="mt-1 font-semibold text-base">
                              {selectedBill?.billNumber || "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Bill Date
                            </span>
                            <p className="mt-1">
                              {formatDate(selectedBill?.billDate)}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Due Date
                            </span>
                            <p
                              className={`mt-1 font-medium ${
                                isOverdue(selectedBill)
                                  ? "text-destructive"
                                  : ""
                              }`}
                            >
                              {formatDate(selectedBill?.dueDate)}{" "}
                              {selectedBill?.paymentTerms
                                ? `(${selectedBill.paymentTerms} days)`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment History */}
                <Card className="overflow-hidden shadow-sm">
                  <CardHeader className="bg-muted/40 px-5 py-3.5">
                    <CardTitle className="text-lg lg:text-xl font-semibold flex items-center justify-between">
                      <span>Payment History</span>
                      <Badge
                        variant={
                          (isEditing ? editedBill : selectedBill)
                            ?.paymentStatus === "paid"
                            ? "default"
                            : "secondary"
                        }
                        className="text-sm py-1 px-3"
                      >
                        {(isEditing
                          ? editedBill
                          : selectedBill
                        )?.paymentStatus.toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 px-5 pb-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      <div className="space-y-1.5 p-4 bg-muted/20 rounded-lg border">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          Total Amount
                        </span>
                        <p className="text-2xl font-bold text-foreground">
                          {formatCurrency(
                            (isEditing ? editedBill : selectedBill)?.total || 0,
                          )}
                        </p>
                      </div>
                      <div className="space-y-1.5 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900">
                        <span className="text-xs text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-semibold">
                          Total Paid
                        </span>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(
                            (isEditing ? editedBill : selectedBill)
                              ?.paidAmount || 0,
                          )}
                        </p>
                      </div>
                      <div className="space-y-1.5 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900">
                        <span className="text-xs text-blue-700 dark:text-blue-300 uppercase tracking-wider font-semibold">
                          Payment Breakdown
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(
                            (isEditing
                              ? editedBill
                              : selectedBill
                            )?.payments?.reduce(
                              (acc, p) => {
                                acc[p.method] = (acc[p.method] || 0) + p.amount;
                                return acc;
                              },
                              {} as Record<string, number>,
                            ) || {},
                          ).map(([method, amount]) => (
                            <Badge
                              key={method}
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-none text-xs"
                            >
                              {method}: {formatCurrency(amount)}
                            </Badge>
                          ))}
                          {((isEditing ? editedBill : selectedBill)?.payments
                            ?.length || 0) === 0 && (
                            <span className="text-xs text-muted-foreground italic">
                              No payments yet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {((isEditing ? editedBill : selectedBill)?.payments
                      ?.length || 0) > 0 ? (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/60">
                            <tr>
                              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                                Date
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                                Method
                              </th>
                              <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                                Amount
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                                Note
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(isEditing
                              ? editedBill
                              : selectedBill
                            )?.payments?.map((payment, i) => (
                              <tr key={payment.id || i} className="border-t">
                                <td className="px-4 py-3 text-sm">
                                  {formatDate(payment.date)}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className="text-xs">
                                    {payment.method}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold">
                                  {formatCurrency(payment.amount)}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground text-sm">
                                  {payment.note || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-muted/10 rounded-lg border border-dashed">
                        <p className="text-sm text-muted-foreground">
                          No payments recorded yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Items Table */}
                <Card className="overflow-hidden shadow-sm">
                  <CardHeader className="bg-muted/40 px-5 py-3.5">
                    <CardTitle className="text-lg lg:text-xl font-semibold flex items-center justify-between">
                      <span>Items</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-normal text-muted-foreground">
                          {
                            (isEditing
                              ? editedBill?.items
                              : selectedBill?.items
                            )?.length
                          }{" "}
                          item(s)
                        </span>
                        {isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addEditedItemRow}
                          >
                            <PackagePlus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide sticky left-0 bg-muted/60">
                              #
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide min-w-[250px]">
                              Description
                            </th>
                            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                              HSN
                            </th>
                            <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                              Qty
                            </th>
                            <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                              Rate
                            </th>
                            <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                              GST%
                            </th>
                            <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                              Amount
                            </th>
                            {isEditing && (
                              <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                                Actions
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(isEditing
                            ? editedBill?.items
                            : selectedBill?.items
                          )?.map((item, index) => (
                            <tr
                              key={index}
                              className={`border-t ${
                                item.hasError
                                  ? "bg-amber-50 dark:bg-amber-900/20"
                                  : ""
                              }`}
                            >
                              <td className="px-4 py-3 font-medium sticky left-0 bg-background text-sm">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3 max-w-md">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <ProductAutocomplete
                                      products={products}
                                      value={item.description}
                                      onChange={(val) =>
                                        updateEditedItem(index, "description", val)
                                      }
                                      onSelect={(product) => handleProductSelect(index, product)}
                                      placeholder="Item / Product name"
                                      type="name"
                                      className="h-9 text-sm"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <Input
                                        value={(item as any).whereToBuy || ""}
                                        onChange={(e) =>
                                          updateEditedItem(
                                            index,
                                            "whereToBuy" as any,
                                            e.target.value,
                                          )
                                        }
                                        className="h-8 text-sm"
                                        placeholder="Bought from (optional)"
                                      />
                                      <Input
                                        value={(item as any).weight || ""}
                                        onChange={(e) =>
                                          updateEditedItem(
                                            index,
                                            "weight" as any,
                                            e.target.value,
                                          )
                                        }
                                        className="h-8 text-sm"
                                        placeholder="Weight (optional)"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium break-words text-sm">
                                      {item.description}
                                    </div>
                                    {(item as any).whereToBuy && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Bought from: {(item as any).whereToBuy}
                                      </div>
                                    )}
                                    {(item as any).weight && (
                                      <div className="text-xs text-muted-foreground">
                                        Weight: {(item as any).weight}
                                      </div>
                                    )}
                                    {item.hasError && (
                                      <p className="text-xs text-amber-600 mt-1">
                                        {item.errorMessage}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isEditing ? (
                                  <ProductAutocomplete
                                    products={products}
                                    value={item.hsnCode || ""}
                                    onChange={(val) =>
                                      updateEditedItem(index, "hsnCode", val)
                                    }
                                    onSelect={(product) => handleProductSelect(index, product)}
                                    placeholder="HSN"
                                    type="hsn"
                                    className="h-9 w-28 mx-auto text-sm"
                                  />
                                ) : (
                                  <span className="text-sm">
                                    {item.hsnCode || "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateEditedItem(
                                          index,
                                          "quantity",
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                      className="h-9 w-20 text-right text-sm"
                                    />
                                    <Input
                                      value={item.unit}
                                      onChange={(e) =>
                                        updateEditedItem(
                                          index,
                                          "unit",
                                          e.target.value,
                                        )
                                      }
                                      className="h-9 w-16 text-sm"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-medium text-sm">
                                    {item.quantity} {item.unit}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.rate}
                                    onChange={(e) =>
                                      updateEditedItem(
                                        index,
                                        "rate",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="h-9 w-28 text-right text-sm"
                                  />
                                ) : (
                                  <span className="text-sm">
                                    {formatCurrency(item.rate)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={item.gstRate || 0}
                                    onChange={(e) =>
                                      updateEditedItem(
                                        index,
                                        "gstRate",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="h-9 w-20 text-right text-sm"
                                  />
                                ) : (
                                  <span className="font-medium text-sm">
                                    {item.gstRate || 0}%
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-sm">
                                {formatCurrency(item.amount)}
                              </td>
                              {isEditing && (
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeEditedItemRow(index)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Purchase Returns Section */}
                {selectedBill?.returns && selectedBill.returns.length > 0 && (
                  <Card className="overflow-hidden shadow-sm border-2 border-orange-200 bg-orange-50/5">
                    <CardHeader className="bg-orange-100/30 px-5 py-3.5">
                      <CardTitle className="text-lg lg:text-xl font-semibold flex items-center gap-2 text-orange-600">
                        <RotateCcw className="h-5 w-5" />
                        Purchase Returns
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-orange-100/50">
                            <tr>
                              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                                Item / Reason
                              </th>
                              <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                                Qty
                              </th>
                              <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                                Date
                              </th>
                              <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                                Value
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-orange-100">
                            {selectedBill.returns.map((ret) =>
                              ret.items.map((item, idx) => (
                                <tr
                                  key={`${ret.id}-${idx}`}
                                  className="hover:bg-orange-100/10"
                                >
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      <p className="font-semibold text-sm text-foreground">
                                        {item.description}
                                      </p>
                                      {ret.notes && (
                                        <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                                          <BookOpen className="h-3 w-3" />{" "}
                                          {ret.notes}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge
                                      variant="outline"
                                      className="text-orange-600 border-orange-200 bg-orange-100/50 font-semibold text-xs"
                                    >
                                      -{item.quantity}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-right text-muted-foreground text-sm">
                                    {formatDate(ret.returnDate)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-orange-600">
                                    -
                                    {formatCurrency(
                                      item.quantity *
                                        item.rate *
                                        (1 + (item.gstRate || 0) / 100),
                                    )}
                                  </td>
                                </tr>
                              )),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Totals Summary */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-muted/40 px-5 py-3.5">
                    <CardTitle className="text-lg lg:text-xl font-semibold">
                      Bill Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 px-5 pb-5">
                    <div className="max-w-lg ml-auto space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            isEditing
                              ? editedBill?.items.reduce(
                                  (sum, item) => sum + item.amount,
                                  0,
                                ) || 0
                              : selectedBill?.subtotal || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Tax Amount
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(
                            isEditing
                              ? editedBill?.items.reduce(
                                  (sum, item) => sum + (item.gstAmount || 0),
                                  0,
                                ) || 0
                              : selectedBill?.totalTax || 0,
                          )}
                        </span>
                      </div>
                      <div className="border-t-2 border-primary pt-3 space-y-2.5">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Original Bill Amount</span>
                          <span className="font-semibold">
                            {formatCurrency(
                              isEditing
                                ? (editedBill?.items.reduce(
                                    (sum, item) => sum + item.amount,
                                    0,
                                  ) || 0) +
                                    (editedBill?.items.reduce(
                                      (sum, item) =>
                                        sum + (item.gstAmount || 0),
                                      0,
                                    ) || 0)
                                : selectedBill?.total || 0,
                            )}
                          </span>
                        </div>
                        {selectedBill?.returns &&
                          selectedBill.returns.length > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>- Returns</span>
                              <span className="font-semibold">
                                {formatCurrency(
                                  selectedBill.returns.reduce(
                                    (sum, r) => sum + r.totalReturnValue,
                                    0,
                                  ),
                                )}
                              </span>
                            </div>
                          )}
                        <div className="flex justify-between text-xl lg:text-2xl pt-2 border-t">
                          <span className="font-bold">Current Total</span>
                          <span className="font-bold text-primary">
                            {formatCurrency(
                              (isEditing
                                ? (editedBill?.items.reduce(
                                    (sum, item) => sum + item.amount,
                                    0,
                                  ) || 0) +
                                  (editedBill?.items.reduce(
                                    (sum, item) => sum + (item.gstAmount || 0),
                                    0,
                                  ) || 0)
                                : selectedBill?.total || 0) -
                                (selectedBill?.returns?.reduce(
                                  (sum, r) => sum + r.totalReturnValue,
                                  0,
                                ) || 0),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          {/* Sticky footer actions (always visible on mobile) */}
          {!isEditing && selectedBill && (
            <div className="shrink-0 border-t bg-background px-6 sm:px-8 py-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <div className="flex flex-col lg:flex-row gap-3 justify-end">
                {!selectedBill.itemsAddedToInventory ? (
                  <Button
                    onClick={() => handleAddToInventory(selectedBill)}
                    size="default"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={loadingInventory === selectedBill.id}
                  >
                    {loadingInventory === selectedBill.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <PackagePlus className="h-4 w-4 mr-2" />
                    )}
                    Add to Inventory
                  </Button>
                ) : (
                  <Badge variant="secondary" className="py-2 px-4 text-sm">
                    <PackagePlus className="h-4 w-4 mr-2" />
                    Added to Inventory
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setViewImageBill(selectedBill)}
                >
                  <Image className="h-4 w-4 mr-2" />
                  View Original Bill
                </Button>
                <Button
                  size="default"
                  variant={
                    selectedBill.paymentStatus === "paid"
                      ? "secondary"
                      : "default"
                  }
                  onClick={() => {
                    handleTogglePayment(selectedBill);
                    setSelectedBill({
                      ...selectedBill,
                      paymentStatus:
                        selectedBill.paymentStatus === "paid"
                          ? "pending"
                          : "paid",
                    });
                  }}
                >
                  {selectedBill.paymentStatus === "paid"
                    ? "Mark as Pending"
                    : "Mark as Paid"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inventory Dialog - Enter Selling Prices */}
      <Dialog
        open={!!inventoryDialogBill}
        onOpenChange={(open) => !open && setInventoryDialogBill(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-emerald-600" />
              Add to Inventory - Set Selling Prices
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {lastInventoryError && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">Inventory error details</div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            lastInventoryError,
                          );
                          toast({
                            title: "Copied",
                            description: "Error details copied to clipboard",
                          });
                        } catch {
                          toast({
                            title: "Copy failed",
                            description:
                              "Could not copy automatically. Please screenshot this section.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLastInventoryError(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                  {lastInventoryError}
                </pre>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Enter the selling price for each item. Purchase price is shown for
              reference.
            </p>

            <div className="space-y-3">
              {inventoryItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit} | HSN:{" "}
                        {item.hsnCode || "N/A"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      GST: {item.gstRate}%
                    </Badge>
                  </div>

                  {/* Matching Option */}
                  <div className="mt-2 p-2 bg-background/50 rounded-md border border-dashed">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 px-1">
                      Inventory Action
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={item.isNewProduct ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8 text-xs py-0"
                        onClick={() => {
                          const newItems = [...inventoryItems];
                          newItems[index].isNewProduct = true;
                          setInventoryItems(newItems);
                        }}
                      >
                        Create New
                      </Button>
                      <Button
                        type="button"
                        variant={!item.isNewProduct ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8 text-xs py-0"
                        onClick={() => {
                          const newItems = [...inventoryItems];
                          newItems[index].isNewProduct = false;
                          setInventoryItems(newItems);
                        }}
                      >
                        Update Stock
                      </Button>
                    </div>

                    {/* Product Selector for Update Stock */}
                    {!item.isNewProduct && (
                      <div className="mt-2 space-y-1">
                        <Label className="text-[10px] px-1">
                          Selected Product
                        </Label>
                        <Select
                          value={item.productId || ""}
                          onValueChange={(val) => {
                            const newItems = [...inventoryItems];
                            newItems[index].productId = val;
                            const selectedProduct = products.find(
                              (p) => p.id === val,
                            );
                            if (selectedProduct) {
                              newItems[index].hsnCode =
                                selectedProduct.hsnCode || "";
                            }
                            setInventoryItems(newItems);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem
                                key={p.id}
                                value={p.id}
                                className="text-xs"
                              >
                                {p.name} (₹{p.sellingPrice})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {!item.productId && !item.isNewProduct && (
                      <p className="text-[10px] text-amber-600 mt-1 px-1">
                        No matching product found by name/HSN. Please select one
                        manually.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Vendor *</Label>
                      <Select
                        value={item.vendorId}
                        onValueChange={(val) => {
                          const newItems = [...inventoryItems];
                          newItems[index].vendorId = val;
                          setInventoryItems(newItems);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Weight (optional)</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-9 flex-1"
                          value={item.weight}
                          onChange={(e) => {
                            const newItems = [...inventoryItems];
                            newItems[index].weight =
                              parseFloat(e.target.value) || 0;
                            setInventoryItems(newItems);
                          }}
                          placeholder="0.00"
                        />
                        <Select
                          value={item.weightUnit}
                          onValueChange={(val) => {
                            const newItems = [...inventoryItems];
                            newItems[index].weightUnit = val;
                            setInventoryItems(newItems);
                          }}
                        >
                          <SelectTrigger className="h-9 w-16 px-1">
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Purchase Price
                      </Label>
                      <div className="text-sm font-medium bg-muted px-3 py-2 rounded">
                        ₹{item.purchasePrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Barcode (Optional)</Label>
                      <Input
                        placeholder="Scan or type barcode"
                        value={item.barcode || ""}
                        onChange={(e) => {
                          const newItems = [...inventoryItems];
                          newItems[index].barcode = e.target.value;
                          setInventoryItems(newItems);
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Selling Price *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.sellingPrice}
                        onChange={(e) =>
                          updateInventoryItemSellingPrice(
                            index,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                  {item.sellingPrice > 0 && (
                    <p className="text-xs text-emerald-600 mt-2">
                      Margin: ₹
                      {(item.sellingPrice - item.purchasePrice).toFixed(2)}(
                      {(
                        ((item.sellingPrice - item.purchasePrice) /
                          item.purchasePrice) *
                        100
                      ).toFixed(1)}
                      %)
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setInventoryDialogBill(null)}
                disabled={!!loadingInventory}
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmAddToInventory()}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!!loadingInventory}
              >
                {loadingInventory ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PackagePlus className="h-4 w-4 mr-2" />}
                Add to Inventory
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConflictResolutionDialog
        conflicts={productConflicts}
        onResolve={handleConflictResolution}
        onCancel={handleConflictCancel}
        resolving={loading}
      />
      {selectedBillForPayment && (
        <PaymentDialog
          bill={selectedBillForPayment as any}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onPaymentCollected={handlePaymentCollected}
        />
      )}
      <PurchaseReturnForm
        open={returnDialogOpen}
        onOpenChange={(open) => {
          setReturnDialogOpen(open);
          if (!open) setEditingReturn(null);
        }}
        bill={selectedBillForReturn!}
        onSuccess={loadBills}
        editReturn={editingReturn}
      />
      {/* Transaction History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryDialogOpen(false);
            setEditingTransaction(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <DialogHeader className="p-8 border-b shrink-0 bg-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-background/20 rounded-lg backdrop-blur-sm">
                    <Clock className="h-6 w-6 text-primary-foreground" />
                  </div>
                  Transaction History
                </DialogTitle>
                {selectedBillForHistory && (
                  <p className="text-primary-foreground/80 font-medium">
                    Bill #{selectedBillForHistory.billNumber || "N/A"} •{" "}
                    {selectedBillForHistory.vendorName}
                  </p>
                )}
              </div>
              {selectedBillForHistory && (
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-primary-foreground/70 uppercase font-bold tracking-widest opacity-80">
                    Remaining Balance
                  </p>
                  <p className="text-2xl font-black text-primary-foreground">
                    {formatCurrency(
                      selectedBillForHistory.total -
                        (selectedBillForHistory.returns?.reduce(
                          (sum, r) => sum + r.totalReturnValue,
                          0,
                        ) || 0) -
                        selectedBillForHistory.paidAmount,
                    )}
                  </p>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-background">
            {selectedBillForHistory && (
              <div className="p-6 space-y-6">
                {/* Summary Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="p-4 border shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                      Total Bill
                    </p>
                    <p className="text-lg font-bold">
                      {formatCurrency(selectedBillForHistory.total)}
                    </p>
                  </Card>
                  <Card className="p-4 border shadow-sm">
                    <p className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-bold mb-1">
                      Returns
                    </p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      -
                      {formatCurrency(
                        selectedBillForHistory.returns?.reduce(
                          (sum, r) => sum + r.totalReturnValue,
                          0,
                        ) || 0,
                      )}
                    </p>
                  </Card>
                  <Card className="p-4 border shadow-sm">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1">
                      Total Paid
                    </p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedBillForHistory.paidAmount)}
                    </p>
                  </Card>
                  <Card className="p-4 border shadow-sm bg-accent/50 border-accent">
                    <p className="text-[10px] text-accent-foreground uppercase font-bold mb-1">
                      Net Payable
                    </p>
                    <p className="text-lg font-black text-accent-foreground">
                      {formatCurrency(
                        selectedBillForHistory.total -
                          (selectedBillForHistory.returns?.reduce(
                            (sum, r) => sum + r.totalReturnValue,
                            0,
                          ) || 0),
                      )}
                    </p>
                  </Card>
                  <Card className="p-4 border shadow-sm bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold mb-1">
                      Available Stock
                    </p>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {getAvailableStockForBill(selectedBillForHistory)} Units
                    </p>
                  </Card>
                </div>

                {/* Timeline Table */}
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="text-left p-4 font-bold text-xs uppercase text-muted-foreground">
                          Date
                        </th>
                        <th className="text-left p-4 font-bold text-xs uppercase text-muted-foreground">
                          Type
                        </th>
                        <th className="text-left p-4 font-bold text-xs uppercase text-muted-foreground">
                          Details
                        </th>
                        <th className="text-right p-4 font-bold text-xs uppercase text-muted-foreground">
                          Qty
                        </th>
                        <th className="text-right p-4 font-bold text-xs uppercase text-muted-foreground">
                          Amount
                        </th>
                        <th className="p-4 font-bold text-xs uppercase text-muted-foreground text-center">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {getPurchaseHistory(selectedBillForHistory).map(
                        (entry: any) => (
                          <tr
                            key={entry.id}
                            className="hover:bg-muted/50 transition-colors group"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {formatDate(entry.date)}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  entry.type === "purchase_payment"
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                }`}
                              >
                                {entry.type === "purchase_payment" ? "Payment" : "Return"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <p className="text-sm font-medium text-foreground max-w-[250px] leading-relaxed">
                                {entry.description}
                              </p>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-bold tabular-nums">
                                {entry.quantity || "—"}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span
                                className={`font-black tabular-nums text-sm ${
                                  entry.type === "purchase_payment" 
                                    ? "text-red-600 dark:text-red-400" 
                                    : "text-green-600 dark:text-green-400"
                                }`}
                              >
                                {entry.type === "purchase_payment" ? "-" : "+"}
                                {formatCurrency(entry.amount)}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {entry.type !== "purchase" && (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    onClick={() => handleEditTransaction(entry)}
                                    disabled={isUpdatingTransaction === entry.id}
                                  >
                                    {isUpdatingTransaction === entry.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Edit2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        disabled={isUpdatingTransaction === entry.id}
                                      >
                                        {isUpdatingTransaction === entry.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-2xl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl font-bold">
                                          Delete Transaction?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently remove this{" "}
                                          {entry.type} entry and update the bill
                                          balance.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel 
                                          className="rounded-xl"
                                          disabled={isUpdatingTransaction === entry.id}
                                        >
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteTransaction(entry)
                                          }
                                          className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          disabled={isUpdatingTransaction === entry.id}
                                        >
                                          {isUpdatingTransaction === entry.id ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          ) : null}
                                          Delete Forever
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Inline Edit Section */}
          {editingTransaction && (
            <div className="p-6 border-t bg-muted shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 max-w-2xl mx-auto">
                <div className="space-y-2 flex-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Update Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      ₹
                    </span>
                    <Input
                      type="number"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      className="pl-8 h-12 rounded-xl text-lg font-bold"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingTransaction(null)}
                    className="h-12 px-6 rounded-xl"
                    disabled={!!isUpdatingTransaction}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEditedTransaction}
                    className="h-12 px-8 rounded-xl font-bold"
                    disabled={!!isUpdatingTransaction}
                  >
                    {isUpdatingTransaction ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 border-t bg-white shrink-0 flex justify-between items-center">
            <div className="text-xs text-muted-foreground italic">
              * Click edit icon to modify individual payments
            </div>
            <Button
              variant="secondary"
              onClick={() => setHistoryDialogOpen(false)}
              className="px-8 rounded-xl font-bold"
            >
              Close History
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PurchaseBills;
