// Hand-crafted logo mark: brick-red rounded square with a cream «v»
// (guillemet – v – guillemet, the app's motif). Pure stroke paths,
// no fonts — crisp at any size, adapts to light/dark via CSS tokens.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="1" width="34" height="34" rx="9" fill="var(--primary)" />
      <g
        stroke="var(--primary-foreground)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* « */}
        <path d="M7 14.5 3.5 18 7 21.5" />
        <path d="M11.5 14.5 8 18l3.5 3.5" />
        {/* v */}
        <path d="M14 13l4 10 4-10" />
        {/* » */}
        <path d="M24.5 14.5 28 18l-3.5 3.5" />
        <path d="M29 14.5 32.5 18 29 21.5" />
      </g>
    </svg>
  );
}
