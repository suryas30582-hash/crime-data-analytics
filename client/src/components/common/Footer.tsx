import React from 'react';
import { Shield, Lock, Database } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="mt-12 border-t border-slate-800/80 bg-[#060a17] py-6 text-center text-xs text-slate-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Shield className="h-4 w-4 text-cyan-500" />
            <span className="font-semibold text-slate-300">{t('appName', 'Crime Data Analytics')}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1.5">
            <Database className="h-3.5 w-3.5 text-blue-400" />
            <span>Dual-Dataset Verification Engine</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>Role-Based Access Control</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Official Academic Project Implementation &bull; All analytical insights & KPIs computed dynamically from real ingested records.
        </p>
      </div>
    </footer>
  );
};
