import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useSentinel();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const severityConfig = {
          SAFE: {
            icon: CheckCircle,
            border: 'border-sentinel-safe/40',
            bg: 'bg-sentinel-panel/95',
            text: 'text-sentinel-safe',
            glow: 'shadow-glow-safe',
          },
          WARNING: {
            icon: AlertTriangle,
            border: 'border-sentinel-warning/40',
            bg: 'bg-sentinel-panel/95',
            text: 'text-sentinel-warning',
            glow: 'shadow-glow-warning',
          },
          CRITICAL: {
            icon: AlertCircle,
            border: 'border-sentinel-critical/50',
            bg: 'bg-sentinel-panel/95',
            text: 'text-sentinel-critical',
            glow: 'shadow-glow-critical',
          },
          INFO: {
            icon: Info,
            border: 'border-sentinel-cyan/30',
            bg: 'bg-sentinel-panel/95',
            text: 'text-sentinel-cyan',
            glow: 'shadow-glow-cyan',
          },
          ERROR: {
            icon: AlertCircle,
            border: 'border-sentinel-critical/50',
            bg: 'bg-sentinel-panel/95',
            text: 'text-sentinel-critical',
            glow: 'shadow-glow-critical',
          },
        }[toast.severity];

        const Icon = severityConfig.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${severityConfig.border} ${severityConfig.bg} backdrop-blur-md ${severityConfig.glow} shadow-panel transition-all animate-in fade-in slide-in-from-top-3`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${severityConfig.text}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-semibold text-white tracking-wide truncate">{toast.title}</h4>
                <span className="text-[10px] text-sentinel-muted font-mono">{toast.timestamp}</span>
              </div>
              <p className="text-xs text-sentinel-textSecondary leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-sentinel-muted hover:text-white transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
