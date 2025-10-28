export default async function handler(req, res) {
  try {
    const { id } = req.query || {};
    const proto = (req.headers['x-forwarded-proto'] || 'https');
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;

    // Detect API base from env; fallback to same origin backend path if proxied
    const API_BASE = process.env.API_BASE || process.env.REACT_APP_API_BASE || `${origin.replace(/\/$/, '')}`;

    let models = [];
    try {
      const buildsRes = await fetch(`${API_BASE}/api/builds`, { headers: { 'cache-control': 'no-cache' } });
      const data = buildsRes.ok ? await buildsRes.json() : { models: [] };
      models = Array.isArray(data?.models) ? data.models : [];
    } catch {}
    const modelId = Number(id);
    const model = models.find(m => Number(m.id) === modelId);

    const siteName = 'Blockprint';
  const author = (model && model.credits && model.credits.author) ? model.credits.author : '';
  const title = model ? `${model.name}${author ? ` by ${author}` : ''} — ${siteName}` : `Model ${modelId} — ${siteName}`;
    const description = (model?.description || 'Discover and share Minecraft builds with materials and downloads.').slice(0, 200);

    // Prefer a prepared screenshot if available (convention): /screenshots/glb/<id>.png
    const screenshot = `${origin}/screenshots/glb/${modelId}.png`;
    const fallbackImg = `${origin}/logo.png`;
    // Primary image preference order: explicit previewImage, screenshot, then logo
    let primaryImage = fallbackImg;
    if (model?.previewImage) {
      primaryImage = model.previewImage.startsWith('http') ? model.previewImage : `${origin}${model.previewImage}`;
    } else {
      primaryImage = screenshot;
    }

    const pageUrl = `${origin}/model/${encodeURIComponent(id)}`;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  ${author ? `<meta property=\"article:author\" content=\"${escapeHtml(author)}\" />` : ''}
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${escapeHtml(primaryImage)}" />
  <meta property="og:image:alt" content="${escapeHtml(model?.name || siteName)}" />
  <meta property="og:image" content="${escapeHtml(fallbackImg)}" />
  <meta property="og:image:alt" content="${escapeHtml(siteName)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(primaryImage)}" />

  <link rel="icon" href="${origin}/logo.png" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  <meta name="robots" content="index,follow" />
  <meta http-equiv="refresh" content="0; url=${escapeHtml(pageUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a>…</p>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (e) {
    res.status(200).send('<!doctype html><title>Blockprint</title>');
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
