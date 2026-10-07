import React from 'react';
import { Shield, Lock, Database } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="mt-12 border-t border-[#EEDFD9] bg-[#FFFDFC] py-6 text-center text-xs text-[#7A6360]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[#7A6360]">
          <div className="flex items-center space-x-1.5">
            <Shield className="h-4 w-4 text-[#883A2E]" />
            <span className="font-bold text-[#2B1F1D]">{t('appName', 'CrimeLytixs')}</span>
          </div>
          <span className="text-[#EEDFD9]">|</span>
          <div className="flex items-center space-x-1.5">
            <Database className="h-3.5 w-3.5 text-[#D65A31]" />
            <span>Dual-Dataset Verification Engine</span>
          </div>
          <span className="text-[#EEDFD9]">|</span>
          <div className="flex items-center space-x-1.5">
            <Lock className="h-3.5 w-3.5 text-[#2E7D32]" />
            <span>Role-Based Access Control</span>
          </div>
        </div>

        <p className="text-[11px] text-[#7A6360]">
          Official Academic Project Implementation &bull; All analytical insights & KPIs computed dynamically from real ingested records.
        </p>
      </div>
    </footer>
  );
};
