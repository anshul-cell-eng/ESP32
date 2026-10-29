import React from 'react';
import { GasStatus } from '../../types/sentinel';

interface FallbackEmblemProps {
  status: GasStatus;
  size?: number;
}

export const FallbackEmblem: React.FC<FallbackEmblemProps> = ({ status, size = 220 }) => {
  const config = {
    SAFE: {
      accent: '#16A34A',
      bezel: '#1E293B',
      indicator: '#22C55E',
      ringColor: 'rgba(59, 130, 246, 0.25)',
    },
    WARNING: {
      accent: '#D97706',
      bezel: '#2D2012',
      indicator: '#F59E0B',
      ringColor: 'rgba(217, 119, 6, 0.35)',
    },
    CRITICAL: {
      accent: '#DC2626',
      bezel: '#341418',
      indicator: '#EF4444',
      ringColor: 'rgba(220, 38, 38, 0.45)',
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
        {/* Subtle rear mechanical ring */}
        <circle
          cx="100"
          cy="100"
          r="86"
          stroke={config.ringColor}
          strokeWidth="1.5"
          strokeDasharray="16 8"
        />

        {/* Outer Titanium Beveled Shield */}
        <polygon
          points="100,28 160,62 160,138 100,172 40,138 40,62"
          fill="#1E293B"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1.5"
        />

        {/* Recessed Inner Face */}
        <polygon
          points="100,38 150,67 150,133 100,162 50,133 50,67"
          fill="#0F172A"
          stroke="rgba(255, 255, 255, 0.08)"
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
          fill="#334155"
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
