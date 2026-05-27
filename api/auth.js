// /api/auth — Starts the GitHub OAuth flow.
// Decap CMS opens a popup to this URL; we redirect to GitHub for authorization.
// After the user authorizes, GitHub redirects back to /api/callback.
//
// Required env vars (configure at Vercel project Settings → Environment Variables):
//   GITHUB_CLIENT_ID      — public ID from your GitHub OAuth App
//   GITHUB_CLIENT_SECRET  — secret from your GitHub OAuth App (used in /api/callback)

import crypto from 'node:crypto';

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('Missing GITHUB_CLIENT_ID env var on the Vercel project.');
  }

  // Build the redirect_uri based on the request host so this works on
  // both the apex domain (gglasc.com) and the .vercel.app default.
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const redirectUri = `${proto}://${host}/api/callback`;

  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo,user',
    state,
  });

  // Stash state in a short-lived cookie so /api/callback can validate it
  res.setHeader('Set-Cookie', `decap_oauth_state=${state}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`);
  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params}` });
  res.end();
}
