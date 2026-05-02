type Variant = "underline" | "divider";
type Quality = "wet" | "dry" | "najeon";

type Props = {
  variant?: Variant;
  /**
   * Brush quality:
   *   wet    — 번짐. Smooth tapered stroke + soft halo. Atmospheric.
   *   dry    — 갈필. Broken stroke with irregular gaps. Direct, demanding.
   *   najeon — 자개. Smooth stroke filled with iridescent mother-of-pearl
   *            gradient. Material, not colour — used to mark precision
   *            and craft (current default for section underlines).
   */
  quality?: Quality;
  className?: string;
  /** Override stroke opacity. Default: 0.85 (underline) / 0.7 (divider). */
  opacity?: number;
  /** Unique id suffix when multiple BrushStrokes appear on one page; lets
   *  each instance own its own filter / gradient without collisions. */
  idSuffix?: string;
};

/**
 * Single 붓 자국 SVG.
 *
 * For ink (wet/dry), colour inherits from `currentColor` so it tracks the
 * page theme automatically — 먹 in light, 한지 in dark.
 *
 * For najeon (자개), the stroke is filled with a 5-stop linear gradient
 * inspired by 나전칠기 mother-of-pearl inlay (sea-blue → mint → pearl →
 * lavender → rose). The same gradient reads correctly on both cream and
 * dark canvases because all stops are pearl-toned mid-saturations rather
 * than primaries.
 */
export default function BrushStroke({
  variant = "underline",
  quality = "wet",
  className = "",
  opacity,
  idSuffix = "",
}: Props) {
  const isUnderline = variant === "underline";
  const uid = idSuffix || "default";
  const filterId = `bs-bleed-${variant}-${uid}`;
  const najeonId = `bs-najeon-${variant}-${uid}`;
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
      <defs>
        {quality === "wet" && (
          <filter id={filterId} x="-10%" y="-100%" width="120%" height="300%">
            <feGaussianBlur stdDeviation={isUnderline ? 0.45 : 0.6} />
          </filter>
        )}
        {quality === "najeon" && (
          <linearGradient id={najeonId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#6FB8D1" />
            <stop offset="22%"  stopColor="#93C9B0" />
            <stop offset="46%"  stopColor="#F4E0BC" />
            <stop offset="72%"  stopColor="#C5A6CC" />
            <stop offset="100%" stopColor="#DCA9B8" />
          </linearGradient>
        )}
      </defs>

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

      {/* Main stroke. Stroke source depends on quality. */}
      <path
        d={path}
        stroke={quality === "najeon" ? `url(#${najeonId})` : "currentColor"}
        strokeWidth={
          isUnderline
            ? quality === "najeon" ? 1.6 : 1.3
            : quality === "najeon" ? 1.5 : 1.2
        }
        strokeLinecap="round"
        fill="none"
        opacity={baseOpacity}
        strokeDasharray={quality === "dry" ? dryDash : undefined}
      />
    </svg>
  );
}
