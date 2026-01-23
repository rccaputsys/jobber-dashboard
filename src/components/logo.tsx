// src/components/Logo.tsx
export function Logo({ size = 32, showText = true }: { size?: number; showText?: boolean }) {
  const textSize = size * 0.6;
  const totalWidth = showText ? size + (size * 4.5) : size;
  
  return (
    <svg 
      width={totalWidth} 
      height={size} 
      viewBox={showText ? "0 0 200 50" : "0 0 50 50"} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#7c5cff", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#5aa6ff", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* Pulse icon */}
      <circle cx="22" cy="25" r="20" fill="none" stroke="url(#logoGrad)" strokeWidth="3"/>
      <polyline 
        points="8,25 16,25 20,15 26,35 30,20 36,25" 
        fill="none" 
        stroke="url(#logoGrad)" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {showText && (
        <text x="50" y="33" fontFamily="system-ui, -apple-system, sans-serif" fontSize="22" fontWeight="700">
          <tspan fill="url(#logoGrad)">Accu</tspan>
          <tspan className="logo-text-secondary">Insight</tspan>
        </text>
      )}
    </svg>
  );
}

// Icon only version for smaller spaces
export function LogoIcon({ size = 40 }: { size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 50 50" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#7c5cff", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#5aa6ff", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r="22" fill="none" stroke="url(#logoIconGrad)" strokeWidth="3"/>
      <polyline 
        points="8,25 16,25 21,12 29,38 34,20 42,25" 
        fill="none" 
        stroke="url(#logoIconGrad)" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}