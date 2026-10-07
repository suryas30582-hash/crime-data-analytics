import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  MapPin,
  Send,
  CheckCircle2,
  Shield,
  PhoneCall,
  Info,
  Radio,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  FileCheck2
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { formatISTDateTime, formatISTTimeOnly } from '../utils/dateFormatter';

export const EmergencyReportPage: React.FC = () => {
  const { t } = useLanguage();

  // Form states
  const [incidentType, setIncidentType] = useState('Violent Crime / Assault');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('CRITICAL');
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Location states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [stateName, setStateName] = useState('Tamil Nadu');
  const [districtName, setDistrictName] = useState('Chennai');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Media: Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media: Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-fetch location on mount
  useEffect(() => {
    fetchCurrentLocation();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, []);

  // Geolocation Handler
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setIsLocating(false);

        // Reverse geocoding attempt
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          .then(res => res.json())
          .then(data => {
            if (data && data.display_name) {
              setLocationAddress(data.display_name);
              const address = data.address || {};
              if (address.state) setStateName(address.state);
              if (address.state_district || address.county || address.city) {
                setDistrictName(address.state_district || address.county || address.city);
              }
            } else {
              setLocationAddress(`GPS: ${lat}, ${lng} (Near detected device location)`);
            }
          })
          .catch(() => {
            setLocationAddress(`GPS: ${lat}, ${lng}`);
          });
      },
      (error) => {
        setIsLocating(false);
        setLatitude(null);
        setLongitude(null);
        setLocationError(`GPS location unavailable or permission denied (${error.message}). Please enter your incident street/landmark address manually below.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Photo handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Audio Recording Handlers
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

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 180) { // Max 3 mins
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      alert('Could not access microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsRecording(false);
  };

  const resetAudio = () => {
    if (isPlayingAudio && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlayingAudio(false);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit Emergency SOS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !audioBlob && !photoFile) {
      setErrorMessage('Please provide a brief description, voice recording, or incident photo.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('incident_type', incidentType);
      formData.append('severity', severity);
      formData.append('description', description.trim() || 'Emergency citizen distress alert');
      formData.append('state', stateName);
      formData.append('district', districtName);
      formData.append('city', districtName);
      formData.append('location_address', locationAddress || 'GPS Location Transmitted');
      if (latitude !== null && latitude !== undefined) formData.append('latitude', String(latitude));
      if (longitude !== null && longitude !== undefined) formData.append('longitude', String(longitude));
      formData.append('citizen_name', isAnonymous ? 'Anonymous Citizen' : (citizenName || 'Citizen in Distress'));
      if (!isAnonymous && citizenPhone) formData.append('citizen_phone', citizenPhone);

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      if (audioBlob) {
        let ext = '.webm';
        if (audioBlob.type.includes('mp4') || audioBlob.type.includes('aac')) ext = '.mp4';
        else if (audioBlob.type.includes('ogg')) ext = '.ogg';
        else if (audioBlob.type.includes('wav')) ext = '.wav';
        formData.append('audio', audioBlob, `emergency_voice${ext}`);
        formData.append('audio_duration', String(recordingTime));
      }

      const res = await api.submitEmergencyReport(formData);

      if (res.success) {
        setSubmittedReport(res.report);
        setSubmissionSuccess(true);
        // Play success beep
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.3);
        } catch {
          // ignore audio context issues
        }
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'Failed to submit emergency report. Please call 112 immediately.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real-time SSE Stream & Polling for report status updates when SOS is submitted
  useEffect(() => {
    if (!submissionSuccess || !submittedReport?.report_code) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connectSSE() {
      if (destroyed) return;
      try {
        const streamUrl = api.getEmergencyStreamUrl();
        eventSource = new EventSource(streamUrl);

        eventSource.addEventListener('STATUS_UPDATE', (event) => {
          try {
            const updated = JSON.parse(event.data);
            if (updated.report_code === submittedReport.report_code) {
              setSubmittedReport((prev: any) => ({ ...prev, ...updated }));
            }
          } catch (e) {}
        });

        eventSource.addEventListener('PATROL_ASSIGNED', (event) => {
          try {
            const updated = JSON.parse(event.data);
            if (updated.report_code === submittedReport.report_code) {
              setSubmittedReport((prev: any) => ({ ...prev, ...updated }));
            }
          } catch (e) {}
        });

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          if (!destroyed) {
            reconnectTimer = setTimeout(() => connectSSE(), 3000);
          }
        };
      } catch (err) {
        console.warn('Citizen SSE error:', err);
      }
    }

    connectSSE();

    // Secondary safety poll every 3.5s
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.getReportByCode(submittedReport.report_code);
        if (res.success && res.report) {
          setSubmittedReport(res.report);
        }
      } catch (err) {}
    }, 3500);

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, [submissionSuccess, submittedReport?.report_code]);

  const getTimelineMilestones = (report: any) => {
    const timeline = Array.isArray(report?.status_timeline)
      ? report.status_timeline
      : (typeof report?.status_timeline === 'string' ? JSON.parse(report.status_timeline || '[]') : []);

    const s = (report?.status || '').toUpperCase();
    const findTime = (statuses: string[]) => {
      const match = timeline.find((t: any) => statuses.includes(t.status?.toUpperCase()));
      return match?.timestamp || null;
    };

    const submittedTime = findTime(['SUBMITTED', 'REQUEST_SUBMITTED']) || report?.created_at;
    const receivedTime = findTime(['RECEIVED', 'ALERT_RECEIVED', 'INCIDENT_REPORTED']) || report?.reported_at || report?.created_at;
    const viewedTime = findTime(['VIEWED', 'VIEWED_BY_OFFICER']) || report?.viewed_at;
    const acknowledgedTime = findTime(['ACKNOWLEDGED', 'REVIEWING', 'POLICE_VERIFICATION', 'UNDER_REVIEW']) || report?.acknowledged_at || report?.verified_at;
    const assignedTime = findTime(['OFFICER_ASSIGNED', 'PATROL_ASSIGNED']) || report?.patrol_assigned_at;
    const enRouteTime = findTime(['EN_ROUTE', 'PATROL_EN_ROUTE', 'RESPONDING', 'ARRIVED', 'PATROL_ARRIVED']) || report?.en_route_at;
    const resolvedTime = findTime(['RESOLVED', 'CLOSED']) || report?.resolved_at;

    const isSubmitted = true;
    const isReceived = true;
    const isViewed = !!viewedTime || !!acknowledgedTime || !!assignedTime || !!enRouteTime || !!resolvedTime;
    const isAcknowledged = !!acknowledgedTime || !!assignedTime || !!enRouteTime || !!resolvedTime;
    const isAssigned = !!assignedTime || !!report?.patrol_assignment || !!report?.assigned_patrol_code || !!enRouteTime || !!resolvedTime;
    const isEnRoute = !!enRouteTime || s === 'EN_ROUTE' || s === 'PATROL_EN_ROUTE' || s === 'RESPONDING' || s === 'ARRIVED' || !!resolvedTime;
    const isResolved = !!resolvedTime || s === 'RESOLVED' || s === 'CLOSED';

    return [
      {
        key: 'SUBMITTED',
        label: 'Request Submitted',
        isDone: isSubmitted,
        isCurrent: !isReceived,
        icon: '✓',
        time: submittedTime ? formatISTTimeOnly(submittedTime) : ''
      },
      {
        key: 'RECEIVED',
        label: 'Received by Police',
        isDone: isReceived,
        isCurrent: isReceived && !isViewed && !isAcknowledged,
        icon: '✓',
        time: receivedTime ? formatISTTimeOnly(receivedTime) : ''
      },
      {
        key: 'VIEWED',
        label: 'Viewed by Officer',
        isDone: isViewed,
        isCurrent: isViewed && !isAcknowledged,
        icon: '✓',
        time: viewedTime ? formatISTTimeOnly(viewedTime) : ''
      },
      {
        key: 'ACKNOWLEDGED',
        label: 'Acknowledged',
        isDone: isAcknowledged,
        isCurrent: isAcknowledged && !isAssigned,
        icon: '✓',
        time: acknowledgedTime ? formatISTTimeOnly(acknowledgedTime) : ''
      },
      {
        key: 'OFFICER_ASSIGNED',
        label: 'Officer Assigned',
        detail: report?.patrol_assignment ? `${report.patrol_assignment.officer_in_charge} (${report.patrol_assignment.unit_name})` : report?.assigned_patrol_code ? `Unit ${report.assigned_patrol_code}` : undefined,
        isDone: isAssigned,
        isCurrent: isAssigned && !isEnRoute && !isResolved,
        icon: '🚓',
        time: assignedTime ? formatISTTimeOnly(assignedTime) : ''
      },
      {
        key: 'EN_ROUTE',
        label: 'En Route',
        detail: report?.patrol_assignment?.eta_minutes ? `ETA ~${report.patrol_assignment.eta_minutes} mins` : undefined,
        isDone: isEnRoute,
        isCurrent: isEnRoute && !isResolved,
        icon: '📍',
        time: enRouteTime ? formatISTTimeOnly(enRouteTime) : ''
      },
      {
        key: 'RESOLVED',
        label: 'Resolved',
        isDone: isResolved,
        isCurrent: isResolved,
        icon: isResolved ? '✓' : '○',
        time: resolvedTime ? formatISTTimeOnly(resolvedTime) : ''
      }
    ];
  };

  const getStatusMessage = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ARRIVED' || s === 'PATROL_ARRIVED' || s === 'RESOLVED' || s === 'CLOSED') {
      return "Police patrol has resolved this emergency intervention.";
    }
    if (s === 'RESPONDING' || s === 'PATROL_EN_ROUTE' || s === 'EN_ROUTE') {
      return "Police patrol unit is en route with emergency siren enabled.";
    }
    if (s === 'PATROL_ASSIGNED' || s === 'OFFICER_ASSIGNED' || s === 'PRIORITY_ASSIGNED') {
      return "Patrol unit assigned and mobilized for immediate dispatch.";
    }
    if (s === 'ACKNOWLEDGED' || s === 'REVIEWING' || s === 'POLICE_VERIFICATION' || s === 'UNDER_REVIEW') {
      return "Police Command Center has acknowledged your alert and is mobilizing response.";
    }
    if (s === 'VIEWED' || s === 'VIEWED_BY_OFFICER') {
      return "Duty Police Officer has opened and reviewed your emergency SOS dossier.";
    }
    return "Emergency SOS alert received by Police Control Center. Dispatch in progress.";
  };

  const incidentTypes = [
    'Violent Crime / Assault',
    'Theft / Robbery / Burglary',
    'Harassment / Eve Teasing / Women Safety',
    'Suspicious Activity / Armed Person',
    'Road Accident / Hit & Run',
    'Kidnapping / Missing Person',
    'Vandalism / Public Disturbance',
    'Cybercrime / Financial Scam',
    'Other Emergency'
  ];

  return (
    <div className="min-h-screen bg-[#FFF7F4] text-[#2B1F1D] py-8 px-4 sm:px-6 lg:px-8">
      {/* Hidden audio element for preview */}
      {audioUrl && (
        <audio
          ref={audioPlayerRef}
          src={audioUrl}
          onEnded={() => setIsPlayingAudio(false)}
          className="hidden"
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Emergency Hotlines Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#542A20] via-[#883A2E] to-[#542A20] border border-[#883A2E] p-4 sm:p-5 shadow-xl text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D65A31] text-white shadow-lg shadow-[#D65A31]/40 animate-pulse">
                <Radio className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FAF0EC] font-mono">
                    Official Citizen SOS Portal
                  </span>
                  <span className="inline-flex items-center rounded-full bg-[#D65A31]/30 px-2 py-0.5 text-[10px] font-bold text-white border border-[#D65A31]/40">
                    LIVE RESPONSE
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  🚨 Citizen Emergency Crime Reporting
                </h1>
                <p className="text-xs text-[#FAF0EC]/90 mt-0.5">
                  Instant live dispatch to nearest police control unit with GPS coordinates & media.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <a
                href="tel:112"
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 rounded-xl bg-[#D65A31] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#D65A31]/30 hover:bg-[#C47A5A] transition-all active:scale-95"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Call 112 (National SOS)</span>
              </a>
              <Link
                to="/police-emergency"
                className="hidden sm:flex items-center space-x-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-medium text-white hover:bg-white/20 transition-all"
              >
                <Shield className="h-4 w-4 text-[#FAF0EC]" />
                <span>Police Command</span>
              </Link>
            </div>
          </div>
        </div>

        {/* SUCCESS CONFIRMATION MODAL */}
        {submissionSuccess && submittedReport && (
          <div className="rounded-2xl border border-[#2E7D32]/30 bg-[#FFFDFC] p-6 sm:p-8 shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/30 shadow-md">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#2B1F1D]">EMERGENCY ALERT TRANSMITTED</h2>
                <p className="text-sm text-[#2E7D32] font-semibold mt-1">
                  Police Control Center has received your alert. Live response tracking is active below.
                </p>
              </div>

              {/* Reference ID Card */}
              <div className="max-w-md mx-auto rounded-xl border border-[#EEDFD9] bg-[#FAF0EC] p-4 text-left space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#EEDFD9] pb-2">
                  <span className="text-xs text-[#7A6360]">Emergency Tracking ID</span>
                  <span className="font-mono text-base font-bold text-[#883A2E] tracking-wider">
                    {submittedReport.report_code}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#7A6360]">Incident:</span>
                    <p className="font-medium text-[#2B1F1D] truncate">{submittedReport.incident_type}</p>
                  </div>
                  <div>
                    <span className="text-[#7A6360]">Severity:</span>
                    <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-[#883A2E]/10 text-[#883A2E] border border-[#883A2E]/20">
                      {submittedReport.severity}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#7A6360]">Location Transmitted:</span>
                    <p className="font-medium text-[#2B1F1D] truncate">{submittedReport.location_address}</p>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-[#EEDFD9]">
                    <span className="text-[#7A6360]">Submission Time (IST):</span>
                    <p className="font-semibold text-[#883A2E]">{formatISTDateTime(submittedReport.created_at || submittedReport.reported_at)}</p>
                  </div>
                </div>
              </div>

              {/* 7-Step Citizen Request Response Tracker */}
              <div className="max-w-lg mx-auto p-5 rounded-2xl border border-[#EEDFD9] bg-[#FAF0EC]/80 shadow-warm-xs space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-[#EEDFD9] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#2E7D32] animate-ping"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2B1F1D]">Citizen Response Tracking</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#883A2E] font-semibold bg-white px-2 py-0.5 rounded border border-[#EEDFD9]">
                    Live SSE Stream
                  </span>
                </div>

                <div className="space-y-3">
                  {getTimelineMilestones(submittedReport).map((milestone) => (
                    <div
                      key={milestone.key}
                      className={`flex items-start justify-between p-2.5 rounded-xl transition-all ${
                        milestone.isCurrent
                          ? 'bg-white border-2 border-[#883A2E] shadow-sm'
                          : milestone.isDone
                          ? 'bg-white/70 border border-[#2E7D32]/30'
                          : 'bg-transparent border border-dashed border-[#EEDFD9] opacity-60'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          milestone.isDone
                            ? 'bg-[#2E7D32] text-white shadow-xs'
                            : milestone.isCurrent
                            ? 'bg-[#883A2E] text-white animate-pulse'
                            : 'border border-[#7A6360]/40 text-[#7A6360]'
                        }`}>
                          {milestone.icon}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${
                            milestone.isCurrent ? 'text-[#883A2E]' : milestone.isDone ? 'text-[#2B1F1D]' : 'text-[#7A6360]'
                          }`}>
                            {milestone.label}
                          </p>
                          {milestone.detail && (
                            <p className="text-[11px] text-[#7A6360] mt-0.5 font-medium">{milestone.detail}</p>
                          )}
                        </div>
                      </div>

                      {milestone.time && (
                        <span className="text-[11px] font-mono font-semibold text-[#883A2E] shrink-0 ml-2">
                          {milestone.time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Live Status Message */}
                <div className="p-3 rounded-xl bg-[#883A2E]/10 border border-[#883A2E]/20 text-xs font-bold text-[#883A2E] text-center">
                  {getStatusMessage(submittedReport.status)}
                </div>

                {/* Patrol Unit Details Callout */}
                {(submittedReport.patrol_assignment || submittedReport.assigned_patrol_code) && (
                  <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/80 text-xs space-y-1.5 text-purple-900">
                    <div className="font-bold border-b border-purple-200 pb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Shield className="h-3.5 w-3.5 text-purple-700" />
                        <span>Assigned Patrol Response Unit</span>
                      </span>
                      <span className="font-mono bg-purple-200 px-2 py-0.5 rounded text-[10px]">
                        {submittedReport.patrol_assignment?.unit_name || submittedReport.assigned_patrol_code}
                      </span>
                    </div>
                    {submittedReport.patrol_assignment?.officer_in_charge && (
                      <p><span className="text-purple-700 font-medium">Officer in Charge:</span> {submittedReport.patrol_assignment.officer_in_charge}</p>
                    )}
                    {submittedReport.patrol_assignment?.vehicle_type && (
                      <p><span className="text-purple-700 font-medium">Vehicle:</span> {submittedReport.patrol_assignment.vehicle_type}</p>
                    )}
                    {submittedReport.patrol_assignment?.eta_minutes && (
                      <p><span className="text-purple-700 font-medium">Estimated Arrival:</span> ~{submittedReport.patrol_assignment.eta_minutes} mins</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    setSubmissionSuccess(false);
                    setSubmittedReport(null);
                    setDescription('');
                    removePhoto();
                    resetAudio();
                  }}
                  className="w-full sm:w-auto rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-5 py-2.5 text-xs font-semibold text-[#2B1F1D] hover:bg-[#FAF0EC] transition-colors shadow-xs"
                >
                  File Another Report
                </button>
                <Link
                  to="/police-emergency"
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-[#883A2E] hover:bg-[#542A20] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  <span>View in Police Command Hub</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* MAIN REPORTING FORM */}
        {!submissionSuccess && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-50 p-4 text-xs text-rose-800 flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Incident Categorization & Severity */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center space-x-2.5 border-b border-[#EEDFD9] pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#883A2E]/10 text-[#883A2E] font-bold text-xs border border-[#883A2E]/20">
                  1
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#2B1F1D]">
                  Incident Category & Priority
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Incident Type */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#7A6360]">
                    What type of emergency is happening? <span className="text-[#883A2E]">*</span>
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3.5 py-2.5 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                  >
                    {incidentTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Severity Radio Buttons */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#7A6360]">
                    Threat Level / Priority <span className="text-[#883A2E]">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { level: 'CRITICAL', label: 'Critical', activeStyle: 'border-[#883A2E] bg-[#883A2E] text-white shadow-sm' },
                      { level: 'HIGH', label: 'High', activeStyle: 'border-[#D65A31] bg-[#D65A31] text-white shadow-sm' },
                      { level: 'MEDIUM', label: 'Medium', activeStyle: 'border-[#C47A5A] bg-[#C47A5A] text-white shadow-sm' }
                    ].map(s => (
                      <button
                        type="button"
                        key={s.level}
                        onClick={() => setSeverity(s.level as any)}
                        className={`rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
                          severity === s.level
                            ? s.activeStyle
                            : 'border-[#EEDFD9] bg-[#FAF0EC] text-[#7A6360] hover:bg-[#EEDFD9]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Media Attachments (Photo + Voice Audio) */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center space-x-2.5 border-b border-[#EEDFD9] pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#883A2E]/10 text-[#883A2E] font-bold text-xs border border-[#883A2E]/20">
                  2
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#2B1F1D]">
                  Media Evidence (Photo & Voice Message)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. PHOTO CAPTURE / UPLOAD */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#7A6360]">
                    📸 Incident Photo (Camera / Gallery)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {photoPreview ? (
                    <div className="relative rounded-xl border border-[#EEDFD9] bg-[#FAF0EC] p-2 overflow-hidden group">
                      <img
                        src={photoPreview}
                        alt="Incident Preview"
                        className="h-44 w-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute top-4 right-4 rounded-full bg-[#883A2E] text-white p-1.5 shadow-lg hover:bg-[#542A20] transition-colors"
                        title="Remove Photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-4 left-4 rounded-md bg-[#542A20]/80 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                        Photo Ready
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center w-full h-44 rounded-xl border-2 border-dashed border-[#EEDFD9] bg-[#FAF0EC] hover:bg-[#FFFDFC] hover:border-[#883A2E] transition-all group cursor-pointer"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#883A2E]/10 text-[#883A2E] group-hover:scale-110 group-hover:bg-[#883A2E]/20 transition-all">
                        <Camera className="h-6 w-6" />
                      </div>
                      <span className="mt-2 text-xs font-semibold text-[#2B1F1D]">
                        Take Snapshot or Upload Image
                      </span>
                      <span className="text-[10px] text-[#7A6360] mt-0.5">
                        JPG, PNG, HEIC up to 25MB
                      </span>
                    </button>
                  )}
                </div>

                {/* 2. VOICE AUDIO RECORDING */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#7A6360]">
                    🎤 Voice Message (Record description)
                  </label>

                  <div className="flex flex-col items-center justify-center w-full h-44 rounded-xl border border-[#EEDFD9] bg-[#FAF0EC] p-4 space-y-3">
                    {/* Recording in progress */}
                    {isRecording ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="flex items-center space-x-2 text-[#883A2E] font-mono text-base font-bold animate-pulse">
                          <span className="h-3 w-3 rounded-full bg-[#883A2E]"></span>
                          <span>Recording: {formatTime(recordingTime)}</span>
                        </div>
                        <p className="text-[11px] text-[#7A6360] text-center max-w-xs">
                          Speak clearly. Describe suspects, weapons, direction of movement, landmarks...
                        </p>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex items-center space-x-2 rounded-xl bg-[#883A2E] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#542A20] transition-all cursor-pointer"
                        >
                          <Square className="h-4 w-4 fill-white" />
                          <span>Stop Recording</span>
                        </button>
                      </div>
                    ) : audioBlob ? (
                      /* Audio Recorded & Ready */
                      <div className="w-full flex flex-col items-center space-y-3">
                        <div className="flex items-center space-x-2 text-[#2E7D32] text-xs font-bold">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Voice Message Recorded ({formatTime(recordingTime)})</span>
                        </div>

                        <div className="flex items-center space-x-3 w-full justify-center">
                          <button
                            type="button"
                            onClick={togglePlayAudio}
                            className="flex items-center space-x-1.5 rounded-xl bg-[#883A2E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#542A20] transition-colors shadow-sm cursor-pointer"
                          >
                            {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            <span>{isPlayingAudio ? 'Pause' : 'Play Preview'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={resetAudio}
                            className="flex items-center space-x-1 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] hover:bg-[#FAF0EC] transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-[#7A6360]" />
                            <span>Re-record</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Idle State */
                      <div className="flex flex-col items-center space-y-2 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#883A2E]/10 text-[#883A2E]">
                          <Mic className="h-6 w-6" />
                        </div>
                        <button
                          type="button"
                          onClick={startRecording}
                          className="flex items-center space-x-2 rounded-xl bg-[#883A2E] hover:bg-[#542A20] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                        >
                          <Mic className="h-4 w-4" />
                          <span>Start Voice Recording</span>
                        </button>
                        <span className="text-[10px] text-[#7A6360]">
                          Hands-free voice note for rapid reporting
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Location Details & GPS */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#EEDFD9] pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#883A2E]/10 text-[#883A2E] font-bold text-xs border border-[#883A2E]/20">
                    3
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#2B1F1D]">
                    Incident Location (GPS Coordinates)
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={fetchCurrentLocation}
                  disabled={isLocating}
                  className="flex items-center space-x-1.5 rounded-lg border border-[#EEDFD9] bg-[#FAF0EC] px-2.5 py-1 text-xs text-[#883A2E] hover:bg-[#EEDFD9] transition-colors disabled:opacity-50 cursor-pointer font-medium"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{isLocating ? 'Acquiring GPS...' : 'Refresh GPS'}</span>
                </button>
              </div>

              {locationError && (
                <div className="text-[11px] text-[#D65A31] bg-[#FAF0EC] border border-[#EEDFD9] p-2.5 rounded-lg">
                  {locationError}
                </div>
              )}

              {/* Coordinates Display */}
              {latitude && longitude && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center space-x-1 rounded-md bg-[#2E7D32]/10 px-2.5 py-1 text-[#2E7D32] border border-[#2E7D32]/30 font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>GPS Acquired: {latitude}, {longitude}</span>
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#883A2E] hover:underline text-[11px] inline-flex items-center gap-1 font-medium"
                  >
                    Open in Maps <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-semibold text-[#7A6360]">
                    Exact Address / Street / Landmark
                  </label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="e.g. Near T. Nagar Bus Terminus, Usman Road, Chennai"
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3.5 py-2.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#7A6360]">State / UT</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3.5 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-semibold text-[#7A6360]">District / City</label>
                  <input
                    type="text"
                    value={districtName}
                    onChange={(e) => setDistrictName(e.target.value)}
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3.5 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Text Description & Citizen Details */}
            <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center space-x-2.5 border-b border-[#EEDFD9] pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#883A2E]/10 text-[#883A2E] font-bold text-xs border border-[#883A2E]/20">
                  4
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#2B1F1D]">
                  Description & Contact Information
                </h2>
              </div>

              {/* Text Area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#7A6360]">
                  Incident Description (Optional if voice recording provided)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the incident in detail: what happened, physical description of suspects, vehicle registration number, weapons if any..."
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] p-3 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:outline-none shadow-xs"
                />
              </div>

              {/* Citizen Details */}
              <div className="border-t border-[#EEDFD9] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#7A6360]">
                    Your Contact Information (Confidential for Police Dispatch)
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-[#EEDFD9] text-[#883A2E] focus:ring-[#883A2E] bg-[#FFFDFC]"
                    />
                    <span className="text-xs text-[#7A6360]">Report Anonymously</span>
                  </label>
                </div>

                {!isAnonymous && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        value={citizenName}
                        onChange={(e) => setCitizenName(e.target.value)}
                        placeholder="Your Full Name (e.g. Ramesh Kumar)"
                        className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3.5 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        value={citizenPhone}
                        onChange={(e) => setCitizenPhone(e.target.value)}
                        placeholder="Your Phone Number (e.g. +91 98765 43210)"
                        className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3.5 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEND EMERGENCY ALERT (SOS BUTTON) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#883A2E] via-[#D65A31] to-[#883A2E] p-4 text-center font-black uppercase tracking-wider text-white shadow-xl shadow-[#883A2E]/25 hover:from-[#542A20] hover:to-[#883A2E] transition-all transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
              >
                <div className="flex items-center justify-center space-x-3 text-base sm:text-lg">
                  <Radio className={`h-6 w-6 ${isSubmitting ? 'animate-spin' : 'animate-pulse'}`} />
                  <span>{isSubmitting ? 'TRANSMITTING SOS TO POLICE...' : '🚨 SEND EMERGENCY ALERT'}</span>
                </div>
                <div className="text-[11px] font-medium text-white/90 mt-1">
                  Instant broadcast to Police Command Center with Live Geolocation & Audio/Photo
                </div>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
