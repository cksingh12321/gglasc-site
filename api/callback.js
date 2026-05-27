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

  // Return an HTML page that postMessages the token back to the Decap popup parent.
  // Decap's handshake is two-step:
  //   1. Popup → opener:  'authorizing:github'    (handshake init)
  //   2. Opener → popup:  'authorizing:github'    (acknowledgment)
  //   3. Popup → opener:  'authorization:github:success:{"token":"…","provider":"github"}'
  // We must wait for (2) before sending (3) — Decap's first listener only fires on
  // 'authorizing:github', and only after that handshake does it install the
  // listener that accepts 'authorization:github:*'.
  const payload = JSON.stringify({ token: tokenJson.access_token, provider: 'github' });
  const html = `<!doctype html>
<html><body>
<script>
  (function () {
    var sent = false;
    function deliver(origin) {
      if (sent) return;
      sent = true;
      window.opener.postMessage(
        'authorization:github:success:' + ${JSON.stringify(payload)},
        origin || '*'
      );
    }
    function receive(e) {
      // Decap echoes 'authorizing:github' once it picks up our handshake-init.
      if (typeof e.data === 'string' && e.data.indexOf('authorizing:github') === 0) {
        deliver(e.origin);
      }
    }
    window.addEventListener('message', receive, false);
    // Kick off the handshake. Decap's parent window is listening for this exact string.
    if (window.opener) {
      window.opener.postMessage('authorizing:github', '*');
    }
    // Safety: if the handshake reply never arrives (e.g. opener closed), still
    // deliver the token after a short delay so refresh recovers the session.
    setTimeout(function () { deliver('*'); }, 1500);
    // Close the popup once we've delivered the token, regardless of how it went.
    setTimeout(function () { window.close(); }, 2500);
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
