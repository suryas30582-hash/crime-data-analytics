import React from 'react';
import {
  HelpCircle,
  FileSpreadsheet,
  Shield,
  Layers,
  CheckCircle2,
  Database,
  Search,
  Download,
  Lock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const HelpPage: React.FC = () => {
  const { t } = useLanguage();

  const standardColumns = [
    { name: 'Crime_ID', type: 'String (Unique)', desc: 'Standard incident reference code (e.g. CR202700001)' },
    { name: 'Date', type: 'Date (YYYY-MM-DD)', desc: 'Official date of incident occurrence' },
    { name: 'Time', type: 'Time (HH:MM)', desc: 'Time of occurrence in 24h military format' },
    { name: 'Crime_Type', type: 'String', desc: 'Categorization (e.g. Cyber Crime, Kidnapping, Robbery)' },
    { name: 'City', type: 'String', desc: 'Urban jurisdiction or municipality' },
    { name: 'State', type: 'String', desc: 'State or Union Territory of India' },
    { name: 'Location', type: 'String', desc: 'Specific area or zone classification' },
    { name: 'Victim_Age', type: 'Integer', desc: 'Age of victim (0-125)' },
    { name: 'Victim_Gender', type: 'String', desc: 'Male / Female / Other' },
    { name: 'Suspect_Age', type: 'Integer', desc: 'Age of identified suspect (0-125)' },
    { name: 'Suspect_Gender', type: 'String', desc: 'Male / Female / Other' },
    { name: 'Weapon_Used', type: 'String', desc: 'Modus operandi or weapon noted' },
    { name: 'Case_Status', type: 'String', desc: 'Closed, Solved, Under Investigation, Pending' },
    { name: 'Latitude', type: 'Float', desc: 'Geographic latitude coordinate' },
    { name: 'Crime_Severity', type: 'String', desc: 'High, Medium, Low' },
    { name: 'Police_Station', type: 'String', desc: 'Jurisdictional police station station house' },
    { name: 'Arrest_Made', type: 'String', desc: 'Yes / No' },
    { name: 'Incident_Day', type: 'String', desc: 'Day of week (Monday - Sunday)' },
    { name: 'Investigation_Days', type: 'Integer', desc: 'Number of days from filing to resolution' }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <HelpCircle className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t('help', 'Documentation & Academic Reference')}
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Complete guide to datasets, analytics algorithms, schema specifications, and platform features.
        </p>
      </div>

      {/* Dataset Schema Specification */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Standard Dataset Schema (19 Fields)</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          The Crime Data Analytics platform operates on a standardized 19-column schema. When uploading custom datasets in XLSX or CSV format, ensure these column names match:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
              <tr>
                <th className="py-2 px-2">Column Name</th>
                <th className="py-2 px-2">Data Type</th>
                <th className="py-2 px-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {standardColumns.map((col, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-2 px-2 font-bold text-cyan-400">{col.name}</td>
                  <td className="py-2 px-2 text-slate-400">{col.type}</td>
                  <td className="py-2 px-2 text-slate-300 font-sans">{col.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl space-y-4">
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
          Platform Architecture & Operations FAQ
        </h2>

        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <h3 className="font-bold text-cyan-300">Q: Are the statistics hardcoded?</h3>
            <p className="text-slate-400 leading-relaxed">
              No. Every KPI, bar chart, donut breakdown, year-wise trendline, and PDF report is computed dynamically in real-time from the active database records.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-cyan-300">Q: How does multi-dataset switching work?</h3>
            <p className="text-slate-400 leading-relaxed">
              The application supports isolated datasets (e.g. the 2,000-record India dataset and the 1,000-record Tamil Nadu dataset). Switching datasets in the top navbar instantly updates all pages to that dataset without mixing data.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-cyan-300">Q: How do predictions work?</h3>
            <p className="text-slate-400 leading-relaxed">
              Predictions use mathematical linear regression over historical monthly timeline slices and spatial clustering. If a filtered location has fewer than 5 records, the engine displays an empty state: "Insufficient historical data for reliable prediction."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
