import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBills } from '@/lib/storage';
import { Bill } from '@/types';
import { BillForm } from '@/components/BillForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

export default function EditBill() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);

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

  if (!bill) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-4">
      <div className="page-header-controls">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={() => navigate(`/bills/${bill.id}`)} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="page-header-title min-w-0 flex-1">
            <div className="page-header-icon">
              <FileText className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">Edit Bill</h1>
            <p className="text-sm text-muted-foreground mt-1 truncate">{bill.billNumber}</p>
            </div>
          </div>
        </div>
      </div>

      <BillForm bill={bill} isEdit />
    </div>
  );
}

