import { json, bad } from './_lib.js';

// POST /api/upload — raw SVG body (content-type image/svg+xml). Stores it in R2 → { url, key }.
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.MEDIA) return bad('asset storage not configured (R2 binding MEDIA missing)', 500);
    const ct = request.headers.get('content-type') || '';
    if (!ct.includes('svg')) return bad('only SVG uploads are allowed');
    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return bad('empty file');
    if (buf.byteLength > 1024 * 1024) return bad('SVG too large (max 1 MB)');
    // sanity-check it actually looks like SVG markup
    const head = new TextDecoder().decode(buf.slice(0, 512)).trimStart().toLowerCase();
    if (!head.startsWith('<?xml') && !head.includes('<svg')) return bad('that does not look like an SVG');
    const key = crypto.randomUUID().replace(/-/g, '') + '.svg';
    await env.MEDIA.put(key, buf, { httpMetadata: { contentType: 'image/svg+xml' } });
    return json({ url: '/api/asset/' + key, key });
  } catch (e) {
    return bad('upload failed: ' + e.message, 500);
  }
}
