"""
Forecast Selection Logic Module for UK Day-Ahead Energy Procurement.

Distinguishes:
1. Delivery interval startTime (when electricity is delivered).
2. Forecast publication time publishTime (when the forecast was officially issued by NESO/Elexon).
3. Decision cutoff (the market gate closure when day-ahead procurement decisions must be finalized).

Guarantees ZERO look-ahead bias (no data leakage):
For any delivery interval, ONLY forecasts published at or before the applicable cutoff
are eligible. The latest eligible publication is selected.
"""

from datetime import datetime, date, time, timedelta, timezone
from typing import Optional, Any
import zoneinfo
import pandas as pd
from backend.app.schemas.models import CutoffPolicyType, ForecastVersionItem

LONDON_TZ = zoneinfo.ZoneInfo("Europe/London")
UTC_TZ = timezone.utc


def parse_to_utc(ts: Any) -> datetime:
    """Parse various timestamp representations into a timezone-aware UTC datetime."""
    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            return ts.replace(tzinfo=UTC_TZ)
        return ts.astimezone(UTC_TZ)
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts, tz=UTC_TZ)
    if isinstance(ts, pd.Timestamp):
        if ts.tzinfo is None:
            return ts.to_pydatetime().replace(tzinfo=UTC_TZ)
        return ts.to_pydatetime().astimezone(UTC_TZ)
    
    # String parsing
    s = str(ts).strip()
    # Normalize ISO with 'Z'
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC_TZ)
    return dt.astimezone(UTC_TZ)


def calculate_decision_cutoff(
    delivery_start_utc: datetime,
    policy: CutoffPolicyType = "day_ahead_1100",
    custom_cutoff_utc: Optional[datetime] = None
) -> datetime:
    """
    Calculate the exact decision cutoff for a specific delivery interval under a chosen market policy.
    
    Policies:
    - day_ahead_1100: EPEX SPOT / Nord Pool UK Day-Ahead auction close (D-1 at 11:00 UK local time).
    - day_ahead_1200: Day-ahead noon cutoff (D-1 at 12:00 UK local time).
    - day_ahead_1700: Day-ahead evening post-clearing cutoff (D-1 at 17:00 UK local time).
    - intraday_h4: 4 hours prior to interval start.
    - intraday_h1: 1 hour prior to interval start (Elexon Gate Closure).
    - custom: Fixed timestamp specified by the user.
    """
    if policy == "custom" and custom_cutoff_utc is not None:
        return custom_cutoff_utc

    delivery_utc = parse_to_utc(delivery_start_utc)
    # Convert delivery time to UK Local Time to determine the GB delivery calendar date D
    delivery_local = delivery_utc.astimezone(LONDON_TZ)
    delivery_date = delivery_local.date()

    if policy in ("day_ahead_1100", "day_ahead_1200", "day_ahead_1700"):
        d_minus_1 = delivery_date - timedelta(days=1)
        if policy == "day_ahead_1100":
            target_time = time(11, 0, 0)
        elif policy == "day_ahead_1200":
            target_time = time(12, 0, 0)
        else:
            target_time = time(17, 0, 0)
            
        cutoff_local = datetime.combine(d_minus_1, target_time, tzinfo=LONDON_TZ)
        return cutoff_local.astimezone(UTC_TZ)

    elif policy == "intraday_h4":
        return delivery_utc - timedelta(hours=4)

    elif policy == "intraday_h1":
        return delivery_utc - timedelta(hours=1)

    # Default fallback to day_ahead_1100
    d_minus_1 = delivery_date - timedelta(days=1)
    cutoff_local = datetime.combine(d_minus_1, time(11, 0, 0), tzinfo=LONDON_TZ)
    return cutoff_local.astimezone(UTC_TZ)


