import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import { PurchaseBill } from "@/types";

Font.register({
  family: "Inter",
  src: "/fonts/Inter-VariableFont_opsz,wght.ttf",
});

const mmToPt = (mm: number) => mm * 2.83465;

// ── Exact same P styles as BillView.tsx ────────────────────────────────────────
const P = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 7.5,
    padding: mmToPt(5),
    paddingBottom: mmToPt(9),
    lineHeight: 1.4,
    color: "#000",
    backgroundColor: "#fff",
  },
  border1: { borderWidth: 1, borderStyle: "solid", borderColor: "#000" },
  border2: { borderWidth: 2, borderStyle: "solid", borderColor: "#000" },
  borderRight: {
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: "#000",
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#000",
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#000",
  },
  borderLeft: {
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderLeftColor: "#000",
  },
  row: { flexDirection: "row" },
  flex1: { flex: 1 },
  w50: { width: "50%" },
  textRight: { textAlign: "right" },
  textCenter: { textAlign: "center" },
  bold: { fontWeight: "bold" },
  sm:   { fontSize: 7.5 },
  md:   { fontSize: 9 },
  lg:   { fontSize: 11 },
  xl:   { fontSize: 14 },
  gray: { color: "#6b7280" },
  p2: { padding: mmToPt(2) },
  p3: { padding: mmToPt(3) },
  mb1: { marginBottom: 3 },
  mb2: { marginBottom: 6 },
  mb3: { marginBottom: mmToPt(3) },
  mt1: { marginTop: 3 },
  mt2: { marginTop: 6 },
  pr2: { paddingRight: 6 },
  pb1: { paddingBottom: 3 },
  // ── table ──
  tableHeaderRow: { flexDirection: "row", color: "#fff" },
  tableRow:       { flexDirection: "row" },
  tableRowAlt:    { flexDirection: "row", backgroundColor: "#f3f4f6" },
  tableCell:      { padding: 4, fontSize: 7.5 },
  // ── signature ──
  centerItems: { alignItems: "center", justifyContent: "center" },
  sigBox: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomStyle: "dashed",
    borderBottomColor: "#9ca3af",
  },
  sigImage: {
    width: 120,
    height: 32,
    objectFit: "contain",
  },
});

