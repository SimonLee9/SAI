type Variant = "underline" | "divider";
type Quality = "wet" | "dry";

type Props = {
  variant?: Variant;
  /**
   * Brush quality:
   *   wet — 번짐 (bleeding). Smooth tapered stroke + soft halo. Default.
   *         Atmospheric, secondary emphasis.
   *   dry — 갈필 (parched). Broken stroke with irregular gaps. No halo.
   *         Direct, demanding emphasis.
   */
  quality?: Quality;
  className?: string;
  /** Override stroke opacity. Default: 0.85 (underline) / 0.7 (divider). */
  opacity?: number;
  /** Unique id suffix when multiple BrushStrokes appear on one page; lets
   *  each instance own its own filter without collisions. */
  idSuffix?: string;
};

/**
 * Single 붓 자국 SVG. Color inherits from `currentColor` so it tracks the
 * theme automatically (먹 in light mode, 한지 in dark mode).
 *
 * Shape philosophy:
 *   - Tapered ends (round linecap) = brush touch-down and lift-off.
 *   - Slight vertical wobble along the path = organic, not mechanical.
 *   - Wet variant adds a faint echo path with blur = 번짐 (ink bleed).
 *   - Dry variant uses irregular dasharray = 갈필 (broken brush).
 */
export default function BrushStroke({
  variant = "underline",
  quality = "wet",
  className = "",
  opacity,
  idSuffix = "",
}: Props) {
  const isUnderline = variant === "underline";
  const filterId = `bs-bleed-${variant}-${idSuffix || "default"}`;
  const baseOpacity = opacity ?? (isUnderline ? 0.85 : 0.7);

  // Path geometry differs only in width; same wobble character.
  const path = isUnderline
    ? "M2.5 3.2 Q12 2.5 24 3 T45.5 3.1"
    : "M5 4.2 C40 3.7 80 4.3 120 4.05 S200 4.35 236 3.95";
  const haloPath = isUnderline
    ? "M2.5 3.2 Q12 2.5 24 3 T45.5 3.1"
    : "M5 4.3 C40 3.6 80 4.4 120 4 S200 4.5 235 4";

  // 갈필 — irregular dash pattern. Numbers chosen to feel scratched, not
  // measured (no repeating period). For divider we scale up.
  const dryDash = isUnderline
    ? "8 1.4 5 1.6 9 2 7 1.5 6 1.8"
    : "32 4 22 5 38 3 28 6 34 4 24 5";

  return (
    <svg
      viewBox={isUnderline ? "0 0 48 6" : "0 0 240 8"}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      {quality === "wet" && (
        <defs>
          <filter id={filterId} x="-10%" y="-100%" width="120%" height="300%">
            <feGaussianBlur stdDeviation={isUnderline ? 0.45 : 0.6} />
          </filter>
        </defs>
      )}

      {/* 번짐 halo — wet only. */}
      {quality === "wet" && (
        <path
          d={haloPath}
          stroke="currentColor"
          strokeWidth={isUnderline ? 2.6 : 3.2}
          strokeLinecap="round"
          fill="none"
          opacity={baseOpacity * 0.18}
          filter={`url(#${filterId})`}
        />
      )}

      {/* Main stroke. Dry variant breaks it up with an irregular dasharray. */}
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={isUnderline ? 1.3 : 1.2}
        strokeLinecap="round"
        fill="none"
        opacity={baseOpacity}
        strokeDasharray={quality === "dry" ? dryDash : undefined}
      />
    </svg>
  );
}
