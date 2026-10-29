import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { SystemStatus, SensorReading, EventItem, Severity, OperatingMode, GasStatus } from '../types/sentinel';
import { fetchStatus, fetchReadings, fetchEvents, updateSettings, triggerDemoScenario } from '../services/api';
import { sseClient } from '../services/sseClient';
import { audioService } from '../services/audioService';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  timestamp: string;
}

interface SentinelContextType {
  status: SystemStatus;
  readings: SensorReading[];
  events: EventItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mode: OperatingMode;
  setMode: (mode: OperatingMode) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  skipIntro: boolean;
  setSkipIntro: (skip: boolean) => void;
  isStreaming: boolean;
  toasts: ToastItem[];
  addToast: (title: string, message: string, severity: Severity) => void;
  removeToast: (id: string) => void;
  triggerScenario: (scenario: string, customAdc?: number) => Promise<void>;
  refreshHistory: () => Promise<void>;
}

const defaultStatus: SystemStatus = {
  isOnline: false,
  lastResponseTimestamp: null,
  latencyMs: null,
  consecutiveFailures: 0,
  deviceData: null,
  backendTimestamp: new Date().toISOString(),
  mode: 'DEMO',
  thresholdMismatch: false,
  safeThreshold: 1500,
  criticalThreshold: 2000,
};

const SentinelContext = createContext<SentinelContextType | undefined>(undefined);

export const SentinelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SystemStatus>(defaultStatus);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mode, setModeState] = useState<OperatingMode>('DEMO');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Local preferences
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('sentinel_sound') === 'true';
  });
  const [reducedMotion, setReducedMotionState] = useState<boolean>(() => {
    return localStorage.getItem('sentinel_reduced_motion') === 'true' || 
      (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  });
  const [skipIntro, setSkipIntroState] = useState<boolean>(() => {
    return localStorage.getItem('sentinel_skip_intro') === 'true';
  });

  const prevGasStatus = useRef<GasStatus>('SAFE');

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('sentinel_sound', enabled ? 'true' : 'false');
    audioService.setSoundEnabled(enabled);
  };

  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    localStorage.setItem('sentinel_reduced_motion', enabled ? 'true' : 'false');
  };

  const setSkipIntro = (skip: boolean) => {
    setSkipIntroState(skip);
    localStorage.setItem('sentinel_skip_intro', skip ? 'true' : 'false');
  };

  const addToast = useCallback((title: string, message: string, severity: Severity) => {
    const newToast: ToastItem = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      severity,
      timestamp: new Date().toLocaleTimeString(),
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    // Browser notification
    audioService.showNotification(`[SENTINEL ${severity}] ${title}`, message);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setMode = async (newMode: OperatingMode) => {
    setModeState(newMode);
    try {
      await updateSettings({ mode: newMode });
      addToast('Operating Mode Changed', `Switched platform to ${newMode} Mode.`, 'INFO');
    } catch {
      // Local UI fallback
    }
  };

  const triggerScenario = async (scenario: string, customAdc?: number) => {
    try {
      await triggerDemoScenario(scenario, customAdc);
      addToast('Demo Scenario Injected', `Triggered ${scenario} simulation.`, 'INFO');
    } catch {
      addToast('Scenario Failed', 'Backend offline; running in local sandbox.', 'WARNING');
    }
  };

  const refreshHistory = async () => {
    try {
      const histReadings = await fetchReadings(120);
      setReadings(histReadings);
      const histEvents = await fetchEvents(50);
      setEvents(histEvents);
    } catch {
      // Fallback
    }
  };

  // Initial data bootstrap & SSE connection
  useEffect(() => {
    audioService.setSoundEnabled(soundEnabled);

    // Initial fetch
    fetchStatus()
      .then((st) => {
        setStatus(st);
        setModeState(st.mode);
      })
      .catch(() => {
        // Backend not yet reachable; keep default
      });

    refreshHistory();

    // SSE connection
    sseClient.connect();
    const unsubConn = sseClient.onConnectionState((connected) => {
      setIsStreaming(connected);
    });

    const unsubStatus = sseClient.onStatus((newStatus) => {
      setStatus(newStatus);
      setModeState(newStatus.mode);

      // Add to live readings buffer if payload exists
      if (newStatus.deviceData) {
        const payload = newStatus.deviceData;
        const newReading: SensorReading = {
          timestamp: payload.timestamp,
          gasAdc: payload.gasAdc,
          gasStatus: payload.gasStatus,
          relayState: payload.relayState,
          buzzerState: payload.buzzerState,
          source: payload.mode,
          latencyMs: newStatus.latencyMs,
        };

        setReadings((prev) => {
          const next = [...prev, newReading];
          return next.slice(-150); // Bound in-memory buffer
        });

        // Audio and Toast transitions
        if (payload.gasStatus !== prevGasStatus.current) {
          if (payload.gasStatus === 'CRITICAL') {
            audioService.playCritical();
            addToast('CRITICAL GAS ALERT', `Gas level spiked to ${payload.gasAdc} ADC. Cutoff active!`, 'CRITICAL');
          } else if (payload.gasStatus === 'WARNING') {
            audioService.playWarning();
            addToast('Elevated Gas Warning', `Gas level elevated to ${payload.gasAdc} ADC. Caution!`, 'WARNING');
          } else if (payload.gasStatus === 'SAFE' && (prevGasStatus.current === 'CRITICAL' || prevGasStatus.current === 'WARNING')) {
            addToast('Gas Levels Normalized', `Gas level recovered to ${payload.gasAdc} ADC. Safe.`, 'SAFE');
          }
          prevGasStatus.current = payload.gasStatus;
        }
      }
    });

    const unsubEvents = sseClient.onEvent((newEvt) => {
      setEvents((prev) => [newEvt, ...prev].slice(0, 100));
    });

    // Polling fallback if SSE drops
    const pollInterval = setInterval(() => {
      if (!isStreaming) {
        fetchStatus()
          .then((st) => setStatus(st))
          .catch(() => {});
      }
    }, 2500);

    return () => {
      unsubConn();
      unsubStatus();
      unsubEvents();
      clearInterval(pollInterval);
      sseClient.disconnect();
    };
  }, [soundEnabled, addToast, isStreaming]);

  return (
    <SentinelContext.Provider
      value={{
        status,
        readings,
        events,
        activeTab,
        setActiveTab,
        mode,
        setMode,
        soundEnabled,
        setSoundEnabled,
        reducedMotion,
        setReducedMotion,
        skipIntro,
        setSkipIntro,
        isStreaming,
        toasts,
        addToast,
        removeToast,
        triggerScenario,
        refreshHistory,
      }}
    >
      {children}
    </SentinelContext.Provider>
  );
};

export const useSentinel = () => {
  const context = useContext(SentinelContext);
  if (!context) {
    throw new Error('useSentinel must be used within a SentinelProvider');
  }
  return context;
};
