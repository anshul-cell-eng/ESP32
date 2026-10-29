import React from 'react';
import { 
  Shield, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  PlayCircle, 
  ArrowDown, 
  Settings as SettingsIcon,
  Activity,
  History,
  AlertTriangle,
  Cpu
} from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';

interface TopNavProps {
  onToggleDemoDrawer: () => void;
  onOpenDashboard?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleDemoDrawer, onOpenDashboard }) => {
  const { status, mode, setMode, soundEnabled, setSoundEnabled, activeTab, setActiveTab } = useSentinel();

  const isLive = mode === 'LIVE';
  const isOnline = status.isOnline;

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onOpenDashboard) {
      onOpenDashboard();
    } else {
      const el = document.getElementById('dashboard');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'monitoring', label: 'Live Monitoring' },
    { id: 'history', label: 'Sensor History' },
    { id: 'alerts', label: 'Alert History' },
    { id: 'diagnostics', label: 'Diagnostics' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-sentinel-bg/90 backdrop-blur-xl border-b border-sentinel-border px-4 sm:px-6 lg:px-12 py-3 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-sentinel-panel border border-sentinel-border flex items-center justify-center text-sentinel-blue shadow-sm group-hover:border-sentinel-blue transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-extrabold text-base tracking-tight text-sentinel-text">
                  SENTINEL
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-sentinel-blue" />
              </div>
            </div>
          </button>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-sentinel-surface p-1 rounded-full border border-sentinel-border">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-sentinel-blue text-sentinel-panel font-bold shadow-cyanGlow'
                    : 'text-sentinel-textSecondary hover:text-white hover:bg-sentinel-panel/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Controls, Live/Demo Mode & CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-sentinel-surface p-0.5 rounded-full border border-sentinel-border text-xs font-mono">
            <button
              onClick={() => setMode('LIVE')}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                isLive
                  ? 'bg-sentinel-blue text-sentinel-panel font-bold'
                  : 'text-sentinel-textSecondary hover:text-white'
              }`}
            >
              LIVE
            </button>
            <button
              onClick={() => setMode('DEMO')}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                !isLive
                  ? 'bg-sentinel-warning text-black font-bold'
                  : 'text-sentinel-textSecondary hover:text-white'
              }`}
            >
              DEMO
            </button>
          </div>

          {/* Quick Demo Simulator Drawer Button */}
          {!isLive && (
            <button
              onClick={onToggleDemoDrawer}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sentinel-warning/15 hover:bg-sentinel-warning/25 border border-sentinel-warning/40 text-sentinel-warning text-xs font-medium transition-colors cursor-pointer"
              title="Open Presentation Scenarios"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Simulate</span>
            </button>
          )}

          {/* Connection Status Indicator */}
          <div 
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
              !isLive
                ? 'bg-sentinel-warning/15 text-sentinel-warning border-sentinel-warning/40'
                : isOnline
                ? 'bg-sentinel-safe/15 text-sentinel-safe border-sentinel-safe/40'
                : 'bg-sentinel-critical/15 text-sentinel-critical border-sentinel-critical/40'
            }`}
          >
            <span 
              className={`w-1.5 h-1.5 rounded-full ${
                !isLive ? 'bg-sentinel-warning' : isOnline ? 'bg-sentinel-safe animate-pulse' : 'bg-sentinel-critical'
              }`} 
            />
            <span className="text-[11px] font-semibold">
              {!isLive ? 'DEMO' : isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* Audio Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-full border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-sentinel-blue/20 text-sentinel-blue border-sentinel-blue/50'
                : 'bg-sentinel-surface text-sentinel-muted border-sentinel-border hover:text-white'
            }`}
            title={soundEnabled ? 'Mute Synthetic Audio Alarms' : 'Enable Synthetic Audio Alarms'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => handleNavClick('settings')}
            className={`p-2 rounded-full border transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-sentinel-blue text-sentinel-panel border-sentinel-blue'
                : 'bg-sentinel-surface text-sentinel-textSecondary hover:text-white border-sentinel-border'
            }`}
            title="Settings & Configuration"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          {/* Action Button: Non-red cyan action button */}
          <button
            onClick={() => {
              if (onOpenDashboard) onOpenDashboard();
              else {
                const el = document.getElementById('dashboard');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-sentinel-blue hover:bg-sentinel-blueHover text-sentinel-panel text-xs font-bold shadow-cyanGlow transition-all duration-200 cursor-pointer"
          >
            <span>Dashboard</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
