import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./ui/button";
import { checkSessionExpiry, logout, getCurrentUser } from "@/pages/Auth";
import { toast } from "sonner";
import {
  LayoutDashboard,
  HeartPulse,
  FileText,
  Package,
  Users,
  Store,
  Settings,
  Sun,
  Moon,
  ShoppingCart,
  RotateCcw,
  DollarSign,
  BookOpen,
  FolderOpen,
  StickyNote,
  FileStack,
  UserCheck,
  LogOut,
  Sparkles,
  ScanSearch,
  Calculator,
  X,
  CreditCard,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { getCompanyProfile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface LayoutProps {
  children: React.ReactNode;
}

function getInitialSidebarOpen(): boolean {
  if (typeof document === "undefined") return true;
  const match = document.cookie.match(/sidebar:state=(\w+)/);
  return match ? match[1] === "true" : true;
}

function AppSidebarContent({
  navItems,
  isActive,
  company,
  user,
  onNavClick,
  onReorder,
  theme,
  toggleTheme,
  handleLogout,
}: {
  navItems: { path: string; icon: React.ElementType; label: string }[];
  isActive: (path: string) => boolean;
  company: any;
  user: any;
  onNavClick: () => void;
  onReorder: (path: string, direction: "up" | "down") => void;
  theme: string;
  toggleTheme: () => void;
  handleLogout: () => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [manageMode, setManageMode] = useState(false);
  const location = useLocation();

  const handleNavClick = () => {
    if (manageMode) return;
    if (isMobile) setOpenMobile(false);
    onNavClick();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setManageMode(!manageMode);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-sidebar border-b border-sidebar-border/50 group-data-[collapsible=icon]:hidden">
          <div className="px-3 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {company?.logo ? (
                  <img
                    src={company.logo}
                    alt="Logo"
                    className="h-7 w-7 object-contain rounded-md"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sidebar-foreground truncate text-sm tracking-tight">
                  {company?.name || "Invoice Mitra"}
                </h2>
              </div>
            </div>
            {manageMode && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-primary"
                onClick={() => setManageMode(false)}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        </div>

        <SidebarContent className="flex-1 overflow-y-auto px-2 py-2 pb-20 group-data-[collapsible=icon]:pb-32 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/20 hover:[&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-transparent">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  const menuButton = (
                    <SidebarMenuButton
                      tooltip={item.label}
                      size="default"
                      onDoubleClick={handleDoubleClick}
                      className={cn(
                        "rounded-lg px-3 h-10 transition-all duration-200 relative group/btn",
                        active && !manageMode
                          ? "bg-primary/10 text-primary font-semibold shadow-none border-l-2 border-primary rounded-l-none group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:bg-primary/20 group-data-[collapsible=icon]:ring-1 group-data-[collapsible=icon]:ring-primary/40 group-data-[collapsible=icon]:shadow-[0_6px_18px_rgba(59,130,246,0.25)] group-data-[collapsible=icon]:scale-[1.04]"
                          : "hover:bg-sidebar-accent text-sidebar-foreground/70",
                        manageMode &&
                          "border border-dashed border-primary/30 bg-primary/5",
                      )}
                    >
                      {manageMode ? (
                        <GripVertical className="size-4 shrink-0 text-primary/50" />
                      ) : (
                        <Icon className="size-5 shrink-0 group-data-[collapsible=icon]:size-6" />
                      )}
                      <span className="ml-2 flex-1 truncate">{item.label}</span>

                      {manageMode ? (
                        <div className="flex items-center gap-0.5 ml-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            className="h-6 w-6 rounded-sm hover:bg-primary/20 hover:text-primary disabled:opacity-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorder(item.path, "up");
                            }}
                          >
                            <ChevronUp className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === navItems.length - 1}
                            className="h-6 w-6 rounded-sm hover:bg-primary/20 hover:text-primary disabled:opacity-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorder(item.path, "down");
                            }}
                          >
                            <ChevronDown className="size-3" />
                          </Button>
                        </div>
                      ) : (
                        item.label === "Bills" && (
                          <ChevronRight
                            className={cn(
                              "ml-auto transition-transform duration-200 size-3.5 opacity-50",
                              "group-data-[state=open]/collapsible:rotate-90",
                            )}
                          />
                        )
                      )}
                    </SidebarMenuButton>
                  );

                  if (item.label === "Bills" && !manageMode) {
                    return (
                      <Collapsible
                        key={item.path}
                        asChild
                        defaultOpen={active}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <Link to="/bills" onClick={handleNavClick}>
                              {menuButton}
                            </Link>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="ml-4 border-l border-sidebar-border pl-2 space-y-0.5 mt-1">
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={location.pathname === "/bills"}
                                  className="h-8 rounded-sm"
                                >
                                  <Link to="/bills" onClick={handleNavClick}>
                                    <span className="text-sm">All Bills</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={location.pathname === "/bills/gst"}
                                  className="h-8 rounded-sm"
                                >
                                  <Link
                                    to="/bills/gst"
                                    onClick={handleNavClick}
                                  >
                                    <span className="text-sm">GST Bill</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={
                                    location.pathname === "/bills/non-gst"
                                  }
                                  className="h-8 rounded-sm"
                                >
                                  <Link
                                    to="/bills/non-gst"
                                    onClick={handleNavClick}
                                  >
                                    <span className="text-sm">
                                      Non-GST Bill
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={
                                    location.pathname === "/bills/international"
                                  }
                                  className="h-8 rounded-sm"
                                >
                                  <Link
                                    to="/bills/international"
                                    onClick={handleNavClick}
                                  >
                                    <span className="text-sm">
                                      International Bill
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={
                                    location.pathname === "/sample-bill"
                                  }
                                  className="h-8 rounded-sm"
                                >
                                  <Link
                                    to="/sample-bill"
                                    onClick={handleNavClick}
                                  >
                                    <span className="text-sm">
                                      Quotation Bill
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  if (item.label === "Sample") return null;

                  return (
                    <SidebarMenuItem key={item.path}>
                      {manageMode ? (
                        menuButton
                      ) : (
                        <Link
                          to={item.path}
                          onClick={handleNavClick}
                          className="block w-full"
                        >
                          {menuButton}
                        </Link>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>
      <SidebarFooter className="sticky bottom-0 border-t border-sidebar-border/40 p-2 bg-sidebar z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-[10px] font-medium text-sidebar-foreground truncate">
                {user.name}
              </p>
              <p className="text-[8px] text-sidebar-foreground/50 truncate uppercase tracking-wider">
                {user.role}
              </p>
            </div>
            <div className="flex items-center group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
              <div className="group-data-[collapsible=icon]:hidden flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {theme === "light" ? (
                    <Moon className="size-4" />
                  ) : (
                    <Sun className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Logout"
                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
              <SidebarTrigger
                className="h-8 w-8 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10"
                aria-label="Toggle sidebar"
              />
            </div>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const getMobileTitle = (pathname: string) => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/business-health")) return "Business Health";
    if (pathname.startsWith("/bills")) return "Bills";
    if (
      pathname.startsWith("/sample-bill") ||
      pathname.startsWith("/sample-bills")
    )
      return "Quotation Bill";
    if (pathname.startsWith("/purchases")) return "Buy";
    if (pathname.startsWith("/returns")) return "Returns";
    if (pathname.startsWith("/passbook")) return "Passbook";
    if (pathname.startsWith("/expenses")) return "Expenses";
    if (pathname.startsWith("/products")) return "Stock";
    if (pathname.startsWith("/clients")) return "Clients";
    if (pathname.startsWith("/vendors")) return "Vendors";
    if (pathname.startsWith("/imei-timeline")) return "IMEI Timeline";
    if (pathname.startsWith("/settings")) return "Settings";
    return "Invoice Mitra";
  };
  const isShellManagedRoute =
    location.pathname === "/" ||
    location.pathname === "/business-health" ||
    location.pathname.startsWith("/bills") ||
    location.pathname.startsWith("/sample-bill") ||
    location.pathname.startsWith("/sample-bills") ||
    location.pathname.startsWith("/purchases") ||
    location.pathname.startsWith("/returns") ||
    location.pathname.startsWith("/imei-timeline");
  const [company, setCompany] = useState<any>(null);
  const user = getCurrentUser();
  const permissions =
    user.role === "admin"
      ? []
      : localStorage.getItem("userPermissions")?.split(",") || [];

  useEffect(() => {
    const loadCompany = async () => {
      const companyData = await getCompanyProfile();
      setCompany(companyData);
    };
    loadCompany();
  }, []);

  // Check session expiry periodically and auto-logout
  useEffect(() => {
    const checkSession = () => {
      if (!checkSessionExpiry()) {
        logout();
        toast.error("Your session has expired. Please login again.");
        navigate("/auth", { replace: true });
      }
    };
    // Check immediately
    checkSession();
    // Check every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const allNavItems = [
    { path: "/", icon: LayoutDashboard, label: "Home" },
    { path: "/business-health", icon: HeartPulse, label: "Health" },
    { path: "/bills", icon: FileText, label: "Bills" },
    { path: "/sample-bill", icon: FileStack, label: "Sample" },
    { path: "/purchases", icon: ShoppingCart, label: "Buy" },
    { path: "/returns", icon: RotateCcw, label: "Returns" },
    { path: "/passbook", icon: BookOpen, label: "Passbook" },
    { path: "/expenses", icon: DollarSign, label: "Expenses" },
    { path: "/products", icon: Package, label: "Stock" },
    { path: "/clients", icon: Users, label: "Clients" },
    { path: "/vendors", icon: Store, label: "Vendors" },
    { path: "/imei-timeline", icon: ScanSearch, label: "IMEI" },
    { path: "/files", icon: FolderOpen, label: "Files" },
    { path: "/notes", icon: StickyNote, label: "Notes" },
    { path: "/calculator", icon: Calculator, label: "Calculator" },
    { path: "/ai-agent", icon: Sparkles, label: "AI" },
    { path: "/bank-accounts", icon: CreditCard, label: "Banks" },
    { path: "/bill-creators", icon: UserCheck, label: "Users" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const [navItems, setNavItems] = useState<any[]>([]);

  useEffect(() => {
    const savedOrder = localStorage.getItem("navItemOrder");
    const items =
      user.role === "admin"
        ? allNavItems
        : allNavItems.filter((item) => permissions.includes(item.path));

    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        const orderedItems = order
          .map((path: string) => items.find((i) => i.path === path))
          .filter(Boolean);
        const remainingItems = items.filter((i) => !order.includes(i.path));
        setNavItems([...orderedItems, ...remainingItems]);
      } catch (e) {
        setNavItems(items);
      }
    } else {
      setNavItems(items);
    }
  }, [user.role, permissions.join(",")]);

  const handleReorder = (path: string, direction: "up" | "down") => {
    setNavItems((prev) => {
      const index = prev.findIndex((i) => i.path === path);
      if (index === -1) return prev;

      const newItems = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < newItems.length) {
        [newItems[index], newItems[targetIndex]] = [
          newItems[targetIndex],
          newItems[index],
        ];
        localStorage.setItem(
          "navItemOrder",
          JSON.stringify(newItems.map((i) => i.path)),
        );
        return newItems;
      }
      return prev;
    });
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <SidebarProvider
      defaultOpen={getInitialSidebarOpen()}
      className="h-screen flex overflow-hidden"
    >
      <Sidebar
        side="left"
        collapsible="icon"
        className="border-r border-sidebar-border/80 shadow-sm"
      >
        <AppSidebarContent
          navItems={navItems}
          isActive={isActive}
          company={company}
          user={user}
          onNavClick={() => {}}
          onReorder={handleReorder}
          theme={theme}
          toggleTheme={toggleTheme}
          handleLogout={handleLogout}
        />
        <SidebarRail />
      </Sidebar>
      <div className="flex min-h-0 min-w-0 flex-1 bg-muted/20">
        {/* Main Content */}
        <main
          className={cn(
            "relative flex-1 overflow-x-hidden",
            isShellManagedRoute ? "overflow-y-hidden" : "overflow-y-auto",
          )}
          style={{
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            scrollbarGutter: "stable both-edges",
          }}
        >
          <div className="sticky top-0 z-40 border-b border-border/70 bg-background/95 px-2 py-2 backdrop-blur md:hidden">
            <div className="flex items-center gap-2">
              <SidebarTrigger
                className="h-9 w-9 rounded-lg border border-border/70 bg-background/90"
                aria-label="Open sidebar"
              />
              <p className="truncate text-sm font-semibold text-foreground">
                {getMobileTitle(location.pathname)}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "mx-auto w-full p-[10px] lg:px-0",

              "h-full max-w-none",
            )}
          >
            <div
              className={cn(
                "h-full min-h-0 rounded-[28px]  sm:p-3 md:p-4",
                isShellManagedRoute &&
                  "border-0 bg-transparent p-0 shadow-none",
              )}
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
