import { BillForm } from '@/components/BillForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function GSTBill() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 md:space-y-6 pb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={() => navigate('/bills')} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">Create GST Bill</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Fill in the details for a GST invoice</p>
          </div>
        </div>
      </div>

      <BillForm initialGstEnabled={true} billType="GST" />
    </div>
  );
}
