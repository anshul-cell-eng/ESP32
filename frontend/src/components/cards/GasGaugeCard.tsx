import React from 'react';
import { Flame, Info, AlertTriangle, ShieldCheck, ShieldAlert, WifiOff } from 'lucide-react';
import { GasStatus } from '../../types/sentinel';

interface GasGaugeCardProps {
  adc: number;
  status: GasStatus;
  safeThreshold: number;
  criticalThreshold: number;
  timestamp?: string | null;
  isOnline: boolean;
  isStale?: boolean;
}

export const GasGaugeCard: React.FC<GasGaugeCardProps> = ({
  adc,
  status,
  safeThreshold,
  criticalThreshold,
  timestamp,
  isOnline,
  isStale = false,
}) => {
  const percentage = Math.min(100, Math.max(0, (adc / 4095) * 100));

  const statusConfig = {
    SAFE: {
      label: 'NORMAL',
      color: 'text-sentinel-safe',
      badgeBg: 'bg-sentinel-safe/15 text-sentinel-safe border-sentinel-safe/40',
      gaugeBar: 'bg-sentinel-safe',
      icon: ShieldCheck,
      desc: 'Combustible gas concentrations within safe baseline range.',
    },
    WARNING: {
      label: 'ELEVATED',
      color: 'text-sentinel-warning',
      badgeBg: 'bg-sentinel-warning/15 text-sentinel-warning border-sentinel-warning/40',
      gaugeBar: 'bg-sentinel-warning',
      icon: AlertTriangle,
      desc: 'Elevated gas detected. Caution advised; inspect surrounding area.',
    },
    CRITICAL: {
      label: 'CRITICAL',
      color: 'text-sentinel-critical',
      badgeBg: 'bg-sentinel-critical/15 text-sentinel-critical border-sentinel-critical/40',
      gaugeBar: 'bg-sentinel-critical',
      icon: ShieldAlert,
      desc: 'Critical gas leakage threshold breached! Emergency cutoff activated.',
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-5 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sentinel-surface border border-sentinel-border flex items-center justify-center text-sentinel-blue">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">MQ-2 Combustible Gas Sensor</h3>
                {isStale || !isOnline ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-sentinel-critical/15 text-sentinel-critical border border-sentinel-critical/40 flex items-center gap-1">
                    <WifiOff className="w-2.5 h-2.5" />
                    STALE
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusConfig.badgeBg}`}>
                    {statusConfig.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-sentinel-muted font-mono">Analog Input • GPIO 34 (12-bit)</p>
            </div>
          </div>

          <StatusIcon className={`w-5 h-5 ${!isOnline ? 'text-sentinel-muted' : statusConfig.color}`} />
        </div>

        {/* Primary Measurement: White in Normal, Amber in Warning, Red in Critical */}
        <div className="my-3 flex items-baseline gap-2.5">
          <span
            className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${
              status === 'CRITICAL'
                ? 'text-sentinel-critical'
                : status === 'WARNING'
                ? 'text-sentinel-warning'
                : 'text-white'
            }`}
          >
            {adc}
          </span>
          <span className="text-xs font-mono text-sentinel-muted">/ 4095 ADC</span>
          <span className="text-xs text-sentinel-textSecondary font-mono">({percentage.toFixed(1)}%)</span>
        </div>

        {/* Linear Meter */}
        <div className="space-y-1.5 mb-3">
          <div className="relative w-full h-2.5 bg-sentinel-surface rounded-full overflow-hidden border border-sentinel-borderSubtle">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                !isOnline ? 'bg-slate-600' : statusConfig.gaugeBar
              }`}
              style={{ width: `${percentage}%` }}
            />
            {/* Warning Marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-sentinel-warning"
              style={{ left: `${(safeThreshold / 4095) * 100}%` }}
              title={`Warning limit: ${safeThreshold}`}
            />
            {/* Critical Marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-sentinel-critical"
              style={{ left: `${(criticalThreshold / 4095) * 100}%` }}
              title={`Critical limit: ${criticalThreshold}`}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-sentinel-muted">
            <span>0</span>
            <span className="text-sentinel-warning">Warn: {safeThreshold}</span>
            <span className="text-sentinel-critical">Crit: {criticalThreshold}</span>
            <span>4095</span>
          </div>
        </div>

        <p className="text-xs text-sentinel-textSecondary mb-3">
          {!isOnline
            ? 'Live reading unavailable. Displaying last valid measurement preserved in memory.'
            : statusConfig.desc}
        </p>
      </div>

      {/* Technical Truth Note */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sentinel-surface border border-sentinel-borderSubtle text-[11px] text-sentinel-muted">
        <Info className="w-3.5 h-3.5 text-sentinel-blue shrink-0 mt-0.5" />
        <span>
          MQ-2 output reflects analog voltage drop across internal SnO2 element. Raw ADC values require laboratory calibration before conversion to certified gas ppm.
        </span>
      </div>
    </div>
  );
};
