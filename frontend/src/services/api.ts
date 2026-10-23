import type { 
  OverviewResponse, 
  SeriesResponse, 
  ForecastHistoryResponse, 
  HealthStatus, 
  CutoffPolicyType 
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchOverview(
  startDate: string = '2026-01-01',
  endDate: string = '2026-01-31',
  cutoffPolicy: CutoffPolicyType = 'day_ahead_1100',
  customCutoff?: string
): Promise<OverviewResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_policy: cutoffPolicy
  });
  if (customCutoff) params.append('custom_cutoff', customCutoff);

  const res = await fetch(`${BASE_URL}/overview?${params.toString()}`);
  if (!res.ok) throw new Error(`Overview fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSeries(
  startDate: string = '2026-01-01',
  endDate: string = '2026-01-31',
  cutoffPolicy: CutoffPolicyType = 'day_ahead_1100',
  customCutoff?: string,
  resolution: string = 'hourly'
): Promise<SeriesResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_policy: cutoffPolicy,
    resolution: resolution
  });
  if (customCutoff) params.append('custom_cutoff', customCutoff);

  const res = await fetch(`${BASE_URL}/series?${params.toString()}`);
  if (!res.ok) throw new Error(`Series fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchForecastHistory(
  targetStartTime: string,
  cutoffPolicy: CutoffPolicyType = 'day_ahead_1100',
  customCutoff?: string
): Promise<ForecastHistoryResponse> {
  const params = new URLSearchParams({
    target_startTime: targetStartTime,
    cutoff_policy: cutoffPolicy
  });
  if (customCutoff) params.append('custom_cutoff', customCutoff);

  const res = await fetch(`${BASE_URL}/forecasts/history?${params.toString()}`);
  if (!res.ok) throw new Error(`Forecast history fetch failed: ${res.statusText}`);
  return res.json();
}

export function getExportUrl(
  startDate: string,
  endDate: string,
  cutoffPolicy: CutoffPolicyType,
  customCutoff?: string,
  resolution: string = 'hourly'
): string {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_policy: cutoffPolicy,
    resolution: resolution
  });
  if (customCutoff) params.append('custom_cutoff', customCutoff);
  return `${BASE_URL}/export.csv?${params.toString()}`;
}
