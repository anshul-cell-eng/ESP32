import { SystemStatus, EventItem, SettingsModel } from '../types/sentinel';

export type SSEStatusListener = (status: SystemStatus) => void;
export type SSEEventListener = (event: EventItem) => void;
export type SSESettingsListener = (settings: SettingsModel) => void;
export type SSEConnectionStateListener = (connected: boolean) => void;

class SSEClient {
  private eventSource: EventSource | null = null;
  private statusListeners: Set<SSEStatusListener> = new Set();
  private eventListeners: Set<SSEEventListener> = new Set();
  private settingsListeners: Set<SSESettingsListener> = new Set();
  private connectionListeners: Set<SSEConnectionStateListener> = new Set();
  private reconnectTimer: number | null = null;
  private isConnected = false;

  public connect() {
    if (this.eventSource) {
      return;
    }

    try {
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
      const sseUrl = `${baseUrl}/api/stream`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.notifyConnectionState(true);
      };

      this.eventSource.addEventListener('telemetry', (e: MessageEvent) => {
        try {
          const data: SystemStatus = JSON.parse(e.data);
          this.statusListeners.forEach((fn) => fn(data));
        } catch {
          // ignore parse errors
        }
      });

      this.eventSource.addEventListener('event', (e: MessageEvent) => {
        try {
          const data: EventItem = JSON.parse(e.data);
          this.eventListeners.forEach((fn) => fn(data));
        } catch {
          // ignore parse errors
        }
      });

      this.eventSource.addEventListener('settings_updated', (e: MessageEvent) => {
        try {
          const data: SettingsModel = JSON.parse(e.data);
          this.settingsListeners.forEach((fn) => fn(data));
        } catch {
          // ignore parse errors
        }
      });

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.notifyConnectionState(false);
        this.disconnect();
        // Retry connection in 3 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };
    } catch {
      this.notifyConnectionState(false);
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private notifyConnectionState(state: boolean) {
    this.connectionListeners.forEach((fn) => fn(state));
  }

  public onStatus(fn: SSEStatusListener) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  public onEvent(fn: SSEEventListener) {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  public onSettings(fn: SSESettingsListener) {
    this.settingsListeners.add(fn);
    return () => this.settingsListeners.delete(fn);
  }

  public onConnectionState(fn: SSEConnectionStateListener) {
    this.connectionListeners.add(fn);
    fn(this.isConnected);
    return () => this.connectionListeners.delete(fn);
  }
}

export const sseClient = new SSEClient();
