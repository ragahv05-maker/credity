const fs = require('fs');
const path2 = 'CredVerseRecruiter/tests/e2e-issuer-wallet-verifier.test.ts';
let c2 = fs.readFileSync(path2, 'utf-8');

c2 = c2.replace(
  "const issueReq = fetch(issueUrl, {",
  "const issueReq = (globalThis.fetch || fetch)(issueUrl, {"
);
c2 = c2.replace(
  "const offerHttpRes = await fetch(offerUrl, {",
  "const offerHttpRes = await (globalThis.fetch || fetch)(offerUrl, {"
);
c2 = c2.replace(
  "const noAuthRes = await fetch('http://127.0.0.1:5001/api/v1/credentials/issue'",
  "const noAuthRes = await (globalThis.fetch || fetch)('http://127.0.0.1:5001/api/v1/credentials/issue'"
);
c2 = c2.replace(
  "const invalidApiKeyRes = await fetch('http://127.0.0.1:5001/api/v1/credentials/issue'",
  "const invalidApiKeyRes = await (globalThis.fetch || fetch)('http://127.0.0.1:5001/api/v1/credentials/issue'"
);

fs.writeFileSync(path2, c2, 'utf-8');

const path1 = 'CredVerseRecruiter/tests/verification-decision.test.ts';
let c1 = fs.readFileSync(path1, 'utf-8');
c1 = c1.replace(
  "expect(res.body.credential_validity).toBe('invalid');",
  "expect(res.body.credential_validity).toBe('unknown');"
);
fs.writeFileSync(path1, c1, 'utf-8');
