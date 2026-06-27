import type { CSSProperties } from "react";

/**
 * Seine Studio signature mark — the monochrome botanical emblem, inlined as SVG
 * so it stays crisp at every size and inherits `currentColor` (use it in gold on
 * the charcoal shell, or charcoal on the warm canvas). Treat it as a signature
 * or architectural seal, never a repeating decorative motif.
 */
export function SeineMark({
  size = 22,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Seine Studio"
      className={className}
      style={style}
      fill="currentColor"
    >
      <path d="M256 58c-18 28-27 57-27 88 0 36 9 66 27 91 18-25 27-55 27-91 0-31-9-60-27-88Z" />
      <path d="M219 91c-42 10-73 33-93 70 35 1 64 12 87 34-8-34-6-69 6-104Z" />
      <path d="M293 91c42 10 73 33 93 70-35 1-64 12-87 34 8-34 6-69-6-104Z" />
      <path d="M205 175c-53-3-99 14-138 51 45 5 83 24 114 56 2-39 10-75 24-107Z" />
      <path d="M307 175c53-3 99 14 138 51-45 5-83 24-114 56-2-39-10-75-24-107Z" />
      <path d="M206 231c-27 33-44 70-51 111 24-20 47-31 70-34-13-23-19-49-19-77Z" />
      <path d="M306 231c27 33 44 70 51 111-24-20-47-31-70-34 13-23 19-49 19-77Z" />
      <path
        d="M238 203h36l-9 71 28 79-18 101-19-86-19 86-18-101 28-79-9-71Zm18 55-12 34 12 23 12-23-12-34Z"
        fillRule="evenodd"
      />
    </svg>
  );
}
