import Svg, { Circle, G, Line, Path, Polyline, Rect } from "react-native-svg";

// Paths copied verbatim from the PWA (frontend/src/components/{icons,navigation,ui}), 24x24 grid.
// `size` and `stroke` are the PWA defaults for each icon.

type Node =
  | ["path", { d: string }]
  | ["line", { x1: number; y1: number; x2: number; y2: number }]
  | ["polyline", { points: string }]
  | ["rect", { x: number; y: number; width: number; height: number; rx: number }]
  | ["circle", { cx: number; cy: number; r: number }];

interface IconDef {
  size: number;
  stroke: number;
  /** Filled glyph instead of stroked outline. */
  fill?: boolean;
  /** Round line caps and joins on the whole icon (set on the <svg> in the PWA nav icons). */
  round?: boolean;
  nodes: Node[];
}

const line = (x1: number, y1: number, x2: number, y2: number): Node => ["line", { x1, y1, x2, y2 }];
const rect = (x: number, y: number, width: number, height: number, rx: number): Node => [
  "rect",
  { x, y, width, height, rx },
];

const defs = {
  archive: {
    size: 24,
    stroke: 1.5,
    nodes: [
      [
        "path",
        {
          d: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z",
        },
      ],
    ],
  },
  chart: {
    size: 24,
    stroke: 1.5,
    nodes: [
      [
        "path",
        {
          d: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
        },
      ],
    ],
  },
  dumbbell: {
    size: 24,
    stroke: 1.5,
    nodes: [
      rect(2, 9, 3, 6, 1),
      rect(5, 7, 2, 10, 0.5),
      rect(7, 11, 10, 2, 0.5),
      rect(17, 7, 2, 10, 0.5),
      rect(19, 9, 3, 6, 1),
    ],
  },
  edit: {
    size: 20,
    stroke: 1.5,
    nodes: [
      [
        "path",
        {
          d: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
        },
      ],
    ],
  },
  menu: {
    size: 24,
    stroke: 1.5,
    nodes: [["path", { d: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" }]],
  },
  photo: {
    size: 20,
    stroke: 1.5,
    nodes: [
      [
        "path",
        {
          d: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 8.25A2.25 2.25 0 015.25 6h13.5A2.25 2.25 0 0121 8.25v7.5A2.25 2.25 0 0118.75 18H5.25A2.25 2.25 0 013 15.75v-7.5zM9 10.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z",
        },
      ],
    ],
  },
  plus: { size: 32, stroke: 2, nodes: [["path", { d: "M12 4.5v15m7.5-7.5h-15" }]] },
  trash: {
    size: 20,
    stroke: 1.5,
    nodes: [
      [
        "path",
        {
          d: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
        },
      ],
    ],
  },
  // Navigation / UI glyphs written inline in the PWA components.
  home: {
    size: 20,
    stroke: 1.8,
    round: true,
    nodes: [
      ["path", { d: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" }],
      ["polyline", { points: "9 22 9 12 15 12 15 22" }],
    ],
  },
  workouts: {
    size: 20,
    stroke: 1.8,
    round: true,
    nodes: [
      line(8.5, 12, 15.5, 12),
      line(5, 8.5, 5, 15.5),
      line(7.5, 7, 7.5, 17),
      line(16.5, 7, 16.5, 17),
      line(19, 8.5, 19, 15.5),
    ],
  },
  stats: {
    size: 20,
    stroke: 1.8,
    round: true,
    nodes: [rect(3, 13, 4, 7, 1), rect(10, 8, 4, 12, 1), rect(17, 4, 4, 16, 1)],
  },
  plans: {
    size: 22,
    stroke: 1.8,
    round: true,
    nodes: [
      ["path", { d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" }],
      rect(9, 3, 6, 4, 1),
      line(9, 12, 15, 12),
      line(9, 16, 13, 16),
    ],
  },
  settings: {
    size: 22,
    stroke: 1.8,
    round: true,
    nodes: [
      ["circle", { cx: 12, cy: 12, r: 3 }],
      [
        "path",
        {
          d: "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
        },
      ],
    ],
  },
  logout: {
    size: 22,
    stroke: 1.8,
    round: true,
    nodes: [
      ["path", { d: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" }],
      ["polyline", { points: "16 17 21 12 16 7" }],
      line(21, 12, 9, 12),
    ],
  },
  close: { size: 16, stroke: 2.2, round: true, nodes: [line(18, 6, 6, 18), line(6, 6, 18, 18)] },
  chevronRight: {
    size: 11,
    stroke: 3,
    round: true,
    nodes: [["polyline", { points: "9 18 15 12 9 6" }]],
  },
  chevronLeft: { size: 20, stroke: 2.5, round: true, nodes: [["path", { d: "M15 18l-6-6 6-6" }]] },
  menuLines: {
    size: 20,
    stroke: 1.8,
    round: true,
    nodes: [line(4, 7, 20, 7), line(4, 12, 20, 12), line(4, 17, 16, 17)],
  },
  plusLines: {
    size: 14,
    stroke: 2.5,
    round: true,
    nodes: [line(12, 5, 12, 19), line(5, 12, 19, 12)],
  },
  trophy: {
    size: 26,
    stroke: 2.2,
    round: true,
    nodes: [["path", { d: "M6 9H4a2 2 0 000 4h2M18 9h2a2 2 0 010 4h-2M6 9V4h12v5M6 9a6 6 0 0012 0M12 15v4M9 19h6" }]],
  },
  emptyHistory: {
    size: 32,
    stroke: 1.5,
    nodes: [["path", { d: "M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4M6 12h12" }]],
  },
  check: { size: 15, stroke: 2.5, round: true, nodes: [["path", { d: "M5 12l5 5 9-9" }]] },
  /** Person of the "own exercise" marker in the exercise list. */
  user: { size: 13, stroke: 2.2, round: true, nodes: [["path", { d: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" }], ["circle", { cx: 12, cy: 7, r: 4 }]] },
  globe: {
    size: 18,
    stroke: 1.8,
    round: true,
    nodes: [
      ["circle", { cx: 12, cy: 12, r: 10 }],
      line(2, 12, 22, 12),
      ["path", { d: "M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" }],
    ],
  },
  /** Three shrinking lines of the plans "Sortuj" button. */
  sortLines: { size: 13, stroke: 2.5, round: true, nodes: [line(4, 6, 20, 6), line(8, 12, 16, 12), line(11, 18, 13, 18)] },
  /** Six-dot drag handle of the plan form rows. */
  grip: {
    size: 18,
    stroke: 2,
    round: true,
    nodes: [
      ["circle", { cx: 9, cy: 5, r: 1 }],
      ["circle", { cx: 9, cy: 12, r: 1 }],
      ["circle", { cx: 9, cy: 19, r: 1 }],
      ["circle", { cx: 15, cy: 5, r: 1 }],
      ["circle", { cx: 15, cy: 12, r: 1 }],
      ["circle", { cx: 15, cy: 19, r: 1 }],
    ],
  },
  chevronDown: { size: 14, stroke: 2, round: true, nodes: [["polyline", { points: "6 9 12 15 18 9" }]] },
  search: { size: 15, stroke: 2, round: true, nodes: [["circle", { cx: 11, cy: 11, r: 7 }], ["path", { d: "M20 20l-4-4" }]] },
  calendar: {
    size: 16,
    stroke: 2,
    round: true,
    nodes: [rect(3, 4, 18, 18, 2), line(16, 2, 16, 6), line(8, 2, 8, 6), line(3, 10, 21, 10)],
  },
  /** Pencil-on-square of the workout screens (the `edit` glyph above is the heroicons one of the exercise list). */
  pencil: {
    size: 15,
    stroke: 2,
    round: true,
    nodes: [
      ["path", { d: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" }],
      ["path", { d: "M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" }],
    ],
  },
  bin: {
    size: 15,
    stroke: 2,
    round: true,
    nodes: [
      ["polyline", { points: "3 6 5 6 21 6" }],
      ["path", { d: "M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" }],
    ],
  },
  /** Clipboard of the "Notatki" buttons (WorkoutDetailScreen). */
  notes: {
    size: 13,
    stroke: 2,
    round: true,
    nodes: [
      ["path", { d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" }],
      rect(9, 3, 6, 4, 1),
      ["path", { d: "M9 12h6M9 16h4" }],
    ],
  },
  /** Skip-forward of the plan banner "Pomiń". */
  skip: {
    size: 13,
    stroke: 2.5,
    round: true,
    nodes: [["polyline", { points: "5 4 15 12 5 20 5 4" }], line(19, 5, 19, 19)],
  },
  /** Clock of the abandoned-workout dialog. */
  clock: {
    size: 16,
    stroke: 2.2,
    round: true,
    nodes: [["circle", { cx: 12, cy: 12, r: 10 }], ["polyline", { points: "12 6 12 12 16 14" }]],
  },
  /** Stats tiles (StatsScreen). */
  statFlame: { size: 15, stroke: 2, round: true, nodes: [["path", { d: "M12 2s-5 6-5 11a5 5 0 0010 0C17 8 12 2 12 2z" }]] },
  statBars: { size: 15, stroke: 2, round: true, nodes: [rect(3, 13, 4, 7, 1), rect(10, 8, 4, 12, 1), rect(17, 4, 4, 16, 1)] },
  statLines: { size: 15, stroke: 2, round: true, nodes: [rect(3, 5, 18, 2, 1), rect(3, 11, 18, 2, 1), rect(3, 17, 11, 2, 1)] },
  /** Crossed-dumbbell glyph of the "new workout" button (filled). */
  workoutAction: {
    size: 32,
    stroke: 0,
    fill: true,
    nodes: [
      [
        "path",
        {
          d: "M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z",
        },
      ],
    ],
  },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof defs;
export const ICON_NAMES = Object.keys(defs) as IconName[];

interface IconProps {
  name: IconName;
  /** Defaults to the PWA size of that icon. */
  size?: number;
  /** Defaults to the PWA stroke width of that icon. */
  strokeWidth?: number;
  color: string;
}

export function Icon({ name, size, strokeWidth, color }: IconProps) {
  const def: IconDef = defs[name];
  const px = size ?? def.size;
  const sw = strokeWidth ?? def.stroke;
  return (
    <Svg width={px} height={px} viewBox="0 0 24 24" fill={def.fill ? color : "none"} color={color}>
      <G
        stroke={def.fill ? undefined : color}
        strokeWidth={def.fill ? undefined : sw}
        strokeLinecap={def.round ? "round" : undefined}
        strokeLinejoin={def.round ? "round" : undefined}
      >
        {def.nodes.map((node, i) => {
          switch (node[0]) {
            case "path":
              return (
                <Path
                  key={i}
                  {...node[1]}
                  strokeLinecap={def.round ? undefined : "round"}
                  strokeLinejoin={def.round ? undefined : "round"}
                />
              );
            case "line":
              return <Line key={i} {...node[1]} />;
            case "polyline":
              return <Polyline key={i} {...node[1]} />;
            case "rect":
              return <Rect key={i} {...node[1]} />;
            case "circle":
              return <Circle key={i} {...node[1]} />;
          }
        })}
      </G>
    </Svg>
  );
}
