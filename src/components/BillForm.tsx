import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command";
import {
  Bill,
  BillItem,
  Client,
  CompanyProfile,
  InventoryUnit,
  Product,
} from "@/types";
import { getCurrentUser } from "@/pages/Auth";
import {
  getClients,
  getProducts,
  saveBill,
  saveClient,
  saveProduct,
  saveBankAccount,
  getBillCounter,
  incrementBillCounter,
  getCompanyProfile,
  validateBillStock,
  getCreators,
  getBankAccounts,
  getInventoryUnits,
} from "@/lib/storage";
import {
  calculateBillTotals,
  generateBillNumber,
  calculateDueDate,
  getPaymentStatus,
  roundToTwoDecimals,
  formatToTwoDecimals,
} from "@/lib/billUtils";
import { toast } from "sonner";
import {
  Plus,
  Save,
  Loader2,
  Check,
  ChevronsUpDown,
  UserPlus,
  PlusCircle,
  CreditCard,
  Search,
  Smartphone,
  ScanLine,
  Trash2,
} from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ClientForm } from "./ClientForm";
import { ProductForm } from "./ProductForm";
import { Switch } from "./ui/switch";
import { BillCreator, BankAccount } from "@/types";

interface BillFormProps {
  bill?: Bill;
  isEdit?: boolean;
  initialGstEnabled?: boolean;
  billType?: "domestic" | "international";
}

type QuaggaDetectedResult = {
  codeResult?: {
    code?: string;
  };
};

type QuaggaLike = {
  init: (config: unknown, callback: (err?: unknown) => void) => void;
  start: () => void;
  stop: () => void;
  onDetected: (callback: (result: QuaggaDetectedResult) => void) => void;
  offDetected: (callback: (result: QuaggaDetectedResult) => void) => void;
};

