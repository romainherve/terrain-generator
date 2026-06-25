// GET /api/asset/:key — stream an uploaded SVG from R2. Served sandboxed (CSP default-src 'none')
// so any script embedded in the SVG can't run if the file is opened directly.
export async function onRequestGet(context) {
  const { env, params } = context;
  try {
    if (!env.MEDIA) return new Response('asset storage not configured', { status: 500 });
    const key = (params.key || '').replace(/[^a-zA-Z0-9._-]/g, '');
    if (!key) return new Response('bad key', { status: 400 });
    const obj = await env.MEDIA.get(key);
    if (!obj) return new Response('not found', { status: 404 });
    return new Response(obj.body, {
      headers: {
        'content-type': 'image/svg+xml',
        'cache-control': 'public, max-age=31536000, immutable',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (e) {
    return new Response('asset error: ' + e.message, { status: 500 });
  }
}
