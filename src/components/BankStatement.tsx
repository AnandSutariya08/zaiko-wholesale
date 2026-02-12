import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { BankAccount, Bill, SampleBill, Expense } from "@/types";
import { getBills, getSampleBills, getExpenses } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/billUtils";
import { Download, Loader2, FileText } from "lucide-react";

interface BankStatementProps {
  account: BankAccount;
  isOpen: boolean;
  onClose: () => void;
}

export function BankStatement({ account, isOpen, onClose }: BankStatementProps) {
  const [loading, setLoading] = useState(true);
  const [statementData, setStatementData] = useState<any[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadStatement();
    }
  }, [isOpen, account.id]);

  const loadStatement = async () => {
    setLoading(true);
    try {
      const [allBills, allSampleBills, allExpenses] = await Promise.all([
        getBills(),
        getSampleBills(),
        getExpenses()
      ]);

      const relevantBills = (allBills as Bill[]).filter(b => b.bankAccountId === account.id);
      const relevantSampleBills = (allSampleBills as SampleBill[]).filter(b => (b as any).bankAccountId === account.id);
      const relevantExpenses = (allExpenses as Expense[]).filter(e => e.paymentMethod === "Bank" && e.bankAccountId === account.id);

      const billsData = allRelevantBillsAndSamples(relevantBills, relevantSampleBills);
      const expensesData = relevantExpenses.map(exp => ({
        id: exp.id,
        date: exp.date,
        billNumber: "EXPENSE",
        clientName: exp.description,
        amount: -exp.amount, // Negative for expenses
        total: exp.amount,
        status: "paid",
        type: "expense"
      }));

      const statement = [...billsData, ...expensesData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStatementData(statement);
      const total = statement.reduce((sum, item) => sum + item.amount, 0);
      setTotalReceived(total);
    } catch (error) {
      console.error("Failed to load statement:", error);
    } finally {
      setLoading(false);
    }
  };

  const allRelevantBillsAndSamples = (bills: Bill[], samples: SampleBill[]) => {
    return [...bills, ...samples].map(bill => ({
      id: bill.id,
      date: bill.date,
      billNumber: bill.billNumber,
      clientName: bill.client.name,
      amount: bill.paidAmount || 0,
      total: bill.total,
      status: bill.paymentStatus,
      type: "income"
    }));
  };

  const downloadCSV = () => {
    const headers = ["Date", "Bill Number", "Client", "Total Amount", "Received Amount", "Status"];
    const rows = statementData.map(item => [
      item.date,
      item.billNumber,
      item.clientName,
      item.total,
      item.amount,
      item.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Statement_${account.bankName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle>Bank Statement</DialogTitle>
              <DialogDescription>
                {account.bankName} - {account.accountNumber}
              </DialogDescription>
            </div>
            <Button onClick={downloadCSV} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          <div className="bg-primary/5 p-4 rounded-lg mb-6 flex justify-between items-center border border-primary/10">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <h3 className="text-2xl font-bold text-primary">{formatCurrency(totalReceived)}</h3>
            </div>
            <FileText className="h-10 w-10 text-primary/20" />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : statementData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              No transactions found for this bank account.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Bill Total</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
                  <TableBody>
                    {statementData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDate(item.date)}</TableCell>
                        <TableCell className="font-medium">{item.billNumber}</TableCell>
                        <TableCell>{item.clientName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                        <TableCell className={`text-right font-bold ${item.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {item.amount < 0 ? `- ${formatCurrency(Math.abs(item.amount))}` : formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            item.type === 'expense' ? 'bg-rose-100 text-rose-700' :
                            item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                            item.status === 'partial' ? 'bg-amber-100 text-amber-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.type === 'expense' ? 'Expense' : item.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
