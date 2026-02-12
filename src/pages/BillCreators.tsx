import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import {
  getCompanyProfile,
  getBills,
  getSampleBills,
  saveCompanyProfile,
  getCreators,
  saveCreator,
  deleteCreator,
} from "@/lib/storage";
import { Bill, SampleBill, CompanyProfile, BillCreator, PaymentMethod } from "@/types";
import {
  User,
  Receipt,
  ArrowLeft,
  Search,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ArrowUpDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/billUtils";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BillCreators() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [creators, setCreators] = useState<BillCreator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [creatorBills, setCreatorBills] = useState<(Bill | SampleBill)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [billSearchTerm, setBillSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "client">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null,
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newCreatorName, setNewCreatorName] = useState("");
  const [newCreatorPassword, setNewCreatorPassword] = useState("");
  const [newCreatorPermissions, setNewCreatorPermissions] = useState<string[]>(["/", "/bills", "/sample-bill", "/products", "/clients", "/notes"]);
  const [newCreatorType, setNewCreatorType] = useState<"Creator" | "Employee" | "CA" | "Expo">("Creator");
  const [newExpoId, setNewExpoId] = useState("");
  const [editingCreator, setEditingCreator] = useState<BillCreator | null>(null);
  const [editedCreatorName, setEditedCreatorName] = useState("");
  const [editedCreatorPassword, setEditedCreatorPassword] = useState("");
  const [editedCreatorType, setEditedCreatorType] = useState<"Creator" | "Employee" | "CA" | "Expo">("Creator");
  const [editedExpoId, setEditedExpoId] = useState("");
  const [editedCreatorPermissions, setEditedCreatorPermissions] = useState<string[]>([]);
  const [creatorToDelete, setCreatorToDelete] = useState<BillCreator | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [profile, fetchedCreators, regularBills, sampleBills] = await Promise.all([
        getCompanyProfile(),
        getCreators(),
        getBills(),
        getSampleBills(),
      ]);
      
      if (profile) {
        setCompanyProfile(profile);
      }

      // Calculate admin bills count
      const allBills = [...regularBills, ...sampleBills];
      const adminBillsCount = allBills.filter(b => b.createdBy === "Admin").length;

      // Filter out 'Admin' from database if it exists (we add it manually for UI)
      const otherCreators = fetchedCreators.filter(c => c.name !== "Admin");
      
      // Always include Admin at the top
      const displayCreators: any[] = [
        {
          id: "admin-static",
          name: "Admin",
          isStatic: true,
          billCount: adminBillsCount,
          createdAt: new Date(0).toISOString(),
        },
        ...otherCreators
      ];

      setCreators(displayCreators);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleAddCreator = async () => {
    if (!newCreatorName.trim()) return;
    if (creators.some((c) => c.name === newCreatorName.trim())) {
      toast({ title: "Creator already exists", variant: "destructive" });
      return;
    }
    
    const newCreator: BillCreator = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCreatorName.trim(),
      password: newCreatorPassword.trim(),
      type: newCreatorType,
      expoId: newCreatorType === "Expo" ? newExpoId : undefined,
      permissions: newCreatorPermissions,
      createdAt: new Date().toISOString(),
    };

    await saveCreator(newCreator);
    setCreators([...creators, newCreator]);
    setNewCreatorName("");
    setNewCreatorPassword("");
    setNewCreatorPermissions(["/", "/bills", "/sample-bill", "/products", "/clients", "/notes"]);
    setIsAddDialogOpen(false);
    toast({ title: "Creator added successfully" });
  };

  const handleEditCreator = async () => {
    if (!editedCreatorName.trim() || !editingCreator) return;
    if (
      creators.some(
        (c) =>
          c.name === editedCreatorName.trim() && c.id !== editingCreator.id,
      )
    ) {
      toast({ title: "Creator name already exists", variant: "destructive" });
      return;
    }

    const updatedCreator: BillCreator = {
      ...editingCreator,
      name: editedCreatorName.trim(),
      password: editedCreatorPassword.trim(),
      type: editedCreatorType,
      expoId: editedCreatorType === "Expo" ? editedExpoId : undefined,
      permissions: editedCreatorPermissions,
    };

    await saveCreator(updatedCreator);
    setCreators(creators.map((c) => (c.id === updatedCreator.id ? updatedCreator : c)));
    setEditingCreator(null);
    setEditedCreatorName("");
    setEditedCreatorPassword("");
    setIsEditDialogOpen(false);
    toast({ title: "Creator updated successfully" });
  };

  const handleDeleteCreator = async () => {
    if (!creatorToDelete) return;
    await deleteCreator(creatorToDelete.id);
    setCreators(creators.filter((c) => c.id !== creatorToDelete.id));
    setCreatorToDelete(null);
    setIsDeleteDialogOpen(false);
    toast({ title: "Creator deleted successfully" });
  };

  const openEditDialog = (creator: BillCreator, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCreator(creator);
    setEditedCreatorName(creator.name);
    setEditedCreatorPassword(creator.password || "");
    setEditedCreatorType(creator.type || "Creator");
    setEditedExpoId(creator.expoId || "");
    setEditedCreatorPermissions(creator.permissions || ["/", "/bills", "/sample-bill", "/products", "/clients", "/notes"]);
    setIsEditDialogOpen(true);
  };

  const togglePermission = (path: string, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      setNewCreatorPermissions(prev => 
        prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
      );
    } else {
      setEditedCreatorPermissions(prev => 
        prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
      );
    }
  };

  const PERMISSION_OPTIONS = [
    { path: "/", label: "Dashboard" },
    { path: "/bills", label: "Bills" },
    { path: "/sample-bill", label: "Sample Bills" },
    { path: "/purchases", label: "Purchases (Buy)" },
    { path: "/returns", label: "Returns" },
    { path: "/passbook", label: "Passbook" },
    { path: "/expenses", label: "Expenses" },
    { path: "/products", label: "Stock" },
    { path: "/clients", label: "Clients" },
    { path: "/files", label: "Files" },
    { path: "/notes", label: "Notes" },
  ];

  const openDeleteDialog = (creator: BillCreator, e: React.MouseEvent) => {
    e.stopPropagation();
    setCreatorToDelete(creator);
    setIsDeleteDialogOpen(true);
  };

  useEffect(() => {
    const loadCreatorBills = async () => {
      if (!selectedCreator) return;
      setLoading(true);
      const [regularBills, sampleBills] = await Promise.all([
        getBills(),
        getSampleBills(),
      ]);

      const allBills = [...regularBills, ...sampleBills];
      
      const creatorData = creators.find(c => c.name === selectedCreator);
      const isExpo = creatorData?.type === "Expo";
      const expoId = creatorData?.expoId;

      const filtered = allBills
        .filter((bill) => {
          if (isExpo && expoId) {
            return bill.createdBy === selectedCreator && (bill as any).expoId === expoId;
          }
          return bill.createdBy === selectedCreator;
        })
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

      setCreatorBills(filtered);
      setLoading(false);
    };
    loadCreatorBills();
  }, [selectedCreator]);

  const filteredCreators = creators.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredAndSortedBills = creatorBills
    .filter((bill) => {
      const searchLower = billSearchTerm.toLowerCase();
      return (
        bill.billNumber.toLowerCase().includes(searchLower) ||
        bill.client.name.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === "amount") {
        comparison = a.total - b.total;
      } else if (sortBy === "client") {
        comparison = a.client.name.localeCompare(b.client.name);
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

  if (selectedCreator) {
    const totalAmount = filteredAndSortedBills.reduce((sum, bill) => sum + bill.total, 0);
    const totalPaid = filteredAndSortedBills.reduce((sum, bill) => 
      sum + (bill.paidAmount || 0), 0);
    const totalPending = totalAmount - totalPaid;

    const paymentMethods = filteredAndSortedBills.reduce((acc, bill) => {
      const b = bill as any;
      if (b.payments && Array.isArray(b.payments)) {
        b.payments.forEach((p: any) => {
          const method = p.method || 'Other';
          acc[method] = (acc[method] || 0) + p.amount;
        });
      } else if (b.paidAmount > 0) {
        // Fallback for bills without payments array but with paidAmount
        const method = b.paymentMethod || b.paymentType || 'Other';
        acc[method] = (acc[method] || 0) + b.paidAmount;
      }
      return acc;
    }, {} as Record<string, number>);

    const ALL_PAYMENT_METHODS: PaymentMethod[] = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedCreator(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="page-title">Bills by {selectedCreator}</h1>
            <p className="page-subtitle">Performance overview and bill history</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Total Billed</p>
              <h3 className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</h3>
              <p className="text-xs text-muted-foreground mt-1">{filteredAndSortedBills.length} bills</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Collected</p>
              <h3 className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Total payments received</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Pending</p>
              <h3 className="text-2xl font-bold text-orange-600">{formatCurrency(totalPending)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Outstanding balance</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Collected by Payment Method</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {ALL_PAYMENT_METHODS.map((method) => (
              <Card key={method} className="bg-muted/30 border-border/50">
                <CardContent className="p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight truncate">{method}</p>
                  <h3 className="text-sm font-bold mt-1">{formatCurrency(paymentMethods[method] || 0)}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bills..."
                className="pl-10"
                value={billSearchTerm}
                onChange={(e) => setBillSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder(sortOrder === "desc" ? "asc" : "desc"); }}>
                  Sort by Date {sortBy === "date" && (sortOrder === "desc" ? "↓" : "↑")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy("amount"); setSortOrder(sortOrder === "desc" ? "asc" : "desc"); }}>
                  Sort by Amount {sortBy === "amount" && (sortOrder === "desc" ? "↓" : "↑")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy("client"); setSortOrder(sortOrder === "desc" ? "asc" : "desc"); }}>
                  Sort by Client {sortBy === "client" && (sortOrder === "desc" ? "↓" : "↑")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredAndSortedBills.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {billSearchTerm ? "No bills match your search." : "No bills found for this creator."}
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedBills.map((bill) => (
              <Card
                key={bill.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() =>
                  navigate(
                    "isSample" in bill
                      ? `/sample-bills/${bill.id}`
                      : `/bills/${bill.id}`,
                  )
                }
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{bill.billNumber}</span>
                      {"isSample" in bill && (
                        <Badge variant="outline">Sample</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {bill.client.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(bill.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(bill.total)}</p>
                    <Badge
                      variant={
                        bill.paymentStatus === "paid" ? "secondary" : "outline"
                      }
                    >
                      {bill.paymentStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <User className="h-8 w-8 text-primary" />
            Bill Creators
          </h1>
          <p className="page-subtitle">
            Manage and view performance of bill creators
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Creator
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search creators..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredCreators.map((creator) => (
          <Card
            key={creator.id}
            className="hover:border-primary transition-colors cursor-pointer group"
            onClick={() => setSelectedCreator(creator.name)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => openEditDialog(creator, e)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => openDeleteDialog(creator, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="flex items-center gap-2">
                {creator.name}
                {creator.type && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {creator.type}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Click to view bills</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                className="w-full justify-between text-primary"
              >
                View History
                <Receipt className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {filteredCreators.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-muted-foreground">No creators found.</p>
            <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Creator
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Creator</DialogTitle>
            <DialogDescription>
              Enter the name and password of the new bill creator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Creator Name</Label>
              <Input
                id="name"
                placeholder="Creator name"
                value={newCreatorName}
                onChange={(e) => setNewCreatorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">User Type</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newCreatorType}
                onChange={(e) => setNewCreatorType(e.target.value as any)}
              >
                <option value="Creator">Creator</option>
                <option value="Employee">Employee</option>
                <option value="CA">CA</option>
                <option value="Expo">Expo</option>
              </select>
            </div>
            {newCreatorType === "Expo" && (
              <div className="space-y-2">
                <Label htmlFor="expoId">Expo ID</Label>
                <Input
                  id="expoId"
                  placeholder="e.g. EXPO-001"
                  value={newExpoId}
                  onChange={(e) => setNewExpoId(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Password"
                  value={newCreatorPassword}
                  onChange={(e) => setNewCreatorPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCreator()}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSION_OPTIONS.map((opt) => (
                  <div key={opt.path} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`new-perm-${opt.path}`} 
                      checked={newCreatorPermissions.includes(opt.path)}
                      onCheckedChange={() => togglePermission(opt.path, 'add')}
                    />
                    <label 
                      htmlFor={`new-perm-${opt.path}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCreator}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Creator</DialogTitle>
            <DialogDescription>Update the creator's details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Creator Name</Label>
              <Input
                id="edit-name"
                placeholder="Creator name"
                value={editedCreatorName}
                onChange={(e) => setEditedCreatorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">User Type</Label>
              <select
                id="edit-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editedCreatorType}
                onChange={(e) => setEditedCreatorType(e.target.value as any)}
              >
                <option value="Creator">Creator</option>
                <option value="Employee">Employee</option>
                <option value="CA">CA</option>
                <option value="Expo">Expo</option>
              </select>
            </div>
            {editedCreatorType === "Expo" && (
              <div className="space-y-2">
                <Label htmlFor="edit-expoId">Expo ID</Label>
                <Input
                  id="edit-expoId"
                  placeholder="e.g. EXPO-001"
                  value={editedExpoId}
                  onChange={(e) => setEditedExpoId(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (optional)</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showEditPassword ? "text" : "password"}
                  placeholder="New Password (optional)"
                  value={editedCreatorPassword}
                  onChange={(e) => setEditedCreatorPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEditCreator()}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                >
                  {showEditPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSION_OPTIONS.map((opt) => (
                  <div key={opt.path} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`edit-perm-${opt.path}`} 
                      checked={editedCreatorPermissions.includes(opt.path)}
                      onCheckedChange={() => togglePermission(opt.path, 'edit')}
                    />
                    <label 
                      htmlFor={`edit-perm-${opt.path}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditCreator}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Creator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{creatorToDelete?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCreator}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
