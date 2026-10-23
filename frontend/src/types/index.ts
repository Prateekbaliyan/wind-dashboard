export type CutoffPolicyType = 
  | 'day_ahead_1100'
  | 'day_ahead_1200'
  | 'day_ahead_1700'
  | 'intraday_h4'
  | 'intraday_h1'
  | 'custom';

export interface IntervalDataPoint {
  startTime: string;
  settlementDate?: string;
  settlementPeriod?: number;
  actual_mw?: number | null;
  forecast_mw?: number | null;
  error_mw?: number | null;
  abs_error_mw?: number | null;
  publishTime?: string | null;
  cutoff_time?: string | null;
  is_matched: boolean;
  has_actual: boolean;
  has_forecast: boolean;
}

export interface MetricInterpretations {
  bias_summary: string;
  mae_summary: string;
  rmse_summary: string;
  procurement_impact: string;
}

export interface AccuracyMetrics {
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  mape: number | null;
  matched_intervals: number;
  total_expected_intervals: number;
  missing_actual_count: number;
  missing_forecast_count: number;
  coverage_pct: number;
  interpretations: MetricInterpretations;
}

export interface DailyOverviewItem {
  date: string;
  actual_avg_mw?: number | null;
  actual_peak_mw?: number | null;
  forecast_avg_mw?: number | null;
  mae_mw?: number | null;
  rmse_mw?: number | null;
  bias_mw?: number | null;
  matched_count: number;
  total_count: number;
}

export interface OverviewResponse {
  start_date: string;
  end_date: string;
  cutoff_policy: CutoffPolicyType;
  data_source: string;
  is_fallback_demo: boolean;
  last_updated: string;
  overall_metrics: AccuracyMetrics;
  daily_summaries: DailyOverviewItem[];
}

export interface SeriesResponse {
  start_date: string;
  end_date: string;
  cutoff_policy: CutoffPolicyType;
  data_source: string;
  is_fallback_demo: boolean;
  resolution: string;
  total_points: number;
  matched_points: number;
  metrics: AccuracyMetrics;
  intervals: IntervalDataPoint[];
}

export interface ForecastVersionItem {
  publishTime: string;
  startTime: string;
  generation: number;
  is_eligible: boolean;
  is_selected: boolean;
  cutoff_applied: string;
  lead_time_hours?: number | null;
}

export interface ForecastHistoryResponse {
  target_startTime: string;
  cutoff_applied: string;
  selected_publishTime?: string | null;
  selected_generation?: number | null;
  versions_count: number;
  eligible_versions_count: number;
  versions: ForecastVersionItem[];
}

export interface HealthStatus {
  status: string;
  version: string;
  elexon_api_accessible: boolean;
  cached_actuals_available: boolean;
  cached_forecasts_available: boolean;
  actuals_count: number;
  forecasts_count: number;
  supported_period: string;
}
