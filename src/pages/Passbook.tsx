import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { getBills, getPurchaseBills, getExpenses, getBillReturns, getProducts } from '@/lib/storage';
import { Bill, PurchaseBill, Expense, BillReturn, Product } from '@/types';
import {
    BookOpen,
    TrendingUp,
    TrendingDown,
    Minus,
    Plus,
    Calendar,
    Filter,
    Download,
    ArrowUpDown,
    Loader2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/billUtils';
import * as XLSX from 'xlsx';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface PassbookEntry {
    id: string;
    date: string;
    type: 'sale' | 'purchase' | 'expense' | 'return' | 'payment';
    description: string;
    amount: number;
    balance: number;
    details: any;
    category?: string;
}

export default function Passbook() {
    const [entries, setEntries] = useState<PassbookEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<PassbookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [inventoryValue, setInventoryValue] = useState(0);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [gstFilter, setGstFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState({
        start: '',
        end: '',
    });

    useEffect(() => {
        loadPassbookData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [entries, filterType, filterCategory, gstFilter, dateRange, sortOrder]);

    const loadPassbookData = async () => {
        setLoading(true);
        try {
            const [bills, purchaseBills, expenses, returns, products] = await Promise.all([
                getBills(),
                getPurchaseBills(),
                getExpenses(),
                getBillReturns(),
                getProducts(),
            ]);

            // Calculate inventory value
            const totalInv = products.reduce((sum, product) => {
                const stock = product.stock || 0;
                const price = product.purchasePrice || product.price || 0;
                return sum + (stock * price);
            }, 0);
            setInventoryValue(totalInv);

            const allEntries: PassbookEntry[] = [];

            // Add sales (positive amounts for received payments)
            bills.forEach(bill => {
                // Add payments separately as 'payment' entries
                if (bill.payments && bill.payments.length > 0) {
                    bill.payments.forEach(payment => {
                        allEntries.push({
                            id: `payment-${payment.id}`,
                            date: payment.date,
                            type: 'payment',
                            description: `Payment Received - Bill #${bill.billNumber} (${payment.method})${payment.note ? ` - ${payment.note}` : ''}`,
                            amount: payment.amount,
                            balance: 0,
                            details: { ...bill, currentPayment: payment },
                        });
                    });
                } else if (bill.paidAmount && bill.paidAmount > 0) {
                    // Fallback for bills that might not have the payments array populated yet
                    allEntries.push({
                        id: `payment-legacy-${bill.id}`,
                        date: bill.date,
                        type: 'payment',
                        description: `Payment Received - Bill #${bill.billNumber} (${bill.modeOfPayment || 'N/A'})`,
                        amount: bill.paidAmount,
                        balance: 0,
                        details: bill,
                    });
                }
            });

            // Add purchases (negative amounts for money spent)
            purchaseBills.forEach(purchase => {
                // Calculate the net purchase amount (total - returns)
                const totalReturns = (purchase.returns || []).reduce((sum, r) => sum + r.totalReturnValue, 0);
                const netPaidAmount = Math.max(0, (purchase.paidAmount || 0) - (purchase.paymentStatus !== 'paid' ? totalReturns : 0));

                // Main purchase payment (if any)
                if (purchase.payments && purchase.payments.length > 0) {
                    purchase.payments.forEach(payment => {
                        allEntries.push({
                            id: `purchase-payment-${payment.id}`,
                            date: payment.date,
                            type: 'purchase',
                            description: `Purchase Payment - ${purchase.vendorName || 'Vendor'} - Bill #${purchase.billNumber || 'N/A'} (${payment.method})`,
                            amount: -payment.amount,
                            balance: 0,
                            details: { ...purchase, currentPayment: payment },
                        });
                    });
                } else if (netPaidAmount > 0) {
                    allEntries.push({
                        id: `purchase-${purchase.id}`,
                        date: purchase.billDate || purchase.createdAt || purchase.id,
                        type: 'purchase',
                        description: `Purchase - ${purchase.vendorName || 'Vendor'} - Bill #${purchase.billNumber || 'N/A'}`,
                        amount: -netPaidAmount,
                        balance: 0,
                        details: purchase,
                    });
                }
            });

            // Add expenses (negative amounts for money spent)
            expenses.forEach(expense => {
                allEntries.push({
                    id: `expense-${expense.id}`,
                    date: expense.date,
                    type: 'expense',
                    description: expense.description,
                    amount: -expense.amount,
                    balance: 0,
                    details: expense,
                    category: expense.category,
                });
            });

            // Add sales returns
            returns.forEach(returnItem => {
                allEntries.push({
                    id: `return-${returnItem.id}`,
                    date: returnItem.returnDate,
                    type: 'return',
                    description: `Return - Bill #${returnItem.billNumber} - ${returnItem.clientName}`,
                    amount: -returnItem.totalReturnValue,
                    balance: 0,
                    details: returnItem,
                });
            });

            // Add purchase returns
            purchaseBills.forEach(purchase => {
                if (purchase.returns && purchase.returns.length > 0) {
                    purchase.returns.forEach(ret => {
                        // Only add as a separate transaction if the bill was paid
                        if (purchase.paymentStatus === 'paid') {
                            allEntries.push({
                                id: `purchase-return-${ret.id}`,
                                date: ret.returnDate,
                                type: 'return',
                                description: `Purchase Return - ${purchase.vendorName} - Bill #${purchase.billNumber}`,
                                amount: ret.totalReturnValue, // Positive as it's money back
                                balance: 0,
                                details: ret,
                            });
                        }
                    });
                }
            });

            // Sort by date (Oldest to Newest) and calculate running balance
            // When dates are the same, we need a secondary sort (e.g., ID or type) to ensure consistency
            const sortedEntries = allEntries.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateA - dateB;
                // Secondary sort by ID to ensure stable ordering for balance calculation
                return a.id.localeCompare(b.id);
            });

            let runningBalance = 0;
            const entriesWithBalance = sortedEntries.map(entry => {
                runningBalance += entry.amount;
                return {
                    ...entry,
                    balance: runningBalance,
                };
            });

            // For display purposes, we show Newest to Oldest, but balance was calculated Oldest to Newest
            const displayEntries = [...entriesWithBalance].reverse();
            setEntries(displayEntries);
        } catch (error) {
            console.error('Error loading passbook data:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...entries];

        // Filter by type
        if (filterType !== 'all') {
            filtered = filtered.filter(entry => entry.type === filterType);
        }

        // Filter by category (for expenses)
        if (filterCategory !== 'all') {
            filtered = filtered.filter(entry => entry.category === filterCategory || !entry.category);
        }

        // Filter by GST type
        if (gstFilter !== 'all') {
            filtered = filtered.filter(entry => {
                if (entry.type === 'sale' || entry.type === 'purchase') {
                    const hasGST = entry.details?.totalTax > 0;
                    if (gstFilter === 'gst') return hasGST;
                    if (gstFilter === 'non-gst') return !hasGST;
                }
                return true; // Include expenses and returns regardless of GST filter
            });
        }

        // Filter by date range
        if (dateRange.start) {
            filtered = filtered.filter(entry => new Date(entry.date) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            filtered = filtered.filter(entry => new Date(entry.date) <= new Date(dateRange.end));
        }

        // Recalculate running balance for filtered entries
        // 1. Sort by date (Oldest to Newest) to calculate correct running balance
        filtered.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return a.id.localeCompare(b.id);
        });

        let runningBalance = 0;
        const filteredWithBalance = filtered.map(entry => {
            runningBalance += entry.amount;
            return {
                ...entry,
                balance: runningBalance,
            };
        });

        // 2. Sort for display (Newest to Oldest or Oldest to Newest based on user preference)
        filteredWithBalance.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) {
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            }
            // For the same date, reverse the secondary sort if we are in descending order
            return sortOrder === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
        });

        setFilteredEntries(filteredWithBalance);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'sale':
            case 'payment':
                return <TrendingUp className="h-4 w-4 text-green-600" />;
            case 'purchase':
                return <TrendingDown className="h-4 w-4 text-red-600" />;
            case 'expense':
                return <Minus className="h-4 w-4 text-orange-600" />;
            case 'return':
                return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
            default:
                return <BookOpen className="h-4 w-4" />;
        }
    };

    const getTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'sale':
            case 'payment':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'purchase':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            case 'expense':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
            case 'return':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
        }
    };

    const totalIncome = entries.filter(e => e.amount > 0 && e.type === 'payment').reduce((sum, e) => sum + e.amount, 0);
    const totalPurchases = Math.abs(entries.filter(e => e.type === 'purchase').reduce((sum, e) => sum + e.amount, 0));
    const totalExpensesOnly = Math.abs(entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0));
    const totalOutflow = Math.abs(entries.filter(e => (e.amount < 0 && e.type !== 'return') || (e.type === 'return' && e.amount < 0)).reduce((sum, e) => sum + e.amount, 0));
    
    // Budget/Net Balance calculation: 
    // Usually Passbook is Cash Flow. So it should be (Payments Received) - (Purchases) - (Expenses) + (Returns)
    const cashIn = entries.filter(e => e.type === 'payment' || (e.type === 'return' && e.amount > 0)).reduce((sum, e) => sum + e.amount, 0);
    const cashOut = Math.abs(entries.filter(e => e.type === 'purchase' || e.type === 'expense' || (e.type === 'return' && e.amount < 0)).reduce((sum, e) => sum + e.amount, 0));
    const netBalance = cashIn - cashOut;

    const paymentMethodTotals = entries
        .filter(e => e.type === 'payment')
        .reduce((acc, entry) => {
            const method = entry.details?.currentPayment?.method || 'Other';
            acc[method] = (acc[method] || 0) + entry.amount;
            return acc;
        }, {} as Record<string, number>);

    const categories = [...new Set(entries.filter(e => e.category).map(e => e.category!))];

    const exportToExcel = () => {
        const data = filteredEntries.map(entry => ({
            Date: formatDate(entry.date),
            Type: entry.type.charAt(0).toUpperCase() + entry.type.slice(1),
            Description: entry.description,
            Amount: entry.amount,
            Category: entry.category || 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Passbook');
        XLSX.writeFile(wb, 'passbook.xlsx');
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                        Passbook
                    </h1>
                    <p className="page-subtitle">Complete financial transaction history</p>
                </div>
                <Button variant="outline" onClick={exportToExcel} className="self-start sm:self-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Export to Excel
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Total Income</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{formatCurrency(totalIncome)}</div>
                        <p className="text-xs text-muted-foreground">
                            Actual cash received
                        </p>
                    </CardContent>
                </Card>

                <Card className="border shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-rose-600 dark:text-rose-400">Total Outflow</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                            <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl md:text-3xl font-bold text-rose-600 dark:text-rose-400 mb-1">{formatCurrency(totalOutflow)}</div>
                        <p className="text-xs text-muted-foreground">
                            Purchases: {formatCurrency(totalPurchases)} | Expenses: {formatCurrency(totalExpensesOnly)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400">Total Inventory</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">{formatCurrency(inventoryValue)}</div>
                        <p className="text-xs text-muted-foreground">
                            Total value of stock in hand
                        </p>
                    </CardContent>
                </Card>

                <Card className={`border shadow-md hover:shadow-lg transition-shadow ${netBalance >= 0 ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className={`text-sm font-semibold ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            Net Balance
                        </CardTitle>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${netBalance >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                            <BookOpen className={`h-5 w-5 ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl md:text-3xl font-bold mb-1 ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(netBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Current account balance
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Collection by Payment Mode */}
            <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Collections by Payment Mode
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'].map((method) => (
                        <Card key={method} className="border shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">{method}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-lg font-bold text-foreground">
                                    {formatCurrency(paymentMethodTotals[method as any] || 0)}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <Card className="border shadow-sm">
                <CardHeader className="bg-muted border-b">
                    <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                        <Filter className="h-5 w-5 text-primary" />
                        Filters & Search
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="font-medium">Transaction Type</Label>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="h-11 border-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="sale">Sales (+)</SelectItem>
                                    <SelectItem value="payment">Collections (+)</SelectItem>
                                    <SelectItem value="purchase">Purchases (-)</SelectItem>
                                    <SelectItem value="expense">Expenses (-)</SelectItem>
                                    <SelectItem value="return">Returns (-)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-medium">Category</Label>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="h-11 border-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(category => (
                                        <SelectItem key={category} value={category}>{category}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-medium">GST Type</Label>
                            <Select value={gstFilter} onValueChange={setGstFilter}>
                                <SelectTrigger className="h-11 border-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Transactions</SelectItem>
                                    <SelectItem value="gst">GST Transactions</SelectItem>
                                    <SelectItem value="non-gst">Non-GST Transactions</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <Label className="font-medium">Start Date</Label>
                            <Input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="h-11 border-2"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-medium">End Date</Label>
                            <Input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="h-11 border-2"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-6">
                        <Button
                            variant="outline"
                            size="default"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="gap-2 flex-1 sm:flex-none"
                        >
                            <ArrowUpDown className="h-4 w-4" />
                            {sortOrder === 'asc' ? 'Old to New' : 'New to Old'}
                        </Button>
                        <Button
                            variant="outline"
                            size="default"
                            onClick={() => {
                                setFilterType('all');
                                setFilterCategory('all');
                                setGstFilter('all');
                                setDateRange({ start: '', end: '' });
                            }}
                            className="gap-2 flex-1 sm:flex-none"
                        >
                            Clear Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Transaction History */}
            <Card className="border shadow-md">
    <CardHeader className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-b">
        <CardTitle className="text-xl">Transaction History</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
            {filteredEntries.length}{" "}
            {filteredEntries.length === 1 ? "entry" : "entries"}
        </p>
    </CardHeader>

    <CardContent className="p-0">
        {filteredEntries.length === 0 ? (
            <div className="text-center py-12 px-4">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-foreground mb-2">
                    No transactions found
                </p>
                <p className="text-sm text-muted-foreground">
                    Try adjusting your filters to see more results
                </p>
            </div>
        ) : (
            /* 👇 SCROLL CONTAINER (MOBILE FIX) */
            <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse">
                    <thead className="bg-muted/50">
                        <tr className="border-b">
                            <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                Date
                            </th>
                            <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                Type
                            </th>
                            <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                Description
                            </th>
                            <th className="text-right p-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                Amount
                            </th>
                            <th className="text-right p-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                Balance
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y">
                        {filteredEntries.map((entry) => (
                            <tr
                                key={entry.id}
                                className="hover:bg-muted/30 transition-colors group"
                            >
                                <td className="p-4 align-top">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary/60" />
                                        <span className="text-sm font-medium whitespace-nowrap">
                                            {formatDate(entry.date)}
                                        </span>
                                    </div>
                                </td>

                                <td className="p-4 align-top">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                            entry.amount >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {getTypeIcon(entry.type)}
                                        </div>
                                        <Badge
                                            className={`text-[10px] font-bold uppercase tracking-tighter ${getTypeBadgeColor(
                                                entry.type
                                            )}`}
                                        >
                                            {entry.type}
                                        </Badge>
                                    </div>
                                </td>

                                <td className="p-4 align-top max-w-[300px]">
                                    <p className="text-sm font-semibold text-foreground leading-tight">
                                        {entry.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                        {entry.category && (
                                            <Badge
                                                variant="secondary"
                                                className="text-[10px] py-0 h-4 px-1.5 font-normal bg-muted/50"
                                            >
                                                {entry.category}
                                            </Badge>
                                        )}
                                        {entry.details?.billNumber && (
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                ID: {entry.details.billNumber}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                <td className="p-4 text-right align-top">
                                    <div className="flex flex-col items-end">
                                        <span
                                            className={`font-bold text-base tabular-nums ${
                                                entry.amount >= 0
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                            }`}
                                        >
                                            {entry.amount >= 0 ? "+" : ""}
                                            {formatCurrency(entry.amount)}
                                        </span>
                                        {entry.details?.currentPayment?.method && (
                                            <span className="text-[10px] text-muted-foreground opacity-70">
                                                via {entry.details.currentPayment.method}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                <td className="p-4 text-right align-top">
                                    <span className={`font-bold text-sm tabular-nums ${entry.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                        {formatCurrency(entry.balance)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </CardContent>
</Card>

        </div>
    );
}