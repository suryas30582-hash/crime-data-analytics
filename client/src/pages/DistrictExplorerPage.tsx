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
      <div className="border-b border-[#EEDFD9] pb-4">
        <div className="flex items-center space-x-2">
          <Compass className="h-6 w-6 text-[#883A2E]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#2B1F1D] sm:text-3xl">
            {t('districtExplorer', 'District Explorer')}
          </h1>
        </div>
        <p className="mt-1 text-xs text-[#7A6360]">
          Hyper-local district & police station intelligence, case density, and local enforcement performance.
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar showSearch={false} showCrimeType={true} />

      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] shadow-sm">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#883A2E] border-t-transparent" />
            <p className="text-xs text-[#7A6360] font-mono">Loading district level metrics...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {/* District Breakdown Chart */}
          <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6 border-b border-[#EEDFD9] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#2B1F1D]">District-wise Recorded Incidents</h2>
                <p className="text-xs text-[#7A6360]">Comparing total cases across administrative districts</p>
              </div>
              <span className="rounded-full bg-[#883A2E]/10 px-3 py-1 text-xs font-mono text-[#883A2E] border border-[#883A2E]/20">
                {districtData.length} Districts Analyzed
              </span>
            </div>

            <div className="h-80 w-full">
              {districtData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E4DE" />
                    <XAxis dataKey="name" stroke="#7A6360" tick={{ fontSize: 10, fill: '#7A6360' }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis stroke="#7A6360" tick={{ fontSize: 10, fill: '#7A6360' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFDFC', borderColor: '#EEDFD9', borderRadius: '12px', fontSize: '11px', color: '#2B1F1D', boxShadow: '0 4px 15px rgba(84, 42, 32, 0.08)' }}
                      formatter={(val: any) => [`${val} Cases`, 'Total Incidents']}
                    />
                    <Bar
                      dataKey="count"
                      fill="#883A2E"
                      radius={[4, 4, 0, 0]}
                      onClick={(data) => {
                        if (data && data.name) updateFilter('district', data.name);
                      }}
                      className="cursor-pointer"
                    >
                      {districtData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === filters.district ? '#D65A31' : '#883A2E'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#7A6360]">
                  {t('noDataAvailable', 'No data available for this selection.')}
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[#7A6360] text-center font-mono">
              Click on any District bar to filter down to that specific district.
            </p>
          </div>

          {/* District Crime Types & Local Police Stations */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Local Crime Types */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm">
              <div className="mb-4 border-b border-[#EEDFD9] pb-3">
                <h3 className="text-sm font-bold text-[#2B1F1D]">Dominant District Crime Types</h3>
                <p className="text-xs text-[#7A6360]">Incident breakdown in currently filtered jurisdiction</p>
              </div>
              <div className="space-y-3">
                {crimeTypeData.slice(0, 6).map((ct: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#FAF0EC] border border-[#EEDFD9]">
                    <span className="font-medium text-[#2B1F1D]">{ct.name}</span>
                    <span className="font-mono text-[#883A2E] font-bold">{ct.count} Cases</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Local Police Station Workload */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm">
              <div className="mb-4 border-b border-[#EEDFD9] pb-3">
                <h3 className="text-sm font-bold text-[#2B1F1D]">Police Station Case Registry</h3>
                <p className="text-xs text-[#7A6360]">Cases registered per police station division</p>
              </div>
              <div className="space-y-3">
                {policeStationData.slice(0, 6).map((ps: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#FAF0EC] border border-[#EEDFD9]">
                    <div>
                      <div className="font-medium text-[#2B1F1D]">{ps.name}</div>
                      <div className="text-[10px] text-[#7A6360]">{ps.city}</div>
                    </div>
                    <span className="font-mono text-[#2E7D32] font-bold">{ps.count} Incidents</span>
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
