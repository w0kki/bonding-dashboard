interface YfmLogoProps {
  size?: 'sm' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { px: 48, glow: 'drop-shadow(0 0 8px rgba(59,130,246,0.55))' },
  lg: { px: 80, glow: 'drop-shadow(0 0 14px rgba(59,130,246,0.45))' },
};

export default function YfmLogo({ size = 'sm', className = '' }: YfmLogoProps) {
  const s = SIZES[size];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={s.px}
      height={s.px}
      className={`inline-block ${className}`}
      style={{ filter: s.glow }}
    >
      <circle cx="16" cy="16" r="15.5" fill="#111827" />
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="13.75" fill="none" stroke="#f59e0b" strokeWidth="0.75" />
      <text
        x="16"
        y="19"
        textAnchor="middle"
        fontFamily="Arial,sans-serif"
        fontWeight="bold"
        fontSize="8"
      >
        <tspan fill="#3b82f6">Y</tspan>
        <tspan fill="#f59e0b">F</tspan>
        <tspan fill="#3b82f6">M</tspan>
      </text>
    </svg>
  );
}
