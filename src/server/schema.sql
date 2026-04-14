CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL DEFAULT 'Untitled Board',
  viewport_json TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS elements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sticky','shape','text','freehand','connector','frame')),
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  width REAL NOT NULL DEFAULT 200,
  height REAL NOT NULL DEFAULT 200,
  rotation REAL NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 0,
  props_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_elements_board ON elements(board_id);

-- Seed a sample board
INSERT OR IGNORE INTO boards (id, name) VALUES ('demo', 'Welcome Board');

INSERT OR IGNORE INTO elements (id, board_id, type, x, y, width, height, z_index, props_json) VALUES
  ('s1', 'demo', 'sticky', -300, -150, 220, 200, 1, '{"text":"Welcome to Open Board!","color":"#fef08a"}'),
  ('s2', 'demo', 'sticky', 0, -150, 220, 200, 2, '{"text":"Drag to move, scroll to zoom, Space+drag to pan","color":"#bbf7d0"}'),
  ('s3', 'demo', 'sticky', 300, -150, 220, 200, 3, '{"text":"Double-click a sticky to edit text","color":"#bfdbfe"}'),
  ('sh1', 'demo', 'shape', -200, 150, 160, 160, 4, '{"shapeType":"rect","fill":"#6366f1","stroke":"#4f46e5","strokeWidth":2}'),
  ('sh2', 'demo', 'shape', 50, 150, 160, 160, 5, '{"shapeType":"ellipse","fill":"#f472b6","stroke":"#ec4899","strokeWidth":2}'),
  ('sh3', 'demo', 'shape', 300, 150, 160, 160, 6, '{"shapeType":"diamond","fill":"#34d399","stroke":"#10b981","strokeWidth":2}'),
  ('t1', 'demo', 'text', -100, -300, 400, 50, 7, '{"text":"Open Board - Infinite Canvas Whiteboard","fontSize":28,"fontWeight":"700","color":"#1e293b"}');
