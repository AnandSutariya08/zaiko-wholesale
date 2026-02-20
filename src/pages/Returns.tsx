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
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface ReturnItemForm {
  productId: string;
  productName: string;
  maxQuantity: number;
  quantity: number;
  condition: "good" | "bad";
  returnReason: string;
  costPrice: number;
}

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
      for (const item of bill.items) {
        quantities[bill.id][item.productId] = await getReturnedQuantity(
          bill.id,
          item.productId
        );
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
      const returnedQty = await getReturnedQuantity(bill.id, item.productId);
      const product = productsData.find((p) => p.id === item.productId);

      // Use HISTORICAL average cost at the time of the original sale
      // This ensures return value calculations reflect the actual cost basis when the sale occurred
      const costPrice = product
        ? getHistoricalAverageCost(product.id, bill.date, product)
        : item.ratePerUnit; // Fallback to selling price if product not found

      return {
        productId: item.productId,
        productName: item.productName,
        maxQuantity: item.quantity - returnedQty,
        quantity: 0,
        condition: "good" as const,
        returnReason: "",
        costPrice: costPrice,
      };
    });

    const items = (await Promise.all(itemsPromises)).filter(
      (item) => item.maxQuantity > 0
    );

    setReturnItems(items);
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
    const itemsToReturn = returnItems.filter((item) => item.quantity > 0);

    if (itemsToReturn.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to return",
        variant: "destructive",
      });
      return;
    }

    // Validate quantities
    for (const item of itemsToReturn) {
      if (item.quantity > item.maxQuantity) {
        toast({
          title: "Invalid quantity",
          description: `${item.productName}: Cannot return more than sold quantity`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await processBillReturn(selectedBill!.id, itemsToReturn);

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

  
  if (loading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner size="xl" text="Loading products..." fullScreen contentAreaOnly />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-8.5rem)] w-full overflow-hidden sm:h-[calc(100dvh-9.5rem)]">
      <div className="relative flex h-full min-h-0 flex-col rounded-2xl border border-border/70 bg-background p-2 shadow-sm sm:p-3 md:p-4">
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-background/95 p-3 backdrop-blur sm:p-4">
      <div className="page-header-controls">
        <div className="page-header-title">
          <div className="page-header-icon">
            <RotateCcw className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              Returns Management
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Process returns and manage deadstock
            </p>
          </div>
        </div>
      </div>
      </div>

      <div className="mt-3 flex-1 min-h-0 rounded-2xl border border-border/70 bg-background/60 p-2 sm:p-3">
      <div className="h-full overflow-y-auto space-y-4 sm:space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="section-title">
              Total Returns
            </CardTitle>
            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">
              {returns.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="section-title text-emerald-600 dark:text-emerald-400">
              Good Returns
            </CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {returns.reduce(
                (sum, r) =>
                  sum + r.items.filter((i) => i.condition === "good").length,
                0
              )}{" "}
              items
            </div>
            <p className="text-xs text-muted-foreground">Back to inventory</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="section-title text-red-600 dark:text-red-400">
              Deadstock Loss
            </CardTitle>
            <PackageX className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 break-words">
              {formatCurrency(totalDeadstockLoss)}
            </div>
            <p className="text-xs text-muted-foreground">
              {deadstock.length} items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto pb-2 -mb-2 scrollbar-hide">
        <Button
          variant={activeTab === "create" ? "default" : "ghost"}
          onClick={() => setActiveTab("create")}
          className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap"
        >
          Process Return
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          onClick={() => setActiveTab("history")}
          className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap"
        >
          Return History
        </Button>
        <Button
          variant={activeTab === "deadstock" ? "default" : "ghost"}
          onClick={() => setActiveTab("deadstock")}
          className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap"
        >
          Deadstock
        </Button>
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
                    (sum, item) => sum + (billReturnedQty[item.productId] || 0),
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
                            {formatDate(bill.date)} • {bill.items.length} items
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
                            •
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
                          Qty: {item.quantity} ×{" "}
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

            {returnItems.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-50" />
                <p className="text-sm sm:text-base">
                  All items from this bill have been returned
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {returnItems.map((item, index) => (
                  <Card key={item.productId} className="p-3 sm:p-4">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <Label className="text-xs sm:text-sm">
                            Return Quantity
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.maxQuantity}
                            value={item.quantity}
                            onChange={(e) =>
                              updateReturnItem(index, {
                                quantity: parseInt(e.target.value) || 0,
                              })
                            }
                            className="text-sm mt-1"
                          />
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
                returnItems.filter((i) => i.quantity > 0).length === 0
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
    </div>
  );
}



