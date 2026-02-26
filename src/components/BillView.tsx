import React, { useRef, useEffect, useState } from "react";
import { Bill, SampleBill, BankAccount } from "@/types";
import {
  formatCurrency,
  formatDate,
  numberToWords,
  formatToTwoDecimals,
} from "@/lib/billUtils";
import { getCompanyProfile } from "@/lib/storage";
import { Button } from "./ui/button";
import { Download, Printer, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { Font } from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  src: "/fonts/Inter-VariableFont_opsz,wght.ttf",
});

interface BillViewProps {
  bill: Bill;
}

type InternationalDetailsLike = {
  preCarriageBy?: string;
  vesselsFlightNo?: string;
  portOfDischarge?: string;
  placeOfReceiptByPreCarriage?: string;
  portOfLoading?: string;
  finalDestination?: string;
  grossWeight?: number;
  netWeight?: number;
  countryOfOrigin?: string;
  countryOfFinalDestination?: string;
};

type BillLike =
  | (Bill & {
      billType?: "domestic" | "international";
      internationalDetails?: InternationalDetailsLike;
      bankAccount?: BankAccount;
    })
  | (SampleBill & {
      billType?: "domestic" | "international";
      internationalDetails?: InternationalDetailsLike;
      returnComment?: string;
      bankAccount?: BankAccount;
    });

const mmToPt = (mm: number) => mm * 2.83465;

const getDeviceDetails = (item: any) => {
  const parts: string[] = [];
  if (item?.itemNo) parts.push(`Item: ${item.itemNo}`);
  if (item?.model) parts.push(`Model: ${item.model}`);
  if (item?.imeiNumber) parts.push(`IMEI: ${item.imeiNumber}`);
  if (item?.storage || item?.color) {
    parts.push(
      `${item.storage || "-"}` + (item.color ? ` / ${item.color}` : ""),
    );
  }
  return parts;
};

// ─── Unified PDF styles ───────────────────────────────────────────────────────
const P = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 7.5,
    padding: mmToPt(5),
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
  col2: { flexDirection: "row" },
  flex1: { flex: 1 },
  w50: { width: "50%" },
  w100: { width: "100%" },
  textRight: { textAlign: "right" },
  textCenter: { textAlign: "center" },
  textLeft: { textAlign: "left" },
  bold: { fontWeight: "bold" },
  sm: { fontSize: 7.5 },
  md: { fontSize: 9 },
  lg: { fontSize: 11 },
  xl: { fontSize: 14 },
  gray: { color: "#6b7280" },
  p1: { padding: 3 },
  p2: { padding: mmToPt(2) },
  p3: { padding: mmToPt(3) },
  mb1: { marginBottom: 3 },
  mb2: { marginBottom: 6 },
  mb3: { marginBottom: mmToPt(3) },
  mt1: { marginTop: 3 },
  mt2: { marginTop: 6 },
  pr2: { paddingRight: 6 },
  pb1: { paddingBottom: 3 },
  pt1: { paddingTop: 3 },
  tableHeaderRow: { flexDirection: "row", color: "#fff" },
  tableRow: { flexDirection: "row" },
  tableRowAlt: { flexDirection: "row", backgroundColor: "#f3f4f6" },
  tableCell: { padding: 4, fontSize: 7.5 },
  sigBox: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomStyle: "dashed",
    borderBottomColor: "#9ca3af",
  },
  sigBoxSolid: { height: 40 },
});

const fmtDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getFullYear()}`;
};

const addressLines = (address: string) =>
  (address || "")
    .split(",")
    .map((l) => l.trim())
    .join("\n");

// ─── BillPDF ─────────────────────────────────────────────────────────────────
export const BillPDF = ({
  bill,
  company,
  qrDataURL,
  isSample,
}: {
  bill: BillLike;
  company: any;
  qrDataURL: string;
  isSample?: boolean;
}) => {
  const gstEnabled = (company.gstEnabled ?? true) as boolean;
  const showGST = gstEnabled && bill.totalTax > 0;
  const isInterState: boolean =
    bill.gstType === "igst" ||
    (!bill.gstType && (company?.stateCode ?? "") !== bill.client.stateCode);
  const isInternational = bill.billType === "international";
  const title = isInternational
    ? "INVOICE"
    : gstEnabled
      ? "TAX INVOICE"
      : "INVOICE";

  const themeColor = company.themeColor || "#1e40af";

  const slW = 22;
  const hsnW = 46;
  const gstRateW = 30;
  const qtyW = 38;
  const unitW = 34;
  const rateW = 62;
  const amtW = 72;

  if (isInternational) {
    return (
      <Document>
        <Page size="A4" style={P.page}>
          <View style={[P.border1, P.mb2, { padding: 6 }]}>
            <Text
              style={[P.bold, P.textCenter, { fontSize: 8, lineHeight: 1.4 }]}
            >
              SUPPLY MEANT FOR EXPORT UNDER BOND OR LETTER OF UNDERTAKING{"\n"}
              WITHOUT PAYMENT OF IGST
            </Text>
            <Text style={[P.bold, P.textCenter, P.lg, P.mt1]}>
              PARFORMA INVOICE
            </Text>
          </View>

          <View style={[P.border1, P.mb2]}>
            <View style={[P.row, { padding: 6 }]}>
              <View style={[P.w50, P.pr2]}>
                <Text style={[P.bold, P.mb1]}>Exporter</Text>
                <Text style={[P.bold]}>
                  {String(company.name || "").toUpperCase()}
                </Text>
                <Text style={[P.sm, P.mt1]}>
                  {addressLines(company.address)}
                </Text>
                <Text style={P.sm}>
                  <Text style={P.bold}>TEL: </Text>
                  {company.phone || "N.A."}
                </Text>
                <Text style={P.sm}>
                  <Text style={P.bold}>GST NO: </Text>
                  {company.gstin || "N.A."}
                </Text>
              </View>
              <View style={[P.w50, P.textRight]}>
                <Text style={P.sm}>
                  <Text style={P.bold}>Invoice No. & Date: </Text>
                  {bill.billNumber}
                  {"  "}
                  {fmtDate(bill.date)}
                </Text>
                <Text style={[P.sm, P.mt1]}>
                  <Text style={P.bold}>Buyer's Order No. & Date: </Text>Not
                  Applicable
                </Text>
                <View style={P.mt2}>
                  <Text style={P.bold}>Buyers (If other than consignee)</Text>
                  <Text style={[P.bold, P.sm]}>
                    {String(bill.client.name || "").toUpperCase()}
                  </Text>
                  <Text style={[P.sm, P.mt1]}>
                    {addressLines(bill.client.billingAddress)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[P.row, P.borderTop, { padding: 6 }]}>
              <Text style={[P.w50, P.sm]}>
                <Text style={P.bold}>Country Of Origin Of Goods: </Text>
                {bill.internationalDetails?.countryOfOrigin || "INDIA"}
              </Text>
              <Text style={[P.w50, P.sm, P.textRight]}>
                <Text style={P.bold}>Country Of Final Destination: </Text>
                {bill.internationalDetails?.countryOfFinalDestination ||
                  "HONG KONG"}
              </Text>
            </View>
          </View>

          <Text style={[P.bold, P.textCenter, P.mb1, { fontSize: 8.5 }]}>
            Shipping &amp; Export Details
          </Text>
          {bill.internationalDetails && (
            <View style={[P.border1, P.mb2, { padding: 6 }]}>
              <View style={[P.row, { flexWrap: "wrap" }]}>
                {(
                  [
                    [
                      "Pre-Carriage By",
                      bill.internationalDetails.preCarriageBy,
                    ],
                    [
                      "Vessels/Flight No.",
                      bill.internationalDetails.vesselsFlightNo,
                    ],
                    [
                      "Place Of Receipt",
                      bill.internationalDetails.placeOfReceiptByPreCarriage,
                    ],
                    [
                      "Final Destination",
                      bill.internationalDetails.finalDestination,
                    ],
                    [
                      "Port of Loading",
                      bill.internationalDetails.portOfLoading,
                    ],
                    [
                      "Port of Discharge",
                      bill.internationalDetails.portOfDischarge,
                    ],
                    [
                      "Country Of Origin",
                      bill.internationalDetails.countryOfOrigin,
                    ],
                    [
                      "Country Of Destination",
                      bill.internationalDetails.countryOfFinalDestination,
                    ],
                  ] as [string, string | undefined][]
                )
                  .filter(([, v]) => !!v)
                  .map(([label, value], i) => (
                    <View
                      key={i}
                      style={[P.w50, P.mb1, i % 2 === 0 ? P.pr2 : {}]}
                    >
                      <Text style={P.sm}>
                        <Text style={P.bold}>{label}: </Text>
                        {value}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          <View style={[P.border1, P.mb2]}>
            <View
              style={[
                P.tableHeaderRow,
                P.borderBottom,
                { backgroundColor: "#f3f4f6" },
              ]}
            >
              <Text
                style={[
                  P.tableCell,
                  P.bold,
                  P.textCenter,
                  P.borderRight,
                  { width: "18%" },
                ]}
              >
                Sl
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.bold,
                  P.borderRight,
                  { width: showGST ? "30%" : "34%" },
                ]}
              >
                Description of Goods
              </Text>
              {showGST && (
                <Text
                  style={[
                    P.tableCell,
                    P.bold,
                    P.textCenter,
                    P.borderRight,
                    { width: "12%" },
                  ]}
                >
                  HSN/SAC
                </Text>
              )}
              <Text
                style={[
                  P.tableCell,
                  P.bold,
                  P.textCenter,
                  P.borderRight,
                  { width: "10%" },
                ]}
              >
                Qty
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.bold,
                  P.textCenter,
                  P.borderRight,
                  { width: "8%" },
                ]}
              >
                Unit
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.bold,
                  P.textRight,
                  P.borderRight,
                  { width: "10%" },
                ]}
              >
                Rate
              </Text>
              <Text
                style={[P.tableCell, P.bold, P.textRight, { width: "12%" }]}
              >
                Amount
              </Text>
            </View>
            {bill.items.map((item, i) => (
              <View
                key={i}
                style={[
                  P.tableRow,
                  {
                    borderBottomWidth: 0.5,
                    borderBottomStyle: "solid",
                    borderBottomColor: "#e5e7eb",
                  },
                ]}
              >
                <Text
                  style={[
                    P.tableCell,
                    P.textCenter,
                    {
                      borderRightWidth: 0.5,
                      borderRightStyle: "solid",
                      borderRightColor: "#e5e7eb",
                      width: "18%",
                    },
                  ]}
                >
                  {i + 1}
                </Text>
                <View
                  style={[
                    P.tableCell,
                    {
                      borderRightWidth: 0.5,
                      borderRightStyle: "solid",
                      borderRightColor: "#e5e7eb",
                      width: showGST ? "30%" : "34%",
                    },
                  ]}
                >
                  <Text>{item.productName}</Text>
                  {bill.internationalDetails?.grossWeight && (
                    <Text style={[P.gray, { fontSize: 6.5, marginTop: 2 }]}>
                      GW: {bill.internationalDetails.grossWeight} kg | NW:{" "}
                      {bill.internationalDetails.netWeight || "N/A"} kg
                    </Text>
                  )}
                </View>
                {showGST && (
                  <Text
                    style={[
                      P.tableCell,
                      P.textCenter,
                      {
                        borderRightWidth: 0.5,
                        borderRightStyle: "solid",
                        borderRightColor: "#e5e7eb",
                        width: "12%",
                      },
                    ]}
                  >
                    {item.hsnCode || "-"}
                  </Text>
                )}
                <Text
                  style={[
                    P.tableCell,
                    P.textCenter,
                    {
                      borderRightWidth: 0.5,
                      borderRightStyle: "solid",
                      borderRightColor: "#e5e7eb",
                      width: "10%",
                    },
                  ]}
                >
                  {item.quantity}
                </Text>
                <Text
                  style={[
                    P.tableCell,
                    P.textCenter,
                    {
                      borderRightWidth: 0.5,
                      borderRightStyle: "solid",
                      borderRightColor: "#e5e7eb",
                      width: "8%",
                    },
                  ]}
                >
                  {item.unit || "PCS"}
                </Text>
                <Text
                  style={[
                    P.tableCell,
                    P.textRight,
                    {
                      borderRightWidth: 0.5,
                      borderRightStyle: "solid",
                      borderRightColor: "#e5e7eb",
                      width: "10%",
                    },
                  ]}
                >
                  {formatCurrency(item.ratePerUnit)}
                </Text>
                <Text style={[P.tableCell, P.textRight, { width: "12%" }]}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
            <View
              style={[
                P.row,
                P.borderTop,
                { backgroundColor: "#f9fafb", paddingVertical: 4 },
              ]}
            >
              <Text style={[P.tableCell, P.textRight, P.bold, { flex: 1 }]}>
                Subtotal
              </Text>
              <Text
                style={[P.tableCell, P.textRight, P.bold, { width: "12%" }]}
              >
                {formatCurrency(bill.subtotal)}
              </Text>
            </View>
            {bill.discount !== undefined && bill.discount > 0 && (
              <View style={[P.row, P.borderTop]}>
                <Text
                  style={[
                    P.tableCell,
                    P.textRight,
                    { flex: 1, color: "#b91c1c" },
                  ]}
                >
                  Discount
                  {bill.discountType === "percentage"
                    ? ` (${bill.discount}%)`
                    : ""}
                </Text>
                <Text
                  style={[
                    P.tableCell,
                    P.textRight,
                    { width: "12%", color: "#b91c1c" },
                  ]}
                >
                  -{formatCurrency(bill.discount)}
                </Text>
              </View>
            )}
            {bill.otherCharges !== undefined && bill.otherCharges > 0 && (
              <View style={[P.row, P.borderTop]}>
                <Text style={[P.tableCell, P.textRight, { flex: 1 }]}>
                  Other Charges
                </Text>
                <Text style={[P.tableCell, P.textRight, { width: "12%" }]}>
                  {formatCurrency(bill.otherCharges)}
                </Text>
              </View>
            )}
            <View
              style={[
                P.row,
                P.borderTop,
                { backgroundColor: "#d1d5db", paddingVertical: 5 },
              ]}
            >
              <Text
                style={[
                  P.tableCell,
                  P.textRight,
                  P.bold,
                  { flex: 1, fontSize: 9 },
                ]}
              >
                TOTAL
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.textRight,
                  P.bold,
                  { width: "12%", fontSize: 9 },
                ]}
              >
                {formatCurrency(bill.total)}
              </Text>
            </View>
          </View>

          <View style={[P.border1, P.mb2, { padding: 6 }]}>
            <Text style={[P.bold, P.mb1]}>DECLARATION:</Text>
            <Text style={[P.sm, { lineHeight: 1.5 }]}>
              THE DIAMONDS HEREIN INVOICED ARE EXCLUSIVELY OF LAB GROWN DIAMOND
              BASED ON PERSONAL KNOWLEDGE AND/OR WRITTEN GUARANTEES PROVIDED BY
              THE SUPPLIER OF THESE DIAMONDS.
            </Text>
            <Text style={[P.sm, P.mt1]}>
              TOTAL US DOLLARS : {numberToWords(Math.round(bill.total))}
            </Text>
            <Text style={[P.sm, P.mt1]}>
              WE INTEND TO CLAIM BENEFIT UNDER RoDTEP SCHEME AS APPLICABLE
            </Text>
            <Text style={[P.sm, P.mt1, { lineHeight: 1.5 }]}>
              The diamonds herein invoiced have been purchased from legitimate
              sources not involved in funding conflict and in compliance with
              United Nations resolutions. The seller hereby guarantees that the
              supplier of these diamonds is conflict free, based on personal
              knowledge and/or written guarantees provided by the supplier of
              these diamonds.
            </Text>
          </View>

          <View style={[P.row, P.borderTop, { paddingTop: 8 }]}>
            <View style={P.w50}>
              <Text style={[P.bold, P.mb1]}>PAYMENT INSTRUCTIONS:</Text>
              <Text style={P.sm}>
                <Text style={P.bold}>A/c Holder: </Text>
                {bill.bankAccount?.accountHolder ||
                  company.bankDetails?.accountHolder ||
                  "N.A."}
              </Text>
              <Text style={P.sm}>
                <Text style={P.bold}>Bank Name: </Text>
                {bill.bankAccount?.bankName ||
                  company.bankDetails?.bankName ||
                  "N.A."}
              </Text>
              <Text style={P.sm}>
                <Text style={P.bold}>A/c Number: </Text>
                {bill.bankAccount?.accountNumber ||
                  company.bankDetails?.accountNumber ||
                  "N.A."}
              </Text>
              <Text style={P.sm}>
                <Text style={P.bold}>Branch & IFSC: </Text>
                {bill.bankAccount?.branchAndIFSC ||
                  company.bankDetails?.branchAndIFSC ||
                  "N.A."}
              </Text>
              {!!qrDataURL && (
                <View style={[P.row, P.mt2, { alignItems: "center" }]}>
                  <Image src={qrDataURL} style={{ width: 50, height: 50 }} />
                  <Text style={[P.sm, P.gray, { marginLeft: 6 }]}>
                    Scan & Pay (UPI)
                  </Text>
                </View>
              )}
            </View>
            <View style={[P.w50, P.textRight]}>
              <Text style={P.sm}>Signature & Date: {fmtDate(new Date())}</Text>
              <Text style={[P.bold, P.mt1]}>
                FOR {String(company.name || "").toUpperCase()}
              </Text>
              <View style={{ height: 40 }} />
              <Text style={P.sm}>Proprietor</Text>
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  // ── DOMESTIC LAYOUT ───────────────────────────────────────────────────────
  return (
    <Document>
      <Page size="A4" style={P.page}>
        <View style={[P.border2, P.mb3]}>
          <View
            style={[
              P.row,
              { padding: mmToPt(3), justifyContent: "space-between" },
            ]}
          >
            <View style={P.flex1}>
              <View style={[P.row, P.mb1, { alignItems: "center" }]}>
                {company.logo && (
                  <Image
                    src={company.logo}
                    style={{ width: 24, height: 24, marginRight: 6 }}
                  />
                )}
                <Text style={[P.xl, P.bold, { color: themeColor }]}>
                  {company.name}
                </Text>
              </View>
              <Text style={[P.sm, { lineHeight: 1.5 }]}>
                {addressLines(company.address)}
              </Text>
              {showGST && (
                <View style={P.mt1}>
                  <Text style={P.sm}>
                    <Text style={P.bold}>GSTIN/UIN: </Text>
                    {company.gstin}
                  </Text>
                  <Text style={P.sm}>
                    <Text style={P.bold}>State: </Text>
                    {company.state}, <Text style={P.bold}>Code: </Text>
                    {company.stateCode}
                  </Text>
                </View>
              )}
              <View style={P.mt1}>
                <Text style={P.sm}>
                  <Text style={P.bold}>Phone: </Text>
                  {company.phone}
                </Text>
                <Text style={P.sm}>
                  <Text style={P.bold}>Email: </Text>
                  {company.email}
                </Text>
              </View>
            </View>
            <View style={P.textRight}>
              <Text
                style={[{ fontSize: 14, color: themeColor }, P.bold, P.mb2]}
              >
                {title}
              </Text>
              <Text style={P.sm}>
                <Text style={P.bold}>Invoice No.: </Text>
                {bill.billNumber}
              </Text>
              <Text style={P.sm}>
                <Text style={P.bold}>Date: </Text>
                {fmtDate(bill.date)}
              </Text>
              <Text style={P.sm}>
                <Text style={P.bold}>Due Date: </Text>
                {fmtDate(bill.dueDate)}
              </Text>
              {bill.deliveryNote && (
                <Text style={P.sm}>
                  <Text style={P.bold}>Delivery Note: </Text>
                  {bill.deliveryNote}
                </Text>
              )}
              {bill.modeOfPayment && (
                <Text style={P.sm}>
                  <Text style={P.bold}>Payment Mode: </Text>
                  {bill.modeOfPayment}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={[P.row, P.mb3]}>
          <View style={[P.border1, P.p2, P.w50]}>
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
              Consignee (Ship to)
            </Text>
            <Text style={[P.bold, P.md]}>{bill.client.name.toUpperCase()}</Text>
            <Text style={[P.sm, P.mt1, { lineHeight: 1.5 }]}>
              {addressLines(
                bill.client.shippingAddress || bill.client.billingAddress,
              )}
            </Text>
            {showGST && (
              <View style={P.mt1}>
                <Text style={P.sm}>
                  <Text style={P.bold}>GSTIN/UIN: </Text>
                  {bill.client.gstin}
                </Text>
                <Text style={P.sm}>
                  <Text style={P.bold}>State: </Text>
                  {bill.client.state}, <Text style={P.bold}>Code: </Text>
                  {bill.client.stateCode}
                </Text>
              </View>
            )}
            {bill.client.phone && (
              <Text style={[P.sm, P.mt1]}>
                <Text style={P.bold}>Phone: </Text>
                {bill.client.phone}
              </Text>
            )}
          </View>
          <View style={[P.border1, P.p2, P.w50, { borderLeftWidth: 0 }]}>
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
              Buyer (Bill to)
            </Text>
            <Text style={[P.bold, P.md]}>{bill.client.name.toUpperCase()}</Text>
            <Text style={[P.sm, P.mt1, { lineHeight: 1.5 }]}>
              {addressLines(bill.client.billingAddress)}
            </Text>
            {showGST && (
              <View style={P.mt1}>
                <Text style={P.sm}>
                  <Text style={P.bold}>GSTIN/UIN: </Text>
                  {bill.client.gstin}
                </Text>
                <Text style={P.sm}>
                  <Text style={P.bold}>State: </Text>
                  {bill.client.state}, <Text style={P.bold}>Code: </Text>
                  {bill.client.stateCode}
                </Text>
              </View>
            )}
            {bill.placeOfSupply && (
              <Text style={[P.sm, P.mt1]}>
                <Text style={P.bold}>Place of Supply: </Text>
                {bill.placeOfSupply}
              </Text>
            )}
          </View>
        </View>

        <View style={P.mb3}>
          <View style={[P.tableHeaderRow, { backgroundColor: themeColor }]}>
            <Text
              style={[
                P.tableCell,
                P.bold,
                P.textCenter,
                P.border1,
                { width: slW },
              ]}
            >
              Sl
            </Text>
            <Text
              style={[
                P.tableCell,
                P.bold,
                P.border1,
                { flex: 1, borderLeftWidth: 0 },
              ]}
            >
              Description
            </Text>
            {showGST && (
              <Text
                style={[
                  P.tableCell,
                  P.bold,
                  P.textCenter,
                  P.border1,
                  { width: hsnW, borderLeftWidth: 0 },
                ]}
              >
                HSN/SAC
              </Text>
            )}
            {showGST && (
              <Text
                style={[
                  P.tableCell,
                  P.bold,
                  P.textCenter,
                  P.border1,
                  { width: gstRateW, borderLeftWidth: 0 },
                ]}
              >
                GST%
              </Text>
            )}
            <Text
              style={[
                P.tableCell,
                P.bold,
                P.textCenter,
                P.border1,
                { width: qtyW, borderLeftWidth: 0 },
              ]}
            >
              Qty
            </Text>
            <Text
              style={[
                P.tableCell,
                P.bold,
                P.textCenter,
                P.border1,
                { width: unitW, borderLeftWidth: 0 },
              ]}
            >
              Unit
            </Text>
            <Text
              style={[
                P.tableCell,
                P.bold,
                P.textCenter,
                P.border1,
                { width: rateW, borderLeftWidth: 0 },
              ]}
            >
              Rate
            </Text>
            <Text
              style={[
                P.tableCell,
                P.bold,
                P.textRight,
                P.border1,
                { width: amtW, borderLeftWidth: 0 },
              ]}
            >
              Amount
            </Text>
          </View>
          {bill.items.map((item, i) => (
            <View key={i} style={[i % 2 === 0 ? P.tableRowAlt : P.tableRow]}>
              <Text
                style={[
                  P.tableCell,
                  P.textCenter,
                  P.border1,
                  { width: slW, borderTopWidth: 0 },
                ]}
              >
                {i + 1}
              </Text>
              <View
                style={[
                  P.tableCell,
                  P.border1,
                  { flex: 1, borderLeftWidth: 0, borderTopWidth: 0 },
                ]}
              >
                <Text>{item.productName}</Text>
                {getDeviceDetails(item).map((detail, idx) => (
                  <Text key={idx} style={{ fontSize: 6.5, color: "#4b5563" }}>
                    {detail}
                  </Text>
                ))}
              </View>
              {showGST && (
                <Text
                  style={[
                    P.tableCell,
                    P.textCenter,
                    P.border1,
                    { width: hsnW, borderLeftWidth: 0, borderTopWidth: 0 },
                  ]}
                >
                  {item.hsnCode}
                </Text>
              )}
              {showGST && (
                <Text
                  style={[
                    P.tableCell,
                    P.textCenter,
                    P.border1,
                    { width: gstRateW, borderLeftWidth: 0, borderTopWidth: 0 },
                  ]}
                >
                  {item.gstRate}%
                </Text>
              )}
              <Text
                style={[
                  P.tableCell,
                  P.textCenter,
                  P.border1,
                  { width: qtyW, borderLeftWidth: 0, borderTopWidth: 0 },
                ]}
              >
                {item.quantity}
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.textCenter,
                  P.border1,
                  { width: unitW, borderLeftWidth: 0, borderTopWidth: 0 },
                ]}
              >
                {item.unit}
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.textRight,
                  P.border1,
                  { width: rateW, borderLeftWidth: 0, borderTopWidth: 0 },
                ]}
              >
                {formatCurrency(item.ratePerUnit)}
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.textRight,
                  P.border1,
                  { width: amtW, borderLeftWidth: 0, borderTopWidth: 0 },
                ]}
              >
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
          <View style={[P.tableRowAlt, P.bold]}>
            <Text
              style={[
                P.tableCell,
                P.textRight,
                P.border1,
                { flex: 1, borderTopWidth: 0 },
              ]}
            >
              Subtotal
            </Text>
            <Text
              style={[
                P.tableCell,
                P.textRight,
                P.border1,
                { width: amtW, borderLeftWidth: 0, borderTopWidth: 0 },
              ]}
            >
              {formatCurrency(bill.subtotal)}
            </Text>
          </View>
          {bill.discount !== undefined && bill.discount > 0 && (
            <View style={P.tableRow}>
              <Text
                style={[
                  P.tableCell,
                  P.textRight,
                  P.border1,
                  { flex: 1, color: "#b91c1c", borderTopWidth: 0 },
                ]}
              >
                Discount
                {bill.discountType === "percentage"
                  ? ` (${bill.discount}%)`
                  : ""}
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.textRight,
                  P.border1,
                  {
                    width: amtW,
                    color: "#b91c1c",
                    borderLeftWidth: 0,
                    borderTopWidth: 0,
                  },
                ]}
              >
                -{formatCurrency(bill.discount)}
              </Text>
            </View>
          )}
          {bill.otherCharges !== undefined && bill.otherCharges > 0 && (
            <View style={P.tableRow}>
              <Text
                style={[
                  P.tableCell,
                  P.textRight,
                  P.border1,
                  { flex: 1, borderTopWidth: 0 },
                ]}
              >
                Other Charges
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.textRight,
                  P.border1,
                  { width: amtW, borderLeftWidth: 0, borderTopWidth: 0 },
                ]}
              >
                {formatCurrency(bill.otherCharges)}
              </Text>
            </View>
          )}
          {showGST &&
            bill.totalTax > 0 &&
            (isInterState ? (
              <View style={P.tableRow}>
                <Text
                  style={[
                    P.tableCell,
                    P.textRight,
                    P.border1,
                    { flex: 1, borderTopWidth: 0 },
                  ]}
                >
                  IGST
                </Text>
                <Text
                  style={[
                    P.tableCell,
                    P.textRight,
                    P.border1,
                    { width: amtW, borderLeftWidth: 0, borderTopWidth: 0 },
                  ]}
                >
                  {formatCurrency(bill.totalTax)}
                </Text>
              </View>
            ) : (
              <>
                <View style={P.tableRow}>
                  <Text
                    style={[
                      P.tableCell,
                      P.textRight,
                      P.border1,
                      { flex: 1, borderTopWidth: 0 },
                    ]}
                  >
                    CGST
                  </Text>
                  <Text
                    style={[
                      P.tableCell,
                      P.textRight,
                      P.border1,
                      { width: amtW, borderLeftWidth: 0, borderTopWidth: 0 },
                    ]}
                  >
                    {formatCurrency(
                      bill.items.reduce((s, it) => s + (it.cgst || 0), 0),
                    )}
                  </Text>
                </View>
                <View style={P.tableRow}>
                  <Text
                    style={[
                      P.tableCell,
                      P.textRight,
                      P.border1,
                      { flex: 1, borderTopWidth: 0 },
                    ]}
                  >
                    SGST
                  </Text>
                  <Text
                    style={[
                      P.tableCell,
                      P.textRight,
                      P.border1,
                      { width: amtW, borderLeftWidth: 0, borderTopWidth: 0 },
                    ]}
                  >
                    {formatCurrency(
                      bill.items.reduce((s, it) => s + (it.sgst || 0), 0),
                    )}
                  </Text>
                </View>
              </>
            ))}
          <View style={[P.tableRow, P.bold, { backgroundColor: themeColor }]}>
            <Text
              style={[
                P.tableCell,
                P.textRight,
                P.border1,
                { flex: 1, color: "#fff", borderTopWidth: 0 },
              ]}
            >
              Total
            </Text>
            <Text
              style={[
                P.tableCell,
                P.textRight,
                P.border1,
                {
                  width: amtW,
                  color: "#fff",
                  borderLeftWidth: 0,
                  borderTopWidth: 0,
                },
              ]}
            >
              {formatCurrency(bill.total)}
            </Text>
          </View>
        </View>

        {(bill.notes ||
          company.defaultNote ||
          (bill.payments && bill.payments.length > 0)) && (
          <View style={[P.row, P.border1, P.mb3, { minHeight: mmToPt(20) }]}>
            {(bill.notes || company.defaultNote) && (
              <View
                style={[
                  P.flex1,
                  P.p2,
                  bill.payments?.length ? P.borderRight : {},
                ]}
              >
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
                  Notes / Terms
                </Text>
                <Text style={[P.sm, { lineHeight: 1.5 }]}>
                  {bill.notes || company.defaultNote}
                </Text>
              </View>
            )}
            {bill.payments && bill.payments.length > 0 && (
              <View style={[P.flex1, P.p2]}>
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
                        borderBottomStyle: "solid",
                        borderBottomColor: "#e5e7eb",
                        paddingBottom: 2,
                        paddingTop: 1,
                      },
                    ]}
                  >
                    <Text style={[P.sm, { color: "#374151" }]}>
                      {payment.method} ({fmtDate(payment.date)})
                    </Text>
                    <Text style={[P.sm, P.bold]}>
                      {formatCurrency(payment.amount)}
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
                      borderTopStyle: "solid",
                      borderTopColor: "#d1d5db",
                    },
                  ]}
                >
                  <Text style={[P.bold, P.sm]}>Total Paid</Text>
                  <Text style={[P.bold, P.sm, { color: themeColor }]}>
                    {formatCurrency(bill.paidAmount)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {bill.returnComment && (
          <View style={[P.border1, P.p2, P.mb2]}>
            <Text style={[P.bold, P.sm, { color: themeColor }, P.mb1]}>
              Return History
            </Text>
            <Text style={P.sm}>{bill.returnComment}</Text>
          </View>
        )}

        {showGST && (
          <View style={P.mb3}>
            <View style={[P.tableHeaderRow, { backgroundColor: themeColor }]}>
              <Text
                style={[
                  P.tableCell,
                  P.bold,
                  P.textCenter,
                  P.border1,
                  { width: "16%" },
                ]}
              >
                HSN/SAC
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.bold,
                  P.textRight,
                  P.border1,
                  { flex: 1, borderLeftWidth: 0 },
                ]}
              >
                Taxable Value
              </Text>
              {isInterState ? (
                <>
                  <Text
                    style={[
                      P.tableCell,
                      P.bold,
                      P.textCenter,
                      P.border1,
                      { width: "12%", borderLeftWidth: 0 },
                    ]}
                  >
                    IGST Rate
                  </Text>
                  <Text
                    style={[
                      P.tableCell,
                      P.bold,
                      P.textRight,
                      P.border1,
                      { width: "15%", borderLeftWidth: 0 },
                    ]}
                  >
                    IGST Amt
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      P.tableCell,
                      P.bold,
                      P.textCenter,
                      P.border1,
                      { width: "10%", borderLeftWidth: 0 },
                    ]}
                  >
                    CGST%
                  </Text>
                  <Text
                    style={[
                      P.tableCell,
                      P.bold,
                      P.textRight,
                      P.border1,
                      { width: "13%", borderLeftWidth: 0 },
                    ]}
                  >
                    CGST Amt
                  </Text>
                  <Text
                    style={[
                      P.tableCell,
                      P.bold,
                      P.textCenter,
                      P.border1,
                      { width: "10%", borderLeftWidth: 0 },
                    ]}
                  >
                    SGST%
                  </Text>
                  <Text
                    style={[
                      P.tableCell,
                      P.bold,
                      P.textRight,
                      P.border1,
                      { width: "13%", borderLeftWidth: 0 },
                    ]}
                  >
                    SGST Amt
                  </Text>
                </>
              )}
              <Text
                style={[
                  P.tableCell,
                  P.bold,
                  P.textRight,
                  P.border1,
                  { width: "15%", borderLeftWidth: 0 },
                ]}
              >
                Total Tax
              </Text>
            </View>
            {bill.items.map((item, i) => (
              <View key={i} style={[i % 2 === 0 ? P.tableRowAlt : P.tableRow]}>
                <Text
                  style={[
                    P.tableCell,
                    P.textCenter,
                    P.border1,
                    { width: "16%", borderTopWidth: 0 },
                  ]}
                >
                  {item.hsnCode}
                </Text>
                <Text
                  style={[
                    P.tableCell,
                    P.textRight,
                    P.border1,
                    { flex: 1, borderLeftWidth: 0, borderTopWidth: 0 },
                  ]}
                >
                  {formatCurrency(item.amount)}
                </Text>
                {isInterState ? (
                  <>
                    <Text
                      style={[
                        P.tableCell,
                        P.textCenter,
                        P.border1,
                        { width: "12%", borderLeftWidth: 0, borderTopWidth: 0 },
                      ]}
                    >
                      {formatToTwoDecimals(item.gstRate)}%
                    </Text>
                    <Text
                      style={[
                        P.tableCell,
                        P.textRight,
                        P.border1,
                        { width: "15%", borderLeftWidth: 0, borderTopWidth: 0 },
                      ]}
                    >
                      {formatCurrency(item.igst || item.cgst + item.sgst)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={[
                        P.tableCell,
                        P.textCenter,
                        P.border1,
                        { width: "10%", borderLeftWidth: 0, borderTopWidth: 0 },
                      ]}
                    >
                      {formatToTwoDecimals(item.gstRate / 2)}%
                    </Text>
                    <Text
                      style={[
                        P.tableCell,
                        P.textRight,
                        P.border1,
                        { width: "13%", borderLeftWidth: 0, borderTopWidth: 0 },
                      ]}
                    >
                      {formatCurrency(item.cgst)}
                    </Text>
                    <Text
                      style={[
                        P.tableCell,
                        P.textCenter,
                        P.border1,
                        { width: "10%", borderLeftWidth: 0, borderTopWidth: 0 },
                      ]}
                    >
                      {formatToTwoDecimals(item.gstRate / 2)}%
                    </Text>
                    <Text
                      style={[
                        P.tableCell,
                        P.textRight,
                        P.border1,
                        { width: "13%", borderLeftWidth: 0, borderTopWidth: 0 },
                      ]}
                    >
                      {formatCurrency(item.sgst)}
                    </Text>
                  </>
                )}
                <Text
                  style={[
                    P.tableCell,
                    P.textRight,
                    P.border1,
                    { width: "15%", borderLeftWidth: 0, borderTopWidth: 0 },
                  ]}
                >
                  {formatCurrency((item.igst || 0) + item.cgst + item.sgst)}
                </Text>
              </View>
            ))}
            <View style={[P.tableRowAlt, P.bold]}>
              <Text
                style={[
                  P.tableCell,
                  P.textCenter,
                  P.border1,
                  { width: "16%", borderTopWidth: 0 },
                ]}
              >
                Total
              </Text>
              <Text
                style={[
                  P.tableCell,
                  P.textRight,
                  P.border1,
                  { flex: 1, borderLeftWidth: 0, borderTopWidth: 0 },
                ]}
              >
                {formatCurrency(bill.subtotal)}
              </Text>
              {isInterState ? (
                <>
                  <Text
                    style={[
                      P.tableCell,
                      P.border1,
                      { width: "12%", borderLeftWidth: 0, borderTopWidth: 0 },
                    ]}
                  />
                  <Text
                    style={[
                      P.tableCell,
                      P.textRight,
                      P.border1,
                      { width: "15%", borderLeftWidth: 0, borderTopWidth: 0 },
                    ]}
                  >
                    {formatCurrency(bill.totalTax)}
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      P.tableCell,
                      P.border1,
                      { width: "10%", borderLeftWidth: 0, borderTopWidth: 0 },
                    ]}
                  />
                  <Text
                    style={[
                      P.tableCell,
                      P.textRight,
                      P.border1,
                      { width: "13%", borderLeftWidth: 0, borderTopWidth: 0 },
                    ]}
                  >
                    {formatCurrency(
                      bill.items.reduce((s, it) => s + it.cgst, 0),
                    )}
                  </Text>
                  <Text
                    style={[
                      P.tableCell,
                      P.border1,
                      { width: "10%", borderLeftWidth: 0, borderTopWidth: 0 },
                    ]}
                  />
                  <Text
                    style={[
                      P.tableCell,
                      P.textRight,
                      P.border1,
                      { width: "13%", borderLeftWidth: 0, borderTopWidth: 0 },
                    ]}
                  >
                    {formatCurrency(
                      bill.items.reduce((s, it) => s + it.sgst, 0),
                    )}
                  </Text>
                </>
              )}
              <Text
                style={[
                  P.tableCell,
                  P.textRight,
                  P.border1,
                  { width: "15%", borderLeftWidth: 0, borderTopWidth: 0 },
                ]}
              >
                {formatCurrency(bill.totalTax)}
              </Text>
            </View>
          </View>
        )}

        <View style={[P.row, P.border1, P.mb1]}>
          <View style={[P.flex1, P.p2, P.borderRight]}>
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
              Payment Information
            </Text>
            <Text style={P.sm}>
              <Text style={P.bold}>Status: </Text>
              {bill.paymentStatus.toUpperCase()}
            </Text>
            <Text style={P.sm}>
              <Text style={P.bold}>Paid: </Text>
              {formatCurrency(bill.paidAmount)}
            </Text>
          </View>
          <View style={[P.flex1, P.p2]}>
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
              Company Bank Details
            </Text>
            <Text style={P.sm}>
              <Text style={P.bold}>A/c Holder: </Text>
              {bill.bankAccount?.accountHolder ||
                company.bankDetails?.accountHolder ||
                "N.A."}
            </Text>
            <Text style={P.sm}>
              <Text style={P.bold}>Bank Name: </Text>
              {bill.bankAccount?.bankName ||
                company.bankDetails?.bankName ||
                "N.A."}
            </Text>
            <Text style={P.sm}>
              <Text style={P.bold}>A/c Number: </Text>
              {bill.bankAccount?.accountNumber ||
                company.bankDetails?.accountNumber ||
                "N.A."}
            </Text>
            <Text style={P.sm}>
              <Text style={P.bold}>Branch & IFSC: </Text>
              {bill.bankAccount?.branchAndIFSC ||
                company.bankDetails?.branchAndIFSC ||
                "N.A."}
            </Text>
            {qrDataURL && (
              <View style={[P.row, P.mt2, { alignItems: "center" }]}>
                <Image src={qrDataURL} style={{ width: 45, height: 45 }} />
                <Text style={[P.sm, P.gray, { marginLeft: 6 }]}>
                  Scan & Pay{"\n"}(UPI)
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[P.border1, P.p2, { borderTopWidth: 0 }]}>
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
            Declaration
          </Text>
          <Text style={[P.sm, { lineHeight: 1.5 }]}>
            {isSample
              ? "This is a SAMPLE BILL for demonstration purposes only. Not valid for actual transactions."
              : "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
          </Text>
        </View>

        <View style={[P.row, P.border1, { borderTopWidth: 0 }]}>
          <View style={[P.flex1, P.p3, P.borderRight]}>
            <Text style={[P.bold, P.sm, P.mb1]}>
              Customer's Seal and Signature
            </Text>
            <View style={P.sigBox} />
            <Text style={[P.sm, P.textCenter, P.mt1, P.gray]}>
              {bill.client.name}
            </Text>
          </View>
          <View style={[P.flex1, P.p3]}>
            {bill.createdBy && (
              <View style={P.mb2}>
                <Text style={[P.sm, P.gray]}>
                  Created by:{" "}
                  <Text style={[P.bold, { color: "#374151" }]}>
                    {bill.createdBy}
                  </Text>
                </Text>
              </View>
            )}
            <View style={P.textRight}>
              <Text style={[P.bold, P.sm, P.mb1]}>for {company.name}</Text>
              <View style={P.sigBoxSolid} />
              <View style={[P.borderTop, P.pt1, { alignSelf: "flex-end" }]}>
                <Text style={P.sm}>Authorised Signatory</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={[P.sm, P.textCenter, P.mt1, P.gray]}>
          This is a Computer Generated Invoice
        </Text>
      </Page>
    </Document>
  );
};

// ─── BillView (HTML preview) ──────────────────────────────────────────────────
export function BillView({ bill }: BillViewProps) {
  const billRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [company, setCompany] = useState<any>(null);
  const [scale, setScale] = useState(1);
  const [qrDataURL, setQrDataURL] = useState<string>("");

  // A4 size in px at 96dpi: 210mm x 297mm = 794 x 1122
  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1122;

  useEffect(() => {
    getCompanyProfile().then(setCompany);
  }, []);

  useEffect(() => {
    const upiId = (bill.bankAccount?.upiId || company?.upiId || "").trim();
    const amount = Number(bill.total || 0).toFixed(2);
    const upiPayUri =
      `upi://pay?pa=${encodeURIComponent(upiId)}` +
      `&pn=${encodeURIComponent(company?.name || "")}` +
      `&am=${encodeURIComponent(amount)}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent(`${bill.billType === "international" ? "Proforma" : ""} Invoice ${bill.billNumber}`)}`;

    QRCode.toDataURL(upiPayUri, { width: 220, margin: 1 })
      .then(setQrDataURL)
      .catch(() => setQrDataURL(""));
  }, [
    company?.upiId,
    company?.name,
    bill.total,
    bill.billNumber,
    bill.bankAccount?.upiId,
  ]);

  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return;
      const horizontalPadding = 24;
      const verticalPadding = 24;
      const availableWidth = Math.max(
        0,
        containerRef.current.clientWidth - horizontalPadding,
      );
      const availableHeight = Math.max(
        0,
        containerRef.current.clientHeight - verticalPadding,
      );

      const widthScale = availableWidth / A4_WIDTH_PX;
      const heightScale = availableHeight / A4_HEIGHT_PX;
      const nextScale = Math.min(widthScale, heightScale, 1);
      setScale(Math.max(0.25, nextScale));
    };

    calculateScale();
    const ro = new ResizeObserver(calculateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", calculateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calculateScale);
    };
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #bill-print, #bill-print * { visibility: visible; }
        #bill-print {
          position: absolute; left: 0; top: 0;
          width: 210mm !important; min-height: 297mm !important;
          max-width: 210mm !important; margin: 0 !important;
          padding: 5mm !important; box-shadow: none !important;
          font-size: 10px !important; transform: none !important;
        }
        @page { size: A4; margin: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    toast.info("Generating PDF...");
    try {
      const qrToUse =
        qrDataURL ||
        (await QRCode.toDataURL(window.location.origin + `/bills/${bill.id}`));
      const isSampleBill = "isSample" in bill && bill.isSample;
      const blob = await pdf(
        <BillPDF
          bill={bill}
          company={company}
          qrDataURL={qrToUse}
          isSample={isSampleBill}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bill_${bill.billNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  const handleShareWhatsApp = () => {
    const phone = bill.client.phone?.replace(/\D/g, "");
    if (!phone) {
      toast.error("Client phone number not available");
      return;
    }
    const text = encodeURIComponent(
      `Hello ${bill.client.name}, please find your bill ${bill.billNumber} here: ${window.location.origin}/view/bill/${bill.id}`,
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const isInternational = bill.billType === "international";

  const formatAddress = (address: string) => {
    if (!address) return null;
    return address.split(",").map((line, i, arr) => (
      <span key={i}>
        {line.trim()}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  };

  if (!company)
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Please setup company profile first
      </div>
    );

  const gstEnabled = (company.gstEnabled ?? true) as boolean;
  const showGST = gstEnabled && bill.totalTax > 0;
  const isInterState: boolean =
    bill.gstType === "igst" ||
    (!bill.gstType && (company?.stateCode ?? "") !== bill.client.stateCode);
  const isSampleBill = "isSample" in bill && bill.isSample;

  const scaledWidth = A4_WIDTH_PX * scale;
  const scaledHeight = A4_HEIGHT_PX * scale;

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* ── Action buttons ── */}
      <div className="sticky top-0 z-10dark:border-slate-700 print:hidden">
        <div className="flex flex-wrap items-center justify-center gap-2 p-3 max-w-4xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm touch-manipulation gap-1.5 min-w-[120px]"
            onClick={handleShareWhatsApp}
          >
            <MessageCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
            <span className="truncate">WhatsApp</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm touch-manipulation gap-1.5 min-w-[120px]"
            onClick={handleDownloadPDF}
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Download PDF</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm touch-manipulation gap-1.5 min-w-[100px]"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Print</span>
          </Button>
        </div>
      </div>

      {/* ── Bill container — centers the scaled bill ── */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-hidden"
        style={{
          // Smooth momentum scrolling for any nested scrollable content.
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex h-full w-full items-start justify-center p-3 sm:p-4">
          <div
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
            }}
          >
            <div
              ref={billRef}
              id="bill-print"
              className="bg-white shadow-2xl text-black"
              style={{
                width: `${A4_WIDTH_PX}px`,
                minWidth: `${A4_WIDTH_PX}px`,
                maxWidth: `${A4_WIDTH_PX}px`,
                minHeight: `${A4_HEIGHT_PX}px`, // A4 at 96dpi
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                fontFamily: "Inter, Arial, sans-serif",
                padding: "19px", // ~5mm at 96dpi
                boxSizing: "border-box",
                fontSize: "10px",
                lineHeight: "1.4",
                color: "black",
              }}
            >
              {isInternational ? (
                <div>
                  <div className="border border-black mb-3 p-2">
                    <p className="text-[10px] font-bold text-center leading-snug">
                      SUPPLY MEANT FOR EXPORT UNDER BOND OR LETTER OF
                      UNDERTAKING
                      <br />
                      WITHOUT PAYMENT OF IGST
                    </p>
                    <p className="text-[11px] font-bold text-center mt-1">
                      PARFORMA INVOICE
                    </p>
                  </div>

                  <div className="border border-black mb-3">
                    <div className="flex gap-3 p-2">
                      <div className="w-1/2">
                        <p className="font-bold text-[10px] mb-1">Exporter</p>
                        <p className="text-[10px] font-semibold">
                          {String(company.name || "").toUpperCase()}
                        </p>
                        <div className="text-[10px] leading-relaxed">
                          {formatAddress(company.address)}
                        </div>
                        <p className="text-[10px] mt-1">
                          <strong>TEL:</strong> {company.phone || "N.A."}
                        </p>
                        <p className="text-[10px]">
                          <strong>GST NO:</strong> {company.gstin || "N.A."}
                        </p>
                      </div>
                      <div className="w-1/2 text-right">
                        <p className="text-[10px]">
                          <strong>Invoice No. & Date:</strong> {bill.billNumber}{" "}
                          {formatDate(bill.date)}
                        </p>
                        <p className="text-[10px] mt-0.5">
                          <strong>Buyer's Order No. & Date:</strong> Not
                          Applicable
                        </p>
                        <div className="mt-2">
                          <p className="font-bold text-[10px]">
                            Buyers (If other than consignee)
                          </p>
                          <p className="text-[10px] font-semibold">
                            {String(bill.client.name || "").toUpperCase()}
                          </p>
                          <div className="text-[10px] leading-relaxed">
                            {formatAddress(bill.client.billingAddress)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-black p-2 text-[10px]">
                      <p>
                        <strong>Country Of Origin Of Goods:</strong>{" "}
                        {bill.internationalDetails?.countryOfOrigin || "INDIA"}
                      </p>
                      <p className="text-right">
                        <strong>Country Of Final Destination:</strong>{" "}
                        {bill.internationalDetails?.countryOfFinalDestination ||
                          "HONG KONG"}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-center mb-2">
                    Shipping &amp; Export Details
                  </p>
                  {bill.internationalDetails && (
                    <div className="border border-black/60 mb-3 p-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                        {bill.internationalDetails.preCarriageBy && (
                          <p>
                            <strong>Pre-Carriage By:</strong>{" "}
                            {bill.internationalDetails.preCarriageBy}
                          </p>
                        )}
                        {bill.internationalDetails.vesselsFlightNo && (
                          <p>
                            <strong>Vessels/Flight No.:</strong>{" "}
                            {bill.internationalDetails.vesselsFlightNo}
                          </p>
                        )}
                        {bill.internationalDetails
                          .placeOfReceiptByPreCarriage && (
                          <p>
                            <strong>Place Of Receipt:</strong>{" "}
                            {
                              bill.internationalDetails
                                .placeOfReceiptByPreCarriage
                            }
                          </p>
                        )}
                        {bill.internationalDetails.finalDestination && (
                          <p>
                            <strong>Final Destination:</strong>{" "}
                            {bill.internationalDetails.finalDestination}
                          </p>
                        )}
                        {bill.internationalDetails.portOfLoading && (
                          <p>
                            <strong>Port of Loading:</strong>{" "}
                            {bill.internationalDetails.portOfLoading}
                          </p>
                        )}
                        {bill.internationalDetails.portOfDischarge && (
                          <p>
                            <strong>Port of Discharge:</strong>{" "}
                            {bill.internationalDetails.portOfDischarge}
                          </p>
                        )}
                        {bill.internationalDetails.countryOfOrigin && (
                          <p>
                            <strong>Country Of Origin:</strong>{" "}
                            {bill.internationalDetails.countryOfOrigin}
                          </p>
                        )}
                        {bill.internationalDetails
                          .countryOfFinalDestination && (
                          <p>
                            <strong>Country Of Destination:</strong>{" "}
                            {
                              bill.internationalDetails
                                .countryOfFinalDestination
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border border-black mb-3">
                    <table className="w-full border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black">
                          <th
                            className="p-1.5 text-center border-r border-black"
                            style={{ width: "18%" }}
                          >
                            Sl
                          </th>
                          <th
                            className="p-1.5 text-left border-r border-black"
                            style={{ width: showGST ? "30%" : "34%" }}
                          >
                            Description of Goods
                          </th>
                          {showGST && (
                            <th
                              className="p-1.5 text-center border-r border-black"
                              style={{ width: "12%" }}
                            >
                              HSN/SAC
                            </th>
                          )}
                          <th
                            className="p-1.5 text-center border-r border-black"
                            style={{ width: "10%" }}
                          >
                            Qty
                          </th>
                          <th
                            className="p-1.5 text-center border-r border-black"
                            style={{ width: "8%" }}
                          >
                            Unit
                          </th>
                          <th
                            className="p-1.5 text-right border-r border-black"
                            style={{ width: "10%" }}
                          >
                            Rate
                          </th>
                          <th
                            className="p-1.5 text-right"
                            style={{ width: "12%" }}
                          >
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bill.items.map((item, index) => (
                          <tr key={index} className="border-b border-black/10">
                            <td className="p-1.5 text-center border-r border-black/10">
                              {index + 1}
                            </td>
                            <td className="p-1.5 border-r border-black/10">
                              <div>{item.productName}</div>
                              {getDeviceDetails(item).map((detail, idx) => (
                                <div
                                  key={idx}
                                  className="text-[9px] text-gray-600 mt-0.5"
                                >
                                  {detail}
                                </div>
                              ))}
                              {bill.internationalDetails?.grossWeight && (
                                <div className="text-[9px] text-gray-600 mt-0.5">
                                  GW: {bill.internationalDetails.grossWeight} kg
                                  | NW:{" "}
                                  {bill.internationalDetails.netWeight || "N/A"}{" "}
                                  kg
                                </div>
                              )}
                            </td>
                            {showGST && (
                              <td className="p-1.5 text-center border-r border-black/10">
                                {item.hsnCode || "-"}
                              </td>
                            )}
                            <td className="p-1.5 text-center border-r border-black/10">
                              {item.quantity}
                            </td>
                            <td className="p-1.5 text-center border-r border-black/10">
                              {item.unit || "PCS"}
                            </td>
                            <td className="p-1.5 text-right border-r border-black/10">
                              {formatCurrency(item.ratePerUnit)}
                            </td>
                            <td className="p-1.5 text-right">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-black bg-gray-50">
                          <td
                            colSpan={showGST ? 6 : 5}
                            className="p-1.5 text-right font-bold"
                          >
                            Subtotal
                          </td>
                          <td className="p-1.5 text-right font-bold">
                            {formatCurrency(bill.subtotal)}
                          </td>
                        </tr>
                        {bill.discount !== undefined && bill.discount > 0 && (
                          <tr className="border-t border-black text-red-600">
                            <td
                              colSpan={showGST ? 6 : 5}
                              className="p-1.5 text-right font-bold"
                            >
                              Discount
                              {bill.discountType === "percentage"
                                ? ` (${bill.discount}%)`
                                : ""}
                            </td>
                            <td className="p-1.5 text-right font-bold">
                              -{formatCurrency(bill.discount)}
                            </td>
                          </tr>
                        )}
                        {bill.otherCharges !== undefined &&
                          bill.otherCharges > 0 && (
                            <tr className="border-t border-black">
                              <td
                                colSpan={showGST ? 6 : 5}
                                className="p-1.5 text-right font-bold"
                              >
                                Other Charges
                              </td>
                              <td className="p-1.5 text-right font-bold">
                                {formatCurrency(bill.otherCharges)}
                              </td>
                            </tr>
                          )}
                        <tr className="border-t border-black bg-gray-200">
                          <td
                            colSpan={showGST ? 6 : 5}
                            className="p-2 text-right font-bold"
                          >
                            TOTAL
                          </td>
                          <td className="p-2 text-right font-bold">
                            {formatCurrency(bill.total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-black mb-3 p-2">
                    <p className="font-bold text-[10px] mb-1">DECLARATION:</p>
                    <p className="text-[10px] leading-relaxed">
                      THE DIAMONDS HEREIN INVOICED ARE EXCLUSIVELY OF LAB GROWN
                      DIAMOND BASED ON PERSONAL KNOWLEDGE AND/OR WRITTEN
                      GUARANTEES PROVIDED BY THE SUPPLIER OF THESE DIAMONDS.
                    </p>
                    <p className="text-[10px] leading-relaxed mt-1">
                      TOTAL US DOLLARS : {numberToWords(Math.round(bill.total))}
                    </p>
                    <p className="text-[10px] leading-relaxed mt-1">
                      WE INTEND TO CLAIM BENEFIT UNDER RoDTEP SCHEME AS
                      APPLICABLE
                    </p>
                    <p className="text-[10px] leading-relaxed mt-1">
                      The diamonds herein invoiced have been purchased from
                      legitimate sources not involved in funding conflict and in
                      compliance with United Nations resolutions. The seller
                      hereby guarantees that the supplier of these diamonds is
                      conflict free, based on personal knowledge and/or written
                      guarantees provided by the supplier of these diamonds.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-0 pt-1">
                    <div className="pr-2">
                      <p className="font-bold text-[10px] mb-1">
                        PAYMENT INSTRUCTIONS:
                      </p>
                      <div className="text-[10px] space-y-0.5 mt-1">
                        <p>
                          <strong>A/c Holder:</strong>{" "}
                          {bill.bankAccount?.accountHolder ||
                            company.bankDetails?.accountHolder ||
                            "N.A."}
                        </p>
                        <p>
                          <strong>Bank Name:</strong>{" "}
                          {bill.bankAccount?.bankName ||
                            company.bankDetails?.bankName ||
                            "N.A."}
                        </p>
                        <p>
                          <strong>A/c Number:</strong>{" "}
                          {bill.bankAccount?.accountNumber ||
                            company.bankDetails?.accountNumber ||
                            "N.A."}
                        </p>
                        <p>
                          <strong>Branch & IFSC:</strong>{" "}
                          {bill.bankAccount?.branchAndIFSC ||
                            company.bankDetails?.branchAndIFSC ||
                            "N.A."}
                        </p>
                      </div>
                      {qrDataURL && (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={qrDataURL}
                            alt="Scan & Pay QR"
                            className="w-[55px] h-[55px]"
                          />
                          <p className="text-[10px] text-gray-700">
                            Scan & Pay (UPI)
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right pl-2">
                      <p className="text-[10px]">
                        Signature & Date: {formatDate(new Date().toISOString())}
                      </p>
                      <p className="text-[10px] font-bold mt-1">
                        FOR {String(company.name || "").toUpperCase()}
                      </p>
                      <div className="h-12" />
                      <p className="text-[10px]">Proprietor</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* ── Domestic Header ── */}
                  <div className="border-2 border-black mb-3">
                    <div className="flex justify-between items-start gap-3 p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {company.logo && (
                            <img
                              src={company.logo}
                              alt={company.name}
                              className="h-7 w-7 object-contain"
                            />
                          )}
                          <h1
                            className="text-base font-bold"
                            style={{ color: company.themeColor }}
                          >
                            {company.name}
                          </h1>
                        </div>
                        <div className="text-[10px] leading-relaxed mt-1 text-black">
                          {formatAddress(company.address)}
                        </div>
                        {showGST && (
                          <div className="text-[10px] mt-1 text-black">
                            <p>
                              <strong>GSTIN/UIN:</strong> {company.gstin}
                            </p>
                            <p>
                              <strong>State:</strong> {company.state},{" "}
                              <strong>Code:</strong> {company.stateCode}
                            </p>
                          </div>
                        )}
                        <div className="text-[10px] mt-1 text-black">
                          <p>
                            <strong>Phone:</strong> {company.phone}
                          </p>
                          <p>
                            <strong>Email:</strong> {company.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <h2
                          className="text-lg font-bold mb-2"
                          style={{ color: company.themeColor }}
                        >
                          {gstEnabled ? "TAX INVOICE" : "INVOICE"}
                        </h2>
                        <div className="text-[10px] space-y-0.5 text-black">
                          <p>
                            <strong>Invoice No.:</strong> {bill.billNumber}
                          </p>
                          <p>
                            <strong>Date:</strong> {formatDate(bill.date)}
                          </p>
                          <p>
                            <strong>Due Date:</strong>{" "}
                            {formatDate(bill.dueDate)}
                          </p>
                          {bill.deliveryNote && (
                            <p>
                              <strong>Delivery Note:</strong>{" "}
                              {bill.deliveryNote}
                            </p>
                          )}
                          {bill.modeOfPayment && (
                            <p>
                              <strong>Payment Mode:</strong>{" "}
                              {bill.modeOfPayment}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client Details */}
                  <div className="grid grid-cols-2 gap-0 mb-3">
                    <div className="border border-black p-2">
                      <h3
                        className="font-bold text-[10px] mb-1 border-b border-black pb-1"
                        style={{ color: company.themeColor }}
                      >
                        Consignee (Ship to)
                      </h3>
                      <p className="font-semibold text-[11px]">
                        {bill.client.name}
                      </p>
                      <div className="text-[10px] leading-relaxed mt-1">
                        {formatAddress(
                          bill.client.shippingAddress ||
                            bill.client.billingAddress,
                        )}
                      </div>
                      {showGST && (
                        <div className="text-[10px] mt-1">
                          <p>
                            <strong>GSTIN/UIN:</strong> {bill.client.gstin}
                          </p>
                          <p>
                            <strong>State:</strong> {bill.client.state},{" "}
                            <strong>Code:</strong> {bill.client.stateCode}
                          </p>
                        </div>
                      )}
                      {bill.client.phone && (
                        <p className="text-[10px]">
                          <strong>Phone:</strong> {bill.client.phone}
                        </p>
                      )}
                    </div>
                    <div className="border border-black border-l-0 p-2">
                      <h3
                        className="font-bold text-[10px] mb-1 border-b border-black pb-1"
                        style={{ color: company.themeColor }}
                      >
                        Buyer (Bill to)
                      </h3>
                      <p className="font-semibold text-[11px]">
                        {bill.client.name}
                      </p>
                      <div className="text-[10px] leading-relaxed mt-1">
                        {formatAddress(bill.client.billingAddress)}
                      </div>
                      {showGST && (
                        <div className="text-[10px] mt-1">
                          <p>
                            <strong>GSTIN/UIN:</strong> {bill.client.gstin}
                          </p>
                          <p>
                            <strong>State:</strong> {bill.client.state},{" "}
                            <strong>Code:</strong> {bill.client.stateCode}
                          </p>
                        </div>
                      )}
                      {bill.placeOfSupply && (
                        <p className="text-[10px] mt-1">
                          <strong>Place of Supply:</strong> {bill.placeOfSupply}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mb-3">
                    <table className="w-full border-collapse text-[10px]">
                      <thead>
                        <tr
                          style={{
                            backgroundColor: company.themeColor,
                            color: "white",
                          }}
                        >
                          <th
                            className="border border-black p-1.5 text-center"
                            style={{ width: "30px" }}
                          >
                            Sl
                          </th>
                          <th className="border border-black p-1.5 text-left">
                            Description of Goods
                          </th>
                          {showGST && (
                            <th
                              className="border border-black p-1.5 text-center"
                              style={{ width: "60px" }}
                            >
                              HSN/SAC
                            </th>
                          )}
                          {showGST && (
                            <th
                              className="border border-black p-1.5 text-center"
                              style={{ width: "40px" }}
                            >
                              GST%
                            </th>
                          )}
                          <th
                            className="border border-black p-1.5 text-center"
                            style={{ width: "50px" }}
                          >
                            Qty
                          </th>
                          <th
                            className="border border-black p-1.5 text-center"
                            style={{ width: "45px" }}
                          >
                            Unit
                          </th>
                          <th
                            className="border border-black p-1.5 text-center"
                            style={{ width: "90px" }}
                          >
                            Rate
                          </th>
                          <th
                            className="border border-black p-1.5 text-right"
                            style={{ width: "100px" }}
                          >
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bill.items.map((item, index) => (
                          <tr
                            key={index}
                            className={index % 2 === 0 ? "bg-gray-50" : ""}
                          >
                            <td className="border border-black p-1.5 text-center">
                              {index + 1}
                            </td>
                            <td className="border border-black p-1.5">
                              <div>{item.productName}</div>
                              {getDeviceDetails(item).map((detail, idx) => (
                                <div
                                  key={idx}
                                  className="text-[9px] text-gray-600 mt-0.5"
                                >
                                  {detail}
                                </div>
                              ))}
                            </td>
                            {showGST && (
                              <td className="border border-black p-1.5 text-center text-[9px]">
                                {item.hsnCode}
                              </td>
                            )}
                            {showGST && (
                              <td className="border border-black p-1.5 text-center">
                                {item.gstRate}%
                              </td>
                            )}
                            <td className="border border-black p-1.5 text-center">
                              {item.quantity}
                            </td>
                            <td className="border border-black p-1.5 text-center">
                              {item.unit}
                            </td>
                            <td className="border border-black p-1.5 text-right">
                              {formatCurrency(item.ratePerUnit)}
                            </td>
                            <td className="border border-black p-1.5 text-right">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-gray-100">
                          <td
                            colSpan={showGST ? 7 : 5}
                            className="border border-black p-1.5 text-right"
                          >
                            Subtotal
                          </td>
                          <td className="border border-black p-1.5 text-right">
                            {formatCurrency(bill.subtotal)}
                          </td>
                        </tr>
                        {bill.discount !== undefined && bill.discount > 0 && (
                          <tr>
                            <td
                              colSpan={showGST ? 7 : 5}
                              className="border border-black p-1.5 text-right text-red-600"
                            >
                              Discount
                              {bill.discountType === "percentage"
                                ? ` (${bill.discount}%)`
                                : ""}
                            </td>
                            <td className="border border-black p-1.5 text-right text-red-600">
                              -{formatCurrency(bill.discount)}
                            </td>
                          </tr>
                        )}
                        {bill.otherCharges !== undefined &&
                          bill.otherCharges > 0 && (
                            <tr>
                              <td
                                colSpan={showGST ? 7 : 5}
                                className="border border-black p-1.5 text-right"
                              >
                                Other Charges
                              </td>
                              <td className="border border-black p-1.5 text-right">
                                {formatCurrency(bill.otherCharges)}
                              </td>
                            </tr>
                          )}
                        {showGST &&
                          bill.totalTax > 0 &&
                          (isInterState ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="border border-black p-1.5 text-right"
                              >
                                IGST
                              </td>
                              <td className="border border-black p-1.5 text-right">
                                {formatCurrency(bill.totalTax)}
                              </td>
                            </tr>
                          ) : (
                            <>
                              <tr>
                                <td
                                  colSpan={7}
                                  className="border border-black p-1.5 text-right"
                                >
                                  CGST
                                </td>
                                <td className="border border-black p-1.5 text-right">
                                  {formatCurrency(
                                    bill.items.reduce(
                                      (s, it) => s + (it.cgst || 0),
                                      0,
                                    ),
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  colSpan={7}
                                  className="border border-black p-1.5 text-right"
                                >
                                  SGST
                                </td>
                                <td className="border border-black p-1.5 text-right">
                                  {formatCurrency(
                                    bill.items.reduce(
                                      (s, it) => s + (it.sgst || 0),
                                      0,
                                    ),
                                  )}
                                </td>
                              </tr>
                            </>
                          ))}
                        <tr
                          className="font-bold"
                          style={{
                            backgroundColor: company.themeColor,
                            color: "white",
                          }}
                        >
                          <td
                            colSpan={showGST ? 7 : 5}
                            className="border border-black p-1.5 text-right"
                          >
                            Total
                          </td>
                          <td className="border border-black p-1.5 text-right">
                            {formatCurrency(bill.total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Notes + Payment History */}
                  {(bill.notes ||
                    company.defaultNote ||
                    (bill.payments && bill.payments.length > 0)) && (
                    <div className="border border-black p-2.5 mb-3">
                      <div className="grid grid-cols-2 gap-4">
                        {(bill.notes || company.defaultNote) && (
                          <div>
                            <h3
                              className="font-bold text-[10px] mb-1"
                              style={{ color: company.themeColor }}
                            >
                              Notes / Terms
                            </h3>
                            <p className="text-[10px] whitespace-pre-wrap">
                              {bill.notes || company.defaultNote}
                            </p>
                          </div>
                        )}
                        {bill.payments && bill.payments.length > 0 && (
                          <div className="print:hidden">
                            <h3
                              className="font-bold text-[10px] mb-1"
                              style={{ color: company.themeColor }}
                            >
                              Payment History
                            </h3>
                            <div className="space-y-1">
                              {bill.payments.map((payment, index) => (
                                <div
                                  key={payment.id || index}
                                  className="flex justify-between text-[9px] border-b border-gray-100 pb-0.5 last:border-0"
                                >
                                  <span>
                                    {payment.method} ({formatDate(payment.date)}
                                    )
                                  </span>
                                  <span className="font-semibold">
                                    {formatCurrency(payment.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* GST Summary Table */}
                  {showGST && (
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full border-collapse text-[10px]">
                        <thead>
                          <tr
                            style={{
                              backgroundColor: company.themeColor,
                              color: "white",
                            }}
                          >
                            <th className="border border-black p-1.5 text-center">
                              HSN/SAC
                            </th>
                            <th className="border border-black p-1.5 text-right">
                              Taxable Value
                            </th>
                            {isInterState ? (
                              <>
                                <th className="border border-black p-1.5 text-center">
                                  IGST Rate
                                </th>
                                <th className="border border-black p-1.5 text-right">
                                  IGST Amt
                                </th>
                              </>
                            ) : (
                              <>
                                <th className="border border-black p-1.5 text-center">
                                  CGST Rate
                                </th>
                                <th className="border border-black p-1.5 text-right">
                                  CGST Amt
                                </th>
                                <th className="border border-black p-1.5 text-center">
                                  SGST Rate
                                </th>
                                <th className="border border-black p-1.5 text-right">
                                  SGST Amt
                                </th>
                              </>
                            )}
                            <th className="border border-black p-1.5 text-right">
                              Total Tax
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {bill.items.map((item, index) => (
                            <tr
                              key={index}
                              className={index % 2 === 0 ? "bg-gray-50" : ""}
                            >
                              <td className="border border-black p-1.5 text-center text-[9px]">
                                {item.hsnCode}
                              </td>
                              <td className="border border-black p-1.5 text-right whitespace-nowrap">
                                {formatCurrency(item.amount)}
                              </td>
                              {isInterState ? (
                                <>
                                  <td className="border border-black p-1.5 text-center">
                                    {formatToTwoDecimals(item.gstRate)}%
                                  </td>
                                  <td className="border border-black p-1.5 text-right whitespace-nowrap">
                                    {formatCurrency(
                                      item.igst || item.cgst + item.sgst,
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="border border-black p-1.5 text-center">
                                    {formatToTwoDecimals(item.gstRate / 2)}%
                                  </td>
                                  <td className="border border-black p-1.5 text-right whitespace-nowrap">
                                    {formatCurrency(item.cgst)}
                                  </td>
                                  <td className="border border-black p-1.5 text-center">
                                    {formatToTwoDecimals(item.gstRate / 2)}%
                                  </td>
                                  <td className="border border-black p-1.5 text-right whitespace-nowrap">
                                    {formatCurrency(item.sgst)}
                                  </td>
                                </>
                              )}
                              <td className="border border-black p-1.5 text-right whitespace-nowrap">
                                {formatCurrency(
                                  (item.igst || 0) + item.cgst + item.sgst,
                                )}
                              </td>
                            </tr>
                          ))}
                          <tr className="font-bold bg-gray-100">
                            <td className="border border-black p-1.5 text-center">
                              Total
                            </td>
                            <td className="border border-black p-1.5 text-right whitespace-nowrap">
                              {formatCurrency(bill.subtotal)}
                            </td>
                            {isInterState ? (
                              <>
                                <td className="border border-black p-1.5" />
                                <td className="border border-black p-1.5 text-right whitespace-nowrap">
                                  {formatCurrency(bill.totalTax)}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="border border-black p-1.5" />
                                <td className="border border-black p-1.5 text-right whitespace-nowrap">
                                  {formatCurrency(
                                    bill.items.reduce(
                                      (s, it) => s + it.cgst,
                                      0,
                                    ),
                                  )}
                                </td>
                                <td className="border border-black p-1.5" />
                                <td className="border border-black p-1.5 text-right whitespace-nowrap">
                                  {formatCurrency(
                                    bill.items.reduce(
                                      (s, it) => s + it.sgst,
                                      0,
                                    ),
                                  )}
                                </td>
                              </>
                            )}
                            <td className="border border-black p-1.5 text-right whitespace-nowrap">
                              {formatCurrency(bill.totalTax)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Return History */}
                  {bill.returnComment && (
                    <div className="border border-black p-2 mb-3">
                      <h3
                        className="font-bold text-[10px] mb-1"
                        style={{ color: company.themeColor }}
                      >
                        Return History
                      </h3>
                      <p className="text-[10px] whitespace-pre-wrap">
                        {bill.returnComment}
                      </p>
                    </div>
                  )}

                  {/* Footer block */}
                  <div className="mt-3 border border-black">
                    <div className="grid grid-cols-2 gap-0">
                      <div className="p-2 border-r border-black">
                        <h3
                          className="font-bold text-[10px] mb-1 border-b border-black pb-1"
                          style={{ color: company.themeColor }}
                        >
                          Payment Information
                        </h3>
                        <div className="text-[10px] space-y-0.5 mt-1">
                          <p>
                            <strong>Status:</strong>{" "}
                            {bill.paymentStatus.toUpperCase()}
                          </p>
                          <p>
                            <strong>Paid:</strong>{" "}
                            {formatCurrency(bill.paidAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="p-2">
                        <h3
                          className="font-bold text-[10px] mb-1 border-b border-black pb-1"
                          style={{ color: company.themeColor }}
                        >
                          Company Bank Details
                        </h3>
                        <div className="text-[10px] space-y-0.5 mt-1">
                          <p>
                            <strong>A/c Holder:</strong>{" "}
                            {bill.bankAccount?.accountHolder ||
                              company.bankDetails?.accountHolder}
                          </p>
                          <p>
                            <strong>Bank Name:</strong>{" "}
                            {bill.bankAccount?.bankName ||
                              company.bankDetails?.bankName}
                          </p>
                          <p>
                            <strong>A/c Number:</strong>{" "}
                            {bill.bankAccount?.accountNumber ||
                              company.bankDetails?.accountNumber}
                          </p>
                          <p>
                            <strong>Branch & IFSC:</strong>{" "}
                            {bill.bankAccount?.branchAndIFSC ||
                              company.bankDetails?.branchAndIFSC}
                          </p>
                        </div>
                        {qrDataURL && (
                          <div className="mt-2 flex items-center gap-2">
                            <img
                              src={qrDataURL}
                              alt="Scan & Pay QR"
                              className="w-[50px] h-[50px]"
                            />
                            <p className="text-[9px] text-gray-600 break-words">
                              Scan & Pay
                              <br />
                              (UPI)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-black p-2">
                      <h3
                        className="font-bold text-[10px] mb-1 border-b border-black pb-1"
                        style={{ color: company.themeColor }}
                      >
                        Declaration
                      </h3>
                      <p className="text-[9px] mt-1 leading-relaxed">
                        {isSampleBill
                          ? "This is a SAMPLE BILL for demonstration purposes only. Not valid for actual transactions."
                          : "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-0 border-t border-black">
                      <div className="p-3 border-r border-black">
                        <p className="text-[10px] font-bold mb-1">
                          Customer's Seal and Signature
                        </p>
                        <div className="h-12 border-b border-dashed border-gray-400"></div>
                        <p className="text-[9px] text-center mt-1 text-gray-600">
                          {bill.client.name}
                        </p>
                      </div>
                      <div className="p-3">
                        {bill.createdBy && (
                          <p className="text-[9px] text-gray-500 mb-2">
                            Created by:{" "}
                            <span className="font-semibold text-gray-700">
                              {bill.createdBy}
                            </span>
                          </p>
                        )}
                        <div className="text-right">
                          <p className="text-[10px] font-bold mb-1">
                            for {company.name}
                          </p>
                          <div className="h-12"></div>
                          <p className="text-[9px] border-t border-black pt-1 inline-block">
                            Authorised Signatory
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-center mt-2 text-gray-500">
                    This is a Computer Generated Invoice
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
