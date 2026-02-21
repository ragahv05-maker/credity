import { Badge } from "@/components/ui/badge";
import type { SafeDateBadge } from "@/types/reputation-contracts";

interface SafeDateBadgeCardProps {
  badge: SafeDateBadge;
}

export function SafeDateBadgeCard({ badge }: SafeDateBadgeCardProps) {
  const label = badge.badge_level.toUpperCase();

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">SafeDate Badge</h3>
        <Badge variant="outline">{label}</Badge>
      </div>

      <div className="text-3xl font-bold">{badge.score}/100</div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>Identity: {badge.breakdown.identity_verified_points}</span>
        <span>Liveness: {badge.breakdown.liveness_points}</span>
        <span>Background: {badge.breakdown.background_clean_points}</span>
        <span>
          Reputation: {badge.breakdown.cross_platform_reputation_points}
        </span>
        <span>Social: {badge.breakdown.social_validation_points}</span>
        <span>Safety: {badge.breakdown.harassment_free_points}</span>
      </div>
    </div>
  );
}
