import React, { useState, useEffect } from 'react';
import { Shield, ChevronRight, Activity } from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';

interface CinematicIntroProps {
  onComplete: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  const { skipIntro, setSkipIntro, reducedMotion } = useSentinel();
  const [phase, setPhase] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  useEffect(() => {
    if (reducedMotion || skipIntro) {
      onComplete();
      return;
    }

    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => {
        handleFinish();
      }, 2400),
    ];

    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, skipIntro]);

  const handleFinish = () => {
    if (dontShowAgain) {
      setSkipIntro(true);
    }
    onComplete();
  };

  if (skipIntro || reducedMotion) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#051E22] editorial-bg flex flex-col items-center justify-center overflow-hidden select-none">
      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center animate-in fade-in duration-300">
        {/* Hardware Emblem Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#0B2C33]/90 border border-[#35D7E8]/30 flex items-center justify-center mb-5 shadow-hero">
          <Shield className="w-8 h-8 text-[#35D7E8]" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B2C33] border border-[#35D7E8]/20 text-[#C0D1D4] text-[11px] font-mono mb-2">
          <Activity className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>System Initializing...</span>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-[#F7FAFC] mb-1">
          SENTINEL
        </h1>
        <p className="text-xs text-[#C0D1D4] mb-6">
          Smart LPG Safety Monitoring Platform
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#FF746D] hover:bg-[#E05D57] text-white font-medium text-xs shadow-coralGlow transition-all cursor-pointer"
          >
            <span>Enter Platform</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <label className="flex items-center gap-2 text-[11px] text-[#7E9A9E] cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-[#C0D1D4]/20 bg-[#0B2C33] text-[#35D7E8] focus:ring-0 cursor-pointer"
            />
            <span>Skip on startup</span>
          </label>
        </div>
      </div>
    </div>
  );
};
