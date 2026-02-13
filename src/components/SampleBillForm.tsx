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
} from "./ui/command";
import { SampleBill, BillItem, Client, Product } from "@/types";
import {
  getClients,
  getProducts,
  saveSampleBill,
  getSampleBillCounter,
  getSampleBillCounter as getSampleBillCounterActual,
  incrementSampleBillCounter,
  getCompanyProfile,
  getCreators,
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
  AlertCircle,
  ArrowLeft,
  UserPlus,
  PlusCircle,
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
import { BillCreator } from "@/types";

interface SampleBillFormProps {
  bill?: SampleBill;
  isEdit?: boolean;
}

export function SampleBillForm({ bill, isEdit = false }: SampleBillFormProps) {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableCreators, setAvailableCreators] = useState<BillCreator[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [gstType, setGstType] = useState<"igst" | "cgst_sgst">("cgst_sgst");
  const [saving, setSaving] = useState(false);
  const [productComboOpenIndex, setProductComboOpenIndex] = useState<
    number | null
  >(null);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createProductForIndex, setCreateProductForIndex] = useState<number | null>(
    null
  );

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
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
  });

  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [gstEnabled, setGstEnabled] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [clientsData, productsData, companyData, creatorsData] = await Promise.all([
        getClients(),
        getProducts(),
        getCompanyProfile(),
        getCreators(),
      ]);
      setClients(clientsData);
      setProducts(productsData);
      setCompanyProfile(companyData);
      setAvailableCreators(creatorsData);
      setGstEnabled(companyData?.gstEnabled ?? true);

      if (bill && isEdit) {
        setSelectedClient(bill.client);
        setBillItems(bill.items);
        setGstType(bill.gstType || "cgst_sgst");
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
        });
      }
    };
    loadData();
  }, [bill, isEdit]);

  const isIGST = gstType === "igst";

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
            (newItem.amount * newItem.gstRate) / 100
          );
          newItem.cgst = 0;
          newItem.sgst = 0;
        } else {
          newItem.cgst = roundToTwoDecimals(
            (newItem.amount * newItem.gstRate) / 200
          );
          newItem.sgst = roundToTwoDecimals(
            (newItem.amount * newItem.gstRate) / 200
          );
          newItem.igst = 0;
        }
        return newItem;
      });
      setBillItems(updated);
    }
  }, [gstType, gstEnabled]);

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
      (item) => !item.productId || !item.productName
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

    if (!companyProfile) {
      toast.error("Please setup company profile first");
      navigate("/settings");
      return;
    }

    setSaving(true);
    try {
      const otherChargesNum = parseFloat(formData.otherCharges || "0") || 0;
      const discountValue = formData.discount?.trim() || "";
      const discountNum =
        discountValue === "" ? 0 : parseFloat(discountValue) || 0;
      const totals = calculateBillTotals(
        billItems,
        companyProfile,
        otherChargesNum,
        discountNum,
        formData.discountType
      );
      const dueDate = calculateDueDate(formData.date, formData.paymentTerms);
      const paidAmountNum = parseFloat(formData.paidAmount || "0") || 0;
      const paymentStatus = getPaymentStatus(
        dueDate,
        paidAmountNum,
        totals.total
      );

      let billCounter = 0;
      if (!isEdit) {
        billCounter = await incrementSampleBillCounter();
      } else {
        billCounter = await getSampleBillCounter();
      }

      const newBill: SampleBill = {
        id: bill?.id || crypto.randomUUID(),
        billNumber:
          bill?.billNumber ||
          generateBillNumber(
            billCounter,
            companyProfile.name.substring(0, 6).toUpperCase(),
            "sample"
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
        deliveryNote: formData.deliveryNote,
        modeOfPayment: formData.modeOfPayment,
        placeOfSupply: formData.placeOfSupply,
        notes: formData.notes,
        createdBy: formData.createdBy || undefined,
        payments: [],
        createdAt: bill?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSample: true,
      };

      await saveSampleBill(newBill);
      toast.success(
        isEdit
          ? "Sample bill updated successfully"
          : "Sample bill created successfully"
      );
      navigate(`/sample-bills/${newBill.id}`);
    } catch (error) {
      console.error("Error saving sample bill:", error);
      toast.error("Failed to save sample bill");
    } finally {
      setSaving(false);
    }
  };

  const otherChargesNum = parseFloat(formData.otherCharges || "0") || 0;
  const discountValue = formData.discount?.trim() || "";
  const discountNum = discountValue === "" ? 0 : parseFloat(discountValue) || 0;
  const totals = calculateBillTotals(
    billItems,
    companyProfile,
    otherChargesNum,
    discountNum,
    formData.discountType
  );

  return (
    <div className="space-y-6">
      {/* Sample Bill Info Banner */}
      <div className="space-y-4 md:space-y-6 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/sample-bills")}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">
                Create New Sample Bill
              </h1>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                Fill in the details to create a new invoice
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bill Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Combobox */}
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
                          <p className="text-sm text-muted-foreground mb-4">No client found.</p>
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
                                  : "opacity-0"
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
              >
                <SelectTrigger>
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

      {/* Client Creation Dialog */}
      <ClientForm
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        onSuccess={(newClient) => {
          setSelectedClient(newClient);
          setClients((prev) => [...prev, newClient]);
          setCreateClientOpen(false);
        }}
      />

      <ProductForm
        open={createProductOpen}
        onOpenChange={setCreateProductOpen}
        onSuccess={(newProduct) => {
          setProducts((prev) => [...prev, newProduct]);
          if (createProductForIndex !== null) {
            applyProductToBillItem(createProductForIndex, newProduct);
          }
          setCreateProductOpen(false);
          setCreateProductForIndex(null);
        }}
      />

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
                  !selectedProductIds.includes(p.id) || p.id === item.productId
              );

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
                                    <p className="text-sm text-muted-foreground mb-4">No product found.</p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
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
                                  {availableProducts.map((product) => (
                                    <CommandItem
                                      key={product.id}
                                      value={product.name}
                                      onSelect={() => {
                                        updateItem(
                                          index,
                                          "productId",
                                          product.id
                                        );
                                        setProductComboOpenIndex(null);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          item.productId === product.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{product.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          Stock:{" "}
                                          {product.stock % 1 === 0
                                            ? product.stock
                                            : product.stock.toFixed(2)}{" "}
                                          {product.unit}
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
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            const roundedValue = Math.round(value * 100) / 100;
                            updateItem(index, "quantity", roundedValue);
                          }}
                        />
                        <p className="text-xs text-blue-600 mt-1">
                          ℹ️ No stock validation (sample bill)
                        </p>
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
                              parseFloat(e.target.value) || 0
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
                                parseFloat(e.target.value) || 0
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
                            item.igst || item.cgst + item.sgst
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
                placeholder="0.00"
                className="flex-1"
              />
            </div>
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
                  ₹{formatToTwoDecimals(parseFloat(String(formData.otherCharges)) || 0)}
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
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              {isEdit ? "Update Sample Bill" : "Create Sample Bill"}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate("/sample-bills")}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
