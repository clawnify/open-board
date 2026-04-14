import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { query, get, run } from "./db.js";

const app = new OpenAPIHono();

// ── Schemas ──────────────────────────────────────────────────────────

const BoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  viewport_json: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const ElementSchema = z.object({
  id: z.string(),
  board_id: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  z_index: z.number(),
  props_json: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const BoardWithElementsSchema = BoardSchema.extend({
  elements: z.array(ElementSchema),
});

const ErrorSchema = z.object({ error: z.string() });

// ── List boards ─────────────────────────────────────────────────────

const listBoards = createRoute({
  method: "get",
  path: "/api/boards",
  responses: { 200: { content: { "application/json": { schema: z.array(BoardSchema) } }, description: "OK" } },
});

app.openapi(listBoards, async (c) => {
  const rows = await query<z.infer<typeof BoardSchema>>("SELECT * FROM boards ORDER BY updated_at DESC");
  return c.json(rows, 200);
});

// ── Get board with elements ─────────────────────────────────────────

const getBoard = createRoute({
  method: "get",
  path: "/api/boards/{id}",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { content: { "application/json": { schema: BoardWithElementsSchema } }, description: "OK" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

app.openapi(getBoard, async (c) => {
  const { id } = c.req.valid("param");
  const board = await get<z.infer<typeof BoardSchema>>("SELECT * FROM boards WHERE id = ?", id);
  if (!board) return c.json({ error: "Not found" }, 404);
  const elements = await query<z.infer<typeof ElementSchema>>(
    "SELECT * FROM elements WHERE board_id = ? ORDER BY z_index",
    id
  );
  return c.json({ ...board, elements }, 200);
});

// ── Create board ────────────────────────────────────────────────────

const createBoard = createRoute({
  method: "post",
  path: "/api/boards",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ name: z.string().optional() }),
        },
      },
    },
  },
  responses: { 200: { content: { "application/json": { schema: BoardSchema } }, description: "OK" } },
});

app.openapi(createBoard, async (c) => {
  const { name } = c.req.valid("json");
  await run("INSERT INTO boards (name) VALUES (?)", name || "Untitled Board");
  const row = await get<z.infer<typeof BoardSchema>>("SELECT * FROM boards ORDER BY created_at DESC LIMIT 1");
  return c.json(row!, 200);
});

// ── Update board ────────────────────────────────────────────────────

