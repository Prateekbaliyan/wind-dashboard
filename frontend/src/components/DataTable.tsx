import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Search, 
  Eye 
} from 'lucide-react';
import type { IntervalDataPoint } from '../types';

interface DataTableProps {
  data: IntervalDataPoint[];
  onInspectInterval: (startTime: string) => void;
  onExport: () => void;
}

type SortField = 'startTime' | 'actual_mw' | 'forecast_mw' | 'error_mw' | 'abs_error_mw';

export const DataTable: React.FC<DataTableProps> = ({ data, onInspectInterval, onExport }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    if (filterMode === 'matched') {
      result = result.filter((d) => d.is_matched);
    } else if (filterMode === 'unmatched') {
      result = result.filter((d) => !d.is_matched);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.startTime.toLowerCase().includes(q) ||
          (d.settlementPeriod && String(d.settlementPeriod).includes(q))
      );
    }

    result.sort((a, b) => {
      const vA = a[sortField];
      const vB = b[sortField];

      if (vA == null && vB == null) return 0;
      if (vA == null) return sortAsc ? 1 : -1;
      if (vB == null) return sortAsc ? -1 : 1;

      if (sortField === 'startTime') {
        const comp = new Date(vA as string).getTime() - new Date(vB as string).getTime();
        return sortAsc ? comp : -comp;
      }

      const diff = (vA as number) - (vB as number);
      return sortAsc ? diff : -diff;
    });

    return result;
  }, [data, filterMode, searchQuery, sortField, sortAsc]);

  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  return (
    <div className="bg-white border border-slate-200 rounded p-4 shadow-none space-y-3">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Interval Data Explorer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Underlying interval actuals, selected day-ahead forecasts, and signed errors ({processedData.length} total records).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search date / SP..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-slate-300 rounded pl-8 pr-2.5 py-1 text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Filter Match Status */}
          <select
            aria-label="Filter Match Status"
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value as any);
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded px-2.5 py-1 text-slate-800 bg-white focus:outline-none"
          >
            <option value="all">All Records</option>
            <option value="matched">Matched Pairs Only</option>
            <option value="unmatched">Unmatched / Missing</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <div className="border border-slate-200 rounded overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th
                onClick={() => handleSort('startTime')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Delivery Interval (UTC)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-2.5 px-3 whitespace-nowrap">Period</th>

              <th
                onClick={() => handleSort('actual_mw')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900 select-none text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Actual (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('forecast_mw')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900 select-none text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Forecast (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('error_mw')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900 select-none text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Signed Error</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('abs_error_mw')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900 select-none text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Abs Error</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-2.5 px-3 whitespace-nowrap">Selected Run (UTC)</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-mono">
            {paginatedData.map((row: IntervalDataPoint) => {
              const dt = new Date(row.startTime);
              const formattedDate = dt.toLocaleDateString('en-GB', { month: 'short', day: '2-digit', timeZone: 'UTC' });
              const formattedTime = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
              const isOver = (row.error_mw ?? 0) > 0;

              return (
                <tr key={row.startTime} className="hover:bg-slate-50 transition">
                  {/* Delivery Start Time */}
                  <td className="py-2 px-3 whitespace-nowrap text-slate-900">
                    <span className="font-sans font-medium mr-1.5">{formattedDate}</span>
                    <span className="text-slate-600">{formattedTime}</span>
                  </td>

                  {/* Settlement Period */}
                  <td className="py-2 px-3 font-sans text-slate-600 whitespace-nowrap">
                    {row.settlementPeriod ? `SP ${row.settlementPeriod}` : 'Hourly'}
                  </td>

                  {/* Actual Generation */}
                  <td className="py-2 px-3 text-right font-medium text-emerald-800 whitespace-nowrap">
                    {row.actual_mw != null ? `${row.actual_mw.toLocaleString()} MW` : (
                      <span className="text-slate-400 font-sans italic">Missing</span>
                    )}
                  </td>

                  {/* Forecast Generation */}
                  <td className="py-2 px-3 text-right font-medium text-blue-800 whitespace-nowrap">
                    {row.forecast_mw != null ? `${row.forecast_mw.toLocaleString()} MW` : (
                      <span className="text-slate-400 font-sans italic">None</span>
                    )}
                  </td>

                  {/* Signed Error */}
                  <td className="py-2 px-3 text-right font-semibold whitespace-nowrap">
                    {row.is_matched && row.error_mw != null ? (
                      <span className={isOver ? 'text-amber-800' : 'text-rose-800'}>
                        {row.error_mw > 0 ? '+' : ''}{row.error_mw.toLocaleString()} MW
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">—</span>
                    )}
                  </td>

                  {/* Absolute Error */}
                  <td className="py-2 px-3 text-right text-slate-700 whitespace-nowrap">
                    {row.is_matched && row.abs_error_mw != null ? (
                      `${row.abs_error_mw.toLocaleString()} MW`
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Selected Run */}
                  <td className="py-2 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                    {row.publishTime ? (
                      new Date(row.publishTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-3 text-right font-sans whitespace-nowrap">
                    <button
                      onClick={() => onInspectInterval(row.startTime)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 transition text-[11px]"
                      title="Inspect all forecast runs published for this interval"
                    >
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>History</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 pt-1.5">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded px-2 py-0.5 text-slate-800 bg-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>• Showing {processedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length}</span>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setCurrentPage((p: number) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong>
          </span>
          <button
            onClick={() => setCurrentPage((p: number) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
