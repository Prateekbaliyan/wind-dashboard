import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Activity, 
  BarChart3, 
  ShieldCheck 
} from 'lucide-react';
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

  const spreadFormatted = metrics.rmse != null && metrics.mae != null
    ? `+${(metrics.rmse - metrics.mae).toLocaleString(undefined, { maximumFractionDigits: 1 })} MW volatility penalty`
    : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
      
      {/* 1. Actual Wind Generation */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Actual Wind (Avg)</span>
          <Zap className="w-4 h-4 text-wind-emerald" />
        </div>
        <div>
          <div className="text-xl lg:text-2xl font-bold text-white tracking-tight">
            {avgActualMw ? `${avgActualMw.toLocaleString()} MW` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Peak Output:</span>
            <span className="text-wind-emerald font-semibold">
              {peakActualMw ? `${peakActualMw.toLocaleString()} MW` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Forecast Generation */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Selected Forecast</span>
          <Activity className="w-4 h-4 text-wind-cyan" />
        </div>
        <div>
          <div className="text-xl lg:text-2xl font-bold text-wind-cyan tracking-tight">
            {avgForecastMw ? `${avgForecastMw.toLocaleString()} MW` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between truncate">
            <span>Cutoff:</span>
            <span className="text-slate-300 font-mono text-[10px]" title={cutoffPolicy}>
              {cutoffPolicy.replace('day_ahead_', 'DA-').replace('intraday_', 'ID-')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Forecast Bias */}
      <div className={`bg-navy-900/90 border rounded-xl p-3.5 shadow-md flex flex-col justify-between ${
        isOverforecasting ? 'border-amber-500/30' : 'border-rose-500/30'
      }`}>
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Forecast Bias</span>
          {isOverforecasting ? (
            <TrendingUp className="w-4 h-4 text-amber-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-400" />
          )}
        </div>
        <div>
          <div className={`text-xl lg:text-2xl font-bold tracking-tight ${
            isOverforecasting ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {biasFormatted}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
              isOverforecasting ? 'bg-amber-400' : 'bg-rose-400'
            }`} />
            <span>{isOverforecasting ? 'Overforecasting (Long)' : 'Underforecasting (Short)'}</span>
          </div>
        </div>
      </div>

      {/* 4. MAE */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold tracking-wider uppercase">MAE (Avg Error)</span>
          <BarChart3 className="w-4 h-4 text-wind-cyan" />
        </div>
        <div>
          <div className="text-xl lg:text-2xl font-bold text-white tracking-tight">
            {maeFormatted}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>MAPE:</span>
            <span className="text-slate-300 font-semibold">
              {metrics.mape != null ? `${metrics.mape}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. RMSE */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold tracking-wider uppercase">RMSE (Ramp Risk)</span>
          <AlertCircle className="w-4 h-4 text-wind-rose" />
        </div>
        <div>
          <div className="text-xl lg:text-2xl font-bold text-white tracking-tight">
            {rmseFormatted}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate" title={spreadFormatted || ''}>
            {spreadFormatted || 'Penalizes large outlier misses'}
          </div>
        </div>
      </div>

      {/* 6. Matched Coverage */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Matched Coverage</span>
          <ShieldCheck className="w-4 h-4 text-wind-emerald" />
        </div>
        <div>
          <div className="text-xl lg:text-2xl font-bold text-wind-emerald tracking-tight flex items-baseline gap-1.5">
            <span>{metrics.coverage_pct}%</span>
            <span className="text-xs text-slate-400 font-normal">
              ({metrics.matched_intervals}/{metrics.total_expected_intervals})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Unmatched:</span>
            <span className="text-slate-300">
              {metrics.missing_forecast_count} intervals
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
