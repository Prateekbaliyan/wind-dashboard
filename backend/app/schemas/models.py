from typing import Optional, Literal
from pydantic import BaseModel, Field

CutoffPolicyType = Literal[
    "day_ahead_1100",  # D-1 at 11:00 UK time (EPEX SPOT / Nord Pool UK Day-Ahead auction close)
    "day_ahead_1200",  # D-1 at 12:00 UK time (Standard noon gate)
    "day_ahead_1700",  # D-1 at 17:00 UK time (Evening bilateral gate)
    "intraday_h4",     # Delivery interval - 4 hours
    "intraday_h1",     # Delivery interval - 1 hour (GB Gate Closure)
    "custom"           # Custom cutoff datetime
]

class CutoffConfig(BaseModel):
    policy: CutoffPolicyType = "day_ahead_1100"
    custom_cutoff: Optional[str] = None  # ISO timestamp if policy == 'custom'

class IntervalDataPoint(BaseModel):
    startTime: str = Field(..., description="Delivery interval start time (ISO 8601 UTC)")
    settlementDate: Optional[str] = Field(None, description="GB Settlement date (YYYY-MM-DD)")
    settlementPeriod: Optional[int] = Field(None, description="GB Settlement period (1-48/50)")
    actual_mw: Optional[float] = Field(None, description="Actual national wind generation (MW)")
    forecast_mw: Optional[float] = Field(None, description="Selected wind forecast generation (MW)")
    error_mw: Optional[float] = Field(None, description="Signed forecast error: forecast - actual (MW)")
    abs_error_mw: Optional[float] = Field(None, description="Absolute forecast error (MW)")
    publishTime: Optional[str] = Field(None, description="Publication time of selected forecast (ISO 8601 UTC)")
    cutoff_time: Optional[str] = Field(None, description="Decision cutoff timestamp applied for this interval")
    is_matched: bool = Field(False, description="True if both actual and forecast exist for this interval")
    has_actual: bool = Field(False, description="True if actual generation exists")
    has_forecast: bool = Field(False, description="True if forecast generation exists")

class MetricInterpretations(BaseModel):
    bias_summary: str
    mae_summary: str
    rmse_summary: str
    procurement_impact: str

class AccuracyMetrics(BaseModel):
    mae: Optional[float] = Field(None, description="Mean Absolute Error in MW")
    rmse: Optional[float] = Field(None, description="Root Mean Squared Error in MW")
    bias: Optional[float] = Field(None, description="Mean Error (forecast - actual) in MW")
    mape: Optional[float] = Field(None, description="Mean Absolute Percentage Error (%) - optional, excludes zero actuals")
    matched_intervals: int = Field(..., description="Number of intervals with both valid actual and forecast")
    total_expected_intervals: int = Field(..., description="Total intervals in the requested date range")
    missing_actual_count: int = Field(..., description="Count of intervals missing actual wind data")
    missing_forecast_count: int = Field(..., description="Count of intervals with no eligible forecast")
    coverage_pct: float = Field(..., description="Percentage of intervals successfully matched")
    interpretations: MetricInterpretations

class ForecastVersionItem(BaseModel):
    publishTime: str
    startTime: str
    generation: float
    is_eligible: bool
    is_selected: bool
    cutoff_applied: str
    lead_time_hours: Optional[float] = None

class ForecastHistoryResponse(BaseModel):
    target_startTime: str
    cutoff_applied: str
    selected_publishTime: Optional[str] = None
    selected_generation: Optional[float] = None
    versions_count: int
    eligible_versions_count: int
    versions: list[ForecastVersionItem]

class DailyOverviewItem(BaseModel):
    date: str
    actual_avg_mw: Optional[float]
    actual_peak_mw: Optional[float]
    forecast_avg_mw: Optional[float]
    mae_mw: Optional[float]
    rmse_mw: Optional[float]
    bias_mw: Optional[float]
    matched_count: int
    total_count: int

class OverviewResponse(BaseModel):
    start_date: str
    end_date: str
    cutoff_policy: CutoffPolicyType
    data_source: str
    is_fallback_demo: bool
    last_updated: str
    overall_metrics: AccuracyMetrics
    daily_summaries: list[DailyOverviewItem]

class SeriesResponse(BaseModel):
    start_date: str
    end_date: str
    cutoff_policy: CutoffPolicyType
    data_source: str
    is_fallback_demo: bool
    resolution: str  # 'hourly' or 'half_hourly'
    total_points: int
    matched_points: int
    metrics: AccuracyMetrics
    intervals: list[IntervalDataPoint]

class HealthStatus(BaseModel):
    status: str
    version: str
    elexon_api_accessible: bool
    cached_actuals_available: bool
    cached_forecasts_available: bool
    actuals_count: int
    forecasts_count: int
    supported_period: str
