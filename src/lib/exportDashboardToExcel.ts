import * as XLSX from "xlsx";
import { format } from 'date-fns';

export const exportDashboardToExcel = (
    stats: any,
    chartData: any,
    productAnalytics: any,
    clientAnalytics: any,
    bills: any[],
    purchaseBills: any[],
    company: any,
    dateRange: { start: string; end: string }
) => {
    const workbook = XLSX.utils.book_new();

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
        const rounded = Math.round(amount);
        const formatted = new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(rounded));
        return `${rounded < 0 ? "-" : ""}Rs. ${formatted}`;
    };
    const purchasePaidAmount = Math.max(0, stats.paidPurchases ?? stats.totalPurchases ?? 0);
    const totalSellAmount = (stats.totalRevenue || 0) + (stats.pendingAmount || 0);
    const currentGrossProfit = (stats.grossProfit || 0) - (stats.expectedProfit || 0);
    const currentNetProfitCollected =
        currentGrossProfit - (stats.totalExpenses || 0) - (stats.deadstockLoss || 0);

    // ========== SHEET 1: EXECUTIVE SUMMARY ==========
    const summaryData = [
        ['DASHBOARD EXECUTIVE SUMMARY'],
        ['Company:', company?.name || 'Invoice Mitra'],
        ['Report Generated:', format(new Date(), 'dd-MM-yyyy HH:mm:ss')],
        ['Period:', `${dateRange.start || 'All Time'} to ${dateRange.end || 'Present'}`],
        [],
        ['FINANCIAL OVERVIEW'],
        ['Metric', 'Value', 'Notes'],
        ['Total Revenue (Received)', formatCurrency(stats.totalRevenue), 'Actual money received including partial payments'],
        ['Pending Collection', formatCurrency(stats.pendingAmount || 0), 'Uncollected sales amount for sold goods'],
        ['Total Revenue for Gross Profit', formatCurrency(totalSellAmount), 'Collected + pending sales amount used in gross profit'],
        ['Total Revenue (excl. GST)', formatCurrency(stats.totalRevenue - stats.gstCollected), 'Revenue without GST'],
        ['Total Discount Given', formatCurrency(stats.totalDiscount), 'Total discount amount'],
        ['Total Purchases', formatCurrency(stats.totalPurchases), 'Total purchase value (paid + pending), after returns'],
        ['Purchase Pending Payment', formatCurrency(stats.pendingPurchases || 0), 'Pending purchases payable to vendors'],
        ['Current Inventory Value', formatCurrency(stats.inventoryValue || 0), 'Current value of available inventory stock'],
        ['Deadstock Value', formatCurrency(stats.deadstockLoss || 0), 'Value lost in deadstock/damaged inventory'],
        ['Gross Profit', formatCurrency(stats.grossProfit), '(Collected + pending revenue) - COGS (incl. GST)'],
        ['Current Gross Profit', formatCurrency(currentGrossProfit), 'Gross profit from collected revenue only'],
        ['Expenses', formatCurrency(stats.totalExpenses), 'Operational expenses in selected period'],
        ['Expected Net Profit', formatCurrency(stats.expectedProfit || 0), 'Pending collection contribution (shown separately)'],
        ['Total Net Profit (with expected profits)', formatCurrency(stats.expectedTotalNetProfit || 0), 'Final net profit for selected period'],
        ['Current Net Profit (After All Deductions)', formatCurrency(currentNetProfitCollected), 'Net profit from collected amount only (after expenses/losses)'],
        ['Profit Margin', `${stats.totalRevenue > 0 ? ((stats.grossProfit / stats.totalRevenue) * 100).toFixed(2) : '0.00'}%`, 'Gross Profit / Revenue'],
        ['ROI', `${stats.totalPurchases > 0 ? ((stats.profit / stats.totalPurchases) * 100).toFixed(2) : 'N/A'}%`, 'Net Profit / Total Purchases'],
        [],
        ['PURCHASE & SALES SETTLEMENT OVERVIEW'],
        ['Metric', 'Value', 'Notes'],
        ['Total Purchase', formatCurrency(stats.totalPurchases || 0), 'Total purchase value after returns'],
        ['Purchase Paid Amount', formatCurrency(purchasePaidAmount), 'Total purchases already paid'],
        ['Purchase Pending Amount', formatCurrency(stats.pendingPurchases || 0), 'Pending purchases payable to vendors'],
        ['Total Sell (Collected + Pending)', formatCurrency(totalSellAmount), 'Collected + pending sales amount'],
        ['Sells Collected Amount', formatCurrency(stats.totalRevenue || 0), 'Total collected from sales'],
        ['Sells Pending Amount', formatCurrency(stats.pendingAmount || 0), 'Pending receivable from sales'],
        [],
        ['COST BREAKDOWN'],
        ['Category', 'Amount'],
        ['Cost of Goods Sold (COGS incl. GST)', formatCurrency(stats.totalCOGS)],
        ['Operational Expenses', formatCurrency(stats.totalExpenses)],
        ['Deadstock Loss', formatCurrency(stats.deadstockLoss)],
        ['Total Costs', formatCurrency(stats.totalCOGS + stats.totalExpenses + stats.deadstockLoss)],
        [],
        ['GST ANALYSIS'],
        ['Type', 'Amount'],
        ['GST Collected (Output Tax)', formatCurrency(stats.gstCollected)],
        ['GST Paid (Input Tax Credit)', formatCurrency(stats.gstPaid)],
        ['Net GST Payable/Refundable', formatCurrency(stats.netGst)],
        [],
        ['PAYMENT STATUS'],
        ['Status', 'Amount (Subtotal)', 'Count'],
        ['Paid', formatCurrency(stats.paidSubtotal), `${stats.totalBills - (bills.filter(b => b.paymentStatus !== 'paid').length)} bills`],
        ['Pending', formatCurrency(stats.pendingSubtotal), `${bills.filter(b => b.paymentStatus === 'pending').length} bills`],
        ['Overdue', formatCurrency(stats.overdueSubtotal), `${stats.overdueBills} bills`],
        ['Total Pending Amount (incl. GST)', formatCurrency(stats.pendingAmount), ''],
        [],
        ['INVENTORY & RETURNS'],
        ['Metric', 'Value'],
        ['Current Inventory Value', formatCurrency(stats.inventoryValue)],
        ['Deadstock Value', formatCurrency(stats.deadstockLoss || 0)],
        ['Total Products', stats.totalProducts],
        ['Total Returns', stats.totalReturns],
        ['Deadstock Loss', formatCurrency(stats.deadstockLoss)],
        [],
        ['BUSINESS METRICS'],
        ['Metric', 'Value'],
        ['Total Sales Bills', stats.totalBills],
        ['Total Purchase Bills', stats.totalPurchaseBills],
        ['Total Clients', stats.totalClients],
        ['Pending Purchases Payable', formatCurrency(stats.pendingPurchases)],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths
    summarySheet['!cols'] = [
        { wch: 40 }, // Column A
        { wch: 20 }, // Column B
        { wch: 50 }, // Column C
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Executive Summary");

    // ========== SHEET 2: SALES VS PURCHASES TREND ==========
    const trendData = [
        ['MONTHLY SALES VS PURCHASES ANALYSIS'],
        ['Period', 'Sales (excl. GST)', 'Purchases', 'Net (Sales - Purchases)', 'Profit'],
    ];

    chartData.monthlySpendVsSales.forEach((row: any, index: number) => {
        const profitRow = chartData.monthlyProfit.find((p: any) => p.period === row.period);
        const profit = profitRow?.profit || 0;
        const net = row.sales - row.purchases;

        trendData.push([
            row.period,
            row.sales,
            row.purchases,
            net,
            profit
        ]);
    });

    // Add totals
    const totalSales = chartData.monthlySpendVsSales.reduce((sum: number, row: any) => sum + row.sales, 0);
    const totalPurchases = chartData.monthlySpendVsSales.reduce((sum: number, row: any) => sum + row.purchases, 0);
    const totalProfit = chartData.monthlyProfit.reduce((sum: number, row: any) => sum + row.profit, 0);

    trendData.push([]);
    trendData.push(['TOTAL', totalSales, totalPurchases, totalSales - totalPurchases, totalProfit]);

    const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
    trendSheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, trendSheet, "Sales vs Purchases");

    // ========== SHEET 3: PRODUCT PERFORMANCE ==========
    const productData = [
        ['PRODUCT PERFORMANCE ANALYSIS'],
        [],
        ['TOP PRODUCTS BY REVENUE'],
        ['Rank', 'Product Name', 'Revenue', 'Quantity Sold', 'Profit', 'Margin %'],
    ];

    productAnalytics.topProductsByRevenue.forEach((product: any, index: number) => {
        productData.push([
            index + 1,
            product.name,
            product.revenue,
            product.quantity,
            product.profit,
            product.margin
        ]);
    });

    productData.push([]);
    productData.push(['TOP PRODUCTS BY PROFIT MARGIN']);
    productData.push(['Rank', 'Product Name', 'Revenue', 'Profit', 'Margin %', 'Quantity']);

    productAnalytics.topProductsByProfit.forEach((product: any, index: number) => {
        productData.push([
            index + 1,
            product.name,
            product.revenue,
            product.profit,
            product.margin,
            product.quantity
        ]);
    });

    productData.push([]);
    productData.push(['TOP PRODUCTS BY QUANTITY SOLD']);
    productData.push(['Rank', 'Product Name', 'Quantity', 'Revenue', 'Profit']);

    productAnalytics.topProductsByQuantity.forEach((product: any, index: number) => {
        productData.push([
            index + 1,
            product.name,
            product.quantity,
            product.revenue,
            product.profit
        ]);
    });

    if (productAnalytics.mostReturnedProducts.length > 0) {
        productData.push([]);
        productData.push(['PRODUCTS WITH MOST RETURNS']);
        productData.push(['Rank', 'Product Name', 'Return Qty', 'Total Sold', 'Return Rate %', 'Return Value']);

        productAnalytics.mostReturnedProducts.forEach((product: any, index: number) => {
            productData.push([
                index + 1,
                product.name,
                product.returnQuantity,
                product.totalSold,
                product.returnRate,
                product.returnValue
            ]);
        });
    }

    const productSheet = XLSX.utils.aoa_to_sheet(productData);
    productSheet['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, productSheet, "Product Performance");

    // ========== SHEET 4: CLIENT ANALYSIS ==========
    const clientData = [
        ['CLIENT PERFORMANCE ANALYSIS'],
        [],
        ['TOP CLIENTS BY REVENUE'],
        ['Rank', 'Client Name', 'Total Revenue', 'Order Count', 'Avg Bill Value', 'Pending Amount'],
    ];

    clientAnalytics.topClientsByRevenue.forEach((client: any, index: number) => {
        clientData.push([
            index + 1,
            client.name,
            client.revenue,
            client.billCount,
            client.avgBillValue,
            client.pendingAmount
        ]);
    });

    clientData.push([]);
    clientData.push(['MOST ACTIVE CLIENTS (BY ORDERS)']);
    clientData.push(['Rank', 'Client Name', 'Order Count', 'Total Revenue', 'Avg Bill Value']);

    clientAnalytics.topClientsByOrders.forEach((client: any, index: number) => {
        clientData.push([
            index + 1,
            client.name,
            client.billCount,
            client.revenue,
            client.avgBillValue
        ]);
    });

    if (clientAnalytics.clientReturnStats.length > 0) {
        clientData.push([]);
        clientData.push(['CLIENTS WITH RETURNS']);
        clientData.push(['Rank', 'Client Name', 'Return Count', 'Return Value', 'Return Rate %']);

        clientAnalytics.clientReturnStats.forEach((client: any, index: number) => {
            clientData.push([
                index + 1,
                client.name,
                client.returnCount,
                client.returnValue,
                client.returnRate
            ]);
        });
    }

    const clientSheet = XLSX.utils.aoa_to_sheet(clientData);
    clientSheet['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, clientSheet, "Client Analysis");

    // ========== SHEET 5: RECENT SALES BILLS ==========
    const salesData = [
        ['RECENT SALES BILLS'],
        ['Bill Number', 'Client Name', 'Date', 'Subtotal', 'GST', 'Total', 'Paid Amount', 'Status', 'Due Date'],
    ];

    bills.forEach((bill: any) => {
        salesData.push([
            bill.billNumber,
            bill.client.name,
            format(new Date(bill.date), 'dd-MM-yyyy'),
            bill.subtotal,
            bill.totalTax,
            bill.total,
            bill.paidAmount,
            bill.paymentStatus,
            bill.dueDate ? format(new Date(bill.dueDate), 'dd-MM-yyyy') : ''
        ]);
    });

    const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
    salesSheet['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, salesSheet, "Recent Sales");

    // ========== SHEET 6: RECENT PURCHASES ==========
    const purchaseData = [
        ['RECENT PURCHASE BILLS'],
        ['Vendor Name', 'Bill Number', 'Date', 'Subtotal', 'GST', 'Total', 'Status'],
    ];

    purchaseBills.forEach((bill: any) => {
        purchaseData.push([
            bill.vendorName,
            bill.billNumber || 'N/A',
            format(new Date(bill.billDate || bill.createdAt), 'dd-MM-yyyy'),
            bill.subtotal,
            bill.totalTax,
            bill.total,
            bill.paymentStatus
        ]);
    });

    const purchaseSheet = XLSX.utils.aoa_to_sheet(purchaseData);
    purchaseSheet['!cols'] = [
        { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 15 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, purchaseSheet, "Recent Purchases");

    // ========== SHEET 7: PAYMENT BREAKDOWN ==========
    const paymentData = [
        ['PAYMENT STATUS BREAKDOWN'],
        [],
        ['Status', 'Amount (Total)', 'Amount (Subtotal)', 'Percentage'],
    ];

    const totalAmount = stats.totalRevenue;
    chartData.paymentBreakdown.forEach((item: any) => {
        const percentage = totalAmount > 0 ? ((item.value / totalAmount) * 100).toFixed(2) : '0.00';
        const subtotalMap: any = {
            'Paid': stats.paidSubtotal,
            'Pending': stats.pendingSubtotal,
            'Overdue': stats.overdueSubtotal
        };

        paymentData.push([
            item.name,
            item.value,
            subtotalMap[item.name] || 0,
            `${percentage}%`
        ]);
    });

    // ... all the existing 7 sheets code ...

    // ========== SHEET 7: PAYMENT BREAKDOWN ==========
    const paymentSheet = XLSX.utils.aoa_to_sheet(paymentData);
    paymentSheet['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, paymentSheet, "Payment Breakdown");

    // ========== ADD YOUR CUSTOM SHEET HERE ==========
    // Example: Adding a notes or summary sheet
    const customSheetData = [
        ['Notes and Observations'],
        [''],
        ['Key Insight', 'Details'],
        ['Best Selling Month', 'January 2024'],
        ['Highest Margin Product', 'Product XYZ'],
    ];
    const customSheet = XLSX.utils.aoa_to_sheet(customSheetData);
    customSheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, customSheet, "Notes");

    // Write the file (this MUST be last)



    // Write the file
    XLSX.writeFile(workbook, `Custom_Name_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};
