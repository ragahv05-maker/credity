import { Link, useLocation } from "wouter";
import {
  Wallet,
  Inbox,
  Shield,
  Plus,
  Settings,
  User,
  CreditCard,
  Moon,
  Sun,
  Link2,
  BarChart3,
  ScanFace,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function Sidebar() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/", icon: Wallet, label: "My Credentials" },
    { href: "/receive", icon: Inbox, label: "Receive" },
    { href: "/id", icon: CreditCard, label: "Digital ID" },
    { href: "/verify", icon: ScanFace, label: "Identity Verification" },
    {
      href: "/reputation-preview",
      icon: BadgeCheck,
      label: "Reputation Preview",
    },
    { href: "/profile", icon: User, label: "Career Profile" },
    { href: "/connections", icon: Link2, label: "Connections" },
    { href: "/connect", icon: Shield, label: "Connect Services" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const categories = [
    { color: "bg-blue-500", label: "Education" },
    { color: "bg-emerald-500", label: "Health" },
    { color: "bg-orange-500", label: "Identity" },
    { color: "bg-purple-500", label: "Finance" },
  ];

  return (
    <div className="w-64 h-screen border-r border-border bg-card flex flex-col hidden md:flex fixed left-0 top-0 z-50 shadow-sm">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-lg tracking-tight text-foreground">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center shadow-sm">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span>CredVerse</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        {/* Primary Action */}
        <Button
          className="w-full justify-center gap-2 h-11 shadow-md transition-all hover:-translate-y-0.5 font-medium"
          asChild
        >
          <Link href="/receive">
            <Plus className="w-4 h-4" />
            New Credential
          </Link>
        </Button>

        {/* Navigation */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground px-3 mb-3 uppercase tracking-wider">
            Menu
          </div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group font-medium",
                location === item.href
                  ? "bg-primary/10 text-primary dark:bg-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  location === item.href
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Categories */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground px-3 mb-3 uppercase tracking-wider">
            Categories
          </div>
          <div className="space-y-1">
            {categories.map((cat, idx) => (
              <Link key={idx} href={`/?category=${cat.label.toLowerCase()}`}>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-black shadow-sm",
                      cat.color,
                    )}
                  />
                  {cat.label}
                </button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border bg-secondary/20 dark:bg-secondary/10">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-background transition-colors cursor-pointer border border-transparent hover:border-border hover:shadow-sm group">
          <div className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
            <img src="https://github.com/shadcn.png" alt="User" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate leading-none mb-1 text-foreground">
              John Doe
            </p>
            <p className="text-[10px] font-mono text-muted-foreground truncate bg-secondary/50 px-1 py-0.5 rounded w-fit">
              0x71C...9A2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
