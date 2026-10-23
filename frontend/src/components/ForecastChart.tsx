import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Brush,
  ReferenceLine
} from 'recharts';
import type { IntervalDataPoint } from '../types';
import { Layers, HelpCircle, Eye } from 'lucide-react';

interface ForecastChartProps {
  data: IntervalDataPoint[];
  onSelectInterval?: (startTime: string) => void;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ data, onSelectInterval }) => {
  const [showErrorBars, setShowErrorBars] = useState(true);

  if (!data || data.length === 0) {
    return (
      <div className="bg-navy-900 border border-navy-700 rounded-xl p-8 text-center text-slate-400">
        No interval data available for the selected range.
      </div>
    );
  }

  // Format timestamp for display
  const chartData = data.map((d) => {
    const dt = new Date(d.startTime);
    const dateStr = dt.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const timeStr = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
    return {
      ...d,
      formattedTime: `${dateStr} ${timeStr}`,
      shortTime: timeStr,
      overforecast_mw: (d.error_mw ?? 0) > 0 ? d.error_mw : 0,
      underforecast_mw: (d.error_mw ?? 0) < 0 ? d.error_mw : 0,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: IntervalDataPoint & { formattedTime: string } = payload[0].payload;
      const isOver = (item.error_mw ?? 0) > 0;
      return (
        <div className="bg-navy-950 border border-navy-600 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 min-w-[260px] backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-navy-700/80 pb-2">
            <span className="font-semibold text-white">{item.formattedTime} UTC</span>
            {item.settlementPeriod && (
              <span className="text-[10px] bg-navy-800 text-slate-300 px-1.5 py-0.5 rounded border border-navy-700">
                Period {item.settlementPeriod}
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-wind-emerald">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-wind-emerald" />
                Actual Output:
              </span>
              <span className="font-bold">
                {item.actual_mw != null ? `${item.actual_mw.toLocaleString()} MW` : 'Missing Actual'}
              </span>
            </div>

            <div className="flex items-center justify-between text-wind-cyan">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-wind-cyan" />
                Day-Ahead Forecast:
              </span>
              <span className="font-bold">
                {item.forecast_mw != null ? `${item.forecast_mw.toLocaleString()} MW` : 'No Eligible Forecast'}
              </span>
            </div>

            {item.is_matched && (
              <div className="flex items-center justify-between pt-1 border-t border-navy-800">
                <span className="text-slate-400">Signed Error (F - A):</span>
                <span className={`font-bold ${isOver ? 'text-amber-400' : 'text-rose-400'}`}>
                  {item.error_mw != null ? `${item.error_mw > 0 ? '+' : ''}${item.error_mw.toLocaleString()} MW` : '—'}
                </span>
              </div>
            )}
          </div>

          {item.publishTime && (
            <div className="text-[11px] text-slate-400 pt-1.5 border-t border-navy-800/80 space-y-0.5">
              <div className="flex justify-between">
                <span>Selected Run:</span>
                <span className="text-slate-300 font-mono text-[10px]">
                  {new Date(item.publishTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC
                </span>
              </div>
              <div className="flex justify-between">
                <span>Decision Cutoff:</span>
                <span className="text-slate-300 font-mono text-[10px]">
                  {item.cutoff_time ? new Date(item.cutoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC' : '—'}
                </span>
              </div>
            </div>
          )}

          <div className="pt-1 text-[10px] text-wind-cyan/80 italic flex items-center gap-1">
            <Eye className="w-3 h-3" /> Click interval to inspect version history
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-navy-900 border border-navy-700/80 rounded-xl p-4 lg:p-5 shadow-lg space-y-4">
      
      {/* Chart Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-navy-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>National Wind Generation: Forecast vs Actual</span>
            <span className="text-xs font-normal text-slate-400">
              (Total Delivery Intervals: {data.length})
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare delivered wind output with the latest eligible Day-Ahead forecast publication.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowErrorBars(!showErrorBars)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              showErrorBars
                ? 'bg-navy-800 text-slate-200 border-navy-600'
                : 'bg-navy-950 text-slate-500 border-navy-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-wind-cyan" />
            <span>{showErrorBars ? 'Hide Error Track' : 'Show Error Track'}</span>
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length && onSelectInterval) {
                const clicked = state.activePayload[0].payload;
                onSelectInterval(clicked.startTime);
              }
            }}
            margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4E" opacity={0.6} />

            <XAxis
              dataKey="formattedTime"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              minTickGap={40}
            />

            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              domain={['auto', 'auto']}
              label={{ value: 'Generation (MW)', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }}
            />

            <ReferenceLine y={0} stroke="#334155" />

            {/* Error bars if toggled on */}
            {showErrorBars && (
              <>
                <Bar
                  dataKey="overforecast_mw"
                  name="Overforecast (+MW)"
                  fill="#F59E0B"
                  opacity={0.35}
                  barSize={6}
                />
                <Bar
                  dataKey="underforecast_mw"
                  name="Underforecast (-MW)"
                  fill="#F43F5E"
                  opacity={0.35}
                  barSize={6}
                />
              </>
            )}

            {/* Actual Wind Generation Line */}
            <Line
              type="monotone"
              dataKey="actual_mw"
              name="Actual Wind (FUELHH)"
              stroke="#10B981"
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 5, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls={false}
            />

            {/* Forecast Wind Generation Line */}
            <Line
              type="monotone"
              dataKey="forecast_mw"
              name="Day-Ahead Forecast (WINDFOR)"
              stroke="#38BDF8"
              strokeWidth={2.0}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 5, fill: '#38BDF8', stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls={false}
            />

            <Brush
              dataKey="formattedTime"
              height={26}
              stroke="#1E2D4E"
              fill="#0B101D"
              tickFormatter={() => ''}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 border-t border-navy-800/80 pt-2.5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-wind-emerald inline-block" /> Actual Output (MW)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-wind-cyan border-b border-dashed inline-block" /> Selected Forecast (MW)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-400 inline-block rounded-sm" /> Overforecast
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-rose-400 inline-block rounded-sm" /> Underforecast
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Gaps indicate missing intervals; data is not silently interpolated.</span>
        </div>
      </div>

    </div>
  );
};
