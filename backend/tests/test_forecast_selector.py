"""
Unit tests for Forecast Selection Logic.

Covers:
- Multiple forecast versions
- Forecasts published before, at, and after the cutoff
- No eligible forecast
- Missing actual values
- Duplicate records
- Timezone-aware timestamps
- Daylight-saving edge cases
"""

from datetime import datetime, timezone, timedelta
import pandas as pd
import pytest

from backend.app.services.forecast_selector import (
    calculate_decision_cutoff,
    select_forecast_for_interval,
    match_forecasts_with_actuals,
    parse_to_utc,
    LONDON_TZ,
    UTC_TZ
)


def test_parse_to_utc():
    # ISO string with Z
    dt1 = parse_to_utc("2026-01-15T12:00:00Z")
    assert dt1.tzinfo == UTC_TZ
    assert dt1.year == 2026 and dt1.month == 1 and dt1.day == 15 and dt1.hour == 12

    # Naive string treated as UTC
    dt2 = parse_to_utc("2026-01-15 12:00:00")
    assert dt2.tzinfo == UTC_TZ

    # Offset string
    dt3 = parse_to_utc("2026-01-15T13:00:00+01:00")
    assert dt3.tzinfo == UTC_TZ
    assert dt3.hour == 12  # 13:00+01:00 is 12:00 UTC


def test_calculate_decision_cutoff_day_ahead_1100():
    # Delivery on 2026-01-15 at 14:00 UTC
    delivery = datetime(2026, 1, 15, 14, 0, tzinfo=UTC_TZ)
    cutoff = calculate_decision_cutoff(delivery, policy="day_ahead_1100")
    
    # In January (GMT = UTC+0), D-1 is 2026-01-14, 11:00 local is 11:00 UTC
    expected = datetime(2026, 1, 14, 11, 0, tzinfo=UTC_TZ)
    assert cutoff == expected


def test_calculate_decision_cutoff_day_ahead_1200():
    delivery = datetime(2026, 1, 15, 0, 0, tzinfo=UTC_TZ)
    cutoff = calculate_decision_cutoff(delivery, policy="day_ahead_1200")
    expected = datetime(2026, 1, 14, 12, 0, tzinfo=UTC_TZ)
    assert cutoff == expected


def test_calculate_decision_cutoff_intraday():
    delivery = datetime(2026, 1, 15, 14, 0, tzinfo=UTC_TZ)
    
    cutoff_h4 = calculate_decision_cutoff(delivery, policy="intraday_h4")
    assert cutoff_h4 == datetime(2026, 1, 15, 10, 0, tzinfo=UTC_TZ)

    cutoff_h1 = calculate_decision_cutoff(delivery, policy="intraday_h1")
    assert cutoff_h1 == datetime(2026, 1, 15, 13, 0, tzinfo=UTC_TZ)


def test_select_forecast_multiple_versions_and_cutoff():
    """
    Delivery interval: 2026-01-15 12:00:00 UTC
    Cutoff: day_ahead_1100 -> 2026-01-14 11:00:00 UTC
    Candidate forecasts:
    1. 2026-01-13 18:00:00Z -> 12,000 MW (Eligible)
    2. 2026-01-14 09:30:00Z -> 13,500 MW (Eligible - latest before cutoff)
    3. 2026-01-14 11:00:00Z -> 14,000 MW (Eligible - exactly at cutoff)
    4. 2026-01-14 11:30:00Z -> 15,000 MW (Ineligible - after cutoff)
    5. 2026-01-15 06:00:00Z -> 16,000 MW (Ineligible - day of delivery)
    """
    delivery_time = "2026-01-15T12:00:00Z"
    candidates = [
        {"publishTime": "2026-01-13T18:00:00Z", "generation": 12000},
        {"publishTime": "2026-01-14T09:30:00Z", "generation": 13500},
        {"publishTime": "2026-01-14T11:00:00Z", "generation": 14000},
        {"publishTime": "2026-01-14T11:30:00Z", "generation": 15000},
        {"publishTime": "2026-01-15T06:00:00Z", "generation": 16000},
    ]

    result = select_forecast_for_interval(
        interval_start=delivery_time,
        forecast_candidates=candidates,
        policy="day_ahead_1100"
    )

    # Must choose exactly the 11:00 publication (14,000 MW), NEVER 11:30 or later!
    assert result["is_eligible"] is True
    assert result["selected_forecast"] == 14000
    assert result["selected_publish_time"] == "2026-01-14T11:00:00+00:00"

    # Verify all_versions list correctly flags eligibility
    versions = result["all_versions"]
    assert len(versions) == 5
    v_dict = {v.publishTime: v for v in versions}
    assert v_dict["2026-01-14T11:00:00+00:00"].is_eligible is True
    assert v_dict["2026-01-14T11:00:00+00:00"].is_selected is True
    assert v_dict["2026-01-14T11:30:00+00:00"].is_eligible is False
    assert v_dict["2026-01-14T11:30:00+00:00"].is_selected is False
    assert v_dict["2026-01-15T06:00:00+00:00"].is_eligible is False


