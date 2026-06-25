import { json, bad, isKind } from './_lib.js';

// GET /api/presets?kind=settings|animation  → list metadata only (no big data blob)
export async function onRequestGet(context) {
  try {
    const kind = new URL(context.request.url).searchParams.get('kind');
    if (!isKind(kind)) return bad('kind must be settings or animation');
    const { results } = await context.env.DB
      .prepare('SELECT id, name, is_default, updated_at FROM presets WHERE kind = ? ORDER BY name')
      .bind(kind)
      .all();
    return json(results || []);
  } catch (e) {
    return bad('list failed: ' + e.message, 500);
  }
}

// POST /api/presets  body {kind, name, data, isDefault?}  → upsert by (kind, name)
export async function onRequestPost(context) {
  try {
    let body;
    try { body = await context.request.json(); } catch { return bad('invalid JSON body'); }
    const { kind, name, data, isDefault } = body || {};
    if (!isKind(kind)) return bad('bad kind');
    if (!name || !String(name).trim()) return bad('name required');
    if (data === undefined) return bad('data required');

    const nm = String(name).trim();
    const dataText = JSON.stringify(data);
    const wantDefault = kind === 'settings' && isDefault ? 1 : 0;

    const upsert = context.env.DB.prepare(
      `INSERT INTO presets (kind, name, data, is_default, updated_at)
         VALUES (?1, ?2, ?3, ?4, datetime('now'))
       ON CONFLICT(kind, name) DO UPDATE SET
         data = excluded.data,
         is_default = excluded.is_default,
         updated_at = datetime('now')`
    ).bind(kind, nm, dataText, wantDefault);

    if (wantDefault) {
      // atomic: clear other defaults of this kind, then write this row as the default
      await context.env.DB.batch([
        context.env.DB.prepare('UPDATE presets SET is_default = 0 WHERE kind = ? AND name <> ?').bind(kind, nm),
        upsert,
      ]);
    } else {
      await upsert.run();
    }
    return json({ ok: true, name: nm, isDefault: !!wantDefault });
  } catch (e) {
    return bad('save failed: ' + e.message, 500);
  }
}
