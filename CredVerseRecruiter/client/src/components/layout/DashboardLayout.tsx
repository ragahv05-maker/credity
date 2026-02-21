import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({
  children,
  title = "Dashboard",
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