export function BillForm({
  bill,
  isEdit = false,
  initialGstEnabled,
  billType: propBillType,
}: BillFormProps) {
  const navigate = useNavigate();
  const [billType, setBillType] = useState<"domestic" | "international">(
    propBillType || "domestic",
  );

  useEffect(() => {
    if (propBillType) {
      setBillType(propBillType);
    }
  }, [propBillType]);

  useEffect(() => {
    if (bill && isEdit && bill.paymentStatus === "paid") {
      toast.error("Fully paid bills cannot be edited");
      navigate(`/bills/${bill.id}`);
    }
  }, [bill, isEdit, navigate]);

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryUnits, setInventoryUnits] = useState<InventoryUnit[]>([]);
  const [availableCreators, setAvailableCreators] = useState<BillCreator[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    name: "",
    billingAddress: "",
    shippingAddress: "",
    gstin: "",
    state: "",
    stateCode: "",
    phone: "",
    email: "",
  });
  const [originalBillItems, setOriginalBillItems] = useState<BillItem[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [gstType, setGstType] = useState<"igst" | "cgst_sgst">("cgst_sgst");
  const [internalBillType, setInternalBillType] = useState<
    "domestic" | "international"
  >("domestic");
  const [saving, setSaving] = useState(false);
  const [productComboOpenIndex, setProductComboOpenIndex] = useState<
    number | null
  >(null);
  const [imeiComboOpenIndex, setImeiComboOpenIndex] = useState<number | null>(
    null,
  );
  const [productSearch, setProductSearch] = useState("");
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeQuantity, setBarcodeQuantity] = useState(1);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [lastDecodedValue, setLastDecodedValue] = useState("");
  const [imeiLookup, setImeiLookup] = useState("");
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createProductForIndex, setCreateProductForIndex] = useState<
    number | null
  >(null);
  const [createBankOpen, setCreateBankOpen] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankFormData, setBankFormData] = useState<Partial<BankAccount>>({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    branchAndIFSC: "",
    upiId: "",
    isDefault: false,
  });
  const scannerInstanceRef = useRef<QuaggaLike | null>(null);
  const scannerDetectedHandlerRef = useRef<
    ((result: QuaggaDetectedResult) => void) | null
  >(null);
  const scannerRegionIdRef = useRef(generateId("bill-barcode-scanner-"));
  const barcodeQuantityRef = useRef(1);
  const lastScannedRef = useRef<{ code: string; ts: number }>({
    code: "",
    ts: 0,
  });

  useEffect(() => {
    barcodeQuantityRef.current = barcodeQuantity;
  }, [barcodeQuantity]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString(),
    paymentTerms: 30,
    deliveryNote: "",
    modeOfPayment: "",
    placeOfSupply: "",
    notes: "",
    paidAmount: "",
    otherCharges: "",
    discount: "",
    discountType: "amount" as "amount" | "percentage",
    createdBy: "",
    bankAccountId: "",
  });

  const [internationalData, setInternationalData] = useState({
    preCarriageBy: "",
    vesselsFlightNo: "",
    portOfDischarge: "",
    placeOfReceiptByPreCarriage: "",
    portOfLoading: "",
    finalDestination: "",
    grossWeight: "",
    netWeight: "",
    countryOfOrigin: "",
    countryOfFinalDestination: "",
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null,
  );
  const [gstEnabled, setGstEnabled] = useState(initialGstEnabled ?? true);

  // Auto-set GST and type based on props
  useEffect(() => {
    if (initialGstEnabled !== undefined) {
      setGstEnabled(initialGstEnabled);
    }
    if (propBillType) {
      setBillType(propBillType);
      setInternalBillType(propBillType);
    }
  }, [initialGstEnabled, propBillType]);

  useEffect(() => {
    const loadData = async () => {
      const [
        clientsData,
        productsData,
        companyData,
        creatorsData,
        banksData,
        inventoryUnitsData,
      ] = await Promise.all([
        getClients(),
        getProducts(),
        getCompanyProfile(),
        getCreators(),
        getBankAccounts(),
        getInventoryUnits(),
      ]);
      setClients(clientsData);
      setProducts(productsData);
      setCompanyProfile(companyData);
      setAvailableCreators(creatorsData);
      setBankAccounts(banksData);
      setInventoryUnits(inventoryUnitsData);

      if (initialGstEnabled === undefined) {
        setGstEnabled(companyData?.gstEnabled ?? true);
      }

      if (bill && isEdit) {
        setSelectedClient(bill.client);
        setBillItems(bill.items);
        setOriginalBillItems(JSON.parse(JSON.stringify(bill.items)));
        setGstType(bill.gstType || "cgst_sgst");
        setInternalBillType(bill.billType || "domestic");
        setFormData({
          date: bill.date,
          paymentTerms: bill.paymentTerms,
          deliveryNote: bill.deliveryNote || "",
          modeOfPayment: bill.modeOfPayment || "",
          placeOfSupply: bill.placeOfSupply || "",
          notes: bill.notes || "",
          paidAmount: bill.paidAmount ? String(bill.paidAmount) : "",
          otherCharges: bill.otherCharges ? String(bill.otherCharges) : "",
          discount: bill.discount ? String(bill.discount) : "",
          discountType: bill.discountType || "amount",
          createdBy: bill.createdBy || "",
          bankAccountId: bill.bankAccountId || "",
        });

        if (bill.internationalDetails) {
          setInternationalData({
            preCarriageBy: bill.internationalDetails.preCarriageBy || "",
            vesselsFlightNo: bill.internationalDetails.vesselsFlightNo || "",
            portOfDischarge: bill.internationalDetails.portOfDischarge || "",
            placeOfReceiptByPreCarriage:
              bill.internationalDetails.placeOfReceiptByPreCarriage || "",
            portOfLoading: bill.internationalDetails.portOfLoading || "",
            finalDestination: bill.internationalDetails.finalDestination || "",
            grossWeight: bill.internationalDetails.grossWeight
              ? String(bill.internationalDetails.grossWeight)
              : "",
            netWeight: bill.internationalDetails.netWeight
              ? String(bill.internationalDetails.netWeight)
              : "",
            countryOfOrigin: bill.internationalDetails.countryOfOrigin || "",
            countryOfFinalDestination:
              bill.internationalDetails.countryOfFinalDestination || "",
          });
        }
      } else {
        // Set default creator for new bill
        const user = getCurrentUser();
        if (user.role === "admin") {
          setFormData((prev) => ({ ...prev, createdBy: "Admin" }));
        } else if (user.name) {
          setFormData((prev) => ({ ...prev, createdBy: user.name }));
        }
      }
    };
    loadData();
  }, [bill, isEdit, initialGstEnabled]);

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }

    if (billItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const invalidItems = billItems.filter(
      (item) => !item.productId || !item.productName,
    );
    if (invalidItems.length > 0) {
      toast.error("Please select a product for all items");
      return;
    }

    const isSerializedProduct = (productId: string) => {
      const product = products.find((p) => p.id === productId);
      return (product?.trackingType || "standard") === "serialized";
    };

    const serializedValidationError = billItems.find((item) => {
      if (!isSerializedProduct(item.productId)) return false;
      const hasImei = Boolean(normalizeImei(item.imeiNumber || ""));
      return !hasImei || item.quantity !== 1;
    });
    if (serializedValidationError) {
      toast.error(
        `Serialized item "${serializedValidationError.productName}" requires one IMEI and quantity 1.`,
      );
      return;
    }

    const standardWithImei = billItems.find(
      (item) =>
        !isSerializedProduct(item.productId) &&
        Boolean(normalizeImei(item.imeiNumber || "")),
    );
    if (standardWithImei) {
      toast.error(
        `Standard item "${standardWithImei.productName}" should not include IMEI.`,
      );
      return;
    }

    const imeiList = billItems
      .map((item) => (item.imeiNumber || "").replace(/\s+/g, "").trim())
      .filter(Boolean);
    const duplicateImei = imeiList.find(
      (imei, idx) => imeiList.indexOf(imei) !== idx,
    );
    if (duplicateImei) {
      toast.error(`Duplicate IMEI in bill items: ${duplicateImei}`);
      return;
    }

    let imeiValidationError = "";
    const finalBillItems: BillItem[] = billItems.map((item) => {
      const normalizedImei = normalizeImei(item.imeiNumber || "");
      const next = { ...item };
      if (!normalizedImei) return next;
      if (next.quantity !== 1) {
        imeiValidationError = `IMEI item "${next.productName}" must have quantity 1.`;
        return next;
      }
      const matchedUnit = findSelectableUnitByImei(
        normalizedImei,
        next.productId,
      );
      if (!matchedUnit && !next.inventoryUnitId) {
        imeiValidationError = `IMEI ${next.imeiNumber} is not available in inventory.`;
        return next;
      }
      next.inventoryUnitId = matchedUnit?.id || next.inventoryUnitId;
      next.unit = "pcs";
      return next;
    });
    if (imeiValidationError) {
      toast.error(imeiValidationError);
      return;
    }

    const zeroQuantityItems = finalBillItems.filter(
      (item) => item.quantity <= 0,
    );
    if (zeroQuantityItems.length > 0) {
      toast.error("All items must have quantity greater than 0");
      return;
    }

    const zeroRateItems = finalBillItems.filter(
      (item) => item.ratePerUnit <= 0,
    );
    if (zeroRateItems.length > 0) {
      toast.error("All items must have a valid rate");
      return;
    }

    if (isEdit) {
      const invalidQuantities = finalBillItems.filter((item) => {
        const originalQty = getOriginalQuantity(item.productId);
        return originalQty > 0 && item.quantity < originalQty;
      });

      if (invalidQuantities.length > 0) {
        const errorMessages = invalidQuantities.map((item) => {
          const originalQty = getOriginalQuantity(item.productId);
          return `${item.productName}: Cannot reduce quantity below ${originalQty}`;
        });

        toast.error(
          <div>
            <p className="font-semibold mb-1">Cannot decrease quantities:</p>
            <ul className="text-sm list-disc pl-4">
              {errorMessages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>,
          { duration: 5000 },
        );
        return;
      }
    }

    if (!companyProfile) {
      toast.error("Please setup company profile first");
      navigate("/settings");
      return;
    }

    setSaving(true);
    try {
      let stockValidationItems;

      if (isEdit) {
        stockValidationItems = finalBillItems
          .map((item) => {
            const originalQty = getOriginalQuantity(item.productId);
            const additionalQty = item.quantity - originalQty;

            return {
              productId: item.productId,
              quantity: additionalQty > 0 ? additionalQty : 0,
            };
          })
          .filter((item) => item.quantity > 0);
      } else {
        stockValidationItems = finalBillItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }));
      }

      if (stockValidationItems.length > 0) {
        const stockValidation = await validateBillStock(stockValidationItems);

        if (!stockValidation.valid) {
          toast.error(
            <div>
              <p className="font-semibold mb-1">Insufficient Stock:</p>
              <ul className="text-sm list-disc pl-4">
                {stockValidation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>,
            { duration: 5000 },
          );
          return;
        }
      }

      const otherChargesNum = parseFloat(formData.otherCharges || "0") || 0;
      const discountValue = formData.discount?.trim() || "";
      const discountNum =
        discountValue === "" ? 0 : parseFloat(discountValue) || 0;
      const totals = calculateBillTotals(
        finalBillItems,
        companyProfile,
        otherChargesNum,
        discountNum,
        formData.discountType,
      );
      const dueDate = calculateDueDate(formData.date, formData.paymentTerms);
      const paidAmountNum = parseFloat(formData.paidAmount || "0") || 0;
      const paymentStatus = getPaymentStatus(
        dueDate,
        paidAmountNum,
        totals.total,
      );

      const typeForCounter =
        (internalBillType as string) === "international"
          ? "international"
          : gstEnabled
            ? "gst"
            : "non_gst";
      const billCounterVal = isEdit
        ? await getBillCounter(typeForCounter)
        : await incrementBillCounter(typeForCounter);

      // Automatically set creator from logged in user
      const user = getCurrentUser();
      const creator = user.role === "admin" ? "Admin" : user.name || "Unknown";

      const selectedBankAccount =
        bankAccounts.find((a) => a.id === formData.bankAccountId) ||
        bankAccounts.find((a) => a.isDefault) ||
        bankAccounts[0];

      const newBill: Bill = {
        id: bill?.id || generateId(),
        billNumber:
          bill?.billNumber ||
          generateBillNumber(
            billCounterVal,
            companyProfile.name.substring(0, 6).toUpperCase(),
            internalBillType,
            gstEnabled,
          ),
        date: formData.date,
        clientId: selectedClient.id,
        client: selectedClient,
        items: finalBillItems,
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        discount: discountNum > 0 ? totals.discount : 0,
        discountType: discountNum > 0 ? formData.discountType : "amount",
        otherCharges: otherChargesNum,
        roundOff: totals.roundOff,
        total: totals.total,
        paymentTerms: formData.paymentTerms,
        dueDate,
        paymentStatus,
        paidAmount: paidAmountNum,
        gstType: gstType,
        billType: internalBillType,
        deliveryNote: formData.deliveryNote,
        modeOfPayment: formData.modeOfPayment,
        placeOfSupply: formData.placeOfSupply,
        notes: formData.notes,
        createdBy: isEdit ? bill?.createdBy : creator,
        payments: bill?.payments || [],
        bankAccountId: selectedBankAccount?.id || "",
        bankAccount: selectedBankAccount || undefined,
        createdAt: bill?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        originalItems: isEdit ? originalBillItems : undefined,
        internationalDetails:
          (internalBillType as string) === "international"
            ? {
                preCarriageBy: internationalData.preCarriageBy,
                vesselsFlightNo: internationalData.vesselsFlightNo,
                portOfDischarge: internationalData.portOfDischarge,
                placeOfReceiptByPreCarriage:
                  internationalData.placeOfReceiptByPreCarriage,
                portOfLoading: internationalData.portOfLoading,
                finalDestination: internationalData.finalDestination,
                grossWeight:
                  parseFloat(internationalData.grossWeight) || undefined,
                netWeight: parseFloat(internationalData.netWeight) || undefined,
                countryOfOrigin: internationalData.countryOfOrigin,
                countryOfFinalDestination:
                  internationalData.countryOfFinalDestination,
              }
            : undefined,
      };

      await saveBill(newBill);
      toast.success(
        isEdit ? "Bill updated successfully" : "Bill created successfully",
      );
      navigate(`/bills/${newBill.id}`);
    } catch (error) {
      console.error("Error saving bill:", error);
      toast.error("Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  const openCreateBankDialog = () => {
    setBankFormData({
      bankName: "",
      accountHolder: "",
      accountNumber: "",
      branchAndIFSC: "",
      upiId: "",
      isDefault: bankAccounts.length === 0,
    });
    setCreateBankOpen(true);
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      const newBank: BankAccount = {
        id: Math.random().toString(36).substr(2, 9),
        bankName: (bankFormData.bankName || "").trim(),
        accountHolder: (bankFormData.accountHolder || "").trim(),
        accountNumber: (bankFormData.accountNumber || "").trim(),
        branchAndIFSC: (bankFormData.branchAndIFSC || "").trim(),
        upiId: (bankFormData.upiId || "").trim(),
        isDefault: !!bankFormData.isDefault,
      };

      if (
        !newBank.bankName ||
        !newBank.accountHolder ||
        !newBank.accountNumber ||
        !newBank.branchAndIFSC
      ) {
        toast.error("Please fill all required bank fields");
        return;
      }

      if (newBank.isDefault) {
        for (const account of bankAccounts) {
          if (account.isDefault && account.id !== newBank.id) {
            await saveBankAccount({ ...account, isDefault: false });
          }
        }
      }

      await saveBankAccount(newBank);
      const refreshedBanks = await getBankAccounts();
      setBankAccounts(refreshedBanks);
      setFormData((prev) => ({ ...prev, bankAccountId: newBank.id }));
      setCreateBankOpen(false);
      toast.success("Bank account added");
    } catch (error) {
      toast.error("Failed to save bank account");
    } finally {
      setSavingBank(false);
    }
  };

  const isIGST = gstType === "igst";

  const addProductByBarcode = useCallback(
    (rawBarcode: string, quantityToAdd: number, notify = true) => {
      const normalized = rawBarcode.trim();
      if (!normalized) {
        if (notify) toast.error("Please scan or enter a barcode");
        return false;
      }

      const normalizedNoLeadingZero = normalized.replace(/^0+/, "");
      const product = products.find((p) => {
        const code = (p.barcode || "").trim();
        if (!code) return false;
        if (code === normalized) return true;
        return code.replace(/^0+/, "") === normalizedNoLeadingZero;
      });
      if (!product) {
        if (notify) toast.error(`No product found for barcode: ${normalized}`);
        return false;
      }

      const qty =
        Number.isFinite(quantityToAdd) && quantityToAdd > 0 ? quantityToAdd : 1;
      setBillItems((prevItems) => {
        const nextItems = [...prevItems];
        const existingItemIndex = nextItems.findIndex(
          (item) => item.productId === product.id,
        );

        if (existingItemIndex > -1) {
          const existingItem = { ...nextItems[existingItemIndex] };
          existingItem.quantity = existingItem.quantity + qty;
          existingItem.amount = roundToTwoDecimals(
            existingItem.quantity * existingItem.ratePerUnit,
          );
          if (!gstEnabled) {
            existingItem.cgst = 0;
            existingItem.sgst = 0;
            existingItem.igst = 0;
          } else if (isIGST) {
            existingItem.igst =
              (existingItem.amount * existingItem.gstRate) / 100;
            existingItem.cgst = 0;
            existingItem.sgst = 0;
          } else {
            existingItem.cgst =
              (existingItem.amount * existingItem.gstRate) / 200;
            existingItem.sgst =
              (existingItem.amount * existingItem.gstRate) / 200;
            existingItem.igst = 0;
          }
          nextItems[existingItemIndex] = existingItem;
          return nextItems;
        }

        const newItem: BillItem = {
          productId: product.id,
          productName: product.name,
          hsnCode: product.hsnCode,
          gstRate: product.gstRate,
          quantity: qty,
          unit: product.unit,
          ratePerUnit: getDefaultSellingRateForProduct(product),
          amount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
        };
        newItem.amount = roundToTwoDecimals(
          newItem.quantity * newItem.ratePerUnit,
        );
        if (!gstEnabled) {
          newItem.cgst = 0;
          newItem.sgst = 0;
          newItem.igst = 0;
        } else if (isIGST) {
          newItem.igst = (newItem.amount * newItem.gstRate) / 100;
          newItem.cgst = 0;
          newItem.sgst = 0;
        } else {
          newItem.cgst = (newItem.amount * newItem.gstRate) / 200;
          newItem.sgst = (newItem.amount * newItem.gstRate) / 200;
          newItem.igst = 0;
        }

        return [...nextItems, newItem];
      });

      if (notify) toast.success(`Added ${qty} x ${product.name}`);
      return true;
    },
    [products, gstEnabled, isIGST],
  );

  const handleScanAdd = () => {
    const success = addProductByBarcode(barcodeInput, barcodeQuantity);
    if (!success) return;

    setBarcodeInput("");
    setBarcodeQuantity(1);
    setBarcodeScannerOpen(false);
  };

  const stopCameraScan = useCallback(async () => {
    const quagga = scannerInstanceRef.current;
    if (quagga) {
      try {
        if (scannerDetectedHandlerRef.current) {
          quagga.offDetected(scannerDetectedHandlerRef.current);
        }
      } catch {
        // Ignore detach errors.
      }
      try {
        quagga.stop();
      } catch {
        // Ignore stop errors.
      }
      scannerInstanceRef.current = null;
      scannerDetectedHandlerRef.current = null;
    }

    const region = document.getElementById(scannerRegionIdRef.current);
    if (region) region.innerHTML = "";

    setScannerActive(false);
    setScannerLoading(false);
  }, []);

  const startCameraScan = useCallback(async () => {
    try {
      setScannerError("");
      setScannerLoading(true);

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError("Camera access is not available on this device.");
        setScannerLoading(false);
        return;
      }

      await stopCameraScan();
      await new Promise((resolve) => setTimeout(resolve, 120));

      let scannerRegion: HTMLElement | null = null;
      for (let i = 0; i < 10; i += 1) {
        scannerRegion = document.getElementById(scannerRegionIdRef.current);
        if (scannerRegion) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (!scannerRegion) {
        setScannerError(
          "Scanner UI failed to initialize. Please close and reopen scanner.",
        );
        setScannerLoading(false);
        return;
      }

      const quaggaModule = await import("@ericblade/quagga2");
      const Quagga = (quaggaModule.default ||
        quaggaModule) as unknown as QuaggaLike;
      scannerInstanceRef.current = Quagga;

      const onDetected = (result: QuaggaDetectedResult) => {
        const rawValue = (result?.codeResult?.code || "").trim();
        if (!rawValue) return;

        const now = Date.now();
        const duplicateWithinCooldown =
          lastScannedRef.current.code === rawValue &&
          now - lastScannedRef.current.ts < 1200;
        if (duplicateWithinCooldown) return;

        lastScannedRef.current = { code: rawValue, ts: now };
        setLastDecodedValue(rawValue);
        setBarcodeInput(rawValue);
        addProductByBarcode(rawValue, barcodeQuantityRef.current, true);
      };
      scannerDetectedHandlerRef.current = onDetected;

      await new Promise<void>((resolve, reject) => {
        Quagga.init(
          {
            inputStream: {
              name: "Live",
              type: "LiveStream",
              target: scannerRegion,
              constraints: {
                facingMode: "environment",
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 360, ideal: 720, max: 1080 },
              },
              area: {
                top: "20%",
                right: "5%",
                left: "5%",
                bottom: "20%",
              },
            },
            locate: true,
            locator: {
              patchSize: "medium",
              halfSample: true,
            },
            numOfWorkers: Math.max(
              1,
              Math.min(4, navigator.hardwareConcurrency || 2),
            ),
            frequency: 10,
            decoder: {
              readers: [
                "ean_reader",
                "ean_8_reader",
                "upc_reader",
                "upc_e_reader",
                "code_128_reader",
                "code_39_reader",
              ],
            },
          },
          (err: unknown) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          },
        );
      });

      Quagga.onDetected(onDetected);
      Quagga.start();

      setScannerActive(true);
      setScannerLoading(false);
    } catch (error) {
      console.error("Camera scan start failed:", error);
      setScannerError(
        "Scanner failed to start. Allow camera permission and try again.",
      );
      setScannerLoading(false);
      setScannerActive(false);
    }
  }, [stopCameraScan, addProductByBarcode]);

  useEffect(() => {
    if (!barcodeScannerOpen) {
      void stopCameraScan();
      setScannerError("");
      setLastDecodedValue("");
      setBarcodeInput("");
      setBarcodeQuantity(1);
      return;
    }
    // Run scanner init once when dialog opens; avoid restart on unrelated re-renders.
    void startCameraScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcodeScannerOpen]);

  useEffect(() => {
    return () => {
      void stopCameraScan();
    };
  }, [stopCameraScan]);

  const resetClientForm = (prefillName?: string) => {
    setClientFormData({
      name: prefillName || "",
      billingAddress: "",
      shippingAddress: "",
      gstin: "",
      state: "",
      stateCode: "",
      phone: "",
      email: "",
    });
  };

  const handleCreateClient = async () => {
    const name = clientFormData.name.trim();
    const billingAddress = clientFormData.billingAddress.trim();
    const gstin = clientFormData.gstin.trim().toUpperCase();
    const state = clientFormData.state.trim();
    const stateCode = clientFormData.stateCode.trim();

    if (!name) return toast.error("Client name is required");

    setCreatingClient(true);
    try {
      const newClient: Client = {
        id: generateId(),
        name,
        billingAddress,
        shippingAddress: clientFormData.shippingAddress.trim() || undefined,
        gstin,
        state,
        stateCode,
        phone: clientFormData.phone.trim() || undefined,
        email: clientFormData.email.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await saveClient(newClient);

      const refreshed = await getClients();
      setClients(refreshed);
      setSelectedClient(newClient);
      setClientComboOpen(false);
      setCreateClientOpen(false);
      toast.success("Client created");
    } catch (e) {
      console.error("Failed to create client:", e);
      toast.error("Failed to create client");
    } finally {
      setCreatingClient(false);
    }
  };

  const applyProductToBillItem = (index: number, product: Product) => {
    const updated = [...billItems];
    const item = { ...updated[index] };
    item.productId = product.id;
    item.productName = product.name;
    item.itemNo = product.itemNo || "";
    item.model = product.model || "";
    item.imeiNumber = "";
    item.inventoryUnitId = undefined;
    item.storage = product.storage || "";
    item.color = product.color || "";
    item.vendorId = product.vendorId || "";
    item.vendorName = product.whereToBuy || "";
    item.purchasePrice = product.purchasePrice || 0;
    item.hsnCode = product.hsnCode;
    item.gstRate = product.gstRate;
    item.unit = product.unit;
    item.ratePerUnit = getDefaultSellingRateForProduct(product);
    if (isSerializedProductId(product.id)) {
      const selectableUnits = getSelectableUnitsForProduct(product.id);
      const unit = selectableUnits.length === 1 ? selectableUnits[0] : null;
      if (unit) {
        item.inventoryUnitId = unit.id;
        item.imeiNumber = unit.imeiNumber;
        item.purchasePrice = unit.purchasePrice ?? item.purchasePrice;
      }
      item.quantity = 1;
      item.unit = "pcs";
    }
    item.amount = roundToTwoDecimals(item.quantity * item.ratePerUnit);
    if (!gstEnabled) {
      item.cgst = 0;
      item.sgst = 0;
      item.igst = 0;
    } else if (isIGST) {
      item.igst = (item.amount * item.gstRate) / 100;
      item.cgst = 0;
      item.sgst = 0;
    } else {
      item.cgst = (item.amount * item.gstRate) / 200;
      item.sgst = (item.amount * item.gstRate) / 200;
      item.igst = 0;
    }
    updated[index] = item;
    setBillItems(updated);
  };

  const normalizeLookupText = (value: string) =>
    value.replace(/\s+/g, "").trim().toLowerCase();
  const normalizeImei = (value: string) => normalizeLookupText(value);
  const getDefaultSellingRateForProduct = (product: Product): number => {
    void product;
    return 0;
  };

  const isUnitSelectable = (unit: InventoryUnit) =>
    unit.status === "in_stock" || (isEdit && unit.soldBillId === bill?.id);

  const isSerializedProductId = (productId: string) =>
    (products.find((p) => p.id === productId)?.trackingType || "standard") ===
    "serialized";

  const getSelectableUnitsForProduct = (productId: string) =>
    inventoryUnits.filter(
      (u) =>
        u.productId === productId &&
        isUnitSelectable(u) &&
        Boolean(normalizeImei(u.imeiNormalized || u.imeiNumber)),
    );

  const getSelectableUnitsForLine = (index: number, productId?: string) => {
    if (!productId) return [] as InventoryUnit[];
    const usedImeis = new Set(
      billItems
        .filter((_, i) => i !== index)
        .map((row) => normalizeImei(row.imeiNumber || ""))
        .filter(Boolean),
    );
    return getSelectableUnitsForProduct(productId).filter((u) => {
      const normalized = normalizeImei(u.imeiNormalized || u.imeiNumber);
      const currentRowImei = normalizeImei(billItems[index]?.imeiNumber || "");
      return normalized === currentRowImei || !usedImeis.has(normalized);
    });
  };

  const findSelectableUnitByImei = (imei: string, productId?: string) => {
    const normalized = normalizeImei(imei);
    if (!normalized) return null;
    return (
      inventoryUnits.find(
        (u) =>
          normalizeImei(u.imeiNormalized || u.imeiNumber) === normalized &&
          (!productId || u.productId === productId) &&
          isUnitSelectable(u),
      ) || null
    );
  };

  const buildBillItemFromProduct = (product: Product): BillItem => {
    const quantity = 1;
    const ratePerUnit = getDefaultSellingRateForProduct(product);
    const amount = roundToTwoDecimals(quantity * ratePerUnit);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    if (gstEnabled) {
      if (isIGST) {
        igst = roundToTwoDecimals((amount * product.gstRate) / 100);
      } else {
        cgst = roundToTwoDecimals((amount * product.gstRate) / 200);
        sgst = roundToTwoDecimals((amount * product.gstRate) / 200);
      }
    }

    return {
      productId: product.id,
      inventoryUnitId: undefined,
      productName: product.name,
      itemNo: product.itemNo || "",
      model: product.model || "",
      imeiNumber: "",
      storage: product.storage || "",
      color: product.color || "",
      vendorId: product.vendorId || "",
      vendorName: product.whereToBuy || "",
      purchasePrice: product.purchasePrice || 0,
      hsnCode: product.hsnCode,
      gstRate: product.gstRate,
      quantity,
      unit: product.unit || "pcs",
      ratePerUnit,
      amount,
      cgst,
      sgst,
      igst,
    };
  };

  const buildBillItemFromInventoryUnit = (
    unit: InventoryUnit,
    product: Product,
  ): BillItem => {
    const base = buildBillItemFromProduct(product);
    base.inventoryUnitId = unit.id;
    base.imeiNumber = unit.imeiNumber;
    base.itemNo = unit.itemNo || base.itemNo;
    base.model = unit.model || base.model;
    base.storage = unit.storage || base.storage;
    base.color = unit.color || base.color;
    base.purchasePrice = unit.purchasePrice ?? base.purchasePrice;
    base.quantity = 1;
    base.unit = "pcs";
    base.amount = roundToTwoDecimals(base.quantity * base.ratePerUnit);
    if (!gstEnabled) {
      base.cgst = 0;
      base.sgst = 0;
      base.igst = 0;
    } else if (isIGST) {
      base.igst = roundToTwoDecimals((base.amount * base.gstRate) / 100);
      base.cgst = 0;
      base.sgst = 0;
    } else {
      base.cgst = roundToTwoDecimals((base.amount * base.gstRate) / 200);
      base.sgst = roundToTwoDecimals((base.amount * base.gstRate) / 200);
      base.igst = 0;
    }
    return base;
  };

  const addProductByLookup = (unit: InventoryUnit) => {
    const productImei = normalizeLookupText(unit.imeiNumber || "");
    if (
      productImei &&
      billItems.some(
        (item) => normalizeLookupText(item.imeiNumber || "") === productImei,
      )
    ) {
      toast.error("This IMEI is already present in bill items");
      return;
    }

    const product = products.find((p) => p.id === unit.productId);
    if (!product) {
      toast.error("Product not found for selected IMEI unit");
      return;
    }

    setBillItems((prev) => [
      ...prev,
      buildBillItemFromInventoryUnit(unit, product),
    ]);
    setImeiLookup("");
    toast.success(`Added ${product.model || product.name}`);
  };

  const addItem = () => {
    setBillItems([
      ...billItems,
      {
        productId: "",
        productName: "",
        itemNo: "",
        model: "",
        imeiNumber: "",
        storage: "",
        color: "",
        vendorId: "",
        vendorName: "",
        purchasePrice: 0,
        hsnCode: "",
        gstRate: 0,
        quantity: 1,
        unit: "pcs",
        ratePerUnit: 0,
        amount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...billItems];
    const item = updated[index];

    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        item.productId = product.id;
        item.productName = product.name;
        item.itemNo = product.itemNo || "";
        item.model = product.model || "";
        item.imeiNumber = "";
        item.inventoryUnitId = undefined;
        item.storage = product.storage || "";
        item.color = product.color || "";
        item.vendorId = product.vendorId || "";
        item.vendorName = product.whereToBuy || "";
        item.purchasePrice = product.purchasePrice || 0;
        item.hsnCode = product.hsnCode;
        item.gstRate = product.gstRate;
        item.unit = product.unit;
        item.ratePerUnit = getDefaultSellingRateForProduct(product);
        if (isSerializedProductId(product.id)) {
          const selectableUnits = getSelectableUnitsForProduct(product.id);
          const unit = selectableUnits.length === 1 ? selectableUnits[0] : null;
          if (unit) {
            item.inventoryUnitId = unit.id;
            item.imeiNumber = unit.imeiNumber;
            item.purchasePrice = unit.purchasePrice ?? item.purchasePrice;
          }
          item.quantity = 1;
          item.unit = "pcs";
        }
      }
    } else if (
      field === "quantity" ||
      field === "ratePerUnit" ||
      field === "gstRate"
    ) {
      const numericValue =
        typeof value === "string" ? parseFloat(value) || 0 : value;
      item[field] = numericValue as never;
    } else {
      item[field as keyof BillItem] = String(value) as never;
      if (field === "imeiNumber") {
        const unit = findSelectableUnitByImei(String(value), item.productId);
        item.inventoryUnitId = unit?.id;
        if (unit) {
          item.itemNo = unit.itemNo || item.itemNo;
          item.model = unit.model || item.model;
          item.storage = unit.storage || item.storage;
          item.color = unit.color || item.color;
          item.purchasePrice = unit.purchasePrice ?? item.purchasePrice;
        }
        item.quantity = normalizeImei(String(value)) ? 1 : item.quantity;
        if (normalizeImei(String(value))) {
          item.unit = "pcs";
        }
      }
    }

    if (normalizeImei(item.imeiNumber || "")) {
      item.quantity = 1;
      item.unit = "pcs";
    }

    item.amount = roundToTwoDecimals(item.quantity * item.ratePerUnit);
    if (!gstEnabled) {
      item.cgst = 0;
      item.sgst = 0;
      item.igst = 0;
    } else if (isIGST) {
      item.igst = (item.amount * item.gstRate) / 100;
      item.cgst = 0;
      item.sgst = 0;
    } else {
      item.cgst = (item.amount * item.gstRate) / 200;
      item.sgst = (item.amount * item.gstRate) / 200;
      item.igst = 0;
    }

    updated[index] = item;
    setBillItems(updated);
  };

  useEffect(() => {
    if (billItems.length > 0) {
      const updated = billItems.map((item) => {
        const newItem = { ...item };
        if (!gstEnabled) {
          newItem.cgst = 0;
          newItem.sgst = 0;
          newItem.igst = 0;
        } else if (isIGST) {
          newItem.igst = roundToTwoDecimals(
            (newItem.amount * newItem.gstRate) / 100,
          );
          newItem.cgst = 0;
          newItem.sgst = 0;
        } else {
          newItem.cgst = roundToTwoDecimals(
            (newItem.amount * newItem.gstRate) / 200,
          );
          newItem.sgst = roundToTwoDecimals(
            (newItem.amount * newItem.gstRate) / 200,
          );
          newItem.igst = 0;
        }
        return newItem;
      });
      setBillItems(updated);
    }
  }, [gstType, gstEnabled]);

  const getOriginalQuantity = (productId: string): number => {
    if (!isEdit) return 0;
    const originalItem = originalBillItems.find(
      (item) => item.productId === productId,
    );
    return originalItem ? originalItem.quantity : 0;
  };

  const getAvailableStock = (productId: string): number => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;

    const originalQty = getOriginalQuantity(productId);
    const baseStock =
      (product.trackingType || "standard") === "serialized"
        ? getSelectableUnitsForProduct(productId).length
        : product.stock;
    return baseStock + originalQty;
  };

  const lookupTerm = normalizeLookupText(imeiLookup);
  const imeiMatches =
    lookupTerm.length < 3
      ? []
      : inventoryUnits
          .filter((unit) => {
            if (!isUnitSelectable(unit)) return false;
            const product = products.find((p) => p.id === unit.productId);
            const searchBlob = [
              unit.imeiNumber || "",
              product?.model || "",
              product?.itemNo || "",
              product?.name || unit.productName || "",
            ]
              .join(" ")
              .toLowerCase()
              .replace(/\s+/g, "");
            if (!searchBlob.includes(lookupTerm)) return false;
            return !billItems.some(
              (item) =>
                normalizeImei(item.imeiNumber || "") ===
                normalizeImei(unit.imeiNormalized || unit.imeiNumber),
            );
          })
          .slice(0, 12);

  const otherChargesNum = parseFloat(formData.otherCharges || "0") || 0;
  const discountValue = formData.discount?.trim() || "";
  const discountNum = discountValue === "" ? 0 : parseFloat(discountValue) || 0;
  const totals = calculateBillTotals(
    billItems,
    companyProfile,
    otherChargesNum,
    discountNum,
    formData.discountType,
  );

  return (
    <div className="w-full max-w-full space-y-4 overflow-x-hidden pb-3 sm:space-y-5 sm:pb-6">
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold sm:text-lg">
            Bill Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 sm:space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Bill Type Selection removed */}

            {/* Client Combobox */}
            <div className="space-y-2">
              <Label>Bank Account (Optional)</Label>
              <Select
                value={formData.bankAccountId}
                onValueChange={(value) => {
                  if (value === "__add_new_bank__") {
                    openCreateBankDialog();
                    return;
                  }
                  setFormData({ ...formData, bankAccountId: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      bankAccounts.length > 0
                        ? "Select bank account for bill"
                        : "No bank accounts added"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">
                      No bank accounts found.
                    </div>
                  ) : (
                    bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bankName} - {account.accountNumber}{" "}
                        {account.isDefault ? "(Default)" : ""}
                      </SelectItem>
                    ))
                  )}
                  <SelectItem value="__add_new_bank__">
                    + Add New Bank Account
                  </SelectItem>
                </SelectContent>
              </Select>
              {bankAccounts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No banks configured. Use "Add New Bank Account" to create one.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Client *</Label>
              <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientComboOpen}
                    className="w-full justify-between"
                  >
                    {selectedClient ? selectedClient.name : "Select client..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search client by name or mobile..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-6 text-center">
                          <p className="text-sm text-muted-foreground mb-4">
                            No client found.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCreateClientOpen(true);
                              setClientComboOpen(false);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create New Client
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setCreateClientOpen(true);
                            setClientComboOpen(false);
                          }}
                          className="flex items-center text-primary font-medium"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add New Client
                        </CommandItem>
                        <CommandSeparator />
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={[client.name, client.phone || ""].join(" ")}
                            onSelect={() => {
                              setSelectedClient(client);
                              setClientComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClient?.id === client.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{client.name}</span>
                              {client.phone && (
                                <span className="text-xs text-muted-foreground">
                                  {client.phone}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Bill Date *</Label>
              <Input
                type="date"
                value={formData.date.split("T")[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  const now = new Date();
                  newDate.setHours(
                    now.getHours(),
                    now.getMinutes(),
                    now.getSeconds(),
                    now.getMilliseconds(),
                  );
                  setFormData({ ...formData, date: newDate.toISOString() });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Terms (Days) *</Label>
              <Input
                type="number"
                value={formData.paymentTerms}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentTerms: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Place of Supply</Label>
              <Input
                value={formData.placeOfSupply}
                onChange={(e) =>
                  setFormData({ ...formData, placeOfSupply: e.target.value })
                }
                placeholder="Gujarat"
              />
            </div>

            <div className="space-y-2">
              <Label>Delivery Note</Label>
              <Input
                value={formData.deliveryNote}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryNote: e.target.value })
                }
              />
            </div>

            {/* <div className="space-y-2">
              <Label>Created By</Label>
              <Select
                value={formData.createdBy}
                onValueChange={(value) =>
                  setFormData({ ...formData, createdBy: value })
                }
                disabled
              >
                <SelectTrigger className="bg-muted cursor-not-allowed">
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableCreators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.name}>
                      {creator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}

            <div className="space-y-2">
              <Label>Mode of Payment</Label>
              <Input
                value={formData.modeOfPayment}
                onChange={(e) =>
                  setFormData({ ...formData, modeOfPayment: e.target.value })
                }
                placeholder="Cash/Bank Transfer"
              />
            </div>

            {billType !== "international" && gstEnabled && (
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label>GST Type *</Label>
                <Select
                  value={gstType}
                  onValueChange={(value: "igst" | "cgst_sgst") =>
                    setGstType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select GST type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cgst_sgst">
                      CGST + SGST (Intra-State)
                    </SelectItem>
                    <SelectItem value="igst">IGST (Inter-State)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {gstType === "igst"
                    ? "IGST applies for inter-state transactions"
                    : "CGST + SGST applies for intra-state transactions"}
                </p>
              </div>
            )}

            {billType !== "international" && !gstEnabled && (
              <div className="rounded-lg bg-muted p-3 md:col-span-2 lg:col-span-3">
                <p className="text-sm text-muted-foreground">
                  GST is disabled in settings. Bills will be created without
                  GST.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* International Details Section */}
      {billType === "international" && (
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold sm:text-lg">
              International Shipping Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Pre-Carriage By</Label>
                <Input
                  value={internationalData.preCarriageBy}
                  onChange={(e) =>
                    setInternationalData({
                      ...internationalData,
                      preCarriageBy: e.target.value,
                    })
                  }
                  placeholder="DHL, FedEx, etc."
                />
              </div>

              <div className="space-y-2">
                <Label>Vessels/Flight No.</Label>
                <Input
                  value={internationalData.vesselsFlightNo}
                  onChange={(e) =>
                    setInternationalData({
                      ...internationalData,
                      vesselsFlightNo: e.target.value,
                    })
                  }
                  placeholder="Flight or vessel number"
                />
              </div>

              <div className="space-y-2">
                <Label>Place Of Receipt By Pre-Carriage</Label>
                <Input
                  value={internationalData.placeOfReceiptByPreCarriage}
                  onChange={(e) =>
                    setInternationalData({
                      ...internationalData,
                      placeOfReceiptByPreCarriage: e.target.value,
                    })
                  }
                  placeholder="Pickup location"
                />
              </div>

              <div className="space-y-2">
                <Label>Port of Loading</Label>
                <Input
                  value={internationalData.portOfLoading}
                  onChange={(e) =>
                    setInternationalData({
                      ...internationalData,
                      portOfLoading: e.target.value,
                    })
                  }
                  placeholder="e.g., Mumbai Port, INDIA"
                />
              </div>

              <div className="space-y-2">
                <Label>Port of Discharge</Label>
                <Input
                  value={internationalData.portOfDischarge}
                  onChange={(e) =>
                    setInternationalData({
                      ...internationalData,
                      portOfDischarge: e.target.value,
                    })
                  }
                  placeholder="Destination port"
                />
              </div>

              <div className="space-y-2">
                <Label>Final Destination</Label>
                <Input
                  value={internationalData.finalDestination}
                  onChange={(e) =>
                    setInternationalData({
                      ...internationalData,
                      finalDestination: e.target.value,
                    })
                  }
                  placeholder="e.g., HONG KONG"
                />
              </div>

              <div className="space-y-2">
                <Label>Gross Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={internationalData.grossWeight}
                  onChange={(e) =>
                    setInternationalData({
                      ...internationalData,
                      grossWeight: e.target.value,
                    })
                  }
                  placeholder="0.000"
                />
              </div>

              <div className="space-y-2">
                <Label>Net Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={internationalData.netWeight}
                  onChange={(e) =>
                    setInternationalData({
                      ...internationalData,
                      netWeight: e.target.value,
                    })
                  }
                  placeholder="0.000"
                />
              </div>

              <div className="space-y-2">
                <Label>Country Of Origin Of Goods</Label>
                <Input
                  value={internationalData.countryOfOrigin}
                  onChange={(e) =>
                    setInternationalData({
                      ...internationalData,
                      countryOfOrigin: e.target.value,
                    })
                  }
                  placeholder="e.g., INDIA"
                />
              </div>

              <div className="space-y-2">
                <Label>Country Of Final Destination</Label>
                <Input
                  value={internationalData.countryOfFinalDestination}
                  onChange={(e) =>
                    setInternationalData({
                      ...internationalData,
                      countryOfFinalDestination: e.target.value,
                    })
                  }
                  placeholder="e.g., HONG KONG"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GST Switch - Only show for domestic bills */}
      {billType !== "international" && (
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold sm:text-base">
              GST Billing
            </Label>
            <p className="text-sm text-muted-foreground">
              {gstEnabled
                ? "GST is enabled for this bill"
                : "GST is disabled for this bill"}
            </p>
          </div>
          <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
        </div>
      )}

      <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader className="space-y-4 pb-5">
          {/* Title + description row */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">
                Bill Items
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter IMEI to fetch mobile quickly, or add items manually.
              </p>
            </div>

            {/* Action buttons – stack on mobile, row on larger screens */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 sm:mt-0">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none min-w-[140px]"
                onClick={() => setBarcodeScannerOpen(true)}
              >
                <ScanLine className="mr-2 h-4 w-4" />
                Scan Barcode
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none min-w-[120px]"
                onClick={addItem}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Lookup + stats – stack on mobile, side-by-side on larger */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Search className="h-4 w-4" />
                Quick IMEI / Model / Item Lookup
              </Label>
              <Input
                value={imeiLookup}
                onChange={(e) => setImeiLookup(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && imeiMatches.length > 0) {
                    e.preventDefault();
                    addProductByLookup(imeiMatches[0]);
                  }
                }}
                placeholder="Type IMEI, model number, item code..."
                className="mt-1.5"
              />
              {/* ... keep the dropdown list below input ... */}
              {imeiLookup.trim().length > 0 && (
                <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border bg-background shadow-sm">
                  {/* your existing imeiMatches rendering */}
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 text-center sm:text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Items in Bill
              </p>
              <p className="mt-1 text-3xl font-bold">{billItems.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                IMEI/serial-tracked devices
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {billItems.map((item, index) => {
              const availableProducts = products;

              const availableStock = getAvailableStock(item.productId);
              const originalQty = getOriginalQuantity(item.productId);

              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-primary/5 p-4 shadow-sm"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                        Item {index + 1}
                      </span>
                      <p className="truncate text-sm font-semibold">
                        {item.model || item.productName || "Select mobile"}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {item.imeiNumber && (
                          <span className="rounded-full bg-muted px-2 py-0.5 font-mono">
                            IMEI: {item.imeiNumber}
                          </span>
                        )}
                        {(item.storage || item.color) && (
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            {[item.storage, item.color]
                              .filter(Boolean)
                              .join(" / ")}
                          </span>
                        )}
                        {item.itemNo && (
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            Item No: {item.itemNo}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Line Total
                        </p>
                        <p className="text-lg font-bold leading-tight text-primary">
                          Rs {formatToTwoDecimals(item.amount)}
                        </p>
                        {gstEnabled && (
                          <p className="text-[10px] text-muted-foreground">
                            {isIGST ? "IGST" : "CGST+SGST"}: Rs{" "}
                            {formatToTwoDecimals(
                              item.igst || item.cgst + item.sgst,
                            )}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/60 bg-background/70 p-3 md:grid-cols-6">
                    {/* Product Combobox */}
                    <div
                      className={cn(
                        gstEnabled ? "md:col-span-3" : "md:col-span-4",
                      )}
                    >
                      <Label>Product</Label>
                      <Popover
                        open={productComboOpenIndex === index}
                        onOpenChange={(open) =>
                          setProductComboOpenIndex(open ? index : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={productComboOpenIndex === index}
                            className="w-full justify-between border-border/70 bg-background"
                          >
                            {item.productName || "Select product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search product..." />
                            <CommandList>
                              <CommandEmpty>
                                <div className="py-6 text-center">
                                  <p className="text-sm text-muted-foreground mb-4">
                                    No product found.
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setCreateProductForIndex(index);
                                      setCreateProductOpen(true);
                                      setProductComboOpenIndex(null);
                                    }}
                                  >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Create New Product
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setCreateProductForIndex(index);
                                    setCreateProductOpen(true);
                                    setProductComboOpenIndex(null);
                                  }}
                                  className="flex items-center text-primary font-medium"
                                >
                                  <PlusCircle className="h-4 w-4 mr-2" />
                                  Add New Product
                                </CommandItem>
                                <CommandSeparator />
                                {availableProducts.map((product) => {
                                  const availStock = isEdit
                                    ? product.stock +
                                      getOriginalQuantity(product.id)
                                    : product.stock;
                                  return (
                                    <CommandItem
                                      key={product.id}
                                      value={[
                                        product.name,
                                        product.model || "",
                                        product.itemNo || "",
                                        product.storage || "",
                                        product.color || "",
                                        product.hsnCode || "",
                                        product.barcode || "",
                                        product.whereToBuy || "",
                                        product.trackingType || "",
                                      ].join(" ")}
                                      onSelect={() => {
                                        updateItem(
                                          index,
                                          "productId",
                                          product.id,
                                        );
                                        setProductComboOpenIndex(null);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          item.productId === product.id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {product.model || product.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {[
                                            product.itemNo,
                                            product.model,
                                            product.storage,
                                            product.color,
                                            `HSN: ${product.hsnCode || "-"}`,
                                            `Stock: ${availStock % 1 === 0 ? availStock : availStock.toFixed(2)} ${product.unit}`,
                                          ]
                                            .filter(Boolean)
                                            .join(" / ")}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Quantity
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={isEdit && originalQty > 0 ? originalQty : 0}
                        value={item.quantity}
                        disabled={Boolean(normalizeImei(item.imeiNumber || ""))}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const roundedValue = Math.round(value * 100) / 100;

                          if (
                            isEdit &&
                            originalQty > 0 &&
                            roundedValue < originalQty
                          ) {
                            updateItem(index, "quantity", originalQty);
                          } else {
                            updateItem(index, "quantity", roundedValue);
                          }
                        }}
                        className={
                          item.quantity > availableStock
                            ? "h-11 rounded-xl border-red-500"
                            : "h-11 rounded-xl"
                        }
                      />
                      {item.productId && (
                        <p className="text-xs text-muted-foreground">
                          Available:{" "}
                          {availableStock % 1 === 0
                            ? availableStock
                            : availableStock.toFixed(2)}{" "}
                          {products.find((p) => p.id === item.productId)
                            ?.unit || ""}
                          {isEdit && originalQty > 0 && (
                            <span className="text-blue-600 ml-2">
                              (Min:{" "}
                              {originalQty % 1 === 0
                                ? originalQty
                                : originalQty.toFixed(2)}
                              )
                            </span>
                          )}
                          {item.quantity > availableStock && (
                            <span className="text-red-500 ml-2">
                              Insufficient stock
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Rate
                      </Label>
                      <Input
                        type="number"
                        value={item.ratePerUnit}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "ratePerUnit",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="h-11 rounded-xl"
                      />
                    </div>

                    {gstEnabled && (
                      <div className="space-y-2 lg:col-span-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          GST %
                        </Label>
                        <Input
                          type="number"
                          value={item.gstRate}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "gstRate",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 md:grid-cols-5">
                    <div>
                      <Label>Item No</Label>
                      <Input
                        value={item.itemNo || ""}
                        onChange={(e) =>
                          updateItem(index, "itemNo", e.target.value)
                        }
                        placeholder="D648"
                      />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Input
                        value={item.model || ""}
                        onChange={(e) =>
                          updateItem(index, "model", e.target.value)
                        }
                        placeholder="16 Pro Max"
                      />
                    </div>
                    <div>
                      <Label>IMEI / Serial</Label>
                      <Popover
                        open={imeiComboOpenIndex === index}
                        onOpenChange={(open) =>
                          setImeiComboOpenIndex(open ? index : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={imeiComboOpenIndex === index}
                            className="w-full justify-between"
                            disabled={!item.productId}
                          >
                            {item.imeiNumber || "Select or type IMEI..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[min(360px,calc(100vw-2rem))] p-0"
                          align="start"
                        >
                          <Command>
                            <CommandInput
                              placeholder="Search IMEI..."
                              value={item.imeiNumber || ""}
                              onValueChange={(value) =>
                                updateItem(index, "imeiNumber", value)
                              }
                            />
                            <CommandList>
                              <CommandEmpty>
                                No IMEI found for this product.
                              </CommandEmpty>
                              <CommandGroup>
                                {getSelectableUnitsForLine(
                                  index,
                                  item.productId,
                                ).map((unit) => (
                                  <CommandItem
                                    key={unit.id}
                                    value={[
                                      unit.imeiNumber,
                                      unit.model || "",
                                      unit.storage || "",
                                      unit.color || "",
                                      unit.itemNo || "",
                                    ].join(" ")}
                                    onSelect={() => {
                                      updateItem(
                                        index,
                                        "imeiNumber",
                                        unit.imeiNumber,
                                      );
                                      setImeiComboOpenIndex(null);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        normalizeImei(item.imeiNumber || "") ===
                                          normalizeImei(
                                            unit.imeiNormalized ||
                                              unit.imeiNumber,
                                          )
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-mono text-xs">
                                        {unit.imeiNumber}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {[
                                          unit.model,
                                          unit.storage,
                                          unit.color,
                                          unit.itemNo,
                                        ]
                                          .filter(Boolean)
                                          .join(" / ")}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Storage</Label>
                      <Input
                        value={item.storage || ""}
                        onChange={(e) =>
                          updateItem(index, "storage", e.target.value)
                        }
                        placeholder="256 GB"
                      />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Input
                        value={item.color || ""}
                        onChange={(e) =>
                          updateItem(index, "color", e.target.value)
                        }
                        placeholder="Natural"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold sm:text-lg">
            Additional Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="space-y-2">
            <Label>Discount</Label>
            <div className="flex gap-2">
              <Select
                value={formData.discountType}
                onValueChange={(value: "amount" | "percentage") =>
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount (₹)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.discount}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, discount: value });
                }}
                placeholder={
                  formData.discountType === "percentage" ? "0.00" : "0.00"
                }
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.discountType === "percentage"
                ? "Discount percentage applied on subtotal"
                : "Fixed discount amount"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Other Charges (Freight, Packaging, etc.)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.otherCharges}
              onChange={(e) =>
                setFormData({ ...formData, otherCharges: e.target.value })
              }
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Additional charges like freight, packaging, handling, etc.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Paid Amount</Label>
            <Input
              type="number"
              value={formData.paidAmount}
              onChange={(e) =>
                setFormData({ ...formData, paidAmount: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 bg-muted/20 shadow-sm">
        <CardContent className="pt-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm sm:text-base">
              <span>Subtotal:</span>
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span>Total Tax:</span>
              <span>₹{formatToTwoDecimals(totals.totalTax)}</span>
            </div>
            {discountNum > 0 && totals.discount > 0 && (
              <div className="flex justify-between text-sm text-red-600 sm:text-base">
                <span>
                  Discount{" "}
                  {formData.discountType === "percentage"
                    ? `(${formData.discount}%)`
                    : ""}
                  :
                </span>
                <span>-₹{formatToTwoDecimals(totals.discount)}</span>
              </div>
            )}
            {(parseFloat(String(formData.otherCharges)) || 0) > 0 && (
              <div className="flex justify-between text-sm sm:text-base">
                <span>Other Charges:</span>
                <span>
                  ₹
                  {formatToTwoDecimals(
                    parseFloat(String(formData.otherCharges)) || 0,
                  )}
                </span>
              </div>
            )}
            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Round Off:</span>
                <span>
                  {totals.roundOff > 0 ? "+" : ""}₹
                  {formatToTwoDecimals(totals.roundOff)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 text-lg font-bold sm:text-xl">
              <span>Total:</span>
              <span>₹{formatToTwoDecimals(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 rounded-xl border border-border/70 bg-background/95 p-3 backdrop-blur sm:mt-2 sm:sticky sm:bottom-0 sm:z-20 sm:flex-row sm:gap-4">
        <Button
          onClick={handleSubmit}
          size="lg"
          className="h-11 sm:w-auto"
          loading={saving}
        >
          <Save className="h-5 w-5 mr-2" />
          {isEdit ? "Update Bill" : "Create Bill"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-11 sm:w-auto"
          onClick={() => navigate("/bills")}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>

      <Dialog open={barcodeScannerOpen} onOpenChange={setBarcodeScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={scannerActive ? "secondary" : "default"}
                onClick={() => void startCameraScan()}
                disabled={scannerLoading}
              >
                {scannerLoading ? "Opening Camera..." : "Restart Scanner"}
              </Button>
              {scannerActive && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void stopCameraScan()}
                >
                  Stop Scanner
                </Button>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-border/70 bg-black/90">
              <div
                id={scannerRegionIdRef.current}
                className="h-56 w-full sm:h-64"
              />
              {!scannerActive && !scannerLoading && (
                <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                  Scanner stopped. Tap "Restart Scanner"
                </div>
              )}
            </div>

            {scannerError && (
              <p className="text-sm text-red-500">{scannerError}</p>
            )}

            {lastDecodedValue && (
              <p className="text-xs text-emerald-600">
                Detected:{" "}
                <span className="font-medium">{lastDecodedValue}</span>
              </p>
            )}

            <div className="space-y-2">
              <Label>Barcode / Stock Code</Label>
              <Input
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScanAdd();
                  }
                }}
                placeholder="Scan with scanner or type code"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={barcodeQuantity}
                onChange={(e) =>
                  setBarcodeQuantity(
                    Math.max(1, parseInt(e.target.value, 10) || 1),
                  )
                }
              />
            </div>

            {barcodeInput.trim() && (
              <p className="text-xs text-muted-foreground">
                {products.find((p) => {
                  const a = (p.barcode || "").trim();
                  const b = barcodeInput.trim();
                  return (
                    a === b || a.replace(/^0+/, "") === b.replace(/^0+/, "")
                  );
                })
                  ? "Matched product found. Product is ready to add."
                  : "No matching product yet for this barcode."}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Tip: Keep barcode horizontal in frame and hold 10-20 cm away.
            </p>
            <p className="text-xs text-muted-foreground">
              If no result in 2-3 sec, tap "Restart Scanner" and try better
              light.
            </p>
            <p className="text-xs text-muted-foreground">
              On mobile, tap "Restart Scanner" and keep barcode steady 10-20 cm
              from camera.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                void stopCameraScan();
                setBarcodeScannerOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleScanAdd}>Add To Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientForm
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        onSuccess={(newClient) => {
          setClients([...clients, newClient]);
          setSelectedClient(newClient);
        }}
      />

      <ProductForm
        open={createProductOpen}
        onOpenChange={setCreateProductOpen}
        onSuccess={(newProduct) => {
          setProducts([...products, newProduct]);
          if (createProductForIndex !== null) {
            applyProductToBillItem(createProductForIndex, newProduct);
          }
        }}
      />
      <Dialog open={createBankOpen} onOpenChange={setCreateBankOpen}>
        <DialogContent className="dialog-form-content sm:max-w-[500px]">
          <form onSubmit={handleCreateBank} className="dialog-form-body">
            <DialogHeader className="dialog-form-header">
              <DialogTitle>Add Bank Account</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bill-bank-name">Bank Name *</Label>
                  <Input
                    id="bill-bank-name"
                    required
                    value={bankFormData.bankName || ""}
                    onChange={(e) =>
                      setBankFormData((prev) => ({
                        ...prev,
                        bankName: e.target.value,
                      }))
                    }
                    placeholder="e.g. HDFC Bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-bank-holder">
                    Account Holder Name *
                  </Label>
                  <Input
                    id="bill-bank-holder"
                    required
                    value={bankFormData.accountHolder || ""}
                    onChange={(e) =>
                      setBankFormData((prev) => ({
                        ...prev,
                        accountHolder: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bill-bank-number">Account Number *</Label>
                  <Input
                    id="bill-bank-number"
                    required
                    value={bankFormData.accountNumber || ""}
                    onChange={(e) =>
                      setBankFormData((prev) => ({
                        ...prev,
                        accountNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-bank-ifsc">Branch & IFSC *</Label>
                  <Input
                    id="bill-bank-ifsc"
                    required
                    value={bankFormData.branchAndIFSC || ""}
                    onChange={(e) =>
                      setBankFormData((prev) => ({
                        ...prev,
                        branchAndIFSC: e.target.value,
                      }))
                    }
                    placeholder="e.g. Mumbai & HDFC0001234"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-bank-upi">UPI ID (Optional)</Label>
                <Input
                  id="bill-bank-upi"
                  value={bankFormData.upiId || ""}
                  onChange={(e) =>
                    setBankFormData((prev) => ({
                      ...prev,
                      upiId: e.target.value,
                    }))
                  }
                  placeholder="e.g. name@bank"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="bill-bank-default"
                  checked={!!bankFormData.isDefault}
                  onCheckedChange={(checked) =>
                    setBankFormData((prev) => ({ ...prev, isDefault: checked }))
                  }
                />
                <Label htmlFor="bill-bank-default">
                  Set as default account
                </Label>
              </div>
            </div>
            <DialogFooter className="dialog-form-footer">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateBankOpen(false)}
                disabled={savingBank}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingBank}>
                {savingBank && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Bank Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


