import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

import { getExpenses, saveExpense, deleteExpense, getBankAccounts } from "@/lib/storage";
import { getCompanyProfile } from "@/lib/storage";
import { Expense, CompanyProfile, BankAccount } from "@/types";

import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Loader2,
  Calendar,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/billUtils";
import { set } from "date-fns";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null
  );

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString(),
    time: new Date().toTimeString().slice(0, 5),
    amount: 0,
    description: "",
    category: "",
    paymentMethod: "Cash" as "Cash" | "Bank",
    bankAccountId: "",
  });

  // Load expenses and company profile on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expensesData, profile, banks] = await Promise.all([
        getExpenses(),
        getCompanyProfile(),
        getBankAccounts(),
      ]);
      setExpenses(expensesData); // Already sorted by createdAt desc from Firestore
      setCompanyProfile(profile);
      setBankAccounts(banks);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.description || formData.amount <= 0) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    if (formData.paymentMethod === "Bank" && !formData.bankAccountId) {
      toast.error("Please select a bank account");
      return;
    }

    setSaving(true);
    try {
      const expense: Expense = {
        id: editingExpense?.id || crypto.randomUUID(),
        date: formData.date,
        time: formData.time,
        amount: formData.amount,
        description: formData.description,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.paymentMethod === "Bank" ? formData.bankAccountId : undefined,
        createdAt: editingExpense?.createdAt || new Date().toISOString(),
      };

      await saveExpense(expense);
      await loadData();

      setIsOpen(false);
      setEditingExpense(null);
      resetForm();

      toast.success(
        editingExpense
          ? "Expense updated successfully"
          : "Expense added successfully"
      );
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      time: expense.time,
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      paymentMethod: expense.paymentMethod || "Cash",
      bankAccountId: expense.bankAccountId || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
      await loadData();
      toast.success("Expense deleted successfully");
    } catch (error) {
      toast.error("Failed to delete expense");
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString(),
      time: new Date().toTimeString().slice(0, 5),
      amount: 0,
      description: "",
      category: "",
      paymentMethod: "Cash",
      bankAccountId: "",
    });
  };

  // Calculations
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const thisMonthExpenses = expenses
    .filter((e) => {
      const expDate = new Date(e.date);
      const now = new Date();
      return (
        expDate.getMonth() === now.getMonth() &&
        expDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const expensesByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const availableCategories = companyProfile?.expenseCategories || [
    "Marketing",
    "Utilities",
    "Rent",
    "Office Supplies",
    "Transportation",
    "Communication",
    "Insurance",
    "Taxes",
    "Maintenance",
    "Miscellaneous",
  ];

  const paginatedExpenses = expenses.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const totalPages = Math.ceil(expenses.length / pageSize);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track and manage your business expenses</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingExpense(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Edit Expense" : "Add New Expense"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date.split("T")[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      const now = new Date();
                      newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                      setFormData({ ...formData, date: newDate.toISOString() });
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value: "Cash" | "Bank") =>
                    setFormData({ ...formData, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.paymentMethod === "Bank" && (
                <div className="space-y-2">
                  <Label>Bank Account *</Label>
                  <Select
                    value={formData.bankAccountId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bankAccountId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bankName} - {account.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter expense details..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  {editingExpense ? "Update" : "Add"} Expense
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}{" "}
              recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(thisMonthExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(expensesByCategory).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active categories (out of {availableCategories.length})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expense List */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg">No expenses recorded yet</p>
              <p className="text-sm mt-2">
                Click "Add Expense" to record your first expense
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-foreground">
                        {expense.description}
                      </span>
                      <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        {expense.category}
                      </span>
                      <span className={`px-2.5 py-1 text-xs rounded-full ${expense.paymentMethod === 'Bank' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {expense.paymentMethod || 'Cash'}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(expense.date)} at {expense.time}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="font-semibold text-lg text-foreground">
                      {formatCurrency(expense.amount)}
                    </span>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(expense)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this expense? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(expense.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
