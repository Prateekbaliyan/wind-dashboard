import React from 'react';
import { 
  Wind, 
  Clock, 
  Calendar, 
  Download, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  SlidersHorizontal 
} from 'lucide-react';
import type { CutoffPolicyType } from '../types';

interface HeaderProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  cutoffPolicy: CutoffPolicyType;
  onCutoffChange: (policy: CutoffPolicyType) => void;
  resolution: string;
  onResolutionChange: (res: string) => void;
  isDemo: boolean;
  dataSource: string;
  onRefresh: () => void;
  onExport: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  startDate,
  endDate,
  onDateChange,
  cutoffPolicy,
  onCutoffChange,
  resolution,
  onResolutionChange,
  isDemo,
  dataSource,
  onRefresh,
  onExport,
  isLoading
}) => {
  // Preset January 2026 quick dates
  const handleQuickSelect = (val: string) => {
    if (val === 'full') {
      onDateChange('2026-01-01', '2026-01-31');
    } else {
      onDateChange(val, val);
    }
  };

  const isFullMonth = startDate === '2026-01-01' && endDate === '2026-01-31';

  return (
    <header className="bg-navy-900 border-b border-navy-700/80 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 px-4 lg:px-8 py-3.5 shadow-xl">
      <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        
        {/* Brand & Market Context */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wind-cyan/20 to-wind-emerald/20 border border-wind-cyan/30 flex items-center justify-center text-wind-cyan shadow-inner">
            <Wind className="w-5 h-5 text-wind-cyan animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                UK Wind Forecast Accuracy
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy-800 border border-navy-600 text-slate-300">
                  Day-Ahead Procurement
                </span>
              </h1>
              {isDemo ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <ShieldAlert className="w-3 h-3" /> Fallback Demo Mode
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Live Elexon BMRS
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Delivery Period: <strong className="text-slate-200">January 2026</strong></span>
              <span>•</span>
              <span className="truncate max-w-[320px] text-slate-400 font-mono text-[11px]" title={dataSource}>
                {dataSource}
              </span>
            </p>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="flex flex-wrap items-center gap-2.5 lg:gap-3 text-xs">
          
          {/* Quick Date Selector */}
          <div className="flex items-center bg-navy-950/80 border border-navy-700 rounded-lg p-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
            <select
              aria-label="Delivery Date Range"
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer py-1 pr-2 font-medium"
              value={isFullMonth ? 'full' : startDate}
              onChange={(e) => handleQuickSelect(e.target.value)}
            >
              <option value="full" className="bg-navy-900 text-white">Full Month (Jan 01 - 31)</option>
              {Array.from({ length: 31 }, (_, i) => {
                const day = String(i + 1).padStart(2, '0');
                const dateVal = `2026-01-${day}`;
                return (
                  <option key={dateVal} value={dateVal} className="bg-navy-900 text-white">
                    Day: Jan {day}, 2026
                  </option>
                );
              })}
            </select>
          </div>

          {/* Decision Cutoff Selector */}
          <div className="flex items-center bg-navy-950/80 border border-navy-700 rounded-lg p-1" title="Market decision cutoff applied to filter forecast publications">
            <Clock className="w-3.5 h-3.5 text-wind-cyan ml-1.5 mr-1" />
            <span className="text-slate-400 mr-1.5 font-medium">Cutoff:</span>
            <select
              aria-label="Market Decision Cutoff Policy"
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer py-1 pr-2 font-medium"
              value={cutoffPolicy}
              onChange={(e) => onCutoffChange(e.target.value as CutoffPolicyType)}
            >
              <option value="day_ahead_1100" className="bg-navy-900 text-white">
                D-1 11:00 UK (EPEX/NordPool Auction)
              </option>
              <option value="day_ahead_1200" className="bg-navy-900 text-white">
                D-1 12:00 UK (Noon Cutoff)
              </option>
              <option value="day_ahead_1700" className="bg-navy-900 text-white">
                D-1 17:00 UK (Evening Bilateral)
              </option>
              <option value="intraday_h4" className="bg-navy-900 text-white">
                Intraday H-4 (4h Pre-delivery)
              </option>
              <option value="intraday_h1" className="bg-navy-900 text-white">
                Intraday H-1 (Gate Closure)
              </option>
            </select>
          </div>

          {/* Resolution Selector */}
          <div className="flex items-center bg-navy-950/80 border border-navy-700 rounded-lg p-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
            <button
              onClick={() => onResolutionChange('hourly')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                resolution === 'hourly'
                  ? 'bg-wind-cyan/20 text-wind-cyan border border-wind-cyan/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1-Hour
            </button>
            <button
              onClick={() => onResolutionChange('half_hourly')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                resolution === 'half_hourly'
                  ? 'bg-wind-cyan/20 text-wind-cyan border border-wind-cyan/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              30-Min (HH)
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-wind-cyan' : ''}`} />
            </button>

            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 hover:border-slate-400 text-slate-200 font-medium transition shadow-sm"
              title="Export filtered interval data as CSV"
            >
              <Download className="w-3.5 h-3.5 text-wind-emerald" />
              <span>Export CSV</span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