def select_forecast_for_interval(
    interval_start: datetime | str,
    forecast_candidates: list[dict[str, Any]],
    policy: CutoffPolicyType = "day_ahead_1100",
    custom_cutoff: Optional[datetime | str] = None
) -> dict[str, Any]:
    """
    Select the appropriate forecast for a single delivery interval from candidate records.
    
    Parameters:
    - interval_start: Delivery interval startTime.
    - forecast_candidates: List of forecast dicts matching interval_start, each containing:
      'publishTime', 'generation', etc.
    - policy: The cutoff policy to enforce.
    - custom_cutoff: Optional explicit cutoff timestamp.
    
    Returns:
    Dict with:
    - 'selected_forecast': float generation or None
    - 'selected_publish_time': ISO str or None
    - 'cutoff_time': ISO str
    - 'is_eligible': bool
    - 'all_versions': list of processed version metadata
    """
    start_dt = parse_to_utc(interval_start)
    custom_cutoff_dt = parse_to_utc(custom_cutoff) if custom_cutoff else None
    cutoff_dt = calculate_decision_cutoff(start_dt, policy=policy, custom_cutoff_utc=custom_cutoff_dt)
    cutoff_iso = cutoff_dt.isoformat()

    if not forecast_candidates:
        return {
            "selected_forecast": None,
            "selected_publish_time": None,
            "cutoff_time": cutoff_iso,
            "is_eligible": False,
            "all_versions": []
        }

    # Normalize candidates and handle duplicate timestamps
    processed_candidates = []
    for c in forecast_candidates:
        pub_dt = parse_to_utc(c["publishTime"])
        gen = float(c["generation"])
        lead_time = (start_dt - pub_dt).total_seconds() / 3600.0
        is_eligible = pub_dt <= cutoff_dt
        processed_candidates.append({
            "publish_dt": pub_dt,
            "publishTime": pub_dt.isoformat(),
            "generation": gen,
            "lead_time_hours": round(lead_time, 2),
            "is_eligible": is_eligible
        })

    # Sort candidates chronologically by publishTime
    processed_candidates.sort(key=lambda x: (x["publish_dt"], x["generation"]))

    # Deduplicate candidate records with identical publishTime by taking the latest/highest
    deduped = []
    seen_times = set()
    for c in reversed(processed_candidates):
        if c["publishTime"] not in seen_times:
            seen_times.add(c["publishTime"])
            deduped.append(c)
    deduped.reverse()

    # Filter for eligible versions (published at or before cutoff)
    eligible = [c for c in deduped if c["is_eligible"]]

    selected_cand = None
    if eligible:
        # Latest eligible publication
        selected_cand = eligible[-1]

    # Annotate version history
    all_versions: list[ForecastVersionItem] = []
    for c in deduped:
        is_sel = (selected_cand is not None and c["publishTime"] == selected_cand["publishTime"])
        all_versions.append(
            ForecastVersionItem(
                publishTime=c["publishTime"],
                startTime=start_dt.isoformat(),
                generation=c["generation"],
                is_eligible=c["is_eligible"],
                is_selected=is_sel,
                cutoff_applied=cutoff_iso,
                lead_time_hours=c["lead_time_hours"]
            )
        )

    return {
        "selected_forecast": selected_cand["generation"] if selected_cand else None,
        "selected_publish_time": selected_cand["publishTime"] if selected_cand else None,
        "cutoff_time": cutoff_iso,
        "is_eligible": selected_cand is not None,
        "all_versions": all_versions
    }


