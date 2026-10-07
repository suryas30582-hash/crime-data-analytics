import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  FileText,
  Clock,
  MapPin,
  Camera,
  Mic,
  Square,
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Upload,
  UploadCloud,
  Database,
  CheckCircle2,
  BarChart3,
  ExternalLink,
  ChevronRight,
  User,
  Phone,
  Send,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataset } from '../context/DatasetContext';
import { api } from '../services/api';
import { IncidentAudioPlayer } from '../components/common/IncidentAudioPlayer';
import { formatISTDateTime, formatISTTimeOnly } from '../utils/dateFormatter';

const INCIDENT_CATEGORIES = [
  'Theft & Burglary',
  'Physical Assault',
  'Robbery',
  'Harassment & Stalking',
  'Cyber Fraud & Financial Scam',
  'Domestic Disturbance',
  'Vandalism / Property Damage',
  'Suspicious Activity',
  'Hit and Run',
  'Other'
];

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { datasets, activeDataset, activeDatasetId, setActiveDatasetId } = useDataset();
  const [activeTab, setActiveTab] = useState<'report' | 'my-reports' | 'overview'>('report');

  // Form State
  const [incidentType, setIncidentType] = useState(INCIDENT_CATEGORIES[0]);
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [description, setDescription] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [citizenPhone, setCitizenPhone] = useState(user?.phone || '');

  // Media state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ code: string; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // My Reports state
  const [myReports, setMyReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // Load user reports
  const fetchMyReports = async () => {
    try {
      setIsLoadingReports(true);
      const data = await api.getMyIncidents();
      setMyReports(data.reports || []);
    } catch (err: any) {
      console.warn('Could not fetch user reports:', err.message);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, []);

  // Real-time SSE listener for status updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connectSSE() {
      if (destroyed) return;
      try {
        const streamUrl = api.getEmergencyStreamUrl();
        eventSource = new EventSource(streamUrl);

        const handleUpdate = (event: MessageEvent) => {
          try {
            const updated = JSON.parse(event.data);
            if (!updated?.report_code) return;
            setMyReports(prev =>
              prev.map(r => r.report_code === updated.report_code ? { ...r, ...updated } : r)
            );
          } catch (e) {
            console.error('SSE parse error in UserDashboardPage:', e);
          }
        };

        eventSource.addEventListener('STATUS_UPDATE', handleUpdate);
        eventSource.addEventListener('PATROL_ASSIGNED', handleUpdate);

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          if (!destroyed) {
            reconnectTimeout = setTimeout(connectSSE, 5000);
          }
        };
      } catch (err) {
        console.error('User SSE setup failed:', err);
      }
    }

    connectSSE();

    return () => {
      destroyed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, []);

  // Geolocation detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocationAddress(
          locationAddress || `Lat: ${pos.coords.latitude.toFixed(4)}, Long: ${pos.coords.longitude.toFixed(4)} (GPS Verified)`
        );
        setIsDetectingLocation(false);
      },
      err => {
        console.warn('Geolocation error:', err.message);
        // GPS unavailable — do NOT use any default/hardcoded coordinates
        setLatitude(null);
        setLongitude(null);
        setLocationAddress(locationAddress || 'GPS location unavailable — please enter your address manually');
        setIsDetectingLocation(false);
      },
      { timeout: 8000 }
    );
  };

  // Photo change
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const supportedType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac'
      ].find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';

      const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || supportedType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert('Microphone access was denied or is unavailable: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetAudio = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Submit Incident
  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!description.trim()) {
      setErrorMessage('Please provide a brief description of the incident.');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('incident_type', incidentType);
      formData.append('severity', severity);
      formData.append('description', description.trim());
      formData.append('citizen_name', user?.name || 'Citizen User');
      formData.append('citizen_phone', citizenPhone);
      formData.append('location_address', locationAddress || 'Location provided by citizen');
      if (latitude !== null) formData.append('latitude', String(latitude));
      if (longitude !== null) formData.append('longitude', String(longitude));

      if (photoFile) {
        formData.append('photo', photoFile);
      }
      if (audioBlob) {
        const ext = audioBlob.type.includes('mp4') ? '.mp4' : audioBlob.type.includes('ogg') ? '.ogg' : '.webm';
        formData.append('audio', audioBlob, `incident_voice${ext}`);
        formData.append('audio_duration', String(recordingTime));
        formData.append('audio_size', String(audioBlob.size));
        formData.append('audio_mime_type', audioBlob.type || 'audio/webm');
      }

      const res = await api.submitIncident(formData);
      setSubmissionSuccess({
        code: res.report_code,
        message: res.message
      });

      // Reset form
      setDescription('');
      setLocationAddress('');
      setPhotoFile(null);
      setPhotoPreview(null);
      resetAudio();

      // Refresh reports list
      fetchMyReports();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit incident report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'ALERT_RECEIVED':
      case 'RECEIVED':
      case 'INCIDENT_REPORTED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D65A31]/15 text-[#D65A31] border border-[#D65A31]/30">ALERT RECEIVED</span>;
      case 'VIEWED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">VIEWED BY OFFICER</span>;
      case 'ACKNOWLEDGED':
      case 'REVIEWING':
      case 'UNDER_REVIEW':
      case 'POLICE_VERIFICATION':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">ACKNOWLEDGED</span>;
      case 'OFFICER_ASSIGNED':
      case 'PATROL_ASSIGNED':
      case 'PRIORITY_ASSIGNED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">OFFICER ASSIGNED</span>;
      case 'EN_ROUTE':
      case 'RESPONDING':
      case 'PATROL_EN_ROUTE':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">EN ROUTE</span>;
      case 'ARRIVED':
      case 'PATROL_ARRIVED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">ARRIVED ON SCENE</span>;
      case 'RESOLVED':
      case 'CLOSED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/30">RESOLVED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const renderResponseTracking = (report: any) => {
    const s = (report.status || '').toUpperCase();
    const isSubmitted = true;
    const isReceived = true;
    const isViewed = !!(report.viewed_at || ['VIEWED', 'ACKNOWLEDGED', 'REVIEWING', 'UNDER_REVIEW', 'OFFICER_ASSIGNED', 'PATROL_ASSIGNED', 'PRIORITY_ASSIGNED', 'EN_ROUTE', 'RESPONDING', 'PATROL_EN_ROUTE', 'ARRIVED', 'PATROL_ARRIVED', 'RESOLVED', 'CLOSED'].includes(s));
    const isAcknowledged = !!(report.acknowledged_at || ['ACKNOWLEDGED', 'REVIEWING', 'UNDER_REVIEW', 'OFFICER_ASSIGNED', 'PATROL_ASSIGNED', 'PRIORITY_ASSIGNED', 'EN_ROUTE', 'RESPONDING', 'PATROL_EN_ROUTE', 'ARRIVED', 'PATROL_ARRIVED', 'RESOLVED', 'CLOSED'].includes(s));
    const isAssigned = !!(report.patrol_assigned_at || report.patrol_assignment || ['OFFICER_ASSIGNED', 'PATROL_ASSIGNED', 'PRIORITY_ASSIGNED', 'EN_ROUTE', 'RESPONDING', 'PATROL_EN_ROUTE', 'ARRIVED', 'PATROL_ARRIVED', 'RESOLVED', 'CLOSED'].includes(s));
    const isEnRoute = !!(report.en_route_at || (report.patrol_assignment && ['EN_ROUTE', 'ON_SCENE', 'COMPLETED'].includes((report.patrol_assignment.status || '').toUpperCase())) || ['EN_ROUTE', 'RESPONDING', 'PATROL_EN_ROUTE', 'ARRIVED', 'PATROL_ARRIVED', 'RESOLVED', 'CLOSED'].includes(s));
    const isResolved = s === 'RESOLVED' || s === 'CLOSED' || !!report.resolved_at;

    const stages = [
      { id: 'submitted', label: 'Request Submitted', done: isSubmitted, current: !isReceived, time: formatISTTimeOnly(report.created_at || report.reported_at), icon: '✓' },
      { id: 'received', label: 'Received by Police', done: isReceived, current: !isViewed, time: formatISTTimeOnly(report.reported_at || report.created_at), icon: '✓' },
      { id: 'viewed', label: 'Viewed by Officer', done: isViewed, current: isViewed && !isAcknowledged, time: report.viewed_at ? formatISTTimeOnly(report.viewed_at) : (isViewed ? 'Viewed' : null), icon: isViewed ? '✓' : '👁️' },
      { id: 'acknowledged', label: 'Acknowledged', done: isAcknowledged, current: isAcknowledged && !isAssigned, time: report.acknowledged_at ? formatISTTimeOnly(report.acknowledged_at) : (isAcknowledged ? 'Confirmed' : null), icon: isAcknowledged ? '✓' : '⏳' },
      { id: 'assigned', label: 'Officer Assigned', done: isAssigned, current: isAssigned && !isEnRoute, time: report.patrol_assigned_at ? formatISTTimeOnly(report.patrol_assigned_at) : (report.patrol_assignment?.assigned_at ? formatISTTimeOnly(report.patrol_assignment.assigned_at) : null), detail: report.patrol_assignment ? `${report.patrol_assignment.unit_name} (${report.patrol_assignment.officer_in_charge})` : undefined, icon: '🚓' },
      { id: 'en_route', label: 'En Route', done: isEnRoute, current: isEnRoute && !isResolved, time: report.en_route_at ? formatISTTimeOnly(report.en_route_at) : null, detail: report.patrol_assignment?.eta_minutes ? `ETA ~${report.patrol_assignment.eta_minutes} mins` : undefined, icon: '📍' },
      { id: 'resolved', label: 'Resolved', done: isResolved, current: isResolved, time: report.resolved_at ? formatISTTimeOnly(report.resolved_at) : null, icon: isResolved ? '✓' : '○' }
    ];

    return (
      <div className="mt-3 rounded-2xl border border-[#EEDFD9] bg-white p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#883A2E]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#883A2E] animate-pulse"></span>
            <span>Live Citizen Response Tracking</span>
          </span>
          <span className="text-[10px] font-normal text-[#7A6360]">Real-time Database Status</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={`flex flex-col p-2 rounded-xl text-left border transition-all ${
                stage.done
                  ? 'bg-[#2E7D32]/10 border-[#2E7D32]/30 text-[#2E7D32]'
                  : stage.current
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 shadow-xs'
                  : 'bg-[#FAF0EC]/60 border-[#EEDFD9] text-[#7A6360]/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs">{stage.icon}</span>
                {stage.time && <span className="text-[9px] font-mono font-bold">{stage.time}</span>}
              </div>
              <span className="text-[11px] font-bold mt-1 leading-tight">{stage.label}</span>
              {stage.detail && <span className="text-[9px] mt-0.5 opacity-90 truncate">{stage.detail}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* User Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#EEDFD9] bg-gradient-to-r from-[#FFFDFC] via-[#FAF0EC] to-[#FFF7F4] p-6 sm:p-8 shadow-warm-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[11px] font-bold bg-[#883A2E]/10 text-[#883A2E] border border-[#883A2E]/20">
              <User className="h-3.5 w-3.5" />
              <span>CITIZEN DASHBOARD</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2B1F1D]">
              Welcome back, {user?.name || 'Citizen'}
            </h1>
            <p className="text-xs text-[#7A6360] max-w-xl">
              Submit incident reports with photographic and voice recording evidence directly to law enforcement. Review past submissions and monitor official police investigation status in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#883A2E] to-[#D65A31] text-xs font-semibold text-white hover:opacity-95 shadow-sm transition-all"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload Crime Dataset</span>
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] text-xs font-semibold text-[#2B1F1D] hover:bg-[#FAF0EC] shadow-sm transition-all"
            >
              <BarChart3 className="h-4 w-4 text-[#883A2E]" />
              <span>Crime Analytics</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-[#FFFDFC] p-1.5 border border-[#EEDFD9] shadow-warm-xs">
        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'report'
              ? 'bg-gradient-to-r from-[#883A2E] to-[#D65A31] text-white shadow-md shadow-[#883A2E]/20'
              : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-[#FAF0EC]'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Report New Incident</span>
        </button>

        <button
          onClick={() => setActiveTab('my-reports')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'my-reports'
              ? 'bg-gradient-to-r from-[#883A2E] to-[#D65A31] text-white shadow-md shadow-[#883A2E]/20'
              : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-[#FAF0EC]'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>My Incident Reports ({myReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-[#883A2E] to-[#D65A31] text-white shadow-md shadow-[#883A2E]/20'
              : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-[#FAF0EC]'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Explore Crime Data</span>
        </button>
      </div>

      {/* TAB 1: REPORT INCIDENT */}
      {activeTab === 'report' && (
        <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 sm:p-8 shadow-warm-sm">
          {submissionSuccess && (
            <div className="mb-6 rounded-2xl border border-[#2E7D32]/30 bg-[#2E7D32]/10 p-5 text-xs text-[#2E7D32] animate-in fade-in space-y-2">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <CheckCircle className="h-5 w-5" />
                <span>Incident Submitted & Stored in Database!</span>
              </div>
              <p>
                Your report has been assigned reference code:{' '}
                <span className="font-mono font-bold text-sm bg-white/60 px-2 py-0.5 rounded border border-[#2E7D32]/30">
                  {submissionSuccess.code}
                </span>
                . It is now visible to authorized Police Command units.
              </p>
              <button
                type="button"
                onClick={() => { setSubmissionSuccess(null); setActiveTab('my-reports'); }}
                className="mt-2 inline-flex items-center space-x-1.5 font-semibold underline cursor-pointer"
              >
                <span>View in My Incident Reports</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 flex items-center space-x-2.5 rounded-2xl border border-[#D65A31]/30 bg-[#D65A31]/10 p-4 text-xs text-[#D65A31] animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitIncident} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Incident Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#2B1F1D]">Incident Category *</label>
                <select
                  value={incidentType}
                  onChange={e => setIncidentType(e.target.value)}
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3.5 py-2.5 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none"
                >
                  {INCIDENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Severity Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#2B1F1D]">Severity Urgency</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        severity === sev
                          ? sev === 'CRITICAL'
                            ? 'bg-[#542A20] text-white border-[#542A20]'
                            : sev === 'HIGH'
                            ? 'bg-[#883A2E] text-white border-[#883A2E]'
                            : sev === 'MEDIUM'
                            ? 'bg-[#D65A31] text-white border-[#D65A31]'
                            : 'bg-[#2E7D32] text-white border-[#2E7D32]'
                          : 'bg-[#FFF7F4] border-[#EEDFD9] text-[#7A6360] hover:text-[#2B1F1D]'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#2B1F1D]">Incident Description & Details *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what occurred, any suspect descriptions, vehicle details, direction of travel, or immediate hazards..."
                className="w-full rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] p-3.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none"
              />
            </div>

            {/* Location & GPS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#2B1F1D]">Location & Address</label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isDetectingLocation}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#FAF0EC] text-[#883A2E] border border-[#EEDFD9] hover:bg-[#883A2E] hover:text-white transition-all cursor-pointer"
                >
                  <MapPin className="h-3 w-3" />
                  <span>{isDetectingLocation ? 'Detecting GPS...' : 'Detect GPS Coordinates'}</span>
                </button>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-[#7A6360]" />
                <input
                  type="text"
                  value={locationAddress}
                  onChange={e => setLocationAddress(e.target.value)}
                  placeholder="Street name, landmark, intersection, or city location..."
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-10 pr-4 py-2.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:outline-none"
                />
              </div>
              {latitude && longitude && (
                <p className="text-[11px] text-[#2E7D32] font-mono">
                  ✓ Coordinates verified: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </p>
              )}
            </div>

            {/* Evidence: Photo & Audio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Photo Evidence */}
              <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Camera className="h-4 w-4 text-[#883A2E]" />
                    <span className="text-xs font-bold text-[#2B1F1D]">Photo Evidence</span>
                  </div>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="text-[10px] text-[#D65A31] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {photoPreview ? (
                  <div className="relative overflow-hidden rounded-xl border border-[#EEDFD9] h-32 bg-black/5 flex items-center justify-center">
                    <img src={photoPreview} alt="Evidence preview" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-[#EEDFD9] bg-[#FFFDFC] hover:bg-[#FAF0EC]/60 transition-all cursor-pointer p-4 text-center">
                    <Upload className="h-6 w-6 text-[#7A6360] mb-1" />
                    <span className="text-xs font-semibold text-[#2B1F1D]">Upload Incident Image</span>
                    <span className="text-[10px] text-[#7A6360]">JPG, PNG, WebP up to 10MB</span>
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                )}
              </div>

              {/* Voice Recording */}
              <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mic className="h-4 w-4 text-[#883A2E]" />
                    <span className="text-xs font-bold text-[#2B1F1D]">Voice Recording Statement</span>
                  </div>
                  {audioUrl && (
                    <button
                      type="button"
                      onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                      className="text-[10px] text-[#D65A31] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="h-32 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] p-3 flex flex-col justify-center items-center space-y-2">
                  {!audioUrl ? (
                    isRecording ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="h-3 w-3 rounded-full bg-red-600 animate-pulse"></span>
                          <span className="text-xs font-bold text-red-600">
                            Recording In Progress: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-4 py-1.5 rounded-xl bg-[#542A20] text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Square className="h-3.5 w-3.5" />
                          <span>Stop Recording</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-4 py-2 rounded-xl bg-[#883A2E] text-white text-xs font-semibold flex items-center space-x-2 hover:bg-[#752F24] transition-all cursor-pointer shadow-sm"
                      >
                        <Mic className="h-4 w-4" />
                        <span>Start Voice Recording</span>
                      </button>
                    )
                  ) : (
                    <div className="w-full flex flex-col items-center space-y-2">
                      <span className="text-[11px] font-semibold text-[#2E7D32]">
                        ✓ Voice Statement Recorded ({Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')})
                      </span>
                      <audio controls src={audioUrl} className="w-full h-8" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-[#883A2E] to-[#D65A31] py-3.5 text-xs font-bold text-white shadow-md shadow-[#883A2E]/25 hover:from-[#752F24] hover:to-[#BA461F] disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? 'Transmitting to Police Database...' : 'Submit Official Incident Report'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: MY INCIDENT REPORTS */}
      {activeTab === 'my-reports' && (
        <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 sm:p-8 shadow-warm-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#2B1F1D]">My Submitted Incidents</h2>
            <button
              onClick={fetchMyReports}
              disabled={isLoadingReports}
              className="text-xs text-[#883A2E] font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingReports ? (
            <div className="py-12 text-center text-xs text-[#7A6360]">Loading your reports from database...</div>
          ) : myReports.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="h-10 w-10 text-[#7A6360]/40 mx-auto" />
              <p className="text-sm font-semibold text-[#2B1F1D]">No incident reports submitted yet</p>
              <p className="text-xs text-[#7A6360]">Any incident report you file will be tracked and displayed here.</p>
              <button
                onClick={() => setActiveTab('report')}
                className="mt-3 inline-flex items-center px-4 py-2 rounded-xl bg-[#883A2E] text-white text-xs font-semibold cursor-pointer"
              >
                Submit First Incident
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myReports.map((report: any) => (
                <div
                  key={report.report_code || report.id}
                  className="rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] p-5 space-y-3 hover:border-[#883A2E]/40 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-[#883A2E] bg-white px-2 py-0.5 rounded border border-[#EEDFD9]">
                        {report.report_code}
                      </span>
                      <h3 className="text-sm font-bold text-[#2B1F1D]">{report.incident_type}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(report.status)}
                      <span className="text-[11px] font-semibold text-[#883A2E] bg-white px-2 py-0.5 rounded border border-[#EEDFD9]">
                        {formatISTDateTime(report.created_at || report.reported_at || report.createdAt)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#2B1F1D] leading-relaxed">{report.description}</p>

                  <div className="space-y-3 pt-1 border-t border-[#EEDFD9]">
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#7A6360]">
                      <span className="flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5 text-[#883A2E]" />
                        <span>{report.location_address || `${report.city}, ${report.state}`}</span>
                      </span>
                    </div>

                    {report.photo_url && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-[#883A2E]">
                          <span className="flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5" />
                            <span>Photo Evidence</span>
                          </span>
                          <a
                            href={api.getMediaUrl(report.photo_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-semibold underline hover:text-[#542A20]"
                          >
                            Open Image ↗
                          </a>
                        </div>
                        <div className="relative rounded-xl border border-[#EEDFD9] overflow-hidden bg-black/5 max-w-xs">
                          <img
                            src={api.getMediaUrl(report.photo_url)}
                            alt="Incident Evidence"
                            className="max-h-40 w-full object-cover rounded-lg cursor-pointer hover:opacity-95"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              if (target.parentElement) {
                                target.parentElement.innerHTML = '<div className="p-2 text-[11px] text-[#7A6360]">⚠️ Photo unavailable</div>';
                              }
                            }}
                            onClick={() => window.open(api.getMediaUrl(report.photo_url), '_blank')}
                          />
                        </div>
                      </div>
                    )}

                    {report.audio_url && (
                      <IncidentAudioPlayer
                        src={report.audio_url}
                        duration={report.audio_duration}
                        label="Voice Statement"
                      />
                    )}
                  </div>

                  {/* Citizen Request Response Tracking Timeline */}
                  {renderResponseTracking(report)}

                  {/* Officer Investigation Notes */}
                  {report.officer_notes && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center space-x-1">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                        <span>Officer Investigation Remarks:</span>
                      </div>
                      <p className="text-[11px]">{report.officer_notes}</p>
                    </div>
                  )}

                  {/* Patrol Assignment Callout */}
                  {report.patrol_assignment && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-3 text-xs text-purple-900 space-y-1">
                      <div className="font-bold">Patrol Assigned: {report.patrol_assignment.unit_name}</div>
                      <p className="text-[11px]">
                        Officer in charge: {report.patrol_assignment.officer_in_charge} • ETA: {report.patrol_assignment.eta_minutes} mins
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CRIME ANALYTICS OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 sm:p-8 shadow-warm-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#2B1F1D]">National & Regional Crime Intelligence</h2>
              <p className="text-xs text-[#7A6360]">Public analytical views and centralized datasets available to citizen analysts</p>
            </div>
            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#883A2E] to-[#D65A31] text-xs font-semibold text-white hover:opacity-95 shadow-sm transition-all w-fit"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload Latest Dataset</span>
            </Link>
          </div>

          {/* Active Central Dataset Card */}
          <div className="rounded-2xl border border-[#883A2E]/20 bg-gradient-to-r from-[#FFF7F4] via-[#FAF0EC] to-[#FFFDFC] p-5 shadow-warm-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="h-12 w-12 rounded-2xl bg-[#883A2E]/10 border border-[#883A2E]/20 flex items-center justify-center shrink-0">
                  <Database className="h-6 w-6 text-[#883A2E]" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-[#2B1F1D]">
                      {activeDataset?.name || 'Central Crime Dataset'}
                    </h3>
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Live Synced across All Dashboards</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#7A6360]">
                    {activeDataset?.description || 'Active synchronized repository for crime intelligence & predictive modeling'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7A6360] pt-1">
                    <span>
                      <strong className="text-[#2B1F1D]">Records:</strong> {activeDataset?.actual_record_count?.toLocaleString() || activeDataset?.record_count?.toLocaleString() || '10,000+'}
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-[#2B1F1D]">Uploaded By:</strong> {activeDataset?.created_by || 'National Intelligence'}
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-[#2B1F1D]">Updated:</strong> {activeDataset?.created_at ? new Date(activeDataset.created_at).toLocaleDateString() : 'Current'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {datasets.length > 1 && (
                  <select
                    value={activeDatasetId || ''}
                    onChange={(e) => setActiveDatasetId(e.target.value)}
                    className="rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] font-medium shadow-xs"
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
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-[#883A2E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#542A20] transition-colors shadow-xs"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Upload (CSV/XLSX)</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/dashboard"
              className="p-5 rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] hover:border-[#883A2E]/50 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <BarChart3 className="h-6 w-6 text-[#883A2E]" />
                <ExternalLink className="h-4 w-4 text-[#7A6360] group-hover:text-[#883A2E]" />
              </div>
              <h3 className="text-sm font-bold text-[#2B1F1D]">Comprehensive Dashboard</h3>
              <p className="text-xs text-[#7A6360]">View KPIs, incident severity distribution, crime trends, and city metrics.</p>
            </Link>

            <Link
              to="/state-analytics"
              className="p-5 rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] hover:border-[#883A2E]/50 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <MapPin className="h-6 w-6 text-[#D65A31]" />
                <ExternalLink className="h-4 w-4 text-[#7A6360] group-hover:text-[#D65A31]" />
              </div>
              <h3 className="text-sm font-bold text-[#2B1F1D]">State Analytics</h3>
              <p className="text-xs text-[#7A6360]">Comparative crime analytics across states with resolution rate rankings.</p>
            </Link>

            <Link
              to="/district-explorer"
              className="p-5 rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] hover:border-[#883A2E]/50 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <Sparkles className="h-6 w-6 text-[#C47A5A]" />
                <ExternalLink className="h-4 w-4 text-[#7A6360] group-hover:text-[#C47A5A]" />
              </div>
              <h3 className="text-sm font-bold text-[#2B1F1D]">District Explorer</h3>
              <p className="text-xs text-[#7A6360]">Drill down into local districts, local police stations, and incident breakdowns.</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
