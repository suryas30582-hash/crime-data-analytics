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

const CHART_COLORS = ['#883A2E', '#D65A31', '#C47A5A', '#542A20', '#2E7D32', '#7A6360', '#BA461F', '#A95E3E', '#62251B'];

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EEDFD9] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#2B1F1D] sm:text-3xl">
              {t('dashboard', 'Dashboard')}
            </h1>
            <span className="rounded-md bg-[#883A2E]/10 px-2.5 py-0.5 text-xs font-semibold text-[#883A2E] border border-[#883A2E]/20 font-mono">
              {activeDataset?.name || 'Dataset'}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#7A6360]">
            Real-time multi-dimensional crime intelligence calculations from verified database records.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar showSearch={true} showCrimeType={true} showSeverity={true} showStatus={true} />

      {/* Loading State */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] shadow-warm-sm">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#883A2E] border-t-transparent" />
            <p className="text-xs text-[#7A6360] font-mono">Computing dataset analytics from database...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasData && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-8 text-center shadow-warm-sm">
          <ShieldAlert className="h-12 w-12 text-[#7A6360] mb-3" />
          <h3 className="text-base font-semibold text-[#2B1F1D]">
            {t('noDataAvailable', 'No data available for this selection.')}
          </h3>
          <p className="mt-1 text-xs text-[#7A6360] max-w-md">
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
              <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-warm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEDFD9] pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#883A2E]/10 border border-[#883A2E]/20">
                      <Sparkles className="h-4 w-4 text-[#883A2E]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#2B1F1D] flex items-center gap-2">
                        <span>Smart Intelligence Insights</span>
                        <span className="rounded-full bg-[#883A2E]/10 px-2 py-0.5 text-[10px] font-mono font-normal text-[#883A2E] border border-[#883A2E]/20">
                          {activeDataset?.name || 'Active Dataset'} ({kpis.total_crimes.toLocaleString()} records)
                        </span>
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-[#7A6360]">
                    <Zap className="h-3.5 w-3.5 text-[#D65A31]" />
                    <span>Dynamic Statistical Analysis</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {topCrime && (
                    <div className="rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] p-3 shadow-warm-sm">
                      <div className="text-[10px] uppercase font-mono text-[#7A6360]">Predominant Offense</div>
                      <div className="text-sm font-bold text-[#883A2E] mt-1 truncate">{topCrime.name}</div>
                      <p className="text-[11px] text-[#7A6360] mt-0.5">
                        {topCrime.count} cases ({Math.round((topCrime.count / kpis.total_crimes) * 100)}% of total volume)
                      </p>
                    </div>
                  )}

                  {(topState || topCity) && (
                    <div className="rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] p-3 shadow-warm-sm">
                      <div className="text-[10px] uppercase font-mono text-[#7A6360]">Primary Geographic Epicenter</div>
                      <div className="text-sm font-bold text-[#D65A31] mt-1 truncate">{topCity ? `${topCity.name} (${topCity.state})` : topState?.name}</div>
                      <p className="text-[11px] text-[#7A6360] mt-0.5">
                        {topCity ? `${topCity.count} incidents registered` : `${topState?.count} incidents registered`}
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] p-3 shadow-warm-sm">
                    <div className="text-[10px] uppercase font-mono text-[#7A6360]">Resolution Clearance</div>
                    <div className="text-sm font-bold text-[#2E7D32] mt-1">
                      {kpis.solve_rate_percentage}% Solved ({kpis.arrest_rate_percentage}% Arrests)
                    </div>
                    <p className="text-[11px] text-[#7A6360] mt-0.5">
                      {kpis.solved_cases} solved vs {kpis.unsolved_cases} pending investigation
                    </p>
                  </div>

                  {peakDay && (
                    <div className="rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] p-3 shadow-warm-sm">
                      <div className="text-[10px] uppercase font-mono text-[#7A6360]">Peak Incident Window</div>
                      <div className="text-sm font-bold text-[#542A20] mt-1">{peakDay.name}s</div>
                      <p className="text-[11px] text-[#7A6360] mt-0.5">
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
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-warm">
              <div className="flex items-center justify-between mb-4 border-b border-[#EEDFD9] pb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-[#883A2E]" />
                  <h3 className="text-sm font-bold text-[#2B1F1D]">State / Regional Crime Distribution</h3>
                </div>
                <span className="text-[11px] text-[#7A6360] font-mono">Top Jurisdictions</span>
              </div>
              <div className="h-72 w-full">
                {charts.stateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.stateData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0E4DE" />
                      <XAxis dataKey="name" stroke="#7A6360" tick={{ fontSize: 10, fill: '#7A6360' }} angle={-35} textAnchor="end" />
                      <YAxis stroke="#7A6360" tick={{ fontSize: 10, fill: '#7A6360' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFDFC', borderColor: '#EEDFD9', borderRadius: '12px', fontSize: '11px', color: '#2B1F1D', boxShadow: '0 4px 15px rgba(84, 42, 32, 0.08)' }}
                        formatter={(val: any) => [`${val} Crimes`, 'Incident Count']}
                      />
                      <Bar dataKey="count" fill="#883A2E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-[#7A6360] text-center pt-24">{t('noDataAvailable', 'No data available for this selection.')}</p>
                )}
              </div>
            </div>

            {/* Crime Type Distribution */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-warm">
              <div className="flex items-center justify-between mb-4 border-b border-[#EEDFD9] pb-3">
                <div className="flex items-center space-x-2">
                  <PieIcon className="h-4 w-4 text-[#2E7D32]" />
                  <h3 className="text-sm font-bold text-[#2B1F1D]">Crime Type Breakdown</h3>
                </div>
                <span className="text-[11px] text-[#7A6360] font-mono">Classification</span>
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
                        contentStyle={{ backgroundColor: '#FFFDFC', borderColor: '#EEDFD9', borderRadius: '12px', fontSize: '11px', color: '#2B1F1D', boxShadow: '0 4px 15px rgba(84, 42, 32, 0.08)' }}
                        formatter={(val: any) => [`${val} Incidents`, 'Count']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-[#7A6360] text-center pt-24">{t('noDataAvailable', 'No data available for this selection.')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Year-wise & Monthly Trend Analysis */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Year-wise Crime Trend */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-warm">
              <div className="flex items-center justify-between mb-4 border-b border-[#EEDFD9] pb-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-[#D65A31]" />
                  <h3 className="text-sm font-bold text-[#2B1F1D]">Year-wise Crime & Resolution Trend</h3>
                </div>
                <span className="text-[11px] text-[#7A6360] font-mono">Annual Trajectory</span>
              </div>
              <div className="h-72 w-full">
                {charts.yearData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.yearData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="crimeColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#883A2E" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#883A2E" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="solvedColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#2E7D32" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0E4DE" />
                      <XAxis dataKey="name" stroke="#7A6360" tick={{ fontSize: 11, fill: '#7A6360' }} />
                      <YAxis stroke="#7A6360" tick={{ fontSize: 11, fill: '#7A6360' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFDFC', borderColor: '#EEDFD9', borderRadius: '12px', fontSize: '11px', color: '#2B1F1D', boxShadow: '0 4px 15px rgba(84, 42, 32, 0.08)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Area type="monotone" dataKey="count" name="Total Incidents" stroke="#883A2E" strokeWidth={2} fillOpacity={1} fill="url(#crimeColor)" />
                      <Area type="monotone" dataKey="solved" name="Solved Cases" stroke="#2E7D32" strokeWidth={2} fillOpacity={1} fill="url(#solvedColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-[#7A6360] text-center pt-24">{t('noDataAvailable', 'No data available for this selection.')}</p>
                )}
              </div>
            </div>

            {/* City-wise Comparison */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-warm">
              <div className="flex items-center justify-between mb-4 border-b border-[#EEDFD9] pb-3">
                <div className="flex items-center space-x-2">
                  <BarChart2 className="h-4 w-4 text-[#D65A31]" />
                  <h3 className="text-sm font-bold text-[#2B1F1D]">City-wise Crime Frequency</h3>
                </div>
                <span className="text-[11px] text-[#7A6360] font-mono">Top Cities</span>
              </div>
              <div className="h-72 w-full">
                {charts.cityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.cityData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
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
          </div>

          {/* Row 3: Severity, Arrests & Incident Day Breakdown */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Crime Severity */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-warm">
              <div className="flex items-center justify-between mb-4 border-b border-[#EEDFD9] pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B1F1D] font-mono">Crime Severity</h3>
                <span className="text-[10px] text-[#7A6360] font-mono">Distribution</span>
              </div>
              <div className="space-y-3 pt-2">
                {charts.severityData.map((s, idx) => {
                  const pct = Math.round((s.count / kpis.total_crimes) * 100);
                  const isHigh = s.name.toLowerCase() === 'high';
                  const isMed = s.name.toLowerCase() === 'medium';
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[#2B1F1D]">{s.name} Severity</span>
                        <span className="text-[#7A6360] font-mono">{s.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#FAF0EC]">
                        <div
                          className={`h-full rounded-full ${
                            isHigh ? 'bg-[#D65A31]' : isMed ? 'bg-[#C47A5A]' : 'bg-[#2E7D32]'
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
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-warm">
              <div className="flex items-center justify-between mb-4 border-b border-[#EEDFD9] pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B1F1D] font-mono">Case Status</h3>
                <span className="text-[10px] text-[#7A6360] font-mono">Status Quo</span>
              </div>
              <div className="space-y-3 pt-2">
                {charts.caseStatusData.map((cs, idx) => {
                  const pct = Math.round((cs.count / kpis.total_crimes) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[#2B1F1D]">{cs.name}</span>
                        <span className="text-[#7A6360] font-mono">{cs.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#FAF0EC]">
                        <div className="h-full rounded-full bg-[#883A2E]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Incident Day of Week */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-warm">
              <div className="flex items-center justify-between mb-4 border-b border-[#EEDFD9] pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B1F1D] font-mono">Incident Day Pattern</h3>
                <span className="text-[10px] text-[#7A6360] font-mono">Temporal</span>
              </div>
              <div className="space-y-2 pt-1">
                {charts.dayData.map((d, idx) => {
                  const pct = Math.round((d.count / kpis.total_crimes) * 100);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-[#2B1F1D] font-medium">{d.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-1.5 rounded-full bg-[#FAF0EC] overflow-hidden">
                          <div className="h-full bg-[#883A2E]" style={{ width: `${pct * 3}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-[#7A6360] w-10 text-right">{d.count}</span>
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
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-warm">
              <div className="flex items-center justify-between mb-4 border-b border-[#EEDFD9] pb-3">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-[#883A2E]" />
                  <h3 className="text-sm font-bold text-[#2B1F1D]">Police Station Case Volume</h3>
                </div>
                <span className="text-[11px] text-[#7A6360] font-mono">Top Stations</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#2B1F1D]">
                  <thead className="border-b border-[#EEDFD9] text-[10px] uppercase tracking-wider text-[#7A6360] font-mono">
                    <tr>
                      <th className="py-2">Police Station</th>
                      <th className="py-2">Jurisdiction</th>
                      <th className="py-2 text-right">Recorded Cases</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEDFD9]">
                    {charts.policeStationData.slice(0, 6).map((ps, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF0EC]">
                        <td className="py-2 font-medium text-[#2B1F1D]">{ps.name}</td>
                        <td className="py-2 text-[#7A6360]">{ps.city}</td>
                        <td className="py-2 text-right font-mono text-[#883A2E] font-bold">{ps.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weapon Used Distribution */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-warm">
              <div className="flex items-center justify-between mb-4 border-b border-[#EEDFD9] pb-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-[#D65A31]" />
                  <h3 className="text-sm font-bold text-[#2B1F1D]">Weapons / Modus Operandi</h3>
                </div>
                <span className="text-[11px] text-[#7A6360] font-mono">Observed in Records</span>
              </div>
              <div className="space-y-2.5">
                {charts.weaponData.slice(0, 6).map((w, idx) => {
                  const pct = Math.round((w.count / kpis.total_crimes) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#2B1F1D] font-medium">{w.name}</span>
                        <span className="text-[#7A6360] font-mono">{w.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#FAF0EC] overflow-hidden">
                        <div className="h-full rounded-full bg-[#D65A31]" style={{ width: `${pct}%` }} />
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
