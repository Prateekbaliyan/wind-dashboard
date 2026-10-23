import React from 'react';
import type { AccuracyMetrics } from '../types';

interface AccuracySummaryProps {
  metrics: AccuracyMetrics;
}

export const AccuracySummary: React.FC<AccuracySummaryProps> = ({ metrics }) => {
  const spread = metrics.rmse != null && metrics.mae != null ? (metrics.rmse - metrics.mae) : null;

  return (
    <div className="bg-white border border-slate-200 rounded p-4 shadow-none space-y-3">
      
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Forecast Accuracy & Market Risk Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical metrics computed in Python on strictly identical matched interval pairs (N = {metrics.matched_intervals} hours).
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Coverage: <strong className="text-slate-800">{metrics.coverage_pct}%</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        
        {/* Panel 1: Forecast Bias & Procurement Position */}
        <div className="p-3.5 rounded border border-slate-200 bg-slate-50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between font-semibold text-slate-800 mb-1.5">
              <span>Forecast Bias (Systematic Drift)</span>
              <span className="font-mono text-slate-900">
                {metrics.bias != null ? `${metrics.bias > 0 ? '+' : ''}${metrics.bias.toLocaleString()} MW` : '—'}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {metrics.interpretations.bias_summary}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200 text-slate-500 text-[11px]">
            <strong className="text-slate-700">Commercial impact:</strong> {metrics.interpretations.procurement_impact}
          </div>
        </div>

        {/* Panel 2: MAE vs RMSE Dispersion */}
        <div className="p-3.5 rounded border border-slate-200 bg-slate-50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between font-semibold text-slate-800 mb-1.5">
              <span>Error Dispersion (MAE & RMSE)</span>
              <span className="font-mono text-slate-900">
                MAE: {metrics.mae != null ? `${metrics.mae.toLocaleString()} MW` : '—'}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {metrics.interpretations.mae_summary}
            </p>
            {spread != null && (
              <p className="text-slate-500 mt-1.5 leading-relaxed">
                {metrics.interpretations.rmse_summary}
              </p>
            )}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200 text-slate-500 text-[11px] flex justify-between">
            <span>Ramp miss spread:</span>
            <span className="font-mono font-medium text-slate-800">
              {spread != null ? `+${spread.toFixed(1)} MW` : '—'}
            </span>
          </div>
        </div>

        {/* Panel 3: Coverage & Methodological Disclosures */}
        <div className="p-3.5 rounded border border-slate-200 bg-slate-50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between font-semibold text-slate-800 mb-1.5">
              <span>Data Coverage & Limitations</span>
              <span className="font-mono text-slate-900">
                {metrics.matched_intervals}/{metrics.total_expected_intervals}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Matched {metrics.matched_intervals} of {metrics.total_expected_intervals} expected intervals in the selected delivery range.
              {metrics.missing_forecast_count > 0 && ` ${metrics.missing_forecast_count} intervals had no eligible forecast published before cutoff.`}
            </p>
            <p className="text-slate-500 mt-1.5 leading-relaxed text-[11px]">
              <strong className="text-slate-700">MAPE Disclosure:</strong> {metrics.mape != null ? `${metrics.mape}%` : 'N/A'}. 
              Calculated only on actual output &gt; 10 MW to eliminate division-by-low-number distortions.
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200 text-slate-400 text-[10px]">
            Strictly identical matched interval pairs are used across all metrics.
          </div>
        </div>

      </div>

    </div>
  );
};
