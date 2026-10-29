import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  History, 
  AlertTriangle, 
  Cpu, 
  Settings, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const { activeTab, setActiveTab, status } = useSentinel();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'history', label: 'Sensor History', icon: History },
    { id: 'alerts', label: 'Alert History', icon: AlertTriangle, badge: status.deviceData?.gasStatus === 'CRITICAL' ? '!' : undefined },
    { id: 'diagnostics', label: 'Diagnostics', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-sentinel-surface border-r border-sentinel-border transition-all duration-200 z-20 shrink-0 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Navigation List */}
      <nav className="flex-1 px-2.5 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-sentinel-panel text-white font-semibold border border-sentinel-border'
                  : 'text-sentinel-textSecondary hover:text-white hover:bg-sentinel-panel/60'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-sentinel-blue' : 'text-sentinel-muted'
                }`}
              />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold bg-sentinel-critical text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="p-2 border-t border-sentinel-border">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-1.5 rounded-lg text-sentinel-muted hover:text-white hover:bg-sentinel-panel transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
