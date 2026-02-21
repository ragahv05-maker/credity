import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  MoreHorizontal,
  Shield,
  User,
  Trash2,
  Mail,
  Loader2,
  UserCog,
  Clock,
  Activity,
  FileText,
  LogIn,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Issuer" | "Viewer";
  status: "Active" | "Pending" | "Inactive";
  invitedAt: string;
  joinedAt: string | null;
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  entityType: string;
  timestamp: string;
  ipAddress: string;
}

export default function Team() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [activityMember, setActivityMember] = useState<TeamMember | null>(null);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Viewer" as const,
  });

  // Fetch team members
  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: async () => {
      const response = await fetch("/api/v1/team", {
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });
      if (!response.ok) throw new Error("Failed to fetch team");
      return response.json();
    },
  });

  // Fetch activity logs for a user
  const { data: activityLogs = [], isLoading: isLoadingActivity } = useQuery<
    ActivityLog[]
  >({
    queryKey: ["activity-logs", activityMember?.id],
    queryFn: async () => {
      const response = await fetch("/api/v1/activity-logs", {
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isActivityOpen,
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/v1/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": (import.meta as any).env?.VITE_API_KEY || "",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to invite");
      }
      return response.json();
    },
    onSuccess: (data) => {
      const emailNote = data._emailSent
        ? "An invitation email has been sent."
        : "Member added (email service not configured - invite manually).";
      toast({ title: "Invitation sent", description: emailNote });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setIsInviteOpen(false);
      setFormData({ name: "", email: "", role: "Viewer" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const response = await fetch(`/api/v1/team/${id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": (import.meta as any).env?.VITE_API_KEY || "",
        },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error("Failed to update role");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "Member role has been changed.",
      });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/team/${id}`, {
        method: "DELETE",
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });
      if (!response.ok) throw new Error("Failed to remove member");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "Team member has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });

  // Resend invite mutation
  const resendMutation = useMutation({
    mutationFn: async (member: TeamMember) => {
      const response = await fetch("/api/v1/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": (import.meta as any).env?.VITE_API_KEY || "",
        },
        body: JSON.stringify({
          name: member.name,
          email: member.email,
          role: member.role,
        }),
      });
      if (!response.ok) throw new Error("Failed to resend");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation resent",
        description: "A new invitation email has been sent.",
      });
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleViewActivity = (member: TeamMember) => {
    setActivityMember(member);
    setIsActivityOpen(true);
  };

  const getActivityIcon = (entityType: string) => {
    switch (entityType) {
      case "credential":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "team":
        return <User className="h-4 w-4 text-green-500" />;
      case "template":
        return <FileText className="h-4 w-4 text-purple-500" />;
      case "settings":
        return <LogIn className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">
              Team & Governance
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage access control and roles for your organization.
            </p>
          </div>
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization. They'll receive
                  an email with a link to accept.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@university.edu"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">
                        <div className="flex items-center">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin - Full access
                        </div>
                      </SelectItem>
                      <SelectItem value="Issuer">
                        <div className="flex items-center">
                          <UserCog className="mr-2 h-4 w-4" />
                          Issuer - Can issue credentials
                        </div>
                      </SelectItem>
                      <SelectItem value="Viewer">
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          Viewer - Read only access
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => inviteMutation.mutate(formData)}
                  disabled={
                    inviteMutation.isPending ||
                    !formData.name ||
                    !formData.email
                  }
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Activity Log Sheet */}
        <Sheet open={isActivityOpen} onOpenChange={setIsActivityOpen}>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Activity Log</SheetTitle>
              <SheetDescription>
                {activityMember
                  ? `Viewing activity for ${activityMember.name}`
                  : "All team activity"}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {isLoadingActivity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-4">
                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="mt-1">
                          {getActivityIcon(log.entityType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{log.action}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {log.details}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(log.timestamp)}
                            </span>
                            <span>{log.userName}</span>
                            <span className="font-mono">{log.ipAddress}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Role Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Admins
              </CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter((m) => m.role === "Admin").length}
              </div>
              <p className="text-xs text-muted-foreground">Full access users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Issuers
              </CardTitle>
              <UserCog className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter((m) => m.role === "Issuer").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Can issue credentials
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Invites
              </CardTitle>
              <Mail className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter((m) => m.status === "Pending").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting acceptance
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              People with access to this CredVerse tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                        />
                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-none">
                          {member.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {member.joinedAt
                            ? `Joined ${formatDate(member.joinedAt)}`
                            : `Invited ${formatDate(member.invitedAt)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          updateRoleMutation.mutate({
                            id: member.id,
                            role: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Issuer">Issuer</SelectItem>
                          <SelectItem value="Viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge
                        variant="outline"
                        className={
                          member.status === "Active"
                            ? "text-green-600 border-green-200 bg-green-50"
                            : member.status === "Pending"
                              ? "text-amber-600 border-amber-200 bg-amber-50"
                              : "text-gray-600 border-gray-200"
                        }
                      >
                        {member.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewActivity(member)}
                          >
                            <Activity className="mr-2 h-4 w-4" />
                            View Activity Log
                          </DropdownMenuItem>
                          {member.status === "Pending" && (
                            <DropdownMenuItem
                              onClick={() => resendMutation.mutate(member)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Invitation
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => removeMutation.mutate(member.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
