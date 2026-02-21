import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Cloud,
  Globe,
  Moon,
  LogOut,
  Download,
  Upload,
  Key,
  Fingerprint,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Loader2,
  History,
  Bell,
  Lock,
  Activity as ActivityIcon,
  Calendar,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ActivityItem {
  id: number;
  userId: number;
  type: string;
  description: string;
  timestamp: string;
}

interface WalletStats {
  totalCredentials: number;
  activeShares: number;
  totalVerifications: number;
}

interface WalletStatusData {
  did?: string;
  stats?: WalletStats;
  lastSync?: string;
}

interface NotifData {
  notifications?: any[];
  unreadCount?: number;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Dialog States
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  // Backup/Restore State
  const [backupData, setBackupData] = useState<{
    data: string;
    key: string;
  } | null>(null);
  const [restoreKey, setRestoreKey] = useState("");
  const [restoreData, setRestoreData] = useState("");
  const [copied, setCopied] = useState(false);

  // Preferences State (Persisted in LocalStorage)
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => localStorage.getItem("pref_notifications") !== "false",
  );
  const [shareAlertsEnabled, setShareAlertsEnabled] = useState(
    () => localStorage.getItem("pref_share_alerts") !== "false",
  );
  const [biometricEnabled, setBiometricEnabled] = useState(
    () => localStorage.getItem("pref_biometric") !== "false",
  );

  // Persist preferences
  useEffect(() => {
    localStorage.setItem("pref_notifications", notificationsEnabled.toString());
    localStorage.setItem("pref_share_alerts", shareAlertsEnabled.toString());
    localStorage.setItem("pref_biometric", biometricEnabled.toString());
  }, [notificationsEnabled, shareAlertsEnabled, biometricEnabled]);

  // Get wallet status
  const { data: walletStatus } = useQuery<WalletStatusData>({
    queryKey: ["/api/wallet/status"],
    refetchInterval: 30000,
  });

  // Get notifications count
  const { data: notifData } = useQuery<NotifData>({
    queryKey: ["/api/wallet/notifications"],
  });

  // Get User Activity
  const { data: activities = [] } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity"],
    enabled: activityOpen, // Only fetch when sheet is open
  });

  // Create backup mutation
  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/wallet/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 1 }),
      });
      if (!response.ok) throw new Error("Backup failed");
      return response.json();
    },
    onSuccess: (data) => {
      setBackupData({ data: data.backupData, key: data.backupKey });
      toast({
        title: "Backup Created",
        description: "Save your backup key securely!",
      });
    },
    onError: () => {
      toast({ title: "Backup Failed", variant: "destructive" });
    },
  });

  // Restore backup mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/wallet/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupData: restoreData,
          backupKey: restoreKey,
        }),
      });
      if (!response.ok) throw new Error("Restore failed");
      return response.json();
    },
    onSuccess: (data) => {
      setRestoreDialogOpen(false);
      queryClient.invalidateQueries();
      toast({
        title: "Wallet Restored",
        description: `${data.credentialsRestored} credentials recovered`,
      });
      setRestoreData("");
      setRestoreKey("");
    },
    onError: () => {
      toast({
        title: "Restore Failed",
        description: "Check your backup key",
        variant: "destructive",
      });
    },
  });

  const handleCopyKey = () => {
    if (backupData?.key) {
      navigator.clipboard.writeText(backupData.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadBackup = () => {
    if (!backupData) return;
    const blob = new Blob([backupData.data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credverse-backup-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = () => {
    // Clear any local session data if used
    localStorage.removeItem("wallet_session");
    localStorage.removeItem("did");
    toast({
      title: "Signed Out",
      description: "You have been logged out securely.",
    });
    // Redirect to login (assuming /login exists, or just home)
    setLocation("/");
  };

  const stats = walletStatus?.stats;
  const unreadNotifications = notifData?.unreadCount || 0;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-64 p-6 overflow-y-auto h-screen">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your wallet security, backup, and preferences.
            </p>
          </div>

          {/* Wallet Status Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                Wallet Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.totalCredentials || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Credentials</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.activeShares || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Shares</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.totalVerifications || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Verifications</p>
                </div>
              </div>
              {walletStatus?.did && (
                <div className="mt-4 p-2 bg-secondary/50 rounded text-xs font-mono truncate">
                  DID: {walletStatus.did}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Lock className="w-5 h-5" /> Security & Recovery
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <Fingerprint className="w-4 h-4" /> Biometric Authentication
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use FaceID/TouchID to unlock wallet
                  </p>
                </div>
                <Switch
                  checked={biometricEnabled}
                  onCheckedChange={setBiometricEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Local Encryption</Label>
                  <p className="text-sm text-muted-foreground">
                    AES-256-GCM encryption for all data
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Backup Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Cloud className="w-5 h-5" /> Backup & Sync
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    setBackupDialogOpen(true);
                    backupMutation.mutate();
                  }}
                  disabled={backupMutation.isPending}
                >
                  {backupMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span className="font-medium">Create Backup</span>
                  <span className="text-xs text-muted-foreground">
                    Download encrypted vault
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setRestoreDialogOpen(true)}
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Restore Backup</span>
                  <span className="text-xs text-muted-foreground">
                    Using backup key
                  </span>
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notifications
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadNotifications}
                </Badge>
              )}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Share Access Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when credentials are verified
                  </p>
                </div>
                <Switch
                  checked={shareAlertsEnabled}
                  onCheckedChange={setShareAlertsEnabled}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">New Credential Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when new credentials are received
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Preferences */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Globe className="w-5 h-5" /> Preferences
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="justify-between"
                onClick={() =>
                  toast({
                    title: "Language",
                    description: "Only English is supported in this version.",
                  })
                }
              >
                Language: English
                <Globe className="w-4 h-4 ml-2 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="justify-between"
                onClick={() =>
                  toast({
                    title: "Theme",
                    description: "System theme is currently active.",
                  })
                }
              >
                Theme: System
                <Moon className="w-4 h-4 ml-2 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="pt-4 flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setActivityOpen(true)}
            >
              <History className="w-4 h-4 mr-2" /> View Activity Log
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" /> Wallet Backup Created
            </DialogTitle>
            <DialogDescription>
              Save your backup key securely. You'll need it to restore your
              wallet.
            </DialogDescription>
          </DialogHeader>

          {backupData ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Save this key now!</strong> It cannot be recovered
                  later.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Backup Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={backupData.key}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button size="icon" variant="outline" onClick={handleCopyKey}>
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button className="w-full" onClick={downloadBackup}>
                <Download className="w-4 h-4 mr-2" /> Download Backup File
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" /> Restore Wallet
            </DialogTitle>
            <DialogDescription>
              Enter your backup data and recovery key.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Backup Data</Label>
              <Textarea
                placeholder="Paste your backup data here..."
                value={restoreData}
                onChange={(e) => setRestoreData(e.target.value)}
                className="font-mono text-xs h-24"
              />
            </div>

            <div className="space-y-2">
              <Label>Backup Key</Label>
              <Input
                placeholder="Enter your backup key"
                value={restoreKey}
                onChange={(e) => setRestoreKey(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => restoreMutation.mutate()}
              disabled={
                !restoreData || !restoreKey || restoreMutation.isPending
              }
            >
              {restoreMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Restore Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Log Sheet */}
      <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Activity Log</SheetTitle>
            <SheetDescription>
              Recent actions and events in your wallet.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 h-full pb-10">
            <ScrollArea className="h-[calc(100vh-120px)] pr-4">
              {activities.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-4 pb-4 border-b last:border-0 relative"
                    >
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {activity.description}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                          <ActivityIcon className="w-3 h-3" />
                          <span className="capitalize">
                            {activity.type.replace(/_/g, " ")}
                          </span>
                          <span>•</span>
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
