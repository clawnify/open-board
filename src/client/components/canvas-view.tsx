import { useEffect, useCallback, useRef } from "preact/hooks";
import { useApp } from "../context";
import { useCanvas } from "../hooks/use-canvas";

export function CanvasView() {
  const app = useApp();
  const editingRef = useRef<{ id: string; textarea: HTMLTextAreaElement } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerUp = useCallback(() => {
    // Persist element position after drag
    for (const id of app.selectedIds) {
      app.saveElement(id);
    }
  }, [app.selectedIds, app.saveElement]);

  const { canvasRef, onPointerDown, onPointerMove, onPointerUp: canvasPointerUp, onWheel } = useCanvas(
    app.elements,
    app.viewport,
    app.setViewport,
    app.selectedIds,
    app.setSelectedIds,
    app.tool,
    app.onElementMove,
    app.onElementResize,
    app.addElement,
    app.addFreehand,
  );

  const wrappedPointerUp = useCallback(
    (e: PointerEvent) => {
      canvasPointerUp(e);
      handlePointerUp();
    },
    [canvasPointerUp, handlePointerUp]
  );

  // Double-click to edit sticky/text
  const onDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (app.tool !== "select") return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const v = app.viewport;
      const wx = (sx - v.x) / v.zoom;
      const wy = (sy - v.y) / v.zoom;

      // Find element under cursor
      for (let i = app.elements.length - 1; i >= 0; i--) {
        const el = app.elements[i];
        if (el.type !== "sticky" && el.type !== "text") continue;
        if (wx >= el.x && wx <= el.x + el.width && wy >= el.y && wy <= el.y + el.height) {
          // Open inline editor
          openInlineEditor(el.id, el);
          break;
        }
      }
    },
    [app.tool, app.elements, app.viewport]
  );

  const openInlineEditor = useCallback(
    (id: string, el: { x: number; y: number; width: number; height: number; type: string; props_json: string }) => {
      if (editingRef.current) {
        closeInlineEditor();
      }
      const v = app.viewport;
      const container = containerRef.current;
      if (!container) return;

      const props = JSON.parse(el.props_json);
      const textarea = document.createElement("textarea");
      textarea.value = props.text || "";
      textarea.style.position = "absolute";
      textarea.style.left = `${el.x * v.zoom + v.x}px`;
      textarea.style.top = `${el.y * v.zoom + v.y}px`;
      textarea.style.width = `${el.width * v.zoom}px`;
      textarea.style.height = `${el.height * v.zoom}px`;
      textarea.style.fontSize = `${(el.type === "text" ? (props.fontSize || 18) : 15) * v.zoom}px`;
      textarea.style.fontFamily = "Inter, sans-serif";
      textarea.style.fontWeight = el.type === "text" ? (props.fontWeight || "400") : "500";
      textarea.style.color = el.type === "text" ? (props.color || "#1e293b") : "#1e293b";
      textarea.style.background = el.type === "sticky" ? (props.color || "#fef08a") : "rgba(255,255,255,0.95)";
      textarea.style.border = "2px solid #3b82f6";
      textarea.style.borderRadius = "6px";
      textarea.style.padding = `${14 * v.zoom}px`;
      textarea.style.resize = "none";
      textarea.style.outline = "none";
      textarea.style.zIndex = "20";
      textarea.style.boxSizing = "border-box";
      textarea.style.lineHeight = "1.4";

      textarea.addEventListener("blur", () => {
        closeInlineEditor();
      });
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          textarea.blur();
        }
        e.stopPropagation();
      });

      container.appendChild(textarea);
      textarea.focus();
      textarea.select();
      editingRef.current = { id, textarea };
    },
    [app.viewport]
  );

  const closeInlineEditor = useCallback(() => {
    const editing = editingRef.current;
    if (!editing) return;
    const newText = editing.textarea.value;
    app.updateElementProps(editing.id, { text: newText });
    editing.textarea.remove();
    editingRef.current = null;
  }, [app.updateElementProps]);

  // Cursor style based on tool
  const cursorClass =
    app.tool === "pan"
      ? "cursor-grab"
      : app.tool === "freehand"
      ? "cursor-crosshair"
      : app.tool === "select"
      ? "cursor-default"
      : "cursor-crosshair";

  return (
    <div ref={containerRef} class="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        class={`w-full h-full ${cursorClass}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={wrappedPointerUp}
        onWheel={onWheel}
        onDblClick={onDoubleClick}
      />
    </div>
  );
}
