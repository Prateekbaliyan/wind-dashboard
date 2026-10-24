import type { 
  OverviewResponse, 
  SeriesResponse, 
  ForecastHistoryResponse, 
  HealthStatus, 
  CutoffPolicyType 
} from '../types';

const DEFAULT_REMOTE_BACKEND = 'https://wind-dashboard-backend.onrender.com/api';

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    // If user provided origin without /api (e.g. https://wind-dashboard-backend.onrender.com)
    if ((clean.startsWith('http://') || clean.startsWith('https://')) && !clean.endsWith('/api')) {
      clean = `${clean}/api`;
    }
    return clean;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // In local dev, use Vite proxy /api
    if (host === 'localhost' || host === '127.0.0.1') {
      return '/api';
    }
    // When running on Vercel or any public domain, default directly to live Render backend
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
