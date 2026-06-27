import type { CSSProperties } from "react";

/**
 * Seine Studio brand logo — the real orchid emblem (from /brand), rendered cleanly
 * without the boxed white background. The source PNG is black line art on white, so
 * we drop the white using a blend mode that matches the surface it sits on:
 *
 *  - variant="ink"   → for light surfaces (canvas, card). `multiply` makes the white
 *                      vanish into the background, leaving the charcoal artwork.
 *  - variant="light" → for the dark charcoal shell. `invert` flips the art to light,
 *                      then `screen` drops the (now dark) background.
 *
 * Use it as a signature mark beside the wordmark — never tiled or oversized.
 */
export function SeineLogo({
  size = 28,
  variant = "ink",
  className,
  style,
}: {
  size?: number;
  variant?: "ink" | "light";
  className?: string;
  style?: CSSProperties;
}) {
  const blend: CSSProperties =
    variant === "light"
      ? { filter: "invert(1)", mixBlendMode: "screen" }
      : { mixBlendMode: "multiply" };

  // The emblem is portrait, so size it by height (to align with the wordmark) and let
  // width follow. An explicit height also overrides Tailwind preflight's `height: auto`.
  return (
    <img
      src="/brand/seine-logo-source.png"
      alt="Seine Studio"
      className={className}
      style={{ height: size, width: "auto", objectFit: "contain", ...blend, ...style }}
    />
  );
}
