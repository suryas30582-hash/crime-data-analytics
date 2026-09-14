import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  Timer,
  BarChart2,
  TrendingUp,
  PieChart as PieIcon,
  MapPin,
  Calendar,
  Users,
  Shield,
  Sparkles,
  Lightbulb,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { useDataset } from '../context/DatasetContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { AnalyticsKPIs, AnalyticsCharts } from '../types';
import { StatCard } from '../components/common/StatCard';
import { FilterBar } from '../components/common/FilterBar';

const CHART_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export const DashboardPage: React.FC = () => {
  const { filters, activeDataset } = useDataset();
  const { t } = useLanguage();

  const [kpis, setKpis] = useState<AnalyticsKPIs | null>(null);
  const [charts, setCharts] = useState<AnalyticsCharts | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      setIsLoading(true);
      setError(null);
      try {
        const [kpiRes, chartRes] = await Promise.all([
          api.getKPIs(filters),
          api.getCharts(filters)
        ]);
        setKpis(kpiRes);
        setCharts(chartRes);
      } catch (err: any) {
        console.error('Analytics load error:', err);
        setError(err.message || 'Failed to load analytics data.');
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [filters]);

  const hasData = kpis && kpis.total_crimes > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t('dashboard', 'Dashboard')}
            </h1>
            <span className="rounded-md bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/20 font-mono">
              {activeDataset?.name || 'Dataset'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time multi-dimensional crime intelligence calculations from verified database records.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar showSearch={true} showCrimeType={true} showSeverity={true} showStatus={true} />

      {/* Loading State */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-[#0c1326]/50">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-xs text-slate-400 font-mono">Computing dataset analytics from database...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasData && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#0c1326]/50 p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-slate-500 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">
            {t('noDataAvailable', 'No data available for this selection.')}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md">
            No incident records match the current combination of State, District, City, Year, or Crime Type filters in the active dataset. Try resetting or adjusting your filter criteria.
          </p>
        </div>
      )}

      {/* Analytics Dashboard Content */}
      {!isLoading && hasData && kpis && charts && (
        <div className="space-y-6">
          {/* KPI Cards Grid (6 Main Requirements) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              title={t('totalCrimes', 'Total Crimes')}
              value={kpis.total_crimes}
              subtext="Recorded incidents"
              icon={ShieldAlert}
              variant="cyan"
            />
            <StatCard
              title={t('solvedCases', 'Solved Cases')}
              value={kpis.solved_cases}
              subtext={`${kpis.solve_rate_percentage}% resolution rate`}
              icon={CheckCircle2}
              variant="emerald"
            />
            <StatCard
              title={t('unsolvedCases', 'Unsolved Cases')}
              value={kpis.unsolved_cases}
              subtext={`${100 - kpis.solve_rate_percentage}% pending action`}
              icon={Clock}
              variant="crimson"
            />
            <StatCard
              title={t('arrestsMade', 'Arrests Made')}
              value={kpis.arrests_made}
              subtext={`${kpis.arrest_rate_percentage}% arrest rate`}
              icon={UserCheck}
              variant="amber"
            />
            <StatCard
              title={t('highSeverityCrimes', 'High Severity')}
              value={kpis.high_severity_crimes}
              subtext={`${Math.round((kpis.high_severity_crimes / kpis.total_crimes) * 100)}% of total cases`}
              icon={AlertTriangle}
              variant="crimson"
            />
            <StatCard
              title={t('avgInvestigationDays', 'Avg. Investigation')}
              value={`${kpis.avg_investigation_days || 0}d`}
              subtext="Days to resolution"
              icon={Timer}
              variant="violet"
            />
          </div>

          {/* Dynamic Smart Insights Computed from Real Data */}
          {(() => {
            const topCrime = charts.crimeTypeData[0];
            const topState = charts.stateData[0];
            const topCity = charts.cityData[0];
            const peakDay = charts.dayData.length > 0 ? charts.dayData.reduce((prev, curr) => curr.count > prev.count ? curr : prev, charts.dayData[0]) : null;

            return (
              <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0c1326]/90 via-[#0d1730]/90 to-[#0c1326]/90 p-5 backdrop-blur-xl shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Smart Intelligence Insights</span>
                        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-mono font-normal text-cyan-300 border border-cyan-500/30">
                          {activeDataset?.name || 'Active Dataset'} ({kpis.total_crimes.toLocaleString()} records)
                        </span>
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Dynamic Statistical Analysis</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {topCrime && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="text-[10px] uppercase font-mono text-slate-400">Predominant Offense</div>
                      <div className="text-sm font-bold text-cyan-300 mt-1 truncate">{topCrime.name}</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {topCrime.count} cases ({Math.round((topCrime.count / kpis.total_crimes) * 100)}% of total volume)
                      </p>
                    </div>
                  )}

                  {(topState || topCity) && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="text-[10px] uppercase font-mono text-slate-400">Primary Geographic Epicenter</div>
                      <div className="text-sm font-bold text-amber-300 mt-1 truncate">{topCity ? `${topCity.name} (${topCity.state})` : topState?.name}</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {topCity ? `${topCity.count} incidents registered` : `${topState?.count} incidents registered`}
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Resolution Clearance</div>
                    <div className="text-sm font-bold text-emerald-300 mt-1">
                      {kpis.solve_rate_percentage}% Solved ({kpis.arrest_rate_percentage}% Arrests)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {kpis.solved_cases} solved vs {kpis.unsolved_cases} pending investigation
                    </p>
                  </div>

                  {peakDay && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="text-[10px] uppercase font-mono text-slate-400">Peak Incident Window</div>
                      <div className="text-sm font-bold text-violet-300 mt-1">{peakDay.name}s</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {peakDay.count} cases ({Math.round((peakDay.count / kpis.total_crimes) * 100)}% of weekly volume)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Row 1: State & Crime Type Analysis */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* State-wise Crime Distribution */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">State / Regional Crime Distribution</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Top Jurisdictions</span>
              </div>
              <div className="h-72 w-full">
                {charts.stateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.stateData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#090e1e', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                        formatter={(val: any) => [`${val} Crimes`, 'Incident Count']}
                      />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-500 text-center pt-24">{t('noDataAvailable', 'No data available for this selection.')}</p>
                )}
              </div>
            </div>

            {/* Crime Type Distribution */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <PieIcon className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Crime Type Breakdown</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Classification</span>
              </div>
              <div className="h-72 w-full">
                {charts.crimeTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.crimeTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="count"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {charts.crimeTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#090e1e', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                        formatter={(val: any) => [`${val} Incidents`, 'Count']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-500 text-center pt-24">{t('noDataAvailable', 'No data available for this selection.')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Year-wise & Monthly Trend Analysis */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Year-wise Crime Trend */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Year-wise Crime & Resolution Trend</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Annual Trajectory</span>
              </div>
              <div className="h-72 w-full">
                {charts.yearData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.yearData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="crimeColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="solvedColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#090e1e', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Area type="monotone" dataKey="count" name="Total Incidents" stroke="#0ea5e9" fillOpacity={1} fill="url(#crimeColor)" />
                      <Area type="monotone" dataKey="solved" name="Solved Cases" stroke="#10b981" fillOpacity={1} fill="url(#solvedColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-500 text-center pt-24">{t('noDataAvailable', 'No data available for this selection.')}</p>
                )}
              </div>
            </div>

            {/* City-wise Comparison */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <BarChart2 className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">City-wise Crime Frequency</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Top Cities</span>
              </div>
              <div className="h-72 w-full">
                {charts.cityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.cityData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: '#090e1e', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-500 text-center pt-24">{t('noDataAvailable', 'No data available for this selection.')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Severity, Arrests & Incident Day Breakdown */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Crime Severity */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">Crime Severity</h3>
                <span className="text-[10px] text-slate-500 font-mono">Distribution</span>
              </div>
              <div className="space-y-3 pt-2">
                {charts.severityData.map((s, idx) => {
                  const pct = Math.round((s.count / kpis.total_crimes) * 100);
                  const isHigh = s.name.toLowerCase() === 'high';
                  const isMed = s.name.toLowerCase() === 'medium';
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-300">{s.name} Severity</span>
                        <span className="text-slate-400 font-mono">{s.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Case Status Distribution */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">Case Status</h3>
                <span className="text-[10px] text-slate-500 font-mono">Status Quo</span>
              </div>
              <div className="space-y-3 pt-2">
                {charts.caseStatusData.map((cs, idx) => {
                  const pct = Math.round((cs.count / kpis.total_crimes) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-300">{cs.name}</span>
                        <span className="text-slate-400 font-mono">{cs.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Incident Day of Week */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">Incident Day Pattern</h3>
                <span className="text-[10px] text-slate-500 font-mono">Temporal</span>
              </div>
              <div className="space-y-2 pt-1">
                {charts.dayData.map((d, idx) => {
                  const pct = Math.round((d.count / kpis.total_crimes) * 100);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{d.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-violet-500" style={{ width: `${pct * 3}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 w-10 text-right">{d.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 4: Top Police Stations & Weapons */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Police Stations Workload */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Police Station Case Volume</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Top Stations</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                    <tr>
                      <th className="py-2">Police Station</th>
                      <th className="py-2">Jurisdiction</th>
                      <th className="py-2 text-right">Recorded Cases</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {charts.policeStationData.slice(0, 6).map((ps, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2 font-medium text-slate-200">{ps.name}</td>
                        <td className="py-2 text-slate-400">{ps.city}</td>
                        <td className="py-2 text-right font-mono text-cyan-400 font-semibold">{ps.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weapon Used Distribution */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Weapons / Modus Operandi</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Observed in Records</span>
              </div>
              <div className="space-y-2.5">
                {charts.weaponData.slice(0, 6).map((w, idx) => {
                  const pct = Math.round((w.count / kpis.total_crimes) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">{w.name}</span>
                        <span className="text-slate-400 font-mono">{w.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-rose-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
