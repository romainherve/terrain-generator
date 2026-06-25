-- Cloud presets for the Martell terrain tool.
-- One table holds both full-settings snapshots and camera animations.
CREATE TABLE IF NOT EXISTS presets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT    NOT NULL CHECK (kind IN ('settings','animation')),
  name        TEXT    NOT NULL,
  data        TEXT    NOT NULL,            -- JSON: full `params` (settings) or `params.timeline` (animation)
  is_default  INTEGER NOT NULL DEFAULT 0,  -- 1 for the single settings boot default (enforced in code)
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (kind, name)                      -- upsert-by-name
);

CREATE INDEX IF NOT EXISTS idx_presets_kind    ON presets (kind, name);
CREATE INDEX IF NOT EXISTS idx_presets_default ON presets (kind, is_default);
