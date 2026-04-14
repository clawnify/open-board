import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Board, BoardElement, Viewport, Tool } from "./types";

export interface AppContextValue {
  boards: Board[];
  activeBoard: Board | null;
  elements: BoardElement[];
  viewport: Viewport;
  selectedIds: Set<string>;
  tool: Tool;
  loading: boolean;
  saving: boolean;
  navigate: (to: string) => void;
  fetchBoards: () => Promise<void>;
  loadBoard: (id: string) => Promise<void>;
  createBoard: (name?: string) => Promise<string | undefined>;
  deleteBoard: (id: string) => Promise<void>;
  renameBoard: (id: string, name: string) => Promise<void>;
  setViewport: (v: Viewport) => void;
  setSelectedIds: (ids: Set<string>) => void;
  setTool: (t: Tool) => void;
  onElementMove: (id: string, x: number, y: number) => void;
  onElementResize: (id: string, x: number, y: number, w: number, h: number) => void;
  saveElement: (id: string) => void;
  addElement: (type: string, x: number, y: number, props?: Record<string, unknown>) => void;
  addFreehand: (points: number[][]) => void;
  deleteSelected: () => void;
  updateElementProps: (id: string, props: Record<string, unknown>) => Promise<void>;
}

export const AppContext = createContext<AppContextValue>(null!);

export function useApp() {
  return useContext(AppContext);
}
