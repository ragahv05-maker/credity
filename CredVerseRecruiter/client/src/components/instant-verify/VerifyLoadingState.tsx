import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface VerifyLoadingStateProps {
  progress: number;
}

export function VerifyLoadingState({ progress }: VerifyLoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center p-12 border rounded-xl bg-background min-h-[520px] shadow-lg relative overflow-hidden"
    >
      <motion.div
        className="absolute w-full h-1 bg-primary/30 blur-md top-0"
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 2.5, ease: "linear", repeat: Infinity }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-8">
          <motion.div
            className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
        </div>

        <h3 className="text-xl font-bold tracking-tight">Verifying…</h3>
        <div className="w-80 mt-8">
          <Progress value={progress} className="h-3" />
        </div>
        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground font-mono bg-muted/20 p-4 rounded-lg border w-full max-w-xs">
          <p className={progress > 20 ? "text-primary" : ""}>{progress > 20 ? "✓" : "○"} Parsing credential format…</p>
          <p className={progress > 40 ? "text-primary" : ""}>{progress > 40 ? "✓" : "○"} Validating signature…</p>
          <p className={progress > 60 ? "text-primary" : ""}>{progress > 60 ? "✓" : "○"} Checking issuer registry…</p>
          <p className={progress > 80 ? "text-primary" : ""}>{progress > 80 ? "✓" : "○"} Running fraud analysis…</p>
        </div>
      </div>
    </motion.div>
  );
}
