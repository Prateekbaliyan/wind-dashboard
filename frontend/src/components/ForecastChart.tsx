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

interface ForecastChartProps {
  data: IntervalDataPoint[];
  onSelectInterval?: (startTime: string) => void;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ data, onSelectInterval }) => {
  const [showErrorBars, setShowErrorBars] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded p-8 text-center text-slate-500 text-xs">
        No interval data available for the selected range.
      </div>
    );
  }

  // Format data for chart
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
        <div className="bg-white border border-slate-300 rounded p-3 shadow-md text-xs space-y-1.5 min-w-[240px] text-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-medium">
            <span className="text-slate-900 font-semibold">{item.formattedTime} UTC</span>
            {item.settlementPeriod && (
              <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                SP {item.settlementPeriod}
              </span>
            )}
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 font-sans font-medium">Actual Output:</span>
              <span className="font-semibold text-slate-900">
                {item.actual_mw != null ? `${item.actual_mw.toLocaleString()} MW` : 'Missing'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-sans font-medium">Day-Ahead Forecast:</span>
              <span className="font-semibold text-slate-900">
                {item.forecast_mw != null ? `${item.forecast_mw.toLocaleString()} MW` : 'No Eligible Run'}
              </span>
            </div>

            {item.is_matched && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-500 font-sans">Error (F − A):</span>
                <span className={`font-semibold ${isOver ? 'text-amber-700' : 'text-rose-700'}`}>
                  {item.error_mw != null ? `${item.error_mw > 0 ? '+' : ''}${item.error_mw.toLocaleString()} MW` : '—'}
                </span>
              </div>
            )}
          </div>

          {item.publishTime && (
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
              <span>Run Publish Time:</span>
              <span className="font-mono text-slate-700">
                {new Date(item.publishTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC
              </span>
            </div>
          )}

          <div className="pt-0.5 text-[10px] text-slate-400 italic">
            Click interval to inspect all published runs
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded p-4 shadow-none space-y-3">
      
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            National Wind Generation: Actual vs Day-Ahead Forecast
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Half-hourly actuals (FUELHH) compared against selected pre-cutoff hourly forecasts (WINDFOR).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowErrorBars(!showErrorBars)}
            className={`px-2.5 py-1 rounded border text-xs font-medium transition ${
              showErrorBars
                ? 'bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showErrorBars ? 'Hide Signed Error Bars' : 'Show Signed Error Bars'}
          </button>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length && onSelectInterval) {
                const clicked = state.activePayload[0].payload;
                onSelectInterval(clicked.startTime);
              }
            }}
            margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

            <XAxis
              dataKey="formattedTime"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              minTickGap={45}
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
              height={32}
              iconType="plainline"
              wrapperStyle={{ fontSize: '12px', paddingTop: '0px' }}
            />

            <ReferenceLine y={0} stroke="#CBD5E1" />

            {/* Error bars if toggled on */}
            {showErrorBars && (
              <>
                <Bar
                  dataKey="overforecast_mw"
                  name="Overforecast (+MW)"
                  fill="#D97706"
                  opacity={0.3}
                  barSize={5}
                />
                <Bar
                  dataKey="underforecast_mw"
                  name="Underforecast (−MW)"
                  fill="#DC2626"
                  opacity={0.3}
                  barSize={5}
                />
              </>
            )}

            {/* Actual Wind Generation Line */}
            <Line
              type="monotone"
              dataKey="actual_mw"
              name="Actual Wind Output (MW)"
              stroke="#047857"
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 4, fill: '#047857' }}
              connectNulls={false}
            />

            {/* Forecast Wind Generation Line */}
            <Line
              type="monotone"
              dataKey="forecast_mw"
              name="Selected Forecast (MW)"
              stroke="#2563EB"
              strokeWidth={1.8}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 4, fill: '#2563EB' }}
              connectNulls={false}
            />

            <Brush
              dataKey="formattedTime"
              height={22}
              stroke="#CBD5E1"
              fill="#F8FAFC"
              tickFormatter={() => ''}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Note */}
      <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-700 inline-block" /> Actual Generation (MW)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 border-b border-dashed inline-block" /> Day-Ahead Forecast (MW)
          </span>
        </div>
        <span>Data gaps indicate missing intervals without silent interpolation.</span>
      </div>

    </div>
  );
};
