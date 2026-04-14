export interface Board {
  id: string;
  name: string;
  viewport_json: string;
  created_at: string;
  updated_at: string;
}

export interface BoardElement {
  id: string;
  board_id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  props_json: string;
  created_at: string;
  updated_at: string;
}

export type ElementType = "sticky" | "shape" | "text" | "freehand" | "connector" | "frame";

export interface StickyProps {
  text: string;
  color: string;
}

export interface ShapeProps {
  shapeType: "rect" | "ellipse" | "diamond" | "triangle";
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface TextProps {
  text: string;
  fontSize: number;
  fontWeight: string;
  color: string;
}

export interface FreehandProps {
  points: number[][];
  color: string;
  strokeWidth: number;
}

export interface ConnectorProps {
  fromId: string | null;
  toId: string | null;
  points: number[][];
  color: string;
  strokeWidth: number;
}

export interface FrameProps {
  label: string;
  color: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export type Tool =
  | "select"
  | "pan"
  | "sticky"
  | "shape-rect"
  | "shape-ellipse"
  | "shape-diamond"
  | "text"
  | "freehand"
  | "connector";

export interface BoardWithElements extends Board {
  elements: BoardElement[];
}
