import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  X,
  Shield,
  MapPin,
  Calendar,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import * as xlsx from 'xlsx';
import Papa from 'papaparse';
import { useDataset } from '../context/DatasetContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { CrimeRecord } from '../types';
import { FilterBar } from '../components/common/FilterBar';

export const CrimeRecordsPage: React.FC = () => {
  const { filters } = useDataset();
  const { t } = useLanguage();

  const [records, setRecords] = useState<CrimeRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalRecords: 0, totalPages: 1 });
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRecord, setSelectedRecord] = useState<CrimeRecord | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    async function loadRecords() {
      setIsLoading(true);
      try {
        const res = await api.getRecords({
          ...filters,
          page: pagination.page,
          limit: pagination.limit,
          sortBy,
          sortOrder
        });
        setRecords(res.records);
        setPagination(res.pagination);
      } catch (err) {
        console.error('Failed to load records:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecords();
  }, [filters, pagination.page, pagination.limit, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const res = await api.exportRecords(filters);
      const csv = Papa.unparse(res.records);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `crime_records_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const res = await api.exportRecords(filters);
      const worksheet = xlsx.utils.json_to_sheet(res.records);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Crime Records');
      xlsx.writeFile(workbook, `crime_records_export_${Date.now()}.xlsx`);
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t('crimeRecords', 'Crime Records Explorer')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Searchable repository of all verified crime incidents with complete case metadata and export options.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            disabled={isExporting || records.length === 0}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/40 hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting || records.length === 0}
            className="flex items-center space-x-1.5 rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar showSearch={true} showCrimeType={true} showSeverity={true} showStatus={true} />

      {/* Records Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 backdrop-blur-xl shadow-xl overflow-hidden">
        {/* Table Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800/80 bg-slate-900/40 text-xs">
          <div className="text-slate-400 font-mono">
            Showing <span className="text-white font-semibold">{records.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{' '}
            <span className="text-white font-semibold">{Math.min(pagination.page * pagination.limit, pagination.totalRecords)}</span> of{' '}
            <span className="text-cyan-400 font-bold">{pagination.totalRecords.toLocaleString()}</span> records
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Rows per page:</span>
            <select
              value={pagination.limit}
              onChange={e => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#090e1f] border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono select-none">
              <tr>
                <th onClick={() => handleSort('crime_id')} className="py-3 px-4 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Crime ID</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('date')} className="py-3 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Date & Time</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('crime_type')} className="py-3 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Crime Type</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('state')} className="py-3 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>State / City</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('crime_severity')} className="py-3 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Severity</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('case_status')} className="py-3 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('arrest_made')} className="py-3 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Arrest</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                      <span>Fetching verified crime records...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <AlertCircle className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">{t('noDataAvailable', 'No data available for this selection.')}</p>
                    <p className="text-[11px] text-slate-600 mt-1">Try resetting the filter options.</p>
                  </td>
                </tr>
              ) : (
                records.map(record => {
                  const isHigh = record.crime_severity?.toLowerCase() === 'high';
                  const isMed = record.crime_severity?.toLowerCase() === 'medium';
                  const isClosed = ['closed', 'solved', 'charge sheet filed', 'convicted'].includes(record.case_status?.toLowerCase());
                  const isArrested = ['yes', 'y', 'true', '1'].includes(record.arrest_made?.toLowerCase());

                  return (
                    <tr key={record.crime_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                        {record.crime_id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{record.date}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{record.time} &bull; {record.incident_day}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-200">{record.crime_type}</span>
                        {record.weapon_used && record.weapon_used !== 'nan' && (
                          <div className="text-[10px] text-slate-400">Weapon: {record.weapon_used}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{record.city}</div>
                        <div className="text-[10px] text-slate-400">{record.state}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isHigh
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : isMed
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {record.crime_severity}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isClosed
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {record.case_status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono ${
                            isArrested
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                              : 'bg-slate-900 text-slate-500'
                          }`}
                        >
                          {record.arrest_made}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                          title="View Case Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-800/80 bg-slate-900/40 text-xs">
          <div className="text-slate-400 font-mono">
            Page {pagination.page} of {pagination.totalPages || 1}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page <= 1}
              className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700 bg-[#0c1429] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-md bg-cyan-500/20 px-2 py-0.5 text-xs font-mono font-bold text-cyan-400 border border-cyan-500/30">
                    {selectedRecord.crime_id}
                  </span>
                  <h3 className="text-lg font-bold text-white">{selectedRecord.crime_type}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Incident Recorded on {selectedRecord.date} ({selectedRecord.incident_day}) at {selectedRecord.time}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-slate-900/80 p-3.5 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  Spatial & Jurisdiction
                </div>
                <div><span className="text-slate-500">State:</span> <span className="text-slate-200 font-medium">{selectedRecord.state}</span></div>
                <div><span className="text-slate-500">District:</span> <span className="text-slate-200 font-medium">{selectedRecord.district || 'N/A'}</span></div>
                <div><span className="text-slate-500">City / Town:</span> <span className="text-slate-200 font-medium">{selectedRecord.city}</span></div>
                <div><span className="text-slate-500">Exact Location:</span> <span className="text-slate-200 font-medium">{selectedRecord.location}</span></div>
                <div><span className="text-slate-500">Police Station:</span> <span className="text-slate-200 font-medium">{selectedRecord.police_station}</span></div>
              </div>

              <div className="rounded-xl bg-slate-900/80 p-3.5 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  Case Resolution & Status
                </div>
                <div><span className="text-slate-500">Severity Level:</span> <span className="text-rose-400 font-bold">{selectedRecord.crime_severity}</span></div>
                <div><span className="text-slate-500">Case Status:</span> <span className="text-emerald-400 font-medium">{selectedRecord.case_status}</span></div>
                <div><span className="text-slate-500">Arrest Made:</span> <span className="text-slate-200 font-medium">{selectedRecord.arrest_made}</span></div>
                <div><span className="text-slate-500">Investigation Duration:</span> <span className="text-slate-200 font-mono font-medium">{selectedRecord.investigation_days !== null ? `${selectedRecord.investigation_days} Days` : 'In Progress'}</span></div>
                <div><span className="text-slate-500">Weapon Used:</span> <span className="text-slate-200 font-medium">{selectedRecord.weapon_used || 'None / Not Specified'}</span></div>
              </div>

              <div className="rounded-xl bg-slate-900/80 p-3.5 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  Victim Demographics
                </div>
                <div><span className="text-slate-500">Victim Age:</span> <span className="text-slate-200 font-medium">{selectedRecord.victim_age ?? 'Unspecified'}</span></div>
                <div><span className="text-slate-500">Victim Gender:</span> <span className="text-slate-200 font-medium">{selectedRecord.victim_gender || 'Unspecified'}</span></div>
              </div>

              <div className="rounded-xl bg-slate-900/80 p-3.5 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  Suspect Demographics
                </div>
                <div><span className="text-slate-500">Suspect Age:</span> <span className="text-slate-200 font-medium">{selectedRecord.suspect_age ?? 'Unspecified'}</span></div>
                <div><span className="text-slate-500">Suspect Gender:</span> <span className="text-slate-200 font-medium">{selectedRecord.suspect_gender || 'Unspecified'}</span></div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
