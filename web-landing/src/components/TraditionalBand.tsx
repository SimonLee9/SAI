type Pattern = "fret"; // 회문. Future: "wave" (파도), "lattice" (창살), etc.

type Props = {
  pattern?: Pattern;
  className?: string;
  /** Unique-on-page id suffix to avoid SVG `<pattern>` id collisions
   *  when multiple bands appear in the same document. */
  idSuffix?: string;
};

/**
 * Thin band of a traditional Korean ornamental pattern, rendered as a
 * tiling SVG `<pattern>`. Color follows `currentColor` so it inherits the
 * theme — 먹 in light mode, 한지 in dark mode.
 *
 * Used very sparingly: at major surface boundaries where a 한복 hem or
 * 단청 띠 would naturally sit (Footer top edge for now). Adding more
 * placements weakens the "decorative trim" feel — one or two per page
 * is the design intent.
 *
 * Variants:
 *   fret — 회문 (回紋). Simplified Korean meander. Right-angle teeth on
 *          a baseline, repeating every 10 units. Ties visually to
 *          Goryeo-era lacquerware borders, the same tradition that
 *          gives us the 자개 inlay vocabulary.
 */
export default function TraditionalBand({
  pattern = "fret",
  className = "",
  idSuffix = "default",
}: Props) {
  const patternId = `tb-${pattern}-${idSuffix}`;

  return (
    <svg
      className={className}
      preserveAspectRatio="none"
      aria-hidden
      role="presentation"
    >
      <defs>
        {pattern === "fret" && (
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="10"
            height="6"
          >
            {/* 회문 (Korean meander) — single tooth above a baseline,
                tooth width 4, gap width 6. Tile repeats horizontally. */}
            <path
              d="M0 5 H3 V1 H7 V5 H10"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
          </pattern>
        )}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
