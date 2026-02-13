import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Vendor, PurchaseBill } from '@/types';
import { formatCurrency, formatDate } from '@/lib/billUtils';

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  vendorInfo: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f6f6f6',
    padding: 10,
    marginBottom: 20,
    borderRadius: 4,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 8,
    color: '#666',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 10,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '16.6%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#2980b9',
    color: 'white',
    padding: 5,
    fontWeight: 'bold',
  },
  tableCol: {
    width: '16.6%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 8,
  },
  amountCell: {
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#666',
    fontSize: 8,
    borderTop: 0.5,
    paddingTop: 10,
  }
});

interface VendorLedgerPDFProps {
  vendor: Vendor;
  transactions: any[];
  stats: {
    totalPurchase: number;
    totalPaid: number;
    pendingAmount: number;
    totalReturn: number;
    billCount: number;
  };
}

export const VendorLedgerPDF = ({ vendor, transactions, stats }: VendorLedgerPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>VENDOR LEDGER</Text>
        <Text>Statement Date: {formatDate(new Date().toISOString())}</Text>
      </View>

      <View style={styles.vendorInfo}>
        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>{vendor.name}</Text>
        <Text>GSTIN: {vendor.gstin || 'N/A'}</Text>
        <Text>Phone: {vendor.phone || 'N/A'}</Text>
        <Text>Address: {vendor.address || 'N/A'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Purchase</Text>
          <Text style={styles.statValue}>{formatCurrency(stats.totalPurchase)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Paid</Text>
          <Text style={styles.statValue}>{formatCurrency(stats.totalPaid)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Return</Text>
          <Text style={styles.statValue}>{formatCurrency(stats.totalReturn)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Balance Due</Text>
          <Text style={[styles.statValue, { color: '#e67e22' }]}>{formatCurrency(stats.pendingAmount)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Date</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Type</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Reference</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Mode</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Debit</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Credit</Text></View>
        </View>
        {transactions.map((tx, index) => (
          <View style={styles.tableRow} key={index}>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{formatDate(tx.date)}</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{tx.type}</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{tx.reference}</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{tx.method || '-'}</Text></View>
            <View style={styles.tableCol}><Text style={[styles.tableCell, styles.amountCell]}>{tx.type === 'Purchase' ? formatCurrency(tx.amount) : '-'}</Text></View>
            <View style={styles.tableCol}><Text style={[styles.tableCell, styles.amountCell]}>{tx.type !== 'Purchase' ? formatCurrency(tx.amount) : '-'}</Text></View>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Generated on {new Date().toLocaleString()} - Page 1
      </Text>
    </Page>
  </Document>
);