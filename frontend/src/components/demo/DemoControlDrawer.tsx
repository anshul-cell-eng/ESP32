import React, { useState } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  RotateCcw, 
  Sliders, 
  Zap, 
  Info 
} from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';

interface DemoControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoControlDrawer: React.FC<DemoControlDrawerProps> = ({ isOpen, onClose }) => {
  const { mode, setMode, triggerScenario, status } = useSentinel();
  const [sliderAdc, setSliderAdc] = useState<number>(1200);

  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'SAFE',
      title: 'Normal Ambient Air',
      adc: 420,
      description: 'Clean kitchen environment baseline (0-500 ADC). All actuators idle.',
      icon: CheckCircle,
      color: 'text-sentinel-safe',
      badge: 'SAFE',
      badgeStyle: 'bg-emerald-950/30 text-sentinel-safe border-emerald-900/40',
    },
    {
      id: 'WARNING',
      title: 'Elevated Gas Concentration',
      adc: 1680,
      description: 'Minor unlit burner or slow leak (1500-2000 ADC). Warning buzzer pulses.',
      icon: AlertTriangle,
      color: 'text-sentinel-warning',
      badge: 'WARNING',
      badgeStyle: 'bg-amber-950/30 text-sentinel-warning border-amber-900/40',
    },
    {
      id: 'CRITICAL',
      title: 'Critical Pipe Rupture',
      adc: 2650,
      description: 'High gas release (>2000 ADC). Solenoid cutoff trips, continuous alarm.',
      icon: AlertCircle,
      color: 'text-sentinel-critical',
      badge: 'CRITICAL',
      badgeStyle: 'bg-rose-950/30 text-sentinel-critical border-rose-900/40',
    },
    {
      id: 'RECOVERY',
      title: 'Ventilation Recovery',
      adc: 850,
      description: 'Exhaust active. Gas dissipates below threshold; system normalizes.',
      icon: RotateCcw,
      color: 'text-sentinel-blue',
      badge: 'RECOVERY',
      badgeStyle: 'bg-blue-950/30 text-sentinel-blue border-blue-900/40',
    },
  ];

  const handleApplyScenario = async (scenarioId: string) => {
    if (mode !== 'DEMO') {
      await setMode('DEMO');
    }
    await triggerScenario(scenarioId);
  };

  const handleApplySlider = async () => {
    if (mode !== 'DEMO') {
      await setMode('DEMO');
    }
    await triggerScenario('CUSTOM', sliderAdc);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-sentinel-surface border-l border-sentinel-border h-full flex flex-col p-5 shadow-modal overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-sentinel-border mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sentinel-panel border border-sentinel-border flex items-center justify-center text-sentinel-warning">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Presentation Simulator</h2>
              <p className="text-[11px] text-sentinel-textSecondary">Test scenarios without physical hardware</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-sentinel-muted hover:text-white hover:bg-sentinel-panel transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice */}
        <div className="p-3 rounded-lg bg-sentinel-panel border border-sentinel-border mb-4 flex items-start gap-2.5 text-xs text-sentinel-textSecondary">
          <Info className="w-3.5 h-3.5 text-sentinel-warning shrink-0 mt-0.5" />
          <span>
            Simulated transitions demonstrate 3D emblem state changes, gauge reactions, and actuator alarms without altering real device records.
          </span>
        </div>

        {/* Scenarios */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
            Pre-Configured Scenarios
          </h3>

          {scenarios.map((sc) => {
            const Icon = sc.icon;
            return (
              <button
                key={sc.id}
                onClick={() => handleApplyScenario(sc.id)}
                className="w-full text-left p-3 rounded-lg bg-sentinel-panel hover:bg-sentinel-panelHover border border-sentinel-border transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${sc.color}`} />
                    <span className="text-xs font-semibold text-white group-hover:text-sentinel-blue transition-colors">
                      {sc.title}
                    </span>
                  </div>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${sc.badgeStyle}`}>
                    {sc.badge}
                  </span>
                </div>
                <p className="text-[11px] text-sentinel-textSecondary mb-1.5">
                  {sc.description}
                </p>
                <div className="text-[10px] font-mono text-sentinel-muted">
                  Target ADC: <strong className="text-white">{sc.adc} counts</strong>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom ADC slider */}
        <div className="p-3.5 rounded-lg bg-sentinel-panel border border-sentinel-border mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sentinel-blue" />
              <span className="text-xs font-medium text-white">Manual ADC Injection</span>
            </div>
            <span className="text-xs font-bold font-mono text-sentinel-blue">{sliderAdc} ADC</span>
          </div>

          <input
            type="range"
            min="100"
            max="4000"
            step="20"
            value={sliderAdc}
            onChange={(e) => setSliderAdc(Number(e.target.value))}
            className="w-full accent-sentinel-blue cursor-pointer mb-2"
          />

          <div className="flex justify-between text-[10px] font-mono text-sentinel-muted mb-3">
            <span>100</span>
            <span className="text-sentinel-warning">1500 (Warn)</span>
            <span className="text-sentinel-critical">2000 (Crit)</span>
            <span>4000</span>
          </div>

          <button
            onClick={handleApplySlider}
            className="w-full py-1.5 rounded-md bg-sentinel-blue hover:bg-sentinel-blueHover text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Inject Custom Value
          </button>
        </div>

        {/* Close */}
        <div className="mt-auto pt-3 border-t border-sentinel-border">
          <button
            onClick={onClose}
            className="w-full py-1.5 rounded-lg bg-sentinel-panel hover:bg-sentinel-panelHover text-sentinel-textSecondary hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
