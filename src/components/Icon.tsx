import type { CSSProperties } from "react";

const paths: Record<string, string[]> = {
  office: ["M3 21V5h12v16M15 10h6v11M7 9h4M7 13h4M7 17h4M3 21h18"],
  people: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9",
    "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m3-3.9a4 4 0 0 1 0 7.8",
  ],
  organization: ["M9 3h6v5H9zM2 16h6v5H2zM16 16h6v5h-6zM12 8v4M5 16v-4h14v4"],
  briefing: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
  patrol: ["M3 20 9 4l4 10 3-6 5 12H3Z", "m7 9 2 2 2-2"],
  controls: ["M3 9h18v5H3z", "m7 9 4 5m2-5 4 5", "M5 14v6m14-6v6M5 9V5m14 4V5"],
  handover: ["M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"],
  submission: ["M7 3h10l3 3v15H4V3h3Z", "M8 10h8M8 14h8M8 18h5"],
  calendar: ["M4 5h16v16H4zM8 3v4m8-4v4M4 10h16M8 14h2m4 0h2m-8 4h2"],
  calls: ["M5 3H3v5c0 7 6 13 13 13h5v-6l-5-2-3 3a15 15 0 0 1-5-5l3-3-2-5H5Z"],
  notes: ["M13 4H4v17h16v-9", "m10 14 1-4L19 2l3 3-8 8-4 1Z"],
  folders: ["M3 6h7l2 3h9v12H3V6Z", "M3 10h18"],
  about: ["M12 8h.01M11 12h1v5", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0"],
  search: ["M21 21l-5-5", "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0"],
  plus: ["M12 5v14M5 12h14"],
  check: ["m5 12 4 4L19 6"],
  arrow: ["M5 12h14m-5-5 5 5-5 5"],
  clock: ["M12 7v5l3 2", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0"],
  download: ["M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"],
  // TASK-MODULES-02: 모듈 관리 (stacked blocks) and AX 사업 관리 (chart with a spark).
  modules: ["M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z", "M16.5 13v7M13 16.5h7"],
  ax: ["M4 20V10m6 10V4m6 16v-7", "M3 20h18", "m18 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"],
};
export function Icon({
  name,
  size = 18,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {(paths[name] || paths.about).map((d, i) => (
        <path d={d} key={i} />
      ))}
    </svg>
  );
}
