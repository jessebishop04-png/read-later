type Props = {
  className?: string;
  /** Icon size classes; defaults scale with text via em. */
  markClassName?: string;
  showWordmark?: boolean;
  title?: string;
};

/** Isometric wireframe bookmark mark — uses currentColor. */
export function KeeprMark({ className = "h-[1.15em] w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 42 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Top face */}
        <path d="M12.5 3.5 H35.5 L26.5 12.5 H3.5 Z" />
        {/* Front face with ribbon notch */}
        <path d="M3.5 12.5 V49.5 L15 39.5 L26.5 49.5 V12.5" />
        {/* Right extruded side */}
        <path d="M26.5 12.5 L35.5 3.5 V41.5 L26.5 49.5" />
        {/* Notch depth on the side face */}
        <path d="M15 39.5 L24 35.5" />
      </g>
    </svg>
  );
}

/**
 * Keepr lockup (mark + wordmark). Color follows `currentColor` /
 * `text-keepr` so it is dark on light surfaces and light on dark.
 */
export function KeeprLogo({
  className = "",
  markClassName,
  showWordmark = false,
  title = "Keepr",
}: Props) {
  return (
    <span
      className={`inline-flex items-center gap-[0.45em] ${className}`.trim()}
      role="img"
      aria-label={title}
    >
      <KeeprMark className={markClassName ?? "h-[1.75em] w-auto shrink-0"} />
      {showWordmark ? (
        <span className="font-semibold tracking-tight leading-none">Keepr</span>
      ) : null}
    </span>
  );
}
