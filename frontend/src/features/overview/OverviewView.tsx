import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Thermometer, 
  Droplets, 
  Activity, 
  Wifi, 
  WifiOff, 
  Flame, 
  Power, 
  Clock, 
  Radio, 
  Cpu 
} from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';
import { ThreeSafetyEmblem } from '../../components/emblem/ThreeSafetyEmblem';
import { GasGaugeCard } from '../../components/cards/GasGaugeCard';
import { HardwareOutputCard } from '../../components/cards/HardwareOutputCard';
import { SensorTrendChart } from '../../components/charts/SensorTrendChart';
import { MetricCard } from '../../components/cards/MetricCard';

export const OverviewView: React.FC = () => {
  const { status, readings, events, mode, reducedMotion, setActiveTab, setMode } = useSentinel();

  const devicePayload = status.deviceData;
  const gasStatus = devicePayload?.gasStatus || 'SAFE';
  const currentAdc = devicePayload?.gasAdc ?? (mode === 'DEMO' ? 420 : 0);
  const relayState = devicePayload?.relayState ?? false;
  const buzzerState = devicePayload?.buzzerState ?? false;
  const tempC = devicePayload?.temperatureC;
  const humidity = devicePayload?.humidityPercent;
  const isOnline = status.isOnline;
  const isLive = mode === 'LIVE';

  // Strict Truthful Safety State Logic
  let statusBanner: {
    title: string;
    desc: string;
    badge: string;
    border: string;
    bg: string;
    icon: React.ElementType;
    iconColor: string;
  };

  if (isLive && !isOnline) {
    statusBanner = {
      title: 'DEVICE OFFLINE',
      desc: 'Live telemetry unavailable. Preserving last known sensor readings in memory.',
      badge: 'OFFLINE',
      border: 'border-[#FF746D]/40',
      bg: 'bg-[#FF746D]/10',
      icon: WifiOff,
      iconColor: 'text-[#FF746D]',
    };
  } else if (!isLive) {
    statusBanner = {
      title: 'DEMO PRESENTATION ACTIVE',
      desc: 'Simulating sensor inputs and actuator responses without hardware dependencies.',
      badge: 'SIMULATOR',
      border: 'border-[#F59E0B]/40',
      bg: 'bg-[#F59E0B]/10',
      icon: Radio,
      iconColor: 'text-[#F59E0B]',
    };
  } else if (gasStatus === 'CRITICAL') {
    statusBanner = {
      title: 'CRITICAL GAS LEAKAGE DETECTED',
      desc: 'Emergency limit exceeded (>2000 ADC). Auto-isolation solenoid energized.',
      badge: 'CRITICAL ALERT',
      border: 'border-[#FF746D]/50',
      bg: 'bg-[#FF746D]/20',
      icon: ShieldAlert,
      iconColor: 'text-[#FF746D]',
    };
  } else if (gasStatus === 'WARNING') {
    statusBanner = {
      title: 'ELEVATED GAS READING DETECTED',
      desc: 'Sensor resistance drop detected (>1500 ADC). Caution advised.',
      badge: 'ELEVATED WARNING',
      border: 'border-[#F59E0B]/40',
      bg: 'bg-[#F59E0B]/10',
      icon: AlertTriangle,
      iconColor: 'text-[#F59E0B]',
    };
  } else {
    statusBanner = {
      title: 'SYSTEM NORMAL',
      desc: 'Ambient combustible gas concentration within calibrated safe baseline.',
      badge: 'NORMAL',
      border: 'border-[#22C55E]/30',
      bg: 'bg-[#22C55E]/10',
      icon: ShieldCheck,
      iconColor: 'text-[#22C55E]',
    };
  }

  const BannerIcon = statusBanner.icon;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Truthful Top Status Banner */}
      <div className={`p-4 rounded-xl border ${statusBanner.border} ${statusBanner.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sentinel-surface border border-sentinel-border flex items-center justify-center shrink-0">
            <BannerIcon className={`w-5 h-5 ${statusBanner.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {statusBanner.title}
              </h2>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-sentinel-surface border border-sentinel-border text-white">
                {statusBanner.badge}
              </span>
            </div>
            <p className="text-xs text-sentinel-textSecondary mt-0.5">{statusBanner.desc}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isLive && !isOnline && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('settings')}
                className="px-2.5 py-1 rounded-md bg-sentinel-surface hover:bg-sentinel-panel border border-sentinel-border text-xs text-sentinel-blue hover:text-white transition-colors cursor-pointer"
              >
                Configure ESP32 IP
              </button>
              <button
                onClick={() => setMode('DEMO')}
                className="px-2.5 py-1 rounded-md bg-sentinel-surface hover:bg-sentinel-panel border border-sentinel-border text-xs text-sentinel-warning hover:text-white transition-colors cursor-pointer"
              >
                Switch to Demo
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs font-mono bg-sentinel-surface/80 px-3 py-1.5 rounded-lg border border-sentinel-border">
            <span className="text-sentinel-muted">ESP32:</span>
            <span className={`font-semibold ${isOnline ? 'text-sentinel-safe' : 'text-sentinel-critical'}`}>
              {isOnline ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
            <span className="text-sentinel-border">•</span>
            <span className="text-sentinel-muted">MODE:</span>
            <span className="font-semibold text-white">{mode}</span>
          </div>
        </div>
      </div>

      {/* 2. Compact Balanced Grid: 3D Emblem & Hardware Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Compact, High-Precision 3D Safety Emblem Card */}
        <div className="lg:col-span-4 rounded-xl bg-sentinel-panel border border-sentinel-border p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-sentinel-border pb-2.5 mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-sentinel-blue" />
              <span className="text-xs font-medium text-white">Precision Safety Emblem</span>
            </div>
            <span className="text-[10px] font-mono text-sentinel-muted">3D BEZEL</span>
          </div>

          {/* Compact 3D Scene */}
          <div className="my-auto py-1">
            <ThreeSafetyEmblem status={gasStatus} reducedMotion={reducedMotion} />
          </div>

          <div className="pt-2 border-t border-sentinel-border text-center">
            <div className="text-xs text-white font-medium">State-Linked Casing Indicator</div>
            <div className="text-[11px] text-sentinel-muted font-mono mt-0.5">
              Active status: <span className="font-semibold text-white">{gasStatus}</span>
            </div>
          </div>
        </div>

        {/* Center: Gas Gauge Card */}
        <div className="lg:col-span-4 flex flex-col">
          <GasGaugeCard
            adc={currentAdc}
            status={gasStatus}
            safeThreshold={status.safeThreshold}
            criticalThreshold={status.criticalThreshold}
            timestamp={devicePayload?.timestamp}
            isOnline={isOnline}
            isStale={isLive && !isOnline}
          />
        </div>

        {/* Right: Actuators & Outputs */}
        <div className="lg:col-span-4 flex flex-col">
          <HardwareOutputCard
            relayState={relayState}
            buzzerState={buzzerState}
            gasStatus={gasStatus}
            isOnline={isOnline}
          />
        </div>
      </div>

      {/* 3. Essential Telemetry Metrics Tile Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="MQ-2 Gas Reading"
          value={currentAdc}
          unit="ADC"
          subtext={isLive && !isOnline ? 'Stale memory buffer' : '12-bit analog input'}
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
          label="Relay Cutoff Solenoid"
          value={relayState ? 'ENERGIZED' : 'IDLE'}
          subtext="GPIO 13 Output"
          icon={Power}
          badge={relayState ? 'TRIPPED' : 'PASS'}
          badgeColor={
            relayState
              ? 'bg-[#FF746D]/20 text-[#FF746D] border-[#FF746D]/30'
              : 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30'
          }
        />
        <MetricCard
          label="Ambient Temperature"
          value={tempC !== null && tempC !== undefined ? `${tempC}°C` : 'Not connected'}
          subtext="Requires DS18B20/DHT"
          icon={Thermometer}
          statusColor={tempC !== null && tempC !== undefined ? 'text-white' : 'text-sentinel-muted'}
        />
        <MetricCard
          label="Relative Humidity"
          value={humidity !== null && humidity !== undefined ? `${humidity}%` : 'Not connected'}
          subtext="Requires DHT11/DHT22"
          icon={Droplets}
          statusColor={humidity !== null && humidity !== undefined ? 'text-white' : 'text-sentinel-muted'}
        />
      </div>

      {/* 4. Telemetry Historical Chart */}
      <SensorTrendChart
        data={readings}
        safeThreshold={status.safeThreshold}
        criticalThreshold={status.criticalThreshold}
        source={mode}
        height={240}
      />

      {/* 5. Recent System Events (Clean table preview) */}
      <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-sentinel-border">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sentinel-blue" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Recent System Transitions &amp; Event Log
            </h3>
          </div>
          <span className="text-[11px] font-mono text-sentinel-muted">
            Deduplicated Event Stream
          </span>
        </div>

        {events.length === 0 ? (
          <div className="py-6 text-center text-sentinel-muted text-xs font-mono">
            No anomalous state transitions recorded. Telemetry baseline steady.
          </div>
        ) : (
          <div className="space-y-1.5">
            {events.slice(0, 4).map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-sentinel-surface border border-sentinel-borderSubtle text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      evt.severity === 'CRITICAL'
                        ? 'bg-sentinel-critical'
                        : evt.severity === 'WARNING'
                        ? 'bg-sentinel-warning'
                        : 'bg-sentinel-safe'
                    }`}
                  />
                  <div>
                    <span className="text-white font-medium">{evt.description}</span>
                    <span className="text-[10px] text-sentinel-muted font-mono ml-2">
                      [{evt.eventType} • {evt.source}]
                    </span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-sentinel-muted shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
