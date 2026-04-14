import {
  MousePointer2,
  Hand,
  StickyNote,
  Square,
  Circle,
  Diamond,
  Type,
  Pencil,
  Minus,
  Plus,
  Maximize,
  Trash2,
} from "lucide-preact";
import { useApp } from "../context";
import type { Tool } from "../types";

const tools: { id: Tool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "pan", icon: Hand, label: "Pan", shortcut: "H" },
  { id: "sticky", icon: StickyNote, label: "Sticky Note", shortcut: "S" },
  { id: "shape-rect", icon: Square, label: "Rectangle", shortcut: "R" },
  { id: "shape-ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
  { id: "shape-diamond", icon: Diamond, label: "Diamond", shortcut: "D" },
  { id: "text", icon: Type, label: "Text", shortcut: "T" },
  { id: "freehand", icon: Pencil, label: "Draw", shortcut: "P" },
];

export function Toolbar() {
  const { tool, setTool, viewport, setViewport, selectedIds, deleteSelected } = useApp();

  const zoomIn = () => {
    setViewport({ ...viewport, zoom: Math.min(5, viewport.zoom * 1.2) });
  };
  const zoomOut = () => {
    setViewport({ ...viewport, zoom: Math.max(0.1, viewport.zoom / 1.2) });
  };
  const resetView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };

  return (
    <>
      {/* Tool bar — left side */}
      <div class="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5">
        {tools.map(({ id, icon: Icon, label, shortcut }) => (
          <button
            key={id}
            onClick={() => setTool(id)}
            class={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              tool === id
                ? "bg-indigo-100 text-indigo-600"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
            title={`${label} (${shortcut})`}
            aria-label={label}
          >
            <Icon class="w-[18px] h-[18px]" />
          </button>
        ))}
      </div>

      {/* Zoom controls — bottom center */}
      <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white rounded-xl shadow-lg border border-slate-200 px-2 py-1.5">
        <button
          onClick={zoomOut}
          class="p-1 text-slate-500 hover:text-slate-700 rounded"
          aria-label="Zoom out"
        >
          <Minus class="w-4 h-4" />
        </button>
        <span class="text-xs font-medium text-slate-600 w-12 text-center select-none">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          class="p-1 text-slate-500 hover:text-slate-700 rounded"
          aria-label="Zoom in"
        >
          <Plus class="w-4 h-4" />
        </button>
        <div class="w-px h-4 bg-slate-200 mx-1" />
        <button
          onClick={resetView}
          class="p-1 text-slate-500 hover:text-slate-700 rounded"
          aria-label="Reset view"
        >
          <Maximize class="w-4 h-4" />
        </button>
      </div>

      {/* Delete — bottom right (only when selection exists) */}
      {selectedIds.size > 0 && (
        <div class="absolute bottom-3 right-3 z-10">
          <button
            onClick={deleteSelected}
            class="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
            aria-label="Delete selected"
          >
            <Trash2 class="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </>
  );
}
