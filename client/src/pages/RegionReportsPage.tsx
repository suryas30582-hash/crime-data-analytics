import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Shield,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Building
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDataset } from '../context/DatasetContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { RegionReportData } from '../types';
import { FilterBar } from '../components/common/FilterBar';

export const RegionReportsPage: React.FC = () => {
  const { filters } = useDataset();
  const { t } = useLanguage();

  const [report, setReport] = useState<RegionReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  useEffect(() => {
    async function loadReport() {
      setIsLoading(true);
      try {
        const res = await api.getRegionReport(filters);
        setReport(res);
      } catch (err) {
        console.error('Failed to load region report:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, [filters]);

  const generatePDF = () => {
    if (!report || !report.hasData) return;

    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF();

      // Header Banner
      doc.setFillColor(12, 18, 34);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(6, 182, 212);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CRIME DATA ANALYTICS', 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Regional Intelligence Briefing Report', 14, 26);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleString()} | Security Level: Official Use`, 14, 34);

      // Region Filter Metadata Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 46, 182, 20, 3, 3, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Jurisdiction: ${report.region.state} > ${report.region.district} > ${report.region.city}`, 18, 54);
      doc.setFont('helvetica', 'normal');
      doc.text(`Filter Year: ${report.region.year} | Data Source: Relational National Store`, 18, 61);

      // Section 1: Executive KPI Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('1. Key Performance Indicators & Clearance Summary', 14, 76);

      const kpiTableData = [
        ['Total Recorded Crimes', `${report.summary.totalCrimes}`],
        ['Solved / Resolved Cases', `${report.summary.solvedCases} (${report.summary.solveRate}%)`],
        ['Unsolved / Active Cases', `${report.summary.unsolvedCases}`],
        ['Arrests Executed', `${report.summary.arrestsMade} (${report.summary.arrestRate}%)`],
        ['High Severity Incidents', `${report.summary.highSeverity}`],
        ['Average Investigation Duration', `${report.summary.avgInvestigationDays || 'N/A'} Days`]
      ];

      autoTable(doc, {
        startY: 81,
        head: [['Metric', 'Value / Efficiency']],
        body: kpiTableData,
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233] },
        styles: { fontSize: 9 }
      });

      // Section 2: Dominant Crime Categories
      const lastY1 = (doc as any).lastAutoTable.finalY || 130;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Major Crime Types Breakdown', 14, lastY1 + 10);

      const crimeTypeData = report.crimeTypes.slice(0, 8).map(ct => [
        ct.crime_type,
        `${ct.count} Cases`,
        `${ct.percentage}%`
      ]);

      autoTable(doc, {
        startY: lastY1 + 14,
        head: [['Crime Classification', 'Recorded Incidents', 'Share of Total']],
        body: crimeTypeData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8.5 }
      });

      // Section 3: Police Stations Breakdown
      const lastY2 = (doc as any).lastAutoTable.finalY || 190;
      if (lastY2 < 230 && report.policeStations.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('3. Local Police Station Case Volume', 14, lastY2 + 10);

        const stationData = report.policeStations.slice(0, 5).map(ps => [
          ps.police_station,
          `${ps.count}`,
          `${ps.solved}`,
          `${ps.arrests}`
        ]);

        autoTable(doc, {
          startY: lastY2 + 14,
          head: [['Police Station', 'Cases', 'Solved', 'Arrests']],
          body: stationData,
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] },
          styles: { fontSize: 8.5 }
        });
      }

      // Save PDF
      doc.save(`Crime_Report_${report.region.state}_${report.region.city}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t('regionReports', 'Regional Intelligence Briefing Reports')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Generate and export publication-ready official briefings with localized statistics, solve rates, and enforcement performance.
          </p>
        </div>

        {report && report.hasData && (
          <button
            onClick={generatePDF}
            disabled={isGeneratingPdf}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : t('downloadReport', 'Download PDF Report')}</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <FilterBar showSearch={false} showCrimeType={false} />

      {/* Loading */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-[#0c1326]/50">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-xs text-slate-400 font-mono">Compiling regional intelligence briefing...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && report && !report.hasData && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-[#0c1326]/50 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-slate-500 mb-3" />
          <h3 className="text-base font-bold text-slate-300">
            {t('noDataAvailable', 'No data available for this selection.')}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md">
            No incident records exist for the specified State, District, City, or Year criteria.
          </p>
        </div>
      )}

      {/* Report View */}
      {!isLoading && report && report.hasData && (
        <div className="space-y-6">
          {/* Briefing Header Banner */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-[#0c1326] to-slate-900 p-6 backdrop-blur-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  Official Intelligence Dossier
                </span>
                <h2 className="text-xl font-bold text-white mt-1">
                  Crime Analytics Briefing &bull; {report.region.state}
                </h2>
                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                  <span>District: <strong className="text-slate-200">{report.region.district}</strong></span>
                  <span>&bull;</span>
                  <span>City: <strong className="text-slate-200">{report.region.city}</strong></span>
                  <span>&bull;</span>
                  <span>Year: <strong className="text-slate-200">{report.region.year}</strong></span>
                </div>
              </div>

              <div className="text-right text-[11px] font-mono text-slate-400">
                <div>Security: Law Enforcement Analytical Copy</div>
                <div>Issued: {new Date(report.generatedAt).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Metrics Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-slate-900/80 p-4 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">Total Recorded Cases</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">{report.summary.totalCrimes}</div>
              </div>
              <div className="rounded-2xl bg-slate-900/80 p-4 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">Resolution Rate</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{report.summary.solveRate}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{report.summary.solvedCases} Solved</div>
              </div>
              <div className="rounded-2xl bg-slate-900/80 p-4 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">Arrests Executed</div>
                <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{report.summary.arrestRate}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{report.summary.arrestsMade} Suspects Detained</div>
              </div>
              <div className="rounded-2xl bg-slate-900/80 p-4 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">Avg Investigation</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{report.summary.avgInvestigationDays || 0}d</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Days to resolution</div>
              </div>
            </div>
          </div>

          {/* Crime Types & Case Statuses Tables */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Major Crime Types */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-4">Major Recorded Offense Types</h3>
              <div className="space-y-3">
                {report.crimeTypes.map((ct, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="font-medium text-slate-200">{ct.crime_type}</span>
                    <span className="font-mono text-cyan-400 font-bold">{ct.count} Cases ({ct.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Police Station Workload */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-4">Police Station Clearance Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                    <tr>
                      <th className="py-2">Station</th>
                      <th className="py-2 text-right">Cases</th>
                      <th className="py-2 text-right">Solved</th>
                      <th className="py-2 text-right">Arrests</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {report.policeStations.map((ps, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 font-medium text-slate-200">{ps.police_station}</td>
                        <td className="py-2.5 text-right font-mono text-white">{ps.count}</td>
                        <td className="py-2.5 text-right font-mono text-emerald-400">{ps.solved}</td>
                        <td className="py-2.5 text-right font-mono text-amber-300">{ps.arrests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
