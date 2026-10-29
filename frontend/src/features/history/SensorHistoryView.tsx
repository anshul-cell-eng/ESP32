import React, { useState, useEffect } from 'react';
import { History, Download, RefreshCw, Flame } from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';
import { fetchReadings } from '../../services/api';
import { SensorReading } from '../../types/sentinel';

export const SensorHistoryView: React.FC = () => {
  const { status } = useSentinel();
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [limit, setLimit] = useState<number>(100);
  const [filterSource, setFilterSource] = useState<string>('ALL');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const src = filterSource === 'ALL' ? undefined : filterSource;
      const data = await fetchReadings(limit, undefined, undefined, src);
      setHistory(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [limit, filterSource]);

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Gas ADC', 'Gas Status', 'Relay State', 'Buzzer State', 'Source', 'Latency (ms)'];
    const rows = history.map((r) => [
      r.id ?? '',
      r.timestamp,
      r.gasAdc,
      r.gasStatus,
      r.relayState ? 'ON' : 'OFF',
      r.buzzerState ? 'ON' : 'OFF',
      r.source,
      r.latencyMs ?? '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sentinel_sensor_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <History className="w-4 h-4 text-sentinel-blue" />
            <h2 className="text-base font-bold text-white">Sensor History Archive</h2>
          </div>
          <p className="text-xs text-sentinel-textSecondary">
            Persistent SQLite time-series readings and hardware states
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Source filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs text-sentinel-textSecondary focus:text-white cursor-pointer"
          >
            <option value="ALL">All Sources</option>
            <option value="LIVE">Live Hardware</option>
            <option value="DEMO">Demo Simulator</option>
          </select>

          {/* Limit selector */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2.5 py-1 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs text-sentinel-textSecondary focus:text-white cursor-pointer"
          >
            <option value="50">Last 50</option>
            <option value="100">Last 100</option>
            <option value="250">Last 250</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sentinel-panel hover:bg-sentinel-panelHover border border-sentinel-border text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sentinel-blue" />
            <span>Export CSV</span>
          </button>

          {/* Refresh */}
          <button
            onClick={loadHistory}
            className="p-1.5 rounded-lg bg-sentinel-surface hover:bg-sentinel-panel border border-sentinel-border text-sentinel-muted hover:text-white transition-colors cursor-pointer"
            title="Reload from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sentinel-blue' : ''}`} />
          </button>
        </div>
      </div>

      {/* History Data Table */}
      <div className="bg-sentinel-panel rounded-xl border border-sentinel-border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-sentinel-border bg-sentinel-surface text-sentinel-muted font-mono uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3.5 font-medium">Record ID</th>
                <th className="py-2.5 px-3.5 font-medium">Timestamp</th>
                <th className="py-2.5 px-3.5 font-medium">Gas Value</th>
                <th className="py-2.5 px-3.5 font-medium">Status</th>
                <th className="py-2.5 px-3.5 font-medium">Relay</th>
                <th className="py-2.5 px-3.5 font-medium">Buzzer</th>
                <th className="py-2.5 px-3.5 font-medium">Source</th>
                <th className="py-2.5 px-3.5 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sentinel-borderSubtle font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sentinel-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-sentinel-blue" />
                    Querying database records...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sentinel-muted">
                    No historical readings found for the selected filter.
                  </td>
                </tr>
              ) : (
                history.map((row, idx) => (
                  <tr key={row.id ?? idx} className="hover:bg-sentinel-surface/40 transition-colors">
                    <td className="py-2.5 px-3.5 text-sentinel-muted">#{row.id ?? idx + 1}</td>
                    <td className="py-2.5 px-3.5 text-white">
                      {new Date(row.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-white flex items-center gap-1">
                      <Flame className="w-3 h-3 text-sentinel-blue" />
                      <span>{row.gasAdc} ADC</span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                          row.gasStatus === 'CRITICAL'
                            ? 'bg-sentinel-critical/15 text-sentinel-critical border-sentinel-critical/40'
                            : row.gasStatus === 'WARNING'
                            ? 'bg-sentinel-warning/15 text-sentinel-warning border-sentinel-warning/40'
                            : 'bg-sentinel-safe/15 text-sentinel-safe border-sentinel-safe/40'
                        }`}
                      >
                        {row.gasStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className={row.relayState ? 'text-sentinel-critical font-bold' : 'text-sentinel-muted'}>
                        {row.relayState ? 'TRIPPED' : 'PASS'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className={row.buzzerState ? 'text-sentinel-warning font-bold' : 'text-sentinel-muted'}>
                        {row.buzzerState ? 'ACTIVE' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] border ${
                          row.source === 'LIVE'
                            ? 'bg-sentinel-blue/15 text-sentinel-blue border-sentinel-blue/30'
                            : 'bg-sentinel-warning/15 text-sentinel-warning border-sentinel-warning/30'
                        }`}
                      >
                        {row.source}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-sentinel-muted">
                      {row.latencyMs ? `${Math.round(row.latencyMs)}ms` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
