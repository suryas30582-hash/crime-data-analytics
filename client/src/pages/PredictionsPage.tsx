import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  MapPin,
  Clock,
  Calendar,
  ShieldAlert,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { useDataset } from '../context/DatasetContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { PredictionData } from '../types';
import { FilterBar } from '../components/common/FilterBar';

export const PredictionsPage: React.FC = () => {
  const { filters } = useDataset();
  const { t } = useLanguage();

  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadPredictions() {
      setIsLoading(true);
      try {
        const res = await api.getPredictions(filters);
        setPredictions(res);
      } catch (err) {
        console.error('Failed to load predictions:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPredictions();
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#EEDFD9] pb-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-6 w-6 text-[#883A2E]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#2B1F1D] sm:text-3xl">
            {t('predictions', 'Predictive Crime Intelligence & Forecasting')}
          </h1>
        </div>
        <p className="mt-1 text-xs text-[#7A6360]">
          Empirical mathematical modeling and statistical trend projections computed strictly from historical incident records.
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar showSearch={false} showCrimeType={false} />

      {/* Loading */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] shadow-sm">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#883A2E] border-t-transparent" />
            <p className="text-xs text-[#7A6360] font-mono">Running regression and spatial hotspot analysis...</p>
          </div>
        </div>
      )}

      {/* Insufficient Data State */}
      {!isLoading && predictions && !predictions.hasSufficientData && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-8 text-center shadow-sm">
          <AlertTriangle className="h-12 w-12 text-[#D65A31] mb-3" />
          <h3 className="text-base font-bold text-[#2B1F1D]">
            {predictions.message || 'Insufficient historical data for reliable prediction.'}
          </h3>
          <p className="mt-1 text-xs text-[#7A6360] max-w-md">
            Predictive modeling requires a minimum threshold of historical incidents in the selected jurisdiction to construct statistically significant forecasts. Try broadening your location filters.
          </p>
        </div>
      )}

      {/* Predictions Dashboard */}
      {!isLoading && predictions && predictions.hasSufficientData && (
        <div className="space-y-6">
          {/* Top Predictive Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-sm">
              <div className="text-[11px] uppercase font-mono text-[#7A6360]">Projected Next Period Volume</div>
              <div className="text-3xl font-bold font-mono text-[#883A2E] mt-1">
                ~{predictions.projectedNextPeriodCrimes} Cases
              </div>
              <p className="text-[11px] text-[#7A6360] mt-1">Linear regression time-series projection</p>
            </div>

            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-sm">
              <div className="text-[11px] uppercase font-mono text-[#7A6360]">Historical Growth Trend</div>
              <div className={`text-3xl font-bold font-mono mt-1 ${
                (predictions.growthRate || 0) > 0 ? 'text-[#D65A31]' : 'text-[#2E7D32]'
              }`}>
                {(predictions.growthRate || 0) > 0 ? `+${predictions.growthRate}%` : `${predictions.growthRate}%`}
              </div>
              <p className="text-[11px] text-[#7A6360] mt-1">Timeline velocity across recorded intervals</p>
            </div>

            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-sm">
              <div className="text-[11px] uppercase font-mono text-[#7A6360]">Historical Solve Probability</div>
              <div className="text-3xl font-bold font-mono text-[#2E7D32] mt-1">
                {predictions.solveProbability}%
              </div>
              <p className="text-[11px] text-[#7A6360] mt-1">Based on clearance of similar cases</p>
            </div>

            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 shadow-sm">
              <div className="text-[11px] uppercase font-mono text-[#7A6360]">Expected Investigation Cycle</div>
              <div className="text-3xl font-bold font-mono text-[#542A20] mt-1">
                ~{predictions.avgInvestigationDurationDays} Days
              </div>
              <p className="text-[11px] text-[#7A6360] mt-1">Average duration to closure</p>
            </div>
          </div>

          {/* Timeline Forecast Chart */}
          <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#EEDFD9] pb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-[#883A2E]" />
                <h3 className="text-sm font-bold text-[#2B1F1D]">Historical Incidence & Trend Trajectory</h3>
              </div>
              <span className="text-[11px] text-[#7A6360] font-mono">
                {predictions.totalRecordsAnalyzed} Incidents Analyzed
              </span>
            </div>
            <div className="h-72 w-full">
              {predictions.historicalTimeline && predictions.historicalTimeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={predictions.historicalTimeline.map((item) => ({
                      period: `${item.year}-M${item.month}`,
                      crimes: item.crime_count
                    }))}
                    margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E4DE" />
                    <XAxis dataKey="period" stroke="#7A6360" tick={{ fontSize: 10, fill: '#7A6360' }} />
                    <YAxis stroke="#7A6360" tick={{ fontSize: 10, fill: '#7A6360' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFDFC', borderColor: '#EEDFD9', borderRadius: '12px', fontSize: '11px', color: '#2B1F1D', boxShadow: '0 4px 15px rgba(84, 42, 32, 0.08)' }} />
                    <Line type="monotone" dataKey="crimes" stroke="#883A2E" strokeWidth={2.5} dot={{ r: 3, fill: '#883A2E' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          {/* High-Risk Hotspots & Temporal Threat Slots */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* High-Risk Hotspot Clusters */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-4 border-b border-[#EEDFD9] pb-3">
                <MapPin className="h-4 w-4 text-[#D65A31]" />
                <h3 className="text-sm font-bold text-[#2B1F1D]">Frequently Occurring Spatial Hotspots</h3>
              </div>
              <div className="space-y-3">
                {predictions.topLocations?.map((loc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#FAF0EC] border border-[#EEDFD9]">
                    <div>
                      <div className="font-medium text-xs text-[#2B1F1D]">{loc.location}</div>
                      <div className="text-[10px] text-[#7A6360]">{loc.city}, {loc.state}</div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-[#883A2E]">{loc.incident_count} Incidents</span>
                      <div className="text-[10px] text-[#7A6360]">{loc.incident_share}% of local cases</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slot & Day Risk Index */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-3 border-b border-[#EEDFD9] pb-2">
                  <Clock className="h-4 w-4 text-[#883A2E]" />
                  <h3 className="text-sm font-bold text-[#2B1F1D]">Diurnal Threat Time Slots</h3>
                </div>
                <div className="space-y-2">
                  {predictions.timeSlots?.map((ts, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#FAF0EC] border border-[#EEDFD9]/60">
                      <span className="text-[#2B1F1D] font-medium">{ts.slot}</span>
                      <span className="font-mono text-[#883A2E] font-semibold">{ts.count} Incidents</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-3 border-b border-[#EEDFD9] pb-2 pt-2">
                  <Calendar className="h-4 w-4 text-[#D65A31]" />
                  <h3 className="text-sm font-bold text-[#2B1F1D]">Peak Threat Incident Days</h3>
                </div>
                <div className="space-y-2">
                  {predictions.peakDays?.slice(0, 4).map((pd, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#FAF0EC] border border-[#EEDFD9]/60">
                      <span className="text-[#2B1F1D] font-medium">{pd.day}</span>
                      <span className="font-mono text-[#542A20] font-semibold">{pd.count} Cases ({pd.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
