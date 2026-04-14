import { useState } from "preact/hooks";
import { ArrowLeft, Pencil } from "lucide-preact";
import { useApp } from "../context";

export function BoardHeader() {
  const { activeBoard, renameBoard, navigate } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  if (!activeBoard) return null;

  const startEdit = () => {
    setName(activeBoard.name);
    setEditing(true);
  };

  const commitEdit = async () => {
    if (name.trim()) {
      await renameBoard(activeBoard.id, name.trim());
    }
    setEditing(false);
  };

  return (
    <div class="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white rounded-xl shadow-lg border border-slate-200 px-3 py-2">
      <button
        onClick={() => navigate("/")}
        class="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
        aria-label="Back to boards"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>
      <div class="w-px h-5 bg-slate-200" />
      {editing ? (
        <input
          class="text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:border-indigo-500"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          onBlur={commitEdit}
          onKeyDown={(e) => e.key === "Enter" && commitEdit()}
          autoFocus
        />
      ) : (
        <button
          onClick={startEdit}
          class="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
        >
          {activeBoard.name}
          <Pencil class="w-3 h-3 text-slate-400" />
        </button>
      )}
    </div>
  );
}
