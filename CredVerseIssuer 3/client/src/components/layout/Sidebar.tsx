import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
// import logo from "@assets/ChatGPT_Image_Oct_22,_2025,_12_35_14_AM_1764878404699.png";
import { Smartphone } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const logo = ""; // Placeholder

  return (
    <div className="w-64 border-r border-border bg-sidebar h-screen flex flex-col fixed left-0 top-0 z-30">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          {/* <img src={logo} alt="CredVerse" className="w-8 h-8 object-contain" /> */}
          <span className="font-heading font-bold text-xl tracking-tight text-sidebar-foreground">CredVerse</span>
        </div>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Platform
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <Icon className="w-4 h-4" />
                {item.label}
              </a>
            </Link>
          );
        })}
        
        <div className="px-3 mt-8 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Demo Views
        </div>
        <Link href="/passport">
          <a target="_blank" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
            <Smartphone className="w-4 h-4" />
            Student Passport
          </a>
        </Link>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="bg-sidebar-accent/50 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            UN
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">University of North</p>
            <p className="text-xs text-muted-foreground truncate">Enterprise Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
