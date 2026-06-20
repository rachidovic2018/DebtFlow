// Shared Recharts theme constants. Keep all charts visually consistent.
export const CHART_COLORS = {
  indigo: "#6366F1",
  emerald: "#10B981",
  amber: "#F59E0B",
  sky: "#0EA5E9",
  violet: "#8B5CF6",
  rose: "#F43F5E",
  slate: "#94A3B8",
};

export const CHART_SERIES = [
  CHART_COLORS.indigo,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.sky,
  CHART_COLORS.violet,
  CHART_COLORS.rose,
];

export const GRID_COLOR = "#EEF2F6";
export const AXIS_COLOR = "#94A3B8";

export const axisProps = {
  stroke: AXIS_COLOR,
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = {
  stroke: GRID_COLOR,
  strokeDasharray: "0",
  vertical: false,
} as const;

// Reusable tooltip styling object for Recharts <Tooltip contentStyle=...>.
export const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #E5E7EB",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
  padding: "8px 12px",
} as const;
