import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  ShieldCheck, 
  Info, 
  Search, 
  Clock, 
  Flame, 
  CheckCircle2 
} from 'lucide-react';
import { useSentinel } from '../../context/SentinelContext';
import { Severity } from '../../types/sentinel';

export const AlertHistoryView: React.FC = () => {
  const { events } = useSentinel();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (filterSeverity !== 'ALL' && evt.severity !== filterSeverity) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        return (
          evt.description.toLowerCase().includes(query) ||
          evt.eventType.toLowerCase().includes(query) ||
          evt.source.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [events, filterSeverity, searchQuery]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <AlertTriangle className="w-4 h-4 text-sentinel-warning" />
            <h2 className="text-base font-bold text-white">Safety Transitions &amp; Event Timeline</h2>
          </div>
          <p className="text-xs text-sentinel-textSecondary">
            Deduplicated safety alerts, actuator trips, and threshold crossing records
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sentinel-muted" />
            <input
              type="text"
              placeholder="Filter events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs text-white placeholder-sentinel-muted focus:outline-none focus:border-sentinel-blue w-40 sm:w-52"
            />
          </div>

          {/* Severity selector */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-sentinel-surface border border-sentinel-border text-xs text-sentinel-textSecondary focus:text-white cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="SAFE">Safe / Recovery</option>
            <option value="INFO">Hardware Info</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-sentinel-panel border border-sentinel-border text-sentinel-muted text-xs font-mono">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-sentinel-safe opacity-50" />
            <span>No events matching the current filter. System operating normally.</span>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const config = {
              CRITICAL: {
                icon: AlertCircle,
                border: 'border-sentinel-critical/40',
                badgeBg: 'bg-sentinel-critical/15 text-sentinel-critical border-sentinel-critical/40',
                badgeText: 'CRITICAL',
              },
              WARNING: {
                icon: AlertTriangle,
                border: 'border-sentinel-warning/40',
                badgeBg: 'bg-sentinel-warning/15 text-sentinel-warning border-sentinel-warning/40',
                badgeText: 'WARNING',
              },
              SAFE: {
                icon: CheckCircle2,
                border: 'border-sentinel-safe/40',
                badgeBg: 'bg-sentinel-safe/15 text-sentinel-safe border-sentinel-safe/40',
                badgeText: 'RECOVERY',
              },
              INFO: {
                icon: Info,
                border: 'border-sentinel-border',
                badgeBg: 'bg-sentinel-surface text-sentinel-textSecondary border-sentinel-border',
                badgeText: 'INFO',
              },
              ERROR: {
                icon: AlertCircle,
                border: 'border-sentinel-critical/40',
                badgeBg: 'bg-sentinel-critical/15 text-sentinel-critical border-sentinel-critical/40',
                badgeText: 'ERROR',
              },
            }[evt.severity as Severity] || {
              icon: Info,
              border: 'border-sentinel-border',
              badgeBg: 'bg-sentinel-surface text-white border-sentinel-border',
              badgeText: evt.severity,
            };

            const Icon = config.icon;

            return (
              <div
                key={evt.id}
                className={`p-3.5 rounded-xl bg-sentinel-panel border ${config.border} shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-md bg-sentinel-surface border border-sentinel-borderSubtle shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-sentinel-textSecondary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white">
                        {evt.eventType.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${config.badgeBg}`}>
                        {config.badgeText}
                      </span>
                      <span className="text-[10px] font-mono text-sentinel-muted">
                        [{evt.source}]
                      </span>
                    </div>
                    <p className="text-xs text-sentinel-textSecondary leading-relaxed">
                      {evt.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto pl-7 sm:pl-0">
                  {evt.gasAdc !== null && evt.gasAdc !== undefined && (
                    <div className="flex items-center gap-1 text-xs font-mono text-white bg-sentinel-surface px-2 py-0.5 rounded border border-sentinel-borderSubtle">
                      <Flame className="w-3 h-3 text-sentinel-blue" />
                      <span>{evt.gasAdc} ADC</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[11px] font-mono text-sentinel-muted">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
