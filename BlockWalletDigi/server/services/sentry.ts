import * as Sentry from '@sentry/node';
import { sanitizeContext } from '../middleware/observability';

const SENTRY_DSN = process.env.SENTRY_DSN;
const APP_NAME = process.env.APP_NAME || 'credverse-wallet';

export function initSentry(appName?: string): void {
    if (!SENTRY_DSN) {
        console.log('[Sentry] DSN not configured, error monitoring disabled');
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.APP_VERSION || '1.0.0',
        serverName: appName || APP_NAME,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend(event) {
            if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEV_ENABLED) {
                return null;
            }

            if (event.extra) {
                event.extra = sanitizeContext(event.extra) as Record<string, unknown>;
            }

            return event;
        },
        integrations: [
            Sentry.httpIntegration(),
            Sentry.expressIntegration(),
        ],
    });

    console.log(`[Sentry] Error monitoring initialized for ${appName || APP_NAME}`);
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
    if (!SENTRY_DSN) return;

    Sentry.withScope((scope) => {
        const safeContext = sanitizeContext(context || {}) as Record<string, unknown>;
        if (typeof safeContext.errorCode === 'string') {
            scope.setTag('error_code', safeContext.errorCode);
        }
        scope.setContext('app_context', safeContext);
        Sentry.captureException(error);
    });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!SENTRY_DSN) return;
    Sentry.captureMessage(message, level);
}

export function setUser(user: { id: string; username?: string; email?: string }): void {
    if (!SENTRY_DSN) return;
    Sentry.setUser({ id: user.id, username: user.username });
}

export function clearUser(): void {
    if (!SENTRY_DSN) return;
    Sentry.setUser(null);
}

export const sentryErrorHandler = Sentry.expressErrorHandler();

export { Sentry };
