import { BillForm } from '@/components/BillForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';

export default function CreateBill() {
  const navigate = useNavigate();
  const [handleBackFromForm, setHandleBackFromForm] = useState<(() => void) | null>(null);
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  const pageTitleMap: Record<string, string> = {
    gst: "Create GST Bill",
    "non-gst": "Create Non-GST Bill",
    international: "Create International Bill",
  };
  const pageSubtitleMap: Record<string, string> = {
    gst: "Create a GST invoice with tax details",
    "non-gst": "Create an invoice without GST",
    international: "Create an international invoice",
  };

  const initialGstEnabled =
    mode === "gst" ? true : mode === "non-gst" ? false : undefined;
  const billType = mode === "international" ? "international" : "domestic";
  const backPath =
    mode === "gst"
      ? "/bills/gst"
      : mode === "non-gst"
        ? "/bills/non-gst"
        : mode === "international"
          ? "/bills/international"
          : "/bills";

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden rounded-2xl bg-gradient-to-b from-muted/20 via-background to-background p-2 sm:gap-4 sm:p-4">
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-background/95 p-2 shadow-sm backdrop-blur sm:p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => (handleBackFromForm ? handleBackFromForm() : navigate(backPath))} className="h-10 w-10 shrink-0 rounded-lg bg-background">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {/* <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-border">
              <FileText className="h-5 w-5" />
            </div> */}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold leading-tight sm:text-2xl">
                {pageTitleMap[mode || ""] || "Create New Bill"}
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {pageSubtitleMap[mode || ""] || "Fill in details to create a professional invoice"}
              </p>
            </div>
          </div>
          <div className="self-start rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground sm:self-auto">
            Draft Mode
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-2xl border border-border/70 bg-background/85 p-2 sm:p-3">
        <div className="h-full overflow-y-auto pr-1 sm:pr-2">
          <BillForm
            initialGstEnabled={initialGstEnabled}
            billType={billType}
            backPath={backPath}
            onBackHandlerReady={(handler) => setHandleBackFromForm(() => handler)}
          />
        </div>
      </div>
    </div>
  );
}

