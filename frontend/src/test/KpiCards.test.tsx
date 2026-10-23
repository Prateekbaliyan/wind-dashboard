import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KpiCards } from '../components/KpiCards';
import type { AccuracyMetrics } from '../types';

const mockMetrics: AccuracyMetrics = {
  mae: 2122.81,
  rmse: 2616.69,
  bias: 1840.30,
  mape: 22.06,
  matched_intervals: 744,
  total_expected_intervals: 744,
  missing_actual_count: 0,
  missing_forecast_count: 0,
  coverage_pct: 100.0,
  interpretations: {
    bias_summary: "Overforecasting bias (+1,840.3 MW avg)",
    mae_summary: "Mean Absolute Error is 2,122.8 MW",
    rmse_summary: "Root Mean Squared Error is 2,616.7 MW",
    procurement_impact: "High risk of long position"
  }
};

describe('KpiCards', () => {
  it('renders MAE, RMSE, and Bias correctly', () => {
    render(
      <KpiCards
        metrics={mockMetrics}
        avgActualMw={15372}
        peakActualMw={16330}
        avgForecastMw={19630}
        cutoffPolicy="day_ahead_1100"
      />
    );

    // Verify key metrics exist
    expect(screen.getByText('2,122.8 MW')).toBeInTheDocument();
    expect(screen.getByText('2,616.7 MW')).toBeInTheDocument();
    expect(screen.getByText('+1,840.3 MW')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Overforecasting (Long)')).toBeInTheDocument();
  });
});
