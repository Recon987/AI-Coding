import type { CSSProperties } from "react";

const paths: Record<string, string[]> = {
  briefing: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
  patrol: ["M3 20 9 4l4 10 3-6 5 12H3Z", "m7 9 2 2 2-2"],
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
