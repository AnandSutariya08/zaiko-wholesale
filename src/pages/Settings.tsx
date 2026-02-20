import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/storage";
import { CompanyProfile } from "@/types";
import { toast } from "sonner";
import {
  Save,
  Upload,
  Loader2,
  Building2,
  Settings2,
  CreditCard,
  Receipt,
  Percent,
  DollarSign,
  Palette,
  FileText,
  Banknote,
  Mail,
  Phone,
  MapPin,
  Hash,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { logout, checkSessionExpiry } from "@/pages/Auth";
import { useNavigate } from "react-router-dom";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

export default function Settings() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState<CompanyProfile>({
    id: "1",
    name: "",
    address: "",
    gstin: "",
    state: "",
    stateCode: "",
    phone: "",
    email: "",
    logo: logo,
    upiId: "",
    defaultUnit: "kg",
    unitOptions: ["kg", "pcs", "box"],
    bankDetails: {
      accountHolder: "",
      bankName: "",
      accountNumber: "",
      branchAndIFSC: "",
    },
    themeColor: "#2563eb",
    gstEnabled: true,
    defaultNote: "",
    commissionSettings: {
      defaultCommissionRate: 5,
      commissionType: "percentage",
      fixedCommissionAmount: 0,
    },
    expenseCategories: [
      "Marketing",
      "Utilities",
      "Rent",
      "Office Supplies",
      "Transportation",
      "Communication",
      "Insurance",
      "Taxes",
      "Maintenance",
      "Miscellaneous",
    ],
  });

  const [initialData, setInitialData] = useState<CompanyProfile | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!initialData) return;
    
    // Create copies to compare
    const currentFormData = { ...formData };
    const referenceData = { ...initialData };
    
    // JSON.stringify can be unreliable for simple comparisons if key order changes
    // But for React state objects it's usually fine. 
    // Let's use a slightly more robust check by comparing keys if needed, 
    // but first let's ensure we're actually seeing the changes.
    const hasChanged = JSON.stringify(currentFormData) !== JSON.stringify(referenceData);
    
    console.log("Form check - Dirty:", hasChanged);
    setIsDirty(hasChanged);
  }, [formData, initialData]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo file size should be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    setUploadingLogo(true);

    try {
      // Create a reference to Firebase Storage
      const timestamp = Date.now();
      const fileName = `company-logos/${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);

      // Upload file to Firebase Storage
      await uploadBytes(storageRef, file);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update form data with new logo URL
      const updatedProfile = {
        ...formData,
        logo: downloadURL,
      };

      // Save to Firestore immediately
      await saveCompanyProfile(updatedProfile);

      // Update local state
      setFormData(updatedProfile);

      toast.success("Logo uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(`Failed to upload logo: ${error.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Optional: Delete old logo when uploading new one
  const handleLogoUploadWithCleanup = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo file size should be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    setUploadingLogo(true);

    try {
      // Delete old logo if it exists and is from Firebase Storage
      if (formData.logo && formData.logo.includes("firebase")) {
        try {
          const oldLogoRef = ref(storage, formData.logo);
          await deleteObject(oldLogoRef);
        } catch (error) {
          console.log("Old logo not found or already deleted");
        }
      }

      // Upload new logo
      const timestamp = Date.now();
      const fileName = `company-logos/${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const updatedProfile = {
        ...formData,
        logo: downloadURL,
      };

      await saveCompanyProfile(updatedProfile);
      setFormData(updatedProfile);

      toast.success("Logo uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(`Failed to upload logo: ${error.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await getCompanyProfile();
      if (profile) {
        const fullProfile = {
          ...profile,
          upiId: profile.upiId || "",
          defaultUnit: profile.defaultUnit || "kg",
          unitOptions: profile.unitOptions || ["kg", "pcs", "box"],
          commissionSettings: profile.commissionSettings || {
            defaultCommissionRate: 5,
            commissionType: "percentage",
            fixedCommissionAmount: 0,
          },
          expenseCategories: profile.expenseCategories || [
            "Marketing",
            "Utilities",
            "Rent",
            "Office Supplies",
            "Transportation",
            "Communication",
            "Insurance",
            "Taxes",
            "Maintenance",
            "Miscellaneous",
          ],
        };
        setFormData(fullProfile);
        setInitialData(fullProfile);
      }
    };
    loadProfile();

    // Load session expiry time
    const expiryTime = localStorage.getItem("sessionExpiry");
    if (expiryTime) {
      setSessionExpiry(new Date(parseInt(expiryTime, 10)));
    }

    // Update session expiry display every minute
    const interval = setInterval(() => {
      const expiry = localStorage.getItem("sessionExpiry");
      if (expiry) {
        setSessionExpiry(new Date(parseInt(expiry, 10)));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    await saveCompanyProfile(formData);
    setInitialData(formData);
    setIsDirty(false);
    setSaving(false);
    toast.success("Settings saved successfully!");
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/auth", { replace: true });
  };

  const getSessionTimeRemaining = (): string => {
    if (!sessionExpiry) return "Unknown";
    const now = Date.now();
    const expiry = sessionExpiry.getTime();
    const remaining = expiry - now;

    if (remaining <= 0) return "Expired";

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const updateCommissionSettings = (field: string, value: any) => {
    setFormData({
      ...formData,
      commissionSettings: {
        ...formData.commissionSettings!,
        [field]: value,
      },
    });
  };

  return (
    <div className="-mx-3 h-[calc(100dvh-8.5rem)] overflow-hidden px-2 sm:-mx-4 sm:h-[calc(100dvh-9.5rem)] sm:px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="relative flex h-full min-h-0 flex-col rounded-[28px] border border-border/70 bg-background p-3 shadow-sm sm:p-5 lg:p-6">
      <div className="fixed bottom-6 right-6 z-[100] flex items-center justify-center">
        <Button
          onClick={() => handleSubmit()}
          loading={saving}
          size="lg"
          className="rounded-full h-14 px-6 shadow-2xl transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 ring-4 ring-primary/20 duration-300"
        >
          <Save className="h-5 w-5" />
          <span className="font-semibold">Save Changes</span>
        </Button>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 shrink-0 rounded-2xl border border-border/70 bg-background/95 p-3 backdrop-blur sm:p-4">
      <div className="page-header-controls">
        <div className="page-header-title min-w-0 flex-1">
          <div className="page-header-icon">
            <Settings2 className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground break-words">
              Settings
            </h1>
            <p className="page-subtitle break-words">
              Manage your company profile and preferences
            </p>
          </div>
        </div>
      </div>
      </div>

      <div className="mt-4 flex-1 min-h-0 rounded-2xl border border-border/70 bg-background/60 p-2 sm:p-3">
      <div className="h-full overflow-y-auto space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-24 sm:pb-32 px-3 sm:px-4 md:px-0 w-full max-w-full overflow-x-hidden">

      {/* Profile Card - Enhanced */}
      <Card className="border-2 shadow-lg w-full max-w-full overflow-hidden">
        <CardContent className="pt-4 sm:pt-5 md:pt-6 p-4 sm:p-5 md:p-6">
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-center md:items-start">
            <div className="relative group flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full opacity-20 group-hover:opacity-30 transition-opacity blur"></div>
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 lg:h-36 lg:w-36 border-4 border-primary/20 relative z-10 shadow-xl">
                <AvatarImage
                  src={formData.logo || logo}
                  alt="Company Logo"
                  className="object-contain p-2"
                />
                <AvatarFallback className="text-lg sm:text-xl md:text-2xl bg-gradient-to-br from-primary to-purple-600">
                  <Building2 className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 text-white" />
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUploadWithCleanup}
                className="hidden"
                id="logo-upload"
                disabled={uploadingLogo}
              />

              <Label
                htmlFor="logo-upload"
                className={`cursor-pointer ${
                  uploadingLogo ? "pointer-events-none" : ""
                }`}
              >
                <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                  {uploadingLogo ? (
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-white animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-white" />
                  )}
                </div>
              </Label>

              {uploadingLogo && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30">
                  <div className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                    Uploading...
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 text-center md:text-left space-y-2 sm:space-y-3 w-full min-w-0">
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2 break-words">
                  {formData.name || "Your Company"}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                {formData.email && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground break-all">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate break-words">
                      {formData.email}
                    </span>
                  </div>
                )}
                {formData.phone && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="break-words">{formData.phone}</span>
                  </div>
                )}
                {formData.address && (
                  <div className="flex items-start justify-center md:justify-start gap-2 text-muted-foreground sm:col-span-2">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-left break-words">
                      {formData.address}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card className="border shadow-md hover:shadow-lg transition-shadow w-full max-w-full overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-b px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              Company Information
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm break-words">
              Basic company details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-5 md:pt-6 space-y-3 sm:space-y-4 p-4 sm:p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs sm:text-sm">
                  <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  Company Name *
                </Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="h-10 sm:h-11 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">GSTIN *</Label>
                <Input
                  required
                  value={formData.gstin}
                  onChange={(e) =>
                    setFormData({ ...formData, gstin: e.target.value })
                  }
                  placeholder="24ABJCS5218B1ZN"
                  className="h-10 sm:h-11 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Address *</Label>
              <Textarea
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">State *</Label>
                <Input
                  required
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  placeholder="Gujarat"
                  className="h-10 sm:h-11 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">State Code *</Label>
                <Input
                  required
                  value={formData.stateCode}
                  onChange={(e) =>
                    setFormData({ ...formData, stateCode: e.target.value })
                  }
                  placeholder="24"
                  className="h-10 sm:h-11 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs sm:text-sm">
                  <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  Phone *
                </Label>
                <Input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="h-10 sm:h-11 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs sm:text-sm">
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  Email *
                </Label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-10 sm:h-11 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details section removed - managed in Banks page */}

        {/* Bill Creators */}
        <Card className="border shadow-md hover:shadow-lg transition-shadow border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Bill Creators
            </CardTitle>
            <CardDescription className="text-sm">
              Manage names of people who can create bills
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 space-y-4 p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  id="new-creator"
                  placeholder="Enter name (e.g. John Doe)"
                  className="h-11"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.currentTarget;
                      const value = input.value.trim();
                      if (value) {
                        setFormData({
                          ...formData,
                          billCreators: [
                            ...(formData.billCreators || []),
                            value,
                          ],
                        });
                        input.value = "";
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      "new-creator",
                    ) as HTMLInputElement;
                    const value = input.value.trim();
                    if (value) {
                      setFormData({
                        ...formData,
                        billCreators: [...(formData.billCreators || []), value],
                      });
                      input.value = "";
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.billCreators || []).map((creator, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="pl-3 pr-1 py-1 gap-1 h-8"
                  >
                    {creator}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          billCreators: formData.billCreators?.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission Settings - NEW */}
        <Card className="border shadow-md hover:shadow-lg transition-shadow border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <Percent className="h-5 w-5 text-purple-600" />
              Commission Settings
            </CardTitle>
            <CardDescription>
              Set default commission rates for sales and transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 space-y-4 md:space-y-6 p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Commission Type *
                </Label>
                <Select
                  value={
                    formData.commissionSettings?.commissionType || "percentage"
                  }
                  onValueChange={(value: "percentage" | "fixed") =>
                    updateCommissionSettings("commissionType", value)
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Percentage
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Fixed Amount
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how commission is calculated
                </p>
              </div>

              {formData.commissionSettings?.commissionType === "percentage" ? (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Default Commission Rate (%)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={
                        formData.commissionSettings?.defaultCommissionRate || 0
                      }
                      onChange={(e) =>
                        updateCommissionSettings(
                          "defaultCommissionRate",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="h-11 pr-8"
                      placeholder="5.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Default commission percentage applied to sales
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fixed Commission Amount (₹)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={
                        formData.commissionSettings?.fixedCommissionAmount || 0
                      }
                      onChange={(e) =>
                        updateCommissionSettings(
                          "fixedCommissionAmount",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="h-11 pl-6"
                      placeholder="0.00"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fixed commission amount per transaction
                  </p>
                </div>
              )}
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Percent className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Commission Preview
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formData.commissionSettings?.commissionType ===
                    "percentage" ? (
                      <>
                        A commission of{" "}
                        <span className="font-semibold text-purple-600">
                          {formData.commissionSettings?.defaultCommissionRate ||
                            0}
                          %
                        </span>{" "}
                        will be applied to all sales by default.
                      </>
                    ) : (
                      <>
                        A fixed commission of{" "}
                        <span className="font-semibold text-purple-600">
                          ₹
                          {formData.commissionSettings?.fixedCommissionAmount ||
                            0}
                        </span>{" "}
                        will be applied per transaction by default.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GST Settings */}
        <Card className="border shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border-b">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              GST Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Configure GST preferences for billing
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1 flex-1">
                <Label className="text-base">Enable GST</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.gstEnabled
                    ? "GST will be applied on all bills"
                    : "Bills will be created without GST"}
                </p>
              </div>
              <Switch
                checked={formData.gstEnabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, gstEnabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Bill Settings */}
        <Card className="border shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-orange-500/5 to-red-500/5 border-b">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Bill Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Customize bill appearance and default content
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 space-y-4 md:space-y-6 p-4 md:p-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Bill Header Color
              </Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="relative flex-shrink-0">
                  <Input
                    type="color"
                    value={formData.themeColor}
                    onChange={(e) =>
                      setFormData({ ...formData, themeColor: e.target.value })
                    }
                    className="w-20 h-12 sm:w-24 cursor-pointer rounded-lg border-2 border-border"
                  />
                </div>
                <div className="flex-1 w-full sm:w-auto">
                  <Input
                    type="text"
                    value={formData.themeColor}
                    onChange={(e) =>
                      setFormData({ ...formData, themeColor: e.target.value })
                    }
                    className="h-11 font-mono w-full"
                    placeholder="#2563eb"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This color will be used for bill headers and highlights
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Default Bill Note</Label>
              <Textarea
                value={formData.defaultNote || ""}
                onChange={(e) =>
                  setFormData({ ...formData, defaultNote: e.target.value })
                }
                placeholder="Enter default note that will appear on all bills (e.g., Thank you for your business! Payment due within the mentioned terms.)"
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This note will automatically appear on all new bills
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Product Units Settings */}
        <Card className="border shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border-b">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Hash className="h-5 w-5 text-blue-600" />
              Product Units
            </CardTitle>
            <CardDescription className="text-sm">
              Manage default unit and allowed units for products
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 space-y-4 md:space-y-6 p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Unit</Label>
                <Select
                  value={formData.defaultUnit || "kg"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, defaultUnit: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.unitOptions || ["kg", "pcs", "box"]).map(
                      (unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  New products will use this unit by default.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Allowed Units (comma separated)</Label>
                <Input
                  value={(formData.unitOptions || ["kg", "pcs", "box"]).join(
                    ", ",
                  )}
                  onChange={(e) => {
                    const units = e.target.value
                      .split(",")
                      .map((u) => u.trim())
                      .filter(Boolean);
                    setFormData({
                      ...formData,
                      unitOptions: units,
                      defaultUnit: units.includes(formData.defaultUnit || "")
                        ? formData.defaultUnit
                        : units[0] || "kg",
                    });
                  }}
                  placeholder="e.g., kg, pcs, box"
                />
                <p className="text-xs text-muted-foreground">
                  These units will be available when creating products.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories Settings */}
        <Card className="border shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-green-500/5 to-emerald-500/5 border-b">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Expense Categories
            </CardTitle>
            <CardDescription className="text-sm">
              Customize expense categories for better expense tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 space-y-4 md:space-y-6 p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <Label className="text-base">Expense Categories</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => {
                    const newCategory = prompt("Enter new expense category:");
                    if (newCategory && newCategory.trim()) {
                      setFormData({
                        ...formData,
                        expenseCategories: [
                          ...(formData.expenseCategories || []),
                          newCategory.trim(),
                        ],
                      });
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  Add Category
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(formData.expenseCategories || []).map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border"
                  >
                    <span className="flex-1 text-sm font-medium">
                      {category}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updatedCategories = (
                          formData.expenseCategories || []
                        ).filter((_, i) => i !== index);
                        setFormData({
                          ...formData,
                          expenseCategories: updatedCategories,
                        });
                      }}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">
                      Expense Categories Info
                    </p>
                    <p className="text-xs text-muted-foreground">
                      These categories will be available when adding expenses.
                      You can add, remove, or modify categories as needed for
                      your business.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
      </div>
      </div>
      </div>
    </div>
  );
}