def match_forecasts_with_actuals(
    actuals_df: pd.DataFrame,
    forecasts_df: pd.DataFrame,
    policy: CutoffPolicyType = "day_ahead_1100",
    custom_cutoff: Optional[str] = None
) -> tuple[pd.DataFrame, list[ForecastVersionItem]]:
    """
    Perform rigorous, leakage-free matching between actual wind records and forecasts.
    
    Expects:
    - actuals_df with columns: ['startTime', 'generation', ... optional 'settlementDate', 'settlementPeriod']
    - forecasts_df with columns: ['startTime', 'publishTime', 'generation']
    
    Returns:
    - matched_df: DataFrame indexed by delivery interval startTime, containing:
      ['startTime', 'settlementDate', 'settlementPeriod', 'actual_mw', 'forecast_mw',
       'error_mw', 'abs_error_mw', 'publishTime', 'cutoff_time', 'is_matched', 'has_actual', 'has_forecast']
    - all_version_items: List of all forecast versions with eligibility annotations
    """
    if forecasts_df.empty and actuals_df.empty:
        return pd.DataFrame(), []

    # Pre-parse timestamps
    actuals = actuals_df.copy()
    forecasts = forecasts_df.copy()

    if not actuals.empty:
        actuals["start_dt"] = actuals["startTime"].apply(parse_to_utc)
        actuals["startTime"] = actuals["start_dt"].apply(lambda d: d.isoformat())
    else:
        actuals = pd.DataFrame(columns=["start_dt", "startTime", "generation"])

    if not forecasts.empty:
        forecasts["start_dt"] = forecasts["startTime"].apply(parse_to_utc)
        forecasts["publish_dt"] = forecasts["publishTime"].apply(parse_to_utc)
        forecasts["startTime"] = forecasts["start_dt"].apply(lambda d: d.isoformat())
        forecasts["publishTime"] = forecasts["publish_dt"].apply(lambda d: d.isoformat())
    else:
        forecasts = pd.DataFrame(columns=["start_dt", "publish_dt", "startTime", "publishTime", "generation"])

    # Group forecasts by delivery interval startTime
    forecast_groups = {}
    if not forecasts.empty:
        for st_iso, grp in forecasts.groupby("startTime"):
            forecast_groups[st_iso] = grp.to_dict("records")

    # Determine unique timeline of all intervals from both actuals and forecasts
    all_start_times = set(actuals["startTime"]).union(set(forecasts["startTime"]))
    sorted_starts = sorted(list(all_start_times))

    actuals_by_start = {}
    if not actuals.empty:
        # If duplicates in actuals, take average or latest
        for _, row in actuals.iterrows():
            st = row["startTime"]
            actuals_by_start[st] = {
                "actual_mw": float(row["generation"]) if pd.notnull(row["generation"]) else None,
                "settlementDate": row.get("settlementDate", None),
                "settlementPeriod": int(row["settlementPeriod"]) if pd.notnull(row.get("settlementPeriod")) else None
            }

    rows = []
    all_history_versions = []

    for st_iso in sorted_starts:
        st_dt = parse_to_utc(st_iso)
        candidates = forecast_groups.get(st_iso, [])
        sel_result = select_forecast_for_interval(
            interval_start=st_dt,
            forecast_candidates=candidates,
            policy=policy,
            custom_cutoff=custom_cutoff
        )
        all_history_versions.extend(sel_result["all_versions"])

        act_info = actuals_by_start.get(st_iso, {})
        actual_val = act_info.get("actual_mw", None)
        settlement_date = act_info.get("settlementDate", None)
        settlement_period = act_info.get("settlementPeriod", None)

        forecast_val = sel_result["selected_forecast"]
        has_act = actual_val is not None and not pd.isna(actual_val)
        has_fc = forecast_val is not None and not pd.isna(forecast_val)
        is_matched = has_act and has_fc

        error_val = None
        abs_error_val = None
        if is_matched:
            # error = forecast - actual (Section 4.D formula)
            error_val = round(forecast_val - actual_val, 2)
            abs_error_val = round(abs(error_val), 2)

        rows.append({
            "startTime": st_iso,
            "settlementDate": settlement_date,
            "settlementPeriod": settlement_period,
            "actual_mw": round(actual_val, 2) if has_act else None,
            "forecast_mw": round(forecast_val, 2) if has_fc else None,
            "error_mw": error_val,
            "abs_error_mw": abs_error_val,
            "publishTime": sel_result["selected_publish_time"],
            "cutoff_time": sel_result["cutoff_time"],
            "is_matched": is_matched,
            "has_actual": has_act,
            "has_forecast": has_fc
        })

    matched_df = pd.DataFrame(rows)
    return matched_df, all_history_versions
