import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Shield,
  Palette,
  Key,
  Webhook,
  Trash2,
  Save,
  Loader2,
  Moon,
  Sun,
  Monitor,
  Mail,
  Smartphone,
  Lock,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [notifications, setNotifications] = useState({
    emailCredentials: true,
    emailVerifications: false,
    pushAlerts: true,
    weeklyReport: true,
    smsAlerts: false,
  });

  const [security, setSecurity] = useState({
    twoFactor: true,
    sessionTimeout: "30",
    ipWhitelist: false,
  });

  const [preferences, setPreferences] = useState({
    theme: "system",
    language: "en",
    timezone: "Asia/Kolkata",
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText("cv_live_sk_1234567890abcdef");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast({ title: "API key copied", description: "Key copied to clipboard." });
  };

  const handleRotateApiKey = () => {
    toast({
      title: "API key rotated",
      description:
        "A new API key has been generated. Update your integrations.",
      variant: "destructive",
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">
            Settings
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure your account preferences and integrations.
          </p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Notifications
                  </h4>
                  <div className="space-y-3 ml-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Credential Issuance</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified when credentials are issued
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailCredentials}
                        onCheckedChange={(c) =>
                          setNotifications({
                            ...notifications,
                            emailCredentials: c,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Verification Alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Notifications for credential verifications
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailVerifications}
                        onCheckedChange={(c) =>
                          setNotifications({
                            ...notifications,
                            emailVerifications: c,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Weekly Report</p>
                        <p className="text-sm text-muted-foreground">
                          Summary of weekly activity
                        </p>
                      </div>
                      <Switch
                        checked={notifications.weeklyReport}
                        onCheckedChange={(c) =>
                          setNotifications({
                            ...notifications,
                            weeklyReport: c,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Push & SMS Notifications
                  </h4>
                  <div className="space-y-3 ml-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Push Alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Browser push notifications
                        </p>
                      </div>
                      <Switch
                        checked={notifications.pushAlerts}
                        onCheckedChange={(c) =>
                          setNotifications({ ...notifications, pushAlerts: c })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">SMS Alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Critical alerts via SMS
                        </p>
                      </div>
                      <Switch
                        checked={notifications.smsAlerts}
                        onCheckedChange={(c) =>
                          setNotifications({ ...notifications, smsAlerts: c })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Protect your account with additional security measures.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Lock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Add extra security with 2FA
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {security.twoFactor && (
                      <Badge className="bg-green-100 text-green-700">
                        Enabled
                      </Badge>
                    )}
                    <Switch
                      checked={security.twoFactor}
                      onCheckedChange={(c) =>
                        setSecurity({ ...security, twoFactor: c })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Session Timeout</Label>
                  <Select
                    value={security.sessionTimeout}
                    onValueChange={(v) =>
                      setSecurity({ ...security, sessionTimeout: v })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out after inactivity
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">IP Whitelist</p>
                    <p className="text-sm text-muted-foreground">
                      Restrict access to specific IPs
                    </p>
                  </div>
                  <Switch
                    checked={security.ipWhitelist}
                    onCheckedChange={(c) =>
                      setSecurity({ ...security, ipWhitelist: c })
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Display Preferences
                </CardTitle>
                <CardDescription>
                  Customize your interface and regional settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "light", icon: Sun, label: "Light" },
                      { value: "dark", icon: Moon, label: "Dark" },
                      { value: "system", icon: Monitor, label: "System" },
                    ].map((theme) => (
                      <Button
                        key={theme.value}
                        variant={
                          preferences.theme === theme.value
                            ? "default"
                            : "outline"
                        }
                        className="flex flex-col gap-2 h-auto py-4"
                        onClick={() =>
                          setPreferences({ ...preferences, theme: theme.value })
                        }
                      >
                        <theme.icon className="h-5 w-5" />
                        {theme.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(v) =>
                      setPreferences({ ...preferences, language: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                      <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                      <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Timezone</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(v) =>
                      setPreferences({ ...preferences, timezone: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">
                        India Standard Time (IST)
                      </SelectItem>
                      <SelectItem value="America/New_York">
                        Eastern Time (ET)
                      </SelectItem>
                      <SelectItem value="Europe/London">
                        Greenwich Mean Time (GMT)
                      </SelectItem>
                      <SelectItem value="Asia/Singapore">
                        Singapore Time (SGT)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Manage your API keys for third-party integrations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Live API Key</p>
                      <p className="text-sm text-muted-foreground">
                        For production use
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value="cv_live_sk_••••••••••••••••"
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyApiKey}
                    >
                      {copiedKey ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRotateApiKey}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last used: 2 hours ago • Created: Jan 15, 2024
                  </p>
                </div>

                <div className="p-4 border rounded-lg border-dashed">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Test API Key</p>
                      <p className="text-sm text-muted-foreground">
                        For development only
                      </p>
                    </div>
                    <Badge variant="outline">Test Mode</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Input
                      value="cv_test_sk_demo12345"
                      readOnly
                      className="font-mono"
                    />
                    <Button variant="outline" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Webhook className="h-4 w-4" />
                    Webhook Endpoints
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    No webhooks configured. Add a webhook to receive real-time
                    events.
                  </p>
                  <Button variant="outline">Add Webhook</Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 mt-6">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions that affect your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently remove your account and all data
                    </p>
                  </div>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
