import React from 'react';
import { GasStatus } from '../../types/sentinel';

interface FallbackEmblemProps {
  status: GasStatus;
  size?: number;
}

export const FallbackEmblem: React.FC<FallbackEmblemProps> = ({ status, size = 220 }) => {
  const config = {
    SAFE: {
      accent: '#45D9E6',
      bezel: '#204345',
      innerFace: '#263B3C',
      indicator: '#32C98A',
      ringColor: 'rgba(69, 217, 230, 0.25)',
    },
    WARNING: {
      accent: '#F3B64B',
      bezel: '#243733',
      innerFace: '#263B3C',
      indicator: '#F3B64B',
      ringColor: 'rgba(243, 182, 75, 0.45)',
    },
    CRITICAL: {
      accent: '#FF6868',
      bezel: '#2e2828',
      innerFace: '#2a2222',
      indicator: '#FF6868',
      ringColor: 'rgba(255, 104, 104, 0.65)',
    },
  }[status];

  return (
    <div 
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full relative z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle rear mechanical ring (Subtle in SAFE, Amber in WARN, Red in CRIT) */}
        <circle
          cx="100"
          cy="100"
          r="86"
          stroke={config.ringColor}
          strokeWidth="1.5"
          strokeDasharray="16 8"
        />

        {/* Outer Beveled Teal Shield */}
        <polygon
          points="100,28 160,62 160,138 100,172 40,138 40,62"
          fill={config.bezel}
          stroke="#3A5553"
          strokeWidth="1.5"
        />

        {/* Recessed Inner Face (Visible depth, not black) */}
        <polygon
          points="100,38 150,67 150,133 100,162 50,133 50,67"
          fill={config.innerFace}
          stroke="#3A5553"
          strokeWidth="1"
        />

        {/* Clean Gas-Wave Relief Lines */}
        <path
          d="M75 85 Q100 75 125 85"
          stroke={config.accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M70 100 Q100 88 130 100"
          stroke={config.accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M75 115 Q100 105 125 115"
          stroke={config.accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Central Indicator LED */}
        <circle
          cx="100"
          cy="100"
          r="6"
          fill="#3A5553"
        />
        <circle
          cx="100"
          cy="100"
          r="4"
          fill={config.indicator}
        />
      </svg>
    </div>
  );
};
