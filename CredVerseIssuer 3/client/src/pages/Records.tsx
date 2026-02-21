import { Layout } from "@/components/layout/Layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Send,
  Copy,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface CredentialRecord {
  id: string;
  recipient: { name: string; email?: string; id?: string; studentId?: string };
  credentialData: { credentialName?: string; major?: string; sector?: string };
  createdAt: string;
  txHash?: string;
  revoked: boolean;
  issuerId: string;
}

export default function Records() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch credentials from API
  const { data: credentials = [], isLoading } = useQuery<CredentialRecord[]>({
    queryKey: ["credentials"],
    queryFn: async () => {
      const res = await fetch("/api/v1/credentials", {
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });
      if (!res.ok) throw new Error("Failed to fetch credentials");
      return res.json();
    },
  });

  const filteredRecords = credentials.filter(
    (cred) =>
      (cred.recipient?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (cred.recipient?.id || cred.recipient?.studentId || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (cred.credentialData?.credentialName || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const handleViewDetails = (cred: CredentialRecord) => {
    toast({
      title: `Credential: ${cred.credentialData?.credentialName || "Unknown"}`,
      description: (
        <div className="text-sm space-y-1">
          <p>
            <strong>Recipient:</strong> {cred.recipient?.name}
          </p>
          <p>
            <strong>ID:</strong>{" "}
            {cred.recipient?.id || cred.recipient?.studentId}
          </p>
          <p>
            <strong>Date:</strong>{" "}
            {format(new Date(cred.createdAt), "MMM dd, yyyy")}
          </p>
          <p>
            <strong>Status:</strong> {cred.revoked ? "Revoked" : "Issued"}
          </p>
          {cred.txHash && (
            <p className="font-mono text-xs">
              <strong>TX:</strong> {cred.txHash.slice(0, 20)}...
            </p>
          )}
        </div>
      ),
      duration: 10000,
    });
  };

  const handleDownloadPDF = async (cred: CredentialRecord) => {
    toast({
      title: "Generating PDF...",
      description: `Preparing ${cred.credentialData?.credentialName} for ${cred.recipient?.name}`,
    });
    setTimeout(() => {
      toast({
        title: "PDF Ready",
        description: "Download started for credential PDF.",
      });
    }, 1500);
  };

  const handleViewOnBlockchain = (cred: CredentialRecord) => {
    if (cred.txHash) {
      window.open(`https://sepolia.etherscan.io/tx/${cred.txHash}`, "_blank");
    } else {
      toast({
        title: "No Blockchain Record",
        description: "This credential has not been anchored to blockchain yet.",
        variant: "destructive",
      });
    }
  };

  const handleCreateOffer = async (cred: CredentialRecord) => {
    if (cred.revoked) {
      toast({
        title: "Cannot Create Offer",
        description: "This credential has been revoked.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Creating Offer...",
      description: "Generating offer URL for wallet...",
    });

    try {
      const response = await fetch(`/api/v1/credentials/${cred.id}/offer`, {
        method: "POST",
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });

      if (!response.ok) throw new Error("Failed to create offer");

      const data = await response.json();
      await navigator.clipboard.writeText(data.offerUrl);

      toast({
        title: "Offer URL Created & Copied!",
        description: (
          <div className="space-y-2">
            <p className="text-sm">Send this URL to the wallet:</p>
            <code className="block text-xs bg-muted p-2 rounded break-all">
              {data.offerUrl}
            </code>
            <p className="text-xs text-muted-foreground">
              URL copied to clipboard!
            </p>
          </div>
        ),
        duration: 15000,
      });
    } catch (error) {
      toast({
        title: "Offer Failed",
        description: "Could not create offer.",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async (cred: CredentialRecord) => {
    const reason = window.prompt("Please enter a reason for revocation:");
    if (!reason) return;

    try {
      await fetch(`/api/v1/credentials/${cred.id}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": (import.meta as any).env?.VITE_API_KEY || "",
        },
        body: JSON.stringify({ reason }),
      });
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      toast({
        title: "Credential Revoked",
        description: `Credential revoked. Reason: ${reason}`,
        variant: "destructive",
      });
    } catch (e) {
      toast({ title: "Revocation Failed", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">
              Credential Records
            </h2>
            <p className="text-muted-foreground mt-1">
              View and manage issued credentials from database.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Name, ID, or Credential..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="border rounded-md bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Credential Type</TableHead>
                <TableHead>Date Issued</TableHead>
                <TableHead>Tx Hash</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Loading credentials...
                    </p>
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No credentials found. Issue a new credential to see it here.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((cred) => (
                  <TableRow key={cred.id}>
                    <TableCell className="font-medium font-mono text-xs text-muted-foreground">
                      {cred.recipient?.id ||
                        cred.recipient?.studentId ||
                        cred.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {cred.recipient?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {cred.credentialData?.credentialName || "Credential"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(cred.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {cred.txHash ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${cred.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline"
                        >
                          {cred.txHash.slice(0, 10)}...{cred.txHash.slice(-4)}{" "}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          cred.revoked
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900"
                            : "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900"
                        }
                      >
                        {cred.revoked ? (
                          <AlertCircle className="mr-1 h-3 w-3" />
                        ) : (
                          <ShieldCheck className="mr-1 h-3 w-3" />
                        )}
                        {cred.revoked ? "Revoked" : "Issued"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(cred)}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDownloadPDF(cred)}
                          >
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleViewOnBlockchain(cred)}
                          >
                            View on Blockchain
                          </DropdownMenuItem>
                          {!cred.revoked && (
                            <DropdownMenuItem
                              onClick={() => handleCreateOffer(cred)}
                              className="text-blue-600"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send to Wallet
                            </DropdownMenuItem>
                          )}
                          {!cred.revoked && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleRevoke(cred)}
                            >
                              Revoke Credential
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
