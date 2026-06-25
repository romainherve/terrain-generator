import { json, bad } from '../_lib.js';

// GET /api/screens/:id → full row, data parsed
export async function onRequestGet(context) {
  try {
    const row = await context.env.DB
      .prepare('SELECT id, name, data, updated_at FROM screens WHERE id = ?')
      .bind(context.params.id)
      .first();
    if (!row) return bad('not found', 404);
    row.data = JSON.parse(row.data);
    return json(row);
  } catch (e) {
    return bad('get failed: ' + e.message, 500);
  }
}

// DELETE /api/screens/:id
export async function onRequestDelete(context) {
  try {
    const res = await context.env.DB
      .prepare('DELETE FROM screens WHERE id = ?')
      .bind(context.params.id)
      .run();
    return json({ ok: true, deleted: res.meta?.changes ?? 0 });
  } catch (e) {
    return bad('delete failed: ' + e.message, 500);
  }
}
