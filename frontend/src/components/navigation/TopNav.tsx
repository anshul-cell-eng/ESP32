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
    <header className="sticky top-0 z-40 w-full bg-[#051E22]/80 backdrop-blur-xl border-b border-[#C0D1D4]/10 px-4 sm:px-6 lg:px-12 py-3 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B2C33] to-[#062228] border border-[#35D7E8]/30 flex items-center justify-center text-[#35D7E8] shadow-sm group-hover:border-[#35D7E8]/60 transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-extrabold text-base tracking-tight text-[#F7FAFC]">
                  SENTINEL
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#35D7E8]" />
              </div>
            </div>
          </button>
        </div>

        {/* Center: Editorial Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#06282E]/60 p-1 rounded-full border border-[#C0D1D4]/10 backdrop-blur-md">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#35D7E8] text-[#051E22] font-semibold shadow-cyanGlow'
                    : 'text-[#C0D1D4] hover:text-[#F7FAFC] hover:bg-white/5'
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
          <div className="flex items-center bg-[#06282E]/80 p-0.5 rounded-full border border-[#C0D1D4]/10 text-xs font-mono">
            <button
              onClick={() => setMode('LIVE')}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                isLive
                  ? 'bg-[#35D7E8] text-[#051E22] font-bold'
                  : 'text-[#C0D1D4] hover:text-[#F7FAFC]'
              }`}
            >
              LIVE
            </button>
            <button
              onClick={() => setMode('DEMO')}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                !isLive
                  ? 'bg-[#F59E0B] text-[#051E22] font-bold'
                  : 'text-[#C0D1D4] hover:text-[#F7FAFC]'
              }`}
            >
              DEMO
            </button>
          </div>

          {/* Quick Demo Simulator Drawer Button */}
          {!isLive && (
            <button
              onClick={onToggleDemoDrawer}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-medium transition-colors cursor-pointer"
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
                ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                : isOnline
                ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
                : 'bg-[#FF746D]/10 text-[#FF746D] border-[#FF746D]/30'
            }`}
          >
            <span 
              className={`w-1.5 h-1.5 rounded-full ${
                !isLive ? 'bg-[#F59E0B]' : isOnline ? 'bg-[#22C55E] animate-pulse' : 'bg-[#FF746D]'
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
                ? 'bg-[#35D7E8]/15 text-[#35D7E8] border-[#35D7E8]/40'
                : 'bg-[#08252A] text-[#7E9A9E] border-[#C0D1D4]/10 hover:text-white'
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
                ? 'bg-[#35D7E8] text-[#051E22] border-[#35D7E8]'
                : 'bg-[#08252A] text-[#C0D1D4] hover:text-white border-[#C0D1D4]/10'
            }`}
            title="Settings & Configuration"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          {/* Compact Pill-Shaped Action Button: Open Dashboard */}
          <button
            onClick={() => {
              if (onOpenDashboard) onOpenDashboard();
              else {
                const el = document.getElementById('dashboard');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FF746D] hover:bg-[#E05D57] text-white text-xs font-semibold shadow-coralGlow transition-all duration-200 cursor-pointer"
          >
            <span>Dashboard</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
