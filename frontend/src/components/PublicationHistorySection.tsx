import React, { useState, useEffect } from 'react';
import type { ForecastHistoryResponse, CutoffPolicyType, ForecastVersionItem, IntervalDataPoint } from '../types';
import { fetchForecastHistory } from '../services/api';
import { History, AlertCircle } from 'lucide-react';

interface PublicationHistorySectionProps {
  intervals: IntervalDataPoint[];
  selectedStartTime: string | null;
  onSelectStartTime: (startTime: string) => void;
  cutoffPolicy: CutoffPolicyType;
}

export const PublicationHistorySection: React.FC<PublicationHistorySectionProps> = ({
  intervals,
  selectedStartTime,
  onSelectStartTime,
  cutoffPolicy
}) => {
  const [historyData, setHistoryData] = useState<ForecastHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to first interval if none selected
  const activeStartTime = selectedStartTime || (intervals.length > 0 ? intervals[0].startTime : null);

  useEffect(() => {
    if (!activeStartTime) return;
    setLoading(true);
    setError(null);

    fetchForecastHistory(activeStartTime, cutoffPolicy)
      .then((res) => {
        setHistoryData(res);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load publication history');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeStartTime, cutoffPolicy]);

  const activeDate = activeStartTime ? new Date(activeStartTime) : null;
  const formattedDelivery = activeDate ? activeDate.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }) + ' UTC' : '';

  return (
    <div id="history" className="bg-white border border-slate-200 rounded p-4 shadow-none space-y-3">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <span>Forecast Publication Version History</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect all historical runs issued by National Grid ESO targeting a single delivery interval to verify pre-cutoff eligibility.
          </p>
        </div>

        {/* Interval Selector */}
        <div className="flex items-center gap-2 text-xs">
          <label className="text-slate-500 font-medium whitespace-nowrap">Target Interval:</label>
          <select
            value={activeStartTime || ''}
            onChange={(e) => onSelectStartTime(e.target.value)}
            className="border border-slate-300 rounded px-2.5 py-1 text-slate-800 bg-white font-medium focus:outline-none max-w-[240px] truncate"
          >
            {intervals.slice(0, 100).map((item) => {
              const d = new Date(item.startTime);
              const lbl = d.toLocaleString('en-GB', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC'
              }) + ' UTC' + (item.actual_mw ? ` (${item.actual_mw.toLocaleString()} MW)` : '');
              return (
                <option key={item.startTime} value={item.startTime}>
                  {lbl}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Meta Bar */}
      {historyData && (
        <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Delivery: {formattedDelivery}</span>
            <span className="text-slate-300">|</span>
            <span>
              Decision Cutoff Applied: <strong className="font-mono text-slate-800">{new Date(historyData.cutoff_applied).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span>Total Runs: <strong className="text-slate-900">{historyData.versions_count}</strong></span>
            <span>Eligible Runs: <strong className="text-emerald-700">{historyData.eligible_versions_count}</strong></span>
            <span>Disqualified (&gt; Cutoff): <strong className="text-rose-700">{historyData.versions_count - historyData.eligible_versions_count}</strong></span>
          </div>
        </div>
      )}

      {/* History Table */}
      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          Loading publication run timeline...
        </div>
      ) : error ? (
        <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : historyData && historyData.versions.length > 0 ? (
        <div className="border border-slate-200 rounded overflow-x-auto max-h-[260px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3">Run Publication Time (UTC)</th>
                <th className="py-2 px-3">Lead Time</th>
                <th className="py-2 px-3 text-right">Forecast Output</th>
                <th className="py-2 px-3">Cutoff Eligibility</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {historyData.versions.map((ver: ForecastVersionItem, idx: number) => {
                const pubDt = new Date(ver.publishTime);
                const pubStr = pubDt.toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC'
                });

                return (
                  <tr
                    key={ver.publishTime + idx}
                    className={`transition ${
                      ver.is_selected
                        ? 'bg-blue-50/80 font-semibold text-slate-900'
                        : ver.is_eligible
                        ? 'hover:bg-slate-50 text-slate-700'
                        : 'hover:bg-slate-50 text-slate-400 bg-slate-50/50'
                    }`}
                  >
                    <td className="py-2 px-3 flex items-center gap-2">
                      {ver.is_selected && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      )}
                      <span>{pubStr}</span>
                    </td>

                    <td className="py-2 px-3 font-sans text-slate-600">
                      {ver.lead_time_hours != null ? `${ver.lead_time_hours}h ahead` : '—'}
                    </td>

                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {ver.generation.toLocaleString()} MW
                    </td>

                    <td className="py-2 px-3 font-sans">
                      {ver.is_eligible ? (
                        <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          Eligible (≤ Cutoff)
                        </span>
                      ) : (
                        <span className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                          Ineligible (&gt; Cutoff)
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-3 font-sans text-[11px]">
                      {ver.is_selected ? (
                        <span className="text-blue-800 font-semibold bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded">
                          Selected Day-Ahead Run
                        </span>
                      ) : ver.is_eligible ? (
                        <span className="text-slate-500">Superseded</span>
                      ) : (
                        <span className="text-slate-400">Post-Cutoff Disqualified</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-6 text-center text-slate-500 text-xs">
          No published versions found for this interval.
        </div>
      )}

      <div className="text-[11px] text-slate-500 pt-1">
        <strong>Anti-Leakage Policy:</strong> Only runs published at or before the market decision cutoff are eligible for backtesting day-ahead decisions.
      </div>

    </div>
  );
};
