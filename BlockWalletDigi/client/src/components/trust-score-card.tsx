/**
 * Trust Score Card Component
 * Displays the user's trust score with breakdown and suggestions
 * Implements PRD Section 5.1 Feature 3 UI requirements
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Shield,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronRight,
    Sparkles,
    User,
    Activity,
    Star,
    Info
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrustScoreData {
    score: number;
    level: string;
    levelLabel: string;
    breakdown: {
        identity: { total: number; maxPoints: number; livenessPassed: number; documentVerified: number; biometricsMatched: number };
        activity: { total: number; maxPoints: number; verificationCount: number; platformConnections: number; recencyBonus: number };
        reputation: { total: number; maxPoints: number; noSuspiciousActivity: number; platformEndorsements: number; userFeedback: number };
    };
    suggestions: Array<{
        action: string;
        points: number;
        category: string;
        timeEstimate: string;
    }>;
    history: Array<{ date: string; score: number }>;
}

export function TrustScoreCard() {
    const [showBreakdown, setShowBreakdown] = useState(false);

    const { data, isLoading } = useQuery<{ success: boolean } & TrustScoreData>({
        queryKey: ['trust-score'],
        queryFn: async () => {
            const res = await fetch('/api/trust-score?userId=1');
            return res.json();
        },
        refetchInterval: 60000, // Refresh every minute
    });

    if (isLoading || !data?.success) {
        return (
            <div className="bg-card rounded-2xl p-6 border border-border animate-pulse">
                <div className="h-24 bg-muted rounded-lg"></div>
            </div>
        );
    }

    const { score, levelLabel, breakdown, suggestions, history } = data;

    // Calculate trend from history
    const trend = history.length >= 2
        ? history[history.length - 1].score - history[history.length - 2].score
        : 0;

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'outstanding': return 'from-emerald-500 to-green-600';
            case 'excellent': return 'from-blue-500 to-indigo-600';
            case 'good': return 'from-cyan-500 to-blue-600';
            case 'fair': return 'from-amber-500 to-orange-600';
            default: return 'from-red-500 to-rose-600';
        }
    };

    const getLevelBadgeColor = (level: string) => {
        switch (level) {
            case 'outstanding': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'excellent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'good': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400';
            case 'fair': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
        >
            {/* Main Score Display */}
            <div className={`bg-gradient-to-br ${getLevelColor(data.level)} p-6 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />

                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-white/80 text-xs uppercase tracking-wider">Credity Trust Score</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold">{score}</span>
                                <span className="text-white/60 text-sm">/100</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <Badge className={`${getLevelBadgeColor(data.level)} border-0`}>
                            {levelLabel}
                        </Badge>
                        <div className="flex items-center gap-1 mt-2 text-sm">
                            {trend > 0 ? (
                                <>
                                    <TrendingUp className="w-4 h-4" />
                                    <span>+{trend} this week</span>
                                </>
                            ) : trend < 0 ? (
                                <>
                                    <TrendingDown className="w-4 h-4" />
                                    <span>{trend} this week</span>
                                </>
                            ) : (
                                <>
                                    <Minus className="w-4 h-4" />
                                    <span>Stable</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Score Breakdown */}
            <div className="p-4 space-y-4">
                <button
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <span className="font-medium">Score Breakdown</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-90' : ''}`} />
                </button>

                {showBreakdown && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3"
                    >
                        {/* Identity */}
                        <ScoreSection
                            icon={<User className="w-4 h-4" />}
                            label="Identity Verification"
                            score={breakdown.identity.total}
                            maxScore={breakdown.identity.maxPoints}
                            color="blue"
                            tooltip="Liveness detection, document verification, biometrics"
                        />

                        {/* Activity */}
                        <ScoreSection
                            icon={<Activity className="w-4 h-4" />}
                            label="Activity & Behavior"
                            score={breakdown.activity.total}
                            maxScore={breakdown.activity.maxPoints}
                            color="green"
                            tooltip="Verification count, platform connections, recent activity"
                        />

                        {/* Reputation */}
                        <ScoreSection
                            icon={<Star className="w-4 h-4" />}
                            label="Reputation & Trust"
                            score={breakdown.reputation.total}
                            maxScore={breakdown.reputation.maxPoints}
                            color="purple"
                            tooltip="No suspicious activity, endorsements, user feedback"
                        />
                    </motion.div>
                )}

                {/* Improvement Suggestions */}
                {suggestions.length > 0 && (
                    <div className="pt-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium">Quick Improvements</span>
                        </div>

                        <div className="space-y-2">
                            {suggestions.slice(0, 2).map((suggestion, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg text-sm"
                                >
                                    <span className="text-muted-foreground">{suggestion.action}</span>
                                    <Badge variant="outline" className="text-green-600 border-green-200">
                                        +{suggestion.points} pts
                                    </Badge>
                                </div>
                            ))}
                        </div>

                        <Button variant="ghost" size="sm" className="w-full mt-2 text-primary">
                            View All Suggestions
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

interface ScoreSectionProps {
    icon: React.ReactNode;
    label: string;
    score: number;
    maxScore: number;
    color: 'blue' | 'green' | 'purple';
    tooltip: string;
}

function ScoreSection({ icon, label, score, maxScore, color, tooltip }: ScoreSectionProps) {
    const percentage = (score / maxScore) * 100;

    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <span className={`${colorClasses[color].replace('bg-', 'text-')}`}>{icon}</span>
                    <span className="text-muted-foreground">{label}</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="w-3 h-3 text-muted-foreground/50" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs">{tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <span className="font-medium">{score}/{maxScore}</span>
            </div>
            <Progress value={percentage} className="h-2" />
        </div>
    );
}
