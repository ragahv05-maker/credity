import { beforeEach, describe, expect, it } from 'vitest';
import {
    calculateReputationScore,
    calculateSafeDateScore,
    deriveSafeDateInputs,
    resetReputationRailStore,
    upsertReputationEvent,
} from '../server/services/reputation-rail-service';

describe('reputation rail service', () => {
    beforeEach(async () => {
        await resetReputationRailStore();
    });

    it('computes deterministic weighted reputation score on a 0-1000 scale', async () => {
        await upsertReputationEvent({
            event_id: 'evt-transport',
            user_id: 1,
            platform_id: 'uber',
            category: 'transport',
            signal_type: 'rating',
            score: 80,
        });
        await upsertReputationEvent({
            event_id: 'evt-accommodation',
            user_id: 1,
            platform_id: 'airbnb',
            category: 'accommodation',
            signal_type: 'rating',
            score: 70,
        });
        await upsertReputationEvent({
            event_id: 'evt-delivery',
            user_id: 1,
            platform_id: 'swiggy',
            category: 'delivery',
            signal_type: 'rating',
            score: 90,
        });
        await upsertReputationEvent({
            event_id: 'evt-employment',
            user_id: 1,
            platform_id: 'linkedin',
            category: 'employment',
            signal_type: 'endorsement',
            score: 60,
        });
        await upsertReputationEvent({
            event_id: 'evt-finance',
            user_id: 1,
            platform_id: 'bank',
            category: 'finance',
            signal_type: 'on_time_payment',
            score: 50,
        });
        await upsertReputationEvent({
            event_id: 'evt-social',
            user_id: 1,
            platform_id: 'dating-app',
            category: 'social',
            signal_type: 'positive_feedback',
            score: 100,
        });
        await upsertReputationEvent({
            event_id: 'evt-identity',
            user_id: 1,
            platform_id: 'digilocker',
            category: 'identity',
            signal_type: 'kyc_verified',
            score: 80,
        });

        const score = await calculateReputationScore(1);
        expect(score.score).toBe(740);
        expect(score.event_count).toBe(7);
        expect(score.category_breakdown).toHaveLength(7);
    });

    it('deduplicates event writes by event_id to ensure idempotent behavior', async () => {
        const first = await upsertReputationEvent({
            event_id: 'evt-dup-1',
            user_id: 1,
            platform_id: 'uber',
            category: 'transport',
            signal_type: 'rating',
            score: 82,
        });
        const second = await upsertReputationEvent({
            event_id: 'evt-dup-1',
            user_id: 1,
            platform_id: 'uber',
            category: 'transport',
            signal_type: 'rating',
            score: 82,
        });

        expect(first.accepted).toBe(true);
        expect(first.duplicate).toBe(false);
        expect(second.accepted).toBe(false);
        expect(second.duplicate).toBe(true);
        expect(second.event.id).toBe(first.event.id);
    });

    it('derives social safety inputs from ingested event signals', async () => {
        await upsertReputationEvent({
            event_id: 'evt-social-1',
            user_id: 1,
            platform_id: 'dating-app',
            category: 'social',
            signal_type: 'positive_feedback',
            score: 88,
        });
        await upsertReputationEvent({
            event_id: 'evt-social-2',
            user_id: 1,
            platform_id: 'dating-app',
            category: 'social',
            signal_type: 'harassment_report',
            score: 0,
        });
        await upsertReputationEvent({
            event_id: 'evt-social-3',
            user_id: 1,
            platform_id: 'payments',
            category: 'finance',
            signal_type: 'fraud_report',
            score: 0,
        });

        const derived = await deriveSafeDateInputs(1);
        expect(derived.endorsementCount).toBe(1);
        expect(derived.harassmentReports).toBe(1);
        expect(derived.backgroundFlags).toBe(1);
    });

    it('calculates SafeDate score and reason codes from trust + behavior', () => {
        const reputation = {
            user_id: 1,
            score: 800,
            event_count: 0,
            category_breakdown: [],
            computed_at: new Date().toISOString(),
        };

        const safeDate = calculateSafeDateScore(1, reputation, {
            identityVerified: true,
            livenessVerified: true,
            backgroundFlags: 1,
            endorsementCount: 2,
            harassmentReports: 1,
        });

        expect(safeDate.score).toBe(75);
        expect(safeDate.breakdown.cross_platform_reputation_points).toBe(16);
        expect(safeDate.reason_codes).toContain('background_flags_present');
        expect(safeDate.reason_codes).toContain('harassment_reports_present');
    });
});
