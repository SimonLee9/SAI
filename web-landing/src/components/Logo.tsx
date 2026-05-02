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
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="3.5" fill="var(--color-amber)" />
    </svg>
  );
}
