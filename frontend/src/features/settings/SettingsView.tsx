import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Volume2, 
  VolumeX, 
  Bell, 
  Eye, 
  Server, 
  AlertTriangle, 
  Save, 
  CheckCircle, 
  Info 
} from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';
import { updateSettings, fetchSettings } from '../../services/api';
import { audioService } from '../../services/audioService';

export const SettingsView: React.FC = () => {
  const {
    status,
    mode,
    setMode,
    soundEnabled,
    setSoundEnabled,
    reducedMotion,
    setReducedMotion,
    skipIntro,
    setSkipIntro,
    addToast,
  } = useSentinel();

  const [deviceId, setDeviceId] = useState<string>('HC001');
  const [esp32Ip, setEsp32Ip] = useState<string>('192.168.1.100');
  const [pollingInterval, setPollingInterval] = useState<number>(1.0);
  const [staleTimeout, setStaleTimeout] = useState<number>(5.0);
  const [safeThreshold, setSafeThreshold] = useState<number>(1500);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(2000);

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [notifGranted, setNotifGranted] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  useEffect(() => {
    fetchSettings()
      .then((cfg) => {
        setDeviceId(cfg.deviceId);
        setEsp32Ip(cfg.esp32Ip);
        setPollingInterval(cfg.pollingIntervalSeconds);
        setStaleTimeout(cfg.staleTimeoutSeconds);
        setSafeThreshold(cfg.safeThreshold);
        setCriticalThreshold(cfg.criticalThreshold);
      })
      .catch(() => {
        if (status) {
          setSafeThreshold(status.safeThreshold);
          setCriticalThreshold(status.criticalThreshold);
        }
      });
  }, []);

  const handleRequestNotif = async () => {
    const granted = await audioService.requestNotificationPermission();
    setNotifGranted(granted);
    if (granted) {
      addToast('Notification Permission', 'Browser notifications enabled.', 'SAFE');
    } else {
      addToast('Notification Permission', 'Permission was dismissed or denied.', 'WARNING');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (safeThreshold >= criticalThreshold) {
      setErrorMessage(`Warning threshold (${safeThreshold}) must be strictly less than Critical threshold (${criticalThreshold}).`);
      return;
    }

    if (!esp32Ip.trim()) {
      setErrorMessage('ESP32 IP address or hostname is required.');
      return;
    }

    setSaving(true);
    try {
      await updateSettings({
        deviceId: deviceId.trim(),
        esp32Ip: esp32Ip.trim(),
        pollingIntervalSeconds: pollingInterval,
        staleTimeoutSeconds: staleTimeout,
        safeThreshold,
        criticalThreshold,
        mode,
      });

      setSaveSuccess(true);
      addToast('Configuration Saved', 'Backend telemetry parameters updated successfully.', 'SAFE');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update settings';
      setErrorMessage(msg);
      addToast('Save Failed', msg, 'CRITICAL');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
        <div className="flex items-center gap-2 mb-0.5">
          <Settings className="w-4 h-4 text-sentinel-blue" />
          <h2 className="text-base font-bold text-white">System Settings &amp; Calibration</h2>
        </div>
        <p className="text-xs text-sentinel-textSecondary">
          Hardware IP targeting, safety boundary thresholds, and browser notification preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Hardware Collector Target */}
        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-sentinel-border">
            <Server className="w-3.5 h-3.5 text-sentinel-blue" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Hardware Collector &amp; Target Connection
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-sentinel-textSecondary mb-1">
                ESP32 Local IP Address / Hostname
              </label>
              <input
                type="text"
                value={esp32Ip}
                onChange={(e) => setEsp32Ip(e.target.value)}
                placeholder="192.168.20.xxx or 127.0.0.1:8080"
                className="w-full px-3 py-1.5 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs font-mono text-white focus:outline-none focus:border-sentinel-blue"
              />
              <p className="text-[10px] text-sentinel-muted mt-1">
                LAN IPv4 assigned to ESP32 by your Wi-Fi router (e.g. 192.168.20.xxx). Find it in Arduino Serial Monitor.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-sentinel-textSecondary mb-1">
                Device Identifier
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="HC001"
                className="w-full px-3 py-1.5 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs font-mono text-white focus:outline-none focus:border-sentinel-blue"
              />
              <p className="text-[10px] text-sentinel-muted mt-1">Hardware badge code</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-sentinel-textSecondary mb-1">
                Polling Cadence (Seconds)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.2"
                max="10.0"
                value={pollingInterval}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs font-mono text-white focus:outline-none focus:border-sentinel-blue"
              />
              <p className="text-[10px] text-sentinel-muted mt-1">HTTP request frequency to ESP32 status route</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-sentinel-textSecondary mb-1">
                Stale Data Timeout (Seconds)
              </label>
              <input
                type="number"
                step="0.5"
                min="2.0"
                max="30.0"
                value={staleTimeout}
                onChange={(e) => setStaleTimeout(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs font-mono text-white focus:outline-none focus:border-sentinel-blue"
              />
              <p className="text-[10px] text-sentinel-muted mt-1">Flags device offline if no packet arrives</p>
            </div>
          </div>
        </div>

        {/* Safety Boundary Calibration */}
        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-sentinel-border">
            <AlertTriangle className="w-3.5 h-3.5 text-sentinel-warning" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Safety Boundary Calibration
            </h3>
          </div>

          <div className="p-2.5 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs text-sentinel-textSecondary flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-sentinel-blue shrink-0 mt-0.5" />
            <span>
              Provisional demonstration thresholds. Must satisfy: <strong className="text-white">Warning limit &lt; Critical limit</strong>. Real firmware state is authoritative in Live mode.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-sentinel-warning mb-1">
                Warning Threshold (ADC Counts)
              </label>
              <input
                type="number"
                min="100"
                max="3500"
                value={safeThreshold}
                onChange={(e) => setSafeThreshold(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs font-mono text-white focus:outline-none focus:border-sentinel-warning"
              />
              <p className="text-[10px] text-sentinel-muted mt-1">Default: 1500 (Triggers warning status)</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-sentinel-critical mb-1">
                Critical Threshold (ADC Counts)
              </label>
              <input
                type="number"
                min="200"
                max="4000"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs font-mono text-white focus:outline-none focus:border-sentinel-critical"
              />
              <p className="text-[10px] text-sentinel-muted mt-1">Default: 2000 (Triggers critical alert and relay trip)</p>
            </div>
          </div>
        </div>

        {/* Audio Alerts & Notifications */}
        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-sentinel-border">
            <Bell className="w-3.5 h-3.5 text-sentinel-blue" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Audio Synthesis &amp; Notifications
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-sentinel-surface border border-sentinel-borderSubtle">
              <div className="flex items-center gap-2.5">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-sentinel-blue" />
                ) : (
                  <VolumeX className="w-4 h-4 text-sentinel-muted" />
                )}
                <div>
                  <div className="text-xs font-medium text-white">Audio Alarm Synth</div>
                  <div className="text-[11px] text-sentinel-muted">
                    Web Audio API synth tones on warning/critical events (Defaults to OFF)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-sentinel-blue text-white'
                    : 'bg-sentinel-panel text-sentinel-muted hover:text-white border border-sentinel-border'
                }`}
              >
                {soundEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-sentinel-surface border border-sentinel-borderSubtle">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-sentinel-textSecondary" />
                <div>
                  <div className="text-xs font-medium text-white">Browser Push Notifications</div>
                  <div className="text-[11px] text-sentinel-muted">
                    Display notification banner when critical thresholds are breached
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestNotif}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  notifGranted
                    ? 'bg-sentinel-safe/15 text-sentinel-safe border border-sentinel-safe/40'
                    : 'bg-sentinel-panel text-sentinel-textSecondary hover:text-white border border-sentinel-border'
                }`}
              >
                {notifGranted ? 'GRANTED' : 'REQUEST PERMISSION'}
              </button>
            </div>
          </div>
        </div>

        {/* Visual Preferences */}
        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-sentinel-border">
            <Eye className="w-3.5 h-3.5 text-sentinel-textSecondary" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Display &amp; Animation
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-sentinel-surface border border-sentinel-borderSubtle">
              <div>
                <div className="text-xs font-medium text-white">Reduced Motion Mode</div>
                <div className="text-[11px] text-sentinel-muted">
                  Replaces WebGL 3D scene with lightweight 2D SVG vector shield
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  reducedMotion
                    ? 'bg-sentinel-blue text-sentinel-panel font-bold'
                    : 'bg-sentinel-panel text-sentinel-muted hover:text-white border border-sentinel-border'
                }`}
              >
                {reducedMotion ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-sentinel-surface border border-sentinel-borderSubtle">
              <div>
                <div className="text-xs font-medium text-white">Intro Animation</div>
                <div className="text-[11px] text-sentinel-muted">
                  Play short initialization sequence on first load
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSkipIntro(!skipIntro)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  !skipIntro
                    ? 'bg-sentinel-safe/15 text-sentinel-safe border border-sentinel-safe/40'
                    : 'bg-sentinel-panel text-sentinel-muted border border-sentinel-border'
                }`}
              >
                {!skipIntro ? 'ENABLED' : 'SKIPPED'}
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-sentinel-critical/15 border border-sentinel-critical/40 text-sentinel-critical text-xs">
            {errorMessage}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-sentinel-safe">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Configuration Applied</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sentinel-blue hover:bg-sentinel-blueHover text-sentinel-panel font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
