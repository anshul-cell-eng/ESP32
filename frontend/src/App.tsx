import React, { useState } from 'react';
import { SentinelProvider, useSentinel } from './context/SentinelContext';
import { CinematicIntro } from './components/cinematic/CinematicIntro';
import { TopNav } from './components/navigation/TopNav';
import { HeroSection } from './components/hero/HeroSection';
import { ArchitectureSection } from './components/architecture/ArchitectureSection';
import { ToastContainer } from './components/common/ToastContainer';
import { DemoControlDrawer } from './components/demo/DemoControlDrawer';

import { OverviewView } from './features/overview/OverviewView';
import { LiveMonitoringView } from './features/monitoring/LiveMonitoringView';
import { SensorHistoryView } from './features/history/SensorHistoryView';
import { AlertHistoryView } from './features/alerts/AlertHistoryView';
import { DiagnosticsView } from './features/diagnostics/DiagnosticsView';
import { SettingsView } from './features/settings/SettingsView';

import { 
  LayoutDashboard, 
  Activity, 
  History, 
  AlertTriangle, 
  Cpu, 
  Settings, 
  Shield 
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab } = useSentinel();
  const [introDone, setIntroDone] = useState<boolean>(() => {
    return localStorage.getItem('sentinel_skip_intro') === 'true';
  });
  const [demoDrawerOpen, setDemoDrawerOpen] = useState<boolean>(false);

  const scrollToDashboard = () => {
    const el = document.getElementById('dashboard');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToArchitecture = () => {
    const el = document.getElementById('architecture');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'history', label: 'Sensor History', icon: History },
    { id: 'alerts', label: 'Alert History', icon: AlertTriangle },
    { id: 'diagnostics', label: 'Diagnostics', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#2E2A27] editorial-bg editorial-noise text-[#F7FAFC] flex flex-col font-sans selection:bg-[#35D7E8]/30 selection:text-[#35D7E8] relative overflow-x-hidden">
      {/* Cinematic Intro overlay if not skipped */}
      {!introDone && (
        <CinematicIntro onComplete={() => setIntroDone(true)} />
      )}

      {/* Top Editorial Sticky Navigation */}
      <TopNav 
        onToggleDemoDrawer={() => setDemoDrawerOpen(true)}
        onOpenDashboard={scrollToDashboard}
      />

      {/* Full-width Editorial Hero Section */}
      <HeroSection 
        onOpenDashboard={scrollToDashboard}
        onExploreArchitecture={scrollToArchitecture}
        onToggleDemoDrawer={() => setDemoDrawerOpen(true)}
      />

      {/* Operational Safety Dashboard Section */}
      <section id="dashboard" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 scroll-mt-16">
        {/* Section Header with Quick Tab Selector Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#C0D1D4]/10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#F7FAFC]">
                Operational Safety Dashboard
              </h2>
              <span className="w-2 h-2 rounded-full bg-[#35D7E8]" />
            </div>
            <p className="text-xs sm:text-sm text-[#C0D1D4] mt-0.5">
              Continuous multi-tier telemetry, safety state verification &amp; remote controls
            </p>
          </div>

          {/* Quick Responsive View Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-full bg-[#06282E]/90 border border-[#C0D1D4]/10 backdrop-blur-md">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#35D7E8] text-[#051E22] font-semibold shadow-cyanGlow'
                      : 'text-[#C0D1D4] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Main View Area */}
        <main className="w-full">
          {activeTab === 'overview' && <OverviewView />}
          {activeTab === 'monitoring' && <LiveMonitoringView />}
          {activeTab === 'history' && <SensorHistoryView />}
          {activeTab === 'alerts' && <AlertHistoryView />}
          {activeTab === 'diagnostics' && <DiagnosticsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </section>

      {/* Engineering Architecture & Hardware Specifications Section */}
      <ArchitectureSection />

      {/* Editorial Footer */}
      <footer className="w-full border-t border-[#C0D1D4]/10 bg-[#04191C] py-8 px-4 sm:px-6 lg:px-12 text-xs text-[#7E9A9E]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#0B2C33] border border-[#35D7E8]/30 flex items-center justify-center text-[#35D7E8]">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-extrabold text-white tracking-wider">SENTINEL</span>
              <span className="text-[#C0D1D4] ml-2 text-xs">Smart LPG Safety Monitoring Platform</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#C0D1D4]">
            <span>ESP32 Core</span>
            <span>•</span>
            <span>MQ-2 12-Bit ADC</span>
            <span>•</span>
            <span>100ms Autonomous Relay Cutoff</span>
            <span>•</span>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-[#35D7E8] hover:underline font-bold cursor-pointer ml-1"
            >
              Back to Top ↑
            </button>
          </div>
        </div>
      </footer>

      {/* Global In-App Toast Alerts */}
      <ToastContainer />

      {/* Presentation Mode Demo Control Drawer */}
      <DemoControlDrawer
        isOpen={demoDrawerOpen}
        onClose={() => setDemoDrawerOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SentinelProvider>
      <MainLayout />
    </SentinelProvider>
  );
};

export default App;
