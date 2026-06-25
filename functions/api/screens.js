import { json, bad } from './_lib.js';

// GET /api/screens → list metadata (no data blob)
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB
      .prepare('SELECT id, name, updated_at FROM screens ORDER BY name')
      .all();
    return json(results || []);
  } catch (e) {
    return bad('list failed: ' + e.message, 500);
  }
}

// POST /api/screens  body { name, data }  → upsert by name
export async function onRequestPost(context) {
  try {
    let body;
    try { body = await context.request.json(); } catch { return bad('invalid JSON body'); }
    const { name, data } = body || {};
    if (!name || !String(name).trim()) return bad('name required');
    if (data === undefined) return bad('data required');
    const nm = String(name).trim();
    await context.env.DB
      .prepare(
        `INSERT INTO screens (name, data, updated_at) VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`
      )
      .bind(nm, JSON.stringify(data))
      .run();
    return json({ ok: true, name: nm });
  } catch (e) {
    return bad('save failed: ' + e.message, 500);
  }
}
