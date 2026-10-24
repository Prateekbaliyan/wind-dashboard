import type { 
  OverviewResponse, 
  SeriesResponse, 
  ForecastHistoryResponse, 
  HealthStatus, 
  CutoffPolicyType 
} from '../types';

const DEFAULT_REMOTE_BACKEND = 'https://wind-dashboard-backend.onrender.com/api';

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    // Strip trailing slash if present
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return '/api';
    }
    return DEFAULT_REMOTE_BACKEND;
  }
  return '/api';
};

const BASE_URL = getBaseUrl();

async function handleResponse<T>(res: Response, endpoint: string): Promise<T> {
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // not JSON
    }
    throw new Error(`${endpoint} failed (${res.status}): ${errorDetail}`);
  }

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${endpoint} returned non-JSON data: ${text.slice(0, 100)}...`);
  }
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE_URL}/health`);
  return handleResponse<HealthStatus>(res, 'Health check');
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
  return handleResponse<OverviewResponse>(res, 'Overview fetch');
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
  return handleResponse<SeriesResponse>(res, 'Series fetch');
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
  return handleResponse<ForecastHistoryResponse>(res, 'Forecast history fetch');
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
