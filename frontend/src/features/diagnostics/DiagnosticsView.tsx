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
  AlertTriangle,
  Cloud,
  Code2,
  Clock,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';
import { fetchDiagnostics, pingDevice, discoverDevice, fetchHealth } from '../../services/api';
import { DiagnosticsData } from '../../types/sentinel';

export const DiagnosticsView: React.FC = () => {
  const { status } = useSentinel();
  const [diag, setDiag] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs?: number; message: string } | null>(null);
  const [pinging, setPinging] = useState<boolean>(false);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [discoverResult, setDiscoverResult] = useState<{ success: boolean; foundIp?: string; message: string } | null>(null);
  const [showSpec, setShowSpec] = useState<boolean>(false);
  const [cloudVerifyResult, setCloudVerifyResult] = useState<{
    success: boolean;
    backendStatus: string;
    databaseStatus: string;
    message: string;
    timestamp: string;
  } | null>(null);
  const [verifyingCloud, setVerifyingCloud] = useState<boolean>(false);

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

  const isCloud = Boolean(
    diag?.deviceConnection?.isCloud ||
    diag?.databaseStatus?.includes('PostgreSQL') ||
    (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.includes('onrender.com')) ||
    (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com'))
  );

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

  const handleRunCloudVerify = async () => {
    setVerifyingCloud(true);
    try {
      const health = await fetchHealth();
      const updatedDiag = await fetchDiagnostics();
      setDiag(updatedDiag);

      setCloudVerifyResult({
        success: health.status === 'HEALTHY',
        backendStatus: health.status,
        databaseStatus: `${health.database} (${health.databaseEngine})`,
        message: health.deviceOnline
          ? 'ESP32 is online and actively streaming live telemetry to Render.'
          : 'Backend & Database are online and ready on Render. Awaiting physical ESP32 telemetry push.',
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      setCloudVerifyResult({
        success: false,
        backendStatus: 'UNREACHABLE',
        databaseStatus: 'UNKNOWN',
        message: err instanceof Error ? err.message : 'Failed to reach cloud backend',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setVerifyingCloud(false);
    }
  };

  const isOnline = status.isOnline;
  const lastTime = diag?.deviceConnection.lastSuccessfulTime;

  const getFreshnessLabel = () => {
    if (!lastTime) return 'No Telemetry Yet';
    try {
      const diffSec = Math.max(0, Math.round((Date.now() - new Date(lastTime).getTime()) / 1000));
      if (diffSec < 6) return 'FRESH (< 6s)';
      if (diffSec < 60) return `STALE (${diffSec}s ago)`;
      const diffMin = Math.round(diffSec / 60);
      return `OFFLINE (${diffMin}m ago)`;
    } catch {
      return 'Unknown';
    }
  };

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
            {isCloud 
              ? 'Cloud telemetry ingestion status, persistent PostgreSQL storage, and device freshness'
              : 'Transport connectivity health, packet failure counters, and non-intrusive device ping'}
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
                  ? 'bg-sentinel-safe/15 text-sentinel-safe border-sentinel-safe/40'
                  : 'bg-sentinel-critical/15 text-sentinel-critical border-sentinel-critical/40'
              }`}
            >
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Device ID:</span>
              <span className="text-white font-medium">{status.deviceData?.deviceId || diag?.deviceConnection.deviceId || 'HC001'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Firmware Version:</span>
              <span className="text-white">{status.deviceData?.firmwareVersion || '1.3.0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">{isCloud ? 'Ingest Route:' : 'Configured Target:'}</span>
              <span className="text-sentinel-blue truncate max-w-[150px]" title={isCloud ? '/api/ingest' : (diag?.deviceConnection.ip || '192.168.1.100')}>
                {isCloud ? 'POST /api/ingest' : (diag?.deviceConnection.ip || '192.168.1.100')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Telemetry Status:</span>
              <span className={isOnline ? 'text-sentinel-safe font-bold' : 'text-sentinel-warning'}>
                {getFreshnessLabel()}
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
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-sentinel-safe/15 text-sentinel-safe border border-sentinel-safe/40">
              {diag?.backendStatus || 'RUNNING'}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Server Port:</span>
              <span className="text-white">{isCloud ? '443 (HTTPS/WSS)' : '8000 (HTTP/SSE)'}</span>
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
              <span className="text-sentinel-muted">Push Cadence:</span>
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
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-sentinel-safe/15 text-sentinel-safe border border-sentinel-safe/40">
              {diag?.databaseStatus || 'ONLINE'}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-sentinel-muted">Storage Engine:</span>
              <span className="text-white font-medium">
                {diag?.databaseStatus?.includes('PostgreSQL') ? 'PostgreSQL (Render)' : 'SQLite (WAL Mode)'}
              </span>
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

      {/* Cloud Ingestion or Local Ping Verification Section */}
      <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              {isCloud ? (
                <Cloud className="w-4 h-4 text-sentinel-blue" />
              ) : (
                <Radio className="w-4 h-4 text-sentinel-blue" />
              )}
              <h3 className="text-xs font-semibold text-white">
                {isCloud ? 'Cloud Ingestion & Telemetry Verification' : 'Non-Intrusive Ping Verification'}
              </h3>
            </div>
            <p className="text-xs text-sentinel-textSecondary mt-0.5">
              {isCloud
                ? 'Monitors authenticated HTTPS telemetry push from ESP32 to Render cloud endpoint'
                : 'Tests direct HTTP round-trip connectivity to the ESP32 health route without altering output states'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isCloud ? (
              <>
                <button
                  onClick={() => setShowSpec(!showSpec)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sentinel-surface hover:bg-sentinel-panel border border-sentinel-border text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5 text-sentinel-blue" />
                  <span>{showSpec ? 'Hide Spec' : 'Ingestion Spec'}</span>
                </button>
                <button
                  onClick={handleRunCloudVerify}
                  disabled={verifyingCloud}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sentinel-blue hover:bg-sentinel-blueHover text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${verifyingCloud ? 'animate-spin' : ''}`} />
                  <span>{verifyingCloud ? 'Verifying Path...' : 'Verify Ingest Path'}</span>
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Cloud Architecture Notice (Always displayed in cloud mode) */}
        {isCloud && (
          <div className="p-3 rounded-lg border border-sentinel-border bg-sentinel-surface/70 text-xs font-mono mb-3 text-sentinel-textSecondary">
            <div className="flex items-center gap-2 text-white font-semibold mb-1">
              <Cloud className="w-3.5 h-3.5 text-sentinel-blue" />
              <span>Cloud Ingestion Architecture</span>
            </div>
            <p className="leading-relaxed">
              In Render cloud deployments, the physical ESP32 connects to local Wi-Fi and pushes encrypted sensor readings via HTTPS POST to <code className="text-sentinel-blue">/api/ingest</code> using the configured <code className="text-white">X-Device-Token</code>. Outbound LAN subnet scans and <code className="text-sentinel-muted">192.168.x.x</code> pings are intentionally disabled in the cloud because cloud containers cannot access private local networks.
            </p>
          </div>
        )}

        {/* Ingestion Specification Drawer */}
        {isCloud && showSpec && (
          <div className="p-3 rounded-lg border border-sentinel-border bg-[#102223] text-xs font-mono mb-3 space-y-1.5">
            <div className="text-white font-bold pb-1 border-b border-sentinel-border/50">HTTPS Ingestion Contract</div>
            <div><span className="text-sentinel-muted">Method:</span> <strong className="text-sentinel-safe">POST</strong></div>
            <div><span className="text-sentinel-muted">URL:</span> <span className="text-sentinel-blue">https://sentinel-backend-kf6w.onrender.com/api/ingest</span></div>
            <div><span className="text-sentinel-muted">Header:</span> <span className="text-white">X-Device-Token: &lt;SENTINEL_DEVICE_TOKEN&gt;</span></div>
            <div><span className="text-sentinel-muted">Payload:</span> <code className="text-[11px] text-sentinel-safe">{`{"deviceId":"HC001","gasAdc":1200,"gasStatus":"SAFE","relayState":false,"buzzerState":false}`}</code></div>
            <div><span className="text-sentinel-muted">TLS Security:</span> <span className="text-white">Let's Encrypt ISRG Root X1 CA validation strictly enforced</span></div>
          </div>
        )}

        {/* Cloud Verification Result */}
        {isCloud && cloudVerifyResult && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono mb-3 flex items-start gap-2.5 ${
              cloudVerifyResult.success
                ? 'bg-sentinel-safe/15 border-sentinel-safe/40 text-sentinel-safe'
                : 'bg-sentinel-warning/15 border-sentinel-warning/40 text-sentinel-warning'
            }`}
          >
            {cloudVerifyResult.success ? (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>{cloudVerifyResult.success ? 'Backend Ingestion Path Verified' : 'Ingestion Path Notice'}</span>
                <span className="text-[10px] text-sentinel-muted">({cloudVerifyResult.timestamp})</span>
              </div>
              <div className="text-[11px] text-sentinel-textSecondary mt-0.5">{cloudVerifyResult.message}</div>
              <div className="text-[10px] text-sentinel-muted mt-1 flex gap-3">
                <span>Backend: <strong className="text-white">{cloudVerifyResult.backendStatus}</strong></span>
                <span>Database: <strong className="text-white">{cloudVerifyResult.databaseStatus}</strong></span>
                <span>Hardware: <strong className={isOnline ? 'text-sentinel-safe' : 'text-sentinel-warning'}>{isOnline ? 'ONLINE' : 'AWAITING PUSH'}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Local Discovery Result */}
        {!isCloud && discoverResult && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono mb-3 flex items-start gap-2.5 ${
              discoverResult.success
                ? 'bg-sentinel-safe/15 border-sentinel-safe/40 text-sentinel-safe'
                : 'bg-sentinel-warning/15 border-sentinel-warning/40 text-sentinel-warning'
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

        {/* Local Ping Result */}
        {!isCloud && pingResult && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
              pingResult.success
                ? 'bg-sentinel-safe/15 border-sentinel-safe/40 text-sentinel-safe'
                : 'bg-sentinel-critical/15 border-sentinel-critical/40 text-sentinel-critical'
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
