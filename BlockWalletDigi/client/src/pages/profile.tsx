import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import {
  Download,
  Share2,
  Briefcase,
  Award,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface WalletCredential {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  data: any;
  category: string;
  anchorStatus: string;
}

interface WalletStats {
  totalCredentials: number;
  byCategory: Record<string, number>;
  totalShares: number;
  activeShares: number;
  totalVerifications: number;
}

export default function ProfilePage() {
  const [copied, setCopied] = useState(false);

  // Initialize wallet
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet-init"],
    queryFn: async () => {
      const res = await fetch("/api/wallet/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 1 }),
      });
      return res.json();
    },
  });

  // Get credentials
  const { data: credentialsData, isLoading: credentialsLoading } = useQuery({
    queryKey: ["wallet-credentials"],
    queryFn: async () => {
      const res = await fetch("/api/wallet/credentials?userId=1");
      return res.json();
    },
    enabled: !!walletData?.success,
  });

  const credentials: WalletCredential[] = credentialsData?.credentials || [];
  const stats: WalletStats = walletData?.stats || {};
  const did = walletData?.wallet?.did || "Loading...";

  const copyDid = () => {
    if (did && did !== "Loading...") {
      navigator.clipboard.writeText(did);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      academic: "🎓",
      employment: "💼",
      skill: "⭐",
      government: "🏛️",
      medical: "🏥",
    };
    return icons[category] || "📄";
  };

  const isLoading = walletLoading || credentialsLoading;

  // Calculate trust score based on credentials
  const trustScore = Math.min(
    100,
    70 + credentials.length * 5 + (stats.totalVerifications || 0) * 2,
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-64 p-6 overflow-y-auto h-screen">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header / Identity */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex gap-6 items-center">
              <Avatar className="w-24 h-24 border-4 border-secondary">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">John Doe</h1>
                <p className="text-muted-foreground mb-2">
                  {credentials.length} Credentials •{" "}
                  {stats.totalVerifications || 0} Verifications
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs py-1 max-w-[280px] truncate"
                  >
                    {did.length > 30
                      ? `${did.slice(0, 20)}...${did.slice(-8)}`
                      : did}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={copyDid}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" /> Share Profile
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" /> Export Résumé
              </Button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Verified Credentials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    Verified Credentials
                  </CardTitle>
                  <CardDescription>
                    On-chain verified credentials from trusted issuers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : credentials.length > 0 ? (
                    credentials.map((cred) => (
                      <Link key={cred.id} href={`/credential/${cred.id}`}>
                        <div className="flex gap-4 p-4 border rounded-lg hover:border-primary/50 cursor-pointer transition-colors">
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-2xl">
                            {getCategoryIcon(cred.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">
                                {cred.data?.name ||
                                  cred.type[1] ||
                                  "Credential"}
                              </h3>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${cred.anchorStatus === "anchored" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                              >
                                {cred.anchorStatus === "anchored"
                                  ? "⛓ Verified"
                                  : "⏳ Pending"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {cred.issuer}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Issued:{" "}
                              {new Date(cred.issuanceDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-muted-foreground text-sm">
                        No verified credentials yet.
                      </p>
                      <Link href="/receive">
                        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                          Add Credential
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Skills & Expertise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {credentials
                      .filter((c) => c.category === "skill")
                      .map((cred) => (
                        <Badge
                          key={cred.id}
                          className="px-3 py-1 bg-green-100 text-green-800 hover:bg-green-200"
                        >
                          ✓ {cred.data?.name || "Skill"}
                        </Badge>
                      ))}
                    {["React", "TypeScript", "Node.js", "Web3"].map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="px-3 py-1"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              {Object.keys(stats.byCategory || {}).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Credentials by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(stats.byCategory).map(
                        ([category, count]) => (
                          <Link key={category} href={`/?category=${category}`}>
                            <div className="p-4 border rounded-lg hover:border-primary/50 cursor-pointer transition-colors text-center">
                              <div className="text-2xl mb-2">
                                {getCategoryIcon(category)}
                              </div>
                              <p className="font-bold text-xl">{count}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {category}
                              </p>
                            </div>
                          </Link>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-primary to-blue-700 text-primary-foreground border-none">
                <CardHeader>
                  <CardTitle className="text-lg">Trust Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold mb-2">{trustScore}</div>
                  <p className="text-sm opacity-80">
                    Based on {credentials.length} verified credentials and{" "}
                    {stats.totalVerifications || 0} verifications.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium uppercase text-muted-foreground">
                    Wallet Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                    <span className="text-sm">Active Shares</span>
                    <Badge>{stats.activeShares || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                    <span className="text-sm">Total Shares</span>
                    <Badge variant="outline">{stats.totalShares || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                    <span className="text-sm">Verifications</span>
                    <Badge variant="outline">
                      {stats.totalVerifications || 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium uppercase text-muted-foreground">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/settings">
                    <Button variant="outline" className="w-full justify-start">
                      ⚙️ Wallet Settings
                    </Button>
                  </Link>
                  <Link href="/receive">
                    <Button variant="outline" className="w-full justify-start">
                      ➕ Add Credential
                    </Button>
                  </Link>
                  <Link href="/connect-digilocker">
                    <Button variant="outline" className="w-full justify-start">
                      🔗 Connect DigiLocker
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
