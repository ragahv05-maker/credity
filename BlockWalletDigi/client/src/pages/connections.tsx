/**
 * Platform Connections Page
 * Manages platform connections as defined in PRD Section 5.1 Feature 5
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Link2,
    Shield,
    CheckCircle2,
    XCircle,
    Clock,
    MoreVertical,
    ExternalLink,
    Trash2,
    Settings,
    Bell,
    AlertCircle,
    RefreshCw,
    Loader2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface PlatformConnection {
    id: string;
    platformName: string;
    platformLogo?: string;
    status: 'active' | 'pending' | 'revoked' | 'expired';
    sharedCredentials: string[];
    permissions: {
        shareIdentity: boolean;
        shareCredentials: boolean;
        shareActivity: boolean;
    };
    connectedAt: string;
    lastAccessedAt: string | null;
    accessCount: number;
}

interface ConnectionRequest {
    id: string;
    platformName: string;
    requestedCredentials: string[];
    requestedPermissions: string[];
    status: string;
    createdAt: string;
    expiresAt: string;
}

export default function PlatformConnections() {
    const queryClient = useQueryClient();
    const [selectedConnection, setSelectedConnection] = useState<PlatformConnection | null>(null);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
    const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);

    // Fetch connections
    const { data: connectionsData, isLoading } = useQuery({
        queryKey: ['platform-connections'],
        queryFn: async () => {
            const res = await fetch('/api/connections?userId=1');
            return res.json();
        },
    });

    // Fetch pending requests
    const { data: requestsData } = useQuery({
        queryKey: ['connection-requests'],
        queryFn: async () => {
            const res = await fetch('/api/connections/requests?userId=1');
            return res.json();
        },
    });

    // Approve request mutation
    const approveMutation = useMutation({
        mutationFn: async (requestId: string) => {
            const res = await fetch(`/api/connections/requests/${requestId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-connections'] });
            queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
        }
    });

    // Deny request mutation
    const denyMutation = useMutation({
        mutationFn: async (requestId: string) => {
            const res = await fetch(`/api/connections/requests/${requestId}/deny`, {
                method: 'POST'
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
        }
    });

    // Disconnect mutation
    const disconnectMutation = useMutation({
        mutationFn: async (connectionId: string) => {
            const res = await fetch(`/api/connections/${connectionId}`, {
                method: 'DELETE'
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-connections'] });
            setShowDisconnectDialog(false);
            setSelectedConnection(null);
        }
    });

    const connections: PlatformConnection[] = connectionsData?.connections || [];
    const requests: ConnectionRequest[] = requestsData?.requests || [];
    const stats = connectionsData?.stats || { total: 0, active: 0, totalAccessCount: 0 };

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />

            <div className="flex-1 md:ml-64 p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Platform Connections</h1>
                            <p className="text-muted-foreground">Manage apps and services connected to your wallet</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['platform-connections'] })}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-card p-4 rounded-xl border">
                            <div className="text-2xl font-bold text-primary">{stats.active}</div>
                            <div className="text-sm text-muted-foreground">Active</div>
                        </div>
                        <div className="bg-card p-4 rounded-xl border">
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-sm text-muted-foreground">Total</div>
                        </div>
                        <div className="bg-card p-4 rounded-xl border">
                            <div className="text-2xl font-bold text-green-600">{stats.totalAccessCount}</div>
                            <div className="text-sm text-muted-foreground">Accesses</div>
                        </div>
                    </div>

                    {/* Pending Requests */}
                    {requests.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-amber-500" />
                                <h2 className="font-semibold">Pending Requests ({requests.length})</h2>
                            </div>

                            {requests.map((request) => (
                                <div
                                    key={request.id}
                                    className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
                                                <Link2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{request.platformName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Wants access to: {request.requestedCredentials.join(', ')}
                                                </p>
                                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                    Expires in {Math.round((new Date(request.expiresAt).getTime() - Date.now()) / 3600000)}h
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => denyMutation.mutate(request.id)}
                                                disabled={denyMutation.isPending}
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />
                                                Deny
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => approveMutation.mutate(request.id)}
                                                disabled={approveMutation.isPending}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {approveMutation.isPending ? (
                                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                                )}
                                                Approve
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* Active Connections */}
                    <div className="space-y-3">
                        <h2 className="font-semibold">Connected Platforms</h2>

                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : connections.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No connected platforms yet</p>
                                <p className="text-sm">Platforms will appear here once connected</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {connections.map((connection, idx) => (
                                    <motion.div
                                        key={connection.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-card border rounded-xl p-4"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Shield className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium flex items-center gap-2">
                                                        {connection.platformName}
                                                        <Badge
                                                            variant={connection.status === 'active' ? 'default' : 'secondary'}
                                                            className="text-[10px]"
                                                        >
                                                            {connection.status}
                                                        </Badge>
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {connection.sharedCredentials.length} credentials shared •
                                                        {connection.accessCount} accesses
                                                    </p>
                                                    {connection.lastAccessedAt && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Last access: {new Date(connection.lastAccessedAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedConnection(connection);
                                                        setShowPermissionsDialog(true);
                                                    }}>
                                                        <Settings className="w-4 h-4 mr-2" />
                                                        Manage Permissions
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        View Activity
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => {
                                                            setSelectedConnection(connection);
                                                            setShowDisconnectDialog(true);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Disconnect
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {/* Disconnect Confirmation Dialog */}
            <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            Disconnect Platform
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to disconnect from {selectedConnection?.platformName}?
                            They will no longer be able to access your credentials.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDisconnectDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedConnection && disconnectMutation.mutate(selectedConnection.id)}
                            disabled={disconnectMutation.isPending}
                        >
                            {disconnectMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Disconnect
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Permissions Dialog */}
            <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Permissions</DialogTitle>
                        <DialogDescription>
                            Control what {selectedConnection?.platformName} can access
                        </DialogDescription>
                    </DialogHeader>

                    {selectedConnection && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Share Identity</p>
                                    <p className="text-sm text-muted-foreground">Allow access to your verified identity</p>
                                </div>
                                <Switch defaultChecked={selectedConnection.permissions.shareIdentity} />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Share Credentials</p>
                                    <p className="text-sm text-muted-foreground">Allow access to selected credentials</p>
                                </div>
                                <Switch defaultChecked={selectedConnection.permissions.shareCredentials} />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Share Activity</p>
                                    <p className="text-sm text-muted-foreground">Allow access to your activity history</p>
                                </div>
                                <Switch defaultChecked={selectedConnection.permissions.shareActivity} />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => setShowPermissionsDialog(false)}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
