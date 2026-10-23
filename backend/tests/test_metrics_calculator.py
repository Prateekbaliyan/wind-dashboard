"""
Unit tests for Accuracy Metrics Calculator with Hand-Calculated Ground Truth.
"""

import numpy as np
import pandas as pd
import pytest
from backend.app.services.metrics_calculator import calculate_accuracy_metrics


def test_hand_calculated_metrics():
    """
    Hand-calculated benchmark:
    Actuals:   [1000, 2000, 3000, 4000]
    Forecasts: [1200, 1900, 3100, 3800]
    
    Errors:
    e1 = 1200 - 1000 = +200
    e2 = 1900 - 2000 = -100
    e3 = 3100 - 3000 = +100
    e4 = 3800 - 4000 = -200
    
    MAE:  (200 + 100 + 100 + 200) / 4 = 600 / 4 = 150.00 MW
    MSE:  (40000 + 10000 + 10000 + 40000) / 4 = 100000 / 4 = 25000
    RMSE: sqrt(25000) = 158.113883... -> 158.11 MW
    Bias: (200 - 100 + 100 - 200) / 4 = 0.00 MW
    MAPE: (0.20 + 0.05 + 0.033333 + 0.05) / 4 * 100 = 8.33%
    """
    df = pd.DataFrame([
        {"is_matched": True, "has_actual": True, "has_forecast": True, "actual_mw": 1000.0, "forecast_mw": 1200.0},
        {"is_matched": True, "has_actual": True, "has_forecast": True, "actual_mw": 2000.0, "forecast_mw": 1900.0},
        {"is_matched": True, "has_actual": True, "has_forecast": True, "actual_mw": 3000.0, "forecast_mw": 3100.0},
        {"is_matched": True, "has_actual": True, "has_forecast": True, "actual_mw": 4000.0, "forecast_mw": 3800.0},
    ])

    metrics = calculate_accuracy_metrics(df, total_expected_intervals=4)
    
    assert metrics.mae == 150.0
    assert metrics.rmse == 158.11
    assert metrics.bias == 0.0
    assert metrics.mape == 8.33
    assert metrics.matched_intervals == 4
    assert metrics.coverage_pct == 100.0
    assert metrics.missing_actual_count == 0
    assert metrics.missing_forecast_count == 0


def test_positive_bias_interpretation():
    """Overforecasting test."""
    df = pd.DataFrame([
        {"is_matched": True, "has_actual": True, "has_forecast": True, "actual_mw": 1000.0, "forecast_mw": 1300.0},
        {"is_matched": True, "has_actual": True, "has_forecast": True, "actual_mw": 1500.0, "forecast_mw": 1800.0},
    ])
    metrics = calculate_accuracy_metrics(df, total_expected_intervals=2)
    assert metrics.bias == 300.0
    assert "Overforecasting" in metrics.interpretations.bias_summary
    assert "surplus" in metrics.interpretations.bias_summary


def test_negative_bias_interpretation():
    """Underforecasting test."""
    df = pd.DataFrame([
        {"is_matched": True, "has_actual": True, "has_forecast": True, "actual_mw": 2000.0, "forecast_mw": 1700.0},
        {"is_matched": True, "has_actual": True, "has_forecast": True, "actual_mw": 2500.0, "forecast_mw": 2100.0},
    ])
    metrics = calculate_accuracy_metrics(df, total_expected_intervals=2)
    assert metrics.bias == -350.0
    assert "Underforecasting" in metrics.interpretations.bias_summary


def test_empty_dataframe():
    df = pd.DataFrame()
    metrics = calculate_accuracy_metrics(df)
    assert metrics.matched_intervals == 0
    assert metrics.mae is None
    assert metrics.rmse is None
    assert metrics.bias is None
    assert metrics.coverage_pct == 0.0


def test_unmatched_handling():
    """Mixture of matched and unmatched rows."""
    df = pd.DataFrame([
        {"is_matched": True, "has_actual": True, "has_forecast": True, "actual_mw": 1000.0, "forecast_mw": 1100.0},
        {"is_matched": False, "has_actual": True, "has_forecast": False, "actual_mw": 2000.0, "forecast_mw": None},
        {"is_matched": False, "has_actual": False, "has_forecast": True, "actual_mw": None, "forecast_mw": 2500.0},
    ])
    metrics = calculate_accuracy_metrics(df, total_expected_intervals=3)
    assert metrics.matched_intervals == 1
    assert metrics.missing_forecast_count == 1
    assert metrics.missing_actual_count == 1
    assert metrics.coverage_pct == 33.33
    assert metrics.mae == 100.0
