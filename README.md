# Open Board

An infinite canvas whiteboard for brainstorming, diagramming, and visual collaboration — like Miro. Built with **Preact + Tailwind CSS + Hono + SQLite**. Deploys to Cloudflare Workers via [Clawnify](https://clawnify.com).

## Features

- **Infinite canvas** — pan with Space+drag or middle-click, zoom with scroll wheel, no boundaries
- **Sticky notes** — color-coded notes with inline text editing, 12 color presets
- **Shapes** — rectangles, ellipses, diamonds, and triangles with customizable fill colors
- **Text elements** — configurable font size and weight, placed anywhere on the canvas
- **Freehand drawing** — pen tool for sketching and annotation directly on the board
- **Drag and resize** — move and resize any element with corner handles
- **Properties panel** — contextual color, font size, and weight controls for the selected element
- **Keyboard shortcuts** — V (select), H (pan), S (sticky), R (rect), O (ellipse), D (diamond), T (text), P (pen), Delete/Backspace
- **Multiple boards** — create, rename, and delete boards from the home gallery
- **Persistent viewport** — board remembers your pan/zoom position between sessions
- **Dual-mode UI** — human-optimized + AI-agent-optimized (`?agent=true`)
- **Canvas 2D rendering** — lightweight, no heavy dependencies, inspired by AFFiNE's BlockSuite architecture

## Quickstart

```bash
git clone https://github.com/clawnify/open-board.git
cd open-board
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

Open `http://localhost:5179` in your browser. The database schema and demo board are applied automatically on startup.

### Agent Mode

Append `?agent=true` to the URL for an agent-friendly UI with always-visible action buttons and large click targets.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Preact, TypeScript, Tailwind CSS v4, Vite |
| **Canvas** | HTML Canvas 2D (custom rendering engine) |
| **Backend** | Hono (Cloudflare Worker) |
| **Database** | D1 (SQLite at the edge) |
| **Icons** | Lucide |

### Prerequisites

- Node.js 20+
- pnpm

## Architecture

```
src/
  server/
    index.ts    — Hono API with OpenAPI/Zod validation
    db.ts       — SQLite database adapter (better-sqlite3 / D1)
    dev.ts      — Development server with static file serving
    schema.sql  — Database schema (boards, elements) + demo seed
  client/
    app.tsx           — Root component with Home/Editor routing
    context.tsx       — Preact context for board state
    hooks/
      use-router.ts   — pushState URL routing (/board/:id)
      use-boards.ts   — Board CRUD + element operations + keyboard shortcuts
      use-canvas.ts   — Canvas 2D rendering engine, viewport, hit testing, drag/resize
    components/
      home.tsx            — Board gallery with create/rename/delete
      board-editor.tsx    — Editor layout wrapper
      board-header.tsx    — Board name + back navigation
      canvas-view.tsx     — Canvas element + inline text editing overlay
      toolbar.tsx         — Tool palette + zoom controls
      properties-panel.tsx — Contextual color/font property editors
```

### Data Model

```sql
boards (id, name, viewport_json, created_at, updated_at)
elements (id, board_id, type, x, y, width, height, rotation, z_index, props_json)
```

Element types: `sticky`, `shape`, `text`, `freehand`, `connector`, `frame`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create a board |
| GET | `/api/boards/:id` | Get a board with all elements |
| PUT | `/api/boards/:id` | Update board name or viewport |
| DELETE | `/api/boards/:id` | Delete a board and its elements |
| POST | `/api/boards/:boardId/elements` | Create an element on a board |
| PUT | `/api/elements/:id` | Update an element position/size/props |
| PUT | `/api/boards/:boardId/elements/batch` | Batch update multiple elements |
| DELETE | `/api/elements/:id` | Delete an element |
| GET | `/api/stats` | Board and element counts |

## Deploy

```bash
npx clawnify deploy
```

## License

MIT
