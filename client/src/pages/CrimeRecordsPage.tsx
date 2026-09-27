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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EEDFD9] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-6 w-6 text-[#883A2E]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#2B1F1D] sm:text-3xl">
              {t('crimeRecords', 'Crime Records Explorer')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#7A6360]">
            Searchable repository of all verified crime incidents with complete case metadata and export options.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            disabled={isExporting || records.length === 0}
            className="flex items-center space-x-1.5 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs font-semibold text-[#2B1F1D] hover:bg-[#FAF0EC] hover:border-[#883A2E] disabled:opacity-50 transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-[#883A2E]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting || records.length === 0}
            className="flex items-center space-x-1.5 rounded-xl border border-[#2E7D32]/30 bg-[#2E7D32]/10 px-3 py-2 text-xs font-semibold text-[#2E7D32] hover:bg-[#2E7D32]/20 disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-[#2E7D32]" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar showSearch={true} showCrimeType={true} showSeverity={true} showStatus={true} />

      {/* Records Table Container */}
      <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#EEDFD9] bg-[#FAF0EC]/60 text-xs">
          <div className="text-[#7A6360] font-mono">
            Showing <span className="text-[#2B1F1D] font-semibold">{records.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{' '}
            <span className="text-[#2B1F1D] font-semibold">{Math.min(pagination.page * pagination.limit, pagination.totalRecords)}</span> of{' '}
            <span className="text-[#883A2E] font-bold">{pagination.totalRecords.toLocaleString()}</span> records
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[#7A6360]">Rows per page:</span>
            <select
              value={pagination.limit}
              onChange={e => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
              className="rounded-lg border border-[#EEDFD9] bg-[#FFFDFC] px-2.5 py-1 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none"
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
          <table className="w-full text-left text-xs text-[#2B1F1D]">
            <thead className="bg-[#FAF0EC] border-b border-[#EEDFD9] text-[11px] uppercase tracking-wider text-[#7A6360] font-mono select-none">
              <tr>
                <th onClick={() => handleSort('crime_id')} className="py-3 px-4 cursor-pointer hover:text-[#2B1F1D]">
                  <div className="flex items-center space-x-1">
                    <span>Crime ID</span>
                    <ArrowUpDown className="h-3 w-3 text-[#7A6360]" />
                  </div>
                </th>
                <th onClick={() => handleSort('date')} className="py-3 px-3 cursor-pointer hover:text-[#2B1F1D]">
                  <div className="flex items-center space-x-1">
                    <span>Date & Time</span>
                    <ArrowUpDown className="h-3 w-3 text-[#7A6360]" />
                  </div>
                </th>
                <th onClick={() => handleSort('crime_type')} className="py-3 px-3 cursor-pointer hover:text-[#2B1F1D]">
                  <div className="flex items-center space-x-1">
                    <span>Crime Type</span>
                    <ArrowUpDown className="h-3 w-3 text-[#7A6360]" />
                  </div>
                </th>
                <th onClick={() => handleSort('state')} className="py-3 px-3 cursor-pointer hover:text-[#2B1F1D]">
                  <div className="flex items-center space-x-1">
                    <span>State / City</span>
                    <ArrowUpDown className="h-3 w-3 text-[#7A6360]" />
                  </div>
                </th>
                <th onClick={() => handleSort('crime_severity')} className="py-3 px-3 cursor-pointer hover:text-[#2B1F1D]">
                  <div className="flex items-center space-x-1">
                    <span>Severity</span>
                    <ArrowUpDown className="h-3 w-3 text-[#7A6360]" />
                  </div>
                </th>
                <th onClick={() => handleSort('case_status')} className="py-3 px-3 cursor-pointer hover:text-[#2B1F1D]">
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown className="h-3 w-3 text-[#7A6360]" />
                  </div>
                </th>
                <th onClick={() => handleSort('arrest_made')} className="py-3 px-3 cursor-pointer hover:text-[#2B1F1D]">
                  <div className="flex items-center space-x-1">
                    <span>Arrest</span>
                    <ArrowUpDown className="h-3 w-3 text-[#7A6360]" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEDFD9] font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#7A6360] font-mono">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#883A2E] border-t-transparent" />
                      <span>Fetching verified crime records...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#7A6360]">
                    <AlertCircle className="mx-auto h-8 w-8 text-[#7A6360] mb-2" />
                    <p className="font-semibold text-[#2B1F1D]">{t('noDataAvailable', 'No data available for this selection.')}</p>
                    <p className="text-[11px] text-[#7A6360] mt-1">Try resetting the filter options.</p>
                  </td>
                </tr>
              ) : (
                records.map(record => {
                  const isHigh = record.crime_severity?.toLowerCase() === 'high';
                  const isMed = record.crime_severity?.toLowerCase() === 'medium';
                  const isClosed = ['closed', 'solved', 'charge sheet filed', 'convicted'].includes(record.case_status?.toLowerCase());
                  const isArrested = ['yes', 'y', 'true', '1'].includes(record.arrest_made?.toLowerCase());

                  return (
                    <tr key={record.crime_id} className="hover:bg-[#FAF0EC]/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#883A2E]">
                        {record.crime_id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-[#2B1F1D]">{record.date}</div>
                        <div className="text-[10px] text-[#7A6360] font-mono">{record.time} &bull; {record.incident_day}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-[#2B1F1D]">{record.crime_type}</span>
                        {record.weapon_used && record.weapon_used !== 'nan' && (
                          <div className="text-[10px] text-[#7A6360]">Weapon: {record.weapon_used}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-[#2B1F1D]">{record.city}</div>
                        <div className="text-[10px] text-[#7A6360]">{record.state}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isHigh
                              ? 'bg-[#883A2E]/15 text-[#883A2E] border border-[#883A2E]/30'
                              : isMed
                              ? 'bg-[#D65A31]/15 text-[#D65A31] border border-[#D65A31]/30'
                              : 'bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/30'
                          }`}
                        >
                          {record.crime_severity}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isClosed
                              ? 'bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/30'
                              : 'bg-[#FAF0EC] text-[#7A6360] border border-[#EEDFD9]'
                          }`}
                        >
                          {record.case_status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono ${
                            isArrested
                              ? 'bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/30'
                              : 'bg-[#FAF0EC] text-[#7A6360]'
                          }`}
                        >
                          {record.arrest_made}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="rounded-lg p-1.5 text-[#7A6360] hover:bg-[#883A2E]/10 hover:text-[#883A2E] transition-colors"
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
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-[#EEDFD9] bg-[#FAF0EC]/60 text-xs">
          <div className="text-[#7A6360] font-mono">
            Page {pagination.page} of {pagination.totalPages || 1}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page <= 1}
              className="flex items-center space-x-1 rounded-lg border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-1.5 text-[#2B1F1D] hover:bg-[#FAF0EC] disabled:opacity-40 transition-colors shadow-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center space-x-1 rounded-lg border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-1.5 text-[#2B1F1D] hover:bg-[#FAF0EC] disabled:opacity-40 transition-colors shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#542A20]/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#EEDFD9] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-md bg-[#883A2E]/15 px-2 py-0.5 text-xs font-mono font-bold text-[#883A2E] border border-[#883A2E]/30">
                    {selectedRecord.crime_id}
                  </span>
                  <h3 className="text-lg font-bold text-[#2B1F1D]">{selectedRecord.crime_type}</h3>
                </div>
                <p className="text-xs text-[#7A6360] mt-1">
                  Incident Recorded on {selectedRecord.date} ({selectedRecord.incident_day}) at {selectedRecord.time}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1.5 text-[#7A6360] hover:bg-[#FAF0EC] hover:text-[#2B1F1D] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-[#FAF0EC] p-3.5 border border-[#EEDFD9] space-y-2">
                <div className="font-bold text-[#883A2E] uppercase tracking-wider font-mono text-[10px]">
                  Spatial & Jurisdiction
                </div>
                <div><span className="text-[#7A6360]">State:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.state}</span></div>
                <div><span className="text-[#7A6360]">District:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.district || 'N/A'}</span></div>
                <div><span className="text-[#7A6360]">City / Town:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.city}</span></div>
                <div><span className="text-[#7A6360]">Exact Location:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.location}</span></div>
                <div><span className="text-[#7A6360]">Police Station:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.police_station}</span></div>
              </div>

              <div className="rounded-xl bg-[#FAF0EC] p-3.5 border border-[#EEDFD9] space-y-2">
                <div className="font-bold text-[#883A2E] uppercase tracking-wider font-mono text-[10px]">
                  Case Resolution & Status
                </div>
                <div><span className="text-[#7A6360]">Severity Level:</span> <span className="text-[#883A2E] font-bold">{selectedRecord.crime_severity}</span></div>
                <div><span className="text-[#7A6360]">Case Status:</span> <span className="text-[#2E7D32] font-semibold">{selectedRecord.case_status}</span></div>
                <div><span className="text-[#7A6360]">Arrest Made:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.arrest_made}</span></div>
                <div><span className="text-[#7A6360]">Investigation Duration:</span> <span className="text-[#2B1F1D] font-mono font-medium">{selectedRecord.investigation_days !== null ? `${selectedRecord.investigation_days} Days` : 'In Progress'}</span></div>
                <div><span className="text-[#7A6360]">Weapon Used:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.weapon_used || 'None / Not Specified'}</span></div>
              </div>

              <div className="rounded-xl bg-[#FAF0EC] p-3.5 border border-[#EEDFD9] space-y-2">
                <div className="font-bold text-[#883A2E] uppercase tracking-wider font-mono text-[10px]">
                  Victim Demographics
                </div>
                <div><span className="text-[#7A6360]">Victim Age:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.victim_age ?? 'Unspecified'}</span></div>
                <div><span className="text-[#7A6360]">Victim Gender:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.victim_gender || 'Unspecified'}</span></div>
              </div>

              <div className="rounded-xl bg-[#FAF0EC] p-3.5 border border-[#EEDFD9] space-y-2">
                <div className="font-bold text-[#883A2E] uppercase tracking-wider font-mono text-[10px]">
                  Suspect Demographics
                </div>
                <div><span className="text-[#7A6360]">Suspect Age:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.suspect_age ?? 'Unspecified'}</span></div>
                <div><span className="text-[#7A6360]">Suspect Gender:</span> <span className="text-[#2B1F1D] font-medium">{selectedRecord.suspect_gender || 'Unspecified'}</span></div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#EEDFD9]">
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl bg-[#883A2E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#542A20] shadow-sm transition-colors"
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
