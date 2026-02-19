export default function handler(req, res) {
  const path = (req.url || '').split('?')[0];

  if (path === '/api/health') {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', app: 'credverse-gateway' }));
    return;
  }

  if (path === '/api/auth/status') {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        sso: false,
        message: 'Serverless API fallback mode active',
      }),
    );
    return;
  }

  res.statusCode = 404;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ message: 'API route not found', code: 'NOT_FOUND' }));
}
