export default async function handler(req, res) {
  try {
    const base = (process.env.BACKEND_URL || '').replace(/\/$/, '');
    if (!base) {
      res.status(500).json({ error: 'BACKEND_URL not configured' });
      return;
    }

    // Build target URL preserving path and query
    const pathParts = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
    const subPath = pathParts.join('/');
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = `${base}/${subPath}${query}`;

    // Prepare request init
    const headers = { ...req.headers };
    // Remove headers that should be set by fetch
    delete headers.host;
    delete headers['content-length'];

    const init = {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req,
      redirect: 'manual'
    };

    const resp = await fetch(targetUrl, init);

    // Copy status
    res.status(resp.status);

    // Copy headers, with special handling for Set-Cookie (multiple)
    for (const [key, value] of resp.headers.entries()) {
      if (key.toLowerCase() === 'set-cookie') continue; // handle below
      // Avoid overriding transfer-encoding/content-length; express will set it
      if (['transfer-encoding', 'content-length'].includes(key.toLowerCase())) continue;
      res.setHeader(key, value);
    }
    // Node/undici may expose raw set-cookie values
    const getRaw = resp.headers.raw?.bind(resp.headers);
    const setCookies = getRaw ? getRaw()['set-cookie'] : resp.headers.get('set-cookie');
    if (setCookies) {
      res.setHeader('set-cookie', setCookies);
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: 'Proxy error', detail: String(e?.message || e) });
  }
}
