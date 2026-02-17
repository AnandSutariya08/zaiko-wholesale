import { useState, useEffect } from "react";
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
import { Bill, BillItem, Client, Product } from "@/types";
import { getCurrentUser } from "@/pages/Auth";
import {
  getClients,
  getProducts,
  saveBill,
  saveClient,
  saveProduct,
  getBillCounter,
  incrementBillCounter,
  getCompanyProfile,
  validateBillStock,
  getCreators,
  getBankAccounts,
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
  Trash2,
  Save,
  Loader2,
  Check,
  ChevronsUpDown,
  UserPlus,
  PlusCircle,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

export function BillForm({ bill, isEdit = false, initialGstEnabled, billType: propBillType }: BillFormProps) {
  const navigate = useNavigate();
  const [billType, setBillType] = useState<"domestic" | "international">(propBillType || "domestic");
  
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
  const [internalBillType, setInternalBillType] = useState<"domestic" | "international">(
    "domestic",
  );
  const [saving, setSaving] = useState(false);
  const [productComboOpenIndex, setProductComboOpenIndex] = useState<
    number | null
  >(null);
  const [productSearch, setProductSearch] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createProductForIndex, setCreateProductForIndex] = useState<
    number | null
  >(null);

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

  const [companyProfile, setCompanyProfile] = useState<any>(null);
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
      const [clientsData, productsData, companyData, creatorsData, banksData] =
        await Promise.all([
          getClients(),
          getProducts(),
          getCompanyProfile(),
          getCreators(),
          getBankAccounts(),
        ]);
      setClients(clientsData);
      setProducts(productsData);
      setCompanyProfile(companyData);
      setAvailableCreators(creatorsData);
      setBankAccounts(banksData);
      
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

    const zeroQuantityItems = billItems.filter((item) => item.quantity <= 0);
    if (zeroQuantityItems.length > 0) {
      toast.error("All items must have quantity greater than 0");
      return;
    }

    const zeroRateItems = billItems.filter((item) => item.ratePerUnit <= 0);
    if (zeroRateItems.length > 0) {
      toast.error("All items must have a valid rate");
      return;
    }

    if (isEdit) {
      const invalidQuantities = billItems.filter((item) => {
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
        stockValidationItems = billItems
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
        stockValidationItems = billItems.map((item) => ({
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
        billItems,
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

      const typeForCounter = (internalBillType as string) === "international" ? "international" : (gstEnabled ? "gst" : "non_gst");
      let billCounterVal;
      billCounterVal = isEdit ? await getBillCounter(typeForCounter) : await incrementBillCounter(typeForCounter);

      // Automatically set creator from logged in user
      const user = getCurrentUser();
      const creator = user.role === "admin" ? "Admin" : user.name || "Unknown";

      const selectedBankAccount = bankAccounts.find(a => a.id === formData.bankAccountId) || 
                                 bankAccounts.find(a => a.isDefault) || 
                                 bankAccounts[0];

      const newBill: Bill = {
        id: bill?.id || crypto.randomUUID(),
        billNumber:
          bill?.billNumber ||
          generateBillNumber(
            billCounterVal,
            companyProfile.name.substring(0, 6).toUpperCase(),
            internalBillType,
            gstEnabled
          ),
        date: formData.date,
        clientId: selectedClient.id,
        client: selectedClient,
        items: billItems,
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
        billType: internalBillType as any,
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

  const isIGST = gstType === "igst";

  useEffect(() => {
    if (barcodeSearch.trim()) {
      const product = products.find(p => p.barcode === barcodeSearch.trim());
      if (product) {
    const existingItemIndex = billItems.findIndex(item => item.productId === product.id);
    if (existingItemIndex > -1) {
      updateItem(existingItemIndex, "quantity", billItems[existingItemIndex].quantity + 1);
    } else {
          const newItem: BillItem = {
            productId: product.id,
            productName: product.name,
            hsnCode: product.hsnCode,
            gstRate: product.gstRate,
            quantity: 1,
            unit: product.unit,
            ratePerUnit: product.sellingPrice || product.price || 0,
            amount: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
          };
          // Calculate amount and taxes for new item
          newItem.amount = roundToTwoDecimals(newItem.quantity * newItem.ratePerUnit);
          if (!gstEnabled) {
            newItem.cgst = 0; newItem.sgst = 0; newItem.igst = 0;
          } else if (isIGST) {
            newItem.igst = (newItem.amount * newItem.gstRate) / 100;
            newItem.cgst = 0; newItem.sgst = 0;
          } else {
            newItem.cgst = (newItem.amount * newItem.gstRate) / 200;
            newItem.sgst = (newItem.amount * newItem.gstRate) / 200;
            newItem.igst = 0;
          }
          setBillItems([...billItems, newItem]);
        }
        toast.success(`Added ${product.name}`);
        setBarcodeSearch(""); // Clear for next scan
      }
    }
  }, [barcodeSearch, products, gstEnabled, gstType, billItems, isIGST]);

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
    const gstin = clientFormData.gstin.trim();
    const state = clientFormData.state.trim();
    const stateCode = clientFormData.stateCode.trim();

    if (!name) return toast.error("Client name is required");
    if (!billingAddress) return toast.error("Billing address is required");
    if (!gstin)
      return toast.error("GSTIN is required (use N.A. if not applicable)");
    if (!state) return toast.error("State is required");
    if (!stateCode) return toast.error("State code is required");

    setCreatingClient(true);
    try {
      const newClient: Client = {
        id: crypto.randomUUID(),
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
    item.hsnCode = product.hsnCode;
    item.gstRate = product.gstRate;
    item.unit = product.unit;
    item.ratePerUnit = product.sellingPrice || product.price || 0;
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

  const addItem = () => {
    setBillItems([
      ...billItems,
      {
        productId: "",
        productName: "",
        hsnCode: "",
        gstRate: 0,
        quantity: 1,
        unit: "kg",
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

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...billItems];
    const item = updated[index];

    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        item.productId = product.id;
        item.productName = product.name;
        item.hsnCode = product.hsnCode;
        item.gstRate = product.gstRate;
        item.unit = product.unit;
        item.ratePerUnit = product.sellingPrice || product.price || 0;
      }
    } else if (field === "quantity" || field === "ratePerUnit") {
      (item as any)[field] =
        typeof value === "string" ? parseFloat(value) || 0 : value;
    } else {
      (item as any)[field] = value;
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
    return product.stock + originalQty;
  };

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bill Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Barcode Scanner (Fast Entry)
              </Label>
              <Input
                placeholder="Scan barcode here to add item directly..."
                value={barcodeSearch}
                onChange={(e) => setBarcodeSearch(e.target.value)}
                autoFocus
                className="border-primary/50 focus:border-primary border-2"
              />
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bill Type Selection removed */}

            {/* Client Combobox */}
            <div className="space-y-2">
              <Label>Bank Account (Optional)</Label>
              <Select
                value={formData.bankAccountId}
                onValueChange={(value) => setFormData({ ...formData, bankAccountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account for bill" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bankName} - {account.accountNumber} {account.isDefault ? "(Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <CommandInput placeholder="Search client..." />
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
                            value={client.name}
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
                            {client.name}
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
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
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

            <div className="space-y-2">
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
            </div>

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

            {gstEnabled && (
              <div className="space-y-2 md:col-span-2">
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

            {!gstEnabled && (
              <div className="md:col-span-2 p-3 bg-muted rounded-lg">
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
        <Card>
          <CardHeader>
            <CardTitle>International Shipping Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="flex items-center justify-between md:col-span-2 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-base">GST Billing</Label>
            <p className="text-sm text-muted-foreground">
              {gstEnabled
                ? "GST is enabled for this bill"
                : "GST is disabled for this bill"}
            </p>
          </div>
          <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bill Items</CardTitle>
          <Button onClick={addItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billItems.map((item, index) => {
              const selectedProductIds = billItems
                .filter((_, i) => i !== index)
                .map((bi) => bi.productId)
                .filter((id) => id);

              const availableProducts = products.filter(
                (p) =>
                  !selectedProductIds.includes(p.id) || p.id === item.productId,
              );

              const availableStock = getAvailableStock(item.productId);
              const originalQty = getOriginalQuantity(item.productId);

              return (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      {/* Product Combobox */}
                      <div className="md:col-span-2">
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
                              className="w-full justify-between"
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
                                        value={product.name}
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
                                          <span>{product.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            Stock:{" "}
                                            {availStock % 1 === 0
                                              ? availStock
                                              : availStock.toFixed(2)}{" "}
                                            {product.unit}
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

                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={isEdit && originalQty > 0 ? originalQty : 0}
                          value={item.quantity}
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
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {item.productId && (
                          <p className="text-xs text-muted-foreground mt-1">
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
                                ⚠️ Insufficient stock
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label>Rate</Label>
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
                        />
                      </div>

                      {gstEnabled && (
                        <div>
                          <Label>GST %</Label>
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
                          />
                        </div>
                      )}

                      <div className="flex items-end">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Amount: ₹{formatToTwoDecimals(item.amount)}
                      {gstEnabled && (
                        <>
                          {" + "}
                          {isIGST ? "IGST" : "CGST+SGST"}: ₹
                          {formatToTwoDecimals(
                            item.igst || item.cgst + item.sgst,
                          )}
                          {isIGST && (
                            <span className="ml-2 text-xs text-orange-500">
                              (Inter-State)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-right">
            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Total Tax:</span>
              <span>₹{formatToTwoDecimals(totals.totalTax)}</span>
            </div>
            {discountNum > 0 && totals.discount > 0 && (
              <div className="flex justify-between text-lg text-red-600">
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
              <div className="flex justify-between text-lg">
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
            <div className="flex justify-between text-2xl font-bold border-t pt-2">
              <span>Total:</span>
              <span>₹{formatToTwoDecimals(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={handleSubmit}
          size="lg"
          className="flex-1"
          loading={saving}
        >
          <Save className="h-5 w-5 mr-2" />
          {isEdit ? "Update Bill" : "Create Bill"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate("/bills")}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>

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
    </div>
  );
}
