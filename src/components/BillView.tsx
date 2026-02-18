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
  PDFDownloadLink,
  pdf,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { Font } from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  src: "/fonts/Inter-VariableFont_opsz,wght.ttf", // or full URL if using CDN

  // }
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
      // SampleBill type may not declare these fields, but sample data can include them.
      billType?: "domestic" | "international";
      internationalDetails?: InternationalDetailsLike;
      returnComment?: string;
      bankAccount?: BankAccount;
    });

const mmToPt = (mm: number) => mm * 2.83465;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 8,
    padding: mmToPt(5),
    lineHeight: 1.2,
  },
  currencyText: {
    fontFamily: "Inter",
  },
  section: {
    marginBottom: mmToPt(3),
  },
  border: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "black",
  },
  header: {
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "black",
    marginBottom: mmToPt(3),
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: mmToPt(3),
  },
  logo: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  smallText: {
    fontSize: 9,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#000",
    color: "white",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCell: {
    padding: 4,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "black",
    fontSize: 9,
  },
  textRight: {
    textAlign: "right",
  },
  textCenter: {
    textAlign: "center",
  },
  bold: {
    fontWeight: "bold",
  },
  gray: {
    color: "gray",
  },
});

const exportStyles = StyleSheet.create({
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
    paddingVertical: 4,
  },
  page: {
    fontFamily: "Inter",
    fontSize: 8.5, // tight but readable, matches image density
    padding: mmToPt(8), // reduced margins to fit everything
    lineHeight: 1.15,
  },
  fullBorder: {
    border: "1pt solid black",
    padding: 6,
    marginBottom: 8,
  },
  topTitle: {
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "black",
    borderBottomStyle: "solid",
    paddingVertical: 3,
  },
  labelCell: {
    width: "25%",
    fontWeight: "bold",
    paddingHorizontal: 4,
  },
  valueCell: {
    width: "75%",
    paddingHorizontal: 4,
  },
  twoColRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  col48: {
    width: "48%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e8e8e8",
    borderBottomWidth: 1,
    borderBottomColor: "black",
    borderBottomStyle: "solid",
    paddingVertical: 4,
    fontWeight: "bold",
  },
  tableCell: {
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  colMarks: { width: "20%" },
  colDesc: { width: "32%" },
  colPkgs: { width: "14%", textAlign: "center" },
  colQty: { width: "12%", textAlign: "center" },
  colRate: { width: "10%", textAlign: "right" },
  colAmount: { width: "12%", textAlign: "right" },
  totalLine: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "black",
    borderTopStyle: "solid",
    paddingTop: 4,
    marginTop: 4,
    fontWeight: "bold",
  },
  declaration: {
    fontSize: 8,
    marginVertical: 3,
  },
  signatureArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: "black",
    borderTopStyle: "solid",
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
});
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
  const isSampleBill = isSample;
  const gstEnabled = (company.gstEnabled ?? true) as boolean;
  const showGST = gstEnabled && bill.totalTax > 0;
  const isInterState: boolean =
    bill.gstType === "igst" ||
    (!bill.gstType && (company?.stateCode ?? "") !== bill.client.stateCode);
  const isInternational = bill.billType === "international";
  const title = isInternational
    ? "PROFORMA INVOICE"
    : gstEnabled
      ? "TAX INVOICE"
      : "INVOICE";
  const formatDate = (date: Date | string, format = "DD-MM-YYYY") => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (format === "DD-MM-YYYY") {
      return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${d.getFullYear()}`;
    }
    // ... other formats ...
  };

  const addressLines = (address: string) =>
    address
      .split(",")
      .map((line) => line.trim())
      .join("\n");

  const slWidth = 30;
  const hsnWidth = 60;
  const gstRateWidth = 40;
  const qtyWidth = 50;
  const unitWidth = 45;
  const rateWidth = 60;
  const amountWidth = 70;

  if (isInternational) {
    return (
      <Document>
        <Page size="A4" style={exportStyles.page}>
          {/* Top full-width bordered title */}
          <View style={{ ...exportStyles.fullBorder, padding: 8 }}>
            <Text style={exportStyles.topTitle}>
              SUPPLY MEANT FOR EXPORT UNDER BOND OR LETTER OF UNDERTAKING
              WITHOUT PAYMENT OF IGST
            </Text>
            <Text
              style={{ fontSize: 11, fontWeight: "bold", textAlign: "center" }}
            >
              PARFORMA INVOICE
            </Text>
            {/* {isSampleBill && (
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 9,
                  color: "#b91c1c",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                SAMPLE BILL - NOT FOR ACTUAL TRANSACTIONS
              </Text>
            )} */}
          </View>

          {/* Exporter / Invoice / Consignee grid */}
          <View style={exportStyles.fullBorder}>
            <View style={exportStyles.twoColRow}>
              {/* Left: Exporter */}
              <View style={exportStyles.col48}>
                <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                  Exporter
                </Text>
                <Text>{company.name.toUpperCase()}</Text>
                <Text>{addressLines(company.address)}</Text>
                <Text>TEL: {company.phone}</Text>
                <Text>GST NO: {company.gstin || "N.A."}</Text>

                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontWeight: "bold" }}>Bank Details:</Text>
                  <Text>
                    {bill.bankAccount?.bankName ||
                      company.bankDetails?.bankName ||
                      "N.A."}
                  </Text>
                  <Text>
                    A/C:{" "}
                    {bill.bankAccount?.accountNumber ||
                      company.bankDetails?.accountNumber ||
                      "N.A."}
                  </Text>
                  <Text>
                    IFSC:{" "}
                    {bill.bankAccount?.branchAndIFSC ||
                      company.bankDetails?.branchAndIFSC ||
                      "N.A."}
                  </Text>
                  {(bill.bankAccount?.upiId || company?.upiId) && (
                    <Text>UPI: {bill.bankAccount?.upiId || company.upiId}</Text>
                  )}
                </View>
              </View>

              {/* Right: Invoice details + Buyer */}
              <View style={{ ...exportStyles.col48, textAlign: "right" }}>
                <Text>
                  <Text style={{ fontWeight: "bold" }}>
                    Invoice Number & Date:
                  </Text>{" "}
                  {bill.billNumber} {formatDate(bill.date)}
                </Text>

                <Text>
                  <Text style={{ fontWeight: "bold" }}>
                    Buyer's Order No. & Date:
                  </Text>{" "}
                  Not Applicable
                </Text>

                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontWeight: "bold" }}>
                    Buyers (If other than consignee)
                  </Text>
                  <Text>{bill.client.name.toUpperCase()}</Text>
                  <Text>{addressLines(bill.client.billingAddress)}</Text>
                </View>
              </View>
            </View>

            {/* Country line */}
            <View
              style={{
                flexDirection: "row",
                marginTop: 8,
                borderTop: "0.5pt solid black",
                paddingTop: 4,
              }}
            >
              <Text style={{ width: "50%" }}>
                <Text style={{ fontWeight: "bold" }}>
                  Country Of Origin Of Goods:
                </Text>{" "}
                INDIA
              </Text>
              <Text style={{ width: "50%", textAlign: "right" }}>
                <Text style={{ fontWeight: "bold" }}>
                  Country Of Final Destination:
                </Text>{" "}
                HONG KONG
              </Text>
            </View>
          </View>

          {/* Shipping + Payment Terms table */}
          {/* <View style={exportStyles.fullBorder}>
            <View style={exportStyles.headerRow}>
              <Text style={{ width: "25%", fontWeight: "bold" }}>
                Pre-Carriage By
              </Text>
              <Text style={{ width: "25%", fontWeight: "bold" }}>
                Place Of Receipt By Pre-Carriage
              </Text>
              <Text
                style={{
                  width: "50%",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Terms of Delivery and Payment
              </Text>
            </View>

            <View style={exportStyles.row}>
              <Text style={{ width: "25%" }}>
                {bill.internationalDetails?.preCarriageBy || "DHL"}
              </Text>
              <Text style={{ width: "25%" }}>
                {bill.internationalDetails?.placeOfReceiptByPreCarriage ||
                  "N.A."}
              </Text>
             </View>

            
            <View style={exportStyles.row}>
              <Text style={{ width: "25%" }}>
                {bill.internationalDetails?.vesselsFlightNo || "AIR FREIGHT"}
              </Text>
              <Text style={{ width: "25%" }}>
                {bill.internationalDetails?.portOfLoading || "SURAT"}
              </Text>
              <Text style={{ width: "50%" }}>
                BANK NAME: {company.bankDetails?.bankName || "N.A."}
              </Text>
            </View>

            <View style={exportStyles.row}>
              <Text style={{ width: "25%" }}>Port Of Discharge</Text>
              <Text style={{ width: "25%" }}>Final Destination</Text>
              <Text style={{ width: "50%" }}>
                A/C NO.: {company.bankDetails?.accountNumber || "N.A."}
              </Text>
            </View>

            <View style={exportStyles.row}>
              <Text style={{ width: "25%" }}>
                {bill.internationalDetails?.portOfDischarge || "HONG KONG"}
              </Text>
              <Text style={{ width: "25%" }}>
                {bill.internationalDetails?.finalDestination || "HONG KONG"}
              </Text>
              <Text style={{ width: "50%" }}>
                SWIFT CODE: {company.bankDetails?.swiftCode || "N.A."}
              </Text>
            </View>
          </View> */}
          <Text
            style={{
              fontSize: 9.5,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            Shipping & Export Details
          </Text>

          {isInternational && bill.internationalDetails && (
            <View
              style={{
                border: "0.8pt solid #555", // keep subtle border or remove if unwanted
                padding: 8,
                marginBottom: 10,
                borderRadius: 2, // optional slight rounding
              }}
            >
              <View style={{ flexDirection: "row", gap: 12 }}>
                {/* LEFT COLUMN - 4 fields */}
                <View style={{ width: "50%" }}>
                  {bill.internationalDetails.preCarriageBy && (
                    <View style={{ marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5 }}>
                        <Text style={{ fontWeight: "bold" }}>
                          Pre-Carriage By:
                        </Text>{" "}
                        {bill.internationalDetails.preCarriageBy}
                      </Text>
                    </View>
                  )}

                  {bill.internationalDetails.placeOfReceiptByPreCarriage && (
                    <View style={{ marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5 }}>
                        <Text style={{ fontWeight: "bold" }}>
                          Place Of Receipt:
                        </Text>{" "}
                        {bill.internationalDetails.placeOfReceiptByPreCarriage}
                      </Text>
                    </View>
                  )}

                  {bill.internationalDetails.portOfLoading && (
                    <View style={{ marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5 }}>
                        <Text style={{ fontWeight: "bold" }}>
                          Port of Loading:
                        </Text>{" "}
                        {bill.internationalDetails.portOfLoading}
                      </Text>
                    </View>
                  )}

                  {bill.internationalDetails.portOfDischarge && (
                    <View style={{ marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5 }}>
                        <Text style={{ fontWeight: "bold" }}>
                          Port of Discharge:
                        </Text>{" "}
                        {bill.internationalDetails.portOfDischarge}
                      </Text>
                    </View>
                  )}
                </View>

                {/* RIGHT COLUMN - 4 fields */}
                <View style={{ width: "50%" }}>
                  {bill.internationalDetails.vesselsFlightNo && (
                    <View style={{ marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5 }}>
                        <Text style={{ fontWeight: "bold" }}>
                          Vessels/Flight No.:
                        </Text>{" "}
                        {bill.internationalDetails.vesselsFlightNo}
                      </Text>
                    </View>
                  )}

                  {bill.internationalDetails.finalDestination && (
                    <View style={{ marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5 }}>
                        <Text style={{ fontWeight: "bold" }}>
                          Final Destination:
                        </Text>{" "}
                        {bill.internationalDetails.finalDestination}
                      </Text>
                    </View>
                  )}

                  {bill.internationalDetails.countryOfOrigin && (
                    <View style={{ marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5 }}>
                        <Text style={{ fontWeight: "bold" }}>
                          Country Of Origin:
                        </Text>{" "}
                        {bill.internationalDetails.countryOfOrigin}
                      </Text>
                    </View>
                  )}

                  {bill.internationalDetails.countryOfFinalDestination && (
                    <View style={{ marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5 }}>
                        <Text style={{ fontWeight: "bold" }}>
                          Country Of Destination:
                        </Text>{" "}
                        {bill.internationalDetails.countryOfFinalDestination}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Items Table */}

          <View
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "black", // outer border
              marginBottom: 12,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#f5f5f5",
                borderBottomWidth: 1,
                borderBottomColor: "black",
                borderBottomStyle: "solid",
                fontWeight: "bold",
              }}
            >
              <Text
                style={{
                  width: "18%",
                  textAlign: "center",
                  padding: 5,
                  borderRightWidth: 0.5,
                  borderRightColor: "black",
                  borderRightStyle: "solid",
                }}
              >
                Sl
              </Text>
              <Text
                style={{
                  width: "34%",
                  padding: 5,
                  borderRightWidth: 0.5,
                  borderRightColor: "black",
                  borderRightStyle: "solid",
                }}
              >
                Description of Goods
              </Text>
            {showGST && (
              <View
                style={{
                  width: hsnWidth,
                  textAlign: "center",
                  padding: 5,
                  borderRightWidth: 0.5,
                  borderRightColor: "black",
                  borderRightStyle: "solid",
                }}
              >
                <Text>HSN/SAC</Text>
              </View>
            )}
              <Text
                style={{
                  width: "10%",
                  textAlign: "center",
                  padding: 5,
                  borderRightWidth: 0.5,
                  borderRightColor: "black",
                  borderRightStyle: "solid",
                }}
              >
                Qty
              </Text>
              <Text
                style={{
                  width: "8%",
                  textAlign: "center",
                  padding: 5,
                  borderRightWidth: 0.5,
                  borderRightColor: "black",
                  borderRightStyle: "solid",
                }}
              >
                Unit
              </Text>
              <Text
                style={{
                  width: "10%",
                  textAlign: "right",
                  padding: 5,
                  borderRightWidth: 0.5,
                  borderRightColor: "black",
                  borderRightStyle: "solid",
                }}
              >
                Rate
              </Text>
              <Text
                style={{
                  width: "12%",
                  textAlign: "right",
                  padding: 5,
                }}
              >
                Amount
              </Text>
            </View>

            {/* Rows */}
            {bill.items.map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  borderBottomWidth: 0.5,
                  borderBottomColor: "#ddd",
                  borderBottomStyle: "solid",
                }}
              >
                <Text
                  style={{
                    width: "18%",
                    textAlign: "center",
                    padding: 5,
                    borderRightWidth: 0.5,
                    borderRightColor: "#ddd",
                    borderRightStyle: "solid",
                  }}
                >
                  {index + 1}
                </Text>
                <View
                  style={{
                    width: "34%",
                    padding: 5,
                    borderRightWidth: 0.5,
                    borderRightColor: "#ddd",
                    borderRightStyle: "solid",
                  }}
                >
                  <Text>{item.productName}</Text>
                  {bill.internationalDetails?.grossWeight && (
                    <Text style={{ fontSize: 7, color: "gray", marginTop: 2 }}>
                      GW: {bill.internationalDetails.grossWeight} kg | NW:{" "}
                      {bill.internationalDetails.netWeight || "N/A"} kg
                    </Text>
                  )}
                </View>
                {showGST && (
                  <Text
                    style={{
                      width: "12%",
                      textAlign: "center",
                      padding: 5,
                      borderRightWidth: 0.5,
                      borderRightColor: "#ddd",
                      borderRightStyle: "solid",
                    }}
                  >
                    {item.hsnCode || "-"}
                  </Text>
                )}
                <Text
                  style={{
                    width: "10%",
                    textAlign: "center",
                    padding: 5,
                    borderRightWidth: 0.5,
                    borderRightColor: "#ddd",
                    borderRightStyle: "solid",
                  }}
                >
                  {item.quantity}
                </Text>
                <Text
                  style={{
                    width: "8%",
                    textAlign: "center",
                    padding: 5,
                    borderRightWidth: 0.5,
                    borderRightColor: "#ddd",
                    borderRightStyle: "solid",
                  }}
                >
                  {item.unit || "PCS"}
                </Text>
                <Text
                  style={{
                    width: "10%",
                    textAlign: "right",
                    padding: 5,
                    borderRightWidth: 0.5,
                    borderRightColor: "#ddd",
                    borderRightStyle: "solid",
                  }}
                >
                  {formatCurrency(item.ratePerUnit)}
                </Text>
                <Text
                  style={{
                    width: "12%",
                    textAlign: "right",
                    padding: 5,
                  }}
                >
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}

            {/* Subtotal / Total rows */}
            <View
              style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderTopColor: "black",
                borderTopStyle: "solid",
                backgroundColor: "#f9f9f9",
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  width: "88%",
                  textAlign: "right",
                  fontWeight: "bold",
                  paddingHorizontal: 8,
                }}
              >
                Subtotal
              </Text>
              <Text
                style={{
                  width: "12%",
                  textAlign: "right",
                  fontWeight: "bold",
                  paddingRight: 8,
                }}
              >
                {formatCurrency(bill.subtotal)}
              </Text>
            </View>

            {/* Final Total */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#e0e0e0",
                paddingVertical: 8,
                borderTop: "1pt solid black",
              }}
            >
              <Text
                style={{
                  width: "88%",
                  textAlign: "right",
                  fontWeight: "bold",
                  paddingHorizontal: 8,
                  fontSize: 10,
                }}
              >
                TOTAL
              </Text>
              <Text
                style={{
                  width: "12%",
                  textAlign: "right",
                  fontWeight: "bold",
                  paddingRight: 8,
                  fontSize: 10,
                }}
              >
                {formatCurrency(bill.total)}
              </Text>
            </View>
          </View>

          {/* Declaration */}
          <View style={{ ...exportStyles.fullBorder, borderTop: 0 }}>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
              DECLARATION:
            </Text>
            <Text style={exportStyles.declaration}>
              THE DIAMONDS HEREIN INVOICED ARE EXCLUSIVELY OF LAB GROWN DIAMOND
              BASED ON PERSONAL KNOWLEDGE AND/OR WRITTEN GUARANTEES PROVIDED BY
              THE SUPPLIER OF THESE DIAMONDS.
            </Text>

            <Text style={exportStyles.declaration}>
              TOTAL US DOLLARS : {numberToWords(Math.round(bill.total))}
            </Text>
            <Text style={exportStyles.declaration}>
              WE INTEND TO CLAIM BENEFIT UNDER RoDTEP SCHEME AS APPLICABLE
            </Text>
            <Text style={exportStyles.declaration}>
              The diamonds herein invoiced have been purchased from legitimate
              sources not involved in funding conflict and in compliance with
              United Nations resolutions. The seller hereby guarantees that the
              supplier of these diamonds is conflict free, based on personal
              knowledge and/or written guarantees provided by the supplier of
              these diamonds.
            </Text>
          </View>

          {/* Payment & Signatures */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
              borderTop: "0.5pt solid #ccc", // optional light separator
              paddingTop: 8,
            }}
          >
            {/* LEFT SIDE: Bank Details */}
            <View style={{ width: "50%" }}>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                PAYMENT INSTRUCTIONS:
              </Text>
              <Text>
                {bill.bankAccount?.accountHolder ||
                  company.bankDetails?.accountHolder ||
                  "N.A."}
              </Text>
              <Text>
                A/c No.:{" "}
                {bill.bankAccount?.accountNumber ||
                  company.bankDetails?.accountNumber ||
                  "N.A."}
              </Text>
              <Text>
                Bank:{" "}
                {bill.bankAccount?.bankName ||
                  company.bankDetails?.bankName ||
                  "N.A."}
              </Text>
              <Text>
                Branch & IFSC:{" "}
                {bill.bankAccount?.branchAndIFSC ||
                  company.bankDetails?.branchAndIFSC ||
                  "N.A."}
              </Text>
              {!!qrDataURL && (
                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <Image src={qrDataURL} style={{ width: 55, height: 55 }} />
                  <Text style={{ fontSize: 8, marginLeft: 8 }}>
                    Scan & Pay (UPI)
                  </Text>
                </View>
              )}
            </View>

            {/* RIGHT SIDE: Signature & Date */}
            <View style={{ width: "50%", textAlign: "right" }}>
              <Text>
                Signature & Date: {formatDate(new Date(), "DD-MM-YYYY")}
              </Text>{" "}
              {/* Current date in DD-MM-YYYY */}
              <Text style={{ fontWeight: "bold", marginTop: 4 }}>
                FOR {company.name.toUpperCase()}
              </Text>
              <Text style={{ marginTop: 50 }}>Proprietor</Text>{" "}
              {/* Increased space for signature */}
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* {isSampleBill && (
          <View style={{ marginBottom: mmToPt(2) }}>
            <Text
              style={{
                fontSize: 10,
                color: "#b91c1c",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              SAMPLE BILL - NOT FOR ACTUAL TRANSACTIONS
            </Text>
          </View>
        )} */}
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                {company.logo && (
                  <Image src={company.logo} style={styles.logo} />
                )}
                <Text
                  style={{
                    fontSize: 16,
                    ...styles.bold,
                    color: company.themeColor,
                  }}
                >
                  {company.name}
                </Text>
              </View>
              <Text style={styles.smallText}>
                {addressLines(company.address)}
              </Text>
              {showGST && (
                <View style={{ ...styles.smallText, marginTop: 4 }}>
                  <Text>
                    <Text style={styles.bold}>GSTIN/UIN:</Text> {company.gstin}
                  </Text>
                  <Text>
                    <Text style={styles.bold}>State:</Text> {company.state},{" "}
                    <Text style={styles.bold}>Code:</Text> {company.stateCode}
                  </Text>
                </View>
              )}
              <View style={{ ...styles.smallText, marginTop: 4 }}>
                <Text>
                  <Text style={styles.bold}>Phone:</Text> {company.phone}
                </Text>
                <Text>
                  <Text style={styles.bold}>Email:</Text> {company.email}
                </Text>
              </View>
            </View>
            <View style={{ textAlign: "right" }}>
              <Text style={{ ...styles.title, color: company.themeColor }}>
                {title}
              </Text>
              <View style={styles.smallText}>
                <Text>
                  <Text style={styles.bold}>Invoice No.:</Text>{" "}
                  {bill.billNumber}
                </Text>
                <Text>
                  <Text style={styles.bold}>Date:</Text> {formatDate(bill.date)}
                </Text>
                {!isInternational && (
                  <Text>
                    <Text style={styles.bold}>Due Date:</Text>{" "}
                    {formatDate(bill.dueDate)}
                  </Text>
                )}
                {bill.deliveryNote && (
                  <Text>
                    <Text style={styles.bold}>Delivery Note:</Text>{" "}
                    {bill.deliveryNote}
                  </Text>
                )}
                {bill.modeOfPayment && (
                  <Text>
                    <Text style={styles.bold}>Payment Mode:</Text>{" "}
                    {bill.modeOfPayment}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {isInternational && (
          <View style={{ alignItems: "center", marginBottom: mmToPt(3) }}>
            <Text style={{ ...styles.title, color: company.themeColor }}>
              EXPORT INVOICE
            </Text>
          </View>
        )}

        {/* International Details */}
        {isInternational && bill.internationalDetails && (
          <View
            style={{
              border: "0.8pt solid #444", // light outer border (remove if unwanted)
              padding: 8,
              marginBottom: 10, // reduced bottom margin
            }}
          >
            <Text
              style={{
                fontSize: 9.5,
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              Shipping & Export Details
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 2 }}>
              {bill.internationalDetails.preCarriageBy && (
                <View style={{ width: "50%", paddingRight: 8 }}>
                  <Text style={{ fontSize: 8.5 }}>
                    <Text style={{ fontWeight: "bold" }}>Pre-Carriage By:</Text>{" "}
                    {bill.internationalDetails.preCarriageBy}
                  </Text>
                </View>
              )}
              {bill.internationalDetails.vesselsFlightNo && (
                <View style={{ width: "50%" }}>
                  <Text style={{ fontSize: 8.5 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      Vessels/Flight No.:
                    </Text>{" "}
                    {bill.internationalDetails.vesselsFlightNo}
                  </Text>
                </View>
              )}
              {bill.internationalDetails.placeOfReceiptByPreCarriage && (
                <View style={{ width: "50%", paddingRight: 8 }}>
                  <Text style={{ fontSize: 8.5 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      Place Of Receipt:
                    </Text>{" "}
                    {bill.internationalDetails.placeOfReceiptByPreCarriage}
                  </Text>
                </View>
              )}
              {bill.internationalDetails.portOfLoading && (
                <View style={{ width: "50%" }}>
                  <Text style={{ fontSize: 8.5 }}>
                    <Text style={{ fontWeight: "bold" }}>Port of Loading:</Text>{" "}
                    {bill.internationalDetails.portOfLoading}
                  </Text>
                </View>
              )}
              {bill.internationalDetails.portOfDischarge && (
                <View style={{ width: "50%", paddingRight: 8 }}>
                  <Text style={{ fontSize: 8.5 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      Port of Discharge:
                    </Text>{" "}
                    {bill.internationalDetails.portOfDischarge}
                  </Text>
                </View>
              )}
              {bill.internationalDetails.finalDestination && (
                <View style={{ width: "50%" }}>
                  <Text style={{ fontSize: 8.5 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      Final Destination:
                    </Text>{" "}
                    {bill.internationalDetails.finalDestination}
                  </Text>
                </View>
              )}
              {bill.internationalDetails.countryOfOrigin && (
                <View style={{ width: "50%", paddingRight: 8 }}>
                  <Text style={{ fontSize: 8.5 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      Country Of Origin:
                    </Text>{" "}
                    {bill.internationalDetails.countryOfOrigin}
                  </Text>
                </View>
              )}
              {bill.internationalDetails.countryOfFinalDestination && (
                <View style={{ width: "50%" }}>
                  <Text style={{ fontSize: 8.5 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      Country Of Destination:
                    </Text>{" "}
                    {bill.internationalDetails.countryOfFinalDestination}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Client Details */}
        <View style={{ flexDirection: "row", marginBottom: mmToPt(3) }}>
          <View style={{ ...styles.border, padding: mmToPt(2), width: "50%" }}>
            <Text
              style={{
                fontSize: 9,
                fontWeight: "bold",
                color: company.themeColor,
                marginBottom: 6,
                borderBottom: "0.5pt solid " + company.themeColor,
                paddingBottom: 2,
              }}
            >
              {isInternational ? "Consignee" : "Consignee (Ship to)"}
            </Text>
            <Text style={{ ...styles.bold, fontSize: 9 }}>
              {bill.client.name.toUpperCase()}
            </Text>
            <Text style={{ ...styles.smallText, marginTop: 4 }}>
              {addressLines(
                bill.client.shippingAddress || bill.client.billingAddress,
              )}
            </Text>
            {showGST && !isInternational && (
              <View style={{ ...styles.smallText, marginTop: 4 }}>
                <Text>
                  <Text style={styles.bold}>GSTIN/UIN:</Text>{" "}
                  {bill.client.gstin}
                </Text>
                <Text>
                  <Text style={styles.bold}>State:</Text> {bill.client.state},{" "}
                  <Text style={styles.bold}>Code:</Text> {bill.client.stateCode}
                </Text>
              </View>
            )}
            {bill.client.phone && (
              <Text style={styles.smallText}>
                <Text style={styles.bold}>Phone:</Text> {bill.client.phone}
              </Text>
            )}
          </View>
          <View
            style={{
              ...styles.border,
              borderLeft: 0,
              padding: mmToPt(2),
              width: "50%",
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "bold",
                color: company.themeColor,
                marginBottom: 6,
                borderBottom: "0.5pt solid " + company.themeColor,
                paddingBottom: 2,
              }}
            >
              {isInternational
                ? "Buyer (If other than consignee)"
                : "Buyer (Bill to)"}
            </Text>
            <Text style={{ ...styles.bold, fontSize: 9 }}>
              {bill.client.name.toUpperCase()}
            </Text>
            <Text style={{ ...styles.smallText, marginTop: 4 }}>
              {addressLines(bill.client.billingAddress)}
            </Text>
            {showGST && !isInternational && (
              <View style={{ ...styles.smallText, marginTop: 4 }}>
                <Text>
                  <Text style={styles.bold}>GSTIN/UIN:</Text>{" "}
                  {bill.client.gstin}
                </Text>
                <Text>
                  <Text style={styles.bold}>State:</Text> {bill.client.state},{" "}
                  <Text style={styles.bold}>Code:</Text> {bill.client.stateCode}
                </Text>
              </View>
            )}
            {bill.placeOfSupply && !isInternational && (
              <Text style={{ ...styles.smallText, marginTop: 4 }}>
                <Text style={styles.bold}>Place of Supply:</Text>{" "}
                {bill.placeOfSupply}
              </Text>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <View
            style={{
              ...styles.tableHeader,
              backgroundColor: company.themeColor,
            }}
          >
            <Text
              style={{
                width: slWidth,
                ...styles.textCenter,
                ...styles.tableCell,
              }}
            >
              Sl
            </Text>
            <Text style={{ flex: 1, ...styles.tableCell }}>
              Description of Goods
            </Text>
            {showGST && !isInternational && (
              <Text
                style={{
                  width: hsnWidth,
                  ...styles.textCenter,
                  ...styles.tableCell,
                }}
              >
                HSN/SAC
              </Text>
            )}
            {showGST && !isInternational && (
              <Text
                style={{
                  width: gstRateWidth,
                  ...styles.textCenter,
                  ...styles.tableCell,
                }}
              >
                GST%
              </Text>
            )}
            <Text
              style={{
                width: qtyWidth,
                ...styles.textCenter,
                ...styles.tableCell,
              }}
            >
              Qty
            </Text>
            <Text
              style={{
                width: unitWidth,
                ...styles.textCenter,
                ...styles.tableCell,
              }}
            >
              Unit
            </Text>
            <Text
              style={{
                width: rateWidth,
                ...styles.textCenter,
                ...styles.tableCell,
              }}
            >
              Rate
            </Text>
            <Text
              style={{
                width: amountWidth,
                ...styles.textRight,
                ...styles.tableCell,
              }}
            >
              Amount
            </Text>
          </View>
          {bill.items.map((item, index) => (
            <View
              key={index}
              style={{
                ...styles.tableRow,
                backgroundColor: index % 2 === 0 ? "#f0f0f0" : "white",
              }}
            >
              <Text
                style={{
                  width: slWidth,
                  ...styles.textCenter,
                  ...styles.tableCell,
                }}
              >
                {index + 1}
              </Text>
              <View style={{ flex: 1, ...styles.tableCell }}>
                <Text>{item.productName}</Text>
                {bill.internationalDetails &&
                  (bill.internationalDetails.grossWeight ||
                    bill.internationalDetails.netWeight) && (
                    <Text style={{ fontSize: 7, ...styles.gray, marginTop: 2 }}>
                      {bill.internationalDetails.grossWeight &&
                        `Gross Wt: ${bill.internationalDetails.grossWeight} kg`}
                      {bill.internationalDetails.grossWeight &&
                        bill.internationalDetails.netWeight &&
                        " | "}
                      {bill.internationalDetails.netWeight &&
                        `Net Wt: ${bill.internationalDetails.netWeight} kg`}
                    </Text>
                  )}
              </View>
            {showGST && (
              <Text
                style={{
                  width: hsnWidth,
                  ...styles.textCenter,
                  ...styles.tableCell,
                }}
              >
                {item.hsnCode}
              </Text>
            )}
            {showGST && !isInternational && (
              <Text
                style={{
                  width: gstRateWidth,
                  ...styles.textCenter,
                  ...styles.tableCell,
                }}
              >
                {item.gstRate}%
              </Text>
            )}
              <Text
                style={{
                  width: qtyWidth,
                  ...styles.textCenter,
                  ...styles.tableCell,
                }}
              >
                {item.quantity}
              </Text>
              <Text
                style={{
                  width: unitWidth,
                  ...styles.textCenter,
                  ...styles.tableCell,
                }}
              >
                {item.unit}
              </Text>
              <Text
                style={{
                  width: rateWidth,
                  ...styles.textRight,
                  ...styles.tableCell,
                }}
              >
                {formatCurrency(item.ratePerUnit)}
              </Text>
              <Text
                style={{
                  width: amountWidth,
                  ...styles.textRight,
                  ...styles.tableCell,
                }}
              >
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
          {/* Subtotal */}
          <View
            style={{
              ...styles.tableRow,
              backgroundColor: "#f0f0f0",
              ...styles.bold,
            }}
          >
            <Text
              style={{
                flex: 1,
                ...styles.textRight,
                ...styles.tableCell,
                paddingRight: 8,
              }}
            >
              Subtotal
            </Text>
            <Text
              style={{
                width: amountWidth,
                ...styles.textRight,
                ...styles.tableCell,
              }}
            >
              {formatCurrency(bill.subtotal)}
            </Text>
          </View>
          {/* Discount and Other Charges for Domestic */}
          {bill.discount !== undefined && bill.discount > 0 && (
            <View style={styles.tableRow}>
              <Text
                style={{
                  flex: 1,
                  ...styles.textRight,
                  ...styles.tableCell,
                  paddingRight: 8,
                  color: "#b91c1c",
                }}
              >
                Discount{" "}
                {bill.discountType === "percentage"
                  ? `(${bill.discount}%)`
                  : ""}
              </Text>
              <Text
                style={{
                  width: amountWidth,
                  ...styles.textRight,
                  ...styles.tableCell,
                  color: "#b91c1c",
                }}
              >
                -{formatCurrency(bill.discount)}
              </Text>
            </View>
          )}
          {bill.otherCharges !== undefined && bill.otherCharges > 0 && (
            <View style={styles.tableRow}>
              <Text
                style={{
                  flex: 1,
                  ...styles.textRight,
                  ...styles.tableCell,
                  paddingRight: 8,
                }}
              >
                Other Charges
              </Text>
              <Text
                style={{
                  width: amountWidth,
                  ...styles.textRight,
                  ...styles.tableCell,
                }}
              >
                {formatCurrency(bill.otherCharges)}
              </Text>
            </View>
          )}
          {/* Taxes */}
          {showGST &&
            !isInternational &&
            bill.totalTax > 0 &&
            (isInterState ? (
              <View style={styles.tableRow}>
                <Text
                  style={{
                    flex: 1,
                    ...styles.textRight,
                    ...styles.tableCell,
                    paddingRight: 8,
                  }}
                >
                  IGST
                </Text>
                <Text
                  style={{
                    width: amountWidth,
                    ...styles.textRight,
                    ...styles.tableCell,
                  }}
                >
                  {formatCurrency(bill.totalTax)}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.tableRow}>
                  <Text
                    style={{
                      flex: 1,
                      ...styles.textRight,
                      ...styles.tableCell,
                      paddingRight: 8,
                    }}
                  >
                    CGST
                  </Text>
                  <Text
                    style={{
                      width: amountWidth,
                      ...styles.textRight,
                      ...styles.tableCell,
                    }}
                  >
                    {formatCurrency(
                      bill.items.reduce(
                        (sum, item) => sum + (item.cgst || 0),
                        0,
                      ),
                    )}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text
                    style={{
                      flex: 1,
                      ...styles.textRight,
                      ...styles.tableCell,
                      paddingRight: 8,
                    }}
                  >
                    SGST
                  </Text>
                  <Text
                    style={{
                      width: amountWidth,
                      ...styles.textRight,
                      ...styles.tableCell,
                    }}
                  >
                    {formatCurrency(
                      bill.items.reduce(
                        (sum, item) => sum + (item.sgst || 0),
                        0,
                      ),
                    )}
                  </Text>
                </View>
              </>
            ))}
          {/* Total */}
          <View
            style={{
              ...styles.tableRow,
              backgroundColor: company.themeColor,
              color: "white",
              ...styles.bold,
            }}
          >
            <Text
              style={{
                flex: 1,
                ...styles.textRight,
                ...styles.tableCell,
                paddingRight: 8,
              }}
            >
              Total
            </Text>
            <Text
              style={{
                width: amountWidth,
                ...styles.textRight,
                ...styles.tableCell,
                ...styles.currencyText,
              }}
            >
              {formatCurrency(bill.total)}
            </Text>
          </View>
        </View>

        {/* Notes and Payment History */}
        {(bill.notes ||
          company.defaultNote ||
          (bill.payments && bill.payments.length > 0)) && (
          <View
            style={{
              flexDirection: "row",
              border: "1pt solid black",
              borderTop: "1pt solid black",
              minHeight: mmToPt(30),
              marginTop: mmToPt(3),
            }}
          >
            {/* Notes Section */}
            {(bill.notes || company.defaultNote) && (
              <View
                style={{
                  flex: 1,
                  padding: mmToPt(2.5),
                  borderRight:
                    bill.payments && bill.payments.length > 0
                      ? "1pt solid black"
                      : "0",
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "bold",
                    marginBottom: 6,
                    color: company.themeColor,
                    borderBottom: "0.5pt solid black",
                    paddingBottom: 2,
                  }}
                >
                  Notes / Terms
                </Text>
                <Text style={{ fontSize: 8.5, lineHeight: 1.4 }}>
                  {bill.notes || company.defaultNote}
                </Text>
              </View>
            )}

            {/* Payment History Section */}
            {bill.payments && bill.payments.length > 0 && (
              <View style={{ flex: 1, padding: mmToPt(2.5) }}>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "bold",
                    marginBottom: 6,
                    color: company.themeColor,
                    borderBottom: "0.5pt solid black",
                    paddingBottom: 2,
                  }}
                >
                  Payment History
                </Text>
                <View style={{ gap: 3 }}>
                  {bill.payments.map((payment, index) => (
                    <View
                      key={payment.id || index}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        fontSize: 8,
                        borderBottom: "0.3pt solid #eee",
                        paddingBottom: 2,
                        paddingTop: 1,
                      }}
                    >
                      <Text style={{ color: "#333" }}>
                        {payment.method} ({formatDate(payment.date)})
                      </Text>
                      <Text style={{ fontWeight: "bold" }}>
                        {formatCurrency(payment.amount)}
                      </Text>
                    </View>
                  ))}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 4,
                      paddingTop: 4,
                      borderTop: "1pt solid #ddd",
                    }}
                  >
                    <Text style={{ fontWeight: "bold", fontSize: 8.5 }}>
                      Total Paid
                    </Text>
                    <Text
                      style={{
                        fontWeight: "bold",
                        color: company.themeColor,
                        fontSize: 8.5,
                      }}
                    >
                      {formatCurrency(bill.paidAmount)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Return History */}
        {bill.returnComment && (
          <View
            style={{
              border: "1pt solid black",
              borderTop: "1pt solid black",
              padding: mmToPt(2),
            }}
          >
            <Text
              style={{
                fontSize: 8,
                fontWeight: "bold",
                marginBottom: 4,
                color: company.themeColor,
              }}
            >
              Return History
            </Text>
            <Text style={{ fontSize: 8 }}>{bill.returnComment}</Text>
          </View>
        )}

        {/* Footer Grid */}
        <View
          style={{
            flexDirection: "row",
            border: "1pt solid black",
            borderTop: "1pt solid black",
            marginTop: mmToPt(3),
          }}
        >
          {/* Payment Information */}
          <View
            style={{
              flex: 1,
              padding: mmToPt(2),
              borderRight: "1pt solid black",
            }}
          >
            <View
              style={{
                borderBottom: "1pt solid black",
                paddingBottom: mmToPt(1),
                marginBottom: mmToPt(1),
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "bold",
                  color: company.themeColor,
                }}
              >
                Payment Information
              </Text>
            </View>
            <View style={{ gap: mmToPt(0.5) }}>
              <Text style={{ fontSize: 8.5 }}>
                <Text style={{ fontWeight: "bold" }}>Status:</Text>{" "}
                {bill.paymentStatus.toUpperCase()}
              </Text>
              <Text style={{ fontSize: 8.5 }}>
                <Text style={{ fontWeight: "bold" }}>Paid:</Text>{" "}
                {formatCurrency(bill.paidAmount)}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, padding: mmToPt(2) }}>
            <View
              style={{
                borderBottom: "1pt solid black",
                paddingBottom: mmToPt(1),
                marginBottom: mmToPt(1),
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "bold",
                  color: company.themeColor,
                }}
              >
                Company Bank Details
              </Text>
            </View>
            <View style={{ gap: mmToPt(0.5) }}>
              <Text style={{ fontSize: 8.5 }}>
                <Text style={{ fontWeight: "bold" }}>A/c Holder:</Text>{" "}
                {bill.bankAccount?.accountHolder ||
                  company.bankDetails?.accountHolder ||
                  "N.A."}
              </Text>
              <Text style={{ fontSize: 8.5 }}>
                <Text style={{ fontWeight: "bold" }}>Bank Name:</Text>{" "}
                {bill.bankAccount?.bankName ||
                  company.bankDetails?.bankName ||
                  "N.A."}
              </Text>
              <Text style={{ fontSize: 8.5 }}>
                <Text style={{ fontWeight: "bold" }}>A/c Number:</Text>{" "}
                {bill.bankAccount?.accountNumber ||
                  company.bankDetails?.accountNumber ||
                  "N.A."}
              </Text>
              <Text style={{ fontSize: 8.5 }}>
                <Text style={{ fontWeight: "bold" }}>Branch & IFSC:</Text>{" "}
                {bill.bankAccount?.branchAndIFSC ||
                  company.bankDetails?.branchAndIFSC ||
                  "N.A."}
              </Text>
            </View>
            {qrDataURL && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: mmToPt(2),
                  gap: mmToPt(2),
                }}
              >
                <Image src={qrDataURL} style={{ width: 50, height: 50 }} />
                <Text style={{ fontSize: 7, color: "#4b5563" }}>
                  Scan & Pay{"\n"}(UPI)
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Declaration - Spans full width */}
        <View
          style={{
            border: "1pt solid black",
            borderTop: "1pt solid black",
            padding: mmToPt(2),
          }}
        >
          <View
            style={{
              borderBottom: "1pt solid black",
              paddingBottom: mmToPt(1),
              marginBottom: mmToPt(1),
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "bold",
                color: company.themeColor,
              }}
            >
              Declaration
            </Text>
          </View>
          <Text style={{ fontSize: 8.5, lineHeight: 1.4 }}>
            {isInternational
              ? "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. We intend to claim benefit under RoDTEP scheme as applicable."
              : isSampleBill
                ? "This is a SAMPLE BILL for demonstration purposes only. Not valid for actual transactions."
                : "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
          </Text>
        </View>

        {/* Signatures */}
        <View
          style={{
            flexDirection: "row",
            border: "1pt solid black",
            borderTop: "1pt solid black",
          }}
        >
          <View
            style={{
              flex: 1,
              padding: mmToPt(3),
              borderRight: "1pt solid black",
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>
              Customer's Seal and Signature
            </Text>
            <View
              style={{
                height: 48,
                borderBottom: "1pt dashed #9ca3af",
              }}
            />
            <Text
              style={{
                fontSize: 9,
                textAlign: "center",
                marginTop: 4,
                color: "#4b5563",
              }}
            >
              {bill.client.name}
            </Text>
          </View>
          <View style={{ flex: 1, padding: mmToPt(3), textAlign: "right" }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>
              for {company.name}
            </Text>
            <View style={{ height: 48 }} />
            <View
              style={{
                borderTop: "1pt solid black",
                paddingTop: 4,
                alignSelf: "flex-end",
              }}
            >
              <Text style={{ fontSize: 9 }}>Authorised Signatory</Text>
            </View>
          </View>
        </View>

        <Text
          style={{
            fontSize: 7,
            textAlign: "center",
            marginTop: 8,
            ...styles.gray,
          }}
        >
          This is a Computer Generated {isInternational ? "INVOICE" : "Invoice"}
        </Text>
      </Page>
    </Document>
  );
};

export function BillView({ bill }: BillViewProps) {
  const billRef = useRef<HTMLDivElement>(null);
  const [company, setCompany] = useState<any>(null);
  const [scale, setScale] = useState(1);
  const [qrDataURL, setQrDataURL] = useState<string>("");

  const publicBillUrl = `${window.location.origin}/view/bill/${bill.id}`;

  useEffect(() => {
    const loadCompany = async () => {
      const companyData = await getCompanyProfile();
      setCompany(companyData);
    };
    loadCompany();
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
      .catch((err) => {
        console.error("Failed to generate UPI QR:", err);
        setQrDataURL("");
      });
  }, [
    company?.upiId,
    company?.name,
    bill.total,
    bill.billNumber,
    bill.bankAccount?.upiId,
  ]);

  useEffect(() => {
    const calculateScale = () => {
      const containerWidth = window.innerWidth;
      const a4Width = 210;
      const mmToPx = 3.7795275591;
      const a4WidthPx = a4Width * mmToPx;

      if (containerWidth < a4WidthPx + 40) {
        const newScale = (containerWidth - 40) / a4WidthPx;
        setScale(Math.max(0.4, Math.min(1, newScale)));
      } else {
        setScale(1);
      }
    };

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap"; // Fallback CDN for variable/regular
    // OR local: but since variable font, use CDN for simplicity if local fails
    document.head.appendChild(link);

    // Alternative: If you prefer local variable font in HTML (more exact match)
    // const style = document.createElement("style");
    // style.textContent = `
    //   @font-face {
    //     font-family: 'Inter';
    //     src: url('/fonts/NotoSans-VariableFont_wdth,wght.ttf') format('truetype-variations');
    //     font-weight: 100 900;
    //     font-stretch: 75% 125%;
    //     font-display: swap;
    //   }
    // `;
    // document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      // or remove style
    };
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #bill-print, #bill-print * { visibility: visible; }
        #bill-print { 
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 210mm !important; 
          min-height: 297mm !important; 
          max-width: 210mm !important;
          margin: 0 !important;
          padding: 5mm !important;
          box-shadow: none !important;
          font-size: 10px !important;
          transform: none !important;
        }
        #bill-print table {
          font-size: 9px !important;
        }
        #bill-print th, #bill-print td {
          padding: 1mm !important;
        }
        @page { 
          size: A4; 
          margin: 0; 
        }
      }
      @media screen and (max-width: 768px) {
        #bill-print-wrapper {
          overflow: hidden;
          display: flex;
          justify-content: center;
          padding: 10px;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // const handlePrintPDF = async () => {
  //   if (!qrDataURL || !company) return;
  //   const blob = await pdf(
  //     <BillPDF bill={bill} company={company} qrDataURL={qrDataURL} />
  //   ).toBlob();
  //   const url = URL.createObjectURL(blob);
  //   const iframe = document.createElement("iframe");
  //   iframe.style.display = "none";
  //   iframe.src = url;
  //   document.body.appendChild(iframe);
  //   iframe.onload = () => {
  //     setTimeout(() => {
  //       iframe.contentWindow?.focus();
  //       iframe.contentWindow?.print();
  //     }, 1000);
  //   };
  // };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    toast.info("Generating PDF...");
    try {
      const qrDataURLToUse =
        qrDataURL ||
        (await QRCode.toDataURL(window.location.origin + `/bills/${bill.id}`));
      const isSampleBill = "isSample" in bill && bill.isSample;
      const doc = (
        <BillPDF
          bill={bill}
          company={company}
          qrDataURL={qrDataURLToUse}
          isSample={isSampleBill}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Bill_${bill.billNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleShareWhatsApp = () => {
    const phone = bill.client.phone?.replace(/\D/g, "");
    if (!phone) {
      toast.error("Client phone number not available");
      return;
    }
    const billLink = `${window.location.origin}/view/bill/${bill.id}`;
    const text = encodeURIComponent(
      `Hello ${bill.client.name}, please find your bill ${bill.billNumber} here: ${billLink}`,
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

  if (!company) {
    return <div>Please setup company profile first</div>;
  }

  const gstEnabled = (company.gstEnabled ?? true) as boolean;
  const showGST = gstEnabled && bill.totalTax > 0;
  const isInterState: boolean =
    bill.gstType === "igst" ||
    (!bill.gstType && (company?.stateCode ?? "") !== bill.client.stateCode);

  const isSampleBill = "isSample" in bill && bill.isSample;

  return (
    <div className="w-full max-w-full bg-slate-50 dark:bg-slate-900 min-h-screen p-2 sm:p-4">
      <div className="mb-3 sm:mb-4 flex flex-wrap gap-2 print:hidden px-2 sm:px-0">
        <Button
          variant="outline"
          className="flex-1 sm:flex-none text-xs sm:text-sm touch-manipulation gap-2"
          onClick={handleShareWhatsApp}
        >
          <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
          Share on WhatsApp
        </Button>
        <Button
          variant="outline"
          className="flex-1 sm:flex-none text-xs sm:text-sm touch-manipulation gap-2"
          onClick={handleDownloadPDF}
        >
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Download PDF
        </Button>
        <Button
          variant="outline"
          className="flex-1 sm:flex-none text-xs sm:text-sm touch-manipulation gap-2"
          onClick={handlePrint}
        >
          <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Print
        </Button>
      </div>
      <div id="bill-print-wrapper" className="w-full">
        <div
          ref={billRef}
          id="bill-print"
          className="bg-white shadow-2xl text-black"
          style={{
            width: "210mm",
            minWidth: "210mm",
            maxWidth: "210mm",
            minHeight: "297mm",
            margin: "0 auto",
            fontFamily: "Inter, Arial, sans-serif !important",
            padding: "5mm",
            boxSizing: "border-box",
            fontSize: "10px",
            lineHeight: "1.4",
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            color: "black",
          }}
        >
          {isInternational ? (
            <div>
              {/* Export / Proforma style (matches International PDF layout) */}
              <div className="border border-black mb-3 p-2">
                <p className="text-[10px] font-bold text-center leading-snug">
                  SUPPLY MEANT FOR EXPORT UNDER BOND OR LETTER OF UNDERTAKING
                  <br />
                  WITHOUT PAYMENT OF IGST
                </p>
                <p className="text-[11px] font-bold text-center mt-1">
                  PARFORMA INVOICE
                </p>
              </div>

              {/* Exporter + Invoice + Buyer */}
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
                      <strong>Buyer's Order No. & Date:</strong> Not Applicable
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

              {/* Shipping & Export Details */}
              <p className="text-[10px] font-bold text-center mb-2">
                Shipping & Export Details
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
                    {bill.internationalDetails.placeOfReceiptByPreCarriage && (
                      <p>
                        <strong>Place Of Receipt:</strong>{" "}
                        {bill.internationalDetails.placeOfReceiptByPreCarriage}
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
                    {bill.internationalDetails.countryOfFinalDestination && (
                      <p>
                        <strong>Country Of Destination:</strong>{" "}
                        {bill.internationalDetails.countryOfFinalDestination}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Items Table */}
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
                        style={{ width: "34%" }}
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
                      <th className="p-1.5 text-right" style={{ width: "12%" }}>
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
                          {bill.internationalDetails?.grossWeight && (
                            <div className="text-[9px] text-gray-600 mt-0.5">
                              GW: {bill.internationalDetails.grossWeight} kg |
                              NW: {bill.internationalDetails.netWeight || "N/A"}{" "}
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
                        colSpan={showGST && bill.totalTax > 0 ? 6 : 5}
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
                          colSpan={showGST && bill.totalTax > 0 ? 6 : 5}
                          className="p-1.5 text-right font-bold"
                        >
                          Discount{" "}
                          {bill.discountType === "percentage"
                            ? `(${bill.discount}%)`
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
                            colSpan={showGST && bill.totalTax > 0 ? 6 : 5}
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
                        colSpan={showGST && bill.totalTax > 0 ? 6 : 5}
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

              {/* Declaration */}
              <div className="border border-black mb-3 p-2">
                <p className="font-bold text-[10px] mb-1">DECLARATION:</p>
                <p className="text-[10px] leading-relaxed">
                  THE DIAMONDS HEREIN INVOICED ARE EXCLUSIVELY OF LAB GROWN
                  DIAMOND BASED ON PERSONAL KNOWLEDGE AND/OR WRITTEN GUARANTEES
                  PROVIDED BY THE SUPPLIER OF THESE DIAMONDS.
                </p>
                <p className="text-[10px] leading-relaxed mt-1">
                  TOTAL US DOLLARS : {numberToWords(Math.round(bill.total))}
                </p>
                <p className="text-[10px] leading-relaxed mt-1">
                  WE INTEND TO CLAIM BENEFIT UNDER RoDTEP SCHEME AS APPLICABLE
                </p>
                <p className="text-[10px] leading-relaxed mt-1">
                  The diamonds herein invoiced have been purchased from
                  legitimate sources not involved in funding conflict and in
                  compliance with United Nations resolutions. The seller hereby
                  guarantees that the supplier of these diamonds is conflict
                  free, based on personal knowledge and/or written guarantees
                  provided by the supplier of these diamonds.
                </p>
              </div>

              {/* Payment + Signature */}
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
              {/* The HTML preview content remains unchanged */}
              {/* Header */}
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
                      {isInternational
                        ? "INVOICE"
                        : gstEnabled
                          ? "TAX INVOICE"
                          : "INVOICE"}
                    </h2>
                    <div className="text-[10px] space-y-0.5 text-black">
                      <p>
                        <strong>Invoice No.:</strong> {bill.billNumber}
                      </p>
                      <p>
                        <strong>Date:</strong> {formatDate(bill.date)}
                      </p>
                      {!isInternational && (
                        <p>
                          <strong>Due Date:</strong> {formatDate(bill.dueDate)}
                        </p>
                      )}
                      {bill.deliveryNote && (
                        <p>
                          <strong>Delivery Note:</strong> {bill.deliveryNote}
                        </p>
                      )}
                      {bill.modeOfPayment && (
                        <p>
                          <strong>Payment Mode:</strong> {bill.modeOfPayment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isInternational && (
                <div className="flex justify-center mb-3">
                  <h2
                    className="text-lg font-bold"
                    style={{ color: company.themeColor }}
                  >
                    EXPORT INVOICE
                  </h2>
                </div>
              )}

              {/* International Details */}
              {isInternational && bill.internationalDetails && (
                <div className="border border-black mb-3 p-2">
                  <h3
                    className="font-bold text-[10px] mb-2 border-b border-black pb-1"
                    style={{ color: company.themeColor }}
                  >
                    Shipping & Export Details
                  </h3>
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
                    {bill.internationalDetails.placeOfReceiptByPreCarriage && (
                      <p>
                        <strong>Place Of Receipt:</strong>{" "}
                        {bill.internationalDetails.placeOfReceiptByPreCarriage}
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
                    {bill.internationalDetails.finalDestination && (
                      <p>
                        <strong>Final Destination:</strong>{" "}
                        {bill.internationalDetails.finalDestination}
                      </p>
                    )}
                    {bill.internationalDetails.countryOfOrigin && (
                      <p>
                        <strong>Country Of Origin:</strong>{" "}
                        {bill.internationalDetails.countryOfOrigin}
                      </p>
                    )}
                    {bill.internationalDetails.countryOfFinalDestination && (
                      <p>
                        <strong>Country Of Destination:</strong>{" "}
                        {bill.internationalDetails.countryOfFinalDestination}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Client Details */}
              <div className="grid grid-cols-2 gap-0 mb-3">
                <div className="border border-black p-2">
                  <h3
                    className="font-bold text-[10px] mb-1 border-b border-black pb-1"
                    style={{ color: company.themeColor }}
                  >
                    {isInternational ? "Consignee" : "Consignee (Ship to)"}
                  </h3>
                  <p className="font-semibold text-[11px]">
                    {bill.client.name}
                  </p>
                  <div className="text-[10px] leading-relaxed mt-1">
                    {formatAddress(
                      bill.client.shippingAddress || bill.client.billingAddress,
                    )}
                  </div>
                  {showGST && !isInternational && (
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
                    {isInternational
                      ? "Buyer (If other than consignee)"
                      : "Buyer (Bill to)"}
                  </h3>
                  <p className="font-semibold text-[11px]">
                    {bill.client.name}
                  </p>
                  <div className="text-[10px] leading-relaxed mt-1">
                    {formatAddress(bill.client.billingAddress)}
                  </div>
                  {showGST && !isInternational && (
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
                  {bill.placeOfSupply && !isInternational && (
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
                      {showGST && !isInternational && (
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
                        style={{ width: "60px" }}
                      >
                        Rate
                      </th>
                      <th
                        className="border border-black p-1.5 text-right"
                        style={{ width: "70px" }}
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
                          {bill.internationalDetails &&
                            (bill.internationalDetails.grossWeight ||
                              bill.internationalDetails.netWeight) && (
                              <div className="text-[9px] text-gray-600 mt-1">
                                {bill.internationalDetails.grossWeight && (
                                  <span>
                                    Gross Wt:{" "}
                                    {bill.internationalDetails.grossWeight} kg
                                  </span>
                                )}
                                {bill.internationalDetails.grossWeight &&
                                  bill.internationalDetails.netWeight && (
                                    <span className="mx-1">|</span>
                                  )}
                                {bill.internationalDetails.netWeight && (
                                  <span>
                                    Net Wt:{" "}
                                    {bill.internationalDetails.netWeight} kg
                                  </span>
                                )}
                              </div>
                            )}
                        </td>
                        {showGST && (
                          <td className="border border-black p-1.5 text-center text-[9px]">
                            {item.hsnCode}
                          </td>
                        )}
                        {showGST && !isInternational && (
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
                    {/* Subtotal */}
                    <tr className="font-semibold bg-gray-100">
                      <td
                        colSpan={showGST ? (isInternational ? 6 : 7) : 5}
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
                          colSpan={showGST ? (isInternational ? 6 : 7) : 5}
                          className="border border-black p-1.5 text-right text-red-600"
                        >
                          Discount{" "}
                          {bill.discountType === "percentage"
                            ? `(${bill.discount}%)`
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
                            colSpan={showGST ? (isInternational ? 6 : 7) : 5}
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
                      !isInternational &&
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
                                  (sum, item) => sum + (item.cgst || 0),
                                  0
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
                                  (sum, item) => sum + (item.sgst || 0),
                                  0
                                ),
                              )}
                            </td>
                          </tr>
                        </>
                      ))}
                    {/* Total */}
                    <tr
                      className="font-bold"
                      style={{
                        backgroundColor: company.themeColor,
                        color: "white",
                      }}
                    >
                      <td
                        colSpan={showGST ? (isInternational ? 6 : 7) : 5}
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

              {/* Notes */}
              {(bill.notes ||
                company.defaultNote ||
                bill.createdBy ||
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
                                {payment.method} ({formatDate(payment.date)})
                              </span>
                              <span className="font-semibold">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {bill.createdBy && !bill.payments?.length && (
                      <div className="text-right">
                        <h3
                          className="font-bold text-[10px] mb-1"
                          style={{ color: company.themeColor }}
                        >
                          Created By
                        </h3>
                        <p className="text-[10px] font-semibold">
                          {bill.createdBy}
                        </p>
                      </div>
                    )}
                  </div>
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

              {/* Footer Grid */}
              <div className="grid grid-cols-2 gap-0 mt-3 border border-black">
                {/* Payment Information */}
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
                      <strong>Paid:</strong> {formatCurrency(bill.paidAmount)}
                    </p>
                  </div>
                </div>

                {/* Company Bank Details */}
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
                  <div className="mt-2 flex items-center gap-2">
                    {qrDataURL && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>

                {/* Declaration - Spans full width */}
                <div className="col-span-2 border-t border-black p-2">
                  <h3
                    className="font-bold text-[10px] mb-1 border-b border-black pb-1"
                    style={{ color: company.themeColor }}
                  >
                    Declaration
                  </h3>
                  <p className="text-[9px] mt-1 leading-relaxed">
                    {isInternational
                      ? "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. We intend to claim benefit under RoDTEP scheme as applicable."
                      : "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-0 border border-black border-t-0">
                <div className="p-3 border-r border-black">
                  <p className="text-[10px] font-bold mb-1">
                    Customer's Seal and Signature
                  </p>
                  <div className="h-12 border-b border-dashed border-gray-400"></div>
                  <p className="text-[9px] text-center mt-1 text-gray-600">
                    {bill.client.name}
                  </p>
                </div>
                <div className="p-3 text-right">
                  <p className="text-[10px] font-bold mb-1">
                    for {company.name}
                  </p>
                  <div className="h-12"></div>
                  <p className="text-[9px] border-t border-black pt-1 inline-block">
                    Authorised Signatory
                  </p>
                </div>
              </div>

              <p className="text-[9px] text-center mt-2 text-gray-500">
                This is a Computer Generated{" "}
                {isInternational ? "INVOICE" : "Invoice"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
