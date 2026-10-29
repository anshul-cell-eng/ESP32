import React, { useMemo } from 'react';
import { Activity, Flame, Wifi, Clock, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';
import { SensorTrendChart } from '../../components/charts/SensorTrendChart';
import { MetricCard } from '../../components/cards/MetricCard';

export const LiveMonitoringView: React.FC = () => {
  const { status, readings, mode } = useSentinel();

  const devicePayload = status.deviceData;
  const currentAdc = devicePayload?.gasAdc ?? (mode === 'DEMO' ? 420 : 0);
  const gasStatus = devicePayload?.gasStatus || 'SAFE';

  const stats = useMemo(() => {
    if (readings.length === 0) return { min: currentAdc, max: currentAdc, avg: currentAdc };
    const values = readings.map((r) => r.gasAdc);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    return { min, max, avg };
  }, [readings, currentAdc]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Activity className="w-4 h-4 text-sentinel-blue" />
            <h2 className="text-base font-bold text-white">Live Telemetry Monitor</h2>
          </div>
          <p className="text-xs text-sentinel-textSecondary">
            Continuous real-time analog signal stream with hardware conversion statistics
          </p>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-sentinel-safe" />
          <span className="text-sentinel-muted">Polling:</span>
          <span className="text-white font-medium">1000ms</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Instantaneous Reading"
          value={currentAdc}
          unit="ADC"
          subtext="Latest ESP32 conversion"
          icon={Flame}
          statusColor={
            gasStatus === 'CRITICAL'
              ? 'text-sentinel-critical'
              : gasStatus === 'WARNING'
              ? 'text-sentinel-warning'
              : 'text-sentinel-safe'
          }
        />
        <MetricCard
          label="Buffer Peak"
          value={stats.max}
          unit="ADC"
          subtext="Highest excursion recorded"
          icon={ArrowUpRight}
          statusColor="text-sentinel-warning"
        />
        <MetricCard
          label="Buffer Baseline"
          value={stats.min}
          unit="ADC"
          subtext="Minimum valley reading"
          icon={ArrowDownRight}
          statusColor="text-sentinel-safe"
        />
        <MetricCard
          label="Moving Average"
          value={stats.avg}
          unit="ADC"
          subtext="Mean atmospheric baseline"
          icon={Activity}
          statusColor="text-sentinel-blue"
        />
      </div>

      {/* Expanded Chart */}
      <SensorTrendChart
        data={readings}
        safeThreshold={status.safeThreshold}
        criticalThreshold={status.criticalThreshold}
        source={mode}
        height={320}
      />

      {/* Telemetry Transport Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-sentinel-panel border border-sentinel-border">
          <div className="text-[11px] text-sentinel-muted font-medium mb-1">DATA FRESHNESS</div>
          <div className="text-xs font-medium text-white font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sentinel-blue" />
            <span>
              {devicePayload?.timestamp
                ? new Date(devicePayload.timestamp).toLocaleTimeString()
                : 'Awaiting timestamp'}
            </span>
          </div>
          <p className="text-[11px] text-sentinel-muted mt-0.5">Origin UTC timestamp reported by ESP32</p>
        </div>

        <div className="p-3.5 rounded-xl bg-sentinel-panel border border-sentinel-border">
          <div className="text-[11px] text-sentinel-muted font-medium mb-1">TRANSPORT LATENCY</div>
          <div className="text-xs font-medium text-white font-mono flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-sentinel-safe" />
            <span>{status.latencyMs ? `${Math.round(status.latencyMs)} ms RTT` : 'Local loopback'}</span>
          </div>
          <p className="text-[11px] text-sentinel-muted mt-0.5">Round-Trip Time from backend collector</p>
        </div>

        <div className="p-3.5 rounded-xl bg-sentinel-panel border border-sentinel-border">
          <div className="text-[11px] text-sentinel-muted font-medium mb-1">FIRMWARE SEQUENCE</div>
          <div className="text-xs font-medium text-white font-mono flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-sentinel-textSecondary" />
            <span>#{devicePayload?.sequence ?? 1} (Uptime: {devicePayload?.uptimeSeconds ?? 0}s)</span>
          </div>
          <p className="text-[11px] text-sentinel-muted mt-0.5">Continuous packet monotonic increment</p>
        </div>
      </div>
    </div>
  );
};
