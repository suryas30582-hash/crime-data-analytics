import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Database,
  Layers,
  FileText,
  RefreshCw,
  Info
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { ValidationReport } from '../types';

export const UploadPage: React.FC = () => {
  const { user } = useAuth();
  const { refreshDatasets, setActiveDatasetId } = useDataset();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const getRoleDashboardRoute = () => {
    if (user?.role === 'police') return '/police/dashboard';
    if (user?.role === 'user') return '/user/dashboard';
    if (user?.role === 'admin') return '/admin/dashboard';
    return '/dashboard';
  };

  const getRoleDashboardName = () => {
    if (user?.role === 'police') return 'Police Command Dashboard';
    if (user?.role === 'user') return 'Citizen Dashboard';
    if (user?.role === 'admin') return 'Admin Console';
    return 'Analytics Dashboard';
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [datasetName, setDatasetName] = useState<string>('');
  const [datasetDesc, setDatasetDesc] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setValidationReport(null);
      setImportSuccess(null);
      setImportError(null);
      setDatasetName(file.name.replace(/\.[^/.]+$/, ''));

      // Validate file with backend
      try {
        setIsValidating(true);
        const report = await api.validateFile(file);
        setValidationReport(report);
      } catch (err: any) {
        setImportError(err.message || 'File validation failed.');
      } finally {
        setIsValidating(false);
      }
    }
  };

  const handleCommitImport = async () => {
    if (!validationReport || validationReport.parsedValidRecords.length === 0) {
      setImportError('No valid records found in file to import.');
      return;
    }

    try {
      setIsImporting(true);
      setImportError(null);
      const res = await api.commitImport({
        datasetName: datasetName.trim() || validationReport.fileName,
        datasetDescription: datasetDesc.trim() || `Imported on ${new Date().toLocaleDateString()}`,
        records: validationReport.parsedValidRecords
      });

      setImportSuccess(res.message);
      await refreshDatasets();
      setActiveDatasetId(res.datasetId);

      // Auto redirect after 2.5s to user's primary dashboard
      setTimeout(() => {
        navigate(getRoleDashboardRoute());
      }, 2500);
    } catch (err: any) {
      setImportError(err.message || 'Import failed. Please verify the dataset structure.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#EEDFD9] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center space-x-2">
            <UploadCloud className="h-6 w-6 text-[#883A2E]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#2B1F1D] sm:text-3xl">
              {t('uploadData', 'Dataset Ingestion & Validation Engine')}
            </h1>
          </div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20 w-fit">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Centralized Sync: User • Police • Admin</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-[#7A6360]">
          Upload current or future India-wide and regional crime datasets in XLSX or CSV format. Once imported, the dataset is centrally stored and instantly becomes active for all Citizen Users, Police Officers, and Administrators.
        </p>
      </div>

      {/* Upload Box */}
      <div className="rounded-3xl border border-dashed border-[#EEDFD9] bg-[#FFFDFC] p-8 text-center shadow-sm hover:border-[#883A2E] transition-all">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#883A2E]/10 border border-[#883A2E]/20 mb-4">
          <UploadCloud className="h-8 w-8 text-[#883A2E]" />
        </div>
        <h3 className="text-base font-bold text-[#2B1F1D]">Select Crime Dataset File</h3>
        <p className="mt-1 text-xs text-[#7A6360]">Supported formats: Microsoft Excel (.xlsx, .xls) and CSV (.csv)</p>

        <label className="mt-6 inline-flex cursor-pointer items-center space-x-2 rounded-xl bg-[#883A2E] px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#542A20] transition-colors">
          <FileSpreadsheet className="h-4 w-4" />
          <span>Browse File</span>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {selectedFile && (
          <p className="mt-3 text-xs font-mono text-[#883A2E]">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Validation Loader */}
      {isValidating && (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] shadow-sm">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#883A2E] border-t-transparent" />
            <p className="text-xs text-[#7A6360] font-mono">Running 12-point integrity check on dataset...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {importError && (
        <div className="flex items-center space-x-2.5 rounded-2xl border border-rose-500/30 bg-rose-50 p-4 text-xs text-rose-800">
          <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <span>{importError}</span>
        </div>
      )}

      {/* Success Message */}
      {importSuccess && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[#2E7D32]/30 bg-[#2E7D32]/10 p-5 text-xs text-[#2E7D32] shadow-sm animate-in fade-in">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-[#2E7D32] mt-0.5" />
            <div>
              <div className="font-bold text-[#2B1F1D] text-sm">{importSuccess}</div>
              <div className="text-[11px] text-[#7A6360] mt-1 max-w-xl">
                The imported dataset is now centrally active. All Citizen, Police, and Admin dashboards, KPI cards, charts, filters, records, predictions, and reports have been automatically updated.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(getRoleDashboardRoute())}
              className="flex items-center justify-center space-x-1.5 rounded-xl bg-[#2E7D32] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#256628] transition-colors shadow-xs cursor-pointer"
            >
              <span>{getRoleDashboardName()}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center space-x-1.5 rounded-xl border border-[#2E7D32]/40 bg-[#FFFDFC] px-4 py-2.5 text-xs font-bold text-[#2E7D32] hover:bg-[#2E7D32]/10 transition-colors shadow-xs cursor-pointer"
            >
              <span>View Analytics</span>
            </button>
          </div>
        </div>
      )}

      {/* Validation Diagnostics Report */}
      {validationReport && !isValidating && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-sm">
              <div className="text-[11px] uppercase font-mono text-[#7A6360]">Total Rows</div>
              <div className="text-2xl font-bold font-mono text-[#2B1F1D] mt-1">{validationReport.totalRows.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-sm">
              <div className="text-[11px] uppercase font-mono text-[#7A6360]">Detected Columns</div>
              <div className="text-2xl font-bold font-mono text-[#883A2E] mt-1">{validationReport.columnCount} / 19</div>
            </div>
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-sm">
              <div className="text-[11px] uppercase font-mono text-[#7A6360]">Valid Records</div>
              <div className="text-2xl font-bold font-mono text-[#2E7D32] mt-1">{validationReport.validRowCount.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-sm">
              <div className="text-[11px] uppercase font-mono text-[#7A6360]">Duplicates / Warnings</div>
              <div className="text-2xl font-bold font-mono text-[#D65A31] mt-1">{validationReport.duplicateCount + validationReport.invalidRowCount}</div>
            </div>
          </div>

          {/* Missing Required Columns Check */}
          {validationReport.missingRequiredColumns.length > 0 && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold text-rose-700">
                <XCircle className="h-4 w-4" />
                <span>Missing Standard Columns Detected:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {validationReport.missingRequiredColumns.map(col => (
                  <span key={col} className="rounded bg-rose-100 px-2 py-0.5 font-mono text-[11px] text-rose-800 border border-rose-300">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Validation Warnings & Errors Section */}
          {validationReport.validationErrors.length > 0 && (
            <div className="rounded-2xl border border-[#D65A31]/30 bg-[#FAF0EC] p-4 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#EEDFD9] pb-2">
                <div className="flex items-center space-x-2 font-bold text-[#D65A31]">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Validation Warnings ({validationReport.validationErrors.length} noted)</span>
                </div>
                <span className="text-[10px] text-[#7A6360]">Non-fatal warnings will be safely normalized</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                {validationReport.validationErrors.map((err, idx) => (
                  <div key={idx} className="text-[#542A20]">
                    &bull; Row {err.row} [{err.column}]: {err.message} (Value: "{String(err.value)}")
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Preview Table */}
          <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#EEDFD9] pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#2B1F1D]">
                <FileText className="h-4 w-4 text-[#883A2E]" />
                <span>Raw File Preview (First {validationReport.previewRows.length} Rows)</span>
              </div>
              <span className="text-[10px] text-[#7A6360] font-mono">Normalized Preview</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-[#2B1F1D]">
                <thead className="bg-[#FAF0EC] border-b border-[#EEDFD9] text-[10px] uppercase font-mono text-[#7A6360]">
                  <tr>
                    {validationReport.detectedColumns.slice(0, 8).map(c => (
                      <th key={c} className="py-2 px-2.5">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEDFD9] font-sans">
                  {validationReport.previewRows.map((row, i) => (
                    <tr key={i} className="hover:bg-[#FAF0EC]/60 transition-colors">
                      {validationReport.detectedColumns.slice(0, 8).map(c => (
                        <td key={c} className="py-2 px-2.5 truncate max-w-[150px]">
                          {String(row[c] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Configuration & Confirmation Form */}
          <div className="rounded-2xl border border-[#EEDFD9] bg-[#FAF0EC] p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-[#2B1F1D]">
              <Database className="h-5 w-5 text-[#883A2E]" />
              <span>Confirm Dataset Ingestion</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#7A6360] mb-1">
                  Dataset Display Name
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={e => setDatasetName(e.target.value)}
                  placeholder="e.g. Maharashtra Crime Data 2026"
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#7A6360] mb-1">
                  Dataset Description / Source
                </label>
                <input
                  type="text"
                  value={datasetDesc}
                  onChange={e => setDatasetDesc(e.target.value)}
                  placeholder="e.g. State CID verified incident logs"
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-[#7A6360]">
                Ready to insert <strong className="text-[#2E7D32] font-mono">{validationReport.validRowCount}</strong> valid records into persistent database storage. Existing datasets will remain untouched.
              </p>

              <button
                onClick={handleCommitImport}
                disabled={isImporting || validationReport.validRowCount === 0}
                className="flex items-center space-x-2 rounded-xl bg-[#883A2E] hover:bg-[#542A20] px-6 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
              >
                <span>{isImporting ? 'Ingesting to Database...' : t('confirmImport', 'Confirm & Import to Database')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
