import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBills, getCompanyProfile } from '@/lib/storage';
import { Bill } from '@/types';
import { BillView, BillPDF } from '@/components/BillView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Download, Share2, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import QRCode from "qrcode";
import { toast } from 'sonner';

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [generating, setGenerating] = useState(false);

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

  const handleGenerateEBill = async (action: 'download' | 'share') => {
    if (!bill) return;
    try {
      setGenerating(true);
      const company = await getCompanyProfile();
      
      let qrDataURL = "";
      const upiId = bill.bankAccount?.upiId || company.upiId;
      if (upiId) {
        const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(company.name)}&am=${bill.total}&cu=INR`;
        qrDataURL = await QRCode.toDataURL(upiLink);
      }

      const blob = await pdf(
        <BillPDF 
          bill={bill} 
          company={company} 
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
    <div className="space-y-4 pb-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => navigate('/bills')} className="flex-1 sm:flex-initial">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={() => handleGenerateEBill('download')} disabled={generating} className="flex-1 sm:flex-initial">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            E-Bill
          </Button>
          <Button variant="outline" onClick={() => handleGenerateEBill('share')} disabled={generating} className="p-2 sm:p-2.5">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        <Link to={`/bills/${bill.id}/edit`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Edit className="h-4 w-4 mr-2" />
            Edit Bill
          </Button>
        </Link>
      </div>

      <BillView bill={bill} />
    </div>
  );
}
