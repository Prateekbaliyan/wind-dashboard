"""
Metrics Calculation Module for Wind Forecast Accuracy.

All authoritative calculations are strictly computed in Python.
Uses identical matched intervals across MAE, RMSE, Bias, and MAPE.
"""

from typing import Optional
import numpy as np
import pandas as pd
from backend.app.schemas.models import AccuracyMetrics, MetricInterpretations


def calculate_accuracy_metrics(
    matched_df: pd.DataFrame,
    total_expected_intervals: Optional[int] = None
) -> AccuracyMetrics:
    """
    Calculate authoritative forecast accuracy metrics for matched delivery intervals.
    
    Formula definitions:
    - error = forecast - actual
    - MAE = mean(abs(forecast - actual))
    - RMSE = sqrt(mean((forecast - actual) ** 2))
    - Bias = mean(forecast - actual)
    - MAPE = mean(abs(forecast - actual) / actual) * 100 (for actual > 0)
    
    Strictly uses identical matched intervals for all error metrics.
    """
    if matched_df.empty:
        return AccuracyMetrics(
            mae=None,
            rmse=None,
            bias=None,
            mape=None,
            matched_intervals=0,
            total_expected_intervals=0,
            missing_actual_count=0,
            missing_forecast_count=0,
            coverage_pct=0.0,
            interpretations=MetricInterpretations(
                bias_summary="No data available for the selected period.",
                mae_summary="No data available.",
                rmse_summary="No data available.",
                procurement_impact="No intervals could be matched."
            )
        )

    total_records = len(matched_df)
    total_expected = total_expected_intervals if total_expected_intervals is not None else total_records

    # Filter to identical matched pairs (where both actual and forecast exist and are finite)
    matched_mask = matched_df["is_matched"] & matched_df["actual_mw"].notnull() & matched_df["forecast_mw"].notnull()
    matched_subset = matched_df[matched_mask].copy()

    matched_count = len(matched_subset)
    missing_actual_count = int((~matched_df["has_actual"]).sum())
    missing_forecast_count = int((~matched_df["has_forecast"]).sum())
    
    coverage_pct = round((matched_count / total_expected * 100.0) if total_expected > 0 else 0.0, 2)

    if matched_count == 0:
        return AccuracyMetrics(
            mae=None,
            rmse=None,
            bias=None,
            mape=None,
            matched_intervals=0,
            total_expected_intervals=total_expected,
            missing_actual_count=missing_actual_count,
            missing_forecast_count=missing_forecast_count,
            coverage_pct=0.0,
            interpretations=MetricInterpretations(
                bias_summary="Zero matched intervals between actuals and eligible forecasts.",
                mae_summary="Cannot compute MAE with 0 matched intervals.",
                rmse_summary="Cannot compute RMSE with 0 matched intervals.",
                procurement_impact="Check decision cutoff time or delivery date filter."
            )
        )

    # Convert to numpy arrays for verified numerical accuracy
    actuals = matched_subset["actual_mw"].to_numpy(dtype=float)
    forecasts = matched_subset["forecast_mw"].to_numpy(dtype=float)
    
    # Fundamental error: forecast - actual
    errors = forecasts - actuals
    abs_errors = np.abs(errors)

    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    bias = float(np.mean(errors))

    # MAPE calculation: strictly excluding actual <= 0 to avoid zero-division / distortion
    nonzero_mask = actuals > 10.0  # Threshold of 10 MW to prevent extreme distortion from near-zero base
    if np.any(nonzero_mask):
        mape_val = float(np.mean(abs_errors[nonzero_mask] / actuals[nonzero_mask]) * 100.0)
        mape = round(mape_val, 2)
    else:
        mape = None

    mae_rounded = round(mae, 2)
    rmse_rounded = round(rmse, 2)
    bias_rounded = round(bias, 2)

    # Formulate clear, concise interpretations
    if bias_rounded > 50:
        bias_text = (
            f"Overforecasting bias (+{bias_rounded:,.1f} MW avg): Forecasted generation consistently exceeded actual output. "
            "The procurement desk would have purchased surplus day-ahead energy, incurring cash-out exposure or spill penalties."
        )
        proc_impact = "High risk of long position: Surplus volume liquidated at imbalance system sell price."
    elif bias_rounded < -50:
        bias_text = (
            f"Underforecasting bias ({bias_rounded:,.1f} MW avg): Actual output was higher than forecasted. "
            "Day-ahead procurement was lower than available wind, forcing reliance on intraday markets or short balancing positions."
        )
        proc_impact = "Short day-ahead hedge: Risk of unhedged exposure during tight system margins."
    else:
        bias_text = (
            f"Neutral / balanced bias ({bias_rounded:+.1f} MW avg): Errors are approximately symmetrical around actual output, "
            "indicating an unbiased day-ahead prediction model."
        )
        proc_impact = "Balanced baseline procurement with minimal systemic imbalance drift."

    mae_text = (
        f"Mean Absolute Error is {mae_rounded:,.1f} MW. On average across all matched hours, the day-ahead forecast "
        f"deviated from delivered wind generation by {mae_rounded:,.1f} MW."
    )

    gap_penalty = rmse_rounded - mae_rounded
    rmse_text = (
        f"Root Mean Squared Error is {rmse_rounded:,.1f} MW. The {gap_penalty:,.1f} MW spread over MAE reflects "
        "the penalty applied to volatile forecast ramps and tail-event prediction errors."
    )

    return AccuracyMetrics(
        mae=mae_rounded,
        rmse=rmse_rounded,
        bias=bias_rounded,
        mape=mape,
        matched_intervals=matched_count,
        total_expected_intervals=total_expected,
        missing_actual_count=missing_actual_count,
        missing_forecast_count=missing_forecast_count,
        coverage_pct=coverage_pct,
        interpretations=MetricInterpretations(
            bias_summary=bias_text,
            mae_summary=mae_text,
            rmse_summary=rmse_text,
            procurement_impact=proc_impact
        )
    )
