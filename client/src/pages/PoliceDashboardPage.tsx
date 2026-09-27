import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataset } from '../context/DatasetContext';
import { api } from '../services/api';
import { IncidentAudioPlayer } from '../components/common/IncidentAudioPlayer';

export const PoliceDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { datasets, activeDataset, activeDatasetId, setActiveDatasetId } = useDataset();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      const data = await api.getPoliceIncidentFeed({
        status: statusFilter,
        severity: severityFilter,
        search: searchQuery
      });
      setIncidents(data.incidents || []);
    } catch (err: any) {
      console.warn('Error fetching police feed:', err.message);
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
  }, [statusFilter, severityFilter]);

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

  // KPI calculations
  const totalCount = incidents.length;
  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL').length;
  const investigatingCount = incidents.filter(i => i.status === 'INVESTIGATING' || i.status === 'UNDER_REVIEW').length;
  const dispatchedCount = incidents.filter(i => i.status === 'PATROL_ASSIGNED' || i.status === 'RESPONDING').length;
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

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
                className="rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-1.5 text-xs text-[#2B1F1D] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="RECEIVED">Received</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="PATROL_ASSIGNED">Patrol Dispatched</option>
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
          {isLoading ? (
            <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-12 text-center text-xs text-[#7A6360]">
              Loading incident reports from MongoDB...
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
                  className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-warm-xs space-y-4 hover:border-[#883A2E]/40 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#EEDFD9] pb-3">
                    <div className="flex items-center space-x-2.5">
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
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-semibold text-[#7A6360]">
                        Status: <span className="text-[#883A2E] uppercase font-bold">{inc.status}</span>
                      </span>
                      <span className="text-[11px] text-[#7A6360]">
                        {new Date(inc.created_at || inc.createdAt).toLocaleString()}
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
                    <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] p-3.5 flex flex-wrap items-center gap-4">
                      {inc.photo_url && (
                        <div className="flex items-center space-x-2">
                          <Camera className="h-4 w-4 text-[#883A2E]" />
                          <a
                            href={api.getMediaUrl(inc.photo_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-[#883A2E] hover:underline"
                          >
                            View Evidence Photo
                          </a>
                        </div>
                      )}
                      {inc.audio_url && (
                        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                          <IncidentAudioPlayer
                            src={inc.audio_url}
                            duration={inc.audio_duration}
                            label="Audio Statement"
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

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#EEDFD9]">
                    <button
                      onClick={() => {
                        setSelectedIncident(inc);
                        setNewStatus(inc.status);
                        setOfficerNotes(inc.officer_notes || '');
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] text-xs font-semibold text-[#2B1F1D] hover:bg-[#FAF0EC] cursor-pointer shadow-sm transition-all"
                    >
                      Update Status & Notes
                    </button>

                    <button
                      onClick={() => {
                        setDispatchIncident(inc);
                        setDispatchNotes('');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#542A20] text-white text-xs font-semibold hover:bg-[#3D1F17] cursor-pointer shadow-sm transition-all flex items-center space-x-1.5"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>Dispatch Patrol</span>
                    </button>
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
                  <option value="UNDER_REVIEW">UNDER REVIEW (Initial Assessment)</option>
                  <option value="INVESTIGATING">INVESTIGATING (Officer Assigned)</option>
                  <option value="PATROL_ASSIGNED">PATROL ASSIGNED (Dispatched)</option>
                  <option value="RESOLVED">RESOLVED (Case Concluded)</option>
                  <option value="CLOSED">CLOSED (Archived)</option>
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
