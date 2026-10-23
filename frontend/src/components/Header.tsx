import React from 'react';
import { 
  Download, 
  RefreshCw, 
  Calendar, 
  Clock 
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
  onRefresh,
  onExport,
  isLoading
}) => {
  const handleQuickSelect = (val: string) => {
    if (val === 'full') {
      onDateChange('2026-01-01', '2026-01-31');
    } else {
      onDateChange(val, val);
    }
  };

  const isFullMonth = startDate === '2026-01-01' && endDate === '2026-01-31';

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-20">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        
        {/* Title & Status */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            UK Wind Forecast Accuracy
          </h1>
          <span className="text-slate-300">•</span>
          {isDemo ? (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              Fallback Demo Mode
            </span>
          ) : (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Live Elexon BMRS
            </span>
          )}
        </div>

        {/* Filters and Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          
          {/* Delivery Date Range Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2.5 py-1.5 shadow-none">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Delivery:</span>
            <select
              aria-label="Delivery Date Range"
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer pr-1"
              value={isFullMonth ? 'full' : startDate}
              onChange={(e) => handleQuickSelect(e.target.value)}
            >
              <option value="full">Jan 01 – 31, 2026 (Full Month)</option>
              {Array.from({ length: 31 }, (_, i) => {
                const day = String(i + 1).padStart(2, '0');
                const dateVal = `2026-01-${day}`;
                return (
                  <option key={dateVal} value={dateVal}>
                    Jan {day}, 2026
                  </option>
                );
              })}
            </select>
          </div>

          {/* Decision Cutoff Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2.5 py-1.5 shadow-none" title="Market decision cutoff used to select eligible forecast publications">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Cutoff:</span>
            <select
              aria-label="Market Decision Cutoff Policy"
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer pr-1"
              value={cutoffPolicy}
              onChange={(e) => onCutoffChange(e.target.value as CutoffPolicyType)}
            >
              <option value="day_ahead_1100">D-1 11:00 UK (EPEX/NordPool Auction)</option>
              <option value="day_ahead_1200">D-1 12:00 UK (Noon Gate)</option>
              <option value="day_ahead_1700">D-1 17:00 UK (Evening Bilateral)</option>
              <option value="intraday_h4">Intraday H-4 (4h Pre-delivery)</option>
              <option value="intraday_h1">Intraday H-1 (Gate Closure)</option>
            </select>
          </div>

          {/* Resolution Toggle */}
          <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-slate-50">
            <button
              onClick={() => onResolutionChange('hourly')}
              className={`px-2.5 py-1.5 text-xs font-medium transition ${
                resolution === 'hourly'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1-Hour
            </button>
            <button
              onClick={() => onResolutionChange('half_hourly')}
              className={`px-2.5 py-1.5 text-xs font-medium border-l border-slate-200 transition ${
                resolution === 'half_hourly'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30-Min (HH)
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-800' : ''}`} />
          </button>

          {/* Export CSV */}
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition shadow-xs"
            title="Export filtered intervals to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

        </div>

      </div>
    </header>
  );
};
