import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bill } from '@/types';
import { formatCurrency, formatDate, numberToWords, formatToTwoDecimals } from '@/lib/billUtils';
import { getCompanyProfile, getBills } from '@/lib/storage';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { QRCodeSVG } from 'qrcode.react';

export default function BillViewPublic() {
const { id } = useParams();
const [bill, setBill] = useState<Bill | null>(null);
const [loading, setLoading] = useState(true);

const [company, setCompany] = useState<any>(null);

useEffect(() => {
const loadData = async () => {
if (id) {
const [billsData, companyData] = await Promise.all([
getBills(),
getCompanyProfile(),
]);
const foundBill = billsData.find((b) => b.id === id);
setBill(foundBill || null);
setCompany(companyData);
setLoading(false);
}
  };
loadData();
}, [id]);

useEffect(() => {
const style = document.createElement('style');
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
overflow-x: auto;
-webkit-overflow-scrolling: touch;
display: flex;
justify-content: center;
padding: 10px;
}
#bill-print {
transform: scale(0.75);
transform-origin: top center;
margin-bottom: 20px;
}
}
@media screen and (max-width: 480px) {
#bill-print {
transform: scale(0.6);
}
}
`;
document.head.appendChild(style);
return () => {
if (document.head.contains(style)) {
document.head.removeChild(style);
}
  };
}, []);

if (loading) {
return (
<div className="min-h-screen bg-gray-100">
<LoadingSpinner size="xl" text="Loading bill..." fullScreen />
</div>
);
}

if (!bill || !company) {
return (
<div className="min-h-screen flex items-center justify-center bg-gray-100">
<div className="text-center">
<h1 className="text-2xl font-bold text-gray-800 mb-2">Bill Not Found</h1>
<p className="text-gray-600">The requested bill could not be found.</p>
</div>
</div>
);
}

  const gstEnabled = (company.gstEnabled ?? true) as boolean;
  const showGST = gstEnabled && bill.totalTax > 0;
  const isInterState = bill.gstType === 'igst' || (!bill.gstType && (company.stateCode ?? "") !== bill.client.stateCode);
  const isInternational = bill.billType === 'international';

  Generate QR data with public view URL
const qrData = `${window.location.origin}/view/bill/${bill.id}`;

  Helper function to format address properly
  const formatAddress = (address: string) => {
return address.split(',').map((line, i, arr) => (
      <span key={i}>
        {line.trim()}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  };

return (
<div className="w-full max-w-full">
<div id="bill-print-wrapper" className="w-full">
<div
id="bill-print"
className="bg-white text-black shadow-lg mx-auto"
style={{
width: '210mm',
maxWidth: '210mm',
minHeight: '297mm',
margin: '0 auto',
fontFamily: 'Arial, sans-serif',
padding: '4mm',
boxSizing: 'border-box',
fontSize: '10px',
}}
>
{/* Header */}
<div className="border-2 border-black mb-2 sm:mb-3">
<div className="flex flex-row justify-between items-start gap-3 p-3">
<div className="flex-1">
<div className="flex items-center gap-2 mb-1">
{company.logo && (
<img src={company.logo} alt={company.name} className="h-7 w-7 object-contain flex-shrink-0" />
)}
<h1 className="text-base font-bold break-words" style={{ color: company.themeColor }}>
{company.name}
</h1>
</div>
<div className="text-[10px] leading-relaxed mt-1 break-words">
{company.address.split(',').map((line, i) => (
      <span key={i}>
        {line.trim()}
{i < company.address.split(',').length - 1 && <br />}
      </span>
))}
</div>
{showGST && (
<div className="text-[10px] mt-1 break-words">
<p><strong>GSTIN/UIN:</strong> {company.gstin}</p>
<p><strong>State:</strong> {company.state}, <strong>Code:</strong> {company.stateCode}</p>
</div>
)}
<div className="text-[10px] mt-1 break-words">
<p><strong>Phone:</strong> {company.phone}</p>
<p><strong>Email:</strong> {company.email}</p>
</div>
</div>
<div className="text-right flex-shrink-0">
<h2 className="text-lg font-bold mb-2 break-words" style={{ color: company.themeColor }}>
{showGST ? 'TAX INVOICE' : 'INVOICE'}
</h2>
<div className="text-[10px] space-y-0.5 break-words">
<p><strong>Invoice Number:</strong> {bill.billNumber}</p>
<p><strong>Date:</strong> {formatDate(bill.date)}</p>
<p><strong>Due Date:</strong> {formatDate(bill.dueDate)}</p>
{bill.deliveryNote && <p><strong>Delivery Note:</strong> {bill.deliveryNote}</p>}
{bill.modeOfPayment && <p><strong>Payment Mode:</strong> {bill.modeOfPayment}</p>}
</div>
</div>
</div>
</div>

{/* Client Details - Billing and Shipping */}
<div className="grid grid-cols-2 gap-0 mb-3">
<div className="border border-black p-2">
<h3 className="font-bold text-[10px] mb-1 border-b border-black pb-1 break-words" style={{ color: company.themeColor }}>
Consignee (Ship to)
</h3>
<p className="font-semibold text-[11px] break-words">{bill.client.name}</p>
<div className="text-[10px] leading-relaxed mt-1 break-words">
{formatAddress(bill.client.shippingAddress || bill.client.billingAddress)}
</div>
{showGST && (
<div className="text-[10px] mt-1 break-words">
<p><strong>GSTIN/UIN:</strong> {bill.client.gstin}</p>
<p><strong>State:</strong> {bill.client.state}, <strong>Code:</strong> {bill.client.stateCode}</p>
</div>
)}
{bill.client.phone && <p className="text-[10px] break-words"><strong>Phone:</strong> {bill.client.phone}</p>}
</div>
<div className="border border-black border-l-0 p-2">
<h3 className="font-bold text-[10px] mb-1 border-b border-black pb-1 break-words" style={{ color: company.themeColor }}>
Buyer (Bill to)
</h3>
<p className="font-semibold text-[11px] break-words">{bill.client.name}</p>
<div className="text-[10px] leading-relaxed mt-1 break-words">
{formatAddress(bill.client.billingAddress)}
</div>
{showGST && (
<div className="text-[10px] mt-1 break-words">
<p><strong>GSTIN/UIN:</strong> {bill.client.gstin}</p>
<p><strong>State:</strong> {bill.client.state}, <strong>Code:</strong> {bill.client.stateCode}</p>
</div>
)}
{bill.placeOfSupply && <p className="text-[10px] mt-1 break-words"><strong>Place of Supply:</strong> {bill.placeOfSupply}</p>}
</div>
</div>

{/* Items Table */}
<div className="overflow-x-auto mb-3">
<table className="w-full border-collapse text-[10px]">
<thead>
<tr style={{ backgroundColor: company.themeColor, color: 'white' }}>
<th className="border border-black p-1.5 text-center" style={{ width: '30px' }}>Sl</th>
<th className="border border-black p-1.5 text-left">Description of Goods</th>
{showGST && <th className="border border-black p-1.5 text-center" style={{ width: '60px' }}>HSN/SAC</th>}
{showGST && <th className="border border-black p-1.5 text-center" style={{ width: '40px' }}>GST%</th>}
<th className="border border-black p-1.5 text-center" style={{ width: '50px' }}>Qty</th>
<th className="border border-black p-1.5 text-center" style={{ width: '45px' }}>Unit</th>
<th className="border border-black p-1.5 text-center" style={{ width: '60px' }}>Rate</th>
<th className="border border-black p-1.5 text-right" style={{ width: '70px' }}>Amount</th>
</tr>
</thead>
<tbody>
{bill.items.map((item, index) => (
<tr key={`item-${index}`} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
<td className="border border-black p-1.5 text-center">{index + 1}</td>
<td className="border border-black p-1.5 break-words">{item.productName}</td>
{showGST && <td className="border border-black p-1.5 text-center text-[9px]">{item.hsnCode}</td>}
{showGST && <td className="border border-black p-1.5 text-center">{item.gstRate}%</td>}
<td className="border border-black p-1.5 text-center">{item.quantity}</td>
<td className="border border-black p-1.5 text-center">{item.unit}</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(item.ratePerUnit)}</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(item.amount)}</td>
</tr>
))}
{/* Subtotal Row */}
<tr className="font-semibold bg-gray-100">
<td colSpan={showGST ? 7 : 5} className="border border-black p-1.5 text-right">
Subtotal
</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(bill.subtotal)}</td>
</tr>
{/* Tax Rows */}
{showGST && (
isInterState ? (
<tr>
<td colSpan={7} className="border border-black p-1.5 text-right">
IGST
</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(bill.totalTax)}</td>
</tr>
) : (
<>
<tr>
<td colSpan={7} className="border border-black p-1.5 text-right">
CGST
</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">
{formatCurrency(bill.items.reduce((sum, item) => sum + item.cgst, 0))}
</td>
</tr>
<tr>
<td colSpan={7} className="border border-black p-1.5 text-right">
SGST
</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">
{formatCurrency(bill.items.reduce((sum, item) => sum + item.sgst, 0))}
</td>
</tr>
</>
)
)}
{/* Discount Row */}
{(bill.discount !== undefined && bill.discount > 0) && (
<tr>
<td colSpan={showGST ? 7 : 5} className="border border-black p-1.5 text-right text-red-600">
Discount {bill.discountType === 'percentage' ? `(${bill.discount}%)` : ''}
</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap text-red-600">
-{formatCurrency(bill.discount)}
</td>
</tr>
)}
{/* Other Charges Row */}
{(bill.otherCharges !== undefined && bill.otherCharges > 0) && (
<tr>
<td colSpan={showGST ? 7 : 5} className="border border-black p-1.5 text-right">
Other Charges (Freight, Packaging, etc.)
</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">
{formatCurrency(bill.otherCharges)}
</td>
</tr>
)}
{/* Round Off Row */}
{(bill.roundOff !== undefined && bill.roundOff !== 0) && (
<tr>
<td colSpan={showGST ? 7 : 5} className="border border-black p-1.5 text-right">
Round Off
</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">
{bill.roundOff >= 0 ? '+' : ''}{formatToTwoDecimals(bill.roundOff)}
</td>
</tr>
)}
{/* Grand Total Row */}
<tr className="font-bold" style={{ backgroundColor: company.themeColor, color: 'white' }}>
<td colSpan={showGST ? 7 : 5} className="border border-black p-1.5 text-right">
Grand Total
</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(bill.total)}</td>
</tr>
</tbody>
</table>
</div>

{/* Amount in Words - Single Line */}
<div className="border border-black p-2.5 mb-3 bg-gray-50">
<p className="text-[10px] break-words">
<strong>Amount Chargeable (in words):</strong>{' '}
<span className="font-semibold">INR {numberToWords(bill.total)}      </span>
</p>
</div>

{/* Tax Summary - Only show if GST enabled */}
{showGST && (
<div className="overflow-x-auto mb-3">
<table className="w-full border-collapse text-[10px]">
<thead>
<tr style={{ backgroundColor: company.themeColor, color: 'white' }}>
<th className="border border-black p-1.5 text-center">HSN/SAC</th>
<th className="border border-black p-1.5 text-right">Taxable Value</th>
{isInterState ? (
<>
<th className="border border-black p-1.5 text-center">IGST Rate</th>
<th className="border border-black p-1.5 text-right">IGST Amt</th>
</>
) : (
<>
<th className="border border-black p-1.5 text-center">CGST Rate</th>
<th className="border border-black p-1.5 text-right">CGST Amt</th>
<th className="border border-black p-1.5 text-center">SGST Rate</th>
<th className="border border-black p-1.5 text-right">SGST Amt</th>
</>
)}
<th className="border border-black p-1.5 text-right">Total Tax</th>
</tr>
</thead>
<tbody>
{bill.items.map((item, index) => (
<tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
<td className="border border-black p-1.5 text-center text-[9px]">{item.hsnCode}</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(item.amount)}</td>
{isInterState ? (
<>
<td className="border border-black p-1.5 text-center">{formatToTwoDecimals(item.gstRate)}%</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">
{formatCurrency(item.igst || item.cgst + item.sgst)}
</td>
</>
) : (
<>
<td className="border border-black p-1.5 text-center">{formatToTwoDecimals(item.gstRate / 2)}%</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(item.cgst)}</td>
<td className="border border-black p-1.5 text-center">{formatToTwoDecimals(item.gstRate / 2)}%</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(item.sgst)}</td>
</>
)}
<td className="border border-black p-1.5 text-right whitespace-nowrap">
{formatCurrency((item.igst || 0) + item.cgst + item.sgst)}
</td>
</tr>
))}
<tr className="font-bold bg-gray-100">
<td className="border border-black p-1.5 text-center">Total</td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(bill.subtotal)}</td>
{isInterState ? (
<>
<td className="border border-black p-1.5"></td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(bill.totalTax)}</td>
</>
) : (
<>
<td className="border border-black p-1.5"></td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">
{formatCurrency(bill.items.reduce((sum, item) => sum + item.cgst, 0))}
</td>
<td className="border border-black p-1.5"></td>
<td className="border border-black p-1.5 text-right whitespace-nowrap">
{formatCurrency(bill.items.reduce((sum, item) => sum + item.sgst, 0))}
</td>
</>
)}
<td className="border border-black p-1.5 text-right whitespace-nowrap">{formatCurrency(bill.totalTax)}</td>
</tr>
</tbody>
</table>
</div>
)}

{/* Notes Section */}
{(bill.notes || company.defaultNote) && (
<div className="border border-black p-2.5 mb-3">
<h3 className="font-bold text-[10px] mb-1 break-words" style={{ color: company.themeColor }}>Notes / Terms</h3>
<p className="text-[10px] whitespace-pre-wrap break-words">{bill.notes || company.defaultNote}</p>
</div>
)}

{/* Return History */}
{bill.returnComment && (
<div className="border border-black p-2 mb-3">
<h3 className="font-bold text-[10px] mb-1" style={{ color: company.themeColor }}>Return History</h3>
<p className="text-[10px] whitespace-pre-wrap">{bill.returnComment}</p>
</div>
)}

{/* Footer - Bank Details and Declaration */}
<div className="grid grid-cols-2 gap-0 mt-3">
<div className="border border-black p-2">
<h3 className="font-bold text-[10px] mb-1 border-b border-black pb-1 break-words" style={{ color: company.themeColor }}>
Company Bank Details
</h3>
<div className="text-[10px] space-y-0.5 mt-1 break-words">
<p><strong>A/c Holder:</strong> {company.bankDetails.accountHolder}</p>
<p><strong>Bank Name:</strong> {company.bankDetails.bankName}</p>
<p><strong>A/c Number:</strong> {company.bankDetails.accountNumber}</p>
<p><strong>Branch & IFSC:</strong> {company.bankDetails.branchAndIFSC}</p>
</div>
<div className="mt-2 flex items-center gap-2">
<QRCodeSVG value={qrData} size={50} className="flex-shrink-0" />
<p className="text-[9px] text-gray-600 break-words">Scan to view<br />bill online</p>
</div>
</div>
<div className="border border-black border-l-0 p-2 flex flex-col justify-between">
<div>
<h3 className="font-bold text-[10px] mb-1 border-b border-black pb-1 break-words" style={{ color: company.themeColor }}>
Declaration
</h3>
<p className="text-[9px] mt-1 leading-relaxed break-words">
We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
</p>
</div>
</div>
</div>

{/* Dual Signatory Section */}
<div className="grid grid-cols-2 gap-0 border border-black border-t-0">
<div className="p-3 border-r border-black">
<p className="text-[10px] font-bold mb-1 break-words">Customer's Seal and Signature</p>
<div className="h-12 border-b border-dashed border-gray-400"></div>
<p className="text-[9px] text-center mt-1 text-gray-600 break-words">{bill.client.name}</p>
</div>
<div className="p-3 text-right">
<p className="text-[10px] font-bold mb-1 break-words">for {company.name}</p>
<div className="h-12"></div>
<p className="text-[9px] border-t border-black pt-1 inline-block break-words">Authorised Signatory</p>
</div>
</div>

<p className="text-[9px] text-center mt-2 text-gray-500 break-words">
This is a Computer Generated Invoice
</p>
</div>
</div>
</div>
);
}


import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bill } from "@/types";
import {
  formatCurrency,
  formatDate,
  numberToWords,
  formatToTwoDecimals,
} from "@/lib/billUtils";
import { getCompanyProfile, getBills } from "@/lib/storage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { QRCodeSVG } from "qrcode.react";

export default function BillViewPublic() {
  const { id } = useParams();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        const [billsData, companyData] = await Promise.all([
          getBills(),
          getCompanyProfile(),
        ]);
        const foundBill = billsData.find((b) => b.id === id);
        setBill(foundBill || null);
        setCompany(companyData);
        setLoading(false);
      }
      };
    loadData();
  }, [id]);

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
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          display: flex;
          justify-content: center;
          padding: 10px;
        }
        #bill-print {
          transform: scale(0.75);
          transform-origin: top center;
          margin-bottom: 20px;
        }
      }
      @media screen and (max-width: 480px) {
        #bill-print {
          transform: scale(0.6);
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
      };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <LoadingSpinner size="xl" text="Loading bill..." fullScreen />
      </div>
    );
  }

  if (!bill || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Bill Not Found
          </h1>
          <p className="text-gray-600">
            The requested bill could not be found.
          </p>
        </div>
      </div>
    );
  }

  const gstEnabled = (company.gstEnabled ?? true) as boolean;
  const showGST = gstEnabled && bill.totalTax > 0;
  const isInterState =
    bill.gstType === "igst" ||
    (!bill.gstType && company.stateCode !== bill.client.stateCode);
  const isInternational = bill.billType === "international";

  const qrData = `${window.location.origin}/view/bill/${bill.id}`;

    const formatAddress = (address: string) => {
    return address.split(",").map((line, i, arr) => (
            <span key={i}>
                {line.trim()}
                {i < arr.length - 1 && <br />}
            </span>
        ));
    };

  return (
    <div className="w-full max-w-full">
      <div id="bill-print-wrapper" className="w-full">
        <div
          id="bill-print"
          className="bg-white text-black shadow-lg mx-auto"
          style={{
            width: "210mm",
            maxWidth: "210mm",
            minHeight: "297mm",
            margin: "0 auto",
            fontFamily: "Arial, sans-serif",
            padding: "4mm",
            boxSizing: "border-box",
            fontSize: "10px",
          }}
        >
          {/* Header */}
          <div className="border-2 border-black mb-2 sm:mb-3">
            <div className="flex flex-row justify-between items-start gap-3 p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {company.logo && (
                    <img
                      src={company.logo}
                      alt={company.name}
                      className="h-7 w-7 object-contain flex-shrink-0"
                    />
                  )}
                  <h1
                    className="text-base font-bold break-words"
                    style={{ color: company.themeColor }}
                  >
                    {company.name}
                  </h1>
                </div>
                <div className="text-[10px] leading-relaxed mt-1 break-words">
                  {company.address.split(",").map((line, i) => (
                          <span key={i}>
                              {line.trim()}
                      {i < company.address.split(",").length - 1 && <br />}
                          </span>
                  ))}
                </div>
                {showGST && (
                  <div className="text-[10px] mt-1 break-words">
                    <p>
                      <strong>GSTIN/UIN:</strong> {company.gstin}
                    </p>
                    <p>
                      <strong>State:</strong> {company.state},{" "}
                      <strong>Code:</strong> {company.stateCode}
                    </p>
                  </div>
                )}
                <div className="text-[10px] mt-1 break-words">
                  <p>
                    <strong>Phone:</strong> {company.phone}
                  </p>
                  <p>
                    <strong>Email:</strong> {company.email}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <h2
                  className="text-lg font-bold mb-2 break-words"
                  style={{ color: company.themeColor }}
                >
                  {isInternational
                    ? "PROFORMA INVOICE"
                    : gstEnabled
                    ? "TAX INVOICE"
                    : "INVOICE"}
                </h2>
                <div className="text-[10px] space-y-0.5 break-words">
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

          {/* International Shipping Details - Only for international bills */}
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
                {bill.internationalDetails.grossWeight && (
                  <p>
                    <strong>Gross Weight:</strong>{" "}
                    {bill.internationalDetails.grossWeight} kg
                  </p>
                )}
                {bill.internationalDetails.netWeight && (
                  <p>
                    <strong>Net Weight:</strong>{" "}
                    {bill.internationalDetails.netWeight} kg
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

          {/* Client Details - Billing and Shipping */}
          <div className="grid grid-cols-2 gap-0 mb-3">
            <div className="border border-black p-2">
              <h3
                className="font-bold text-[10px] mb-1 border-b border-black pb-1 break-words"
                style={{ color: company.themeColor }}
              >
                {isInternational ? "Consignee" : "Consignee (Ship to)"}
              </h3>
              <p className="font-semibold text-[11px] break-words">
                {bill.client.name}
              </p>
              <div className="text-[10px] leading-relaxed mt-1 break-words">
                {formatAddress(
                  bill.client.shippingAddress || bill.client.billingAddress
                )}
              </div>
              {showGST && (
                <div className="text-[10px] mt-1 break-words">
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
                <p className="text-[10px] break-words">
                  <strong>Phone:</strong> {bill.client.phone}
                </p>
              )}
            </div>
            <div className="border border-black border-l-0 p-2">
              <h3
                className="font-bold text-[10px] mb-1 border-b border-black pb-1 break-words"
                style={{ color: company.themeColor }}
              >
                {isInternational
                  ? "Buyer (If other than consignee)"
                  : "Buyer (Bill to)"}
              </h3>
              <p className="font-semibold text-[11px] break-words">
                {bill.client.name}
              </p>
              <div className="text-[10px] leading-relaxed mt-1 break-words">
                {formatAddress(bill.client.billingAddress)}
              </div>
              {showGST && (
                <div className="text-[10px] mt-1 break-words">
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
                <p className="text-[10px] mt-1 break-words">
                  <strong>Place of Supply:</strong> {bill.placeOfSupply}
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-3">
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
                  {showGST && !isInternational && bill.totalTax > 0 && (
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
                    key={`item-${index}`}
                    className={index % 2 === 0 ? "bg-gray-50" : ""}
                  >
                    <td className="border border-black p-1.5 text-center">
                      {index + 1}
                    </td>
                    <td className="border border-black p-1.5 break-words">
                      {item.productName}
                    </td>
                    {showGST && (
                      <td className="border border-black p-1.5 text-center text-[9px]">
                        {item.hsnCode}
                      </td>
                    )}
                    {showGST && !isInternational && bill.totalTax > 0 && (
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
                    <td className="border border-black p-1.5 text-right whitespace-nowrap">
                      {formatCurrency(item.ratePerUnit)}
                    </td>
                    <td className="border border-black p-1.5 text-right whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
                {/* Subtotal Row */}
                <tr className="font-semibold bg-gray-100">
                  <td
                    colSpan={showGST && bill.totalTax > 0 ? (isInternational ? 6 : 7) : 5}
                    className="border border-black p-1.5 text-right"
                  >
                    Subtotal
                  </td>
                  <td className="border border-black p-1.5 text-right whitespace-nowrap">
                    {formatCurrency(bill.subtotal)}
                  </td>
                </tr>
                {/* Tax Rows - Only for domestic GST-enabled bills */}
                {showGST &&
                  !isInternational &&
                  (isInterState ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="border border-black p-1.5 text-right"
                      >
                        IGST
                      </td>
                      <td className="border border-black p-1.5 text-right whitespace-nowrap">
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
                        <td className="border border-black p-1.5 text-right whitespace-nowrap">
                          {formatCurrency(
                            bill.items.reduce((sum, item) => sum + item.cgst, 0)
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
                        <td className="border border-black p-1.5 text-right whitespace-nowrap">
                          {formatCurrency(
                            bill.items.reduce((sum, item) => sum + item.sgst, 0)
                          )}
                        </td>
                      </tr>
                    </>
                  ))}
                {/* Discount Row */}
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
                    <td className="border border-black p-1.5 text-right whitespace-nowrap text-red-600">
                      -{formatCurrency(bill.discount)}
                    </td>
                  </tr>
                )}
                {/* Other Charges Row */}
                {bill.otherCharges !== undefined && bill.otherCharges > 0 && (
                  <tr>
                    <td
                      colSpan={showGST ? (isInternational ? 6 : 7) : 5}
                      className="border border-black p-1.5 text-right"
                    >
                      {isInternational
                        ? "Shipping Charge"
                        : "Other Charges (Freight, Packaging, etc.)"}
                    </td>
                    <td className="border border-black p-1.5 text-right whitespace-nowrap">
                      {formatCurrency(bill.otherCharges)}
                    </td>
                  </tr>
                )}
                {/* Round Off Row */}
                {bill.roundOff !== undefined && bill.roundOff !== 0 && (
                  <tr>
                    <td
                      colSpan={showGST ? (isInternational ? 6 : 7) : 5}
                      className="border border-black p-1.5 text-right"
                    >
                      Round Off
                    </td>
                    <td className="border border-black p-1.5 text-right whitespace-nowrap">
                      {bill.roundOff >= 0 ? "+" : ""}
                      {formatToTwoDecimals(bill.roundOff)}
                    </td>
                  </tr>
                )}
                {/* Grand Total Row */}
                <tr
                  className="font-bold"
                  style={{
                    backgroundColor: company.themeColor,
                    color: "white",
                  }}
                >
                  <td
                    colSpan={showGST && bill.totalTax > 0 ? (isInternational ? 6 : 7) : 5}
                    className="border border-black p-1.5 text-right"
                  >
                    {isInternational ? "Total C&F" : "Grand Total"}
                  </td>
                  <td className="border border-black p-1.5 text-right whitespace-nowrap">
                    {formatCurrency(bill.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="border border-black p-2.5 mb-3 bg-gray-50">
            <p className="text-[10px] break-words">
              <strong>Amount Chargeable (in words):</strong>{" "}
              <span className="font-semibold">
                {isInternational ? "US DOLLARS" : "INR"}{" "}
                {numberToWords(bill.total)}
                    </span>
            </p>
          </div>

          {/* Tax Summary - Only show for domestic GST-enabled bills */}
          {showGST && !isInternational && (
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
                            {formatCurrency(item.igst || item.cgst + item.sgst)}
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
                          (item.igst || 0) + item.cgst + item.sgst
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
                        <td className="border border-black p-1.5"></td>
                        <td className="border border-black p-1.5 text-right whitespace-nowrap">
                          {formatCurrency(bill.totalTax)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border border-black p-1.5"></td>
                        <td className="border border-black p-1.5 text-right whitespace-nowrap">
                          {formatCurrency(
                            bill.items.reduce((sum, item) => sum + item.cgst, 0)
                          )}
                        </td>
                        <td className="border border-black p-1.5"></td>
                        <td className="border border-black p-1.5 text-right whitespace-nowrap">
                          {formatCurrency(
                            bill.items.reduce((sum, item) => sum + item.sgst, 0)
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

          {/* Notes Section */}
          {(bill.notes || company.defaultNote) && (
            <div className="border border-black p-2.5 mb-3">
              <h3
                className="font-bold text-[10px] mb-1 break-words"
                style={{ color: company.themeColor }}
              >
                Notes / Terms
              </h3>
              <p className="text-[10px] whitespace-pre-wrap break-words">
                {bill.notes || company.defaultNote}
              </p>
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

          {/* Footer - Bank Details and Declaration */}
          <div className="grid grid-cols-2 gap-0 mt-3">
            <div className="border border-black p-2">
              <h3
                className="font-bold text-[10px] mb-1 border-b border-black pb-1 break-words"
                style={{ color: company.themeColor }}
              >
                Company Bank Details
              </h3>
              <div className="text-[10px] space-y-0.5 mt-1 break-words">
                <p>
                  <strong>A/c Holder:</strong>{" "}
                  {bill.bankAccount?.accountHolder || company.bankDetails?.accountHolder || "N.A."}
                </p>
                <p>
                  <strong>Bank Name:</strong> {bill.bankAccount?.bankName || company.bankDetails?.bankName || "N.A."}
                </p>
                <p>
                  <strong>A/c Number:</strong>{" "}
                  {bill.bankAccount?.accountNumber || company.bankDetails?.accountNumber || "N.A."}
                </p>
                <p>
                  <strong>Branch & IFSC:</strong>{" "}
                  {bill.bankAccount?.branchAndIFSC || company.bankDetails?.branchAndIFSC || "N.A."}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {(bill.bankAccount?.upiId || company?.upiId) ? (
                  <>
                    <QRCodeSVG
                      value={
                        `upi:pay?pa=${encodeURIComponent(
                          String(bill.bankAccount?.upiId || company.upiId).trim()
                        )}` +
                        `&pn=${encodeURIComponent(company?.name || "")}` +
                        `&am=${encodeURIComponent(
                          Number(bill.total || 0).toFixed(2)
                        )}` +
                        `&cu=INR` +
                        `&tn=${encodeURIComponent(`Invoice ${bill.billNumber}`)}`
                      }
                      size={50}
                      className="flex-shrink-0"
                    />
                    <p className="text-[9px] text-gray-600 break-words">
                      Scan & Pay
                      <br />
                      (UPI)
                    </p>
                  </>
                ) : (
                  <p className="text-[9px] text-gray-600 break-words">
                    UPI ID not set
                  </p>
                )}
              </div>
            </div>
            <div className="border border-black border-l-0 p-2 flex flex-col justify-between">
              <div>
                <h3
                  className="font-bold text-[10px] mb-1 border-b border-black pb-1 break-words"
                  style={{ color: company.themeColor }}
                >
                  Declaration
                </h3>
                <p className="text-[9px] mt-1 leading-relaxed break-words">
                  {isInternational
                    ? "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. We intend to claim benefit under RoDTEP scheme as applicable."
                    : "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
                </p>
              </div>
            </div>
          </div>

          {/* Dual Signatory Section */}
          <div className="grid grid-cols-2 gap-0 border border-black border-t-0">
            <div className="p-3 border-r border-black">
              <p className="text-[10px] font-bold mb-1 break-words">
                Customer's Seal and Signature
              </p>
              <div className="h-12 border-b border-dashed border-gray-400"></div>
              <p className="text-[9px] text-center mt-1 text-gray-600 break-words">
                {bill.client.name}
              </p>
            </div>
            <div className="p-3 text-right">
              <p className="text-[10px] font-bold mb-1 break-words">
                for {company.name}
              </p>
              <div className="h-12"></div>
              <p className="text-[9px] border-t border-black pt-1 inline-block break-words">
                Authorised Signatory
              </p>
            </div>
          </div>

          <p className="text-[9px] text-center mt-2 text-gray-500 break-words">
            This is a Computer Generated{" "}
            {isInternational ? "Proforma Invoice" : "Invoice"}
          </p>
        </div>
      </div>
    </div>
  );
}
