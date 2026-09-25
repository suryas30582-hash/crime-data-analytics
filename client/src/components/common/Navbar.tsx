import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Globe,
  Database,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Lock,
  Layers,
  Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDataset } from '../../context/DatasetContext';
import { useNotification } from '../../context/NotificationContext';
import { BrandLogo } from './BrandLogo';
import { UserButton } from '@clerk/react';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar, isMobileSidebarOpen }) => {
  const { user, logout, isAdmin, isPolice } = useAuth();
  const { currentLanguage, setLanguage, languages, t } = useLanguage();
  const { datasets, activeDatasetId, setActiveDatasetId, activeDataset } = useDataset();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const navigate = useNavigate();

  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isDatasetDropdownOpen, setIsDatasetDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const currentLangObj = languages.find(l => l.code === currentLanguage) || languages[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EEDFD9] bg-[#FFFDFC]/95 backdrop-blur-md shadow-warm-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Toggle & Crimelytixs Brand */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleMobileSidebar}
            className="rounded-lg p-2 text-[#7A6360] hover:bg-[#FAF0EC] hover:text-[#883A2E] focus:outline-none lg:hidden"
            aria-label="Toggle Navigation"
          >
            {isMobileSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link to="/" className="flex items-center">
            <BrandLogo size="md" showTagline={true} showBadge={true} />
          </Link>
        </div>

        {/* Center: Dataset Switcher */}
        {user && (
          <div className="hidden md:flex items-center relative">
            <button
              onClick={() => {
                setIsDatasetDropdownOpen(!isDatasetDropdownOpen);
                setIsLangDropdownOpen(false);
                setIsUserDropdownOpen(false);
                setIsNotificationOpen(false);
              }}
              className="flex items-center space-x-2 rounded-lg border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-1.5 text-xs font-medium text-[#2B1F1D] hover:border-[#883A2E]/50 hover:bg-[#FFFDFC] transition-all shadow-sm"
            >
              <Database className="h-3.5 w-3.5 text-[#883A2E]" />
              <span className="max-w-[200px] truncate">
                {activeDataset ? activeDataset.name : 'Select Dataset'}
              </span>
              <span className="rounded bg-[#883A2E]/10 px-1.5 py-0.2 text-[10px] font-mono text-[#883A2E] border border-[#883A2E]/20">
                {activeDataset?.actual_record_count?.toLocaleString() || 0} rows
              </span>
              <ChevronDown className="h-3 w-3 text-[#7A6360]" />
            </button>

            {isDatasetDropdownOpen && (
              <div className="absolute top-11 left-0 w-72 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] p-2 shadow-warm-xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#7A6360] border-b border-[#EEDFD9]">
                  {t('datasetSelector', 'Selected Dataset')}
                </div>
                <div className="mt-1 max-h-60 overflow-y-auto space-y-1">
                  {datasets.map(d => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setActiveDatasetId(d.id);
                        setIsDatasetDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        d.id === activeDatasetId
                          ? 'bg-[#883A2E]/10 text-[#883A2E] border border-[#883A2E]/30 font-semibold'
                          : 'text-[#2B1F1D] hover:bg-[#FAF0EC]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium truncate">{d.name}</div>
                        <div className="text-[10px] text-[#7A6360] truncate">{d.description}</div>
                      </div>
                      <span className="rounded bg-[#FAF0EC] px-1.5 py-0.5 text-[10px] font-mono text-[#7A6360] shrink-0 border border-[#EEDFD9]">
                        {d.actual_record_count?.toLocaleString() || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right: Emergency SOS, Notifications, Language Selector & User Menu */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Public SOS Report Crime Button */}
          <Link
            to="/emergency"
            className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-[#D65A31] to-[#883A2E] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-[#D65A31]/25 hover:from-[#BA461F] hover:to-[#752F24] transition-all active:scale-95 animate-pulse"
            title="Report Emergency / Crime SOS"
          >
            <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
            <span>🚨 SOS Report</span>
          </Link>

          {/* Silent Notification Bell for Police & Admin */}
          {(isPolice || isAdmin) && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen);
                  setIsLangDropdownOpen(false);
                  setIsDatasetDropdownOpen(false);
                  setIsUserDropdownOpen(false);
                }}
                className="relative flex items-center justify-center rounded-lg border border-[#EEDFD9] bg-[#FFF7F4] p-2 text-[#2B1F1D] hover:border-[#883A2E]/40 hover:bg-[#FFFDFC] transition-colors cursor-pointer"
                title="Incident Notifications Alert"
              >
                <Bell className="h-4 w-4 text-[#883A2E]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#D65A31] text-[10px] font-bold text-white shadow-sm animate-pulse border border-[#FFFDFC]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 top-11 w-80 rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-3 shadow-warm-xl backdrop-blur-xl z-50">
                  <div className="flex items-center justify-between border-b border-[#EEDFD9] pb-2">
                    <div className="flex items-center space-x-1.5">
                      <Bell className="h-4 w-4 text-[#883A2E]" />
                      <span className="text-xs font-bold text-[#2B1F1D]">Citizen Incident Alerts</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-[#D65A31]/10 px-2 py-0.5 text-[10px] font-bold text-[#D65A31]">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-medium text-[#883A2E] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="mt-2 max-h-72 overflow-y-auto space-y-1.5">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#7A6360]">
                        No active incident alerts
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.code);
                            setIsNotificationOpen(false);
                            navigate(`/police-emergency?code=${n.code}`);
                          }}
                          className={`flex items-start space-x-2.5 rounded-xl p-2.5 text-xs transition-all cursor-pointer border ${
                            !n.read
                              ? 'bg-[#FAF0EC] border-[#883A2E]/30 font-medium hover:bg-[#F7E6E0]'
                              : 'bg-[#FFFDFC] border-[#EEDFD9] text-[#7A6360] hover:bg-[#FFF7F4]'
                          }`}
                        >
                          <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!n.read ? 'bg-[#D65A31] animate-ping' : 'bg-[#7A6360]/40'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#2B1F1D] truncate">{n.code}</span>
                              <span className="text-[10px] text-[#7A6360]">
                                {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#542A20] font-medium truncate">{n.incident_type}</div>
                            <div className="text-[10px] text-[#7A6360] truncate">{n.location_address || 'GPS Coordinates Logged'}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setIsLangDropdownOpen(!isLangDropdownOpen);
                setIsDatasetDropdownOpen(false);
                setIsUserDropdownOpen(false);
                setIsNotificationOpen(false);
              }}
              className="flex items-center space-x-1.5 rounded-lg border border-[#EEDFD9] bg-[#FFF7F4] px-2.5 py-1.5 text-xs text-[#2B1F1D] hover:border-[#883A2E]/40 hover:bg-[#FFFDFC] transition-colors"
              title="Change Language"
            >
              <Globe className="h-3.5 w-3.5 text-[#883A2E]" />
              <span className="hidden sm:inline font-medium">{currentLangObj.nativeName}</span>
              <span className="sm:hidden font-mono text-[11px] uppercase">{currentLangObj.code}</span>
              <ChevronDown className="h-3 w-3 text-[#7A6360]" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] p-2 shadow-warm-xl backdrop-blur-xl z-50">
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#7A6360] border-b border-[#EEDFD9]">
                  {t('language', 'Language')} (13 Languages)
                </div>
                <div className="mt-1 max-h-64 overflow-y-auto space-y-0.5">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition-colors ${
                        lang.code === currentLanguage
                          ? 'bg-[#883A2E]/10 text-[#883A2E] font-semibold'
                          : 'text-[#2B1F1D] hover:bg-[#FAF0EC]'
                      }`}
                    >
                      <span>{lang.nativeName}</span>
                      <span className="text-[11px] text-[#7A6360]">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Auth or Sign In Button */}
          {user ? (
            <div className="flex items-center space-x-2">
              <UserButton />
              <div className="relative">
                <button
                  onClick={() => {
                    setIsUserDropdownOpen(!isUserDropdownOpen);
                    setIsDatasetDropdownOpen(false);
                    setIsLangDropdownOpen(false);
                    setIsNotificationOpen(false);
                  }}
                  className="flex items-center space-x-2 rounded-lg border border-[#EEDFD9] bg-[#FFF7F4] p-1.5 pr-2.5 text-xs text-[#2B1F1D] hover:border-[#883A2E]/40 hover:bg-[#FFFDFC] transition-colors"
                >
                  <div className="hidden text-left md:block">
                    <div className="text-xs font-semibold leading-tight text-[#2B1F1D]">{user.name}</div>
                    <div className="text-[10px] leading-tight text-[#883A2E] font-mono capitalize">
                      {user.role}
                    </div>
                  </div>
                  <ChevronDown className="h-3 w-3 text-[#7A6360]" />
                </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] p-2 shadow-warm-xl backdrop-blur-xl z-50">
                  <div className="px-3 py-2 border-b border-[#EEDFD9]">
                    <div className="font-semibold text-[#2B1F1D] text-xs">{user.name}</div>
                    <div className="text-[11px] text-[#7A6360] truncate">{user.email}</div>
                    <div className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border">
                      {user.role === 'admin' ? (
                        <span className="text-[#2B1F1D] bg-[#2B1F1D]/10 px-1 rounded">🛡️ Administrator</span>
                      ) : user.role === 'police' ? (
                        <span className="text-[#542A20] bg-[#542A20]/10 px-1 rounded">👮 Police Officer</span>
                      ) : (
                        <span className="text-[#883A2E] bg-[#883A2E]/10 px-1 rounded">👤 Citizen User</span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    {/* Role-specific Dashboard Quick Link */}
                    {user.role === 'user' && (
                      <Link
                        to="/user/dashboard"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs text-[#883A2E] font-semibold hover:bg-[#FAF0EC]"
                      >
                        <UserIcon className="h-3.5 w-3.5 text-[#883A2E]" />
                        <span>Citizen Dashboard</span>
                      </Link>
                    )}

                    {(user.role === 'police' || user.role === 'admin') && (
                      <Link
                        to="/police/dashboard"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs text-[#542A20] font-semibold hover:bg-[#FAF0EC]"
                      >
                        <Shield className="h-3.5 w-3.5 text-[#542A20]" />
                        <span>Police Command Hub</span>
                      </Link>
                    )}

                    {user.role === 'admin' && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs text-[#2B1F1D] font-semibold hover:bg-[#FAF0EC]"
                      >
                        <Lock className="h-3.5 w-3.5 text-[#2B1F1D]" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <Link
                      to="/settings"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs text-[#2B1F1D] hover:bg-[#FAF0EC]"
                    >
                      <UserIcon className="h-3.5 w-3.5 text-[#7A6360]" />
                      <span>{t('settings', 'Settings')}</span>
                    </Link>
                  </div>

                  <div className="border-t border-[#EEDFD9] pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setIsUserDropdownOpen(false);
                      }}
                      className="flex w-full items-center space-x-2 rounded-md px-3 py-1.5 text-xs text-[#D65A31] hover:bg-[#D65A31]/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>{t('logout', 'Logout')}</span>
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="rounded-lg border border-[#EEDFD9] bg-[#FFFDFC] px-3.5 py-1.5 text-xs font-medium text-[#2B1F1D] hover:border-[#883A2E] hover:text-[#883A2E] transition-colors"
              >
                {t('signIn', 'Sign In')}
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-gradient-to-r from-[#883A2E] to-[#D65A31] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-[#752F24] hover:to-[#BA461F] transition-all"
              >
                {t('register', 'Register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
