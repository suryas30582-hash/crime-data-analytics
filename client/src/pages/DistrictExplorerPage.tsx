import React, { useState, useEffect } from 'react';
import { Compass, MapPin, Building, ShieldCheck, Filter } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { useDataset } from '../context/DatasetContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { FilterBar } from '../components/common/FilterBar';

export const DistrictExplorerPage: React.FC = () => {
  const { filters, updateFilter } = useDataset();
  const { t } = useLanguage();

  const [charts, setCharts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await api.getCharts(filters);
        setCharts(res);
      } catch (err) {
        console.error('Failed to load district data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [filters]);

  const districtData = charts?.districtData || [];
  const policeStationData = charts?.policeStationData || [];
  const crimeTypeData = charts?.crimeTypeData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <Compass className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t('districtExplorer', 'District Explorer')}
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Hyper-local district & police station intelligence, case density, and local enforcement performance.
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar showSearch={false} showCrimeType={true} />

      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-[#0c1326]/50">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-xs text-slate-400 font-mono">Loading district level metrics...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {/* District Breakdown Chart */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6 border-b border-slate-800/80 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">District-wise Recorded Incidents</h2>
                <p className="text-xs text-slate-400">Comparing total cases across administrative districts</p>
              </div>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-mono text-cyan-400 border border-cyan-500/20">
                {districtData.length} Districts Analyzed
              </span>
            </div>

            <div className="h-80 w-full">
              {districtData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090e1e', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                      formatter={(val: any) => [`${val} Cases`, 'Total Incidents']}
                    />
                    <Bar
                      dataKey="count"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      onClick={(data) => {
                        if (data && data.name) updateFilter('district', data.name);
                      }}
                      className="cursor-pointer"
                    >
                      {districtData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === filters.district ? '#f43f5e' : '#8b5cf6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  {t('noDataAvailable', 'No data available for this selection.')}
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 text-center font-mono">
              Click on any District bar to filter down to that specific district.
            </p>
          </div>

          {/* District Crime Types & Local Police Stations */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Local Crime Types */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
              <div className="mb-4 border-b border-slate-800/80 pb-3">
                <h3 className="text-sm font-bold text-white">Dominant District Crime Types</h3>
                <p className="text-xs text-slate-400">Incident breakdown in currently filtered jurisdiction</p>
              </div>
              <div className="space-y-3">
                {crimeTypeData.slice(0, 6).map((ct: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="font-medium text-slate-200">{ct.name}</span>
                    <span className="font-mono text-cyan-400 font-bold">{ct.count} Cases</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Local Police Station Workload */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
              <div className="mb-4 border-b border-slate-800/80 pb-3">
                <h3 className="text-sm font-bold text-white">Police Station Case Registry</h3>
                <p className="text-xs text-slate-400">Cases registered per police station division</p>
              </div>
              <div className="space-y-3">
                {policeStationData.slice(0, 6).map((ps: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div>
                      <div className="font-medium text-slate-200">{ps.name}</div>
                      <div className="text-[10px] text-slate-400">{ps.city}</div>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">{ps.count} Incidents</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
