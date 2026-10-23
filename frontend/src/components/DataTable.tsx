import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Filter, 
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

    // Filter by match status
    if (filterMode === 'matched') {
      result = result.filter((d) => d.is_matched);
    } else if (filterMode === 'unmatched') {
      result = result.filter((d) => !d.is_matched);
    }

    // Filter by search query (timestamp or period)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.startTime.toLowerCase().includes(q) ||
          (d.settlementPeriod && String(d.settlementPeriod).includes(q))
      );
    }

    // Sort
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

  // Pagination slice
  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  return (
    <div className="bg-navy-900 border border-navy-700/80 rounded-xl p-4 lg:p-5 shadow-lg space-y-4">
      
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-navy-800 pb-3.5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Interval-Level Data Explorer</span>
            <span className="text-xs font-normal text-slate-400">
              ({processedData.length} records)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit actual wind generation, selected day-ahead forecast, and signed errors per interval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search date or period..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-navy-950/80 border border-navy-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-wind-cyan transition"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center bg-navy-950/80 border border-navy-700 rounded-lg p-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
            <select
              aria-label="Filter Match Status"
              value={filterMode}
              onChange={(e) => {
                setFilterMode(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-navy-900 text-white">All Records</option>
              <option value="matched" className="bg-navy-900 text-white">Matched Only</option>
              <option value="unmatched" className="bg-navy-900 text-white">Unmatched / Missing</option>
            </select>
          </div>

          {/* CSV Export */}
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-slate-200 font-medium transition"
          >
            <Download className="w-3.5 h-3.5 text-wind-emerald" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Table Element */}
      <div className="rounded-xl border border-navy-700/80 overflow-x-auto bg-navy-950/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-navy-800/80 text-slate-300 font-semibold border-b border-navy-700/80">
            <tr>
              <th
                onClick={() => handleSort('startTime')}
                className="py-3 px-3.5 cursor-pointer hover:text-white transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Delivery Interval (UTC)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th className="py-3 px-3.5">Settlement Info</th>

              <th
                onClick={() => handleSort('actual_mw')}
                className="py-3 px-3.5 cursor-pointer hover:text-white transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Actual (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th
                onClick={() => handleSort('forecast_mw')}
                className="py-3 px-3.5 cursor-pointer hover:text-white transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Forecast (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th
                onClick={() => handleSort('error_mw')}
                className="py-3 px-3.5 cursor-pointer hover:text-white transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Signed Error</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th
                onClick={() => handleSort('abs_error_mw')}
                className="py-3 px-3.5 cursor-pointer hover:text-white transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Abs Error</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th className="py-3 px-3.5">Selected Run (UTC)</th>
              <th className="py-3 px-3.5 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-navy-800/60 font-mono">
            {paginatedData.map((row: IntervalDataPoint) => {
              const dt = new Date(row.startTime);
              const formattedDate = dt.toLocaleDateString('en-GB', { month: 'short', day: '2-digit', timeZone: 'UTC' });
              const formattedTime = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
              const isOver = (row.error_mw ?? 0) > 0;

              return (
                <tr key={row.startTime} className="hover:bg-navy-800/30 transition">
                  {/* Delivery Start Time */}
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{formattedDate}</span>
                      <span className="text-slate-400">{formattedTime}</span>
                    </div>
                  </td>

                  {/* Settlement Date & Period */}
                  <td className="py-2.5 px-3.5 font-sans">
                    {row.settlementPeriod ? (
                      <span className="text-[11px] bg-navy-800/80 text-slate-300 px-2 py-0.5 rounded border border-navy-700">
                        Period {row.settlementPeriod}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Hourly Block</span>
                    )}
                  </td>

                  {/* Actual Generation */}
                  <td className="py-2.5 px-3.5 font-bold text-wind-emerald">
                    {row.actual_mw != null ? `${row.actual_mw.toLocaleString()} MW` : (
                      <span className="text-slate-500 font-normal italic">Missing</span>
                    )}
                  </td>

                  {/* Forecast Generation */}
                  <td className="py-2.5 px-3.5 font-bold text-wind-cyan">
                    {row.forecast_mw != null ? `${row.forecast_mw.toLocaleString()} MW` : (
                      <span className="text-slate-500 font-normal italic">No forecast</span>
                    )}
                  </td>

                  {/* Signed Error */}
                  <td className="py-2.5 px-3.5 font-bold">
                    {row.is_matched && row.error_mw != null ? (
                      <span className={isOver ? 'text-amber-400' : 'text-rose-400'}>
                        {row.error_mw > 0 ? '+' : ''}{row.error_mw.toLocaleString()} MW
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Absolute Error */}
                  <td className="py-2.5 px-3.5 text-slate-300">
                    {row.is_matched && row.abs_error_mw != null ? (
                      `${row.abs_error_mw.toLocaleString()} MW`
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Selected Run */}
                  <td className="py-2.5 px-3.5 text-slate-400 text-[11px]">
                    {row.publishTime ? (
                      new Date(row.publishTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3.5 text-right font-sans">
                    <button
                      onClick={() => onInspectInterval(row.startTime)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-700 text-wind-cyan hover:text-white border border-navy-700 transition text-[11px]"
                      title="Inspect all forecast runs published for this interval"
                    >
                      <Eye className="w-3 h-3" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-navy-800">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-navy-950 border border-navy-700 rounded px-2 py-1 text-slate-200"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>per page • Showing {processedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} records</span>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setCurrentPage((p: number) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded bg-navy-800 border border-navy-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy-700 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>
          <button
            onClick={() => setCurrentPage((p: number) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded bg-navy-800 border border-navy-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy-700 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
