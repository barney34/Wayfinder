import { useTheme } from "next-themes";

interface WayfinderLogoProps {
  className?: string;
}

export function WayfinderLogo({ className = "h-10 w-10" }: WayfinderLogoProps) {
  const { resolvedTheme } = useTheme();
  const color = resolvedTheme === "light" ? "#005C25" : "#00BD4D";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      aria-label="Wayfinder"
    >
      <g fill={color}>
        {/* 8 spokes at 45° increments */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect
            key={deg}
            x="95.5"
            y="16"
            width="9"
            height="68"
            rx="4.5"
            transform={deg === 0 ? undefined : `rotate(${deg} 100 100)`}
          />
        ))}
        {/* Knob balls at spoke ends */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <circle
            key={`k${deg}`}
            cx="100"
            cy="10"
            r="7"
            transform={deg === 0 ? undefined : `rotate(${deg} 100 100)`}
          />
        ))}
        {/* Outer ring */}
        <circle
          cx="100"
          cy="100"
          r="64"
          fill="none"
          stroke={color}
          strokeWidth="10"
        />
        {/* Center diamond */}
        <rect
          x="80"
          y="80"
          width="40"
          height="40"
          rx="3"
          transform="rotate(45 100 100)"
        />
      </g>
    </svg>
  );
}
