import { Link, useLocation } from "wouter";
import { Wallet, User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function Nav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Wallet, label: "Wallet" },
    { href: "/connect", icon: User, label: "Connect" },
    // { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-auto lg:w-64 lg:h-screen lg:right-auto border-t lg:border-t-0 lg:border-r border-white/10 bg-background/80 backdrop-blur-xl z-50">
      <div className="flex lg:flex-col items-center justify-between p-4 lg:p-6 h-full">
        <div className="hidden lg:flex items-center gap-3 w-full mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
             <Wallet className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight text-white">BlockCred</h1>
            <p className="text-xs text-muted-foreground">Secure Wallet</p>
          </div>
        </div>

        <div className="flex lg:flex-col w-full justify-around lg:justify-start gap-1 lg:gap-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-[0_0_15px_-3px_var(--color-primary)]" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}>
                  <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "fill-current")} />
                  <span className="hidden lg:block font-medium">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:block mt-auto w-full">
          <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/50 to-transparent border border-white/5 mb-4">
            <p className="text-xs text-muted-foreground mb-2">Wallet Status</p>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </div>
          </div>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Disconnect</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
