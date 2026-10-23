import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { ForecastChart } from './components/ForecastChart';
import { AccuracySummary } from './components/AccuracySummary';
import { DataTable } from './components/DataTable';
import { PublicationHistoryModal } from './components/PublicationHistoryModal';
import type { 
  OverviewResponse, 
  SeriesResponse, 
  CutoffPolicyType 
} from './types';
import { fetchOverview, fetchSeries, getExportUrl } from './services/api';
import { AlertCircle, ExternalLink, Info } from 'lucide-react';

export const App: React.FC = () => {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-31');
  const [cutoffPolicy, setCutoffPolicy] = useState<CutoffPolicyType>('day_ahead_1100');
  const [resolution, setResolution] = useState('hourly');
  const [selectedInterval, setSelectedInterval] = useState<string | null>(null);

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovRes, serRes] = await Promise.all([
        fetchOverview(startDate, endDate, cutoffPolicy),
        fetchSeries(startDate, endDate, cutoffPolicy, undefined, resolution)
      ]);
      setOverview(ovRes);
      setSeries(serRes);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load forecast data from server.');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, cutoffPolicy, resolution]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleExport = () => {
    const url = getExportUrl(startDate, endDate, cutoffPolicy, undefined, resolution);
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navigation & Controls */}
      <Header
        startDate={startDate}
        endDate={endDate}
        onDateChange={handleDateChange}
        cutoffPolicy={cutoffPolicy}
        onCutoffChange={setCutoffPolicy}
        resolution={resolution}
        onResolutionChange={setResolution}
        isDemo={overview?.is_fallback_demo ?? false}
        dataSource={overview?.data_source ?? 'Connecting...'}
        onRefresh={loadData}
        onExport={handleExport}
        isLoading={isLoading}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 text-white rounded-lg text-xs font-medium transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Fallback Demo Mode Disclosure Banner (only if fallback demo triggered) */}
        {overview?.is_fallback_demo && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                <strong>Fallback Demo Mode Active:</strong> Live Elexon API was temporarily unavailable. Showing genuine deterministic sample dataset. Not connected to live streams.
              </span>
            </div>
          </div>
        )}

        {/* 1. Executive KPI Summary Cards */}
        {series?.metrics ? (
          <KpiCards
            metrics={series.metrics}
            avgActualMw={
              series.intervals.filter((i) => i.actual_mw != null).length
                ? Math.round(
                    series.intervals.reduce((acc, i) => acc + (i.actual_mw || 0), 0) /
                      series.intervals.filter((i) => i.actual_mw != null).length
                  )
                : null
            }
            peakActualMw={
              series.intervals.filter((i) => i.actual_mw != null).length
                ? Math.round(Math.max(...series.intervals.map((i) => i.actual_mw || 0)))
                : null
            }
            avgForecastMw={
              series.intervals.filter((i) => i.forecast_mw != null).length
                ? Math.round(
                    series.intervals.reduce((acc, i) => acc + (i.forecast_mw || 0), 0) /
                      series.intervals.filter((i) => i.forecast_mw != null).length
                  )
                : null
            }
            cutoffPolicy={cutoffPolicy}
          />
        ) : null}

        {/* 2. Interactive Time-Series Chart */}
        {series?.intervals && (
          <ForecastChart
            data={series.intervals}
            onSelectInterval={(startTime) => setSelectedInterval(startTime)}
          />
        )}

        {/* 3. Accuracy Analysis & Market Interpretations */}
        {series?.metrics && (
          <AccuracySummary metrics={series.metrics} />
        )}

        {/* 4. Underlying Interval Data Explorer */}
        {series?.intervals && (
          <DataTable
            data={series.intervals}
            onInspectInterval={(startTime) => setSelectedInterval(startTime)}
            onExport={handleExport}
          />
        )}

      </main>

      {/* Forecast Publication Version Inspector Modal */}
      <PublicationHistoryModal
        targetStartTime={selectedInterval}
        cutoffPolicy={cutoffPolicy}
        onClose={() => setSelectedInterval(null)}
      />

      {/* Enterprise Analytics Footer */}
      <footer className="bg-navy-900 border-t border-navy-800 text-xs text-slate-400 py-6 px-4 lg:px-8 mt-12">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-slate-300 font-medium">
              <span>UK Wind Forecast Accuracy & Day-Ahead Procurement Desk</span>
              <span>•</span>
              <span>Target Horizon: January 2026</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Data verified against official Elexon BMRS datasets: FUELHH (Actual Generation by Fuel Type) and WINDFOR (Wind Generation Forecast).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <a
              href="https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
              target="_blank"
              rel="noreferrer"
              className="hover:text-wind-cyan flex items-center gap-1 transition"
            >
              <span>FUELHH Stream</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"
              target="_blank"
              rel="noreferrer"
              className="hover:text-wind-cyan flex items-center gap-1 transition"
            >
              <span>WINDFOR Stream</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="flex items-center gap-1 text-slate-500">
              <Info className="w-3.5 h-3.5" />
              <span>Electricity prices, consumer demand, and thermal fleets excluded from scope.</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
