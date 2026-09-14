import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  BarChart3,
  TrendingUp,
  MapPin,
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Lock,
  Database,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Layers,
  Search
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDataset } from '../context/DatasetContext';

export const LandingPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { datasets } = useDataset();

  const totalLoadedRecords = datasets.reduce((acc, d) => acc + (d.actual_record_count || 0), 0);

  const featureCards = [
    {
      icon: BarChart3,
      title: 'Real Analytics Engine',
      desc: 'Dynamic KPI calculations and live visualizations computed strictly from actual uploaded crime datasets.',
      color: 'from-cyan-500/20 to-blue-500/5',
      border: 'border-cyan-500/30',
      iconColor: 'text-cyan-400'
    },
    {
      icon: MapPin,
      title: 'India-Wide Spatial Hierarchy',
      desc: 'Seamless multi-level drilldown: All Indian States -> Districts -> Cities -> Police Station incident records.',
      color: 'from-emerald-500/20 to-teal-500/5',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400'
    },
    {
      icon: TrendingUp,
      title: 'Data-Driven Predictions',
      desc: 'Forecasting algorithms, high-risk location hotspots, and temporal threat index derived strictly from historical data.',
      color: 'from-amber-500/20 to-orange-500/5',
      border: 'border-amber-500/30',
      iconColor: 'text-amber-400'
    },
    {
      icon: UploadCloud,
      title: 'Dataset Validation & Ingestion',
      desc: 'Support for CSV and XLSX files with pre-validation diagnostics, error reporting, and safe database import.',
      color: 'from-violet-500/20 to-purple-500/5',
      border: 'border-violet-500/30',
      iconColor: 'text-violet-400'
    },
    {
      icon: FileText,
      title: 'Regional PDF Intelligence Reports',
      desc: 'Instant generation and export of multi-page analytical briefings for state, district, or city law enforcement.',
      color: 'from-rose-500/20 to-pink-500/5',
      border: 'border-rose-500/30',
      iconColor: 'text-rose-400'
    },
    {
      icon: Lock,
      title: '13 Indian Languages & RBAC',
      desc: 'Full localization in 13 Indian languages with role-based access control protecting administrative actions.',
      color: 'from-blue-500/20 to-indigo-500/5',
      border: 'border-blue-500/30',
      iconColor: 'text-blue-400'
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#070b16] overflow-hidden">
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 sm:pt-28 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold text-cyan-400 backdrop-blur-md mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            <span>National Intelligence & Regional Crime Analytics v2.0</span>
          </div>

          {/* Main Title & Subtitle */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
            <span className="block">{t('appName', 'Crime Data Analytics')}</span>
            <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
              {t('tagline', 'Analyze. Understand. Predict.')}
            </span>
          </h1>

          <p className="mx-auto max-w-3xl text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed mb-10">
            A centralized law enforcement intelligence platform engineered to transform raw multi-state crime data into actionable spatial trends, resolution metrics, predictive risk models, and executive regional briefings.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={user ? "/dashboard" : "/login"}
              className="w-full sm:w-auto flex items-center justify-center space-x-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <span>{t('exploreData', 'Explore Crime Data')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {!user && (
              <Link
                to="/register"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-8 py-3.5 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800 transition-all"
              >
                <span>{t('register', 'Register Account')}</span>
              </Link>
            )}
          </div>

          {/* Live Ingested Dataset Stats Pill */}
          <div className="mt-14 inline-flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-slate-800 bg-[#0c1326]/80 px-6 py-3.5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-slate-400">Preloaded Datasets:</span>
              <span className="text-xs font-bold text-white">{datasets.length} Active Stores</span>
            </div>
            <span className="hidden sm:inline text-slate-700">|</span>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Total Verified Records:</span>
              <span className="text-xs font-bold font-mono text-emerald-400">{totalLoadedRecords.toLocaleString()} Rows</span>
            </div>
            <span className="hidden sm:inline text-slate-700">|</span>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400">Data Integrity:</span>
              <span className="text-xs font-bold text-cyan-300">100% Real Ingested Data</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-16 bg-[#090e1f]/50 border-t border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Command-Grade Analytical Capabilities
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Engineered with zero hardcoded statistics — every chart, percentage, and metric reflects real database records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className={`group relative overflow-hidden rounded-2xl border ${feat.border} bg-gradient-to-b ${feat.color} p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800">
                      <Icon className={`h-6 w-6 ${feat.iconColor}`} />
                    </div>
                    <h3 className="font-bold text-base text-white">{feat.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security & Data Authenticity Notice */}
      <section className="py-16 border-t border-slate-800/80">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-blue-950/30 p-8 sm:p-10 backdrop-blur-xl">
            <Shield className="mx-auto h-12 w-12 text-cyan-400 mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Authentic Law Enforcement Data Standard
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              All computations across State, District, City, and Year filters operate dynamically over our unified PostgreSQL / SQLite relational data store. When a filter combination yields no recorded incidents, the platform explicitly signals "No data available for this selection."
            </p>
            <Link
              to={user ? "/dashboard" : "/login"}
              className="inline-flex items-center space-x-2 rounded-xl bg-cyan-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              <span>Launch Platform</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
