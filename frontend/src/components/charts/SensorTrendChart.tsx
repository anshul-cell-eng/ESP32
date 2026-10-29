import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { SensorReading } from '../../types/sentinel';
import { Clock } from 'lucide-react';

interface SensorTrendChartProps {
  data: SensorReading[];
  safeThreshold: number;
  criticalThreshold: number;
  source: string;
  height?: number;
}

export const SensorTrendChart: React.FC<SensorTrendChartProps> = ({
  data,
  safeThreshold,
  criticalThreshold,
  source,
  height = 260,
}) => {
  const [timeFilter, setTimeFilter] = useState<'1m' | '5m' | '1h' | '24h'>('5m');

  const filteredData = React.useMemo(() => {
    if (data.length === 0) return [];
    const now = Date.now();
    const windowMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    }[timeFilter];

    const cutoff = now - windowMs;
    return data
      .filter((d) => {
        const t = new Date(d.timestamp).getTime();
        return isNaN(t) || t >= cutoff;
      })
      .map((d) => {
        const dt = new Date(d.timestamp);
        return {
          ...d,
          formattedTime: isNaN(dt.getTime())
            ? d.timestamp
            : dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
      });
  }, [data, timeFilter]);

  return (
    <div className="w-full bg-sentinel-panel rounded-xl border border-sentinel-border p-5 shadow-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-white">MQ-2 Telemetry Trend</h3>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border ${
                source === 'LIVE'
                  ? 'bg-sentinel-blue/15 text-sentinel-blue border-sentinel-blue/40'
                  : 'bg-sentinel-warning/15 text-sentinel-warning border-sentinel-warning/40'
              }`}
            >
              {source === 'LIVE' ? 'SRC: LIVE HARDWARE' : 'SRC: SIMULATOR'}
            </span>
          </div>
          <p className="text-xs text-sentinel-textSecondary">
            Analog signal time-series with safety boundary references
          </p>
        </div>

        {/* Time Window Buttons */}
        <div className="flex items-center gap-1 bg-sentinel-surface p-0.5 rounded-lg border border-sentinel-border self-start sm:self-auto">
          {(['1m', '5m', '1h', '24h'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                timeFilter === filter
                  ? 'bg-sentinel-panel text-white font-medium border border-sentinel-border'
                  : 'text-sentinel-muted hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height }}>
        {filteredData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-sentinel-muted text-xs gap-1.5 font-mono">
            <Clock className="w-5 h-5 opacity-40 animate-pulse" />
            <span>Awaiting telemetry stream frames...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="adcAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#45D9E6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#45D9E6" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="2 2" stroke="rgba(58, 85, 83, 0.35)" vertical={false} />

              <XAxis
                dataKey="formattedTime"
                stroke="#899F9B"
                tick={{ fill: '#B8C5C2', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />

              <YAxis
                stroke="#899F9B"
                tick={{ fill: '#B8C5C2', fontSize: 10 }}
                domain={[0, 4095]}
                tickLine={false}
                axisLine={false}
                ticks={[0, 1000, safeThreshold, criticalThreshold, 4000]}
              />

              <ReferenceLine
                y={safeThreshold}
                stroke="#F3B64B"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: `WARN (${safeThreshold})`,
                  position: 'right',
                  fill: '#F3B64B',
                  fontSize: 9,
                  offset: 6,
                }}
              />
              <ReferenceLine
                y={criticalThreshold}
                stroke="#FF6868"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: `CRIT (${criticalThreshold})`,
                  position: 'right',
                  fill: '#FF6868',
                  fontSize: 9,
                  offset: 6,
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as SensorReading & { formattedTime: string };
                    return (
                      <div className="bg-[#204345] border border-[#3A5553] p-2.5 rounded-xl shadow-card text-xs font-mono">
                        <div className="text-[#899F9B] text-[10px] mb-1">{d.formattedTime}</div>
                        <div className="text-[#F5F5F0] font-bold flex items-center gap-1.5">
                          <span className="text-[#45D9E6] text-sm">{d.gasAdc}</span>
                          <span className="text-[10px] text-[#B8C5C2] font-normal">ADC counts</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-[#3A5553] text-[10px]">
                          <span
                            className={
                              d.gasStatus === 'CRITICAL'
                                ? 'text-[#FF6868] font-bold'
                                : d.gasStatus === 'WARNING'
                                ? 'text-[#F3B64B] font-bold'
                                : 'text-[#32C98A]'
                            }
                          >
                            Status: {d.gasStatus}
                          </span>
                          <span className="text-[#B8C5C2]">Relay: {d.relayState ? 'TRIPPED' : 'PASS'}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="gasAdc"
                stroke="#45D9E6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#adcAreaGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
