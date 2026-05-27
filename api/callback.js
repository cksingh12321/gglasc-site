// /api/callback — Completes the GitHub OAuth flow.
// GitHub redirects here with ?code=…&state=… after the user authorizes.
// We exchange the code for an access token, then post it back to the
// Decap CMS popup parent window using window.postMessage.

export default async function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).send('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET env var.');
  }

  const { code, state } = req.query || {};
  if (!code) return res.status(400).send('Missing ?code parameter.');

  // Validate state from cookie
  const cookieHeader = req.headers.cookie || '';
  const cookieMatch = cookieHeader.match(/decap_oauth_state=([^;]+)/);
  if (!cookieMatch || cookieMatch[1] !== state) {
    return res.status(400).send('OAuth state mismatch. Please retry from /admin.');
  }

  // Exchange code for an access token
  let tokenJson;
  try {
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    tokenJson = await tokenResp.json();
  } catch (err) {
    return res.status(502).send('Failed to reach GitHub token endpoint: ' + err.message);
  }

  if (tokenJson.error || !tokenJson.access_token) {
    return res.status(400).send('GitHub OAuth error: ' + JSON.stringify(tokenJson));
  }

  // Return an HTML page that postMessages the token back to the Decap popup parent
  const payload = JSON.stringify({ token: tokenJson.access_token, provider: 'github' });
  const html = `<!doctype html>
<html><body>
<script>
  (function () {
    function send(status) {
      window.opener && window.opener.postMessage(
        'authorization:github:' + status + ':' + ${JSON.stringify(payload)},
        '*'
      );
    }
    window.addEventListener('message', function (e) {
      // Decap sends "authorizing:github" to confirm it received our window.opener handshake.
      // We acknowledge by sending the token.
      if (typeof e.data === 'string' && e.data.indexOf('authorizing:github') === 0) {
        send('success');
      }
    }, false);
    // Initial postMessage so Decap's listener picks us up
    send('success');
    setTimeout(function () { window.close(); }, 1200);
  })();
</script>
<p style="font-family: sans-serif; padding: 40px;">
  Authorisation successful. You can close this window.
</p>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Clear the state cookie
  res.setHeader('Set-Cookie', 'decap_oauth_state=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  return res.status(200).send(html);
}
