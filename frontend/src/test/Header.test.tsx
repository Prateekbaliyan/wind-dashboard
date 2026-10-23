import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../components/Header';

describe('Header', () => {
  it('renders title and triggers callback on date change', () => {
    const onDateChange = vi.fn();
    const onCutoffChange = vi.fn();
    const onResolutionChange = vi.fn();
    const onRefresh = vi.fn();
    const onExport = vi.fn();

    render(
      <Header
        startDate="2026-01-01"
        endDate="2026-01-31"
        onDateChange={onDateChange}
        cutoffPolicy="day_ahead_1100"
        onCutoffChange={onCutoffChange}
        resolution="hourly"
        onResolutionChange={onResolutionChange}
        isDemo={false}
        dataSource="live_elexon"
        onRefresh={onRefresh}
        onExport={onExport}
        isLoading={false}
      />
    );

    expect(screen.getByText('UK Wind Forecast Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Live Elexon BMRS')).toBeInTheDocument();

    const exportBtn = screen.getByText('Export CSV');
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
