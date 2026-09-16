import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Shield,
  AlertTriangle,
  MapPin,
  Clock,
  Phone,
  User,
  Car,
  CheckCircle2,
  Play,
  Pause,
  Maximize2,
  X,
  Send,
  RefreshCw,
  Search,
  Filter,
  Volume2,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { EmergencyReport, EmergencyStats, PatrolAssignment } from '../types';

export const PoliceEmergencyPage: React.FC = () => {
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [stats, setStats] = useState<EmergencyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected report for modal / full dossier
  const [selectedReport, setSelectedReport] = useState<EmergencyReport | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  // Patrol Form states
  const [unitName, setUnitName] = useState('PCR Unit-04 (Delta)');
  const [vehicleType, setVehicleType] = useState('PCR Interceptor SUV');
  const [officerInCharge, setOfficerInCharge] = useState('Insp. K. Ramanathan');
  const [contactNumber, setContactNumber] = useState('+91 94440 10001');
  const [etaMinutes, setEtaMinutes] = useState(4);
  const [dispatchNotes, setDispatchNotes] = useState('Immediate rapid response with siren enabled.');
  const [isDispatching, setIsDispatching] = useState(false);

  // Audio Playback state
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Notification Sound for incoming emergencies
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(660, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // AudioContext policy
    }
  };

  // Load Reports
  const loadReports = async () => {
    try {
      setIsRefreshing(true);
      const res = await api.getEmergencyReports({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined
      });
      if (res.success) {
        setReports(res.reports);
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Error fetching emergency reports:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter, severityFilter]);

  // Connect to SSE Stream for Live Emergency Feed
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      const streamUrl = api.getEmergencyStreamUrl();
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener('NEW_EMERGENCY', (event) => {
        try {
          const newReport: EmergencyReport = JSON.parse(event.data);
          playAlertSound();
          setReports((prev) => [newReport, ...prev.filter(r => r.report_code !== newReport.report_code)]);
          setStats((prev) => prev ? { ...prev, total_emergencies: prev.total_emergencies + 1, active_incidents: prev.active_incidents + 1 } : null);
        } catch (e) {
          console.error('Failed to parse SSE new emergency:', e);
        }
      });

      eventSource.addEventListener('STATUS_UPDATE', (event) => {
        try {
          const updated: EmergencyReport = JSON.parse(event.data);
          setReports((prev) => prev.map(r => r.report_code === updated.report_code ? updated : r));
        } catch (e) {
          console.error('Failed to parse status update event:', e);
        }
      });

      eventSource.addEventListener('PATROL_ASSIGNED', (event) => {
        try {
          const updated: EmergencyReport = JSON.parse(event.data);
          setReports((prev) => prev.map(r => r.report_code === updated.report_code ? updated : r));
        } catch (e) {
          console.error('Failed to parse patrol assigned event:', e);
        }
      });
    } catch (err) {
      console.error('SSE connection error:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Audio Player Toggle
  const toggleAudio = (url: string) => {
    const fullUrl = api.getMediaUrl(url);
    if (playingAudioUrl === fullUrl) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioUrl(null);
    } else {
      setPlayingAudioUrl(fullUrl);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = fullUrl;
        audioPlayerRef.current.play().catch(e => console.error('Audio play error:', e));
      }
    }
  };

  // Status Updater
  const handleStatusChange = async (reportCode: string, newStatus: string) => {
    try {
      const res = await api.updateEmergencyStatus(reportCode, newStatus, `Police Command updated status to ${newStatus}`);
      if (res.success) {
        setReports(prev => prev.map(r => r.report_code === reportCode ? res.report : r));
        if (selectedReport?.report_code === reportCode) {
          setSelectedReport(res.report);
        }
      }
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Dispatch Patrol Unit
  const handleDispatchPatrol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setIsDispatching(true);
    try {
      const res = await api.assignPatrolUnit(selectedReport.report_code, {
        unit_name: unitName,
        vehicle_type: vehicleType,
        officer_in_charge: officerInCharge,
        contact_number: contactNumber,
        eta_minutes: etaMinutes,
        dispatch_notes: dispatchNotes
      });

      if (res.success) {
        setReports(prev => prev.map(r => r.report_code === selectedReport.report_code ? res.report : r));
        setSelectedReport(res.report);
        setIsAssignModalOpen(false);
      }
    } catch (err: any) {
      alert('Failed to dispatch patrol: ' + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter(r => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = r.report_code.toLowerCase().includes(q);
      const matchType = r.incident_type.toLowerCase().includes(q);
      const matchLoc = (r.location_address || '').toLowerCase().includes(q);
      const matchCitizen = (r.citizen_name || '').toLowerCase().includes(q);
      if (!matchCode && !matchType && !matchLoc && !matchCitizen) return false;
    }
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'REVIEWING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'PATROL_ASSIGNED':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'RESPONDING':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden Audio Player */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setPlayingAudioUrl(null)}
        className="hidden"
      />

      {/* Header & Command Live Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#0c1630] via-[#091124] to-[#0c1630] p-5 border border-slate-800/80 shadow-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Police Command Center
              </span>
              <span className="flex items-center space-x-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>LIVE SSE STREAM CONNECTED</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Emergency Response & Patrol Dispatch Hub
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <button
            onClick={loadReports}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-cyan-500 hover:text-cyan-400 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
          <a
            href="/emergency"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-red-500 transition-all"
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Citizen SOS Portal</span>
          </a>
        </div>
      </div>

      {/* Top Emergency KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 sm:p-4 backdrop-blur-md">
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Critical Threats</div>
          <div className="mt-1 text-2xl font-black text-rose-300">
            {stats?.critical_active ?? 0}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">Requires immediate unit</div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 sm:p-4 backdrop-blur-md">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Active Incidents</div>
          <div className="mt-1 text-2xl font-black text-amber-300">
            {stats?.active_incidents ?? 0}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">Under police review</div>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 sm:p-4 backdrop-blur-md">
          <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Patrols Responding</div>
          <div className="mt-1 text-2xl font-black text-cyan-300">
            {stats?.patrols_responding ?? 0}
          </div>
          <div className="text-[10px] text-cyan-400/80 mt-0.5">En route to coordinates</div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 sm:p-4 backdrop-blur-md">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Resolved</div>
          <div className="mt-1 text-2xl font-black text-emerald-300">
            {stats?.resolved_count ?? 0}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">Intervention completed</div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 sm:p-4 backdrop-blur-md">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Response ETA</div>
          <div className="mt-1 text-2xl font-black text-slate-200">
            ~4.2 <span className="text-xs font-normal text-slate-400">mins</span>
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">GPS optimized routing</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report ID, incident category, citizen name, address..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="PATROL_ASSIGNED">Patrol Assigned</option>
            <option value="RESPONDING">Responding</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </div>
      </div>

      {/* Live Incident Dossier Cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
          <span className="text-xs text-slate-400">Loading police command feed...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#090e1f] p-12 text-center space-y-3">
          <ShieldAlert className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No Emergency Alerts in Queue</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All reports have been reviewed or no emergency submissions match the active filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.report_code}
              className="rounded-2xl border border-slate-800/90 bg-[#0a1024]/90 hover:border-cyan-500/40 p-4 sm:p-5 transition-all shadow-xl backdrop-blur-md space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-sm text-cyan-400 tracking-wider">
                    {report.report_code}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${getSeverityBadge(report.severity)}`}>
                    {report.severity}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusBadge(report.status)}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(report.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Status Stepper Actions */}
                <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                  {report.status === 'RECEIVED' && (
                    <button
                      onClick={() => handleStatusChange(report.report_code, 'REVIEWING')}
                      className="rounded-lg bg-amber-600/80 hover:bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                    >
                      Acknowledge / Review
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setIsAssignModalOpen(true);
                    }}
                    className="flex items-center space-x-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-cyan-600/20 transition-all"
                  >
                    <Car className="h-3.5 w-3.5" />
                    <span>{report.patrol_assignment ? 'Update Patrol' : 'Assign Patrol'}</span>
                  </button>

                  {report.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleStatusChange(report.report_code, 'RESOLVED')}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body: Media & Incident Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left Column: Photo & Audio */}
                <div className="lg:col-span-4 space-y-3">
                  {/* Photo Preview */}
                  {report.photo_url ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
                      <img
                        src={api.getMediaUrl(report.photo_url)}
                        alt="Emergency Evidence"
                        className="h-36 w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <button
                        onClick={() => setActivePhotoModal(api.getMediaUrl(report.photo_url))}
                        className="absolute bottom-2 right-2 rounded-lg bg-black/70 p-1.5 text-white hover:bg-cyan-600 transition-colors backdrop-blur-sm"
                        title="View Full Resolution"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                      <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] text-cyan-300 font-mono">
                        Evidence Photo
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-center text-xs text-slate-500">
                      No Photo Attached
                    </div>
                  )}

                  {/* Audio Voice Player */}
                  {report.audio_url && (
                    <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                          <Volume2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">Voice Recording</div>
                          <div className="text-[10px] text-slate-400">Citizen Audio Memo</div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAudio(report.audio_url!)}
                        className="flex items-center space-x-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors"
                      >
                        {playingAudioUrl === api.getMediaUrl(report.audio_url) ? (
                          <>
                            <Pause className="h-3.5 w-3.5" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            <span>Play Audio</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Middle Column: Text Description, Citizen Info & Location */}
                <div className="lg:col-span-5 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Incident Category
                    </h4>
                    <p className="text-sm font-bold text-slate-100">{report.incident_type}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Incident Description
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                      {report.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-300">
                      <User className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{report.citizen_name || 'Anonymous'}</span>
                    </div>

                    {report.citizen_phone && (
                      <a
                        href={`tel:${report.citizen_phone}`}
                        className="flex items-center space-x-1 text-cyan-400 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>{report.citizen_phone}</span>
                      </a>
                    )}
                  </div>

                  {/* Location Info */}
                  <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{report.city || report.district || 'Tamil Nadu'}</span>
                      </div>
                      {report.latitude && report.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 text-[11px] text-cyan-400 hover:underline"
                        >
                          <span>Open GPS Route</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {report.location_address}
                    </p>
                  </div>
                </div>

                {/* Right Column: Patrol Dispatch Info & Timeline */}
                <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-[#070d1e] p-3.5 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                    <span>Patrol Unit Status</span>
                    <Car className="h-3.5 w-3.5 text-cyan-400" />
                  </div>

                  {report.patrol_assignment ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Assigned Unit:</span>
                        <span className="font-bold text-cyan-300">{report.patrol_assignment.unit_name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Vehicle:</span>
                          <span className="text-slate-300">{report.patrol_assignment.vehicle_type}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">ETA:</span>
                          <span className="font-bold text-amber-400 font-mono">
                            {report.patrol_assignment.eta_minutes} mins
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Officer in Charge:</span>
                        <span className="text-slate-300">{report.patrol_assignment.officer_in_charge}</span>
                      </div>
                      {report.patrol_assignment.dispatch_notes && (
                        <div className="text-[10px] text-slate-400 italic bg-slate-900/90 p-1.5 rounded border border-slate-800">
                          "{report.patrol_assignment.dispatch_notes}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 space-y-2">
                      <span className="text-xs text-rose-400 font-medium block">No Patrol Assigned</span>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setIsAssignModalOpen(true);
                        }}
                        className="rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-colors"
                      >
                        Dispatch Unit Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ASSIGN PATROL MODAL */}
      {isAssignModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0a1126] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Car className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Dispatch Patrol Unit to {selectedReport.report_code}
                </h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchPatrol} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">Unit Name</label>
                  <input
                    type="text"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="PCR Interceptor SUV">PCR Interceptor SUV</option>
                    <option value="Highway Patrol Cruiser">Highway Patrol Cruiser</option>
                    <option value="Quick Response Bike (QRT)">Quick Response Bike (QRT)</option>
                    <option value="All-Women Police Patrol">All-Women Police Patrol</option>
                    <option value="Armed Intervention Van">Armed Intervention Van</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">Officer in Charge</label>
                  <input
                    type="text"
                    value={officerInCharge}
                    onChange={(e) => setOfficerInCharge(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">Estimated ETA (mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={etaMinutes}
                    onChange={(e) => setEtaMinutes(parseInt(e.target.value, 10))}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Officer Contact Number</label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Special Dispatch Instructions</label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Approach with caution, siren disabled / enabled..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isDispatching ? 'Dispatching...' : 'Dispatch Unit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL PHOTO LIGHTBOX MODAL */}
      {activePhotoModal && (
        <div
          onClick={() => setActivePhotoModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700">
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-4 right-4 rounded-full bg-black/80 text-white p-2 hover:bg-rose-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={activePhotoModal}
              alt="High Res Incident Evidence"
              className="max-h-[85vh] w-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
