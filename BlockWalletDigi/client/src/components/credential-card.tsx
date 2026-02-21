import { motion } from "framer-motion";
import { ShieldCheck, Award, FileText, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface Credential {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  type: "degree" | "license" | "id" | "certificate";
  verified: boolean;
  blockHash?: string;
}

interface CredentialCardProps {
  credential: Credential;
  index: number;
}

export function CredentialCard({ credential, index }: CredentialCardProps) {
  const getIcon = () => {
    switch (credential.type) {
      case "degree":
        return <Award className="w-6 h-6 text-primary" />;
      case "id":
        return <ShieldCheck className="w-6 h-6 text-accent" />;
      default:
        return <FileText className="w-6 h-6 text-muted-foreground" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="glass-card border-white/10 hover:border-primary/50 transition-all duration-300 group overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />

        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/50 ring-1 ring-white/10">
              {getIcon()}
            </div>
            <div>
              <CardTitle className="text-lg font-medium leading-none text-white">
                {credential.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {credential.issuer}
              </p>
            </div>
          </div>
          {credential.verified && (
            <Badge
              variant="outline"
              className="bg-accent/10 text-accent border-accent/20 flex gap-1 items-center"
            >
              <ShieldCheck className="w-3 h-3" />
              Verified
            </Badge>
          )}
        </CardHeader>

        <CardContent className="relative z-10 pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                Issued
              </p>
              <p className="font-mono text-white/90">{credential.issueDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                ID
              </p>
              <p
                className="font-mono text-white/90 truncate"
                title={credential.id}
              >
                {credential.id.substring(0, 8)}...
              </p>
            </div>
          </div>

          {credential.blockHash && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                Block Hash
              </p>
              <p className="font-mono text-[10px] text-primary/80 truncate">
                {credential.blockHash}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="relative z-10 pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full hover:bg-primary/10 hover:text-primary text-muted-foreground group-hover:text-white transition-colors"
          >
            View Details <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
