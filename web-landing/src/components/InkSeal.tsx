type Props = {
  className?: string;
  size?: number;
};

/**
 * 낙관 (落款) — Korean painter's signature seal, reinterpreted in 먹
 * monochrome. Traditional seals are vermilion-on-paper; here the seal
 * uses `currentColor` and the stroke style mirrors the page's brushwork
 * (slightly irregular outline, soft corners) so it feels authored, not
 * stamped flat.
 *
 * Inscription: "사이" — the project's hangul mark.
 */
export default function InkSeal({ className = "", size = 56 }: Props) {
  return (
    <svg
      viewBox="0 0 56 56"
      width={size}
      height={size}
      role="img"
      aria-label="S.A.I 낙관"
      className={className}
    >
      <defs>
        <filter id="seal-bleed" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
      </defs>

      {/* Outer brushed border — slight wobble at each side instead of perfect rectangle. */}
      <path
        d="M5 5.5
           C 18 4.6, 38 4.8, 51 5.4
           C 51.4 18, 51.6 38, 51 50.5
           C 38 51.3, 18 51.2, 5.2 50.6
           C 4.6 38, 4.4 18, 5 5.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* 번짐 echo behind the border for paint-on-paper feel. */}
      <path
        d="M5 5.5
           C 18 4.6, 38 4.8, 51 5.4
           C 51.4 18, 51.6 38, 51 50.5
           C 38 51.3, 18 51.2, 5.2 50.6
           C 4.6 38, 4.4 18, 5 5.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
        opacity="0.10"
        filter="url(#seal-bleed)"
      />

      {/* 사이 — vertical-ish two-character composition. Pretendard heavy
          weight gives the necessary brush mass at small size. */}
      <text
        x="28"
        y="25"
        textAnchor="middle"
        fontFamily="'Pretendard Variable', 'Pretendard', sans-serif"
        fontSize="17"
        fontWeight="800"
        fill="currentColor"
        opacity="0.92"
      >
        사
      </text>
      <text
        x="28"
        y="44"
        textAnchor="middle"
        fontFamily="'Pretendard Variable', 'Pretendard', sans-serif"
        fontSize="17"
        fontWeight="800"
        fill="currentColor"
        opacity="0.92"
      >
        이
      </text>
    </svg>
  );
}
