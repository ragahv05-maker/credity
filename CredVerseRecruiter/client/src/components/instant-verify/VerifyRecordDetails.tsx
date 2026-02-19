import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";
import { VerificationRecord } from "./types";

interface VerifyRecordDetailsProps {
  record: VerificationRecord | null;
}

export function VerifyRecordDetails({ record }: VerifyRecordDetailsProps) {
  if (!record) return null;

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase font-semibold">Subject</p>
        <p className="font-medium text-lg leading-tight">{record.subject}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase font-semibold">Credential</p>
        <p className="font-medium leading-tight">{record.credentialType}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase font-semibold">Issuer</p>
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-muted-foreground" />
          <p className="font-medium leading-tight">{record.issuer}</p>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase font-semibold">Recommendation</p>
        <Badge
          className={
            String(record.recommendation).toLowerCase() === "review"
              ? "bg-amber-100 text-amber-700"
              : String(record.recommendation).toLowerCase() === "reject"
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
          }
        >
          {String(record.recommendation).toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}
