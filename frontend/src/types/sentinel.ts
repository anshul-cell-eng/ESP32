export type GasStatus = 'SAFE' | 'WARNING' | 'CRITICAL';
export type OperatingMode = 'LIVE' | 'DEMO';
export type Severity = 'INFO' | 'SAFE' | 'WARNING' | 'CRITICAL' | 'ERROR';

export interface DeviceStatusPayload {
  deviceId: string;
  gasAdc: number;
  gasStatus: GasStatus;
  relayState: boolean;
  buzzerState: boolean;
  temperatureC: number | null;
  humidityPercent: number | null;
  mode: OperatingMode;
  uptimeSeconds?: number;
  sequence?: number;
  firmwareVersion?: string;
  timestamp: string;
}

export interface SystemStatus {
  isOnline: boolean;
  lastResponseTimestamp: string | null;
  latencyMs: number | null;
  consecutiveFailures: number;
  deviceData: DeviceStatusPayload | null;
  backendTimestamp: string;
  mode: OperatingMode;
  thresholdMismatch: boolean;
  safeThreshold: number;
  criticalThreshold: number;
}

export interface SensorReading {
  id?: number;
  timestamp: string;
  gasAdc: number;
  gasStatus: string;
  relayState: boolean;
  buzzerState: boolean;
  source: string;
  latencyMs?: number | null;
}

export interface EventItem {
  id: string;
  timestamp: string;
  eventType: string;
  severity: Severity;
  description: string;
  source: string;
  gasAdc?: number | null;
}

export interface SettingsModel {
  deviceId: string;
  esp32Ip: string;
  pollingIntervalSeconds: number;
  staleTimeoutSeconds: number;
  safeThreshold: number;
  criticalThreshold: number;
  mode: OperatingMode;
  audioAlerts?: boolean;
  browserNotifications?: boolean;
  reducedMotion?: boolean;
  skipIntro?: boolean;
  chartRange?: string;
}

export interface DiagnosticsData {
  backendStatus: string;
  databaseStatus: string;
  deviceConnection: {
    isOnline: boolean;
    ip: string;
    deviceId: string;
    consecutiveFailures: number;
    lastLatencyMs: number | null;
    lastSuccessfulTime: string | null;
    staleTimeoutSeconds: number;
    isCloud?: boolean;
    ingestEndpoint?: string;
  };
  activeStreamClients: number;
  systemUptimeSeconds: number;
  configuredSettings: SettingsModel;
}
