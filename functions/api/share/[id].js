import { json, bad } from '../_lib.js';

// GET /api/share/:id  → the shared snapshot { id, data } (read-only viewer payload)
export async function onRequestGet(context) {
  try {
    const row = await context.env.DB
      .prepare('SELECT id, data FROM shares WHERE id = ?')
      .bind(context.params.id)
      .first();
    if (!row) return bad('share not found', 404);
    row.data = JSON.parse(row.data);
    return json(row);
  } catch (e) {
    return bad('share fetch failed: ' + e.message, 500);
  }
}
