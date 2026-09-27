import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  showBadge?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = true,
  showBadge = true,
  className = ''
}) => {
  const iconDimensions = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }[size];

  const brandTextSize = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl'
  }[size];

  return (
    <div className={`flex items-center space-x-3 group ${className}`}>
      {/* Command Room Glass Logo Icon */}
      <div className={`relative flex ${iconDimensions} items-center justify-center shrink-0`}>
        {/* Ambient Glowing Halo */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#883A2E]/25 via-[#D65A31]/20 to-[#C47A5A]/20 blur-md group-hover:blur-lg transition-all duration-300"></div>

        {/* Outer Glassmorphic Bezel */}
        <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#883A2E] via-[#D65A31] to-[#542A20] p-[1.5px] shadow-lg shadow-[#883A2E]/20 transition-transform duration-300 group-hover:scale-105">
          {/* Inner Dark Command Glass Core */}
          <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#542A20] backdrop-blur-md relative overflow-hidden">
            {/* Subtle grid texture */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:6px_6px]"></div>

            {/* Custom High-Tech Crimelytixs Shield + Analytics Radar SVG */}
            <svg
              className="h-3/5 w-3/5 text-[#FFFDFC] transition-transform duration-300 group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Shield Shell */}
              <path
                d="M12 2L4 5.5V11.5C4 16.5 7.5 20.8 12 22C16.5 20.8 20 16.5 20 11.5V5.5L12 2Z"
                stroke="url(#shieldGrad)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Analytical Chart Bars / Radar Signal */}
              <path
                d="M8.5 13.5V10.5"
                stroke="#C47A5A"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M12 15V8"
                stroke="#FFFDFC"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M15.5 13.5V11"
                stroke="#D65A31"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              {/* Data Interconnect Trend Line */}
              <path
                d="M8 11.5L12 8L16 11"
                stroke="#FFFDFC"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1 1"
              />

              {/* Central Pulse Beacon */}
              <circle cx="12" cy="8" r="1.5" fill="#FFFDFC" />

              <defs>
                <linearGradient id="shieldGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFDFC" />
                  <stop offset="0.5" stopColor="#D65A31" />
                  <stop offset="1" stopColor="#C47A5A" />
                </linearGradient>
              </defs>
            </svg>

            {/* Specular Light Reflection */}
            <div className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-white/20 blur-[2px] pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* Brand Identity Typography */}
      <div>
        <div className="flex items-center space-x-2">
          <span className={`font-black tracking-tight ${brandTextSize} bg-gradient-to-r from-[#542A20] via-[#883A2E] to-[#D65A31] bg-clip-text text-transparent font-sans drop-shadow-sm`}>
            Crimelytixs
          </span>
          {showBadge && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-[#883A2E]/10 px-2 py-0.5 text-[9px] font-bold text-[#883A2E] border border-[#883A2E]/25 tracking-wider uppercase font-mono">
              Intelligence
            </span>
          )}
        </div>
        {showTagline && (
          <p className="hidden sm:block text-[11px] font-medium text-[#7A6360] tracking-wide">
            Crime Data Analytics
          </p>
        )}
      </div>
    </div>
  );
};
