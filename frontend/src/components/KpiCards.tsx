import React from 'react';
import type { AccuracyMetrics } from '../types';

interface KpiCardsProps {
  metrics: AccuracyMetrics;
  avgActualMw?: number | null;
  peakActualMw?: number | null;
  avgForecastMw?: number | null;
  cutoffPolicy: string;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  metrics,
  avgActualMw,
  peakActualMw,
  avgForecastMw,
  cutoffPolicy
}) => {
  const isOverforecasting = (metrics.bias ?? 0) > 0;
  
  const biasFormatted = metrics.bias != null 
    ? `${metrics.bias > 0 ? '+' : ''}${metrics.bias.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW`
    : 'N/A';

  const maeFormatted = metrics.mae != null 
    ? `${metrics.mae.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW` 
    : 'N/A';

  const rmseFormatted = metrics.rmse != null 
    ? `${metrics.rmse.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW` 
    : 'N/A';

  const formatPolicy = (p: string) => {
    switch (p) {
      case 'day_ahead_1100': return 'D-1 11:00 UK';
      case 'day_ahead_1200': return 'D-1 12:00 UK';
      case 'day_ahead_1700': return 'D-1 17:00 UK';
      case 'intraday_h4': return 'Intraday H-4';
      case 'intraday_h1': return 'Intraday H-1';
      default: return p;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Card 1: Actual Wind Generation */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-between shadow-none">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Actual Wind Generation
          </div>
          <div className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
            {avgActualMw ? `${avgActualMw.toLocaleString()} MW` : '—'}
          </div>
        </div>
        <div className="text-xs text-slate-600 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span>Peak: <strong className="text-slate-800">{peakActualMw ? `${peakActualMw.toLocaleString()} MW` : '—'}</strong></span>
          <span className="text-slate-400">Elexon FUELHH</span>
        </div>
      </div>

      {/* Card 2: Selected Forecast Generation */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-between shadow-none">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Selected Day-Ahead Forecast
          </div>
          <div className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
            {avgForecastMw ? `${avgForecastMw.toLocaleString()} MW` : '—'}
          </div>
        </div>
        <div className="text-xs text-slate-600 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span>Cutoff: <strong className="text-slate-800">{formatPolicy(cutoffPolicy)}</strong></span>
          <span className="text-slate-400">WINDFOR</span>
        </div>
      </div>

      {/* Card 3: Forecast Bias */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-between shadow-none">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Forecast Bias (Mean Error)
          </div>
          <div className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
            {biasFormatted}
          </div>
        </div>
        <div className="text-xs text-slate-600 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="font-medium text-slate-800">
            {isOverforecasting ? 'Overforecasting (Long)' : 'Underforecasting (Short)'}
          </span>
          <span className="text-slate-400">F − A</span>
        </div>
      </div>

      {/* Card 4: MAE & RMSE Accuracy */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-between shadow-none">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Mean Absolute Error (MAE)
          </div>
          <div className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
            {maeFormatted}
          </div>
        </div>
        <div className="text-xs text-slate-600 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span>RMSE: <strong className="text-slate-800">{rmseFormatted}</strong></span>
          <span className="text-slate-500 font-medium">Coverage: <strong className="text-slate-800">{metrics.coverage_pct}%</strong></span>
        </div>
      </div>

    </div>
  );
};
