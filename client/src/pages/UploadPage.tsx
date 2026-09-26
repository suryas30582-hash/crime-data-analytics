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
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { ValidationReport } from '../types';

export const UploadPage: React.FC = () => {
  const { refreshDatasets, setActiveDatasetId } = useDataset();
  const { t } = useLanguage();
  const navigate = useNavigate();

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

      // Auto redirect after 2s
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setImportError(err.message || 'Import failed. Please verify the dataset structure.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <UploadCloud className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t('uploadData', 'Dataset Ingestion & Validation Engine')}
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Upload current or future India-wide and regional crime datasets in XLSX or CSV format. Our engine validates columns, checks data integrity, and registers records into the database.
        </p>
      </div>

      {/* Upload Box */}
      <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0c1326]/60 p-8 text-center backdrop-blur-xl hover:border-cyan-500/50 transition-all">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
          <UploadCloud className="h-8 w-8 text-cyan-400" />
        </div>
        <h3 className="text-base font-bold text-white">Select Crime Dataset File</h3>
        <p className="mt-1 text-xs text-slate-400">Supported formats: Microsoft Excel (.xlsx, .xls) and CSV (.csv)</p>

        <label className="mt-6 inline-flex cursor-pointer items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all">
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
          <p className="mt-3 text-xs font-mono text-cyan-400">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Validation Loader */}
      {isValidating && (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-800 bg-[#0c1326]/50">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-xs text-slate-400 font-mono">Running 12-point integrity check on dataset...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {importError && (
        <div className="flex items-center space-x-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{importError}</span>
        </div>
      )}

      {/* Success Message */}
      {importSuccess && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-200 backdrop-blur-xl shadow-lg shadow-emerald-950/40 animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <div className="font-bold text-white text-sm">{importSuccess}</div>
              <div className="text-[11px] text-emerald-300/80 mt-0.5">
                The imported dataset is now active. All KPI cards, charts, filters, records, predictions, and reports have been updated.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-500 shrink-0 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <span>Open Dashboard Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Validation Diagnostics Report */}
      {validationReport && !isValidating && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-4">
              <div className="text-[11px] uppercase font-mono text-slate-400">Total Rows</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">{validationReport.totalRows.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-4">
              <div className="text-[11px] uppercase font-mono text-slate-400">Detected Columns</div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{validationReport.columnCount} / 19</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-4">
              <div className="text-[11px] uppercase font-mono text-slate-400">Valid Records</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{validationReport.validRowCount.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-4">
              <div className="text-[11px] uppercase font-mono text-slate-400">Duplicates / Warnings</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{validationReport.duplicateCount + validationReport.invalidRowCount}</div>
            </div>
          </div>

          {/* Missing Required Columns Check */}
          {validationReport.missingRequiredColumns.length > 0 && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold text-rose-400">
                <XCircle className="h-4 w-4" />
                <span>Missing Standard Columns Detected:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {validationReport.missingRequiredColumns.map(col => (
                  <span key={col} className="rounded bg-rose-950 px-2 py-0.5 font-mono text-[11px] text-rose-300 border border-rose-800">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Validation Warnings & Errors Section */}
          {validationReport.validationErrors.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <div className="flex items-center space-x-2 font-bold text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Validation Warnings ({validationReport.validationErrors.length} noted)</span>
                </div>
                <span className="text-[10px] text-slate-400">Non-fatal warnings will be safely normalized</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                {validationReport.validationErrors.map((err, idx) => (
                  <div key={idx} className="text-slate-300">
                    &bull; Row {err.row} [{err.column}]: {err.message} (Value: "{String(err.value)}")
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Preview Table */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-4 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <FileText className="h-4 w-4 text-cyan-400" />
                <span>Raw File Preview (First {validationReport.previewRows.length} Rows)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Normalized Preview</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-slate-300">
                <thead className="bg-[#090e1f] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                  <tr>
                    {validationReport.detectedColumns.slice(0, 8).map(c => (
                      <th key={c} className="py-2 px-2.5">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {validationReport.previewRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
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
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-blue-950/20 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-white">
              <Database className="h-5 w-5 text-cyan-400" />
              <span>Confirm Dataset Ingestion</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dataset Display Name
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={e => setDatasetName(e.target.value)}
                  placeholder="e.g. Maharashtra Crime Data 2026"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dataset Description / Source
                </label>
                <input
                  type="text"
                  value={datasetDesc}
                  onChange={e => setDatasetDesc(e.target.value)}
                  placeholder="e.g. State CID verified incident logs"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-slate-400">
                Ready to insert <strong className="text-emerald-400 font-mono">{validationReport.validRowCount}</strong> valid records into persistent database storage. Existing datasets will remain untouched.
              </p>

              <button
                onClick={handleCommitImport}
                disabled={isImporting || validationReport.validRowCount === 0}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 transition-all cursor-pointer"
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
