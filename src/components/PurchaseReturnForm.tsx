import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PurchaseBill, PurchaseReturn, PurchaseReturnItem } from "@/types";
import { getProducts, savePurchaseReturn, updateProductStock, deletePurchaseReturn } from "@/lib/firebaseService";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ReturnItemState {
  productId: string; // Ensure productId is here
  selected: boolean;
  returnQuantity: number;
  maxQuantity: number;
  currentStock: number;
  description: string;
  rate: number;
  gstRate: number;
  unit: string;
}

interface PurchaseReturnFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: PurchaseBill | null;
  onSuccess: () => void;
  editReturn?: PurchaseReturn; // Added to support editing
}

export function PurchaseReturnForm({ open, onOpenChange, bill, onSuccess, editReturn }: PurchaseReturnFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString());

  useEffect(() => {
    if (open && bill) {
      const loadData = async () => {
        const products = await getProducts();
        setReturnDate(editReturn?.returnDate || new Date().toISOString());
        const itemsState: ReturnItemState[] = bill.items.map(item => {
          const editedItem = editReturn?.items.find(ri => ri.description === item.description);
          const product = products.find(p => 
            p.name.toLowerCase().trim() === item.description.toLowerCase().trim() || 
            (item.hsnCode && p.hsnCode === item.hsnCode)
          );
          return {
            productId: product?.id || '',
            selected: !!editedItem,
            returnQuantity: editedItem?.quantity || 0,
            maxQuantity: item.quantity,
            currentStock: product?.stock || 0,
            description: item.description,
            rate: item.rate,
            gstRate: item.gstRate || 0,
            unit: item.unit,
          };
        });
        setReturnItems(itemsState);
      };
      loadData();
    }
  }, [open, bill, editReturn]);

  if (!bill) {
    return null;
  }

  const toggleItem = (index: number, checked: boolean) => {
    const newItems = [...returnItems];
    newItems[index].selected = checked;
    if (checked && newItems[index].returnQuantity === 0) {
      newItems[index].returnQuantity = 1;
    }
    if (!checked) {
      newItems[index].returnQuantity = 0;
    }
    setReturnItems(newItems);
  };

  const updateQuantity = (index: number, quantity: number) => {
    const newItems = [...returnItems];
    const billQty = newItems[index].maxQuantity;
    const stockQty = newItems[index].currentStock;
    
    // Max returnable is the lesser of bill quantity and current stock
    const maxReturnable = Math.min(billQty, stockQty);
    
    const validQty = Math.min(Math.max(0, quantity), maxReturnable);
    newItems[index].returnQuantity = validQty;
    newItems[index].selected = validQty > 0;
    setReturnItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedItems = returnItems.filter(item => item.selected && item.returnQuantity > 0);
    
    if (selectedItems.length === 0) {
      toast({ title: "Error", description: "Select at least one item to return", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editReturn) {
        // If editing, delete the old return first to revert stock and totals
        await deletePurchaseReturn(editReturn.id, bill.id, true);
      }

      const items: PurchaseReturnItem[] = selectedItems.map(item => {
        const amount = item.returnQuantity * item.rate;
        const gstAmount = (amount * item.gstRate) / 100;
        return {
          productId: item.productId || '',
          productName: item.description,
          description: item.description, // Added description property
          quantity: item.returnQuantity,
          rate: item.rate,
          amount,
          gstRate: item.gstRate,
          gstAmount,
          condition: 'good',
        };
      });

      const totalReturnValue = items.reduce((sum, item) => sum + item.amount + (item.gstAmount || 0), 0);
      
      const purchaseReturn: PurchaseReturn = {
        id: editReturn?.id || crypto.randomUUID(),
        purchaseBillId: bill.id,
        vendorName: bill.vendorName,
        billNumber: bill.billNumber,
        items,
        totalReturnValue,
        returnDate,
        createdAt: editReturn?.createdAt || new Date().toISOString(),
      };

      await savePurchaseReturn(purchaseReturn, true);
      
      toast({ title: "Success", description: editReturn ? "Return updated" : "Purchase return recorded" });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving return:", error);
      toast({ title: "Error", description: "Failed to save return", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalReturnAmount = returnItems
    .filter(item => item.selected && item.returnQuantity > 0)
    .reduce((sum, item) => {
      const amount = item.returnQuantity * item.rate;
      const gstAmount = (amount * item.gstRate) / 100;
      return sum + amount + gstAmount;
    }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return Items - Bill #{bill.billNumber}</DialogTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Select items from this bill to return.</p>
            <p className="text-orange-600 font-medium">Note: Return quantity cannot exceed original purchase OR current available stock.</p>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="returnDate">Return Date</Label>
              <Input
                id="returnDate"
                type="date"
                value={returnDate.split("T")[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  const now = new Date();
                  newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                  setReturnDate(newDate.toISOString());
                }}
                required
              />
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left w-10">Return</th>
                  <th className="p-2 text-left">Item Description</th>
                  <th className="p-2 text-right w-20">Stock</th>
                  <th className="p-2 text-right w-24">Purchased</th>
                  <th className="p-2 text-right w-28">Return Qty</th>
                  <th className="p-2 text-right w-20">Rate</th>
                  <th className="p-2 text-right w-20">GST %</th>
                  <th className="p-2 text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map((item, index) => {
                  const amount = item.returnQuantity * item.rate;
                  const gstAmount = (amount * item.gstRate) / 100;
                  const totalAmount = amount + gstAmount;
                  
                  return (
                    <tr key={index} className={`border-t ${item.selected ? 'bg-blue-50' : ''}`}>
                      <td className="p-2">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={(checked) => toggleItem(index, checked === true)}
                        />
                      </td>
                      <td className="p-2 font-medium">{item.description}</td>
                      <td className={`p-2 text-right ${item.currentStock <= 0 ? 'text-red-500 font-bold' : 'text-emerald-600'}`}>
                        {item.currentStock}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {item.maxQuantity} {item.unit}
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={Math.min(item.maxQuantity, item.currentStock)}
                          value={item.returnQuantity}
                          onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                          className="w-20 text-right ml-auto"
                          disabled={(!item.selected && item.returnQuantity === 0) || item.currentStock <= 0}
                        />
                      </td>
                      <td className="p-2 text-right">{item.rate.toFixed(2)}</td>
                      <td className="p-2 text-right">{item.gstRate}%</td>
                      <td className="p-2 text-right font-medium">
                        {item.selected && item.returnQuantity > 0 
                          ? `₹${totalAmount.toFixed(2)}`
                          : '-'
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {returnItems.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No items found in this bill
            </p>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-lg font-semibold">
              Total Return Value: <span className="text-primary">₹{totalReturnAmount.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={totalReturnAmount === 0}>
              Confirm Return
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
