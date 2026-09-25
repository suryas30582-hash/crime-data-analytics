import React, { useState, useEffect } from 'react';
import { MapPin, TrendingUp, ShieldAlert, BarChart3, ArrowUpDown, CheckCircle2 } from 'lucide-react';
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

export const StateAnalyticsPage: React.FC = () => {
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
        console.error('Failed to load state analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [filters]);

  const stateData = charts?.stateData || [];
  const cityData = charts?.cityData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#EEDFD9] pb-4">
        <div className="flex items-center space-x-2">
          <MapPin className="h-6 w-6 text-[#883A2E]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#2B1F1D] sm:text-3xl">
            {t('stateCityAnalytics', 'State & City Analytics')}
          </h1>
        </div>
        <p className="mt-1 text-xs text-[#7A6360]">
          Comparative spatial crime intelligence across Indian States, Union Territories and Urban Centers.
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar showSearch={false} showCrimeType={true} />

      {/* Loading */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] shadow-sm">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#883A2E] border-t-transparent" />
            <p className="text-xs text-[#7A6360] font-mono">Loading state & city metrics...</p>
          </div>
        </div>
      )}

      {/* State & City Visualizations */}
      {!isLoading && (
        <div className="space-y-6">
          {/* Main State Comparison Chart */}
          <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6 border-b border-[#EEDFD9] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#2B1F1D]">State-by-State Crime Volume Comparison</h2>
                <p className="text-xs text-[#7A6360]">Comparing total verified incident cases across state jurisdictions</p>
              </div>
              <span className="rounded-full bg-[#883A2E]/10 px-3 py-1 text-xs font-mono text-[#883A2E] border border-[#883A2E]/20">
                {stateData.length} States / UTs with records
              </span>
            </div>

            <div className="h-80 w-full">
              {stateData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stateData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E4DE" />
                    <XAxis dataKey="name" stroke="#7A6360" tick={{ fontSize: 10, fill: '#7A6360' }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis stroke="#7A6360" tick={{ fontSize: 10, fill: '#7A6360' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFDFC', borderColor: '#EEDFD9', borderRadius: '12px', fontSize: '11px', color: '#2B1F1D', boxShadow: '0 4px 15px rgba(84, 42, 32, 0.08)' }}
                      formatter={(val: any) => [`${val} Cases`, 'Recorded Incidents']}
                    />
                    <Bar
                      dataKey="count"
                      fill="#883A2E"
                      radius={[4, 4, 0, 0]}
                      onClick={(data) => {
                        if (data && data.name) updateFilter('state', data.name);
                      }}
                      className="cursor-pointer"
                    >
                      {stateData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === filters.state ? '#D65A31' : '#883A2E'}
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
              Tip: Click on any State bar to instantly filter down the entire platform to that State.
            </p>
          </div>

          {/* City Analysis & Rankings Table */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Cities Chart */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm">
              <div className="mb-4 border-b border-[#EEDFD9] pb-3">
                <h3 className="text-sm font-bold text-[#2B1F1D]">Top Urban Center Hotspots</h3>
                <p className="text-xs text-[#7A6360]">High-volume metropolitan & municipal areas</p>
              </div>
              <div className="h-72 w-full">
                {cityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cityData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0E4DE" />
                      <XAxis type="number" stroke="#7A6360" tick={{ fontSize: 10, fill: '#7A6360' }} />
                      <YAxis type="category" dataKey="name" stroke="#7A6360" tick={{ fontSize: 10, fill: '#7A6360' }} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFDFC', borderColor: '#EEDFD9', borderRadius: '12px', fontSize: '11px', color: '#2B1F1D', boxShadow: '0 4px 15px rgba(84, 42, 32, 0.08)' }} />
                      <Bar dataKey="count" fill="#D65A31" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-[#7A6360] text-center pt-24">{t('noDataAvailable', 'No data available for this selection.')}</p>
                )}
              </div>
            </div>

            {/* Jurisdiction Breakdown List */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm">
              <div className="mb-4 border-b border-[#EEDFD9] pb-3">
                <h3 className="text-sm font-bold text-[#2B1F1D]">State Jurisdiction Ranking</h3>
                <p className="text-xs text-[#7A6360]">Ranking by total recorded crime volume</p>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs text-[#2B1F1D]">
                  <thead className="sticky top-0 bg-[#FAF0EC] border-b border-[#EEDFD9] text-[10px] uppercase tracking-wider text-[#7A6360] font-mono">
                    <tr>
                      <th className="py-2 px-2">#</th>
                      <th className="py-2">State / UT</th>
                      <th className="py-2 text-right">Crimes</th>
                      <th className="py-2 text-right px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEDFD9]">
                    {stateData.map((st: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#FAF0EC] transition-colors">
                        <td className="py-2.5 px-2 font-mono text-[#7A6360]">{idx + 1}</td>
                        <td className="py-2.5 font-medium text-[#2B1F1D]">{st.name}</td>
                        <td className="py-2.5 text-right font-mono text-[#883A2E] font-semibold">{st.count}</td>
                        <td className="py-2.5 text-right px-2">
                          <button
                            onClick={() => updateFilter('state', st.name)}
                            className="rounded bg-[#883A2E]/10 px-2 py-1 text-[10px] text-[#883A2E] hover:bg-[#883A2E]/20 font-medium transition-colors"
                          >
                            Filter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
