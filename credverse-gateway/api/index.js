async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
}

function resolveUpstream(target) {
  if (target === 'issuer') return process.env.ISSUER_API_URL;
  if (target === 'wallet') return process.env.WALLET_API_URL;
  if (target === 'recruiter') return process.env.RECRUITER_API_URL;
  return null;
}

function copyResponseHeaders(from, to) {
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'content-encoding') return;
    to.setHeader(key, value);
  });
}

export default async function handler(req, res) {
  try {
    const fullUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
    const path = fullUrl.pathname;

    if (path === '/api/health') {
      return json(res, 200, {
        status: 'ok',
        app: 'credverse-gateway',
        mode: 'serverless-proxy',
      });
    }

    if (path === '/api/auth/status') {
      return json(res, 200, {
        googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        sso: false,
        message: 'Gateway serverless proxy mode active',
      });
    }

    const mobileMatch = path.match(/^\/api\/mobile\/(issuer|wallet|recruiter)\/(.*)$/);
    if (mobileMatch) {
      const [, target, rest] = mobileMatch;
      const upstream = resolveUpstream(target);

      if (!upstream) {
        return json(res, 500, {
          message: `Missing upstream URL for ${target}`,
          code: 'UPSTREAM_NOT_CONFIGURED',
        });
      }

      const upstreamUrl = new URL(upstream.replace(/\/$/, '') + '/' + rest);
      fullUrl.searchParams.forEach((v, k) => upstreamUrl.searchParams.set(k, v));

      const headers = { ...req.headers };
      delete headers.host;
      delete headers['content-length'];

      const method = (req.method || 'GET').toUpperCase();
      const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);

      const upstreamRes = await fetch(upstreamUrl.toString(), {
        method,
        headers,
        body,
      });

      res.statusCode = upstreamRes.status;
      copyResponseHeaders(upstreamRes, res);

      const buf = Buffer.from(await upstreamRes.arrayBuffer());
      res.end(buf);
      return;
    }

    return json(res, 404, { message: 'API route not found', code: 'NOT_FOUND' });
  } catch (err) {
    return json(res, 500, {
      message: 'Gateway proxy error',
      code: 'GATEWAY_PROXY_ERROR',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
