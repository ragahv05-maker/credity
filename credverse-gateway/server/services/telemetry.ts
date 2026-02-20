import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

type Bucket = { le: number; count: number };

const LATENCY_BUCKETS: Bucket[] = [
  { le: 25, count: 0 },
  { le: 50, count: 0 },
  { le: 100, count: 0 },
  { le: 250, count: 0 },
  { le: 500, count: 0 },
  { le: 1000, count: 0 },
  { le: 2500, count: 0 },
  { le: 5000, count: 0 },
  { le: Infinity, count: 0 },
];

const statusCounts = new Map<string, number>();
let requestsTotal = 0;
let requestsInFlight = 0;
let latencyMsSum = 0;
let latencyMsCount = 0;

function observeDuration(durationMs: number): void {
  latencyMsSum += durationMs;
  latencyMsCount += 1;
  for (const bucket of LATENCY_BUCKETS) {
    if (durationMs <= bucket.le) {
      bucket.count += 1;
    }
  }
}

function getOrCreateRequestId(req: Request): string {
  const value = req.headers['x-request-id'];
  if (typeof value === 'string' && value.trim()) return value;
  return randomUUID();
}

function getOrCreateTraceId(req: Request): string {
  const value = req.headers['x-trace-id'] || req.headers['x-correlation-id'];
  if (typeof value === 'string' && value.trim()) return value;
  return randomUUID();
}

export function telemetryMiddleware(service: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const requestId = getOrCreateRequestId(req);
    const traceId = getOrCreateTraceId(req);

    res.setHeader('x-request-id', requestId);
    res.setHeader('x-trace-id', traceId);
    res.setHeader('x-correlation-id', traceId);

    requestsTotal += 1;
    requestsInFlight += 1;

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      requestsInFlight = Math.max(0, requestsInFlight - 1);
      observeDuration(durationMs);

      const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
      statusCounts.set(statusClass, (statusCounts.get(statusClass) || 0) + 1);

      if (req.path.startsWith('/api')) {
        console.log(JSON.stringify({
          level: 'info',
          type: 'trace_http',
          service,
          traceId,
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs,
          ts: new Date().toISOString(),
        }));
      }
    });

    next();
  };
}

export function metricsHandler(service: string) {
  return (_req: Request, res: Response) => {
    const lines: string[] = [];
    lines.push('# HELP credverse_http_requests_total Total HTTP requests');
    lines.push('# TYPE credverse_http_requests_total counter');
    lines.push(`credverse_http_requests_total{service="${service}"} ${requestsTotal}`);
    lines.push('# HELP credverse_http_requests_in_flight In-flight HTTP requests');
    lines.push('# TYPE credverse_http_requests_in_flight gauge');
    lines.push(`credverse_http_requests_in_flight{service="${service}"} ${requestsInFlight}`);

    lines.push('# HELP credverse_http_requests_by_status_total HTTP requests by status class');
    lines.push('# TYPE credverse_http_requests_by_status_total counter');
    for (const [statusClass, count] of statusCounts.entries()) {
      lines.push(`credverse_http_requests_by_status_total{service="${service}",status_class="${statusClass}"} ${count}`);
    }

    lines.push('# HELP credverse_http_request_duration_ms Request duration histogram in milliseconds');
    lines.push('# TYPE credverse_http_request_duration_ms histogram');
    for (const bucket of LATENCY_BUCKETS) {
      const le = Number.isFinite(bucket.le) ? String(bucket.le) : '+Inf';
      lines.push(`credverse_http_request_duration_ms_bucket{service="${service}",le="${le}"} ${bucket.count}`);
    }
    lines.push(`credverse_http_request_duration_ms_sum{service="${service}"} ${latencyMsSum}`);
    lines.push(`credverse_http_request_duration_ms_count{service="${service}"} ${latencyMsCount}`);

    res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(`${lines.join('\n')}\n`);
  };
}
