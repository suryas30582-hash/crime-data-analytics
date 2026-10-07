import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Radio,
  Clock,
  MapPin,
  Camera,
  Play,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Send,
  Truck,
  User,
  Phone,
  FileText,
  Search,
  Filter,
  BadgeCheck,
  Building,
  Check,
  X,
  Database,
  UploadCloud,
  BarChart3,
  CheckCircle2,
  Volume2,
  VolumeX,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataset } from '../context/DatasetContext';
import { api } from '../services/api';
import { IncidentAudioPlayer } from '../components/common/IncidentAudioPlayer';
import { formatISTDateTime } from '../utils/dateFormatter';
import { emergencyAlarm } from '../utils/emergencyAlarm';

export const PoliceDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { datasets, activeDataset, activeDatasetId, setActiveDatasetId } = useDataset();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [serverStats, setServerStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Status update modal state
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>('INVESTIGATING');
  const [officerNotes, setOfficerNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Patrol dispatch modal state
  const [dispatchIncident, setDispatchIncident] = useState<any | null>(null);
  const [patrolUnit, setPatrolUnit] = useState('Eagle-1 Quick Response');
  const [vehicleType, setVehicleType] = useState('Police Interceptor SUV');
  const [etaMinutes, setEtaMinutes] = useState(5);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  // Action logs
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'feed' | 'logs'>('feed');

  // Alarm state & real-time SSE
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(emergencyAlarm.getIsPlaying());
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(emergencyAlarm.getIsAutoplayBlocked());
  const knownCodesRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);

  useEffect(() => {
    const unsub = emergencyAlarm.subscribe(() => {
      setIsAlarmPlaying(emergencyAlarm.getIsPlaying());
      setIsAutoplayBlocked(emergencyAlarm.getIsAutoplayBlocked());
    });
    return () => {
      unsub();
      emergencyAlarm.stopAlarm();
    };
  }, []);

  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const data = await api.getPoliceIncidentFeed({
        status: statusFilter,
        severity: severityFilter,
        search: searchQuery
      });
      const incidentList = data.incidents || data.reports || [];
      setIncidents(incidentList);
      if (data.stats) {
        setServerStats(data.stats);
      }
      // Populate known codes on initial load so old reports DO NOT trigger alarm on reload
      if (!initialLoadDoneRef.current && incidentList.length > 0) {
        incidentList.forEach((inc: any) => knownCodesRef.current.add(inc.report_code));
        initialLoadDoneRef.current = true;
      }
    } catch (err: any) {
      console.warn('Error fetching police feed:', err.message);
      setFetchError(err.message || 'Failed to load emergency incident feed from server');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await api.getPoliceActionLogs();
      setActionLogs(data.logs || []);
    } catch (err: any) {
      console.warn('Error fetching logs:', err.message);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchLogs();
  }, [statusFilter, severityFilter, searchQuery]);

  // Connect to SSE Stream for real-time automatic emergency detection
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 2000;
    let destroyed = false;

    function connectSSE() {
      if (destroyed) return;
      try {
        const streamUrl = api.getEmergencyStreamUrl();
        eventSource = new EventSource(streamUrl);

        eventSource.addEventListener('NEW_EMERGENCY', (event) => {
          try {
            const newReport = JSON.parse(event.data);
            if (!knownCodesRef.current.has(newReport.report_code)) {
              knownCodesRef.current.add(newReport.report_code);
              setIncidents(prev => [newReport, ...prev.filter(i => i.report_code !== newReport.report_code)]);
              emergencyAlarm.startAlarm(newReport.report_code);
            }
          } catch (e) {
            console.error('SSE Error in Police Dashboard:', e);
          }
        });

        eventSource.addEventListener('STATUS_UPDATE', (event) => {
          try {
            const updated = JSON.parse(event.data);
            setIncidents(prev => prev.map(i => i.report_code === updated.report_code ? { ...i, ...updated } : i));
          } catch (e) {}
        });

        eventSource.addEventListener('PATROL_ASSIGNED', (event) => {
          try {
            const updated = JSON.parse(event.data);
            setIncidents(prev => prev.map(i => i.report_code === updated.report_code ? { ...i, ...updated } : i));
          } catch (e) {}
        });

        // Reset backoff on successful connection
        eventSource.onopen = () => { retryDelay = 2000; };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          if (!destroyed) {
            reconnectTimer = setTimeout(() => {
              retryDelay = Math.min(retryDelay * 2, 30000);
              connectSSE();
            }, retryDelay);
          }
        };
      } catch (err) {
        console.warn('SSE connection warning:', err);
      }
    }

    connectSSE();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) eventSource.close();
    };
  }, []);

  // Handle Status Update Submit
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    try {
      setIsUpdatingStatus(true);
      await api.updateIncidentStatus(selectedIncident.report_code, {
        status: newStatus,
        notes: officerNotes.trim()
      });
      setSelectedIncident(null);
      setOfficerNotes('');
      fetchIncidents();
      fetchLogs();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Patrol Dispatch Submit
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchIncident) return;

    try {
      setIsDispatching(true);
      await api.assignIncidentPatrol(dispatchIncident.report_code, {
        unit_name: patrolUnit,
        vehicle_type: vehicleType,
        officer_in_charge: user?.name || 'Inspector Vijay IPS',
        contact_number: user?.phone || '112 / Central Command',
        eta_minutes: etaMinutes,
        dispatch_notes: dispatchNotes.trim()
      });
      setDispatchIncident(null);
      setDispatchNotes('');
      fetchIncidents();
      fetchLogs();
    } catch (err: any) {
      alert('Failed to dispatch patrol: ' + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  // KPI calculations with serverStats & local fallback
  const totalCount = serverStats?.total_incidents ?? incidents.length;
  const criticalCount = serverStats?.critical_alarms ?? serverStats?.critical_active ?? incidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  const investigatingCount = serverStats?.under_investigation ?? serverStats?.active_incidents ?? incidents.filter(i => ['INVESTIGATING', 'UNDER_REVIEW', 'POLICE_VERIFICATION', 'REVIEWING', 'VIEWED', 'VIEWED_BY_OFFICER', 'ACKNOWLEDGED', 'RECEIVED', 'ALERT_RECEIVED', 'INCIDENT_REPORTED'].includes(i.status)).length;
  const dispatchedCount = serverStats?.patrols_dispatched ?? serverStats?.patrols_responding ?? incidents.filter(i => ['PATROL_ASSIGNED', 'OFFICER_ASSIGNED', 'RESPONDING', 'PATROL_EN_ROUTE', 'EN_ROUTE', 'ARRIVED', 'PATROL_ARRIVED'].includes(i.status)).length;
  const resolvedCount = serverStats?.resolved_incidents ?? serverStats?.resolved_count ?? incidents.filter(i => ['RESOLVED', 'CLOSED'].includes(i.status)).length;

  const handleInspectReport = async (reportCode: string) => {
    try {
      await api.markReportViewed(reportCode);
      fetchIncidents();
    } catch (e) {
      console.warn('Error marking report viewed:', e);
    }
  };

  const getCitizenTrackingBadge = (inc: any) => {
    const s = (inc.status || '').toUpperCase();
    const timelineStr = JSON.stringify(inc.status_timeline || []);
    const isResolved = s === 'RESOLVED' || s === 'CLOSED';
    const isEnRoute = s === 'EN_ROUTE' || s === 'PATROL_EN_ROUTE' || s === 'RESPONDING';
    const isAssigned = s === 'PATROL_ASSIGNED' || s === 'OFFICER_ASSIGNED' || !!inc.patrol_assignment || !!inc.assigned_patrol_code;
    const isAcknowledged = s === 'ACKNOWLEDGED' || s === 'REVIEWING' || !!inc.acknowledged_at || timelineStr.includes('ACKNOWLEDGED');
    const isViewed = s === 'VIEWED' || s === 'VIEWED_BY_OFFICER' || !!inc.viewed_at || timelineStr.includes('VIEWED');

    if (isResolved) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/30">
          <span>✓ RESOLVED</span>
        </span>
      );
    }
    if (isEnRoute) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">
          <span>📍 EN ROUTE</span>
        </span>
      );
    }
    if (isAssigned) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
          <span>🚓 OFFICER ASSIGNED</span>
        </span>
      );
    }
    if (isAcknowledged) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D65A31]/15 text-[#D65A31] border border-[#D65A31]/30">
          <span>✓ ACKNOWLEDGED</span>
        </span>
      );
    }
    if (isViewed) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <span>👁️ VIEWED BY OFFICER</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
        <span>🚨 NEW • NOT YET VIEWED</span>
      </span>
    );
  };

  const handleQuickStatusUpdate = async (reportCode: string, targetStatus: string, note?: string) => {
    try {
      emergencyAlarm.stopAlarm();
      await api.updateIncidentStatus(reportCode, {
        status: targetStatus,
        notes: note || `Status transitioned to ${targetStatus}`
      });
      fetchIncidents();
      fetchLogs();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const activeAlarms = incidents.filter(i => 
    i.status === 'ALERT_RECEIVED' || i.status === 'RECEIVED' || i.status === 'INCIDENT_REPORTED'
  );

  return (
    <div className="space-y-6">
      {/* Officer Command Header */}
      <div className="rounded-3xl border border-[#EEDFD9] bg-gradient-to-r from-[#FFFDFC] via-[#FAF0EC] to-[#FFF7F4] p-6 sm:p-8 shadow-warm-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#542A20] text-white">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>POLICE COMMAND CENTER</span>
              </span>
              <span className="flex items-center space-x-1.5 text-xs text-[#2E7D32] font-semibold bg-[#2E7D32]/10 px-2.5 py-0.5 rounded-full border border-[#2E7D32]/20">
                <span className="h-2 w-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
                <span>Live Feed Active</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2B1F1D]">
              {user?.name || 'Officer Command'}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#7A6360]">
              <span className="flex items-center space-x-1">
                <BadgeCheck className="h-4 w-4 text-[#883A2E]" />
                <span className="font-semibold text-[#2B1F1D]">Badge:</span> {user?.badge_number || 'TN-POL-4042'}
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Building className="h-4 w-4 text-[#883A2E]" />
                <span className="font-semibold text-[#2B1F1D]">Station:</span> {user?.station || 'Chennai Central Police Station'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/upload"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#883A2E] to-[#D65A31] text-xs font-semibold text-white hover:opacity-95 shadow-sm transition-all"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Upload Crime Dataset</span>
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] text-xs font-semibold text-[#2B1F1D] hover:bg-[#FAF0EC] shadow-sm transition-all"
            >
              <BarChart3 className="h-3.5 w-3.5 text-[#883A2E]" />
              <span>Analytics</span>
            </Link>
            <button
              onClick={() => { fetchIncidents(); fetchLogs(); }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] text-xs font-semibold text-[#2B1F1D] hover:bg-[#FAF0EC] shadow-sm transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#883A2E]" />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>
      </div>

      {/* Central Synchronized Dataset Status Bar */}
      <div className="rounded-2xl border border-[#883A2E]/20 bg-gradient-to-r from-[#FFFDFC] via-[#FAF0EC] to-[#FFF7F4] p-4 sm:p-5 shadow-warm-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-[#883A2E]/10 border border-[#883A2E]/20 flex items-center justify-center shrink-0">
            <Database className="h-5 w-5 text-[#883A2E]" />
          </div>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#2B1F1D]">
                {activeDataset?.name || 'Central Crime Intelligence Dataset'}
              </span>
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D32] animate-pulse"></span>
                <span>Active & Centrally Synced</span>
              </span>
            </div>
            <p className="text-[11px] text-[#7A6360]">
              {activeDataset?.actual_record_count?.toLocaleString() || activeDataset?.record_count?.toLocaleString() || '10,000+'} verified records • Uploaded by: {activeDataset?.created_by || 'Law Enforcement Command'} • Centrally synced across Citizen, Police, and Admin dashboards
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {datasets.length > 1 && (
            <select
              value={activeDatasetId || ''}
              onChange={(e) => setActiveDatasetId(e.target.value)}
              className="rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-1.5 text-xs text-[#2B1F1D] font-medium shadow-xs"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.actual_record_count || d.record_count} recs)
                </option>
              ))}
            </select>
          )}
          <Link
            to="/upload"
            className="inline-flex items-center space-x-1.5 rounded-xl bg-[#883A2E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#542A20] transition-colors shadow-xs"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Upload New Dataset</span>
          </Link>
        </div>
      </div>

      {/* PROMINENT EMERGENCY ALARM NOTIFICATION BANNER */}
      {activeAlarms.length > 0 && (
        <div className="rounded-3xl border-2 border-red-500 bg-gradient-to-r from-[#542A20] via-[#883A2E] to-[#542A20] p-6 shadow-2xl text-white space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/20 pb-3">
            <div className="flex items-center space-x-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white animate-bounce shadow-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </span>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-[#FAF0EC] flex items-center gap-2">
                  <span>🚨 EMERGENCY ALERT TRIGGERED ({activeAlarms.length} NEW ALERT{activeAlarms.length > 1 ? 'S' : ''})</span>
                </span>
                <h2 className="text-base font-extrabold text-white">Immediate Action Required</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAlarmPlaying && (
                <button
                  onClick={() => emergencyAlarm.stopAlarm()}
                  className="px-3.5 py-1.5 rounded-xl border border-white bg-red-600 hover:bg-red-700 text-xs font-black text-white animate-pulse flex items-center space-x-1.5 cursor-pointer shadow-md"
                  title="Stop alarm sound"
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Stop Alarm Sound</span>
                </button>
              )}
              {isAutoplayBlocked && (
                <button
                  onClick={() => emergencyAlarm.playSinglePulse()}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-500/20 text-xs font-bold text-amber-200 animate-pulse flex items-center space-x-1 cursor-pointer"
                  title="Click to enable sound"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>⚠️ Enable Sound</span>
                </button>
              )}
              <Link
                to="/police-emergency"
                className="px-4 py-2 rounded-xl bg-[#D65A31] text-xs font-bold hover:bg-[#C47A5A] transition-all shadow-md"
              >
                Open Command Center
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAlarms.slice(0, 2).map((alarm: any) => (
              <div key={alarm.report_code} className="rounded-2xl border border-white/20 bg-white/10 p-4 space-y-3 backdrop-blur-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#FAF0EC] bg-white/20 px-2.5 py-0.5 rounded">
                    {alarm.report_code}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                    {alarm.severity || 'CRITICAL'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-white">{alarm.incident_type}</h3>
                  <p className="text-xs text-[#FAF0EC]/90 mt-1 line-clamp-2">{alarm.description}</p>
                </div>

                <div className="text-[11px] text-[#FAF0EC]/80 space-y-0.5">
                  <p>📍 Location: {alarm.location_address || `${alarm.city}, ${alarm.state}`}</p>
                  <p>🕒 Reported: {formatISTDateTime(alarm.created_at || alarm.reported_at)}</p>
                </div>

                {alarm.photo_url && (
                  <div className="pt-1">
                    <img
                      src={api.getMediaUrl(alarm.photo_url)}
                      alt="Alarm Photo Evidence"
                      className="h-28 w-full object-cover rounded-lg border border-white/20 cursor-pointer hover:opacity-90"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%237A6360" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                      }}
                      onClick={() => window.open(api.getMediaUrl(alarm.photo_url), '_blank')}
                    />
                  </div>
                )}

                {alarm.audio_url && (
                  <div className="pt-1">
                    <IncidentAudioPlayer src={alarm.audio_url} duration={alarm.audio_duration} label="Play Emergency Voice SOS" />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
                  <button
                    onClick={() => {
                      emergencyAlarm.stopAlarm();
                      handleQuickStatusUpdate(alarm.report_code, 'REVIEWING', 'Police officer acknowledged and reviewing incident details.');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-white text-[#883A2E] text-xs font-black hover:bg-[#FAF0EC] transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <VolumeX className="h-4 w-4 text-[#883A2E]" />
                    <span>Acknowledge / Stop Alarm</span>
                  </button>
                  <button
                    onClick={() => {
                      emergencyAlarm.stopAlarm();
                      setDispatchIncident(alarm);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#D65A31] text-white text-xs font-bold hover:bg-[#C47A5A] transition-all cursor-pointer"
                  >
                    Dispatch Patrol
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-warm-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#7A6360]">Total Incidents</span>
          <p className="text-2xl font-bold text-[#2B1F1D]">{totalCount}</p>
          <span className="text-[10px] text-[#7A6360]">Active in system</span>
        </div>

        <div className="rounded-2xl border border-[#D65A31]/30 bg-[#D65A31]/5 p-4 shadow-warm-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#D65A31]">Critical Alarms</span>
          <p className="text-2xl font-bold text-[#D65A31]">{criticalCount}</p>
          <span className="text-[10px] text-[#7A6360]">High urgency</span>
        </div>

        <div className="rounded-2xl border border-[#883A2E]/30 bg-[#883A2E]/5 p-4 shadow-warm-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#883A2E]">Under Investigation</span>
          <p className="text-2xl font-bold text-[#883A2E]">{investigatingCount}</p>
          <span className="text-[10px] text-[#7A6360]">Active inquiries</span>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 shadow-warm-xs space-y-1">
          <span className="text-[11px] font-semibold text-purple-800">Patrols Dispatched</span>
          <p className="text-2xl font-bold text-purple-900">{dispatchedCount}</p>
          <span className="text-[10px] text-[#7A6360]">Units on route</span>
        </div>

        <div className="rounded-2xl border border-[#2E7D32]/30 bg-[#2E7D32]/5 p-4 shadow-warm-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#2E7D32]">Resolved Incidents</span>
          <p className="text-2xl font-bold text-[#2E7D32]">{resolvedCount}</p>
          <span className="text-[10px] text-[#7A6360]">Completed cases</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-[#FFFDFC] p-1.5 border border-[#EEDFD9] shadow-warm-xs">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'feed'
              ? 'bg-[#542A20] text-white shadow-sm'
              : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-[#FAF0EC]'
          }`}
        >
          <Radio className="h-4 w-4" />
          <span>Incident Command Feed ({incidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-[#542A20] text-white shadow-sm'
              : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-[#FAF0EC]'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Police Action & Dispatch Log ({actionLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: INCIDENT COMMAND FEED */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-3.5 shadow-warm-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-[#7A6360]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search incident code, description, address..."
                className="w-full text-xs text-[#2B1F1D] bg-transparent focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-1.5 text-xs text-[#2B1F1D] focus:outline-none font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="ALERT_RECEIVED">Alert Received</option>
                <option value="REVIEWING">Reviewing</option>
                <option value="PATROL_ASSIGNED">Patrol Assigned</option>
                <option value="RESPONDING">Responding</option>
                <option value="ARRIVED">Arrived</option>
                <option value="RESOLVED">Resolved</option>
              </select>

              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-1.5 text-xs text-[#2B1F1D] focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Incident Cards */}
          {fetchError ? (
            <div className="rounded-3xl border border-red-300 bg-red-50/70 p-10 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-red-600 mx-auto" />
              <p className="text-sm font-bold text-red-900">Failed to load incident feed</p>
              <p className="text-xs text-red-700">{fetchError}</p>
              <button
                onClick={() => fetchIncidents()}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all cursor-pointer shadow-sm"
              >
                Retry Loading Feed
              </button>
            </div>
          ) : isLoading ? (
            <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-12 text-center text-xs text-[#7A6360]">
              Loading live emergency incident feed from Police Database...
            </div>
          ) : incidents.length === 0 ? (
            <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-12 text-center text-xs text-[#7A6360]">
              No incident reports matching the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((inc: any) => (
                <div
                  key={inc.report_code || inc.id}
                  onClick={() => handleInspectReport(inc.report_code)}
                  className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-warm-xs space-y-4 hover:border-[#883A2E]/40 transition-all cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#EEDFD9] pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#883A2E] bg-[#FAF0EC] px-2.5 py-1 rounded-lg border border-[#EEDFD9]">
                        {inc.report_code}
                      </span>
                      <h3 className="text-sm font-bold text-[#2B1F1D]">{inc.incident_type}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inc.severity === 'CRITICAL' ? 'bg-[#542A20] text-white' :
                        inc.severity === 'HIGH' ? 'bg-[#883A2E] text-white' :
                        inc.severity === 'MEDIUM' ? 'bg-[#D65A31] text-white' : 'bg-[#2E7D32] text-white'
                      }`}>
                        {inc.severity}
                      </span>
                      {getCitizenTrackingBadge(inc)}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-semibold text-[#7A6360]">
                        Status: <span className="text-[#883A2E] uppercase font-bold">{inc.status}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#883A2E] bg-[#FAF0EC] px-2 py-0.5 rounded border border-[#EEDFD9]">
                        {formatISTDateTime(inc.created_at || inc.reported_at || inc.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Incident Details & Citizen Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <p className="text-xs text-[#2B1F1D] leading-relaxed">{inc.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#7A6360] pt-1">
                        <span className="flex items-center space-x-1">
                          <MapPin className="h-3.5 w-3.5 text-[#883A2E]" />
                          <span>{inc.location_address || `${inc.city}, ${inc.state}`}</span>
                        </span>
                        {inc.latitude && inc.longitude && (
                          <span className="font-mono text-[10px] text-[#542A20] bg-[#FAF0EC] px-2 py-0.5 rounded">
                            GPS: {inc.latitude.toFixed(4)}, {inc.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Citizen Contact Box */}
                    <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] p-3.5 text-xs space-y-1.5">
                      <div className="flex items-center space-x-1.5 font-bold text-[#542A20]">
                        <User className="h-3.5 w-3.5 text-[#883A2E]" />
                        <span>Reporting Citizen</span>
                      </div>
                      <p className="text-[11px] font-medium text-[#2B1F1D]">{inc.citizen_name || 'Anonymous'}</p>
                      {inc.citizen_phone && (
                        <p className="text-[11px] text-[#7A6360] flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{inc.citizen_phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Attached Media (Photo & Voice Audio) */}
                  {(inc.photo_url || inc.audio_url) && (
                    <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] p-3.5 space-y-3">
                      {inc.photo_url && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-[#883A2E]">
                            <span className="flex items-center gap-1.5">
                              <Camera className="h-4 w-4" />
                              <span>Citizen Photo Evidence</span>
                            </span>
                            <a
                              href={api.getMediaUrl(inc.photo_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-semibold underline hover:text-[#542A20]"
                            >
                              Open Image ↗
                            </a>
                          </div>
                          <div className="relative rounded-xl border border-[#EEDFD9] overflow-hidden bg-black/5 max-w-sm">
                            <img
                              src={api.getMediaUrl(inc.photo_url)}
                              alt="Incident Evidence"
                              className="max-h-48 w-full object-cover rounded-lg hover:opacity-95 cursor-pointer transition-opacity"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null;
                                target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%237A6360" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(api.getMediaUrl(inc.photo_url), '_blank');
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {inc.audio_url && (
                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <IncidentAudioPlayer
                            src={inc.audio_url}
                            duration={inc.audio_duration}
                            label="Citizen Emergency Voice Recording"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Patrol Assignment & Officer Notes */}
                  {inc.patrol_assignment && (
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-3.5 text-xs space-y-1 text-purple-900">
                      <div className="flex items-center space-x-2 font-bold">
                        <Truck className="h-4 w-4 text-purple-700" />
                        <span>Patrol Unit Assigned: {inc.patrol_assignment.unit_name}</span>
                        <span className="text-[10px] bg-purple-200 px-2 py-0.5 rounded-full font-mono">
                          ETA: {inc.patrol_assignment.eta_minutes} mins
                        </span>
                      </div>
                      <p className="text-[11px]">
                        Officer in charge: {inc.patrol_assignment.officer_in_charge} • Vehicle: {inc.patrol_assignment.vehicle_type}
                      </p>
                      {inc.patrol_assignment.dispatch_notes && (
                        <p className="text-[11px] italic">Notes: "{inc.patrol_assignment.dispatch_notes}"</p>
                      )}
                    </div>
                  )}

                  {inc.officer_notes && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                      <span className="font-bold">Officer Investigation Notes:</span> {inc.officer_notes}
                    </div>
                  )}

                  {/* Action Controls for Response Tracking Milestones */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EEDFD9]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Step 1: Mark Viewed */}
                      {(!inc.viewed_at && !JSON.stringify(inc.status_timeline || []).includes('VIEWED')) && (
                        <button
                          onClick={() => handleInspectReport(inc.report_code)}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-all cursor-pointer"
                        >
                          👁️ Mark Viewed
                        </button>
                      )}

                      {/* Step 2: Acknowledge */}
                      {(inc.status === 'ALERT_RECEIVED' || inc.status === 'RECEIVED' || inc.status === 'INCIDENT_REPORTED' || inc.status === 'VIEWED' || inc.status === 'VIEWED_BY_OFFICER') && (
                        <button
                          onClick={() => handleQuickStatusUpdate(inc.report_code, 'ACKNOWLEDGED', 'Police officer acknowledged and reviewing incident.')}
                          className="px-3 py-1.5 rounded-xl bg-[#883A2E] text-white text-xs font-bold hover:bg-[#542A20] transition-all cursor-pointer"
                        >
                          ✓ Acknowledge Alert
                        </button>
                      )}

                      {/* Step 3: Assign Patrol */}
                      {(inc.status === 'ACKNOWLEDGED' || inc.status === 'REVIEWING' || (!inc.patrol_assignment && inc.status !== 'RESOLVED')) && (
                        <button
                          onClick={() => setDispatchIncident(inc)}
                          className="px-3 py-1.5 rounded-xl bg-[#D65A31] text-white text-xs font-bold hover:bg-[#C47A5A] transition-all cursor-pointer"
                        >
                          Assign Patrol Unit
                        </button>
                      )}

                      {/* Step 4: Responding / En Route */}
                      {(inc.status === 'PATROL_ASSIGNED' || inc.status === 'OFFICER_ASSIGNED') && (
                        <button
                          onClick={() => handleQuickStatusUpdate(inc.report_code, 'EN_ROUTE', 'Patrol unit dispatched and en route to location.')}
                          className="px-3 py-1.5 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-all cursor-pointer"
                        >
                          📍 Dispatch / En Route
                        </button>
                      )}

                      {/* Step 5: Arrived */}
                      {(inc.status === 'RESPONDING' || inc.status === 'PATROL_EN_ROUTE' || inc.status === 'EN_ROUTE') && (
                        <button
                          onClick={() => handleQuickStatusUpdate(inc.report_code, 'ARRIVED', 'Police patrol arrived at incident location.')}
                          className="px-3 py-1.5 rounded-xl bg-[#2E7D32] text-white text-xs font-bold hover:bg-emerald-800 transition-all cursor-pointer"
                        >
                          ✓ Mark Arrived
                        </button>
                      )}

                      {/* Step 6: Resolved */}
                      {inc.status !== 'RESOLVED' && inc.status !== 'CLOSED' && (
                        <button
                          onClick={() => handleQuickStatusUpdate(inc.report_code, 'RESOLVED', 'Incident resolved by police response unit.')}
                          className="px-3 py-1.5 rounded-xl border border-[#2E7D32]/40 bg-[#2E7D32]/10 text-[#2E7D32] text-xs font-bold hover:bg-[#2E7D32] hover:text-white transition-all cursor-pointer"
                        >
                          ✅ Resolve Incident
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedIncident(inc);
                          setNewStatus(inc.status);
                          setOfficerNotes(inc.officer_notes || '');
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] text-xs font-semibold text-[#2B1F1D] hover:bg-[#FAF0EC] cursor-pointer shadow-sm transition-all"
                      >
                        All Statuses & Notes
                      </button>

                      <button
                        onClick={() => {
                          setDispatchIncident(inc);
                          setDispatchNotes('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#542A20] text-white text-xs font-semibold hover:bg-[#3D1F17] cursor-pointer shadow-sm transition-all flex items-center space-x-1.5"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>Dispatch</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: POLICE ACTION LOGS */}
      {activeTab === 'logs' && (
        <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-warm-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2B1F1D]">Official Action & Dispatch Audit Trail</h2>
            <button
              onClick={fetchLogs}
              className="text-xs text-[#883A2E] font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>

          {actionLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#7A6360]">No police actions recorded yet.</div>
          ) : (
            <div className="divide-y divide-[#EEDFD9]">
              {actionLogs.map((log: any, idx: number) => (
                <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#883A2E]">{log.report_code}</span>
                      <span className="font-semibold text-[#2B1F1D]">{log.action_type}</span>
                      {log.new_status && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF0EC] text-[#883A2E]">
                          ➔ {log.new_status}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7A6360]">
                      Officer: <span className="font-medium text-[#2B1F1D]">{log.officer_name}</span>
                      {log.notes && ` • "${log.notes}"`}
                      {log.unit_assigned && ` • Assigned: ${log.unit_assigned}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#7A6360] shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: UPDATE STATUS */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-warm-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEDFD9] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#2B1F1D]">Update Incident Status</h3>
                <span className="font-mono text-xs text-[#883A2E] font-bold">{selectedIncident.report_code}</span>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-[#7A6360] hover:text-[#2B1F1D] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#2B1F1D]">Investigation Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3.5 py-2.5 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none"
                >
                  <option value="ALERT_RECEIVED">ALERT RECEIVED (Initial Alert)</option>
                  <option value="REVIEWING">REVIEWING (Command Review)</option>
                  <option value="PATROL_ASSIGNED">PATROL ASSIGNED (Unit Dispatched)</option>
                  <option value="RESPONDING">RESPONDING (En Route to Scene)</option>
                  <option value="ARRIVED">ARRIVED (Unit On Scene)</option>
                  <option value="RESOLVED">RESOLVED (Case Concluded)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#2B1F1D]">Official Investigation Notes</label>
                <textarea
                  rows={3}
                  value={officerNotes}
                  onChange={e => setOfficerNotes(e.target.value)}
                  placeholder="Enter details of action taken, officer findings, or next steps..."
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] p-3 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 rounded-xl border border-[#EEDFD9] text-xs font-semibold text-[#7A6360] hover:text-[#2B1F1D] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 rounded-xl bg-[#883A2E] text-white text-xs font-bold hover:bg-[#752F24] cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Save Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISPATCH PATROL */}
      {dispatchIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-warm-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEDFD9] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#2B1F1D]">Dispatch Patrol Unit</h3>
                <span className="font-mono text-xs text-[#883A2E] font-bold">{dispatchIncident.report_code}</span>
              </div>
              <button
                onClick={() => setDispatchIncident(null)}
                className="text-[#7A6360] hover:text-[#2B1F1D] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#2B1F1D]">Unit Name</label>
                <input
                  type="text"
                  required
                  value={patrolUnit}
                  onChange={e => setPatrolUnit(e.target.value)}
                  placeholder="Eagle-1 Patrol"
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3.5 py-2.5 text-xs text-[#2B1F1D] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#2B1F1D]">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value)}
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-2 text-xs text-[#2B1F1D] focus:outline-none"
                  >
                    <option value="Police Interceptor SUV">Police SUV</option>
                    <option value="PCR Patrol Van">PCR Van</option>
                    <option value="Quick Response Motorcycle">Motorcycle Squad</option>
                    <option value="Tactical Command Vehicle">Tactical Unit</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#2B1F1D]">Estimated Arrival (ETA)</label>
                  <select
                    value={etaMinutes}
                    onChange={e => setEtaMinutes(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-2 text-xs text-[#2B1F1D] focus:outline-none"
                  >
                    <option value={3}>3 Minutes (Urgent)</option>
                    <option value={5}>5 Minutes</option>
                    <option value={10}>10 Minutes</option>
                    <option value={15}>15 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#2B1F1D]">Dispatch Instructions & Notes</label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={e => setDispatchNotes(e.target.value)}
                  placeholder="Proceed with siren, coordinate with local beat officer..."
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] p-3 text-xs text-[#2B1F1D] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchIncident(null)}
                  className="px-4 py-2 rounded-xl border border-[#EEDFD9] text-xs font-semibold text-[#7A6360] hover:text-[#2B1F1D] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="px-4 py-2 rounded-xl bg-[#542A20] text-white text-xs font-bold hover:bg-[#3D1F17] cursor-pointer disabled:opacity-50"
                >
                  {isDispatching ? 'Dispatching...' : 'Deploy Unit Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
