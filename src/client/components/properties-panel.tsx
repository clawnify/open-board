import { useApp } from "../context";

const STICKY_COLORS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff", "#fed7aa",
  "#fde68a", "#a7f3d0", "#93c5fd", "#fca5a5", "#c4b5fd", "#fdba74",
];

const SHAPE_COLORS = [
  "#6366f1", "#f472b6", "#34d399", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#10b981", "#f97316", "#dc2626", "#2563eb",
];

export function PropertiesPanel() {
  const { selectedIds, elements, updateElementProps } = useApp();

  if (selectedIds.size !== 1) return null;

  const id = Array.from(selectedIds)[0];
  const el = elements.find((e) => e.id === id);
  if (!el) return null;

  const props = JSON.parse(el.props_json);

  if (el.type === "sticky") {
    return (
      <div class="absolute top-3 right-3 z-10 bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-56">
        <p class="text-xs font-medium text-slate-500 mb-2">Sticky Color</p>
        <div class="grid grid-cols-6 gap-1.5">
          {STICKY_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => updateElementProps(id, { color })}
              class={`w-7 h-7 rounded-md border-2 transition-all ${
                props.color === color ? "border-indigo-500 scale-110" : "border-transparent hover:border-slate-300"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Color ${color}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (el.type === "shape") {
    return (
      <div class="absolute top-3 right-3 z-10 bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-56">
        <p class="text-xs font-medium text-slate-500 mb-2">Fill Color</p>
        <div class="grid grid-cols-6 gap-1.5">
          {SHAPE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => updateElementProps(id, { fill: color })}
              class={`w-7 h-7 rounded-md border-2 transition-all ${
                props.fill === color ? "border-indigo-500 scale-110" : "border-transparent hover:border-slate-300"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Color ${color}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (el.type === "text") {
    return (
      <div class="absolute top-3 right-3 z-10 bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-56">
        <p class="text-xs font-medium text-slate-500 mb-2">Font Size</p>
        <div class="flex gap-1">
          {[14, 18, 24, 32, 48].map((size) => (
            <button
              key={size}
              onClick={() => updateElementProps(id, { fontSize: size })}
              class={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                props.fontSize === size
                  ? "bg-indigo-100 text-indigo-600"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        <p class="text-xs font-medium text-slate-500 mt-3 mb-2">Weight</p>
        <div class="flex gap-1">
          {[
            { label: "Regular", value: "400" },
            { label: "Medium", value: "500" },
            { label: "Bold", value: "700" },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => updateElementProps(id, { fontWeight: value })}
              class={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                props.fontWeight === value
                  ? "bg-indigo-100 text-indigo-600"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
