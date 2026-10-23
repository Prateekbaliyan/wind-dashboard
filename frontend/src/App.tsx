import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { ForecastChart } from './components/ForecastChart';
import { AccuracySummary } from './components/AccuracySummary';
import { PublicationHistorySection } from './components/PublicationHistorySection';
import { DataTable } from './components/DataTable';
import { PublicationHistoryModal } from './components/PublicationHistoryModal';
import type { 
  OverviewResponse, 
  SeriesResponse, 
  CutoffPolicyType 
} from './types';
import { fetchOverview, fetchSeries, getExportUrl } from './services/api';
import { AlertCircle, ExternalLink } from 'lucide-react';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-31');
  const [cutoffPolicy, setCutoffPolicy] = useState<CutoffPolicyType>('day_ahead_1100');
  const [resolution, setResolution] = useState('hourly');
  const [selectedInterval, setSelectedInterval] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      if (serRes.intervals.length > 0 && !selectedInterval) {
        setSelectedInterval(serRes.intervals[0].startTime);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load forecast data from server.');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, cutoffPolicy, resolution, selectedInterval]);

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

  const handleInspectInterval = (startTime: string) => {
    setSelectedInterval(startTime);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      
      {/* 1. Narrow Left Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        isDemo={overview?.is_fallback_demo ?? false}
        dataSource={overview?.data_source ?? 'Connecting...'}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        
        {/* 2. Compact Top Header */}
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

        {/* Dashboard Grid Container */}
        <main className="flex-1 p-5 space-y-4 max-w-[1600px] w-full mx-auto">
          
          {/* Error Notification Banner */}
          {error && (
            <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadData}
                className="px-2.5 py-1 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 rounded text-xs font-medium transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Fallback Demo Mode Banner (only if fallback demo triggered) */}
          {overview?.is_fallback_demo && (
            <div className="p-2.5 rounded border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-center justify-between">
              <span>
                <strong>Demo Mode Active:</strong> Live Elexon API temporarily unreachable. Displaying deterministic fallback sample dataset.
              </span>
            </div>
          )}

          {/* Section 1: Row of 4 Simple KPI Cards */}
          <section id="overview" className="scroll-mt-16">
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
          </section>

          {/* Section 2: Large Actual vs Forecast Line Chart */}
          <section id="chart" className="scroll-mt-16">
            {series?.intervals && (
              <ForecastChart
                data={series.intervals}
                onSelectInterval={(startTime) => setSelectedInterval(startTime)}
              />
            )}
          </section>

          {/* Section 3: Small Forecast Accuracy Section */}
          <section id="accuracy" className="scroll-mt-16">
            {series?.metrics && (
              <AccuracySummary metrics={series.metrics} />
            )}
          </section>

          {/* Section 4: Straightforward Forecast Publication History Table */}
          <section id="history" className="scroll-mt-16">
            {series?.intervals && (
              <PublicationHistorySection
                intervals={series.intervals}
                selectedStartTime={selectedInterval}
                onSelectStartTime={(st) => setSelectedInterval(st)}
                cutoffPolicy={cutoffPolicy}
              />
            )}
          </section>

          {/* Section 5: Interval Data Explorer Table */}
          <section id="data" className="scroll-mt-16">
            {series?.intervals && (
              <DataTable
                data={series.intervals}
                onInspectInterval={handleInspectInterval}
                onExport={handleExport}
              />
            )}
          </section>

        </main>

        {/* Modal Inspector for Individual Interval History */}
        {isModalOpen && (
          <PublicationHistoryModal
            targetStartTime={selectedInterval}
            cutoffPolicy={cutoffPolicy}
            onClose={() => setIsModalOpen(false)}
          />
        )}

        {/* Compact Enterprise Footer */}
        <footer className="bg-white border-t border-slate-200 text-xs text-slate-500 py-4 px-6 mt-6">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span>UK Wind Forecast Accuracy & Day-Ahead Procurement Desk • Delivery Horizon: January 2026</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official Elexon BMRS Datasets: FUELHH (WIND actuals) & WINDFOR (Wind forecasts).
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <a
                href="https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
                target="_blank"
                rel="noreferrer"
                className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition"
              >
                <span>FUELHH Stream</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"
                target="_blank"
                rel="noreferrer"
                className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition"
              >
                <span>WINDFOR Stream</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
};

export default App;
