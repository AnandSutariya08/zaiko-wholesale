import { BillForm } from '@/components/BillForm';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function CreateBill() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 md:space-y-6 pb-4">
      <div className="page-header-controls">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={() => navigate('/bills')} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="page-header-title min-w-0 flex-1">
            <div className="page-header-icon">
              <FileText className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">Create New Bill</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Fill in the details to create a new invoice</p>
            </div>
          </div>
        </div>
      </div>

      <BillForm />
    </div>
  );
}

