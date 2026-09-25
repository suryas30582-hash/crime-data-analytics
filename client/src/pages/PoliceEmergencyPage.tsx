import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  ArrowRight,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { EmergencyReport, EmergencyStats, PatrolAssignment } from '../types';

export const PoliceEmergencyPage: React.FC = () => {
  const location = useLocation();
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [stats, setStats] = useState<EmergencyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected report for modal / full dossier
  const [selectedReport, setSelectedReport] = useState<EmergencyReport | null>(null);

  // Auto-select report if ?code= query param exists in URL
  useEffect(() => {
    const codeParam = new URLSearchParams(location.search).get('code');
    if (codeParam && reports.length > 0) {
      const target = reports.find(r => r.report_code === codeParam);
      if (target) {
        setSelectedReport(target);
      }
    }
  }, [location.search, reports]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  // Media Deletion confirmation state
  const [mediaToDelete, setMediaToDelete] = useState<{ reportCode: string; mediaType: 'photo' | 'audio'; title: string } | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);

  // Patrol Form states
  const [unitName, setUnitName] = useState('PCR Unit-04 (Delta)');
  const [vehicleType, setVehicleType] = useState('PCR Interceptor SUV');
  const [officerInCharge, setOfficerInCharge] = useState('Insp. K. Ramanathan');
  const [contactNumber, setContactNumber] = useState('+91 94440 10001');
  const [etaMinutes, setEtaMinutes] = useState(4);
  const [dispatchNotes, setDispatchNotes] = useState('Immediate rapid response with siren enabled.');
  const [isDispatching, setIsDispatching] = useState(false);

  // Audio Playback & Alarm Sound State
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Alarm & Real-time Alert System
  const [isAlertAudioEnabled, setIsAlertAudioEnabled] = useState(false);
  const [unacknowledgedReports, setUnacknowledgedReports] = useState<EmergencyReport[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  const notifiedCodesRef = useRef<Set<string>>(new Set());

  // Initialize or resume Web Audio API Context
  const enableAlertAudio = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setIsAlertAudioEnabled(true);
      // Play brief test beep
      triggerSingleAlarmBeep();
    } catch (e) {
      console.warn('Audio Context unlock warning:', e);
    }
  };

  // Play a single alarm pulse (Alarm -> short silence pattern)
  const triggerSingleAlarmBeep = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Pulse 1 (Alarm)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(660, now + 0.15);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Pulse 2 after short silence (0.2s gap)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(880, now + 0.5);
      osc2.frequency.setValueAtTime(1100, now + 0.65);
      gain2.gain.setValueAtTime(0.35, now + 0.5);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.5);
      osc2.stop(now + 0.8);
    } catch {
      // AudioContext policy
    }
  };

  // Continuous Alarm Loop when unacknowledged reports exist
  useEffect(() => {
    if (unacknowledgedReports.length > 0 && isAlertAudioEnabled) {
      if (!alarmIntervalRef.current) {
        alarmIntervalRef.current = setInterval(() => {
          triggerSingleAlarmBeep();
        }, 1400);
      }
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    }
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, [unacknowledgedReports.length, isAlertAudioEnabled]);

  // Acknowledge single emergency report
  const acknowledgeReportAlert = (reportCode: string) => {
    setUnacknowledgedReports((prev) => prev.filter((r) => r.report_code !== reportCode));
    // Also transition status in backend to REVIEWING if currently RECEIVED
    handleStatusChange(reportCode, 'REVIEWING');
  };

  // Acknowledge all active alerts
  const acknowledgeAllAlerts = () => {
    unacknowledgedReports.forEach((r) => {
      handleStatusChange(r.report_code, 'REVIEWING');
    });
    setUnacknowledgedReports([]);
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

        // Track unacknowledged reports (status === RECEIVED)
        const received = res.reports.filter((r: EmergencyReport) => r.status === 'RECEIVED');
        setUnacknowledgedReports(received);
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
          
          if (!notifiedCodesRef.current.has(newReport.report_code)) {
            notifiedCodesRef.current.add(newReport.report_code);
            setUnacknowledgedReports((prev) => [newReport, ...prev.filter(r => r.report_code !== newReport.report_code)]);
            triggerSingleAlarmBeep();
          }

          setReports((prev) => [newReport, ...prev.filter(r => r.report_code !== newReport.report_code)]);
          setStats((prev) => prev ? { ...prev, total_emergencies: prev.total_emergencies + 1, active_incidents: prev.active_incidents + 1 } : null);
        } catch (e) {
          console.error('Failed to parse SSE new emergency:', e);
        }
      });

      eventSource.addEventListener('STATUS_UPDATE', (event) => {
        try {
          const updated: EmergencyReport = JSON.parse(event.data);
          if (updated.status !== 'RECEIVED') {
            setUnacknowledgedReports((prev) => prev.filter(r => r.report_code !== updated.report_code));
          }
          setReports((prev) => prev.map(r => r.report_code === updated.report_code ? updated : r));
        } catch (e) {
          console.error('Failed to parse status update event:', e);
        }
      });

      eventSource.addEventListener('PATROL_ASSIGNED', (event) => {
        try {
          const updated: EmergencyReport = JSON.parse(event.data);
          setUnacknowledgedReports((prev) => prev.filter(r => r.report_code !== updated.report_code));
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

  // Delete specific incident media (photo or audio)
  const handleDeleteMedia = async () => {
    if (!mediaToDelete) return;
    setIsDeletingMedia(true);
    try {
      const res = await api.deleteEmergencyMedia(mediaToDelete.reportCode, mediaToDelete.mediaType);
      if (res.success) {
        setReports(prev => prev.map(r => r.report_code === mediaToDelete.reportCode ? res.report : r));
        if (selectedReport?.report_code === mediaToDelete.reportCode) {
          setSelectedReport(res.report);
        }
        setMediaToDelete(null);
      }
    } catch (err: any) {
      alert('Failed to delete media: ' + err.message);
    } finally {
      setIsDeletingMedia(false);
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
        return 'bg-[#883A2E]/15 text-[#883A2E] border-[#883A2E]/30 animate-pulse';
      case 'HIGH':
        return 'bg-[#D65A31]/15 text-[#D65A31] border-[#D65A31]/30';
      case 'MEDIUM':
        return 'bg-[#C47A5A]/20 text-[#542A20] border-[#C47A5A]/40';
      default:
        return 'bg-[#FAF0EC] text-[#7A6360] border-[#EEDFD9]';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-[#883A2E]/15 text-[#883A2E] border-[#883A2E]/30';
      case 'REVIEWING':
        return 'bg-[#D65A31]/15 text-[#D65A31] border-[#D65A31]/30';
      case 'PATROL_ASSIGNED':
        return 'bg-[#C47A5A]/20 text-[#542A20] border-[#C47A5A]/40';
      case 'RESPONDING':
        return 'bg-[#542A20]/15 text-[#542A20] border-[#542A20]/30';
      case 'RESOLVED':
        return 'bg-[#2E7D32]/15 text-[#2E7D32] border-[#2E7D32]/30';
      default:
        return 'bg-[#FAF0EC] text-[#7A6360] border-[#EEDFD9]';
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#542A20] via-[#883A2E] to-[#542A20] p-5 border border-[#883A2E] shadow-xl text-white">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D65A31] text-white shadow-lg shadow-[#D65A31]/40">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FAF0EC] font-mono">
                Police Command Center
              </span>
              <span className="flex items-center space-x-1.5 rounded-full bg-[#2E7D32]/30 px-2.5 py-0.5 text-[10px] font-bold text-white border border-[#2E7D32]/40">
                <span className="h-2 w-2 rounded-full bg-[#2E7D32] animate-ping"></span>
                <span>LIVE SSE STREAM CONNECTED</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Emergency Response & Patrol Dispatch Hub
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={enableAlertAudio}
            className={`flex items-center space-x-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              isAlertAudioEnabled
                ? 'border-[#2E7D32]/40 bg-[#2E7D32]/30 text-white'
                : 'border-[#D65A31] bg-[#D65A31] text-white animate-pulse'
            }`}
          >
            <Volume2 className="h-4 w-4" />
            <span>{isAlertAudioEnabled ? '🔔 Alarm Audio Active' : '⚡ Enable Emergency Alert Audio'}</span>
          </button>

          <button
            onClick={loadReports}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
          <a
            href="/emergency"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 rounded-xl bg-[#D65A31] hover:bg-[#C47A5A] px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-[#D65A31]/30 transition-all"
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Citizen SOS Portal</span>
          </a>
        </div>
      </div>

      {/* NEW EMERGENCY REPORT PROMINENT VISUAL ALERT BANNER */}
      {unacknowledgedReports.length > 0 && (
        <div className="rounded-2xl border-2 border-[#D65A31] bg-gradient-to-r from-[#883A2E] via-[#D65A31] to-[#883A2E] p-4 text-white shadow-xl animate-in zoom-in-95 duration-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#883A2E] shadow-md animate-bounce">
                <AlertTriangle className="h-6 w-6 text-[#D65A31]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-white text-[#883A2E] font-black px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
                    NEW EMERGENCY REPORT ({unacknowledgedReports.length})
                  </span>
                  <span className="text-xs font-mono text-white/90">
                    {unacknowledgedReports[0].report_code}
                  </span>
                </div>
                <p className="text-sm font-bold text-white mt-0.5">
                  {unacknowledgedReports[0].incident_type} — {unacknowledgedReports[0].location_address || 'GPS Coordinates Logged'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              <button
                onClick={() => acknowledgeReportAlert(unacknowledgedReports[0].report_code)}
                className="rounded-xl bg-white text-[#883A2E] hover:bg-[#FAF0EC] px-4 py-2 text-xs font-black shadow-md transition-all cursor-pointer"
              >
                Acknowledge & Mute Alarm
              </button>
              {unacknowledgedReports.length > 1 && (
                <button
                  onClick={acknowledgeAllAlerts}
                  className="rounded-xl border border-white/40 bg-black/20 hover:bg-black/30 px-3 py-2 text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  Acknowledge All ({unacknowledgedReports.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Emergency KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-xl border border-[#883A2E]/30 bg-[#FFFDFC] p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#883A2E] uppercase tracking-wider">Critical Threats</div>
          <div className="mt-1 text-2xl font-black text-[#883A2E]">
            {stats?.critical_active ?? 0}
          </div>
          <div className="text-[10px] text-[#7A6360] mt-0.5">Requires immediate unit</div>
        </div>

        <div className="rounded-xl border border-[#D65A31]/30 bg-[#FFFDFC] p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#D65A31] uppercase tracking-wider">Active Incidents</div>
          <div className="mt-1 text-2xl font-black text-[#D65A31]">
            {stats?.active_incidents ?? 0}
          </div>
          <div className="text-[10px] text-[#7A6360] mt-0.5">Under police review</div>
        </div>

        <div className="rounded-xl border border-[#C47A5A]/30 bg-[#FFFDFC] p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#542A20] uppercase tracking-wider">Patrols Responding</div>
          <div className="mt-1 text-2xl font-black text-[#542A20]">
            {stats?.patrols_responding ?? 0}
          </div>
          <div className="text-[10px] text-[#7A6360] mt-0.5">En route to coordinates</div>
        </div>

        <div className="rounded-xl border border-[#2E7D32]/30 bg-[#FFFDFC] p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#2E7D32] uppercase tracking-wider">Resolved</div>
          <div className="mt-1 text-2xl font-black text-[#2E7D32]">
            {stats?.resolved_count ?? 0}
          </div>
          <div className="text-[10px] text-[#7A6360] mt-0.5">Intervention completed</div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#7A6360] uppercase tracking-wider">Avg Response ETA</div>
          <div className="mt-1 text-2xl font-black text-[#2B1F1D]">
            ~4.2 <span className="text-xs font-normal text-[#7A6360]">mins</span>
          </div>
          <div className="text-[10px] text-[#883A2E] mt-0.5 font-medium">GPS optimized routing</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7A6360]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report ID, incident category, citizen name, address..."
            className="w-full rounded-lg border border-[#EEDFD9] bg-[#FAF0EC] pl-9 pr-3 py-1.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#EEDFD9] bg-[#FAF0EC] px-2.5 py-1.5 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none"
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
            className="rounded-lg border border-[#EEDFD9] bg-[#FAF0EC] px-2.5 py-1.5 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none"
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
          <RefreshCw className="h-8 w-8 text-[#883A2E] animate-spin" />
          <span className="text-xs text-[#7A6360]">Loading police command feed...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-12 text-center space-y-3 shadow-sm">
          <ShieldAlert className="h-12 w-12 text-[#7A6360] mx-auto" />
          <h3 className="text-base font-bold text-[#2B1F1D]">No Emergency Alerts in Queue</h3>
          <p className="text-xs text-[#7A6360] max-w-sm mx-auto">
            All reports have been reviewed or no emergency submissions match the active filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.report_code}
              className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] hover:border-[#883A2E] p-4 sm:p-5 transition-all shadow-sm space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#EEDFD9] pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-sm text-[#883A2E] tracking-wider">
                    {report.report_code}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${getSeverityBadge(report.severity)}`}>
                    {report.severity}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusBadge(report.status)}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-medium text-[#7A6360] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(report.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Status Stepper Actions */}
                <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                  {report.status === 'RECEIVED' && (
                    <button
                      onClick={() => handleStatusChange(report.report_code, 'REVIEWING')}
                      className="rounded-lg bg-[#D65A31] hover:bg-[#C47A5A] px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      Acknowledge / Review
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setIsAssignModalOpen(true);
                    }}
                    className="flex items-center space-x-1 rounded-lg bg-[#883A2E] hover:bg-[#542A20] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Car className="h-3.5 w-3.5" />
                    <span>{report.patrol_assignment ? 'Update Patrol' : 'Assign Patrol'}</span>
                  </button>

                  {report.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleStatusChange(report.report_code, 'RESOLVED')}
                      className="rounded-lg border border-[#2E7D32]/30 bg-[#2E7D32]/10 hover:bg-[#2E7D32]/20 px-3 py-1.5 text-xs font-semibold text-[#2E7D32] transition-colors cursor-pointer"
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
                    <div className="relative rounded-xl overflow-hidden border border-[#EEDFD9] bg-[#FAF0EC] group">
                      <img
                        src={api.getMediaUrl(report.photo_url)}
                        alt="Emergency Evidence"
                        className="h-36 w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-2 right-2 flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setActivePhotoModal(api.getMediaUrl(report.photo_url))}
                          className="rounded-lg bg-black/75 p-1.5 text-white hover:bg-[#883A2E] transition-colors backdrop-blur-sm cursor-pointer"
                          title="View Full Resolution"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setMediaToDelete({ reportCode: report.report_code, mediaType: 'photo', title: 'Evidence Photo' })}
                          className="rounded-lg bg-black/75 p-1.5 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors backdrop-blur-sm cursor-pointer"
                          title="Delete Evidence Photo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] text-[#FAF0EC] font-mono">
                        Evidence Photo
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 rounded-xl border border-[#EEDFD9] bg-[#FAF0EC] flex items-center justify-center text-xs text-[#7A6360]">
                      No Photo Attached
                    </div>
                  )}

                  {/* Audio Voice Player */}
                  {report.audio_url && (
                    <div className="rounded-xl border border-[#EEDFD9] bg-[#FAF0EC] p-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#883A2E]/10 text-[#883A2E]">
                          <Volume2 className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-[#2B1F1D] truncate flex items-center gap-1.5">
                            <span>Voice Recording</span>
                            {report.audio_duration !== undefined && report.audio_duration !== null && (
                              <span className="font-mono text-[10px] bg-[#883A2E]/15 text-[#883A2E] px-1.5 py-0.5 rounded font-bold">
                                {Math.floor(Number(report.audio_duration) / 60)}:{(Math.round(Number(report.audio_duration)) % 60).toString().padStart(2, '0')}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#7A6360] truncate">
                            {report.audio_size ? `${(report.audio_size / 1024).toFixed(1)} KB audio` : 'Citizen Audio Memo'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => toggleAudio(report.audio_url!)}
                          className="flex items-center space-x-1.5 rounded-lg bg-[#883A2E] hover:bg-[#542A20] px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                          {playingAudioUrl === api.getMediaUrl(report.audio_url) ? (
                            <>
                              <Pause className="h-3.5 w-3.5" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              <span>Play</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setMediaToDelete({ reportCode: report.report_code, mediaType: 'audio', title: 'Voice Recording' })}
                          className="rounded-lg border border-rose-300 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Delete Voice Recording"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Middle Column: Text Description, Citizen Info & Location */}
                <div className="lg:col-span-5 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A6360]">
                      Incident Category
                    </h4>
                    <p className="text-sm font-bold text-[#2B1F1D]">{report.incident_type}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A6360]">
                      Incident Description
                    </h4>
                    <p className="text-xs text-[#2B1F1D] mt-0.5 leading-relaxed bg-[#FAF0EC] p-2.5 rounded-lg border border-[#EEDFD9]">
                      {report.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center space-x-1.5 text-[#2B1F1D]">
                      <User className="h-3.5 w-3.5 text-[#883A2E]" />
                      <span>{report.citizen_name || 'Anonymous'}</span>
                    </div>

                    {report.citizen_phone && (
                      <a
                        href={`tel:${report.citizen_phone}`}
                        className="flex items-center space-x-1 text-[#883A2E] hover:underline font-medium"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>{report.citizen_phone}</span>
                      </a>
                    )}
                  </div>

                  {/* Location Info */}
                  <div className="rounded-lg bg-[#FAF0EC] p-2.5 border border-[#EEDFD9] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1 text-[#2E7D32] font-semibold">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{report.city || report.district || 'Tamil Nadu'}</span>
                      </div>
                      {report.latitude && report.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 text-[11px] text-[#883A2E] hover:underline font-medium"
                        >
                          <span>Open GPS Route</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {report.latitude && report.longitude && (
                      <div className="text-[10px] font-mono text-[#7A6360] bg-[#FFFDFC] px-2 py-0.5 rounded border border-[#EEDFD9] inline-block">
                        GPS: Lat {Number(report.latitude).toFixed(6)}, Long {Number(report.longitude).toFixed(6)}
                      </div>
                    )}
                    <p className="text-[11px] text-[#7A6360]">
                      {report.location_address}
                    </p>
                  </div>
                </div>

                {/* Right Column: Patrol Dispatch Info & Timeline */}
                <div className="lg:col-span-3 rounded-xl border border-[#EEDFD9] bg-[#FAF0EC] p-3.5 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#7A6360] border-b border-[#EEDFD9] pb-1.5 flex items-center justify-between">
                    <span>Patrol Unit Status</span>
                    <Car className="h-3.5 w-3.5 text-[#883A2E]" />
                  </div>

                  {report.patrol_assignment ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-[#7A6360] block">Assigned Unit:</span>
                        <span className="font-bold text-[#883A2E]">{report.patrol_assignment.unit_name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <div>
                          <span className="text-[10px] text-[#7A6360] block">Vehicle:</span>
                          <span className="text-[#2B1F1D]">{report.patrol_assignment.vehicle_type}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#7A6360] block">ETA:</span>
                          <span className="font-bold text-[#D65A31] font-mono">
                            {report.patrol_assignment.eta_minutes} mins
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7A6360] block">Officer in Charge:</span>
                        <span className="text-[#2B1F1D]">{report.patrol_assignment.officer_in_charge}</span>
                      </div>
                      {report.patrol_assignment.dispatch_notes && (
                        <div className="text-[10px] text-[#7A6360] italic bg-[#FFFDFC] p-1.5 rounded border border-[#EEDFD9]">
                          "{report.patrol_assignment.dispatch_notes}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 space-y-2">
                      <span className="text-xs text-[#883A2E] font-medium block">No Patrol Assigned</span>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setIsAssignModalOpen(true);
                        }}
                        className="rounded-lg bg-[#883A2E] hover:bg-[#542A20] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#542A20]/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 text-[#2B1F1D]">
            <div className="flex items-center justify-between border-b border-[#EEDFD9] pb-3">
              <div className="flex items-center space-x-2">
                <Car className="h-5 w-5 text-[#883A2E]" />
                <h3 className="text-base font-bold text-[#2B1F1D]">
                  Dispatch Patrol Unit to {selectedReport.report_code}
                </h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-lg p-1 text-[#7A6360] hover:bg-[#FAF0EC] hover:text-[#2B1F1D] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchPatrol} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#7A6360]">Unit Name</label>
                  <input
                    type="text"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#7A6360]">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                  >
                    <option value="PCR Interceptor SUV">PCR Interceptor SUV</option>
                    <option value="Highway Patrol Cruiser">Highway Patrol Cruiser</option>
                    <option value="Quick Response Bike (QRT)">Quick Response Bike (QRT)</option>
                    <option value="All-Women Police Patrol">All-Women Police Patrol</option>
                    <option value="Armed Intervention Van">Armed Intervention Van</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#7A6360]">Officer in Charge</label>
                  <input
                    type="text"
                    value={officerInCharge}
                    onChange={(e) => setOfficerInCharge(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#7A6360]">Estimated ETA (mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={etaMinutes}
                    onChange={(e) => setEtaMinutes(parseInt(e.target.value, 10))}
                    required
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#7A6360]">Officer Contact Number</label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#7A6360]">Special Dispatch Instructions</label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Approach with caution, siren disabled / enabled..."
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] p-2.5 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-xl border border-[#EEDFD9] bg-[#FAF0EC] px-4 py-2 text-xs font-semibold text-[#7A6360] hover:bg-[#EEDFD9] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="flex items-center space-x-2 rounded-xl bg-[#883A2E] hover:bg-[#542A20] px-5 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#542A20]/80 backdrop-blur-md animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-2 shadow-2xl">
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-4 right-4 rounded-full bg-black/80 text-white p-2 hover:bg-[#883A2E] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={activePhotoModal}
              alt="High Res Incident Evidence"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* CONFIRM MEDIA DELETION MODAL */}
      {mediaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#542A20]/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-[#2B1F1D]">
            <div className="flex items-start space-x-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2B1F1D]">
                  Delete {mediaToDelete.title}?
                </h3>
                <p className="text-xs text-[#7A6360] mt-1 leading-relaxed">
                  Are you sure you want to permanently delete the <span className="text-[#883A2E] font-semibold">{mediaToDelete.title}</span> for emergency <span className="font-mono text-[#883A2E] font-bold">{mediaToDelete.reportCode}</span>?
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[11px] text-rose-800 leading-normal">
              ⚠️ This will remove the file from backend disk storage and update the database record. Other incidents and future reporting remain unaffected.
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setMediaToDelete(null)}
                disabled={isDeletingMedia}
                className="rounded-xl border border-[#EEDFD9] bg-[#FAF0EC] px-4 py-2 text-xs font-semibold text-[#7A6360] hover:bg-[#EEDFD9] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMedia}
                disabled={isDeletingMedia}
                className="flex items-center space-x-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeletingMedia ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
