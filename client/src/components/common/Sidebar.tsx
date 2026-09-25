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
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { datasets, activeDatasetId, setActiveDatasetId, activeDataset } = useDataset();
  const navigate = useNavigate();

  const getRoleNavItems = () => {
    if (user?.role === 'police') {
      return [
        {
          to: '/police/dashboard',
          label: 'Police Command Hub',
          icon: ShieldAlert,
          badge: 'Live'
        },
        {
          to: '/upload',
          label: t('uploadData', 'Upload Crime Data'),
          icon: UploadCloud,
          badge: 'New'
        },
        {
          to: '/police-emergency',
          label: 'Emergency Dispatch',
          icon: ShieldAlert,
          badge: 'SOS'
        },
        {
          to: '/dashboard',
          label: t('dashboard', 'Crime Analytics'),
          icon: LayoutDashboard
        },
        {
          to: '/state-analytics',
          label: t('stateCityAnalytics', 'State Analytics'),
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
    }

    if (user?.role === 'admin') {
      return [
        {
          to: '/admin/dashboard',
          label: 'Administrator Console',
          icon: ShieldAlert,
          badge: 'Master'
        },
        {
          to: '/upload',
          label: t('uploadData', 'Upload Crime Data'),
          icon: UploadCloud,
          badge: 'Admin'
        },
        {
          to: '/police/dashboard',
          label: 'Police Command Hub',
          icon: ShieldAlert
        },
        {
          to: '/user/dashboard',
          label: 'Citizen Portal View',
          icon: LayoutDashboard
        },
        {
          to: '/dashboard',
          label: t('dashboard', 'Crime Analytics'),
          icon: LayoutDashboard
        },
        {
          to: '/state-analytics',
          label: t('stateCityAnalytics', 'State Analytics'),
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
    }

    // Default: Citizen User
    return [
      {
        to: '/user/dashboard',
        label: 'Citizen Dashboard',
        icon: LayoutDashboard,
        badge: 'Home'
      },
      {
        to: '/upload',
        label: t('uploadData', 'Upload Crime Data'),
        icon: UploadCloud,
        badge: 'New'
      },
      {
        to: '/dashboard',
        label: t('dashboard', 'Crime Intelligence'),
        icon: TrendingUp
      },
      {
        to: '/state-analytics',
        label: t('stateCityAnalytics', 'State Analytics'),
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
  };

  const navItems = getRoleNavItems();

  const secondaryNavItems = [
    {
      to: '/settings',
      label: t('settings', 'Settings'),
      icon: Settings
    },
    {
      to: '/help',
      label: t('help', 'Help & Schema'),
      icon: HelpCircle
    }
  ];

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
        className={`fixed top-16 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-[#EEDFD9] bg-[#FFFDFC] shadow-warm-sm transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation Group */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Mobile Drawer Brand Header */}
          <div className="lg:hidden pb-3 border-b border-[#EEDFD9]">
            <BrandLogo size="sm" showTagline={true} showBadge={true} />
          </div>

          {/* Mobile-Only Dataset Switcher */}
          <div className="md:hidden border-b border-[#EEDFD9] pb-3">
            <label className="px-1 mb-1.5 flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7A6360] font-mono">
              <Database className="h-3 w-3 text-[#883A2E]" />
              <span>{t('datasetSelector', 'Active Dataset')}</span>
            </label>
            <select
              value={activeDatasetId}
              onChange={(e) => setActiveDatasetId(e.target.value)}
              className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-2.5 py-2 text-xs text-[#2B1F1D] font-medium focus:border-[#883A2E] focus:outline-none"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.actual_record_count || 0} rows)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7A6360] font-mono">
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
                          ? 'bg-[#883A2E]/10 text-[#883A2E] border border-[#883A2E]/25 font-semibold shadow-sm'
                          : 'text-[#7A6360] hover:bg-[#FAF0EC] hover:text-[#2B1F1D]'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 text-[#7A6360] group-hover:text-[#883A2E]" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                        item.badge === 'SOS Live'
                          ? 'bg-[#D65A31]/15 text-[#D65A31] border-[#D65A31]/25'
                          : item.badge === 'Live'
                          ? 'bg-[#2E7D32]/10 text-[#2E7D32] border-[#2E7D32]/25'
                          : 'bg-[#883A2E]/10 text-[#883A2E] border-[#883A2E]/25'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7A6360] font-mono">
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
                          ? 'bg-[#883A2E]/10 text-[#883A2E] border border-[#883A2E]/25 font-semibold shadow-sm'
                          : 'text-[#7A6360] hover:bg-[#FAF0EC] hover:text-[#2B1F1D]'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 text-[#7A6360] group-hover:text-[#883A2E]" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#7A6360]" />
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Card & Logout Footer */}
        {user && (
          <div className="border-t border-[#EEDFD9] p-3 bg-[#FFF7F4]">
            <div className="flex items-center justify-between rounded-lg bg-[#FFFDFC] p-2.5 border border-[#EEDFD9] shadow-sm">
              <div className="flex items-center space-x-2.5 truncate">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#883A2E]/10 text-[#883A2E] font-bold text-xs border border-[#883A2E]/25 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-[#2B1F1D] truncate">{user.name}</div>
                  <div className="text-[10px] text-[#883A2E] font-medium truncate">
                    {user.role === 'admin'
                      ? '🛡️ Administrator'
                      : user.role === 'police'
                      ? `👮 ${user.badge_number || 'Police Officer'}`
                      : '👤 Citizen User'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md p-1.5 text-[#7A6360] hover:bg-[#D65A31]/10 hover:text-[#D65A31] transition-colors"
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
