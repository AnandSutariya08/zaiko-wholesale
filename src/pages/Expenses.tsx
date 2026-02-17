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
        <LoadingSpinner size="xl" text="Loading expenses..." fullScreen contentAreaOnly />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">

      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">
            Track and manage your business expenses
          </p>
        </div>

        {/* Your existing Dialog button remains unchanged */}
      </div>

      {/* ================= PREMIUM SUMMARY TILES ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* TOTAL EXPENSES */}
        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent">
          <div className="absolute top-0 right-0 h-24 w-24 bg-rose-500/10 blur-2xl rounded-full" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Expenses
            </CardTitle>
            <div className="h-9 w-9 rounded-full bg-rose-500/15 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-rose-600 tracking-tight">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.length} recorded transactions
            </p>
          </CardContent>
        </Card>

        {/* THIS MONTH */}
        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
          <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/10 blur-2xl rounded-full" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              This Month
            </CardTitle>
            <div className="h-9 w-9 rounded-full bg-blue-500/15 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-blue-600 tracking-tight">
              {formatCurrency(thisMonthExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current month spending
            </p>
          </CardContent>
        </Card>

        {/* CATEGORY COUNT */}
        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent">
          <div className="absolute top-0 right-0 h-24 w-24 bg-purple-500/10 blur-2xl rounded-full" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Categories Used
            </CardTitle>
            <div className="h-9 w-9 rounded-full bg-purple-500/15 flex items-center justify-center">
              <Tag className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-purple-600 tracking-tight">
              {Object.keys(expensesByCategory).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {availableCategories.length} available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ================= EXPENSE LIST ================= */}
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
                  className="group flex items-center justify-between p-5 border border-border/60 rounded-xl bg-background hover:shadow-md hover:border-primary/40 transition-all duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-foreground text-base">
                        {expense.description}
                      </span>

                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/20">
                        {expense.category}
                      </span>

                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          expense.paymentMethod === "Bank"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {expense.paymentMethod || "Cash"}
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {formatDate(expense.date)} at {expense.time}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="font-semibold text-xl tracking-tight text-rose-600">
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
                            <AlertDialogTitle>
                              Delete Expense
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this expense?
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDelete(expense.id)
                              }
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
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
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