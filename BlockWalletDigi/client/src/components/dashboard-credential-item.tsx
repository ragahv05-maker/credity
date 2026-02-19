import { memo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCategoryColor } from "@/lib/utils";

interface WalletCredential {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  category: string;
  anchorStatus: string;
  hash: string;
  verificationCount: number;
}

interface DashboardCredentialItemProps {
  credential: WalletCredential;
  index: number;
}

export const DashboardCredentialItem = memo(function DashboardCredentialItem({
  credential,
  index,
}: DashboardCredentialItemProps) {
  return (
    <Link href={`/credential/${credential.id}`}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-card p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${getCategoryColor(
            credential.category
          )} text-white`}
        >
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {credential.data?.name || credential.type[1] || "Credential"}
          </p>
          <p className="text-xs text-muted-foreground">{credential.issuer}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            variant={
              credential.anchorStatus === "anchored" ? "default" : "secondary"
            }
            className="text-[10px]"
          >
            {credential.anchorStatus === "anchored" ? "⛓ On-chain" : "Pending"}
          </Badge>
          <span className="text-[10px] text-muted-foreground capitalize">
            {credential.category}
          </span>
        </div>
      </motion.div>
    </Link>
  );
});
