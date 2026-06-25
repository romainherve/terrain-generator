// Shared helpers for the cloud-preset API (underscore prefix → not a route).
export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const bad = (msg, status = 400) => json({ error: msg }, status);

export const isKind = (k) => k === 'settings' || k === 'animation';
