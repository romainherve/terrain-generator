import { json, bad } from './_lib.js';

// POST /api/share  body { mode, params, timeline?, view? }  → { id } (a random share token)
export async function onRequestPost(context) {
  try {
    let body;
    try { body = await context.request.json(); } catch { return bad('invalid JSON body'); }
    if (!body || !body.params) return bad('params required');
    // short, URL-friendly random token (first 16 hex chars of a UUID is plenty for unguessable share links)
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await context.env.DB
      .prepare('INSERT INTO shares (id, data) VALUES (?1, ?2)')
      .bind(id, JSON.stringify(body))
      .run();
    return json({ id });
  } catch (e) {
    return bad('share create failed: ' + e.message, 500);
  }
}
