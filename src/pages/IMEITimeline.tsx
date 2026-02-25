import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  getBills,
  getInventoryTransactions,
  getInventoryUnits,
  getPurchaseBills,
} from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/billUtils";
import { Bill, InventoryTransaction, InventoryUnit, PurchaseBill } from "@/types";
import { Search, Smartphone, Receipt, ShoppingCart, Clock3 } from "lucide-react";

type DeviceEvent = {
  id: string;
  date: string;
  type: "purchase" | "sale" | "inventory" | "status";
  title: string;
  subtitle?: string;
  amount?: number;
  linkTo?: string;
};

const normalizeImei = (value?: string) =>
  (value || "").toString().replace(/\s+/g, "").trim().toLowerCase();

export default function IMEITimeline() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [u, pb, sb, tx] = await Promise.all([
          getInventoryUnits(),
          getPurchaseBills(),
          getBills(),
          getInventoryTransactions(),
        ]);
        const sortedUnits = [...u].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime(),
        );
        setUnits(sortedUnits);
        setPurchaseBills(pb);
        setBills(sb);
        setTransactions(tx);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const imeiUnits = useMemo(
    () =>
      units.filter((u) =>
        Boolean(normalizeImei(u.imeiNormalized || u.imeiNumber)),
      ),
    [units],
  );

  const filteredUnits = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return imeiUnits;
    return imeiUnits.filter((u) =>
      [
        u.imeiNumber,
        u.imeiNormalized,
        u.productName,
        u.variantKey,
        u.vendorName,
        u.status,
        u.purchaseBillId,
        u.soldBillId,
        u.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [query, imeiUnits]);

  const selectedUnit = useMemo(() => {
    if (!filteredUnits.length) return null;
    if (selectedUnitId) {
      const found = filteredUnits.find((u) => u.id === selectedUnitId);
      if (found) return found;
    }
    return filteredUnits[0];
  }, [filteredUnits, selectedUnitId]);

  useEffect(() => {
    if (!selectedUnit) {
      setSelectedUnitId("");
      return;
    }
    if (selectedUnitId !== selectedUnit.id) {
      setSelectedUnitId(selectedUnit.id);
    }
  }, [selectedUnit, selectedUnitId]);

  const events = useMemo(() => {
    if (!selectedUnit) return [] as DeviceEvent[];
    const selectedImei = normalizeImei(
      selectedUnit.imeiNormalized || selectedUnit.imeiNumber,
    );
    const list: DeviceEvent[] = [];
    const seenEventIds = new Set<string>();
    const pushEvent = (event: DeviceEvent) => {
      if (seenEventIds.has(event.id)) return;
      seenEventIds.add(event.id);
      list.push(event);
    };

    if (selectedUnit.purchaseBillId) {
      const pb = purchaseBills.find((b) => b.id === selectedUnit.purchaseBillId);
      if (pb) {
        pushEvent({
          id: `purchase-bill-${pb.id}`,
          date: pb.billDate || pb.createdAt,
          type: "purchase",
          title: "Purchased",
          subtitle: `Vendor: ${pb.vendorName}${pb.billNumber ? ` | Bill #${pb.billNumber}` : ""}`,
          amount: selectedUnit.purchasePrice || pb.total,
          linkTo: `/purchases?id=${pb.id}`,
        });
      }
    }

    if (selectedUnit.soldBillId) {
      const sb = bills.find((b) => b.id === selectedUnit.soldBillId);
      if (sb) {
        const soldItem = sb.items.find(
          (i) =>
            normalizeImei(i.imeiNumber) === selectedImei,
        );
        pushEvent({
          id: `sale-bill-${sb.id}`,
          date: sb.date || sb.createdAt,
          type: "sale",
          title: "Sold",
          subtitle: `Client: ${sb.client?.name || "N/A"} | Bill #${sb.billNumber}`,
          amount: soldItem?.ratePerUnit || sb.total,
          linkTo: `/bills/${sb.id}`,
        });
      }
    }

    const matchingTransactions = transactions.filter((t) => {
      if (t.inventoryUnitId && t.inventoryUnitId === selectedUnit.id) return true;
      return normalizeImei(t.imeiNumber) === selectedImei;
    });

    const purchaseTxWithBill = matchingTransactions.find(
      (t) => t.type === "purchase" && t.billId,
    );
    if (purchaseTxWithBill && purchaseTxWithBill.billId) {
      const pb = purchaseBills.find((b) => b.id === purchaseTxWithBill.billId);
      if (pb) {
        pushEvent({
          id: `purchase-bill-${pb.id}`,
          date: pb.billDate || pb.createdAt,
          type: "purchase",
          title: "Purchased",
          subtitle: `Vendor: ${pb.vendorName}${pb.billNumber ? ` | Bill #${pb.billNumber}` : ""}`,
          amount: selectedUnit.purchasePrice || pb.total,
          linkTo: `/purchases?id=${pb.id}`,
        });
      }
    }

    const saleTxWithBill = matchingTransactions.find(
      (t) => t.type === "sale" && t.billId,
    );
    if (saleTxWithBill && saleTxWithBill.billId) {
      const sb = bills.find((b) => b.id === saleTxWithBill.billId);
      if (sb) {
        const soldItem = sb.items.find(
          (i) => normalizeImei(i.imeiNumber) === selectedImei,
        );
        pushEvent({
          id: `sale-bill-${sb.id}`,
          date: sb.date || sb.createdAt,
          type: "sale",
          title: "Sold",
          subtitle: `Client: ${sb.client?.name || "N/A"} | Bill #${sb.billNumber}`,
          amount: soldItem?.ratePerUnit || sb.total,
          linkTo: `/bills/${sb.id}`,
        });
      }
    }

    matchingTransactions.forEach((t) => {
      pushEvent({
        id: `tx-${t.id}`,
        date: t.date,
        type: "inventory",
        title: `Inventory ${t.type.replace(/_/g, " ")}`,
        subtitle: `Qty: ${t.quantity} | ${t.model || t.itemNo || t.productId}`,
        amount: t.sellingPrice || t.purchasePrice,
      });
    });

    pushEvent({
      id: `status-${selectedUnit.id}`,
      date: selectedUnit.updatedAt || selectedUnit.createdAt,
      type: "status",
      title: `Current status: ${selectedUnit.status.replace(/_/g, " ")}`,
      subtitle: "Latest unit state",
    });

    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [selectedUnit, purchaseBills, bills, transactions]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner
          size="xl"
          text="Loading IMEI timeline..."
          fullScreen
          contentAreaOnly
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden">
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-slate-50/40 p-3 shadow-sm sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-border">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold leading-tight sm:text-3xl">
              IMEI Timeline
            </h1>
            <p className="text-sm text-muted-foreground">
              Track purchase, sale, and status by device IMEI
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        <Card className="min-h-0 overflow-hidden lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Devices</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search IMEI / model / bill..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="h-full overflow-y-auto space-y-2">
            {filteredUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No IMEI units found.</p>
            ) : (
              filteredUnits.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUnitId(u.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedUnit?.id === u.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/30"
                  }`}
                >
                  <p className="truncate text-sm font-semibold">
                    {u.productName || "Unknown"}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {u.imeiNumber}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {u.status.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(u.updatedAt || u.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden lg:col-span-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Timeline</CardTitle>
            {selectedUnit ? (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">IMEI:</span>{" "}
                  <span className="font-mono">{selectedUnit.imeiNumber}</span>
                </p>
                <p>
                  <span className="font-semibold text-foreground">Product:</span>{" "}
                  {selectedUnit.productName}
                </p>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="h-full overflow-y-auto">
            {!selectedUnit ? (
              <p className="text-sm text-muted-foreground">
                Select a device to view timeline.
              </p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No timeline events available for this IMEI yet.
              </p>
            ) : (
              <div className="space-y-3">
                {events.map((e) => (
                  <div key={e.id} className="rounded-xl border border-border/60 p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{e.title}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {e.type}
                      </Badge>
                    </div>
                    {e.subtitle ? (
                      <p className="text-xs text-muted-foreground">{e.subtitle}</p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        {formatDate(e.date)}
                      </span>
                      {typeof e.amount === "number" ? (
                        <span className="font-medium">{formatCurrency(e.amount)}</span>
                      ) : null}
                    </div>
                    {e.linkTo ? (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => navigate(e.linkTo!)}
                        >
                          {e.type === "purchase" ? (
                            <ShoppingCart className="mr-1 h-3 w-3" />
                          ) : (
                            <Receipt className="mr-1 h-3 w-3" />
                          )}
                          Open Document
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

