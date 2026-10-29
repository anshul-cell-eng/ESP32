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
      {/* Decorative Atmospheric Depth Light Field */}
      <div className="absolute top-1/4 right-5% w-[500px] h-[500px] bg-[#08454D]/30 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10% w-[400px] h-[400px] bg-[#FF746D]/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Editorial Headline & Copy */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6 lg:space-y-8 z-10 text-left">
          {/* Eyebrow & Live Connection Status Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B2C33]/90 border border-[#35D7E8]/30 backdrop-blur-md text-[11px] font-mono tracking-widest uppercase text-[#35D7E8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#35D7E8] animate-ping" />
              <span>Smart LPG Safety System</span>
            </div>

            {/* Real Hardware Connectivity Pill */}
            <div 
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono border backdrop-blur-md ${
                !isLive
                  ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                  : isOnline
                  ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                  : 'bg-[#FF746D]/10 border-[#FF746D]/30 text-[#FF746D]'
              }`}
            >
              <span 
                className={`w-2 h-2 rounded-full ${
                  !isLive ? 'bg-[#F59E0B]' : isOnline ? 'bg-[#22C55E]' : 'bg-[#FF746D]'
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

          {/* Large Editorial Headline */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight text-[#F7FAFC] leading-[1.08]">
              Detect Early.
            </h1>
            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.08]">
              <span className="text-[#FF746D]">Protect</span>{' '}
              <span className="text-[#F7FAFC]">Every Life.</span>
            </h1>
          </div>

          {/* Emotionally Meaningful Supporting Copy */}
          <p className="text-base sm:text-lg text-[#C0D1D4] max-w-2xl font-normal leading-relaxed">
            Combustible gas leaks don't announce themselves until it is too late. Engineered with sub-second autonomous hardware isolation and precision multi-tier sensing, SENTINEL continuously monitors atmospheric safety at the edge, guarding commercial kitchens, laboratories, and residential homes before hazardous concentrations accumulate.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {/* Primary Action Button */}
            <button
              onClick={onOpenDashboard}
              className="group flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#FF746D] to-[#E05D57] hover:from-[#ff857f] hover:to-[#eb6862] text-white font-medium text-sm sm:text-base shadow-coralGlow transition-all duration-200 cursor-pointer"
            >
              <span>Open Monitoring Dashboard</span>
              <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
            </button>

            {/* Secondary Action */}
            <button
              onClick={onExploreArchitecture}
              className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#08252A]/80 hover:bg-[#0B2C33] border border-[#C0D1D4]/20 hover:border-[#35D7E8]/40 text-[#F7FAFC] font-medium text-sm sm:text-base backdrop-blur-md transition-all duration-200 cursor-pointer"
            >
              <span>Explore Architecture</span>
              <ArrowRight className="w-4 h-4 text-[#35D7E8]" />
            </button>
          </div>

          {/* Key Engineering Indicators */}
          <div className="pt-4 grid grid-cols-3 gap-4 border-t border-[#C0D1D4]/10 max-w-xl text-left">
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#35D7E8]">100ms</div>
              <div className="text-xs text-[#C0D1D4] mt-0.5">Edge Isolation Loop</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#F7FAFC]">12-Bit</div>
              <div className="text-xs text-[#C0D1D4] mt-0.5">MQ-2 Sensitivity</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#22C55E]">Auto</div>
              <div className="text-xs text-[#C0D1D4] mt-0.5">Solenoid Cutoff</div>
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
