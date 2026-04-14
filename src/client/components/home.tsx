import { useState } from "preact/hooks";
import { Plus, Layout, Trash2, Pencil, Clock } from "lucide-preact";
import type { Board } from "../types";

interface HomeProps {
  boards: Board[];
  navigate: (to: string) => void;
  createBoard: (name?: string) => Promise<string | undefined>;
  deleteBoard: (id: string) => Promise<void>;
  renameBoard: (id: string, name: string) => Promise<void>;
}

export function Home({ boards, navigate, createBoard, deleteBoard, renameBoard }: HomeProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleCreate = async () => {
    const id = await createBoard();
    if (id) navigate(`/board/${id}`);
  };

  const startRename = (board: Board) => {
    setRenamingId(board.id);
    setRenameValue(board.name);
  };

  const commitRename = async () => {
    if (renamingId && renameValue.trim()) {
      await renameBoard(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <div class="min-h-screen bg-slate-50">
      <header class="bg-white border-b border-slate-200 px-6 py-4">
        <div class="max-w-5xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Layout class="w-4 h-4 text-white" />
            </div>
            <h1 class="text-xl font-semibold text-slate-900">Open Board</h1>
          </div>
          <button
            onClick={handleCreate}
            class="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus class="w-4 h-4" />
            New Board
          </button>
        </div>
      </header>

      <main class="max-w-5xl mx-auto px-6 py-8">
        {boards.length === 0 ? (
          <div class="text-center py-20">
            <Layout class="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p class="text-slate-500 mb-4">No boards yet</p>
            <button
              onClick={handleCreate}
              class="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus class="w-4 h-4" />
              Create your first board
            </button>
          </div>
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                class="group bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div
                  class="h-36 bg-slate-100 rounded-t-xl flex items-center justify-center"
                  onClick={() => navigate(`/board/${board.id}`)}
                >
                  <Layout class="w-10 h-10 text-slate-300" />
                </div>
                <div class="p-4">
                  {renamingId === board.id ? (
                    <input
                      class="w-full text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                      value={renameValue}
                      onInput={(e) => setRenameValue((e.target as HTMLInputElement).value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => e.key === "Enter" && commitRename()}
                      autoFocus
                    />
                  ) : (
                    <h3
                      class="text-sm font-medium text-slate-900 truncate"
                      onClick={() => navigate(`/board/${board.id}`)}
                    >
                      {board.name}
                    </h3>
                  )}
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-xs text-slate-400 flex items-center gap-1">
                      <Clock class="w-3 h-3" />
                      {new Date(board.updated_at).toLocaleDateString()}
                    </span>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(board);
                        }}
                        class="p-1 text-slate-400 hover:text-slate-600 rounded"
                        aria-label="Rename board"
                      >
                        <Pencil class="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this board?")) deleteBoard(board.id);
                        }}
                        class="p-1 text-slate-400 hover:text-red-500 rounded"
                        aria-label="Delete board"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
