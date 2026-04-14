import { Toolbar } from "./toolbar";
import { BoardHeader } from "./board-header";
import { CanvasView } from "./canvas-view";
import { PropertiesPanel } from "./properties-panel";

export function BoardEditor() {
  return (
    <div class="w-full h-screen flex flex-col bg-slate-100">
      <div class="relative flex-1">
        <CanvasView />
        <BoardHeader />
        <Toolbar />
        <PropertiesPanel />
      </div>
    </div>
  );
}
