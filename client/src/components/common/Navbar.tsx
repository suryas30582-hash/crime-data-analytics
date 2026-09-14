import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDataset } from '../../context/DatasetContext';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar, isMobileSidebarOpen }) => {
  const { user, logout, isAdmin } = useAuth();
  const { currentLanguage, setLanguage, languages, t } = useLanguage();
  const { datasets, activeDatasetId, setActiveDatasetId, activeDataset } = useDataset();

  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isDatasetDropdownOpen, setIsDatasetDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const currentLangObj = languages.find(l => l.code === currentLanguage) || languages[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#080d1e]/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleMobileSidebar}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800/80 hover:text-cyan-400 focus:outline-none lg:hidden"
            aria-label="Toggle Navigation"
          >
            {isMobileSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#070b16]">
                <Shield className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-white sm:text-lg">
                  {t('appName', 'Crime Data Analytics')}
                </span>
                <span className="hidden sm:inline-block rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                  v2.0
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                {t('tagline', 'Analyze. Understand. Predict.')}
              </p>
            </div>
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
              }}
              className="flex items-center space-x-2 rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:bg-slate-800 transition-all"
            >
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span className="max-w-[200px] truncate">
                {activeDataset ? activeDataset.name : 'Select Dataset'}
              </span>
              <span className="rounded bg-cyan-950/80 px-1.5 py-0.2 text-[10px] font-mono text-cyan-300 border border-cyan-800/40">
                {activeDataset?.actual_record_count?.toLocaleString() || 0} rows
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isDatasetDropdownOpen && (
              <div className="absolute top-11 left-0 w-72 rounded-xl border border-slate-700 bg-[#0d152a] p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
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
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium truncate">{d.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{d.description}</div>
                      </div>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 shrink-0">
                        {d.actual_record_count?.toLocaleString() || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right: Language Selector & User Menu */}
        <div className="flex items-center space-x-3">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setIsLangDropdownOpen(!isLangDropdownOpen);
                setIsDatasetDropdownOpen(false);
                setIsUserDropdownOpen(false);
              }}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700/70 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-200 hover:border-slate-600 hover:bg-slate-800 transition-colors"
              title="Change Language"
            >
              <Globe className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-medium">{currentLangObj.nativeName}</span>
              <span className="sm:hidden font-mono text-[11px] uppercase">{currentLangObj.code}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-xl border border-slate-700 bg-[#0d152a] p-2 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
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
                          ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{lang.nativeName}</span>
                      <span className="text-[11px] text-slate-400">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Auth or Sign In Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => {
                  setIsUserDropdownOpen(!isUserDropdownOpen);
                  setIsDatasetDropdownOpen(false);
                  setIsLangDropdownOpen(false);
                }}
                className="flex items-center space-x-2 rounded-lg border border-slate-700/80 bg-slate-900/90 p-1.5 pr-2.5 text-xs text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-tr from-cyan-600 to-blue-700 text-white font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden text-left md:block">
                  <div className="text-xs font-semibold leading-tight text-slate-200">{user.name}</div>
                  <div className="text-[10px] leading-tight text-cyan-400 font-mono capitalize">
                    {user.role}
                  </div>
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-xl border border-slate-700 bg-[#0d152a] p-2 shadow-2xl backdrop-blur-xl z-50">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <div className="font-semibold text-slate-200 text-xs">{user.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                    <div className="mt-1 inline-flex items-center rounded-full bg-cyan-950 px-2 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-800/50">
                      {isAdmin ? 'System Administrator' : 'Authorized Analyst'}
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/settings"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                      <span>{t('settings', 'Settings')}</span>
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs text-amber-300 hover:bg-slate-800 hover:text-amber-200"
                      >
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        <span>{t('adminPanel', 'Admin Datasets')}</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setIsUserDropdownOpen(false);
                      }}
                      className="flex w-full items-center space-x-2 rounded-md px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>{t('logout', 'Logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="rounded-lg border border-slate-700 bg-slate-900/80 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
              >
                {t('signIn', 'Sign In')}
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
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
