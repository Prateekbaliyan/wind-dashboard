import { 
  Scale, 
  Target, 
  Info, 
  TrendingUp, 
  TrendingDown,
  Layers
} from 'lucide-react';
import type { AccuracyMetrics } from '../types';

interface AccuracySummaryProps {
  metrics: AccuracyMetrics;
}

export const AccuracySummary: React.FC<AccuracySummaryProps> = ({ metrics }) => {
  const isOver = (metrics.bias ?? 0) > 0;
  const spread = metrics.rmse != null && metrics.mae != null ? (metrics.rmse - metrics.mae) : null;

  return (
    <div className="bg-navy-900 border border-navy-700/80 rounded-xl p-4 lg:p-5 shadow-lg space-y-4">
      
      <div className="flex items-center justify-between border-b border-navy-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-wind-cyan" />
            <span>Day-Ahead Forecast Accuracy & Market Risk Assessment</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Authoritative Python-calculated metrics for all strictly matched delivery intervals.
          </p>
        </div>
        <span className="text-xs bg-navy-800 text-slate-300 px-2.5 py-1 rounded-md border border-navy-700 font-mono">
          N = {metrics.matched_intervals} Matched Hours
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* 1. Bias & Procurement Position */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          isOver 
            ? 'bg-amber-950/20 border-amber-500/30' 
            : 'bg-rose-950/20 border-rose-500/30'
        }`}>
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                {isOver ? <TrendingUp className="w-4 h-4 text-amber-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                <span className={isOver ? 'text-amber-300' : 'text-rose-300'}>
                  {isOver ? 'Overforecasting Bias' : 'Underforecasting Bias'}
                </span>
              </span>
              <span className="font-mono text-xs font-bold text-white">
                {metrics.bias != null ? `${metrics.bias > 0 ? '+' : ''}${metrics.bias} MW` : '—'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {metrics.interpretations.bias_summary}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-navy-800/80 text-[11px] text-slate-400">
            <strong className="text-slate-300">Procurement Implication:</strong> {metrics.interpretations.procurement_impact}
          </div>
        </div>

        {/* 2. MAE vs RMSE Dispersion */}
        <div className="p-4 rounded-xl bg-navy-950/60 border border-navy-700/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5 text-wind-cyan">
                <Target className="w-4 h-4" />
                <span>Error Magnitude (MAE & RMSE)</span>
              </span>
              <span className="font-mono text-xs font-bold text-white">
                MAE: {metrics.mae ?? '—'} MW
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {metrics.interpretations.mae_summary}
            </p>
            {spread != null && (
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {metrics.interpretations.rmse_summary}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-navy-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Ramp Miss Penalty Spread:</span>
            <span className="text-wind-rose font-mono font-semibold">
              {spread != null ? `+${spread.toFixed(1)} MW` : '—'}
            </span>
          </div>
        </div>

        {/* 3. Coverage & Limitations */}
        <div className="p-4 rounded-xl bg-navy-950/60 border border-navy-700/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5 text-wind-emerald">
                <Layers className="w-4 h-4" />
                <span>Coverage & Metric Limitations</span>
              </span>
              <span className="font-mono text-xs font-bold text-wind-emerald">
                {metrics.coverage_pct}%
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Matched <strong>{metrics.matched_intervals}</strong> of <strong>{metrics.total_expected_intervals}</strong> expected intervals.
              {metrics.missing_forecast_count > 0 && ` ${metrics.missing_forecast_count} intervals lacked eligible forecasts before the cutoff.`}
            </p>
            <div className="mt-2 text-[11px] text-slate-400 bg-navy-900/80 p-2 rounded border border-navy-800">
              <span className="font-semibold text-slate-300">MAPE Disclosure:</span> {metrics.mape != null ? `${metrics.mape}%` : 'N/A'}.
              Calculated only on actual output &gt; 10 MW to prevent extreme distortion from near-zero wind generation.
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-navy-800/80 text-[11px] text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Strictly calculated on identical matched interval pairs.</span>
          </div>
        </div>

      </div>

    </div>
  );
};
