-- Shareable view links: a self-contained snapshot the client opens read-only at /?v=<id>.
-- Random token id (not autoincrement) so links aren't enumerable.
CREATE TABLE IF NOT EXISTS shares (
  id         TEXT PRIMARY KEY,            -- random token used in the share URL
  data       TEXT NOT NULL,               -- JSON: { mode, params, timeline, view }
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
