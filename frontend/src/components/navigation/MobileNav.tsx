import React from 'react';
import { LayoutDashboard, Activity, History, AlertTriangle, Cpu, Settings } from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab } = useSentinel();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Live', icon: Activity },
    { id: 'history', label: 'History', icon: History },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'diagnostics', label: 'Diag', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sentinel-surface/95 backdrop-blur-md border-t border-sentinel-border px-1 py-1.5 safe-area-pb">
      <div className="grid grid-cols-6 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'text-white bg-sentinel-panel font-semibold'
                  : 'text-sentinel-muted hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-sentinel-blue' : 'text-sentinel-muted'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