def test_select_forecast_no_eligible():
    """All forecasts published after cutoff."""
    delivery_time = "2026-01-15T12:00:00Z"
    candidates = [
        {"publishTime": "2026-01-14T15:00:00Z", "generation": 14500},
        {"publishTime": "2026-01-15T02:00:00Z", "generation": 15200},
    ]
    result = select_forecast_for_interval(
        interval_start=delivery_time,
        forecast_candidates=candidates,
        policy="day_ahead_1100"
    )
    assert result["is_eligible"] is False
    assert result["selected_forecast"] is None
    assert result["selected_publish_time"] is None


def test_select_forecast_duplicate_records():
    """Duplicate records with identical publishTime."""
    delivery_time = "2026-01-15T12:00:00Z"
    candidates = [
        {"publishTime": "2026-01-14T09:30:00Z", "generation": 13000},
        {"publishTime": "2026-01-14T09:30:00Z", "generation": 13000},  # exact duplicate
        {"publishTime": "2026-01-14T10:00:00Z", "generation": 13500},
    ]
    result = select_forecast_for_interval(
        interval_start=delivery_time,
        forecast_candidates=candidates,
        policy="day_ahead_1100"
    )
    assert result["is_eligible"] is True
    assert result["selected_forecast"] == 13500
    assert len(result["all_versions"]) == 2  # Deduplicated


def test_match_forecasts_with_missing_actuals():
    """Delivery intervals where actual generation is missing."""
    actuals_df = pd.DataFrame([
        {"startTime": "2026-01-15T10:00:00Z", "generation": 8000, "settlementDate": "2026-01-15", "settlementPeriod": 21},
        # 11:00 interval actual is missing!
        {"startTime": "2026-01-15T12:00:00Z", "generation": 9500, "settlementDate": "2026-01-15", "settlementPeriod": 25},
    ])

    forecasts_df = pd.DataFrame([
        {"startTime": "2026-01-15T10:00:00Z", "publishTime": "2026-01-14T09:00:00Z", "generation": 8200},
        {"startTime": "2026-01-15T11:00:00Z", "publishTime": "2026-01-14T09:00:00Z", "generation": 8900},
        {"startTime": "2026-01-15T12:00:00Z", "publishTime": "2026-01-14T09:00:00Z", "generation": 9300},
    ])

    matched_df, versions = match_forecasts_with_actuals(actuals_df, forecasts_df, policy="day_ahead_1100")
    
    # Check 11:00 row: has forecast but missing actual -> is_matched must be False
    row_11 = matched_df[matched_df["startTime"].str.contains("11:00:00")].iloc[0]
    assert bool(row_11["has_actual"]) is False
    assert bool(row_11["has_forecast"]) is True
    assert bool(row_11["is_matched"]) is False
    assert pd.isna(row_11["error_mw"])

    # Check 10:00 row: both exist -> is_matched True, error = 8200 - 8000 = +200
    row_10 = matched_df[matched_df["startTime"].str.contains("10:00:00")].iloc[0]
    assert bool(row_10["is_matched"]) is True
    assert row_10["error_mw"] == 200.0


def test_daylight_saving_handling():
    """Verify Europe/London BST (British Summer Time) transition handling."""
    # July is BST (UTC+1)
    delivery_bst = datetime(2026, 7, 15, 12, 0, tzinfo=UTC_TZ)
    cutoff_bst = calculate_decision_cutoff(delivery_bst, policy="day_ahead_1100")
    
    # D-1 is 2026-07-14. 11:00 London local time in BST is 10:00 UTC
    assert cutoff_bst == datetime(2026, 7, 14, 10, 0, tzinfo=UTC_TZ)
