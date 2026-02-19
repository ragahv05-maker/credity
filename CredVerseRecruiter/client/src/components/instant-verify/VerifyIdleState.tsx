import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export function VerifyIdleState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center text-center p-12 border rounded-xl border-dashed border-muted-foreground/20 bg-muted/10 min-h-[520px]"
    >
      <ShieldCheck className="w-16 h-16 text-muted-foreground/20 mb-4" />
      <h3 className="text-xl font-semibold text-muted-foreground/60">Ready to Verify</h3>
      <p className="text-muted-foreground/50 max-w-sm mx-auto mt-2">
        Paste a JWT or verify a link. You’ll get an instant decision with reason codes and evidence.
      </p>
    </motion.div>
  );
}
