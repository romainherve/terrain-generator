-- Cloud-saved UI screens — a separate "folder" from presets/animations.
-- data JSON = { name, svgs: { "<ratio>": "<r2 url>" }, bgAnim: "<cloud animation name>|null" }
CREATE TABLE IF NOT EXISTS screens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,        -- upsert-by-name
  data       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
