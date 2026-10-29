import { SystemStatus, SensorReading, EventItem, SettingsModel, DiagnosticsData } from '../types/sentinel';

// Dynamic API Base URL: Read from Vite environment variable in production, fallback to relative path for local proxy
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

// Bounded timeout fetch helper (defaults to 3 seconds)
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchStatus(): Promise<SystemStatus> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/status`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function fetchReadings(limit = 100, fromTime?: string, toTime?: string, source?: string): Promise<SensorReading[]> {
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (fromTime) params.set('from', fromTime);
  if (toTime) params.set('to', toTime);
  if (source) params.set('source', source);

  const res = await fetchWithTimeout(`${BASE_URL}/api/readings?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function fetchEvents(limit = 50, severity?: string, source?: string): Promise<EventItem[]> {
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (severity) params.set('severity', severity);
  if (source) params.set('source', source);

  const res = await fetchWithTimeout(`${BASE_URL}/api/events?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function fetchSettings(): Promise<SettingsModel> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/settings`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function updateSettings(updates: Partial<SettingsModel>): Promise<SettingsModel> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update settings' }));
    throw new Error(errorData.detail || `HTTP error ${res.status}`);
  }
  return res.json();
}

export async function pingDevice(targetIp?: string): Promise<{ success: boolean; latencyMs?: number; message: string }> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/diagnostics/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetIp }),
  }, 3500);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function triggerDemoScenario(scenario: string, customAdc?: number): Promise<void> {
  await fetchWithTimeout(`${BASE_URL}/api/demo/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, customAdc }),
  });
}

export async function fetchDiagnostics(): Promise<DiagnosticsData> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/diagnostics`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function discoverDevice(): Promise<{ success: boolean; foundIp?: string; message: string }> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/diagnostics/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, 3500);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

