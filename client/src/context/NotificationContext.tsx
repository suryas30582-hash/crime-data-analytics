import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

export interface IncidentNotification {
  id: string;
  code: string;
  incident_type: string;
  severity: string;
  citizen_name: string;
  location_address?: string;
  timestamp: string;
  read: boolean;
  report?: any;
}

interface NotificationContextType {
  notifications: IncidentNotification[];
  unreadCount: number;
  markAsRead: (code: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isPolice, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<IncidentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const isEligible = !!user && (isPolice || isAdmin);
  const officerId = user?.id || 'anonymous';

  const refreshUnreadCount = async () => {
    if (!isEligible) return;
    try {
      // Server derives officer identity from JWT — no need to pass officerId
      const res = await api.getUnreadCount();
      if (res.success) {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.warn('Failed to fetch unread count:', err);
    }
  };

  // Initial fetch of unread/recent incidents for Police / Admin
  useEffect(() => {
    if (!isEligible) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    refreshUnreadCount();

    async function fetchRecent() {
      try {
        const res = await api.getEmergencyReports({ limit: 20 });
        if (res.success && Array.isArray(res.reports)) {
          const initialNotifs: IncidentNotification[] = res.reports.map((r: any) => ({
            id: r.report_code || r.id,
            code: r.report_code,
            incident_type: r.incident_type || 'Emergency Incident',
            severity: r.severity || 'HIGH',
            citizen_name: r.citizen_name || 'Citizen User',
            location_address: r.location_address || '',
            timestamp: r.created_at || r.createdAt || new Date().toISOString(),
            read: r.status !== 'RECEIVED' && r.status !== 'ALERT_RECEIVED' && r.status !== 'INCIDENT_REPORTED', // Guess state for UI
            report: r
          }));
          setNotifications(initialNotifs);
        }
      } catch (err) {
        console.warn('Failed to load initial notifications:', err);
      }
    }

    fetchRecent();
  }, [isEligible, officerId]);

  // SSE Live Stream Listener — with auto-reconnect on network error
  useEffect(() => {
    if (!isEligible) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 2000; // start at 2 s, cap at 30 s
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      try {
        const streamUrl = api.getEmergencyStreamUrl();
        eventSource = new EventSource(streamUrl);

        const handleNewIncident = (event: MessageEvent) => {
          try {
            const report = JSON.parse(event.data);
            setNotifications(prev => [{
              id: report.report_code || `notif_${Date.now()}`,
              code: report.report_code,
              incident_type: report.incident_type || 'New Incident Alert',
              severity: report.severity || 'HIGH',
              citizen_name: report.citizen_name || 'Citizen User',
              location_address: report.location_address || '',
              timestamp: new Date().toISOString(),
              read: false,
              report
            }, ...prev.filter(n => n.code !== report.report_code)]);
            // Re-fetch badge count from server
            refreshUnreadCount();
          } catch (e) {
            console.error('Error processing notification SSE:', e);
          }
        };

        eventSource.addEventListener('NEW_INCIDENT', handleNewIncident);
        eventSource.addEventListener('NEW_EMERGENCY', handleNewIncident);

        // Reset backoff on successful open
        eventSource.onopen = () => { retryDelay = 2000; };

        eventSource.onerror = () => {
          // Close and schedule reconnect with exponential backoff
          eventSource?.close();
          eventSource = null;
          if (!destroyed) {
            reconnectTimer = setTimeout(() => {
              retryDelay = Math.min(retryDelay * 2, 30000);
              connect();
            }, retryDelay);
          }
        };
      } catch (err) {
        console.warn('SSE notification stream error:', err);
      }
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) eventSource.close();
    };
  }, [isEligible, officerId]);

  const markAsRead = async (code: string) => {
    setNotifications(prev =>
      prev.map(n => (n.code === code ? { ...n, read: true } : n))
    );
    if (isEligible) {
      try {
        const res = await api.markReportRead(code);
        if (res.success) {
          setUnreadCount(res.unreadCount);
        }
      } catch (e) {
        console.error('Failed to mark as read', e);
      }
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // Real implementation would batch API calls, but this is sufficient for UI
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        refreshUnreadCount
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

