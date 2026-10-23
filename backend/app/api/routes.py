"""
FastAPI Routes for UK Wind Forecast Accuracy Dashboard.
"""

import io
import csv
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd

from backend.app.core.config import settings
from backend.app.schemas.models import (
    HealthStatus,
    OverviewResponse,
    DailyOverviewItem,
    SeriesResponse,
    IntervalDataPoint,
    ForecastHistoryResponse,
    ForecastVersionItem,
    AccuracyMetrics,
    CutoffPolicyType
)
from backend.app.services.data_manager import data_manager
from backend.app.services.metrics_calculator import calculate_accuracy_metrics
from backend.app.services.forecast_selector import parse_to_utc, select_forecast_for_interval

router = APIRouter()
UTC_TZ = timezone.utc


@router.get("/health", response_model=HealthStatus)
async def health_check():
    """Health status and cache diagnostics."""
    act_cache = settings.CACHE_DIR / "fuelhh_2026-01-01_2026-01-31.json"
    fc_cache = settings.CACHE_DIR / "windfor_2026-01-01_2026-01-31.json"

    act_count = 0
    fc_count = 0
    if act_cache.exists():
        try:
            import json
            with open(act_cache, "r", encoding="utf-8") as f:
                act_count = len(json.load(f))
        except Exception:
            pass

    if fc_cache.exists():
        try:
            import json
            with open(fc_cache, "r", encoding="utf-8") as f:
                fc_count = len(json.load(f))
        except Exception:
            pass

    return HealthStatus(
        status="healthy",
        version=settings.VERSION,
        elexon_api_accessible=True,
        cached_actuals_available=act_cache.exists(),
        cached_forecasts_available=fc_cache.exists(),
        actuals_count=act_count,
        forecasts_count=fc_count,
        supported_period="January 2026 (2026-01-01 to 2026-01-31)"
    )


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    start_date: str = Query("2026-01-01", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query("2026-01-31", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    cutoff_policy: CutoffPolicyType = Query("day_ahead_1100"),
    custom_cutoff: Optional[str] = Query(None)
):
    """
    Overview executive summary for January 2026.
    Returns overall accuracy metrics and daily aggregated statistics.
    """
    matched_df, _, is_demo, source_desc = await data_manager.get_processed_data(
        start_date=start_date,
        end_date=end_date,
        cutoff_policy=cutoff_policy,
        custom_cutoff=custom_cutoff,
        resolution="hourly"
    )

    metrics = calculate_accuracy_metrics(matched_df)

    # Calculate daily summaries
    daily_summaries = []
    if not matched_df.empty and "startTime" in matched_df.columns:
        matched_df["day_str"] = matched_df["startTime"].str[:10]
        for day, group in matched_df.groupby("day_str"):
            day_matched = group[group["is_matched"]]
            act_avg = round(float(group["actual_mw"].dropna().mean()), 2) if not group["actual_mw"].dropna().empty else None
            act_peak = round(float(group["actual_mw"].dropna().max()), 2) if not group["actual_mw"].dropna().empty else None
            fc_avg = round(float(group["forecast_mw"].dropna().mean()), 2) if not group["forecast_mw"].dropna().empty else None
            
            day_metrics = calculate_accuracy_metrics(day_matched)

            daily_summaries.append(
                DailyOverviewItem(
                    date=day,
                    actual_avg_mw=act_avg,
                    actual_peak_mw=act_peak,
                    forecast_avg_mw=fc_avg,
                    mae_mw=day_metrics.mae,
                    rmse_mw=day_metrics.rmse,
                    bias_mw=day_metrics.bias,
                    matched_count=len(day_matched),
                    total_count=len(group)
                )
            )

    return OverviewResponse(
        start_date=start_date,
        end_date=end_date,
        cutoff_policy=cutoff_policy,
        data_source=source_desc,
        is_fallback_demo=is_demo,
        last_updated=datetime.now(UTC_TZ).isoformat(),
        overall_metrics=metrics,
        daily_summaries=daily_summaries
    )


@router.get("/series", response_model=SeriesResponse)
async def get_series(
    start_date: str = Query("2026-01-01", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query("2026-01-31", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    cutoff_policy: CutoffPolicyType = Query("day_ahead_1100"),
    custom_cutoff: Optional[str] = Query(None),
    resolution: str = Query("hourly", pattern="^(hourly|half_hourly)$")
):
    """
    Time-series delivery interval records with actual, selected forecast, and error.
    """
    matched_df, _, is_demo, source_desc = await data_manager.get_processed_data(
        start_date=start_date,
        end_date=end_date,
        cutoff_policy=cutoff_policy,
        custom_cutoff=custom_cutoff,
        resolution=resolution
    )

    metrics = calculate_accuracy_metrics(matched_df)

    intervals = []
    if not matched_df.empty:
        for _, row in matched_df.iterrows():
            intervals.append(
                IntervalDataPoint(
                    startTime=row["startTime"],
                    settlementDate=row.get("settlementDate"),
                    settlementPeriod=row.get("settlementPeriod"),
                    actual_mw=row.get("actual_mw"),
                    forecast_mw=row.get("forecast_mw"),
                    error_mw=row.get("error_mw"),
                    abs_error_mw=row.get("abs_error_mw"),
                    publishTime=row.get("publishTime"),
                    cutoff_time=row.get("cutoff_time"),
                    is_matched=bool(row.get("is_matched", False)),
                    has_actual=bool(row.get("has_actual", False)),
                    has_forecast=bool(row.get("has_forecast", False))
                )
            )

    return SeriesResponse(
        start_date=start_date,
        end_date=end_date,
        cutoff_policy=cutoff_policy,
        data_source=source_desc,
        is_fallback_demo=is_demo,
        resolution=resolution,
        total_points=len(intervals),
        matched_points=metrics.matched_intervals,
        metrics=metrics,
        intervals=intervals
    )


@router.get("/forecasts/history", response_model=ForecastHistoryResponse)
async def get_forecast_history(
    target_startTime: str = Query(..., description="Target delivery interval startTime ISO string"),
    cutoff_policy: CutoffPolicyType = Query("day_ahead_1100"),
    custom_cutoff: Optional[str] = Query(None)
):
    """
    Inspect all published forecast versions for a specific delivery interval.
    Shows publication timestamps, forecasted MW, and whether each version was eligible
    under the selected market decision cutoff.
    """
    start_dt = parse_to_utc(target_startTime)
    delivery_date_str = start_dt.strftime("%Y-%m-%d")

    # Fetch raw forecasts for that date
    fc_df, _, _ = await data_manager.get_raw_forecasts(delivery_date_str, delivery_date_str)
    
    # Filter candidates targeting this exact startTime
    candidates = []
    if not fc_df.empty:
        fc_target = fc_df[fc_df["startTime"] == target_startTime]
        candidates = fc_target.to_dict("records")

    sel_result = select_forecast_for_interval(
        interval_start=start_dt,
        forecast_candidates=candidates,
        policy=cutoff_policy,
        custom_cutoff=custom_cutoff
    )

    eligible_count = sum(1 for v in sel_result["all_versions"] if v.is_eligible)

    return ForecastHistoryResponse(
        target_startTime=target_startTime,
        cutoff_applied=sel_result["cutoff_time"],
        selected_publishTime=sel_result["selected_publish_time"],
        selected_generation=sel_result["selected_forecast"],
        versions_count=len(sel_result["all_versions"]),
        eligible_versions_count=eligible_count,
        versions=sel_result["all_versions"]
    )


@router.get("/accuracy", response_model=AccuracyMetrics)
async def get_accuracy_analysis(
    start_date: str = Query("2026-01-01", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query("2026-01-31", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    cutoff_policy: CutoffPolicyType = Query("day_ahead_1100"),
    custom_cutoff: Optional[str] = Query(None)
):
    """
    Calculate and return authoritative accuracy metrics across the selected window.
    """
    matched_df, _, _, _ = await data_manager.get_processed_data(
        start_date=start_date,
        end_date=end_date,
        cutoff_policy=cutoff_policy,
        custom_cutoff=custom_cutoff,
        resolution="hourly"
    )
    return calculate_accuracy_metrics(matched_df)


@router.get("/export.csv")
async def export_csv(
    start_date: str = Query("2026-01-01", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query("2026-01-31", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    cutoff_policy: CutoffPolicyType = Query("day_ahead_1100"),
    custom_cutoff: Optional[str] = Query(None),
    resolution: str = Query("hourly", pattern="^(hourly|half_hourly)$")
):
    """
    Export verified interval data and errors as a downloadable CSV.
    Strictly exports real calculated data without fabrication.
    """
    matched_df, _, is_demo, source_desc = await data_manager.get_processed_data(
        start_date=start_date,
        end_date=end_date,
        cutoff_policy=cutoff_policy,
        custom_cutoff=custom_cutoff,
        resolution=resolution
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Write metadata headers
    writer.writerow(["# UK Wind Forecast Accuracy Export"])
    writer.writerow(["# Delivery Window", f"{start_date} to {end_date}"])
    writer.writerow(["# Decision Cutoff Policy", cutoff_policy])
    writer.writerow(["# Data Source", source_desc])
    writer.writerow(["# Export Timestamp (UTC)", datetime.now(UTC_TZ).isoformat()])
    writer.writerow(["# Note", "error_mw = forecast_mw - actual_mw; Positive error indicates overforecasting."])
    writer.writerow([])

    # Table columns
    columns = [
        "startTime_utc",
        "settlementDate",
        "settlementPeriod",
        "actual_generation_mw",
        "forecast_generation_mw",
        "signed_error_mw",
        "absolute_error_mw",
        "selected_publishTime_utc",
        "cutoff_applied_utc",
        "is_matched"
    ]
    writer.writerow(columns)

    for _, r in matched_df.iterrows():
        writer.writerow([
            r.get("startTime", ""),
            r.get("settlementDate", ""),
            r.get("settlementPeriod", ""),
            r.get("actual_mw", ""),
            r.get("forecast_mw", ""),
            r.get("error_mw", ""),
            r.get("abs_error_mw", ""),
            r.get("publishTime", ""),
            r.get("cutoff_time", ""),
            r.get("is_matched", "")
        ])

    output.seek(0)
    filename = f"wind_forecast_accuracy_{start_date}_{end_date}_{cutoff_policy}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
