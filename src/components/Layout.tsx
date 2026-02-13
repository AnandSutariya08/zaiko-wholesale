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
      <SidebarHeader className="border-b border-sidebar-border/40 p-5 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0 group-data-[collapsible=icon]:mx-auto">
            {company?.logo ? (
              <img
                src={company.logo}
                alt="Logo"
                className="h-10 w-10 object-contain rounded-lg border border-primary/20 bg-background shadow-sm transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <h2 className="font-bold text-sidebar-foreground truncate text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              {company?.name || "BillEasy"}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[11px] text-sidebar-foreground/50 truncate font-medium uppercase tracking-wider">
                {user.name}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0 h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
            onClick={() => isMobile && setOpenMobile(false)}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4 space-y-1">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
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
                            size="lg"
                            className={cn(
                              "rounded-xl px-4 h-12 transition-all duration-300 group-hover/collapsible:translate-x-1",
                              active 
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-semibold" 
                                : "hover:bg-primary/5 text-sidebar-foreground/70 hover:text-primary"
                            )}
                          >
                            <Icon className={cn("size-5 shrink-0 transition-transform duration-300", active ? "text-primary-foreground" : "group-hover/collapsible:scale-110")} />
                            <span className="font-medium ml-1">{item.label}</span>
                            <ChevronRight className={cn(
                              "ml-auto transition-transform duration-300 size-4 opacity-50",
                              "group-data-[state=open]/collapsible:rotate-90"
                            )} />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down">
                          <SidebarMenuSub className="ml-4 border-l border-primary/20 pl-2 space-y-1 mt-1">
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location.pathname === "/bills"} className="h-9 transition-colors hover:bg-primary/5 rounded-md">
                                <Link to="/bills" onClick={handleNavClick}>
                                  <span className="text-sm">All Bills</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location.pathname === "/bills/gst"} className="h-9 transition-colors hover:bg-primary/5 rounded-md">
                                <Link to="/bills/gst" onClick={handleNavClick}>
                                  <span className="text-sm">GST Bill</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location.pathname === "/bills/non-gst"} className="h-9 transition-colors hover:bg-primary/5 rounded-md">
                                <Link to="/bills/non-gst" onClick={handleNavClick}>
                                  <span className="text-sm">Non-GST Bill</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location.pathname === "/sample-bill"} className="h-9 transition-colors hover:bg-primary/5 rounded-md">
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
                      size="lg"
                      className={cn(
                        "rounded-xl px-4 h-12 transition-all duration-300 hover:translate-x-1",
                        active 
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-semibold" 
                          : "hover:bg-primary/5 text-sidebar-foreground/70 hover:text-primary"
                      )}
                    >
                      <Link to={item.path} onClick={handleNavClick}>
                        <Icon className={cn("size-5 shrink-0 transition-transform duration-300", active ? "text-primary-foreground" : "group-hover:scale-110")} />
                        <span className="font-medium ml-1">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/40 p-4 bg-gradient-to-t from-primary/5 to-transparent group-data-[collapsible=icon]:hidden">
        <div className="rounded-xl bg-primary/5 px-4 py-3 border border-primary/10 backdrop-blur-sm shadow-inner">
          <div className="flex items-center gap-2 mb-1.5">
             <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
             <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Shortcut</p>
          </div>
          <p className="text-[11px] text-sidebar-foreground/60 font-medium flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded-md bg-background border border-sidebar-border/50 text-[10px] font-mono shadow-sm">⌘</kbd>
            <span className="opacity-40">+</span>
            <kbd className="px-2 py-0.5 rounded-md bg-background border border-sidebar-border/50 text-[10px] font-mono shadow-sm">B</kbd>
            <span className="ml-1 opacity-70">to Sidebar</span>
          </p>
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
  const permissions = user.role === 'admin' ? [] : (localStorage.getItem('userPermissions')?.split(',') || []);
  console.log("--here--");

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
    const savedOrder = localStorage.getItem('navItemOrder');
    const items = user.role === 'admin'
      ? allNavItems
      : allNavItems.filter(item => permissions.includes(item.path));

    // Only update if the items list or user role has changed to avoid unnecessary re-renders
    const currentPaths = navItems.map(i => i.path).join(',');

    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        const orderedItems = order.map((path: string) => items.find(i => i.path === path)).filter(Boolean);
        const newItems = items.filter(i => !order.includes(i.path));
        const finalItems = [...orderedItems, ...newItems];

        if (currentPaths !== finalItems.map(i => i.path).join(',')) {
          setNavItems(finalItems);
        }
      } catch (e) {
        if (currentPaths !== items.map(i => i.path).join(',')) {
          setNavItems(items);
        }
      }
    } else {
      if (currentPaths !== items.map(i => i.path).join(',')) {
        setNavItems(items);
      }
    }
  }, [user.role, permissions]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <SidebarProvider defaultOpen={getInitialSidebarOpen()} className="h-screen flex overflow-hidden">
      <Sidebar side="left" collapsible="icon" className="border-r border-sidebar-border/80 shadow-sm">
        <AppSidebarContent
          navItems={navItems}
          isActive={isActive}
          company={company}
          user={user}
          onNavClick={() => { }}
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
              <h1 className="font-semibold text-base text-foreground truncate">{company?.name || "BillEasy"}</h1>
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
              {theme === "light" ? <Moon className="size-4 sm:size-5" /> : <Sun className="size-4 sm:size-5" />}
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
          className="relative flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
