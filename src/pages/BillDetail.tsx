import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBills, getCompanyProfile } from '@/lib/storage';
import { Bill, EWayBillDetails } from '@/types';
import { BillView, BillPDF } from '@/components/BillView';
import { EWayBillPDF } from '@/components/EWayBillPDF';
import { EWayBillDialog } from '@/components/EWayBillDialog';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/firebase';
import { ArrowLeft, Edit, Download, Share2, Loader2, Truck } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { getDownloadURL, ref } from 'firebase/storage';
import QRCode from "qrcode";
import { toast } from 'sonner';

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [generating, setGenerating] = useState(false);
  const [ewayDialogOpen, setEwayDialogOpen] = useState(false);

  useEffect(() => {
    const loadBill = async () => {
      if (id) {
        const bills = await getBills();
        const foundBill = bills.find((b) => b.id === id);
        if (foundBill) {
          setBill(foundBill);
        } else {
          navigate('/bills');
        }
      }
    };
    loadBill();
  }, [id, navigate]);

  const handleGenerateEWayBill = async (details: EWayBillDetails) => {
    if (!bill) return;
    try {
      setGenerating(true);
      setEwayDialogOpen(false);
      const company = await getCompanyProfile();

      const blob = await pdf(
        <EWayBillPDF 
          bill={bill} 
          company={company} 
          ewayDetails={details} 
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EWayBill-${bill.billNumber}.pdf`;
      link.click();
      toast.success('Official E-Way Bill (Form GST EWB-01) generated');
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating E-Way Bill:', error);
      toast.error('Failed to generate E-Way Bill');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateEBill = async (action: 'download' | 'share') => {
    if (!bill) return;
    try {
      setGenerating(true);
      const company = await getCompanyProfile();

      const resolveSignatureForPdf = async (signature?: string): Promise<string | null> => {
        if (!signature) return null;
        let signatureUrl = signature.trim();
        if (!signatureUrl) return null;
        if (signatureUrl.startsWith("data:")) return signatureUrl;
        if (!/^https?:\/\//i.test(signatureUrl)) {
          try {
            signatureUrl = await getDownloadURL(ref(storage, signatureUrl));
          } catch {
            return null;
          }
        }
        try {
          const response = await fetch(signatureUrl, { mode: "cors" });
          if (!response.ok) return signatureUrl;
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Failed to read signature"));
            reader.readAsDataURL(blob);
          });
          return dataUrl || signatureUrl;
        } catch {
          return signatureUrl;
        }
      };

      let qrDataURL = "";
      const upiId = (bill.bankAccount?.upiId || company.upiId || "").trim();
      if (upiId) {
        const amount = Number(bill.total || 0).toFixed(2);
        const upiLink =
          `upi://pay?pa=${encodeURIComponent(upiId)}` +
          `&pn=${encodeURIComponent(company.name || "")}` +
          `&am=${encodeURIComponent(amount)}` +
          `&cu=INR` +
          `&tn=${encodeURIComponent(`${bill.billType === "international" ? "Proforma" : ""} Invoice ${bill.billNumber}`)}`;
        qrDataURL = await QRCode.toDataURL(upiLink, { width: 220, margin: 1 });
      }

      const signatureForPdf = await resolveSignatureForPdf(company?.signature);
      const companyForPdf = signatureForPdf ? { ...company, signature: signatureForPdf } : company;

      const blob = await pdf(
        <BillPDF 
          bill={bill} 
          company={companyForPdf} 
          qrDataURL={qrDataURL} 
        />
      ).toBlob();
      
      const file = new File([blob], `${bill.billNumber}.pdf`, { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      if (action === 'download') {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${bill.billNumber}.pdf`;
        link.click();
        toast.success('E-bill downloaded successfully');
      } else if (action === 'share') {
        if (navigator.share) {
          await navigator.share({
            title: `Bill ${bill.billNumber}`,
            text: `Please find the e-bill for ${bill.billNumber}`,
            files: [file]
          });
        } else {
          const phone = bill.client.phone?.replace(/\D/g, "");
          const billLink = `${window.location.origin}/view/bill/${bill.id}`;
          const text = encodeURIComponent(`Hello ${bill.client.name}, please find your bill ${bill.billNumber} here: ${billLink}`);
          window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
        }
      }
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating E-bill:', error);
      toast.error('Failed to generate E-bill');
    } finally {
      setGenerating(false);
    }
  };

  if (!bill) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden">
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-background p-2 shadow-sm print:hidden sm:p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/bills')} className="h-10 shrink-0 rounded-lg bg-background px-3">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold leading-tight sm:text-3xl">{bill.billNumber}</h1>
              <p className="text-sm text-muted-foreground">Bill details and actions</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 rounded-lg border border-border/60 bg-muted/20 p-1.5 lg:w-auto lg:justify-end">
            <Button variant="outline" onClick={() => setEwayDialogOpen(true)} disabled={generating} className="h-10 rounded-lg text-blue-600 border-blue-200 bg-background">
              <Truck className="h-4 w-4 mr-2" />
              E-Way Bill
            </Button>
            <Button variant="outline" onClick={() => handleGenerateEBill('download')} disabled={generating} className="h-10 rounded-lg bg-background">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              E-Bill
            </Button>
            <Button variant="outline" onClick={() => handleGenerateEBill('share')} disabled={generating} className="h-10 w-10 rounded-lg p-0 bg-background">
              <Share2 className="h-4 w-4" />
            </Button>
            <Link to={`/bills/${bill.id}/edit`}>
              <Button className="h-10 rounded-lg">
                <Edit className="h-4 w-4 mr-2" />
                Edit Bill
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-2xl border border-border/70 bg-background/60 p-2 sm:p-3">
        <div className="h-full overflow-y-auto pr-1 sm:pr-2">
          <BillView bill={bill} />
        </div>
      </div>
      
      <EWayBillDialog 
        open={ewayDialogOpen}
        onOpenChange={setEwayDialogOpen}
        onGenerate={handleGenerateEWayBill}
      />
    </div>
  );
}
