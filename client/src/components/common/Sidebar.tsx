import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Compass,
  FileSpreadsheet,
  UploadCloud,
  TrendingUp,
  FileText,
  Settings,
  HelpCircle,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDataset } from '../../context/DatasetContext';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { datasets, activeDatasetId, setActiveDatasetId, activeDataset } = useDataset();
  const navigate = useNavigate();

  const navItems = [
    {
      to: '/dashboard',
      label: t('dashboard', 'Dashboard'),
      icon: LayoutDashboard,
      badge: 'Live'
    },
    {
      to: '/analytics-models',
      label: 'Analytics Models',
      icon: TrendingUp,
      badge: 'Advanced'
    },
    {
      to: '/state-analytics',
      label: t('stateCityAnalytics', 'State & City Analytics'),
      icon: MapPin
    },
    {
      to: '/district-explorer',
      label: t('districtExplorer', 'District Explorer'),
      icon: Compass
    },
    {
      to: '/records',
      label: t('crimeRecords', 'Crime Records'),
      icon: FileSpreadsheet
    },
    {
      to: '/upload',
      label: t('uploadData', 'Upload Data'),
      icon: UploadCloud
    },
    {
      to: '/predictions',
      label: t('predictions', 'Predictions'),
      icon: TrendingUp
    },
    {
      to: '/reports',
      label: t('regionReports', 'Region Reports'),
      icon: FileText
    }
  ];

  const secondaryNavItems = [
    {
      to: '/settings',
      label: t('settings', 'Settings'),
      icon: Settings
    },
    {
      to: '/help',
      label: t('help', 'Help & Docs'),
      icon: HelpCircle
    }
  ];

  if (isAdmin) {
    secondaryNavItems.unshift({
      to: '/admin',
      label: t('adminPanel', 'Admin Datasets'),
      icon: ShieldAlert
    });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800/80 bg-[#090e1f] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation Group */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Mobile-Only Dataset Switcher */}
          <div className="md:hidden border-b border-slate-800 pb-3">
            <label className="px-1 mb-1.5 flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              <Database className="h-3 w-3 text-cyan-400" />
              <span>{t('datasetSelector', 'Active Dataset')}</span>
            </label>
            <select
              value={activeDatasetId}
              onChange={(e) => setActiveDatasetId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-2 text-xs text-cyan-300 font-medium focus:border-cyan-500 focus:outline-none"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.actual_record_count || 0} rows)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Core Intelligence
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 text-slate-400 group-hover:text-cyan-400" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              System & Preferences
            </div>
            <nav className="space-y-1">
              {secondaryNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 text-slate-400 group-hover:text-cyan-400" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Card & Logout Footer */}
        {user && (
          <div className="border-t border-slate-800/80 p-3 bg-[#070b18]">
            <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2.5 border border-slate-800">
              <div className="flex items-center space-x-2.5 truncate">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600/20 text-cyan-400 font-bold text-xs border border-cyan-500/30 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-xs font-medium text-slate-200 truncate">{user.name}</div>
                  <div className="text-[10px] text-cyan-400 font-mono capitalize">{user.role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md p-1.5 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                title={t('logout', 'Logout')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
