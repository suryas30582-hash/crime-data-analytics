import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  MapPin,
  Calendar,
  Clock,
  ShieldAlert,
  Compass,
  Layers,
  Activity,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useDataset } from '../context/DatasetContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { FilterBar } from '../components/common/FilterBar';

const PALETTE = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'];

export const AnalyticsModelsPage: React.FC = () => {
  const { filters, activeDataset } = useDataset();
  const { t } = useLanguage();

  const [charts, setCharts] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeModelTab, setActiveModelTab] = useState<'trends' | 'spatial' | 'crime-types' | 'year-wise' | 'temporal' | 'predictions'>('trends');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [chartRes, predRes, kpiRes] = await Promise.all([
          api.getCharts(filters),
          api.getPredictions(filters),
          api.getKPIs(filters)
        ]);
        setCharts(chartRes);
        setPredictions(predRes);
        setKpis(kpiRes);
      } catch (err) {
        console.error('Failed to load analytics models data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [filters]);

  const hasData = kpis && kpis.total_crimes > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Analytics Models & Advanced Crime Intelligence
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Multi-model mathematical trends, spatial hierarchies, temporal patterns, severity matrices, and statistical forecasts computed strictly from real dataset records.
          </p>
        </div>

        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-mono text-cyan-400 border border-cyan-500/20 self-start sm:self-auto">
          Active Store: {activeDataset?.name || 'Dataset'}
        </span>
      </div>

      {/* Filter Bar */}
      <FilterBar showSearch={true} showCrimeType={true} showSeverity={true} showStatus={true} />

      {/* Analytics Model Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveModelTab('trends')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeModelTab === 'trends'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>1. Crime Trends</span>
        </button>

        <button
          onClick={() => setActiveModelTab('spatial')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeModelTab === 'spatial'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>2. State, District & City</span>
        </button>

        <button
          onClick={() => setActiveModelTab('crime-types')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeModelTab === 'crime-types'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <PieIcon className="h-4 w-4" />
          <span>3. Crime Type & Severity</span>
        </button>

        <button
          onClick={() => setActiveModelTab('year-wise')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeModelTab === 'year-wise'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>4. Year-Wise & Monthly</span>
        </button>

        <button
          onClick={() => setActiveModelTab('temporal')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeModelTab === 'temporal'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>5. Time & Day Patterns</span>
        </button>

        <button
          onClick={() => setActiveModelTab('predictions')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeModelTab === 'predictions'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>6. Data-Based Predictions</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-[#0c1326]/50">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-xs text-slate-400 font-mono">Running analytical models on active dataset...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasData && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-[#0c1326]/50 p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-slate-500 mb-3" />
          <h3 className="text-base font-bold text-slate-300">
            {t('noDataAvailable', 'No data available for this selection.')}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md">
            No verified crime records exist for the selected combination of filters.
          </p>
        </div>
      )}

      {/* Section 1: Crime Trends */}
      {!isLoading && hasData && activeModelTab === 'trends' && charts && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-4">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Total Sample Analyzed</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">{kpis.total_crimes.toLocaleString()} Cases</div>
              <div className="text-[11px] text-cyan-400 mt-0.5">100% Verified Real Data</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-4">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Clearance Efficiency</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{kpis.solve_rate_percentage}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{kpis.solved_cases} cases closed/solved</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-4">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Enforcement Detention Rate</div>
              <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{kpis.arrest_rate_percentage}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{kpis.arrests_made} suspect arrests</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Longitudinal Crime Incident & Arrest Trajectory</h3>
                <p className="text-xs text-slate-400">Comparing total crime incidence against law enforcement arrest curves</p>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.yearData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="crimeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="arrestGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#090e1e', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="count" name="Total Crimes" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#crimeGrad)" />
                  <Area type="monotone" dataKey="arrests" name="Arrests Made" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#arrestGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: State, District and City Analysis */}
      {!isLoading && hasData && activeModelTab === 'spatial' && charts && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">State-Level Concentration</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.stateData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#090e1e', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">District & City Concentration</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.cityData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#090e1e', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Crime Type and Severity Analysis */}
      {!isLoading && hasData && activeModelTab === 'crime-types' && charts && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">Crime Type Categorical Share</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.crimeTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="count"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {charts.crimeTypeData.map((_: any, idx: number) => (
                        <Cell key={`c-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#090e1e', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">Severity Distribution Profile</h3>
              <div className="space-y-4 pt-2">
                {charts.severityData.map((s: any, idx: number) => {
                  const pct = Math.round((s.count / kpis.total_crimes) * 100);
                  const isHigh = s.name.toLowerCase() === 'high';
                  const isMed = s.name.toLowerCase() === 'medium';
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-200">{s.name} Severity</span>
                        <span className="text-slate-400 font-mono">{s.count} Incidents ({pct}%)</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Year-wise Analysis */}
      {!isLoading && hasData && activeModelTab === 'year-wise' && charts && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">Seasonal Month-Wise Incident Distribution</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.monthData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#090e1e', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                  <Bar dataKey="count" name="Incidents" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Time and Incident-Day Patterns */}
      {!isLoading && hasData && activeModelTab === 'temporal' && charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">Incident Day of the Week</h3>
            <div className="space-y-3">
              {charts.dayData.map((d: any, idx: number) => {
                const pct = Math.round((d.count / kpis.total_crimes) * 100);
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium w-24">{d.name}</span>
                    <div className="flex-1 mx-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct * 4}%` }} />
                    </div>
                    <span className="font-mono text-cyan-400 font-bold w-12 text-right">{d.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">Diurnal Time Slots Analysis</h3>
            <div className="space-y-3">
              {predictions?.timeSlots ? (
                predictions.timeSlots.map((ts: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-200 font-medium">{ts.slot}</span>
                    <span className="font-mono text-amber-300 font-bold">{ts.count} Incidents</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Temporal time slots computed from timestamp records.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section 6: Data-Based Predictions */}
      {!isLoading && hasData && activeModelTab === 'predictions' && predictions && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-5">
              <div className="text-[11px] uppercase font-mono text-slate-400">Projected Next Period Volume</div>
              <div className="text-3xl font-bold font-mono text-cyan-400 mt-1">~{predictions.projectedNextPeriodCrimes} Cases</div>
              <p className="text-[11px] text-slate-500 mt-1">Linear regression time-series forecast</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-5">
              <div className="text-[11px] uppercase font-mono text-slate-400">Timeline Growth Index</div>
              <div className={`text-3xl font-bold font-mono mt-1 ${predictions.growthRate > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {predictions.growthRate > 0 ? `+${predictions.growthRate}%` : `${predictions.growthRate}%`}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Calculated velocity across intervals</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-5">
              <div className="text-[11px] uppercase font-mono text-slate-400">Predicted Case Clearance</div>
              <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">{predictions.solveProbability}%</div>
              <p className="text-[11px] text-slate-500 mt-1">Probability based on historical clearances</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">High-Risk Spatial Hotspots Identified by Model</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {predictions.topLocations?.map((loc: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{loc.location}</div>
                    <div className="text-[10px] text-slate-400">{loc.city}, {loc.state}</div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-rose-400 font-bold">{loc.incident_count} Cases</span>
                    <div className="text-[10px] text-slate-500">{loc.incident_share}% share</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
