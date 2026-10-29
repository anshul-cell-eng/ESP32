import React from 'react';
import { GasStatus } from '../../types/sentinel';

interface HeroArtworkFallbackProps {
  status: GasStatus;
  className?: string;
}

export const HeroArtworkFallback: React.FC<HeroArtworkFallbackProps> = ({ status, className = '' }) => {
  const isSafe = status === 'SAFE';
  const isWarning = status === 'WARNING';
  const isCritical = status === 'CRITICAL';

  const accentColor = isCritical ? '#FF6868' : isWarning ? '#F3B64B' : '#45D9E6';
  const glowColor = isCritical ? 'rgba(255,104,104,0.3)' : isWarning ? 'rgba(243,182,75,0.25)' : 'rgba(69,217,230,0.25)';

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient Radial Backlight */}
      <div 
        className="absolute inset-0 rounded-full blur-3xl opacity-40 transition-colors duration-700 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
      />

      <svg 
        viewBox="0 0 400 440" 
        className="w-full max-w-[420px] h-auto drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)]"
      >
        <defs>
          {/* Elevated Teal Metallic Gradient */}
          <linearGradient id="fallbackMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#204345" />
            <stop offset="35%" stopColor="#3A5553" />
            <stop offset="50%" stopColor="#183638" />
            <stop offset="70%" stopColor="#263B3C" />
            <stop offset="100%" stopColor="#204345" />
          </linearGradient>

          {/* Refined Shield Body (Deep-Teal Visible Surface) */}
          <linearGradient id="fallbackGlass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#263B3C" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#204345" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#183638" stopOpacity="0.98" />
          </linearGradient>

          {/* Dynamic Wave Glow */}
          <linearGradient id="fallbackWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.1" />
            <stop offset="50%" stopColor={accentColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.1" />
          </linearGradient>

          <filter id="fallbackGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Hairline Rotating Orbital Ring */}
        <circle 
          cx="200" 
          cy="210" 
          r="185" 
          fill="none" 
          stroke={accentColor} 
          strokeWidth="1.2" 
          strokeDasharray="8 14 30 14" 
          strokeOpacity="0.3"
        />

        <circle 
          cx="200" 
          cy="210" 
          r="165" 
          fill="none" 
          stroke="rgba(192,209,212,0.15)" 
          strokeWidth="1" 
          strokeDasharray="4 8"
        />

        {/* Hexagonal Titanium Casing (Beveled Rim) */}
        <polygon
          points="200,30 350,115 350,285 200,370 50,285 50,115"
          fill="url(#fallbackMetal)"
          stroke="rgba(192,209,212,0.25)"
          strokeWidth="2.5"
        />

        {/* Recessed Carbon Plate */}
        <polygon
          points="200,45 335,123 335,277 200,355 65,277 65,123"
          fill="url(#fallbackGlass)"
          stroke="rgba(0,0,0,0.6)"
          strokeWidth="2"
        />

        {/* Subtle Chamfer Highlight Line */}
        <polyline
          points="65,123 200,45 335,123"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* 3D Gas-Fluid Wave Streamlines */}
        <g filter="url(#fallbackGlow)">
          <path
            d="M 100,165 C 150,140 250,190 300,165"
            fill="none"
            stroke="url(#fallbackWave)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 90,210 C 145,185 255,235 310,210"
            fill="none"
            stroke="url(#fallbackWave)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 100,255 C 150,230 250,280 300,255"
            fill="none"
            stroke="url(#fallbackWave)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>

        {/* Central Machined Status Diode Core */}
        <circle cx="200" cy="210" r="26" fill="#061A1D" stroke="rgba(192,209,212,0.3)" strokeWidth="1.5" />
        <circle cx="200" cy="210" r="16" fill="url(#fallbackMetal)" />
        <circle cx="200" cy="210" r="8" fill={accentColor} filter="url(#fallbackGlow)" />
        <circle cx="197" cy="207" r="2.5" fill="#FFFFFF" fillOpacity="0.8" />

        {/* Status Annotation */}
        <text 
          x="200" 
          y="320" 
          textAnchor="middle" 
          fill={accentColor} 
          fontSize="11" 
          fontFamily="JetBrains Mono, monospace" 
          letterSpacing="2"
          fontWeight="bold"
        >
          {status} SYSTEM
        </text>
      </svg>
    </div>
  );
};