const fmtDate = (date: string | Date | undefined): string => {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getFullYear()}`;
};

const addressLines = (address?: string) =>
  (address || "")
    .split(",")
    .map((l) => l.trim())
    .join("\n");

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

interface PurchaseBillPDFProps {
  bill: PurchaseBill;
  company?: any;
  signatureSrc?: string | null;
}

export const PurchaseBillPDF: React.FC<PurchaseBillPDFProps> = ({
  bill,
  company,
  signatureSrc,
}) => {
  const totalReturnAmount =
    bill.returns?.reduce((s, r) => s + r.totalReturnValue, 0) || 0;
  const balanceDue = bill.total - bill.paidAmount;
  const isPaid = bill.paymentStatus === "paid";

  const themeColor = company?.themeColor || "#1e40af";
  const resolvedSignature = signatureSrc
    ? ({ uri: String(signatureSrc) } as any)
    : null;

  // Column widths — matching BillView exactly
  const slW     = 22;
  const hsnW    = 46;
  const gstRateW = 30;
  const qtyW    = 38;
  const unitW   = 34;
  const rateW   = 62;
  const amtW    = 72;

  return (
    <Document>
      <Page size="A4" style={P.page}>

        {/* ── Company Header (border2 frame, same as sales bill) ─── */}
        <View style={[P.border2, P.mb3]}>
          <View
            style={[
              P.row,
              { padding: mmToPt(3), justifyContent: "space-between" },
            ]}
          >
            {/* Left — company info */}
            <View style={P.flex1}>
              <View style={[P.row, P.mb1, { alignItems: "center" }]}>
                {company?.logo && (
                  <Image
                    src={{ uri: String(company.logo) } as any}
                    style={{ width: 24, height: 24, marginRight: 6 }}
                  />
                )}
                <Text style={[P.xl, P.bold, { color: themeColor }]}>
                  {company?.name || "Your Company"}
                </Text>
              </View>
              {company?.address && (
                <Text style={[P.sm, { lineHeight: 1.5 }]}>
                  {addressLines(company.address)}
                </Text>
              )}
              {company?.gstin && (
                <View style={P.mt1}>
                  <Text style={P.sm}>
                    <Text style={P.bold}>GSTIN/UIN: </Text>
                    {company.gstin}
                  </Text>
                  {company?.state && (
                    <Text style={P.sm}>
                      <Text style={P.bold}>State: </Text>
                      {company.state}
                      {company?.stateCode ? `, Code: ${company.stateCode}` : ""}
                    </Text>
                  )}
                </View>
              )}
              <View style={P.mt1}>
                {company?.phone && (
                  <Text style={P.sm}>
                    <Text style={P.bold}>Phone: </Text>
                    {company.phone}
                  </Text>
                )}
                {company?.email && (
                  <Text style={P.sm}>
                    <Text style={P.bold}>Email: </Text>
                    {company.email}
                  </Text>
                )}
              </View>
            </View>

            {/* Right — invoice meta */}
            <View style={P.textRight}>
              <Text style={[{ fontSize: 14, color: themeColor }, P.bold, P.mb2]}>
                PURCHASE INVOICE
              </Text>
              <Text style={P.sm}>
                <Text style={P.bold}>Invoice No.: </Text>
                {bill.billNumber || "N/A"}
              </Text>
              <Text style={P.sm}>
                <Text style={P.bold}>Date: </Text>
                {fmtDate(bill.billDate || bill.createdAt)}
              </Text>
              {bill.dueDate && (
                <Text style={P.sm}>
                  <Text style={P.bold}>Due Date: </Text>
                  {fmtDate(bill.dueDate)}
                </Text>
              )}
              {bill.paymentTerms && (
                <Text style={P.sm}>
                  <Text style={P.bold}>Terms: </Text>
                  {bill.paymentTerms} days
                </Text>
              )}
              {/* Paid / Pending badge */}
              {/* <View
                style={{
                  alignSelf: "flex-end",
                  marginTop: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 3,
                  backgroundColor: isPaid ? "#dcfce7" : "#fef3c7",
                }}
              >
                <Text
                  style={[
                    P.bold,
                    { fontSize: 8, color: isPaid ? "#166534" : "#92400e" },
                  ]}
                >
                  {isPaid ? "✓ PAID" : "PENDING"}
                </Text>
              </View> */}
            </View>
          </View>
        </View>

        {/* ── Vendor Info ─────────────────────────────────────────── */}
        <View style={[P.row, P.mb3]}>
          <View style={[P.border1, P.p2, P.flex1]}>
            <Text
              style={[
                P.bold,
                P.md,
                { color: themeColor },
                P.borderBottom,
                P.pb1,
                P.mb1,
              ]}
            >
              Vendor / Supplier
            </Text>
            <Text style={[P.bold, P.md]}>
              {(bill.vendorName || "").toUpperCase()}
            </Text>
            {bill.vendorGstin && (
              <Text style={[P.sm, P.mt1]}>
                <Text style={P.bold}>GSTIN/UIN: </Text>
                {bill.vendorGstin}
              </Text>
            )}
            {bill.vendorAddress && (
              <Text style={[P.sm, P.mt1, { lineHeight: 1.5 }]}>
                {addressLines(bill.vendorAddress)}
              </Text>
            )}
          </View>
        </View>

        {/* ── Items Table ─────────────────────────────────────────── */}
        <View style={P.mb3}>
          {/* Header */}
          <View style={[P.tableHeaderRow, { backgroundColor: themeColor }]}>
            <Text
              style={[P.tableCell, P.bold, P.textCenter, P.border1, { width: slW }]}
            >
              Sl
            </Text>
            <Text
              style={[P.tableCell, P.bold, P.border1, { flex: 1, borderLeftWidth: 0 }]}
            >
              Description
            </Text>
            <Text
              style={[P.tableCell, P.bold, P.textCenter, P.border1, { width: hsnW, borderLeftWidth: 0 }]}
            >
              HSN/SAC
            </Text>
            <Text
              style={[P.tableCell, P.bold, P.textCenter, P.border1, { width: gstRateW, borderLeftWidth: 0 }]}
            >
              GST%
            </Text>
            <Text
              style={[P.tableCell, P.bold, P.textCenter, P.border1, { width: qtyW, borderLeftWidth: 0 }]}
            >
              Qty
            </Text>
            <Text
              style={[P.tableCell, P.bold, P.textCenter, P.border1, { width: unitW, borderLeftWidth: 0 }]}
            >
              Unit
            </Text>
            <Text
              style={[P.tableCell, P.bold, P.textCenter, P.border1, { width: rateW, borderLeftWidth: 0 }]}
            >
              Rate
            </Text>
            <Text
              style={[P.tableCell, P.bold, P.textRight, P.border1, { width: amtW, borderLeftWidth: 0 }]}
            >
              Amount
            </Text>
          </View>

          {/* Item rows */}
          {bill.items.map((item, i) => (
            <View key={i} style={[i % 2 === 0 ? P.tableRowAlt : P.tableRow]}>
              <Text
                style={[P.tableCell, P.textCenter, P.border1, { width: slW, borderTopWidth: 0 }]}
              >
                {i + 1}
              </Text>
              <View
                style={[P.tableCell, P.border1, { flex: 1, borderLeftWidth: 0, borderTopWidth: 0 }]}
              >
                <Text>{item.description}</Text>
                {item.hsnCode ? (
                  <Text style={{ fontSize: 6.5, color: "#4b5563" }}>
                    HSN: {item.hsnCode}
                  </Text>
                ) : null}
              </View>
              <Text
                style={[P.tableCell, P.textCenter, P.border1, { width: hsnW, borderLeftWidth: 0, borderTopWidth: 0 }]}
              >
                {item.hsnCode || ""}
              </Text>
              <Text
                style={[P.tableCell, P.textCenter, P.border1, { width: gstRateW, borderLeftWidth: 0, borderTopWidth: 0 }]}
              >
                {item.gstRate != null ? `${item.gstRate}%` : ""}
              </Text>
              <Text
                style={[P.tableCell, P.textCenter, P.border1, { width: qtyW, borderLeftWidth: 0, borderTopWidth: 0 }]}
              >
                {item.quantity}
              </Text>
              <Text
                style={[P.tableCell, P.textCenter, P.border1, { width: unitW, borderLeftWidth: 0, borderTopWidth: 0 }]}
              >
                {item.unit || ""}
              </Text>
              <Text
                style={[P.tableCell, P.textRight, P.border1, { width: rateW, borderLeftWidth: 0, borderTopWidth: 0 }]}
              >
                {fmt(item.rate)}
              </Text>
              <Text
                style={[P.tableCell, P.textRight, P.border1, { width: amtW, borderLeftWidth: 0, borderTopWidth: 0 }]}
              >
                {fmt(item.amount)}
              </Text>
            </View>
          ))}

          {/* Subtotal */}
          <View style={[P.tableRowAlt, P.bold]}>
            <Text
              style={[P.tableCell, P.textRight, P.border1, { flex: 1, borderTopWidth: 0 }]}
            >
              Subtotal
            </Text>
            <Text
              style={[P.tableCell, P.textRight, P.border1, { width: amtW, borderLeftWidth: 0, borderTopWidth: 0 }]}
            >
              {fmt(bill.subtotal)}
            </Text>
          </View>

          {/* GST */}
          {bill.totalTax > 0 && (
            <View style={P.tableRow}>
              <Text
                style={[P.tableCell, P.textRight, P.border1, { flex: 1, borderTopWidth: 0 }]}
              >
                Total Tax (GST)
              </Text>
              <Text
                style={[P.tableCell, P.textRight, P.border1, { width: amtW, borderLeftWidth: 0, borderTopWidth: 0 }]}
              >
                {fmt(bill.totalTax)}
              </Text>
            </View>
          )}

          {/* Returns deduction */}
          {totalReturnAmount > 0 && (
            <View style={P.tableRow}>
              <Text
                style={[P.tableCell, P.textRight, P.border1, { flex: 1, borderTopWidth: 0, color: "#b91c1c" }]}
              >
                Less: Returns (incl. GST)
              </Text>
              <Text
                style={[P.tableCell, P.textRight, P.border1, { width: amtW, borderLeftWidth: 0, borderTopWidth: 0, color: "#b91c1c" }]}
              >
                -{fmt(totalReturnAmount)}
              </Text>
            </View>
          )}

          {/* Net total */}
          <View style={[P.tableRow, P.bold, { backgroundColor: themeColor }]}>
            <Text
              style={[P.tableCell, P.textRight, P.border1, { flex: 1, color: "#fff", borderTopWidth: 0 }]}
            >
              Net Amount
            </Text>
            <Text
              style={[P.tableCell, P.textRight, P.border1, { width: amtW, color: "#fff", borderLeftWidth: 0, borderTopWidth: 0 }]}
            >
              {fmt(bill.total)}
            </Text>
          </View>
        </View>

        {/* ── Payment Info + Payment History ──────────────────────── */}
        <View style={[P.row, P.border1, P.mb3, { minHeight: mmToPt(20) }]}>
          {/* Left: status & balance */}
          <View style={[P.flex1, P.p2, P.borderRight]}>
            <Text
              style={[P.bold, P.md, { color: themeColor }, P.borderBottom, P.pb1, P.mb1]}
            >
              Payment Information
            </Text>
            <Text style={P.sm}>
              <Text style={P.bold}>Status: </Text>
              {(bill.paymentStatus || "").toUpperCase()}
            </Text>
            <Text style={P.sm}>
              <Text style={P.bold}>Amount Paid: </Text>
              Rs. {fmt(bill.paidAmount)}
            </Text>
            <Text
              style={[
                P.bold, P.sm, P.mt1,
                { color: balanceDue > 0 ? "#dc2626" : "#059669" },
              ]}
            >
              Balance Due: Rs. {fmt(balanceDue)}
            </Text>
          </View>

          {/* Right: payment history (if any) */}
          {bill.payments && bill.payments.length > 0 && (
            <View style={[P.flex1, P.p2]}>
              <Text
                style={[P.bold, P.md, { color: themeColor }, P.borderBottom, P.pb1, P.mb1]}
              >
                Payment History
              </Text>
              {bill.payments.map((payment, i) => (
                <View
                  key={i}
                  style={[
                    P.row,
                    {
                      justifyContent: "space-between",
                      borderBottomWidth: 0.3,
                      borderBottomColor: "#e5e7eb",
                      paddingBottom: 2,
                      paddingTop: 1,
                    },
                  ]}
                >
                  <Text style={[P.sm, { color: "#374151", flex: 1, paddingRight: 6 }]}>
                    {payment.method} ({fmtDate(payment.date)})
                  </Text>
                  <Text style={[P.sm, P.bold, { minWidth: 68, textAlign: "right" }]}>
                    Rs. {fmt(payment.amount)}
                  </Text>
                </View>
              ))}
              <View
                style={[
                  P.row,
                  {
                    justifyContent: "space-between",
                    marginTop: 4,
                    paddingTop: 4,
                    borderTopWidth: 1,
                    borderTopColor: "#d1d5db",
                  },
                ]}
              >
                <Text style={[P.bold, P.sm]}>Total Paid</Text>
                <Text style={[P.bold, P.sm, { color: themeColor }]}>
                  Rs. {fmt(bill.paidAmount)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Returns Detail ──────────────────────────────────────── */}
        {bill.returns && bill.returns.length > 0 && (
          <View style={P.mb3}>
            {/* Returns table header */}
            <View style={[P.tableHeaderRow, { backgroundColor: "#ea580c" }]}>
              <Text style={[P.tableCell, P.bold, P.border1, { flex: 1 }]}>
                Item / Reason
              </Text>
              <Text style={[P.tableCell, P.bold, P.textCenter, P.border1, { width: 40, borderLeftWidth: 0 }]}>
                Qty
              </Text>
              <Text style={[P.tableCell, P.bold, P.textCenter, P.border1, { width: 64, borderLeftWidth: 0 }]}>
                Return Date
              </Text>
              <Text style={[P.tableCell, P.bold, P.textRight, P.border1, { width: amtW, borderLeftWidth: 0 }]}>
                Value (incl. GST)
              </Text>
            </View>
            {bill.returns.map((ret, ri) =>
              ret.items.map((item, ii) => {
                const val = item.quantity * item.rate;
                const total = val + val * ((item.gstRate || 0) / 100);
                return (
                  <View
                    key={`${ri}-${ii}`}
                    style={[P.tableRow, { backgroundColor: "#fff7ed" }]}
                  >
                    <View
                      style={[P.tableCell, P.border1, { flex: 1, borderTopWidth: 0 }]}
                    >
                      <Text style={P.bold}>{item.description}</Text>
                      {ret.notes ? (
                        <Text style={[P.sm, { color: "#92400e", fontStyle: "italic" }]}>
                          {ret.notes}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[P.tableCell, P.textCenter, P.border1, { width: 40, borderLeftWidth: 0, borderTopWidth: 0 }]}
                    >
                      -{item.quantity}
                    </Text>
                    <Text
                      style={[P.tableCell, P.textCenter, P.border1, { width: 64, borderLeftWidth: 0, borderTopWidth: 0 }]}
                    >
                      {fmtDate(ret.returnDate)}
                    </Text>
                    <Text
                      style={[P.tableCell, P.textRight, P.bold, P.border1, { width: amtW, borderLeftWidth: 0, borderTopWidth: 0, color: "#ea580c" }]}
                    >
                      {fmt(total)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Declaration ─────────────────────────────────────────── */}
        <View style={[P.border1, P.p2, P.mb1]}>
          <Text style={[P.bold, P.md, { color: themeColor }, P.borderBottom, P.pb1, P.mb1]}>
            Declaration
          </Text>
          <Text style={[P.sm, { lineHeight: 1.5 }]}>
            We declare that this invoice shows the actual price of the goods described
            and that all particulars are true and correct.
          </Text>
        </View>

        {/* ── Signature Area ──────────────────────────────────────── */}
        <View style={[P.row, P.border1, { borderTopWidth: 0 }]}>
          {/* Left: party (blank) */}
          <View style={[P.flex1, P.p3, P.borderRight]}>
            <Text style={[P.bold, P.sm, P.mb1]}>
              Party's Seal and Signature
            </Text>
            <View style={P.sigBox} />
            <Text style={[P.sm, P.textCenter, P.mt1, P.gray]}>
              {bill.vendorName || "Vendor"}
            </Text>
          </View>
          {/* Right: our company */}
          <View style={[P.flex1, P.p3]}>
            <Text style={[P.bold, P.sm, P.mb1, P.textRight]}>
              Company Seal and Signature
            </Text>
            <View style={[P.sigBox, P.centerItems]}>
              {resolvedSignature ? (
                <Image src={resolvedSignature} style={P.sigImage} />
              ) : null}
            </View>
            <Text style={[P.sm, P.textCenter, P.mt1, P.gray]}>
              {company?.name || ""}
            </Text>
            <Text style={[P.sm, P.textCenter, P.mt1]}>
              Authorised Signatory
            </Text>
          </View>
        </View>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <Text style={[P.sm, P.textCenter, P.mt1, P.gray]}>
          This is a Computer Generated Invoice
        </Text>
      </Page>
    </Document>
  );
};
