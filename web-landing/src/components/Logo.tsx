type Props = {
  size?: number;
  className?: string;
};

// Brand mark: outer 공간 (space) + inner 소리 (source).
export default function Logo({ size = 32, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label="S.A.I logo"
      className={className}
    >
      {/* 외곽: 공간 (빈 원) — currentColor로 mode 따라 자동 inversion. */}
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* 안쪽: 소리 (먹점) — 같은 currentColor, 가득 채운 점. */}
      <circle cx="16" cy="16" r="3.5" fill="currentColor" />
    </svg>
  );
}
