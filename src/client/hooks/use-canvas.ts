import { useRef, useCallback, useEffect, useState } from "preact/hooks";
import type { BoardElement, Viewport, Tool, FreehandProps } from "../types";

const GRID_SIZE = 40;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const HANDLE_SIZE = 8;

interface DragState {
  type: "move" | "resize" | "pan" | "draw-freehand" | "draw-connector" | "create-shape";
  startScreenX: number;
  startScreenY: number;
  startWorldX: number;
  startWorldY: number;
  elementId?: string;
  resizeHandle?: string;
  origX?: number;
  origY?: number;
  origW?: number;
  origH?: number;
  freehandPoints?: number[][];
}

export function useCanvas(
  elements: BoardElement[],
  viewport: Viewport,
  setViewport: (v: Viewport) => void,
  selectedIds: Set<string>,
  setSelectedIds: (ids: Set<string>) => void,
  tool: Tool,
  onElementMove: (id: string, x: number, y: number) => void,
  onElementResize: (id: string, x: number, y: number, w: number, h: number) => void,
  onAddElement: (type: string, x: number, y: number, props?: Record<string, unknown>) => void,
  onFreehandComplete: (points: number[][]) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number>(0);
  const dirtyRef = useRef(true);
  const spaceRef = useRef(false);
  const viewportRef = useRef(viewport);
  const elementsRef = useRef(elements);
  const selectedIdsRef = useRef(selectedIds);
  const toolRef = useRef(tool);

  viewportRef.current = viewport;
  elementsRef.current = elements;
  selectedIdsRef.current = selectedIds;
  toolRef.current = tool;

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  // Coordinate transforms
  const screenToWorld = useCallback((sx: number, sy: number): [number, number] => {
    const v = viewportRef.current;
    return [(sx - v.x) / v.zoom, (sy - v.y) / v.zoom];
  }, []);

  const worldToScreen = useCallback((wx: number, wy: number): [number, number] => {
    const v = viewportRef.current;
    return [wx * v.zoom + v.x, wy * v.zoom + v.y];
  }, []);

  // Hit testing
  const hitTest = useCallback((wx: number, wy: number): BoardElement | null => {
    const els = elementsRef.current;
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      if (el.type === "freehand") continue;
      if (wx >= el.x && wx <= el.x + el.width && wy >= el.y && wy <= el.y + el.height) {
        return el;
      }
    }
    return null;
  }, []);

  // Resize handle hit test
  const hitResizeHandle = useCallback((wx: number, wy: number): { elementId: string; handle: string } | null => {
    const v = viewportRef.current;
    const handleWorldSize = HANDLE_SIZE / v.zoom;
    for (const id of selectedIdsRef.current) {
      const el = elementsRef.current.find((e) => e.id === id);
      if (!el || el.type === "freehand") continue;
      const corners = [
        { handle: "nw", x: el.x, y: el.y },
        { handle: "ne", x: el.x + el.width, y: el.y },
        { handle: "sw", x: el.x, y: el.y + el.height },
        { handle: "se", x: el.x + el.width, y: el.y + el.height },
      ];
      for (const c of corners) {
        if (Math.abs(wx - c.x) < handleWorldSize && Math.abs(wy - c.y) < handleWorldSize) {
          return { elementId: el.id, handle: c.handle };
        }
      }
    }
    return null;
  }, []);

  // ── Drawing functions ──────────────────────────────────────────────

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const v = viewportRef.current;
    const gridWorld = GRID_SIZE;
    const gridScreen = gridWorld * v.zoom;

    if (gridScreen < 6) return; // too dense

    const startWx = Math.floor(-v.x / v.zoom / gridWorld) * gridWorld;
    const startWy = Math.floor(-v.y / v.zoom / gridWorld) * gridWorld;
    const endWx = startWx + w / v.zoom + gridWorld;
    const endWy = startWy + h / v.zoom + gridWorld;

    ctx.strokeStyle = v.zoom > 0.4 ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let wx = startWx; wx <= endWx; wx += gridWorld) {
      const [sx] = worldToScreen(wx, 0);
      ctx.moveTo(Math.round(sx) + 0.5, 0);
      ctx.lineTo(Math.round(sx) + 0.5, h);
    }
    for (let wy = startWy; wy <= endWy; wy += gridWorld) {
      const [, sy] = worldToScreen(0, wy);
      ctx.moveTo(0, Math.round(sy) + 0.5);
      ctx.lineTo(w, Math.round(sy) + 0.5);
    }
    ctx.stroke();
  }, [worldToScreen]);

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, el: BoardElement) => {
    const props = JSON.parse(el.props_json);
    ctx.save();

    switch (el.type) {
      case "sticky": {
        // Shadow
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        // Background
        ctx.fillStyle = props.color || "#fef08a";
        const r = 6;
        ctx.beginPath();
        ctx.roundRect(el.x, el.y, el.width, el.height, r);
        ctx.fill();
        ctx.shadowColor = "transparent";
        // Text
        if (props.text) {
          ctx.fillStyle = "#1e293b";
          ctx.font = "500 15px Inter, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, props.text, el.x + 14, el.y + 14, el.width - 28, 20);
        }
        break;
      }
      case "shape": {
        ctx.fillStyle = props.fill || "#6366f1";
        ctx.strokeStyle = props.stroke || "transparent";
        ctx.lineWidth = props.strokeWidth || 0;
        switch (props.shapeType) {
          case "rect":
            ctx.beginPath();
            ctx.roundRect(el.x, el.y, el.width, el.height, 4);
            ctx.fill();
            if (props.strokeWidth) ctx.stroke();
            break;
          case "ellipse":
            ctx.beginPath();
            ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            if (props.strokeWidth) ctx.stroke();
            break;
          case "diamond":
            ctx.beginPath();
            ctx.moveTo(el.x + el.width / 2, el.y);
            ctx.lineTo(el.x + el.width, el.y + el.height / 2);
            ctx.lineTo(el.x + el.width / 2, el.y + el.height);
            ctx.lineTo(el.x, el.y + el.height / 2);
            ctx.closePath();
            ctx.fill();
            if (props.strokeWidth) ctx.stroke();
            break;
          case "triangle":
            ctx.beginPath();
            ctx.moveTo(el.x + el.width / 2, el.y);
            ctx.lineTo(el.x + el.width, el.y + el.height);
            ctx.lineTo(el.x, el.y + el.height);
            ctx.closePath();
            ctx.fill();
            if (props.strokeWidth) ctx.stroke();
            break;
        }
        break;
      }
      case "text": {
        ctx.fillStyle = props.color || "#1e293b";
        ctx.font = `${props.fontWeight || "400"} ${props.fontSize || 18}px Inter, sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        wrapText(ctx, props.text || "", el.x, el.y, el.width, (props.fontSize || 18) * 1.3);
        break;
      }
      case "freehand": {
        const pts: number[][] = props.points || [];
        if (pts.length < 2) break;
        ctx.strokeStyle = props.color || "#1e293b";
        ctx.lineWidth = props.strokeWidth || 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i][0], pts[i][1]);
        }
        ctx.stroke();
        break;
      }
      case "connector": {
        const pts: number[][] = props.points || [];
        if (pts.length < 2) break;
        ctx.strokeStyle = props.color || "#6366f1";
        ctx.lineWidth = props.strokeWidth || 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i][0], pts[i][1]);
        }
        ctx.stroke();
        // Arrowhead
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
        const arrowLen = 12;
        ctx.beginPath();
        ctx.moveTo(last[0], last[1]);
        ctx.lineTo(last[0] - arrowLen * Math.cos(angle - 0.4), last[1] - arrowLen * Math.sin(angle - 0.4));
        ctx.moveTo(last[0], last[1]);
        ctx.lineTo(last[0] - arrowLen * Math.cos(angle + 0.4), last[1] - arrowLen * Math.sin(angle + 0.4));
        ctx.stroke();
        break;
      }
      case "frame": {
        ctx.strokeStyle = props.color || "#94a3b8";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(el.x, el.y, el.width, el.height);
        ctx.setLineDash([]);
        if (props.label) {
          ctx.fillStyle = props.color || "#94a3b8";
          ctx.font = "600 13px Inter, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";
          ctx.fillText(props.label, el.x + 4, el.y - 4);
        }
        break;
      }
    }

    ctx.restore();
  }, []);

  const drawSelectionBox = useCallback((ctx: CanvasRenderingContext2D, el: BoardElement) => {
    ctx.save();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2 / viewportRef.current.zoom;
    ctx.setLineDash([]);
    ctx.strokeRect(el.x, el.y, el.width, el.height);

    // Resize handles
    if (el.type !== "freehand") {
      const hs = HANDLE_SIZE / viewportRef.current.zoom;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5 / viewportRef.current.zoom;
      const corners = [
        [el.x, el.y],
        [el.x + el.width, el.y],
        [el.x, el.y + el.height],
        [el.x + el.width, el.y + el.height],
      ];
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
        ctx.strokeRect(cx - hs / 2, cy - hs / 2, hs, hs);
      }
    }
    ctx.restore();
  }, []);

  // ── Render loop ───────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      dirtyRef.current = true;
    }

    if (!dirtyRef.current) return;
    dirtyRef.current = false;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, w, h);

    // Grid
    drawGrid(ctx, w, h);

    // Apply viewport transform
    const v = viewportRef.current;
    ctx.save();
    ctx.setTransform(dpr * v.zoom, 0, 0, dpr * v.zoom, dpr * v.x, dpr * v.y);

    // Draw elements
    const els = elementsRef.current;
    for (const el of els) {
      drawElement(ctx, el);
    }

    // Draw selection
    for (const id of selectedIdsRef.current) {
      const el = els.find((e) => e.id === id);
      if (el) drawSelectionBox(ctx, el);
    }

    // Draw in-progress freehand
    const drag = dragRef.current;
    if (drag?.type === "draw-freehand" && drag.freehandPoints && drag.freehandPoints.length > 1) {
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(drag.freehandPoints[0][0], drag.freehandPoints[0][1]);
      for (let i = 1; i < drag.freehandPoints.length; i++) {
        ctx.lineTo(drag.freehandPoints[i][0], drag.freehandPoints[i][1]);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [drawGrid, drawElement, drawSelectionBox]);

  const loop = useCallback(() => {
    render();
    rafRef.current = requestAnimationFrame(loop);
  }, [render]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  // Mark dirty when data changes
  useEffect(() => { markDirty(); }, [elements, viewport, selectedIds]);

  // ── Event handlers ────────────────────────────────────────────────

  const onPointerDown = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const [wx, wy] = screenToWorld(sx, sy);
    const currentTool = toolRef.current;

    // Pan with middle button or space
    if (e.button === 1 || spaceRef.current || currentTool === "pan") {
      dragRef.current = {
        type: "pan",
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startWorldX: viewportRef.current.x,
        startWorldY: viewportRef.current.y,
      };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (currentTool === "freehand") {
      dragRef.current = {
        type: "draw-freehand",
        startScreenX: sx,
        startScreenY: sy,
        startWorldX: wx,
        startWorldY: wy,
        freehandPoints: [[wx, wy]],
      };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (currentTool === "sticky" || currentTool === "text" || currentTool.startsWith("shape-")) {
      onAddElement(currentTool, wx, wy);
      return;
    }

    // Select tool
    if (currentTool === "select") {
      // Check resize handles first
      const handle = hitResizeHandle(wx, wy);
      if (handle) {
        const el = elementsRef.current.find((e) => e.id === handle.elementId)!;
        dragRef.current = {
          type: "resize",
          startScreenX: sx,
          startScreenY: sy,
          startWorldX: wx,
          startWorldY: wy,
          elementId: handle.elementId,
          resizeHandle: handle.handle,
          origX: el.x,
          origY: el.y,
          origW: el.width,
          origH: el.height,
        };
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      // Hit test elements
      const hit = hitTest(wx, wy);
      if (hit) {
        if (!selectedIdsRef.current.has(hit.id)) {
          setSelectedIds(new Set([hit.id]));
        }
        dragRef.current = {
          type: "move",
          startScreenX: sx,
          startScreenY: sy,
          startWorldX: wx,
          startWorldY: wy,
          elementId: hit.id,
          origX: hit.x,
          origY: hit.y,
        };
        canvas.setPointerCapture(e.pointerId);
      } else {
        setSelectedIds(new Set());
      }
    }
  }, [screenToWorld, hitTest, hitResizeHandle, setSelectedIds, onAddElement]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (drag.type === "pan") {
      const dx = e.clientX - drag.startScreenX;
      const dy = e.clientY - drag.startScreenY;
      setViewport({
        ...viewportRef.current,
        x: drag.startWorldX + dx,
        y: drag.startWorldY + dy,
      });
      return;
    }

    if (drag.type === "move" && drag.elementId) {
      const [wx, wy] = screenToWorld(sx, sy);
      const dx = wx - drag.startWorldX;
      const dy = wy - drag.startWorldY;
      onElementMove(drag.elementId, drag.origX! + dx, drag.origY! + dy);
      markDirty();
      return;
    }

    if (drag.type === "resize" && drag.elementId) {
      const [wx, wy] = screenToWorld(sx, sy);
      const dx = wx - drag.startWorldX;
      const dy = wy - drag.startWorldY;
      let newX = drag.origX!;
      let newY = drag.origY!;
      let newW = drag.origW!;
      let newH = drag.origH!;
      const h = drag.resizeHandle!;
      if (h.includes("e") || h === "ne" || h === "se") { newW = Math.max(40, drag.origW! + dx); }
      if (h.includes("w") || h === "nw" || h === "sw") { newW = Math.max(40, drag.origW! - dx); newX = drag.origX! + dx; }
      if (h.includes("s") || h === "se" || h === "sw") { newH = Math.max(40, drag.origH! + dy); }
      if (h.includes("n") || h === "ne" || h === "nw") { newH = Math.max(40, drag.origH! - dy); newY = drag.origY! + dy; }
      onElementResize(drag.elementId, newX, newY, newW, newH);
      markDirty();
      return;
    }

    if (drag.type === "draw-freehand" && drag.freehandPoints) {
      const [wx, wy] = screenToWorld(sx, sy);
      drag.freehandPoints.push([wx, wy]);
      markDirty();
      return;
    }
  }, [screenToWorld, setViewport, onElementMove, onElementResize, markDirty]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    if (drag.type === "draw-freehand" && drag.freehandPoints && drag.freehandPoints.length > 1) {
      onFreehandComplete(drag.freehandPoints);
    }

    canvasRef.current?.releasePointerCapture(e.pointerId);
    markDirty();
  }, [onFreehandComplete, markDirty]);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const v = viewportRef.current;

    // Pinch zoom or ctrl+scroll
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));

    // Zoom toward cursor
    const newX = sx - (sx - v.x) * (newZoom / v.zoom);
    const newY = sy - (sy - v.y) * (newZoom / v.zoom);

    setViewport({ x: newX, y: newY, zoom: newZoom });
  }, [setViewport]);

  // Keyboard: space for pan
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        spaceRef.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceRef.current = false;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return {
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    markDirty,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}
