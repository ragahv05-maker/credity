import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { WorkScoreBreakdown } from "@/types/reputation-contracts";

interface WorkScoreBreakdownCardProps {
  score: number;
  breakdown: WorkScoreBreakdown[];
}

export function WorkScoreBreakdownCard({
  score,
  breakdown,
}: WorkScoreBreakdownCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">WorkScore</h3>
        <Badge>{score}/1000</Badge>
      </div>

      <Progress value={(score / 1000) * 100} className="h-2" />

      <div className="space-y-2">
        {breakdown.map((part) => (
          <div key={part.category} className="rounded-lg border p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize">{part.category}</span>
              <span className="text-muted-foreground">
                {part.weighted_score} pts
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Score {part.score} • Weight {(part.weight * 100).toFixed(0)}% •
              Events {part.event_count}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
