import { json, bad } from './_lib.js';

// GET /api/default  → the current settings boot-default (full data), or null so the
// client falls back to the committed parameters.json.
export async function onRequestGet(context) {
  try {
    const row = await context.env.DB
      .prepare(`SELECT id, name, data FROM presets WHERE kind = 'settings' AND is_default = 1 LIMIT 1`)
      .first();
    if (!row) return json(null);
    row.data = JSON.parse(row.data);
    return json(row);
  } catch (e) {
    return bad('default failed: ' + e.message, 500);
  }
}
