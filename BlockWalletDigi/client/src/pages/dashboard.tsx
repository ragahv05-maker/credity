import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Plus,
  Settings,
  FileText,
  ShieldCheck,
  CheckCircle2,
  MoreHorizontal,
  Filter,
  X,
  Loader2,
  Bell,
  RefreshCw,
  Camera,
  BadgeCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { ShareModal } from "@/components/share-modal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardSkeleton, CredentialCardSkeleton, StatsCardSkeleton } from "@/components/ui/skeletons";
import { ScanQRButton } from "@/components/qr-scanner";
import { ErrorBoundary } from "@/components/error-boundary";
import { TrustScoreCard } from "@/components/trust-score-card";

interface WalletCredential {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  data: any;
  category: string;
  anchorStatus: string;
  hash: string;
  verificationCount: number;
}

interface WalletStats {
  totalCredentials: number;
  byCategory: Record<string, number>;
  totalShares: number;
  activeShares: number;
  totalVerifications: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const categoryFilter = searchParams.get("category");

  const [selectedCred, setSelectedCred] = useState<WalletCredential | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Initialize wallet on mount
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet-init'],
    queryFn: async () => {
      const res = await fetch('/api/wallet/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1 }),
      });
      return res.json();
    },
    staleTime: 60000,
  });

  // Get credentials from wallet
  const { data: credentialsData, isLoading: credentialsLoading } = useQuery({
    queryKey: ['wallet-credentials', categoryFilter],
    queryFn: async () => {
      const url = categoryFilter
        ? `/api/wallet/credentials?userId=1&category=${categoryFilter}`
        : '/api/wallet/credentials?userId=1';
      const res = await fetch(url);
      return res.json();
    },
    enabled: !!walletData?.success,
  });

  // Get notifications
  const { data: notifData } = useQuery({
    queryKey: ['wallet-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/wallet/notifications?userId=1');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const credentials: WalletCredential[] = credentialsData?.credentials || [];
  const stats: WalletStats = walletData?.stats || {};
  const notifications: Notification[] = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;
  const userDID = walletData?.wallet?.did;

  // Quick Access Buttons
  const quickActions = [
    { icon: FileText, label: "My Credentials", href: "/profile" },
    { icon: QrCode, label: "Share via QR", action: () => { if (credentials[0]) { setSelectedCred(credentials[0]); setShareModalOpen(true); } } },
    { icon: Plus, label: "Add Credential", href: "/receive" },
    { icon: BadgeCheck, label: "Trust Preview", href: "/reputation-preview" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  // Category colors
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      academic: "from-blue-600 to-blue-800",
      employment: "from-purple-600 to-purple-800",
      skill: "from-green-600 to-green-800",
      government: "from-red-600 to-red-800",
      medical: "from-pink-600 to-pink-800",
    };
    return colors[category] || "from-gray-600 to-gray-800";
  };

  const isLoading = walletLoading || credentialsLoading;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden p-4 flex justify-between items-center bg-card border-b">
          <h1 className="font-bold text-primary">CredVerse</h1>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
            )}
            <Avatar className="w-8 h-8">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6 pb-24">
          <div className="max-w-md mx-auto space-y-8">

            {/* Profile Card with DID */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-6 shadow-sm border border-border relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium border border-green-100 dark:border-green-800">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </div>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-foreground">John Doe</h2>
                <p className="text-muted-foreground text-sm">
                  {stats.totalCredentials || 0} Credentials • {stats.activeShares || 0} Active Shares
                </p>

                {userDID && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full font-mono max-w-full overflow-hidden">
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span className="truncate">{userDID.slice(0, 20)}...{userDID.slice(-8)}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Trust Score Card */}
            <TrustScoreCard />

            {/* Quick Access Buttons */}
            <div className="grid grid-cols-5 gap-4">
              {quickActions.map((action, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {action.href ? (
                    <Link href={action.href}>
                      <button className="flex flex-col items-center gap-2 w-full group">
                        <div className="w-14 h-14 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center text-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-active:scale-95">
                          <action.icon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{action.label}</span>
                      </button>
                    </Link>
                  ) : (
                    <button
                      onClick={action.action}
                      className="flex flex-col items-center gap-2 w-full group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center text-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-active:scale-95">
                        <action.icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{action.label}</span>
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Filter Header */}
            {categoryFilter && (
              <div className="flex items-center justify-between bg-primary/5 p-3 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium capitalize">Filtering: {categoryFilter}</span>
                </div>
                <Link href="/">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-primary/20">
                    <X className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Credentials List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">
                  {isLoading ? 'Loading...' : `My Credentials (${credentials.length})`}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary h-8 text-xs"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['wallet-credentials'] })}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : credentials.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground text-sm">No credentials yet.</p>
                  <Link href="/receive">
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                      Add Credential
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {credentials.map((cred, i) => (
                    <Link key={cred.id} href={`/credential/${cred.id}`}>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-card p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${getCategoryColor(cred.category)} text-white`}>
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{cred.data?.name || cred.type[1] || 'Credential'}</p>
                          <p className="text-xs text-muted-foreground">{cred.issuer}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={cred.anchorStatus === 'anchored' ? 'default' : 'secondary'} className="text-[10px]">
                            {cred.anchorStatus === 'anchored' ? '⛓ On-chain' : 'Pending'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground capitalize">{cred.category}</span>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Featured Credential */}
            {credentials.length > 0 && !categoryFilter && (
              <div>
                <h3 className="font-semibold text-lg mb-4">Featured Credential</h3>
                <Link href={`/credential/${credentials[0].id}`}>
                  <div className={`bg-gradient-to-br ${getCategoryColor(credentials[0].category)} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:shadow-xl transition-shadow`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />

                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <ShieldCheck className="w-8 h-8 text-white/90" />
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm">
                        {credentials[0].anchorStatus === 'anchored' ? '⛓ Verified' : 'Pending'}
                      </Badge>
                    </div>

                    <div className="relative z-10">
                      <p className="text-white/80 text-xs uppercase tracking-wider mb-1">{credentials[0].issuer}</p>
                      <h4 className="text-xl font-bold">{credentials[0].data?.name || credentials[0].type[1]}</h4>
                      <p className="text-white/80 text-xs mt-4 font-mono">
                        Issued: {new Date(credentials[0].issuanceDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Notifications Preview */}
            {notifications.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Notifications
                    {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>}
                  </h3>
                </div>
                <div className="space-y-2">
                  {notifications.slice(0, 3).map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-lg border text-sm ${notif.read ? 'bg-card' : 'bg-primary/5 border-primary/20'}`}
                    >
                      <p className="font-medium">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{notif.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Share Modal */}
      <ShareModal
        credential={selectedCred as any}
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
      />
    </div>
  );
}
