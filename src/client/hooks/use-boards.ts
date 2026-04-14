import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { api } from "../api";
import type { Board, BoardElement, BoardWithElements, Viewport, Tool } from "../types";

const STICKY_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff", "#fed7aa"];

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>("select");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Board CRUD ────────────────────────────────────────────────────

  const fetchBoards = useCallback(async () => {
    const rows = await api<Board[]>("GET", "/api/boards");
    setBoards(rows);
    setLoading(false);
  }, []);

  const loadBoard = useCallback(async (id: string) => {
    setLoading(true);
    const data = await api<BoardWithElements>("GET", `/api/boards/${id}`);
    setActiveBoard(data);
    setElements(data.elements);
    try {
      const vp = JSON.parse(data.viewport_json);
      setViewport(vp);
    } catch {
      setViewport({ x: 0, y: 0, zoom: 1 });
    }
    setSelectedIds(new Set());
    setLoading(false);
  }, []);

  const createBoard = useCallback(async (name?: string): Promise<string | undefined> => {
    const board = await api<Board>("POST", "/api/boards", { name });
    setBoards((prev) => [board, ...prev]);
    return board.id;
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    await api<{ ok: boolean }>("DELETE", `/api/boards/${id}`);
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const renameBoard = useCallback(async (id: string, name: string) => {
    await api<Board>("PUT", `/api/boards/${id}`, { name });
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
    if (activeBoard?.id === id) setActiveBoard((prev) => (prev ? { ...prev, name } : null));
  }, [activeBoard]);

  // ── Save viewport (debounced) ────────────────────────────────────

  const saveViewport = useCallback(
    (vp: Viewport) => {
      setViewport(vp);
      if (!activeBoard) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        await api("PUT", `/api/boards/${activeBoard.id}`, {
          viewport_json: JSON.stringify(vp),
        });
      }, 1000);
    },
    [activeBoard]
  );

  // ── Element operations ────────────────────────────────────────────

  const onElementMove = useCallback((id: string, x: number, y: number) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, x, y } : el)));
  }, []);

  const onElementResize = useCallback((id: string, x: number, y: number, w: number, h: number) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, x, y, width: w, height: h } : el))
    );
  }, []);

  const persistElement = useCallback(async (el: BoardElement) => {
    await api("PUT", `/api/elements/${el.id}`, {
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      z_index: el.z_index,
      props_json: el.props_json,
    });
  }, []);

  // Save on pointer up (debounced by element)
  const saveElement = useCallback(
    (id: string) => {
      const el = elements.find((e) => e.id === id);
      if (el) persistElement(el);
    },
    [elements, persistElement]
  );

  const addElement = useCallback(
    async (toolType: string, wx: number, wy: number, extraProps?: Record<string, unknown>) => {
      if (!activeBoard) return;
      let type = "sticky";
      let width = 220;
      let height = 200;
      let props: Record<string, unknown> = {};

      switch (toolType) {
        case "sticky":
          type = "sticky";
          width = 220;
          height = 200;
          props = {
            text: "",
            color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
          };
          break;
        case "shape-rect":
          type = "shape";
          width = 160;
          height = 160;
          props = { shapeType: "rect", fill: "#6366f1", stroke: "#4f46e5", strokeWidth: 2 };
          break;
        case "shape-ellipse":
          type = "shape";
          width = 160;
          height = 160;
          props = { shapeType: "ellipse", fill: "#f472b6", stroke: "#ec4899", strokeWidth: 2 };
          break;
        case "shape-diamond":
          type = "shape";
          width = 160;
          height = 160;
          props = { shapeType: "diamond", fill: "#34d399", stroke: "#10b981", strokeWidth: 2 };
          break;
        case "text":
          type = "text";
          width = 300;
          height = 40;
          props = { text: "Text", fontSize: 18, fontWeight: "400", color: "#1e293b" };
          break;
        default:
          return;
      }

      if (extraProps) Object.assign(props, extraProps);

      // Center element on click position
      const x = wx - width / 2;
      const y = wy - height / 2;

      const el = await api<BoardElement>("POST", `/api/boards/${activeBoard.id}/elements`, {
        type,
        x,
        y,
        width,
        height,
        props_json: JSON.stringify(props),
      });
      setElements((prev) => [...prev, el]);
      setSelectedIds(new Set([el.id]));
      setTool("select");
    },
    [activeBoard]
  );

  const addFreehand = useCallback(
    async (points: number[][]) => {
      if (!activeBoard || points.length < 2) return;
      // Calculate bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [px, py] of points) {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
      const el = await api<BoardElement>("POST", `/api/boards/${activeBoard.id}/elements`, {
        type: "freehand",
        x: minX,
        y: minY,
        width: maxX - minX || 1,
        height: maxY - minY || 1,
        props_json: JSON.stringify({ points, color: "#1e293b", strokeWidth: 2 }),
      });
      setElements((prev) => [...prev, el]);
    },
    [activeBoard]
  );

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      await api("DELETE", `/api/elements/${id}`);
    }
    setElements((prev) => prev.filter((el) => !selectedIds.has(el.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const updateElementProps = useCallback(
    async (id: string, propsUpdate: Record<string, unknown>) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      const oldProps = JSON.parse(el.props_json);
      const newProps = { ...oldProps, ...propsUpdate };
      const newPropsJson = JSON.stringify(newProps);
      setElements((prev) =>
        prev.map((e) => (e.id === id ? { ...e, props_json: newPropsJson } : e))
      );
      await api("PUT", `/api/elements/${id}`, { props_json: newPropsJson });
    },
    [elements]
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && !isEditing()) {
        e.preventDefault();
        deleteSelected();
      }
      // Tool shortcuts
      if (isEditing()) return;
      switch (e.key) {
        case "v": case "1": setTool("select"); break;
        case "h": case "2": setTool("pan"); break;
        case "s": if (!e.metaKey && !e.ctrlKey) setTool("sticky"); break;
        case "r": setTool("shape-rect"); break;
        case "o": setTool("shape-ellipse"); break;
        case "d": setTool("shape-diamond"); break;
        case "t": setTool("text"); break;
        case "p": setTool("freehand"); break;
        case "Escape": setTool("select"); setSelectedIds(new Set()); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected]);

  return {
    boards,
    activeBoard,
    elements,
    viewport,
    selectedIds,
    tool,
    loading,
    saving,
    fetchBoards,
    loadBoard,
    createBoard,
    deleteBoard,
    renameBoard,
    setViewport: saveViewport,
    setSelectedIds,
    setTool,
    onElementMove,
    onElementResize,
    saveElement,
    addElement,
    addFreehand,
    deleteSelected,
    updateElementProps,
  };
}

function isEditing(): boolean {
  const active = document.activeElement;
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  );
}
