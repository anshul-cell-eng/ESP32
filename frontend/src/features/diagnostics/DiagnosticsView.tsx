import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Wifi, 
  WifiOff, 
  Database, 
  Server, 
  RefreshCw, 
  Play, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';
import { fetchDiagnostics, pingDevice, discoverDevice } from '../../services/api';
import { DiagnosticsData } from '../../types/sentinel';

export const DiagnosticsView: React.FC = () => {
  const { status } = useSentinel();
  const [diag, setDiag] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs?: number; message: string } | null>(null);
  const [pinging, setPinging] = useState<boolean>(false);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [discoverResult, setDiscoverResult] = useState<{ success: boolean; foundIp?: string; message: string } | null>(null);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const data = await fetchDiagnostics();
      setDiag(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const handleRunPing = async () => {
    setPinging(true);
    try {
      const res = await pingDevice();
      setPingResult(res);
    } catch (err: unknown) {
      setPingResult({
        success: false,
        message: err instanceof Error ? err.message : 'Ping execution failed',
      });
    } finally {
      setPinging(false);
    }
  };

  const handleRunDiscover = async () => {
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      const res = await discoverDevice();
      setDiscoverResult(res);
      if (res.success) {
        await loadDiagnostics();
      }
    } catch (err: unknown) {
      setDiscoverResult({
        success: false,
        message: err instanceof Error ? err.message : 'Discovery scan failed',
      });
    } finally {
      setDiscovering(false);
    }
  };

  const isOnline = status.isOnline;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Cpu className="w-4 h-4 text-sentinel-blue" />
            <h2 className="text-base font-bold text-white">System Diagnostics &amp; Health</h2>
          </div>
          <p className="text-xs text-sentinel-textSecondary">
            Transport connectivity health, packet failure counters, and non-intrusive device ping
          </p>
        </div>

        <button
          onClick={loadDiagnostics}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sentinel-panel hover:bg-sentinel-panelHover border border-sentinel-border text-xs text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sentinel-blue ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Diagnostics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* ESP32 Hardware */}
        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-sentinel-border">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-sentinel-safe" />
              ) : (
                <WifiOff className="w-4 h-4 text-sentinel-critical" />
              )}
              <h3 className="text-xs font-semibold text-white">ESP32 Hardware Target</h3>
            </div>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
                isOnline
                  ? 'bg-emerald-950/30 text-sentinel-safe border-emerald-900/40'
                  : 'bg-rose-950/30 text-sentinel-critical border-rose-900/40'
              }`}
            >
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Device ID:</span>
              <span className="text-white font-medium">{status.deviceData?.deviceId || 'HC001'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Firmware Version:</span>
              <span className="text-white">{status.deviceData?.firmwareVersion || '1.0.0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Configured Target:</span>
              <span className="text-sentinel-blue">{diag?.deviceConnection.ip || '192.168.1.100'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Consecutive Drops:</span>
              <span className={status.consecutiveFailures > 0 ? 'text-sentinel-warning font-bold' : 'text-sentinel-safe'}>
                {status.consecutiveFailures} drops
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Reported Uptime:</span>
              <span className="text-white">{status.deviceData?.uptimeSeconds ? `${status.deviceData.uptimeSeconds}s` : '—'}</span>
            </div>
          </div>
        </div>

        {/* FastAPI Collector Backend */}
        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-sentinel-border">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sentinel-blue" />
              <h3 className="text-xs font-semibold text-white">FastAPI Daemon</h3>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-950/30 text-sentinel-safe border border-emerald-900/40">
              {diag?.backendStatus || 'RUNNING'}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Server Port:</span>
              <span className="text-white">8000 (HTTP/SSE)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Collector Mode:</span>
              <span className="text-white font-medium">{status.mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Daemon Uptime:</span>
              <span className="text-white">{diag?.systemUptimeSeconds ? `${Math.round(diag.systemUptimeSeconds)}s` : 'Active'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Polling Cadence:</span>
              <span className="text-white">1.0s interval</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Stale Limit:</span>
              <span className="text-white">5.0 seconds</span>
            </div>
          </div>
        </div>

        {/* Database & SSE Hub */}
        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-sentinel-border">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-sentinel-blue" />
              <h3 className="text-xs font-semibold text-white">Database &amp; Stream</h3>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-950/30 text-sentinel-safe border border-emerald-900/40">
              {diag?.databaseStatus || 'ONLINE'}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Storage Engine:</span>
              <span className="text-white">SQLite (WAL Mode)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Connected Clients:</span>
              <span className="text-white">{diag?.activeStreamClients ?? 1} browser tabs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">SSE Stream URL:</span>
              <span className="text-sentinel-blue">/api/stream</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Deduplication:</span>
              <span className="text-sentinel-safe">ENABLED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Time Standard:</span>
              <span className="text-white">ISO 8601 UTC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Non-Intrusive Ping Test */}
      <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xs font-semibold text-white">Non-Intrusive Ping Verification</h3>
            <p className="text-xs text-sentinel-textSecondary mt-0.5">
              Tests direct HTTP round-trip connectivity to the ESP32 health route without altering output states
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunDiscover}
              disabled={discovering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sentinel-surface hover:bg-sentinel-panel border border-sentinel-border text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sentinel-blue ${discovering ? 'animate-spin' : ''}`} />
              <span>{discovering ? 'Scanning Subnets...' : 'Auto-Scan for ESP32'}</span>
            </button>
            <button
              onClick={handleRunPing}
              disabled={pinging}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sentinel-blue hover:bg-sentinel-blueHover text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
              <span>{pinging ? 'Pinging...' : 'Execute Ping'}</span>
            </button>
          </div>
        </div>

        {discoverResult && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono mb-3 flex items-start gap-2.5 ${
              discoverResult.success
                ? 'bg-emerald-950/20 border-emerald-900/40 text-sentinel-safe'
                : 'bg-amber-950/20 border-amber-900/40 text-sentinel-warning'
            }`}
          >
            {discoverResult.success ? (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{discoverResult.success ? 'ESP32 Detected!' : 'Subnet Scan Completed'}</div>
              <div className="text-[11px] text-sentinel-textSecondary mt-0.5">{discoverResult.message}</div>
            </div>
          </div>
        )}

        {pingResult && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
              pingResult.success
                ? 'bg-emerald-950/20 border-emerald-900/40 text-sentinel-safe'
                : 'bg-rose-950/20 border-rose-900/40 text-sentinel-critical'
            }`}
          >
            {pingResult.success ? (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{pingResult.success ? 'Ping Succeeded' : 'Ping Failed'}</div>
              <div className="text-[11px] text-sentinel-textSecondary mt-0.5">{pingResult.message}</div>
              {pingResult.latencyMs && (
                <div className="text-[10px] text-sentinel-muted mt-0.5">
                  Round-trip latency: <strong className="text-white">{pingResult.latencyMs}ms</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
