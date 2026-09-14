import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Database,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { Dataset } from '../types';

export const AdminPage: React.FC = () => {
  const { datasets, refreshDatasets, activeDatasetId, setActiveDatasetId } = useDataset();
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDatasetDetails, setSelectedDatasetDetails] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDeleteDataset = async (dataset: Dataset) => {
    if (dataset.is_default === 1) {
      alert('The primary default dataset cannot be removed.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete dataset "${dataset.name}" and all its records?`)) {
      return;
    }

    try {
      setIsLoading(true);
      setActionError(null);
      const res = await api.deleteDataset(dataset.id);
      setActionMessage(res.message);
      await refreshDatasets();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectDataset = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await api.getDatasetById(id);
      setSelectedDatasetDetails(res);
    } catch (err: any) {
      console.error('Failed to load dataset details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-6 w-6 text-amber-400" />
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t('adminPanel', 'Administrative Dataset Control')}
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Supervisory portal for managing relational crime stores, auditing ingestion pipelines, and inspecting dataset integrity.
        </p>
      </div>

      {actionMessage && (
        <div className="flex items-center space-x-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center space-x-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Datasets Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Registered Crime Intelligence Datasets</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">{datasets.length} Total Registered Datasets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Dataset Name</th>
                <th className="py-2.5 px-3">Verified Records</th>
                <th className="py-2.5 px-3">Jurisdictions</th>
                <th className="py-2.5 px-3">Year Span</th>
                <th className="py-2.5 px-3">Registered By</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {datasets.map(ds => (
                <tr key={ds.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white flex items-center space-x-2">
                      <span>{ds.name}</span>
                      {ds.is_default === 1 && (
                        <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[9px] font-mono text-cyan-400 border border-cyan-800/50">
                          Default
                        </span>
                      )}
                      {ds.id === activeDatasetId && (
                        <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-800/50">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 max-w-sm truncate">{ds.description}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                    {ds.actual_record_count?.toLocaleString()} Rows
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {ds.state_count || 0} States &bull; {ds.city_count || 0} Cities
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {ds.min_year ? `${ds.min_year} - ${ds.max_year}` : 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {ds.created_by || 'System'}
                  </td>
                  <td className="py-3 px-3 text-right space-x-2">
                    <button
                      onClick={() => handleInspectDataset(ds.id)}
                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      Audit
                    </button>
                    {ds.id !== activeDatasetId && (
                      <button
                        onClick={() => setActiveDatasetId(ds.id)}
                        className="rounded-lg bg-cyan-500/20 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/30"
                      >
                        Activate
                      </button>
                    )}
                    {ds.is_default !== 1 && (
                      <button
                        onClick={() => handleDeleteDataset(ds)}
                        className="rounded-lg bg-rose-950/40 p-1.5 text-rose-400 hover:bg-rose-900/60"
                        title="Delete Dataset"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dataset Audit Details Modal / Panel */}
      {selectedDatasetDetails && (
        <div className="rounded-2xl border border-cyan-500/30 bg-[#0c1429] p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">{selectedDatasetDetails.dataset.name}</h3>
              <p className="text-xs text-slate-400">Dataset ID: <span className="font-mono text-cyan-400">{selectedDatasetDetails.dataset.id}</span></p>
            </div>
            <button
              onClick={() => setSelectedDatasetDetails(null)}
              className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
            >
              Close Audit
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Total Records:</span>
              <div className="text-lg font-bold text-white">{selectedDatasetDetails.stats.total_records?.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Unique States:</span>
              <div className="text-lg font-bold text-cyan-400">{selectedDatasetDetails.stats.total_states}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Unique Cities:</span>
              <div className="text-lg font-bold text-emerald-400">{selectedDatasetDetails.stats.total_cities}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Crime Classifications:</span>
              <div className="text-lg font-bold text-amber-300">{selectedDatasetDetails.stats.total_crime_types}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
