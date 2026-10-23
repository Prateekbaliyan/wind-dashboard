import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles,
  AlertTriangle
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-navy-800 flex items-center justify-between bg-navy-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-wind-cyan/20 border border-wind-cyan/30 flex items-center justify-center text-wind-cyan">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Forecast Publication Run History</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  {formattedDelivery} UTC
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect all historical forecast runs published by NESO targeting this specific delivery interval.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cutoff & Decision Rule Banner */}
        {data && (
          <div className="px-6 py-3 bg-navy-850/80 border-b border-navy-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-wind-cyan" />
              <span>Applied Cutoff:</span>
              <strong className="text-white font-mono">
                {new Date(data.cutoff_applied).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
              </strong>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <span>Total Published Runs: <strong className="text-white">{data.versions_count}</strong></span>
              <span>Eligible Pre-Cutoff: <strong className="text-wind-emerald">{data.eligible_versions_count}</strong></span>
              <span>Ineligible Post-Cutoff: <strong className="text-rose-400">{data.versions_count - data.eligible_versions_count}</strong></span>
            </div>
          </div>
        )}

        {/* Modal Body / Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 border-2 border-wind-cyan border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Fetching publication timeline from Elexon BMRS...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {!loading && data && data.versions.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              No forecast versions recorded for this interval.
            </div>
          )}

          {!loading && data && data.versions.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-navy-700/80 overflow-hidden bg-navy-950/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-800/80 text-slate-300 font-semibold border-b border-navy-700/80">
                    <tr>
                      <th className="py-2.5 px-3.5">Publication Time (UTC)</th>
                      <th className="py-2.5 px-3.5">Lead Time</th>
                      <th className="py-2.5 px-3.5">Forecasted Output</th>
                      <th className="py-2.5 px-3.5">Cutoff Eligibility</th>
                      <th className="py-2.5 px-3.5">Desk Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-800/60 font-mono">
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
                              ? 'bg-wind-cyan/15 text-white font-semibold'
                              : ver.is_eligible
                              ? 'hover:bg-navy-800/40 text-slate-200'
                              : 'hover:bg-navy-800/20 text-slate-500 bg-navy-950/40'
                          }`}
                        >
                          <td className="py-2.5 px-3.5 flex items-center gap-2">
                            {ver.is_selected && (
                              <Sparkles className="w-3.5 h-3.5 text-wind-cyan animate-pulse" />
                            )}
                            <span>{pubStr}</span>
                          </td>

                          <td className="py-2.5 px-3.5">
                            {ver.lead_time_hours != null ? `${ver.lead_time_hours}h ahead` : '—'}
                          </td>

                          <td className="py-2.5 px-3.5 font-bold text-white">
                            {ver.generation.toLocaleString()} MW
                          </td>

                          <td className="py-2.5 px-3.5">
                            {ver.is_eligible ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-sans text-wind-emerald bg-wind-emerald/10 border border-wind-emerald/20 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Eligible (≤ Cutoff)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-sans text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> Ineligible (&gt; Cutoff)
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3.5 font-sans">
                            {ver.is_selected ? (
                              <span className="text-wind-cyan font-semibold text-[11px] bg-wind-cyan/20 border border-wind-cyan/40 px-2 py-0.5 rounded">
                                Selected Day-Ahead Run
                              </span>
                            ) : ver.is_eligible ? (
                              <span className="text-slate-400 text-[11px]">Superseded</span>
                            ) : (
                              <span className="text-slate-600 text-[11px]">Look-Ahead Disqualified</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Informative Note */}
              <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 text-[11px] text-slate-400 flex items-start gap-2.5 leading-relaxed">
                <Clock className="w-4 h-4 text-wind-cyan shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">Strict Anti-Leakage Market Rule:</strong> Day-ahead wholesale auctions clear based only on information available prior to auction closure. Selecting a forecast published after the cutoff would introduce look-ahead bias and misrepresent the actual procurement risk.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-navy-800 flex justify-end bg-navy-950/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-medium border border-navy-700 transition"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
