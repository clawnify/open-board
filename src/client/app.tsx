import { useEffect } from "preact/hooks";
import { AppContext } from "./context";
import { useRouter } from "./hooks/use-router";
import { useBoards } from "./hooks/use-boards";
import { Home } from "./components/home";
import { BoardEditor } from "./components/board-editor";

export function App() {
  const { path, navigate, boardId } = useRouter();
  const boardState = useBoards();

  // Fetch boards list on mount
  useEffect(() => {
    boardState.fetchBoards();
  }, []);

  // Load board when boardId changes
  useEffect(() => {
    if (boardId) {
      boardState.loadBoard(boardId);
    }
  }, [boardId]);

  if (boardState.loading && boardId) {
    return (
      <div class="flex items-center justify-center h-screen bg-slate-50">
        <div class="text-center">
          <div class="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-3 mx-auto" />
          <p class="text-slate-400 text-sm">Loading board...</p>
        </div>
      </div>
    );
  }

  if (!boardId) {
    return (
      <Home
        boards={boardState.boards}
        navigate={navigate}
        createBoard={boardState.createBoard}
        deleteBoard={boardState.deleteBoard}
        renameBoard={boardState.renameBoard}
      />
    );
  }

  const contextValue = {
    ...boardState,
    navigate,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <BoardEditor />
    </AppContext.Provider>
  );
}
