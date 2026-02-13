import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./ui/button";
import { checkSessionExpiry, logout, getCurrentUser } from "@/pages/Auth";
import { toast } from "sonner";
import {
  LayoutDashboard,
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
  X,
  CreditCard,
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
import { ChevronRight } from "lucide-react";

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
}: {
  navItems: { path: string; icon: React.ElementType; label: string }[];
  isActive: (path: string) => boolean;
  company: any;
  user: any;
  onNavClick: () => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
    onNavClick();
  };

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border/40 p-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 group-data-[collapsible=icon]:mx-auto">
            {company?.logo ? (
              <img
                src={company.logo}
                alt="Logo"
                className="h-8 w-8 object-contain rounded-md"
              />
            ) : (
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <h2 className="font-bold text-sidebar-foreground truncate text-base tracking-tight">
              {company?.name || "Invoice Mitra"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0 h-8 w-8 rounded-md"
            onClick={() => isMobile && setOpenMobile(false)}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                if (item.label === "Bills") {
                  return (
                    <Collapsible
                      key={item.path}
                      asChild
                      defaultOpen={active}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.label}
                            size="default"
                            className={cn(
                              "rounded-md px-3 h-10 transition-colors",
                              active 
                                ? "bg-primary text-primary-foreground font-medium" 
                                : "hover:bg-sidebar-accent text-sidebar-foreground/70"
                            )}
                          >
                            <Icon className="size-4 shrink-0" />
                            <span className="ml-2">{item.label}</span>
                            <ChevronRight className={cn(
                              "ml-auto transition-transform duration-200 size-3.5 opacity-50",
                              "group-data-[state=open]/collapsible:rotate-90"
                            )} />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="ml-4 border-l border-sidebar-border pl-2 space-y-0.5 mt-1">
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location.pathname === "/bills"} className="h-8 rounded-sm">
                                <Link to="/bills" onClick={handleNavClick}>
                                  <span className="text-sm">All Bills</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location.pathname === "/bills/gst"} className="h-8 rounded-sm">
                                <Link to="/bills/gst" onClick={handleNavClick}>
                                  <span className="text-sm">GST Bill</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location.pathname === "/bills/non-gst"} className="h-8 rounded-sm">
                                <Link to="/bills/non-gst" onClick={handleNavClick}>
                                  <span className="text-sm">Non-GST Bill</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location.pathname === "/bills/international"} className="h-8 rounded-sm">
                                <Link to="/bills/international" onClick={handleNavClick}>
                                  <span className="text-sm">International Bill</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location.pathname === "/sample-bill"} className="h-8 rounded-sm">
                                <Link to="/sample-bill" onClick={handleNavClick}>
                                  <span className="text-sm">Sample Bill</span>
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
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      size="default"
                      className={cn(
                        "rounded-md px-3 h-10 transition-colors",
                        active 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "hover:bg-sidebar-accent text-sidebar-foreground/70"
                      )}
                    >
                      <Link to={item.path} onClick={handleNavClick}>
                        <Icon className="size-4 shrink-0" />
                        <span className="ml-2">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/40 p-4 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate uppercase tracking-wider">{user.role}</p>
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
    { path: "/bills", icon: FileText, label: "Bills" },
    { path: "/sample-bill", icon: FileStack, label: "Sample" },
    { path: "/purchases", icon: ShoppingCart, label: "Buy" },
    { path: "/returns", icon: RotateCcw, label: "Returns" },
    { path: "/passbook", icon: BookOpen, label: "Passbook" },
    { path: "/expenses", icon: DollarSign, label: "Expenses" },
    { path: "/products", icon: Package, label: "Stock" },
    { path: "/clients", icon: Users, label: "Clients" },
    { path: "/vendors", icon: Store, label: "Vendors" },
    { path: "/files", icon: FolderOpen, label: "Files" },
    { path: "/notes", icon: StickyNote, label: "Notes" },
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

    // Only update if the items list or user role has changed to avoid unnecessary re-renders
    const currentPaths = navItems.map((i) => i.path).join(",");

    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        const orderedItems = order
          .map((path: string) => items.find((i) => i.path === path))
          .filter(Boolean);
        const newItems = items.filter((i) => !order.includes(i.path));
        const finalItems = [...orderedItems, ...newItems];

        if (currentPaths !== finalItems.map((i) => i.path).join(",")) {
          setNavItems(finalItems);
        }
      } catch (e) {
        if (currentPaths !== items.map((i) => i.path).join(",")) {
          setNavItems(items);
        }
      }
    } else {
      if (currentPaths !== items.map((i) => i.path).join(",")) {
        setNavItems(items);
      }
    }
  }, [user.role, permissions]);

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
        />
        <SidebarRail />
      </Sidebar>
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 h-14 shrink-0 bg-background/95 backdrop-blur-sm border-b border-border/50 flex items-center justify-between px-3 sm:px-4 md:px-6 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <SidebarTrigger
              className="-ml-1 h-9 w-9 sm:h-10 sm:w-10"
              aria-label="Toggle sidebar"
            />
            <div className="min-w-0 flex-1 md:hidden">
              <h1 className="font-semibold text-base text-foreground truncate">
                {company?.name || "Invoice Mitra"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              {theme === "light" ? (
                <Moon className="size-4 sm:size-5" />
              ) : (
                <Sun className="size-4 sm:size-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Logout"
              className="h-9 w-9 sm:h-10 sm:w-10 text-destructive"
            >
              <LogOut className="size-4 sm:size-5" />
            </Button>
          </div>
        </header>
        {/* Main Content */}
        <main
          className="relative flex-1 overflow-y-auto overflow-x-hidden pb-20 sm:pb-6"
          style={{
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full py-4 sm:py-6 safe-area-inset-bottom">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
