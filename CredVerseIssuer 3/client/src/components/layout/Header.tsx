import {
  Bell,
  Search,
  HelpCircle,
  Smartphone,
  Wallet,
  Copy,
  ExternalLink,
  LogOut,
  User,
  CreditCard,
  Settings,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const {
    isConnected,
    isConnecting,
    address,
    chainId,
    connect,
    disconnect,
    formatAddress,
    getChainName,
    isMetaMaskInstalled,
    error,
  } = useWallet();

  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    if (isConnected) {
      setShowWalletDetails(true);
    } else {
      await connect();
      if (!isMetaMaskInstalled) {
        toast({
          title: "MetaMask Required",
          description: "Please install MetaMask to connect your wallet",
          variant: "destructive",
        });
      }
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowWalletDetails(false);
    toast({
      title: "Disconnected",
      description: "Wallet disconnected successfully",
    });
  };

  const handleViewOnExplorer = () => {
    if (address && chainId) {
      let baseUrl = "https://etherscan.io";
      if (chainId === 137) baseUrl = "https://polygonscan.com";
      if (chainId === 80001) baseUrl = "https://mumbai.polygonscan.com";
      if (chainId === 11155111) baseUrl = "https://sepolia.etherscan.io";
      window.open(`${baseUrl}/address/${address}`, "_blank");
    }
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 right-0 left-64 z-20 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 w-1/3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search students, credentials, or batches..."
              className="pl-9 bg-secondary/50 border-transparent focus:bg-background focus:border-input transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Wallet Connect Button */}
          <Button
            variant={isConnected ? "outline" : "default"}
            size="sm"
            className={`gap-2 hidden md:flex ${isConnected ? "border-green-500/50 text-green-600" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                {isConnected && address
                  ? formatAddress(address)
                  : "Connect Wallet"}
              </>
            )}
          </Button>

          <Link href="/passport" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hidden md:flex"
            >
              <Smartphone className="h-4 w-4" />
              Student View
            </Button>
          </Link>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/help")}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground relative"
            onClick={() => navigate("/verification-logs")}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage
                    src="https://github.com/shadcn.png"
                    alt="@admin"
                  />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Admin User</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    admin@university.edu
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/billing")}>
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  toast({
                    title: "Logged out",
                    description: "You have been logged out successfully.",
                  });
                  navigate("/");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Wallet Details Dialog */}
      <Dialog open={showWalletDetails} onOpenChange={setShowWalletDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wallet Connected</DialogTitle>
            <DialogDescription>
              Your wallet is connected to CredVerse
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Chain Badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Network</span>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                {getChainName(chainId)}
              </Badge>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Address</span>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="flex-1 text-sm font-mono truncate">
                  {address}
                </code>
                <Button size="icon" variant="ghost" onClick={handleCopyAddress}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleViewOnExplorer}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Explorer
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect Wallet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 z-50">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}
    </>
  );
}
