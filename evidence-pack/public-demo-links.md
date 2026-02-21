# Public demo links (Credity / CredVerse)

Timestamp: **2026-02-16 01:18 IST (GMT+5:30)**

## 1) Live public link (available now)

### CredVerse Recruiter UI (Vite dev server via localhost.run tunnel)

- **Public URL:** https://22df8e3cfc15a7.lhr.life
- **Local origin:** http://localhost:5000
- **How it’s being served:** `CredVerseRecruiter` → `npm run dev:client` (Vite) exposed via `ssh -R ... nokey@localhost.run`

**Notes / caveats**

- This is a **tunneled dev server**. The URL will stop working if the SSH tunnel or the Vite dev process stops (laptop sleep, network change, process killed).
- Not a “permanent production deploy”; it’s a **shareable preview link** for demos.

### How to keep it alive during a demo

Run both commands in two terminals and keep them running:

```bash
cd /Users/raghav/Desktop/credity/CredVerseRecruiter
npm run dev:client -- --host 0.0.0.0 --port 5000
```

```bash
ssh -tt -o StrictHostKeyChecking=no -R 80:localhost:5000 nokey@localhost.run
```

When the SSH tunnel connects, it prints the public URL (example):

```
https://<subdomain>.lhr.life
```

## 2) Stable/production-grade public links (requires owner sign-in)

If you need a **stable link that survives restarts**, use one of the options below.

### Option A (recommended): Vercel for `credverse-gateway` (stable HTTPS)

**Owner actions (interactive login / possible OTP/2FA):**

1. Create/login to Vercel account.
2. Import Git repo.
3. Set **Root Directory**: `credverse-gateway`.
4. Configure environment variables (see `DEPLOYMENT.md`).
5. Deploy and share the resulting `*.vercel.app` URL.

Potential OTP/2FA points:

- Vercel login may require email verification / SSO.
- If using Google OAuth, Google Cloud Console may require account verification.

### Option B: Railway for services (stable HTTPS)

**Owner actions (interactive login / possible OTP/2FA):**

1. Login to Railway.
2. Deploy services with Root Directories:
   - Issuer: `CredVerseIssuer 3`
   - Wallet: `BlockWalletDigi`
   - Recruiter: `CredVerseRecruiter`
   - Gateway: `credverse-gateway`
3. Set env vars per `DEPLOYMENT.md` / `RAILWAY.md`.

Potential OTP/2FA points:

- Railway login / GitHub OAuth.

### Option C: localhost.run “forever-free” subdomain (more stable than anonymous)

The current tunnel uses an **anonymous** session URL.
For a longer-lasting (semi-stable) URL, localhost.run offers a “forever-free” flow that requires:

- creating an account
- adding your SSH public key

Docs: https://localhost.run/docs/forever-free/

## Evidence / process IDs (for debugging)

- Vite dev server session: `tide-breeze` (port 5000)
- localhost.run tunnel session: `lucky-otter`
- localhost.run connection id (from banner): `6bea2771-f9ad-44ca-9609-5aa4dde9ae4e`