const updateBoard = createRoute({
  method: "put",
  path: "/api/boards/{id}",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().optional(),
            viewport_json: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { content: { "application/json": { schema: BoardSchema } }, description: "OK" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

app.openapi(updateBoard, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const existing = await get<z.infer<typeof BoardSchema>>("SELECT * FROM boards WHERE id = ?", id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  await run(
    `UPDATE boards SET name = ?, viewport_json = ?, updated_at = datetime('now') WHERE id = ?`,
    body.name ?? existing.name,
    body.viewport_json ?? existing.viewport_json,
    id
  );
  const row = await get<z.infer<typeof BoardSchema>>("SELECT * FROM boards WHERE id = ?", id);
  return c.json(row!, 200);
});

// ── Delete board ────────────────────────────────────────────────────

const deleteBoard = createRoute({
  method: "delete",
  path: "/api/boards/{id}",
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "OK" } },
});

app.openapi(deleteBoard, async (c) => {
  const { id } = c.req.valid("param");
  await run("DELETE FROM boards WHERE id = ?", id);
  return c.json({ ok: true }, 200);
});

// ── Create element ──────────────────────────────────────────────────

const createElement = createRoute({
  method: "post",
  path: "/api/boards/{boardId}/elements",
  request: {
    params: z.object({ boardId: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            type: z.string(),
            x: z.number().optional(),
            y: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            rotation: z.number().optional(),
            z_index: z.number().optional(),
            props_json: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: { 200: { content: { "application/json": { schema: ElementSchema } }, description: "OK" } },
});

app.openapi(createElement, async (c) => {
  const { boardId } = c.req.valid("param");
  const body = c.req.valid("json");
  const maxZ = await get<{ m: number }>("SELECT COALESCE(MAX(z_index), 0) as m FROM elements WHERE board_id = ?", boardId);
  const zIndex = body.z_index ?? ((maxZ?.m ?? 0) + 1);
  await run(
    `INSERT INTO elements (board_id, type, x, y, width, height, rotation, z_index, props_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    boardId,
    body.type,
    body.x ?? 0,
    body.y ?? 0,
    body.width ?? 200,
    body.height ?? 200,
    body.rotation ?? 0,
    zIndex,
    body.props_json ?? "{}"
  );
  const row = await get<z.infer<typeof ElementSchema>>("SELECT * FROM elements WHERE board_id = ? ORDER BY created_at DESC LIMIT 1", boardId);
  return c.json(row!, 200);
});

// ── Update element ──────────────────────────────────────────────────

const updateElement = createRoute({
  method: "put",
  path: "/api/elements/{id}",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            x: z.number().optional(),
            y: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            rotation: z.number().optional(),
            z_index: z.number().optional(),
            props_json: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { content: { "application/json": { schema: ElementSchema } }, description: "OK" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

app.openapi(updateElement, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const existing = await get<z.infer<typeof ElementSchema>>("SELECT * FROM elements WHERE id = ?", id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  await run(
    `UPDATE elements SET x = ?, y = ?, width = ?, height = ?, rotation = ?, z_index = ?, props_json = ?, updated_at = datetime('now') WHERE id = ?`,
    body.x ?? existing.x,
    body.y ?? existing.y,
    body.width ?? existing.width,
    body.height ?? existing.height,
    body.rotation ?? existing.rotation,
    body.z_index ?? existing.z_index,
    body.props_json ?? existing.props_json,
    id
  );
  const row = await get<z.infer<typeof ElementSchema>>("SELECT * FROM elements WHERE id = ?", id);
  return c.json(row!, 200);
});

// ── Batch update elements ───────────────────────────────────────────

const batchUpdateElements = createRoute({
  method: "put",
  path: "/api/boards/{boardId}/elements/batch",
  request: {
    params: z.object({ boardId: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            updates: z.array(
              z.object({
                id: z.string(),
                x: z.number().optional(),
                y: z.number().optional(),
                width: z.number().optional(),
                height: z.number().optional(),
                rotation: z.number().optional(),
                z_index: z.number().optional(),
                props_json: z.string().optional(),
              })
            ),
          }),
        },
      },
    },
  },
  responses: { 200: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "OK" } },
});

app.openapi(batchUpdateElements, async (c) => {
  const body = c.req.valid("json");
  for (const u of body.updates) {
    const existing = await get<z.infer<typeof ElementSchema>>("SELECT * FROM elements WHERE id = ?", u.id);
    if (!existing) continue;
    await run(
      `UPDATE elements SET x = ?, y = ?, width = ?, height = ?, rotation = ?, z_index = ?, props_json = ?, updated_at = datetime('now') WHERE id = ?`,
      u.x ?? existing.x,
      u.y ?? existing.y,
      u.width ?? existing.width,
      u.height ?? existing.height,
      u.rotation ?? existing.rotation,
      u.z_index ?? existing.z_index,
      u.props_json ?? existing.props_json,
      u.id
    );
  }
  return c.json({ ok: true }, 200);
});

// ── Delete element ──────────────────────────────────────────────────

const deleteElement = createRoute({
  method: "delete",
  path: "/api/elements/{id}",
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "OK" } },
});

app.openapi(deleteElement, async (c) => {
  const { id } = c.req.valid("param");
  await run("DELETE FROM elements WHERE id = ?", id);
  return c.json({ ok: true }, 200);
});

// ── Stats ───────────────────────────────────────────────────────────

app.get("/api/stats", async (c) => {
  const boards = await get<{ c: number }>("SELECT COUNT(*) as c FROM boards");
  const elements = await get<{ c: number }>("SELECT COUNT(*) as c FROM elements");
  return c.json({ boards: boards?.c ?? 0, elements: elements?.c ?? 0 });
});

// ── OpenAPI doc ─────────────────────────────────────────────────────

app.doc("/openapi.json", { openapi: "3.0.0", info: { title: "Board App API", version: "1.0.0" } });

export default app;
