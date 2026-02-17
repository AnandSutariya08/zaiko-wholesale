import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bill, PurchaseBill, PaymentMethod } from '@/types';
import { formatCurrency } from '@/lib/billUtils';
import { Loader2 } from 'lucide-react';

interface PaymentDialogProps {
  bill: Bill | PurchaseBill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentCollected: (amount: number, type: PaymentMethod, note?: string, date?: string) => void;
}

export function PaymentDialog({ bill, open, onOpenChange, onPaymentCollected }: PaymentDialogProps) {
  const isPurchase = 'vendorName' in bill;
  const clientName = isPurchase ? (bill as PurchaseBill).vendorName : (bill as Bill).client?.name || 'Unknown';
  
  // Calculate remaining amount considering returns for purchase bills
  const totalReturns = isPurchase 
    ? (bill as PurchaseBill).returns?.reduce((sum, r) => sum + r.totalReturnValue, 0) || 0
    : 0;
  
  const netTotal = bill.total - totalReturns;
  const isOverpaid = (bill.paidAmount || 0) > netTotal;
  const overpaidAmount = isOverpaid ? (bill.paidAmount || 0) - netTotal : 0;
  const pendingAmount = Math.max(0, netTotal - (bill.paidAmount || 0));
  
  const [paymentAmount, setPaymentAmount] = useState(isOverpaid ? overpaidAmount.toString() : pendingAmount.toString());
  const [paymentType, setPaymentType] = useState<PaymentMethod>("Cash");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString());
  const [paymentNote, setPaymentNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync payment amount when dialog opens or bill changes
  useEffect(() => {
    if (open) {
      setPaymentAmount(isOverpaid ? overpaidAmount.toString() : pendingAmount.toString());
    }
  }, [open, pendingAmount, isOverpaid, overpaidAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    let amount = parseFloat(paymentAmount);
    // If overpaid and recording collection, amount should be negative
    if (isOverpaid && isPurchase) {
      amount = -Math.abs(amount);
    }
    
    onPaymentCollected(amount, paymentType, paymentNote, paymentDate);
    setLoading(false);
    onOpenChange(false);
    setPaymentNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {isOverpaid && isPurchase ? 'Collect Overpayment' : isPurchase ? 'Pay Vendor' : 'Collect Payment'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm break-words">
            Bill: {bill.billNumber || 'N/A'} • {isPurchase ? 'Vendor' : 'Client'}: {clientName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {isOverpaid && isPurchase && (
            <div className="bg-orange-50 p-3 rounded-md border border-orange-200 mb-2">
              <p className="text-sm text-orange-800 font-medium">
                Overpaid amount: {formatCurrency(overpaidAmount)}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                This will record the amount collected back from the vendor.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Bill Total:</span>
              <span className="font-semibold break-words">{formatCurrency(bill.total)}</span>
            </div>
            {totalReturns > 0 && (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Returns:</span>
                <span className="font-semibold text-blue-600">-{formatCurrency(totalReturns)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Net Total:</span>
              <span className="font-semibold">{formatCurrency(netTotal)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Paid Amount:</span>
              <span className="font-semibold break-words">{formatCurrency(bill.paidAmount || 0)}</span>
            </div>
            {!isOverpaid ? (
              <div className="flex justify-between text-sm sm:text-base pt-2 border-t">
                <span className="font-semibold">{isPurchase ? 'Remaining to Pay:' : 'Pending Amount:'}</span>
                <span className="font-bold text-warning break-words">{formatCurrency(pendingAmount)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm sm:text-base pt-2 border-t">
                <span className="font-semibold text-orange-600">Overpaid:</span>
                <span className="font-bold text-orange-600 break-words">{formatCurrency(overpaidAmount)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-amount" className="text-sm">
              {isOverpaid && isPurchase ? 'Collection Amount' : isPurchase ? 'Payment Amount' : 'Collection Amount'}
            </Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={isOverpaid ? overpaidAmount : pendingAmount}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
              disabled={loading}
              autoFocus
              className="text-sm sm:text-base"
            />
            {!isOverpaid && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Maximum: {formatCurrency(pendingAmount)}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPaymentAmount(pendingAmount.toString())}
                  disabled={loading}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  Full Payment
                </Button>
              </div>
            )}
            {isOverpaid && isPurchase && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Max Collection: {formatCurrency(overpaidAmount)}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPaymentAmount(overpaidAmount.toString())}
                  disabled={loading}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  Collect All
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-date" className="text-sm">Payment Date</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              disabled={loading}
              className="text-sm sm:text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-type" className="text-sm">Payment Type</Label>
            <Select
              value={paymentType}
              onValueChange={(value: any) => setPaymentType(value)}
              disabled={loading}
            >
              <SelectTrigger id="payment-type">
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-note" className="text-sm">Note (Optional)</Label>
            <Input
              id="payment-note"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="Enter payment reference or note"
              disabled={loading}
              className="text-sm"
            />
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto text-sm"
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="w-full sm:w-auto text-sm">
              {isOverpaid && isPurchase ? 'Record Collection' : isPurchase ? 'Record Payment' : 'Collect Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
