import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Users,
  Lock,
  Key,
  Activity,
  Save,
  Download,
  Trash2,
} from "lucide-react";

export default function AdminConsole() {
  return (
    <DashboardLayout title="Admin Console">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Team & Security Settings</h2>
            <p className="text-sm text-muted-foreground">
              Manage access control, API keys, and audit logs.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export Logs
            </Button>
            <Button>
              <Users className="mr-2 h-4 w-4" /> Invite Member
            </Button>
          </div>
        </div>

        <Tabs defaultValue="team" className="space-y-6">
          <TabsList>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Team Access
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> Security & MFA
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="h-4 w-4" /> API Keys
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage user roles and permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      {
                        name: "Alice Admin",
                        email: "alice@acme.com",
                        role: "Admin",
                        status: "Active",
                        lastActive: "Just now",
                      },
                      {
                        name: "Bob Recruiter",
                        email: "bob@acme.com",
                        role: "Verifier",
                        status: "Active",
                        lastActive: "2h ago",
                      },
                      {
                        name: "Charlie View",
                        email: "charlie@acme.com",
                        role: "Viewer",
                        status: "Invited",
                        lastActive: "-",
                      },
                    ].map((user, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-background">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === "Active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {user.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.lastActive}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Policies</CardTitle>
                <CardDescription>
                  Configure authentication and session settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">
                      Two-Factor Authentication (2FA)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enforce 2FA for all team members.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Single Sign-On (SSO)</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow login via corporate IDP (Okta, Azure AD).
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">IP Whitelisting</Label>
                    <p className="text-sm text-muted-foreground">
                      Restrict access to specific IP ranges.
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Key Management</CardTitle>
                <CardDescription>
                  Manage keys for API integration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/30 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">
                        sk_live_...9f2a
                      </span>
                      <Badge variant="secondary">Production</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created on Oct 1, 2024
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Roll Key
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" className="w-full border-dashed">
                  <Key className="mr-2 h-4 w-4" /> Generate New API Key
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>
                  Recent actions performed by your team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      action: "Verified Document",
                      user: "Bob Recruiter",
                      time: "2 mins ago",
                      details: "Ref: BLK-2024-001",
                    },
                    {
                      action: "Exported Report",
                      user: "Alice Admin",
                      time: "1 hour ago",
                      details: "November Audit.pdf",
                    },
                    {
                      action: "Failed Login Attempt",
                      user: "Unknown IP",
                      time: "3 hours ago",
                      details: "IP: 192.168.1.1",
                    },
                    {
                      action: "API Key Created",
                      user: "Alice Admin",
                      time: "1 day ago",
                      details: "Dev Environment",
                    },
                  ].map((log, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          by {log.user} • {log.time}
                        </p>
                      </div>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.details}
                      </code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
