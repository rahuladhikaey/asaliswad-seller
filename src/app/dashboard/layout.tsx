"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@shared/utils/supabaseClient";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Receipt, 
  Package, 
  Truck,
  BarChart3,
  Bell,
  Settings, 
  HelpCircle,
  LogOut, 
  Menu, 
  X,
  User
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sellerName, setSellerName] = useState("Seller");
  const [sellerEmail, setSellerEmail] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setSellerName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Seller");
        setSellerEmail(user.email || "");
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/dashboard/products", icon: ShoppingBag },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Orders", href: "/dashboard/orders", icon: Receipt },
    { name: "Shipping", href: "/dashboard/shipping", icon: Truck },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
    { name: "Support", href: "/dashboard/support", icon: HelpCircle },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-foreground/[0.02] border-r border-foreground/[0.06] backdrop-blur-xl transition-all duration-300 lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Logo Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-foreground/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-sm">AS</span>
            <span className="text-lg font-black tracking-tight">Asali Swad</span>
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-text-muted hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                  isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-text-secondary hover:bg-foreground/[0.04] hover:text-text-primary"
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="border-t border-foreground/[0.06] p-4 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate">{sellerName}</p>
              <p className="text-[10px] font-bold text-text-muted truncate">{sellerEmail}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-2xl border border-rose-500/10 px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-500/5 transition-all"
          >
            <LogOut size={18} />
            Logout Portal
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-20 items-center justify-between border-b border-foreground/[0.06] bg-background/50 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border border-foreground/[0.08] p-2 text-text-secondary hover:bg-foreground/[0.04] lg:hidden"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-black tracking-tight">Seller Dashboard</h2>
          </div>

          <div className="flex items-center gap-4">
            <DarkModeToggle />
          </div>
        </header>

        {/* Page Children */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-foreground/[0.01]">
          {children}
        </main>
      </div>
    </div>
  );
}
