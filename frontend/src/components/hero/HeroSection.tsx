import React from 'react';
import { 
  Shield, 
  ArrowDown, 
  ArrowRight, 
  Radio, 
  Wifi, 
  WifiOff, 
  Activity, 
  Cpu, 
  Flame, 
  CheckCircle,
  PlayCircle
} from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';
import { HeroArtwork3D } from './HeroArtwork3D';

interface HeroSectionProps {
  onOpenDashboard: () => void;
  onExploreArchitecture: () => void;
  onToggleDemoDrawer: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onOpenDashboard, 
  onExploreArchitecture,
  onToggleDemoDrawer 
}) => {
  const { status, mode, setMode, reducedMotion } = useSentinel();

  const isLive = mode === 'LIVE';
  const isOnline = status.isOnline;
  const gasStatus = status.deviceData?.gasStatus || 'SAFE';
  const currentAdc = status.deviceData?.gasAdc ?? (mode === 'DEMO' ? 420 : 0);

  return (
    <section className="relative w-full min-h-[92vh] flex items-center justify-center px-4 sm:px-6 lg:px-12 py-12 lg:py-16 overflow-hidden">
      {/* Restrained Depth Atmosphere (No decorative red light) */}
      <div className="absolute top-1/4 right-5% w-[500px] h-[500px] bg-sentinel-panel/40 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10% w-[400px] h-[400px] bg-sentinel-surface/30 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Headline & Copy */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6 lg:space-y-8 z-10 text-left">
          {/* Eyebrow & Live Connection Status Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sentinel-panel border border-sentinel-border text-[11px] font-mono tracking-widest uppercase text-sentinel-blue">
              <span className="w-1.5 h-1.5 rounded-full bg-sentinel-blue animate-ping" />
              <span>Smart LPG Safety System</span>
            </div>

            {/* Real Hardware Connectivity Pill */}
            <div 
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono border ${
                !isLive
                  ? 'bg-sentinel-warning/15 border-sentinel-warning/40 text-sentinel-warning'
                  : isOnline
                  ? 'bg-sentinel-safe/15 border-sentinel-safe/40 text-sentinel-safe'
                  : 'bg-sentinel-critical/15 border-sentinel-critical/40 text-sentinel-critical'
              }`}
            >
              <span 
                className={`w-2 h-2 rounded-full ${
                  !isLive ? 'bg-sentinel-warning' : isOnline ? 'bg-sentinel-safe' : 'bg-sentinel-critical'
                }`} 
              />
              <span>
                {!isLive 
                  ? 'Simulator Active' 
                  : isOnline 
                  ? `Hardware Live • ${status.latencyMs ? Math.round(status.latencyMs) + 'ms' : 'Sync'}` 
                  : 'Hardware Offline'}
              </span>
            </div>
          </div>

          {/* Large Headline */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight text-sentinel-text leading-[1.08]">
              Detect Early.
            </h1>
            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.08]">
              <span className="text-sentinel-blue">Protect</span>{' '}
              <span className="text-sentinel-text">Every Life.</span>
            </h1>
          </div>

          {/* Supporting Copy */}
          <p className="text-base sm:text-lg text-sentinel-textSecondary max-w-2xl font-normal leading-relaxed">
            Combustible gas leaks don't announce themselves until it is too late. Engineered with sub-second autonomous hardware isolation and precision multi-tier sensing, SENTINEL continuously monitors atmospheric safety at the edge, guarding commercial kitchens, laboratories, and residential homes before hazardous concentrations accumulate.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {/* Primary Action Button (Refined cyan accent) */}
            <button
              onClick={onOpenDashboard}
              className="group flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-sentinel-blue hover:bg-sentinel-blueHover text-sentinel-panel font-bold text-sm sm:text-base shadow-cyanGlow transition-all duration-200 cursor-pointer"
            >
              <span>Open Monitoring Dashboard</span>
              <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
            </button>

            {/* Secondary Action */}
            <button
              onClick={onExploreArchitecture}
              className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-sentinel-surface hover:bg-sentinel-panel border border-sentinel-border hover:border-sentinel-blue text-sentinel-text font-medium text-sm sm:text-base transition-all duration-200 cursor-pointer"
            >
              <span>Explore Architecture</span>
              <ArrowRight className="w-4 h-4 text-sentinel-blue" />
            </button>
          </div>

          {/* Key Engineering Indicators */}
          <div className="pt-4 grid grid-cols-3 gap-4 border-t border-sentinel-border max-w-xl text-left">
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-sentinel-blue">100ms</div>
              <div className="text-xs text-sentinel-muted mt-0.5">Edge Isolation Loop</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-sentinel-text">12-Bit</div>
              <div className="text-xs text-sentinel-muted mt-0.5">MQ-2 Sensitivity</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-sentinel-safe">Auto</div>
              <div className="text-xs text-sentinel-muted mt-0.5">Solenoid Cutoff</div>
            </div>
          </div>
        </div>

        {/* Right Column: Original 3D Dimensional Safety Emblem */}
        <div className="lg:col-span-5 flex items-center justify-center relative w-full">
          <HeroArtwork3D status={gasStatus} reducedMotion={reducedMotion} />
        </div>
      </div>
    </section>
  );
};
