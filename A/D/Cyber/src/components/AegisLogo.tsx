interface AegisLogoProps {
  size?: number
  className?: string
}

export function AegisLogo({ size = 40, className = '' }: AegisLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-aegis-pulse ${className}`}
      aria-label="AEGIS Logo"
    >
      <path
        d="M24 4L6 12V24C6 34.5 13.5 42.5 24 44C34.5 42.5 42 34.5 42 24V12L24 4Z"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="rgba(10,10,10,0.8)"
      />
      <path
        d="M24 14C19.5 14 16 17.5 16 22C16 26.5 19.5 30 24 30C28.5 30 32 26.5 32 22C32 17.5 28.5 14 24 14Z"
        stroke="var(--accent)"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="24" cy="22" r="3" fill="var(--accent)" />
      <path
        d="M24 25V32M18 20L14 18M30 20L34 18M20 28L16 32M28 28L32 32"
        stroke="var(--accent)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}
