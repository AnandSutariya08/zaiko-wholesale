import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getBills,
  getReturnedQuantity,
  processBillReturn,
  getBillReturns,
  getDeadstock,
  getProducts,
  getProductTransactions,
} from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/billUtils";
import { Bill, BillReturn, DeadstockItem, BillItem } from "@/types";
import {
  RotateCcw,
  Search,
  Package,
  PackageX,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Filter,
  Clock,
  IndianRupee,
  Boxes,
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface ReturnItemForm {
  productId: string;
  productName: string;
  inventoryUnitId?: string;
  imeiNumber?: string;
  maxQuantity: number;
  quantity: number;
  condition: "good" | "bad";
  returnReason: string;
  costPrice: number;
}

const normalizeImei = (value?: string) =>
  (value || "").toString().replace(/\s+/g, "").trim().toLowerCase();

const buildReturnTrackingKey = (item: {
  productId: string;
  inventoryUnitId?: string;
  imeiNumber?: string;
}) => {
  if (item.inventoryUnitId) return `unit:${item.inventoryUnitId}`;
  const imei = normalizeImei(item.imeiNumber);
  if (imei) return `imei:${imei}`;
  return `product:${item.productId}`;
};

export default function Returns() {
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [returns, setReturns] = useState<BillReturn[]>([]);
  const [deadstock, setDeadstock] = useState<DeadstockItem[]>([]);
  const [searchBill, setSearchBill] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemForm[]>([]);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "create" | "history" | "deadstock"
  >("create");
  const [returnedQuantities, setReturnedQuantities] = useState<
    Record<string, Record<string, number>>
  >({});
  const [processingReturn, setProcessingReturn] = useState(false);
  const [returnMode, setReturnMode] = useState<
    "item_wise" | "full_bill" | "amount_only"
  >("item_wise");
  const [customReturnAmount, setCustomReturnAmount] = useState("");
  const [refundPaidAmount, setRefundPaidAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [productTransactionsMap, setProductTransactionsMap] = useState<
    Record<string, any[]>
  >({});
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    loadData();
    loadProductTransactions();
  }, []);

  // Load product transactions for historical cost calculation
  const loadProductTransactions = async () => {
    const products = await getProducts();
    const transactionsMap: Record<string, any[]> = {};

    await Promise.all(
      products.map(async (product) => {
        const transactions = await getProductTransactions(product.id);
        if (transactions && transactions.length > 0) {
          // Sort transactions by date
          transactionsMap[product.id] = transactions.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
        }
      })
    );

    setProductTransactionsMap(transactionsMap);
  };

  // Function to calculate historical average cost at a specific date
  // This uses weighted average method - calculates what the average cost was at that point in time
  // This is the industry-standard approach for accurate historical cost calculation
  const getHistoricalAverageCost = (
    productId: string,
    saleDate: string,
    product: any
  ): number => {
    if (!product) return 0;

    const transactions = productTransactionsMap[productId];
    if (!transactions || transactions.length === 0) {
      return product.purchasePrice || product.price || 0;
    }

    const saleDateTime = new Date(saleDate).getTime();
    let totalPurchaseValue = 0;
    let totalPurchaseQuantity = 0;
    let currentInventory = 0; // Running inventory balance
    let currentInventoryValue = 0; // Running inventory value

    // Process all transactions chronologically up to (but not including) the sale date
    for (const transaction of transactions) {
      const transactionDate = new Date(transaction.date).getTime();

      // Only consider transactions before the sale date
      if (transactionDate < saleDateTime) {
        if (transaction.type === "purchase" && transaction.purchasePrice) {
          // Add purchase to inventory
          const purchaseValue =
            transaction.quantity * transaction.purchasePrice;
          currentInventory += transaction.quantity;
          currentInventoryValue += purchaseValue;
          totalPurchaseValue += purchaseValue;
          totalPurchaseQuantity += transaction.quantity;
        } else if (transaction.type === "sale") {
          // Remove sale from inventory using weighted average cost
          if (currentInventory > 0) {
            const averageCostAtSale = currentInventoryValue / currentInventory;
            const saleValue = transaction.quantity * averageCostAtSale;
            currentInventory -= transaction.quantity;
            currentInventoryValue -= saleValue;
          } else {
            // No inventory, but sale occurred - use last known cost
            currentInventory = Math.max(
              0,
              currentInventory - transaction.quantity
            );
          }
        } else if (transaction.type === "return") {
          const returnRecord = returns.find(
            (r) =>
              r.id === transaction.billReturnId || r.id === transaction.billId,
          );
          const returnItem = returnRecord?.items.find(
            (ri) => ri.productId === productId,
          );
          // Only good returns go back to inventory cost basis.
          if (returnItem?.condition !== "good") {
            continue;
          }

          // Returns: good returns go back to inventory at their original cost
          if (currentInventory > 0) {
            const avgCost = currentInventoryValue / currentInventory;
            currentInventory += transaction.quantity;
            currentInventoryValue += transaction.quantity * avgCost;
          } else {
            // No current inventory, use last purchase price if available
            const lastPurchase = transactions
              .filter(
                (t) =>
                  t.type === "purchase" &&
                  t.purchasePrice &&
                  new Date(t.date).getTime() < transactionDate
              )
              .slice(-1)[0];
            if (lastPurchase && lastPurchase.purchasePrice) {
              currentInventory += transaction.quantity;
              currentInventoryValue +=
                transaction.quantity * lastPurchase.purchasePrice;
            }
          }
        } else if (
          transaction.type === "purchase_return" &&
          transaction.purchasePrice
        ) {
          // Vendor returns reduce inventory/value at explicit purchase price.
          const returnQty = Math.abs(transaction.quantity);
          const returnValue = returnQty * transaction.purchasePrice;
          currentInventory = Math.max(0, currentInventory - returnQty);
          currentInventoryValue = Math.max(0, currentInventoryValue - returnValue);
        }
      }
    }

    // Calculate weighted average cost at the time of sale
    if (currentInventory > 0) {
      // Use the running average cost of available inventory
      return currentInventoryValue / currentInventory;
    } else if (totalPurchaseQuantity > 0) {
      // No inventory available, but we have purchase history - use overall average
      return totalPurchaseValue / totalPurchaseQuantity;
    } else {
      // Fallback to product default price
      return product.purchasePrice || product.price || 0;
    }
  };

  const loadData = async () => {
    setLoading(true);
    const [allBillsData, returnsData, deadstockData] = await Promise.all([
      getBills(),
      getBillReturns(),
      getDeadstock(),
    ]);
    const allBills = allBillsData.filter(
      (b) =>
        b.paymentStatus === "paid" ||
        b.paymentStatus === "pending" ||
        b.paymentStatus === "overdue"
    );
    setBills(allBills);
    setReturns(returnsData);
    setDeadstock(deadstockData);

    // Load returned quantities for all bills
    const quantities: Record<string, Record<string, number>> = {};
    for (const bill of allBills) {
      quantities[bill.id] = {};
      const billReturns = returnsData.filter((r) => r.billId === bill.id);
      for (const item of bill.items) {
        const key = buildReturnTrackingKey(item);
        if (key.startsWith("product:")) {
          if (quantities[bill.id][key] === undefined) {
            quantities[bill.id][key] = await getReturnedQuantity(
              bill.id,
              item.productId,
            );
          }
          continue;
        }

        const alreadyReturned = billReturns.some((r) =>
          r.items.some(
            (ri) =>
              (item.inventoryUnitId &&
                ri.inventoryUnitId &&
                ri.inventoryUnitId === item.inventoryUnitId) ||
              (!!item.imeiNumber &&
                !!ri.imeiNumber &&
                normalizeImei(ri.imeiNumber) === normalizeImei(item.imeiNumber)),
          ),
        );
        quantities[bill.id][key] = alreadyReturned ? 1 : 0;
      }
    }
    setReturnedQuantities(quantities);
    setLoading(false);
  };

  const filteredBills = bills.filter(
    (bill) =>
      bill.billNumber.toLowerCase().includes(searchBill.toLowerCase()) ||
      bill.client.name.toLowerCase().includes(searchBill.toLowerCase())
  );

  const handleSelectBill = async (bill: Bill) => {
    setSelectedBill(bill);

    // Initialize return items with available quantities
    const productsData = await getProducts();
    const itemsPromises = bill.items.map(async (item) => {
      const isSerialized = Boolean(item.inventoryUnitId || item.imeiNumber);
      let returnedQty = 0;
      if (isSerialized) {
        const alreadyReturned = returns.some((r) =>
          r.billId === bill.id &&
          r.items.some(
            (ri) =>
              (ri.inventoryUnitId && ri.inventoryUnitId === item.inventoryUnitId) ||
              (!!ri.imeiNumber &&
                !!item.imeiNumber &&
                ri.imeiNumber.replace(/\s+/g, "").toLowerCase() ===
                  item.imeiNumber.replace(/\s+/g, "").toLowerCase()),
          ),
        );
        returnedQty = alreadyReturned ? 1 : 0;
      } else {
        returnedQty = await getReturnedQuantity(bill.id, item.productId);
      }
      const product = productsData.find((p) => p.id === item.productId);

      // Use HISTORICAL average cost at the time of the original sale
      // This ensures return value calculations reflect the actual cost basis when the sale occurred
      const costPrice = product
        ? getHistoricalAverageCost(product.id, bill.date, product)
        : item.ratePerUnit; // Fallback to selling price if product not found

      return {
        productId: item.productId,
        productName: item.productName,
        inventoryUnitId: item.inventoryUnitId,
        imeiNumber: item.imeiNumber,
        maxQuantity: isSerialized ? (returnedQty > 0 ? 0 : 1) : item.quantity - returnedQty,
        quantity: isSerialized && returnedQty === 0 ? 1 : 0,
        condition: "good" as const,
        returnReason: "",
        costPrice: costPrice,
      };
    });

    const items = (await Promise.all(itemsPromises)).filter(
      (item) => item.maxQuantity > 0
    );

    setReturnItems(items);
    setReturnMode("item_wise");
    setCustomReturnAmount("");
    setRefundPaidAmount("");
    setRefundNote("");
    setShowReturnDialog(true);
  };

  const updateReturnItem = (
    index: number,
    updates: Partial<ReturnItemForm>
  ) => {
    setReturnItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleProcessReturn = async () => {
    setProcessingReturn(true);
    const itemsToReturn =
      returnMode === "amount_only"
        ? []
        : returnMode === "full_bill"
          ? returnItems
              .filter((item) => item.maxQuantity > 0)
              .map((item) => ({ ...item, quantity: item.maxQuantity }))
          : returnItems.filter((item) => item.quantity > 0);

    const amountOnlyReturn = parseFloat(customReturnAmount || "0") || 0;
    const calculatedItemReturnAmount = itemsToReturn.reduce((sum, item) => {
      const matchedBillItem =
        selectedBill?.items.find(
          (billItem) =>
            Boolean(item.inventoryUnitId) &&
            Boolean(billItem.inventoryUnitId) &&
            billItem.inventoryUnitId === item.inventoryUnitId,
        ) ||
        selectedBill?.items.find(
          (billItem) =>
            normalizeImei(item.imeiNumber) &&
            normalizeImei(billItem.imeiNumber) === normalizeImei(item.imeiNumber),
        ) ||
        selectedBill?.items.find((billItem) => billItem.productId === item.productId);
      if (!matchedBillItem || matchedBillItem.quantity <= 0) return sum;
      const lineTotal =
        (matchedBillItem.amount || 0) +
        (matchedBillItem.cgst || 0) +
        (matchedBillItem.sgst || 0) +
        (matchedBillItem.igst || 0);
      const perUnit = lineTotal / matchedBillItem.quantity;
      return sum + item.quantity * perUnit;
    }, 0);
    const effectiveReturnAmount =
      returnMode === "amount_only" ? amountOnlyReturn : calculatedItemReturnAmount;
    const refundPaid = parseFloat(refundPaidAmount || "0") || 0;
    const billTotal = selectedBill?.total || 0;
    const billPaid = selectedBill?.paidAmount || 0;

    if (returnMode !== "amount_only" && itemsToReturn.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to return",
        variant: "destructive",
      });
      setProcessingReturn(false);
      return;
    }

    if (returnMode === "amount_only" && amountOnlyReturn <= 0) {
      toast({
        title: "Invalid return amount",
        description: "Enter a return amount greater than 0",
        variant: "destructive",
      });
      setProcessingReturn(false);
      return;
    }

    if (effectiveReturnAmount > billTotal) {
      toast({
        title: "Invalid return value",
        description: "Return value cannot be greater than the bill value",
        variant: "destructive",
      });
      setProcessingReturn(false);
      return;
    }

    if (refundPaid < 0 || refundPaid > effectiveReturnAmount) {
      toast({
        title: "Invalid refund paid",
        description: "Refund paid must be between 0 and total return value",
        variant: "destructive",
      });
      setProcessingReturn(false);
      return;
    }

    if (refundPaid > billPaid) {
      toast({
        title: "Invalid refund paid",
        description: "Refund paid cannot be more than amount received",
        variant: "destructive",
      });
      setProcessingReturn(false);
      return;
    }

    // Validate quantities
    for (const item of itemsToReturn.filter((i) => returnMode !== "amount_only")) {
      if (item.quantity > item.maxQuantity) {
        toast({
          title: "Invalid quantity",
          description: `${item.productName}: Cannot return more than sold quantity`,
          variant: "destructive",
        });
        return;
      }
      if ((item.inventoryUnitId || item.imeiNumber) && item.quantity !== 1) {
        toast({
          title: "Invalid quantity",
          description: `${item.productName}: IMEI/Serial returns must be quantity 1`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await processBillReturn(selectedBill!.id, itemsToReturn, {
        returnMode,
        customReturnAmount: returnMode === "amount_only" ? amountOnlyReturn : 0,
        refundPaidAmount: refundPaid,
        refundNote,
      });

      const goodItems = itemsToReturn.filter((i) => i.condition === "good");
      const badItems = itemsToReturn.filter((i) => i.condition === "bad");

      toast({
        title: "Return processed successfully",
        description: `${goodItems.length} items returned to inventory, ${badItems.length} items added to deadstock`,
      });

      setShowReturnDialog(false);
      setSelectedBill(null);
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process return",
        variant: "destructive",
      });
    } finally {
      setProcessingReturn(false);
    }
  };

  const totalDeadstockLoss = deadstock.reduce(
    (sum, item) => sum + item.quantity * item.costPrice,
    0
  );
  const totalGoodReturns = returns.reduce(
    (sum, r) =>
      sum +
      r.items
        .filter((i) => i.condition === "good")
        .reduce((itemSum, i) => itemSum + i.quantity, 0),
    0
  );
  const totalBadReturns = returns.reduce(
    (sum, r) =>
      sum +
      r.items
        .filter((i) => i.condition === "bad")
        .reduce((itemSum, i) => itemSum + i.quantity, 0),
    0
  );
  const returnableBills = bills.filter((bill) => {
    const billReturnedQty = returnedQuantities[bill.id] || {};
    const totalReturned = bill.items.reduce(
      (sum, item) =>
        sum + (billReturnedQty[buildReturnTrackingKey(item)] || 0),
      0
    );
    const totalSold = bill.items.reduce((sum, item) => sum + item.quantity, 0);
    return totalReturned < totalSold;
  }).length;

  
  if (loading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner size="xl" text="Loading products..." fullScreen contentAreaOnly />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden">
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-slate-50/40 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center justify-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-border">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-left">
              <h1 className="truncate text-2xl font-semibold leading-tight sm:text-3xl">
                Returns
              </h1>
              <p className="text-sm text-muted-foreground">
                Process sales returns and manage deadstock
              </p>
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 rounded-xl border border-border/70 bg-muted/30 p-2 lg:w-auto">
            <Button
              variant={activeTab === "create" ? "default" : "outline"}
              onClick={() => setActiveTab("create")}
              className="h-10 rounded-xl px-3 text-sm"
            >
              Process
            </Button>
            <Button
              variant={activeTab === "history" ? "default" : "outline"}
              onClick={() => setActiveTab("history")}
              className="h-10 rounded-xl px-3 text-sm"
            >
              History
            </Button>
            <Button
              variant={activeTab === "deadstock" ? "default" : "outline"}
              onClick={() => setActiveTab("deadstock")}
              className="h-10 rounded-xl px-3 text-sm"
            >
              Deadstock
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-background/70 p-2 sm:p-4">
      <div className="h-full overflow-y-auto space-y-5 pr-1 sm:pr-2">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="border-slate-200 bg-gradient-to-br from-slate-100/70 to-slate-50 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              <Boxes className="h-3 w-3 text-slate-500" /> Total Returns
            </p>
            <p className="truncate text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">
              {returns.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-100/60 to-emerald-50 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <Package className="h-3 w-3" /> Good Returns
            </p>
            <p className="truncate text-lg font-bold text-emerald-700 sm:text-xl dark:text-emerald-400">
              {totalGoodReturns} items
            </p>
            <p className="text-[11px] text-muted-foreground">Back to inventory</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-100/60 to-orange-50 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
              <Clock className="h-3 w-3" /> Returnable Bills
            </p>
            <p className="truncate text-lg font-bold text-orange-700 sm:text-xl dark:text-orange-400">
              {returnableBills}
            </p>
            <p className="text-[11px] text-muted-foreground">Ready to process</p>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-gradient-to-br from-rose-100/60 to-rose-50 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
              <PackageX className="h-3 w-3" /> Bad Returns
            </p>
            <p className="truncate text-lg font-bold text-rose-700 sm:text-xl dark:text-rose-400">
              {totalBadReturns} items
            </p>
            <p className="text-[11px] text-muted-foreground">Moved to deadstock</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 border-blue-200 bg-gradient-to-br from-blue-100/60 to-blue-50 shadow-sm lg:col-span-1">
          <CardContent className="p-3 sm:p-4">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              <IndianRupee className="h-3 w-3" /> Deadstock Loss
            </p>
            <p className="truncate text-lg font-bold text-blue-700 sm:text-xl dark:text-blue-400">
              {formatCurrency(totalDeadstockLoss)}
            </p>
            <p className="text-[11px] text-muted-foreground">{deadstock.length} items</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Return Tab */}
      {activeTab === "create" && (
        <Card>
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              Select Invoice for Return
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or client name..."
                value={searchBill}
                onChange={(e) => setSearchBill(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>

            <div className="space-y-2 max-h-[350px] sm:max-h-[400px] overflow-y-auto">
              {filteredBills.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground px-4">
                  <RotateCcw className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-50" />
                  <p className="text-sm sm:text-base">No invoices found</p>
                  <p className="text-xs sm:text-sm mt-1">
                    Create invoices to process returns
                  </p>
                </div>
              ) : (
                filteredBills.map((bill) => {
                  const billReturnedQty = returnedQuantities[bill.id] || {};
                  const totalReturned = bill.items.reduce(
                    (sum, item) =>
                      sum + (billReturnedQty[buildReturnTrackingKey(item)] || 0),
                    0
                  );
                  const totalSold = bill.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  );
                  const hasReturnableItems = totalReturned < totalSold;

                  return (
                    <div
                      key={bill.id}
                      className={`p-3 sm:p-4 border rounded-lg ${
                        hasReturnableItems
                          ? "hover:bg-accent/50 cursor-pointer"
                          : "opacity-50"
                      }`}
                      onClick={() =>
                        hasReturnableItems && handleSelectBill(bill)
                      }
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm sm:text-base">
                              {bill.billNumber}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {bill.client.name}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            {formatDate(bill.date)} - {bill.items.length} items
                          </p>
                        </div>
                        <div className="text-left sm:text-right flex flex-row sm:flex-col gap-2 sm:gap-0 items-center sm:items-end">
                          <p className="font-semibold text-sm sm:text-base">
                            {formatCurrency(bill.total)}
                          </p>
                          {totalReturned > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-xs sm:mt-1"
                            >
                              {totalReturned}/{totalSold} returned
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <Card>
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">
              Return History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {returns.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <RotateCcw className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-50" />
                <p className="text-sm sm:text-base">No returns processed yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {returns.map((ret) => (
                  <div key={ret.id} className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm sm:text-base">
                            {ret.billNumber}
                          </span>
                          <span className="text-muted-foreground text-xs sm:text-sm">
                            -
                          </span>
                          <span className="text-muted-foreground text-xs sm:text-sm truncate">
                            {ret.clientName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(ret.returnDate)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-600"
                          onClick={() => {
                            // Add edit logic here
                            toast({ title: "Edit feature", description: "Return edit is coming soon" });
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {ret.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm p-2 sm:p-3 bg-accent/30 rounded gap-2 sm:gap-0"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.condition === "good" ? (
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className="truncate">{item.productName}</span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="whitespace-nowrap">
                              Qty: {item.quantity}
                            </span>
                            <Badge
                              variant={
                                item.condition === "good"
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-xs"
                            >
                              {item.condition === "good"
                                ? "Inventory"
                                : "Deadstock"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deadstock Tab */}
      {activeTab === "deadstock" && (
        <Card>
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
              Deadstock (Loss)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {deadstock.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <PackageX className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-50" />
                <p className="text-sm sm:text-base">No deadstock items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deadstock.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 sm:p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50/50 dark:bg-red-950/20"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm sm:text-base break-words">
                          {item.productName}
                        </span>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Qty: {item.quantity} x{" "}
                          {formatCurrency(item.costPrice)}
                        </p>
                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1 break-words">
                          Reason: {item.reason}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-bold text-red-600 dark:text-red-400 text-base sm:text-lg">
                          -{formatCurrency(item.quantity * item.costPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm sm:text-base">
                      Total Loss
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 break-words">
                      {formatCurrency(totalDeadstockLoss)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="dialog-form-content max-w-[95vw] sm:max-w-2xl">
          <DialogHeader className="dialog-form-header">
            <DialogTitle className="text-base sm:text-lg md:text-xl pr-6 sm:pr-8 break-words">
              Process Return - {selectedBill?.billNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="dialog-form-body space-y-3 sm:space-y-4">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Client:{" "}
              <span className="font-medium text-foreground break-words">
                {selectedBill?.client.name}
              </span>
            </div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
              <Label className="text-xs sm:text-sm font-medium">Return Type</Label>
              <RadioGroup
                value={returnMode}
                onValueChange={(value) =>
                  setReturnMode(value as "item_wise" | "full_bill" | "amount_only")
                }
                className="flex flex-col gap-2 sm:flex-row sm:gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="item_wise" id="return-item-wise" />
                  <Label htmlFor="return-item-wise" className="text-xs sm:text-sm">
                    Item-wise Return
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full_bill" id="return-full-bill" />
                  <Label htmlFor="return-full-bill" className="text-xs sm:text-sm">
                    Full Bill Return
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="amount_only" id="return-amount-only" />
                  <Label htmlFor="return-amount-only" className="text-xs sm:text-sm">
                    Amount-only Return
                  </Label>
                </div>
              </RadioGroup>
              {returnMode === "amount_only" && (
                <div className="grid grid-cols-1 gap-2 sm:max-w-xs">
                  <Label className="text-xs sm:text-sm">Return Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={customReturnAmount}
                    onChange={(e) => setCustomReturnAmount(e.target.value)}
                  />
                </div>
              )}
            </div>

            {returnMode !== "amount_only" && returnItems.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-50" />
                <p className="text-sm sm:text-base">
                  All items from this bill have been returned
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {returnItems.map((item, index) => (
                  <Card
                    key={`${item.inventoryUnitId || item.imeiNumber || item.productId}-${index}`}
                    className="p-3 sm:p-4"
                  >
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0">
                        <span className="font-medium text-sm sm:text-base break-words flex-1">
                          {item.productName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs whitespace-nowrap"
                        >
                          Max: {item.maxQuantity}
                        </Badge>
                      </div>
                      {item.imeiNumber ? (
                        <p className="text-xs font-mono text-muted-foreground">
                          IMEI: {item.imeiNumber}
                        </p>
                      ) : null}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <Label className="text-xs sm:text-sm">
                            Return Quantity
                          </Label>
                            <Input
                              type="number"
                              min={0}
                              max={item.maxQuantity}
                              value={returnMode === "full_bill" ? item.maxQuantity : item.quantity}
                              disabled={
                                returnMode === "full_bill" ||
                                Boolean(item.imeiNumber || item.inventoryUnitId)
                              }
                              onChange={(e) =>
                                updateReturnItem(index, {
                                  quantity: parseInt(e.target.value) || 0,
                              })
                            }
                            className="text-sm mt-1"
                          />
                          {item.imeiNumber || item.inventoryUnitId ? (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Serialized item return is fixed to quantity 1.
                            </p>
                          ) : null}
                        </div>

                        {item.quantity > 0 && (
                          <div>
                            <Label className="text-xs sm:text-sm">
                              Condition
                            </Label>
                            <RadioGroup
                              value={item.condition}
                              onValueChange={(value) =>
                                updateReturnItem(index, {
                                  condition: value as "good" | "bad",
                                })
                              }
                              className="flex gap-3 sm:gap-4 mt-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="good"
                                  id={`good-${index}`}
                                />
                                <Label
                                  htmlFor={`good-${index}`}
                                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 cursor-pointer text-xs sm:text-sm"
                                >
                                  <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                                  Good
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="bad"
                                  id={`bad-${index}`}
                                />
                                <Label
                                  htmlFor={`bad-${index}`}
                                  className="flex items-center gap-1 text-red-600 dark:text-red-400 cursor-pointer text-xs sm:text-sm"
                                >
                                  <PackageX className="h-3 w-3 sm:h-4 sm:w-4" />
                                  Bad
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        )}
                      </div>

                      {item.quantity > 0 && item.condition === "bad" && (
                        <div>
                          <Label className="text-xs sm:text-sm">
                            Reason for Bad Condition
                          </Label>
                          <Textarea
                            placeholder="Describe why product is damaged/defective..."
                            value={item.returnReason}
                            onChange={(e) =>
                              updateReturnItem(index, {
                                returnReason: e.target.value,
                              })
                            }
                            className="text-xs sm:text-sm mt-1"
                          />
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Loss:{" "}
                            {formatCurrency(item.quantity * item.costPrice)}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs sm:text-sm">Refund Paid Now</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={refundPaidAmount}
                  onChange={(e) => setRefundPaidAmount(e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Received: {formatCurrency(selectedBill?.paidAmount || 0)}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Refund Note (optional)</Label>
                <Input
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Return value:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(
                  returnMode === "amount_only"
                    ? parseFloat(customReturnAmount || "0") || 0
                    : returnItems.reduce((sum, item) => {
                        const qty = returnMode === "full_bill" ? item.maxQuantity : item.quantity;
                        if (qty <= 0) return sum;
                        const matchedBillItem =
                          selectedBill?.items.find(
                            (billItem) =>
                              Boolean(item.inventoryUnitId) &&
                              Boolean(billItem.inventoryUnitId) &&
                              billItem.inventoryUnitId === item.inventoryUnitId,
                          ) ||
                          selectedBill?.items.find(
                            (billItem) =>
                              normalizeImei(item.imeiNumber) &&
                              normalizeImei(billItem.imeiNumber) ===
                                normalizeImei(item.imeiNumber),
                          ) ||
                          selectedBill?.items.find(
                            (billItem) => billItem.productId === item.productId,
                          );
                        if (!matchedBillItem || matchedBillItem.quantity <= 0) return sum;
                        const lineTotal =
                          (matchedBillItem.amount || 0) +
                          (matchedBillItem.cgst || 0) +
                          (matchedBillItem.sgst || 0) +
                          (matchedBillItem.igst || 0);
                        return sum + (lineTotal / matchedBillItem.quantity) * qty;
                      }, 0),
                )}
              </span>
            </p>
          </div>

          <DialogFooter className="dialog-form-footer flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReturnDialog(false)}
              className="w-full sm:w-auto text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessReturn}
              disabled={
                processingReturn ||
                (returnMode !== "amount_only" &&
                  returnItems.filter((i) => i.quantity > 0).length === 0) ||
                (returnMode === "amount_only" &&
                  (parseFloat(customReturnAmount || "0") || 0) <= 0)
              }
              className="w-full sm:w-auto text-sm"
            >
              {processingReturn ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Process Return
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      </div>
    </div>
  );
}





