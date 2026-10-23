import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import type { ForecastHistoryResponse, CutoffPolicyType, ForecastVersionItem } from '../types';
import { fetchForecastHistory } from '../services/api';

interface PublicationHistoryModalProps {
  targetStartTime: string | null;
  cutoffPolicy: CutoffPolicyType;
  customCutoff?: string;
  onClose: () => void;
}

export const PublicationHistoryModal: React.FC<PublicationHistoryModalProps> = ({
  targetStartTime,
  cutoffPolicy,
  customCutoff,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ForecastHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetStartTime) return;
    setLoading(true);
    setError(null);

    fetchForecastHistory(targetStartTime, cutoffPolicy, customCutoff)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch publication history');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [targetStartTime, cutoffPolicy, customCutoff]);

  if (!targetStartTime) return null;

  const dt = new Date(targetStartTime);
  const formattedDelivery = dt.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-300 rounded shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-700" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Forecast Publication Run History — {formattedDelivery} UTC
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cutoff & Eligibility Bar */}
        {data && (
          <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Applied Cutoff:</span>
              <strong className="text-slate-900 font-mono">
                {new Date(data.cutoff_applied).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
              </strong>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span>Runs: <strong className="text-slate-900">{data.versions_count}</strong></span>
              <span>Eligible: <strong className="text-emerald-700">{data.eligible_versions_count}</strong></span>
              <span>Disqualified: <strong className="text-rose-700">{data.versions_count - data.eligible_versions_count}</strong></span>
            </div>
          </div>
        )}

        {/* Modal Body / Table */}
        <div className="p-5 overflow-y-auto flex-1">
          {loading && (
            <div className="py-12 text-center text-slate-500 text-xs">
              Loading publication timeline...
            </div>
          )}

          {error && (
            <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && data && data.versions.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              No forecast versions recorded for this interval.
            </div>
          )}

          {!loading && data && data.versions.length > 0 && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Run Publication Time (UTC)</th>
                      <th className="py-2 px-3">Lead Time</th>
                      <th className="py-2 px-3 text-right">Forecast Output</th>
                      <th className="py-2 px-3">Cutoff Eligibility</th>
                      <th className="py-2 px-3">Desk Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {data.versions.map((ver: ForecastVersionItem, idx: number) => {
                      const pubDt = new Date(ver.publishTime);
                      const pubStr = pubDt.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
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
                          <td className="py-2 px-3 flex items-center gap-1.5">
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

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <strong>Anti-Leakage Market Rule:</strong> Day-ahead wholesale auctions clear strictly on pre-cutoff information. Selecting a forecast published after the cutoff introduces look-ahead bias and misrepresents commercial procurement risk.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
