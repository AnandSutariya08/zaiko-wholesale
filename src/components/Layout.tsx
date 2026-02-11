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
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";

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
      <SidebarHeader className="border-b border-sidebar-border/60 p-4 pb-3 bg-gradient-to-b from-sidebar-accent/30 to-transparent">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {company?.logo ? (
              <img
                src={company.logo}
                alt="Logo"
                className="h-11 w-11 object-contain rounded-xl border border-sidebar-border/80 bg-sidebar-accent/50 p-1.5 shadow-sm ring-1 ring-sidebar-border/50"
              />
            ) : (
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center border border-sidebar-border/80">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <h2 className="font-bold text-sidebar-foreground truncate text-base tracking-tight">
              {company?.name || "BillEasy"}
            </h2>
            <p className="text-xs text-sidebar-foreground/60 truncate mt-0.5 font-medium">
              {user.name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0 h-9 w-9 rounded-lg hover:bg-sidebar-accent"
            onClick={() => isMobile && setOpenMobile(false)}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      size="lg"
                      className={cn(
                        "rounded-lg px-3 h-11 transition-all duration-200",
                        "group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!rounded-lg",
                        active && "bg-primary/15 text-primary font-semibold shadow-md ring-2 ring-primary/30 group-data-[collapsible=icon]:ring-2"
                      )}
                    >
                      <Link to={item.path} onClick={handleNavClick}>
                        <Icon className={cn("size-5 shrink-0", active && "text-primary")} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60 p-3 bg-gradient-to-t from-sidebar-accent/20 to-transparent group-data-[collapsible=icon]:hidden">
        <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2 border border-sidebar-border/50">
          <p className="text-[11px] text-sidebar-foreground/60 font-medium">
            <kbd className="px-1.5 py-0.5 rounded bg-sidebar-background/80 text-[10px] font-mono">⌘</kbd>
            <span className="mx-1">+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-sidebar-background/80 text-[10px] font-mono">B</kbd>
            <span className="ml-1.5">Toggle</span>
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
    { path: "/files", icon: FolderOpen, label: "Files" },
    { path: "/notes", icon: StickyNote, label: "Notes" },
    { path: "/ai-agent", icon: Sparkles, label: "AI" },
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
