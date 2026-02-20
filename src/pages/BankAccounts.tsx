import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBankAccounts, saveBankAccount, deleteBankAccount } from "@/lib/storage";
import { BankAccount } from "@/types";
import { toast } from "sonner";
import { BankStatement } from "@/components/BankStatement";
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Building2,
  User,
  Hash,
  MapPin,
  QrCode,
  Loader2,
  FileText,
} from "lucide-react";

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [statementAccount, setStatementAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    branchAndIFSC: "",
    upiId: "",
    isDefault: false,
  });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await getBankAccounts();
      setAccounts(data);
    } catch (error) {
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleOpenDialog = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData(account);
    } else {
      setEditingAccount(null);
      setFormData({
        bankName: "",
        accountHolder: "",
        accountNumber: "",
        branchAndIFSC: "",
        upiId: "",
        isDefault: accounts.length === 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const accountData: BankAccount = {
        id: editingAccount?.id || Math.random().toString(36).substr(2, 9),
        bankName: formData.bankName || "",
        accountHolder: formData.accountHolder || "",
        accountNumber: formData.accountNumber || "",
        branchAndIFSC: formData.branchAndIFSC || "",
        upiId: formData.upiId || "",
        isDefault: formData.isDefault || false,
      };

      // If this is set as default, unset others
      if (accountData.isDefault) {
        for (const acc of accounts) {
          if (acc.id !== accountData.id && acc.isDefault) {
            await saveBankAccount({ ...acc, isDefault: false });
          }
        }
      }

      await saveBankAccount(accountData);
      toast.success(editingAccount ? "Account updated" : "Account added");
      setIsDialogOpen(false);
      loadAccounts();
    } catch (error) {
      toast.error("Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    try {
      await deleteBankAccount(id);
      toast.success("Account deleted");
      loadAccounts();
    } catch (error) {
      toast.error("Failed to delete account");
    }
  };

  return (
    <div className="h-[calc(100dvh-8.5rem)] w-full overflow-hidden sm:h-[calc(100dvh-9.5rem)]">
      <div className="relative flex h-full min-h-0 flex-col rounded-[28px] border border-border/70 bg-background p-3 shadow-sm sm:p-5 lg:p-6">
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-background/95 p-3 backdrop-blur sm:p-4">
      <div className="page-header-controls">
        <div className="page-header-title">
          <div className="page-header-icon">
            <CreditCard className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Bank Accounts
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your bank accounts and UPI IDs for payments
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => handleOpenDialog()} className="page-header-btn gap-2">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>
      </div>

      <div className="mt-4 flex-1 min-h-0 rounded-2xl border border-border/70 bg-background/60 p-2 sm:p-3">
      <div className="h-full overflow-y-auto space-y-6 pr-1 sm:pr-2">

      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
          <CardDescription>
            These accounts will be available to select during bill creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No accounts found</h3>
              <p className="text-muted-foreground mb-4">Add your first bank account to get started</p>
              <Button onClick={() => handleOpenDialog()} variant="outline">
                Add Account
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bank / Holder</TableHead>
                    <TableHead>Account Details</TableHead>
                    <TableHead>UPI ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="font-medium">{account.bankName}</div>
                        <div className="text-sm text-muted-foreground">{account.accountHolder}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">No: {account.accountNumber}</div>
                        <div className="text-xs text-muted-foreground">IFSC: {account.branchAndIFSC}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <QrCode className="h-3.5 w-3.5 text-primary" />
                          {account.upiId || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {account.isDefault ? (
                          <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Statement"
                            onClick={() => setStatementAccount(account)}
                          >
                            <FileText className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(account)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="dialog-form-content sm:max-w-[500px]">
          <form onSubmit={handleSubmit} className="dialog-form-body">
            <DialogHeader className="dialog-form-header">
              <DialogTitle>{editingAccount ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" />
                    Bank Name *
                  </Label>
                  <Input
                    id="bankName"
                    required
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g. HDFC Bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolder" className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Account Holder Name *
                  </Label>
                  <Input
                    id="accountHolder"
                    required
                    value={formData.accountHolder}
                    onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber" className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5" />
                    Account Number *
                  </Label>
                  <Input
                    id="accountNumber"
                    required
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchAndIFSC" className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    Branch & IFSC *
                  </Label>
                  <Input
                    id="branchAndIFSC"
                    required
                    value={formData.branchAndIFSC}
                    onChange={(e) => setFormData({ ...formData, branchAndIFSC: e.target.value })}
                    placeholder="e.g. Mumbai & HDFC0001234"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upiId" className="flex items-center gap-2">
                  <QrCode className="h-3.5 w-3.5" />
                  UPI ID (for Scan & Pay QR)
                </Label>
                <Input
                  id="upiId"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  placeholder="e.g. name@bank"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <Label htmlFor="isDefault" className="text-sm font-medium leading-none cursor-pointer">
                  Set as default account
                </Label>
              </div>
            </div>
            <DialogFooter className="dialog-form-footer">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAccount ? "Update Account" : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {statementAccount && (
        <BankStatement
          account={statementAccount}
          isOpen={!!statementAccount}
          onClose={() => setStatementAccount(null)}
        />
      )}
      </div>
      </div>
      </div>
    </div>
  );
}





