import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getBills,
  getExpenses,
  getProducts,
  getCreators,
} from "@/lib/storage";
import { Bill, Expense, Product, BillCreator } from "@/types";
import { formatCurrency, formatDate } from "@/lib/billUtils";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Package,
  Download,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { exportDashboardToExcel } from "@/lib/exportDashboardToExcel";

export default function ExpoDashboard() {
  const { expoId } = useParams<{ expoId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expoUser, setExpoUser] = useState<BillCreator | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [allBills, allExpenses, allProducts, allCreators] = await Promise.all([
        getBills(),
        getExpenses(),
        getProducts(),
        getCreators(),
      ]);

      const creator = allCreators.find(c => c.expoId === expoId || c.id === expoId);
      setExpoUser(creator || null);

      const filteredBills = allBills.filter(b => b.expoId === expoId || b.createdBy === creator?.name);
      const filteredExpenses = allExpenses.filter(e => e.expoId === expoId);
      
      setBills(filteredBills);
      setExpenses(filteredExpenses);
      setProducts(allProducts);
      setLoading(false);
    };
    loadData();
  }, [expoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalSales = bills.reduce((sum, b) => sum + b.total, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCollected = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const netProfit = totalSales - totalExpenses;

  // Stock status for this expo
  const expoStockStatus = products
    .filter(p => p.expoStocks?.[expoId || ""] !== undefined)
    .map(p => ({
      name: p.name,
      stock: p.expoStocks?.[expoId || ""] || 0,
    }));

  const handleDownloadReport = () => {
    // Basic CSV download for now
    const rows = [
      ["Type", "Date", "Description", "Amount"],
      ...bills.map(b => ["Sale", b.date, b.billNumber, b.total]),
      ...expenses.map(e => ["Expense", e.date, e.description, e.amount]),
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expo_report_${expoId}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              Expo Dashboard: {expoId}
            </h1>
            <p className="text-muted-foreground">
              Segmented view for {expoUser?.name || "Expo User"}
            </p>
          </div>
        </div>
        <Button onClick={handleDownloadReport} className="gap-2">
          <Download className="h-4 w-4" />
          Download Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalCollected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Value</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(netProfit)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Expo Stock Status
            </CardTitle>
            <CardDescription>Available stock at this location</CardDescription>
          </CardHeader>
          <CardContent>
            {expoStockStatus.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No stock assigned to this expo.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expoStockStatus.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right font-bold">{item.stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expo Sales</CardTitle>
            <CardDescription>Latest bills generated at this expo</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.slice(0, 5).map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{bill.billNumber}</TableCell>
                    <TableCell>{bill.client.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(bill.total)}</TableCell>
                  </TableRow>
                ))}
                {bills.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No sales recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
