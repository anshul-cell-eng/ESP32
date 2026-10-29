import React from 'react';
import { Power, Volume2, VolumeX, Lightbulb, Monitor, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { GasStatus } from '../../types/sentinel';

interface HardwareOutputCardProps {
  relayState: boolean;
  buzzerState: boolean;
  gasStatus: GasStatus;
  isOnline: boolean;
}

export const HardwareOutputCard: React.FC<HardwareOutputCardProps> = ({
  relayState,
  buzzerState,
  gasStatus,
  isOnline,
}) => {
  return (
    <div className="p-5 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sentinel-surface border border-sentinel-border flex items-center justify-center text-sentinel-blue">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Actuators &amp; Physical Outputs</h3>
              <p className="text-[11px] text-sentinel-muted font-mono">ESP32 GPIO Hardware Registers</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-sentinel-textSecondary bg-sentinel-surface border border-sentinel-border">
            HARDWARE CONTROL
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {/* Relay Solenoid Output */}
          <div className={`p-3 rounded-lg border ${
            relayState
              ? 'bg-rose-950/20 border-rose-900/40 text-white'
              : 'bg-sentinel-surface border-sentinel-borderSubtle text-sentinel-textSecondary'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Power className={`w-3.5 h-3.5 ${relayState ? 'text-sentinel-critical' : 'text-sentinel-muted'}`} />
                <span className="text-xs font-medium text-white">Relay Output</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                relayState
                  ? 'bg-sentinel-critical text-white'
                  : 'bg-sentinel-panel text-sentinel-muted'
              }`}>
                {relayState ? 'TRIPPED (ON)' : 'PASS (OFF)'}
              </span>
            </div>
            <p className="text-[10px] text-sentinel-muted font-mono">
              GPIO 13 • {relayState ? 'Solenoid isolation active' : 'Gas permissive normal'}
            </p>
          </div>

          {/* Active Buzzer Output */}
          <div className={`p-3 rounded-lg border ${
            buzzerState
              ? 'bg-amber-950/20 border-amber-900/40 text-white'
              : 'bg-sentinel-surface border-sentinel-borderSubtle text-sentinel-textSecondary'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                {buzzerState ? (
                  <Volume2 className="w-3.5 h-3.5 text-sentinel-warning" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-sentinel-muted" />
                )}
                <span className="text-xs font-medium text-white">Audio Alarm</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                buzzerState
                  ? 'bg-sentinel-warning text-black'
                  : 'bg-sentinel-panel text-sentinel-muted'
              }`}>
                {buzzerState ? 'ACTIVE' : 'MUTED'}
              </span>
            </div>
            <p className="text-[10px] text-sentinel-muted font-mono">
              GPIO 14 • {buzzerState ? 'Audible buzzer sounding' : 'Audible driver off'}
            </p>
          </div>

          {/* RGB Status LED */}
          <div className="p-3 rounded-lg bg-sentinel-surface border border-sentinel-borderSubtle">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-sentinel-blue" />
                <span className="text-xs font-medium text-white">RGB Status Beacon</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  gasStatus === 'CRITICAL'
                    ? 'bg-sentinel-critical'
                    : gasStatus === 'WARNING'
                    ? 'bg-sentinel-warning'
                    : 'bg-sentinel-safe'
                }`} />
                <span className="text-[10px] font-mono text-white font-medium">
                  {gasStatus === 'CRITICAL' ? 'RED' : gasStatus === 'WARNING' ? 'AMBER' : 'GREEN'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-sentinel-muted font-mono">
              GPIO 25/26/27 • Color-coded optical beacon
            </p>
          </div>

          {/* Optional I2C OLED */}
          <div className="p-3 rounded-lg bg-sentinel-surface border border-sentinel-borderSubtle">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-sentinel-muted" />
                <span className="text-xs font-medium text-white">I2C OLED Screen</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-sentinel-muted bg-sentinel-panel">
                OPTIONAL
              </span>
            </div>
            <p className="text-[10px] text-sentinel-muted font-mono">
              GPIO 21/22 • Local 128x64 diagnostic screen
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-sentinel-muted pt-2 border-t border-sentinel-borderSubtle">
        Disclaimer: Digital relay output energizes the valve driver circuit. Physical gas isolation depends on valve installation integrity.
      </p>
    </div>
  );
};
