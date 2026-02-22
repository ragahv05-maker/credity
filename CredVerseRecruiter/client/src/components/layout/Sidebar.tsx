import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ScanLine,
  Files,
  Building2,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Insights", href: "/" },
  { icon: ScanLine, label: "Instant Verify", href: "/verify" },
  { icon: Files, label: "Bulk Verification", href: "/bulk" },
  { icon: BarChart3, label: "Claims Dashboard", href: "/claims" },
  { icon: Building2, label: "Issuer Directory", href: "/directory" },
  { icon: Settings, label: "Admin Console", href: "/admin" },
];

export function Sidebar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-gradient-to-b from-sidebar to-sidebar/95 text-sidebar-foreground border-r border-sidebar-border shadow-xl">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border/50 backdrop-blur-sm">
        <div className="relative group">
          <div className="absolute -inset-1 bg-primary/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <ShieldCheck className="relative h-8 w-8 mr-3 text-primary" />
        </div>
        <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">CredVerse</span>
      </div>

      <ScrollArea className="flex-1 py-6">
        <nav className="grid gap-2 px-4">
          {sidebarItems.map((item, index) => {
            const isActive = location === item.href;
            return (
              <Link key={index} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer group relative overflow-hidden",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:pl-4"
                  )}
                  onClick={() => setOpen(false)}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20"></div>
                  )}
                  <item.icon className={cn("h-4 w-4 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border/50 bg-sidebar/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/50 shadow-inner">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-accent flex items-center justify-center shadow-lg border border-white/10">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">Acme Corp</span>
            <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-medium">Enterprise Plan</span>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 mt-2 transition-colors">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-sidebar-border bg-sidebar text-sidebar-foreground">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
