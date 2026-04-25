import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Badge } from '@/components/ui/badge';
import { SafeDateBadgeCard } from '@/components/safedate-badge-card';
import { WorkScoreBreakdownCard } from '@/components/workscore-breakdown-card';
import {
  getReputationPreviewData,
  mockReputationPreviewPayload,
  type ReputationPreviewPayload,
} from '@/lib/reputation-preview-data';

function isLiveModeEnabled(): boolean {
  return String(import.meta.env.VITE_REPUTATION_PREVIEW_LIVE || '').toLowerCase() === 'true';
}

export default function ReputationContractPreview() {
  const liveMode = useMemo(isLiveModeEnabled, []);
  const [data, setData] = useState<ReputationPreviewPayload>(mockReputationPreviewPayload);
  const [loading, setLoading] = useState<boolean>(liveMode);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [source, setSource] = useState<'mock' | 'live'>('mock');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!liveMode) {
        setSource('mock');
        return;
      }

      setLoading(true);
      const result = await getReputationPreviewData({ liveModeEnabled: true, userId: 1 });
      if (!active) return;

      setData(result.payload);
      setSource(result.source);
      setLiveError(result.error || null);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [liveMode]);

  const candidate = data.candidate;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Reputation Contract Preview</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Consumer wallet placeholder view for WorkScore + SafeDate shared contract rendering.
            </p>
          </div>

          {liveMode && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={source === 'live' ? 'default' : 'secondary'}>
                  {source === 'live' ? 'Live API' : 'Mock fallback'}
                </Badge>
                {loading && <span className="text-sm text-muted-foreground">Loading live reputation data…</span>}
              </div>
              {liveError && (
                <p className="text-xs text-amber-600">
                  Live fetch failed, showing mock data: {liveError}
                </p>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <WorkScoreBreakdownCard
              score={candidate.work_score.score}
              breakdown={candidate.work_score.breakdown}
            />
            <SafeDateBadgeCard badge={data.safeDate} />
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Candidate Verification Summary</h3>
              <Badge variant="outline" className="capitalize">{candidate.decision}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Candidate: {candidate.candidate_id} • Confidence: {(candidate.confidence * 100).toFixed(0)}% • Risk: {(candidate.risk_score * 100).toFixed(0)}%
            </p>
            <div className="flex flex-wrap gap-2">
              {candidate.reason_codes.map((code) => (
                <Badge key={code} variant="secondary" className="font-mono text-[10px]">
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
