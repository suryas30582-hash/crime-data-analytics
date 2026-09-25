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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isPolice, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<IncidentNotification[]>([]);

  const isEligible = !!user && (isPolice || isAdmin);

  // Initial fetch of unread/recent incidents for Police / Admin
  useEffect(() => {
    if (!isEligible) {
      setNotifications([]);
      return;
    }

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
            read: r.status !== 'RECEIVED', // Unread if status is RECEIVED
            report: r
          }));
          setNotifications(initialNotifs);
        }
      } catch (err) {
        console.warn('Failed to load initial notifications:', err);
      }
    }

    fetchRecent();
  }, [isEligible, user?.id]);

  // SSE Live Stream Listener for real-time Silent Alerts
  useEffect(() => {
    if (!isEligible) return;

    let eventSource: EventSource | null = null;
    try {
      const streamUrl = api.getEmergencyStreamUrl();
      eventSource = new EventSource(streamUrl);

      const handleNewIncident = (event: MessageEvent) => {
        try {
          const report = JSON.parse(event.data);
          const newNotif: IncidentNotification = {
            id: report.report_code || `notif_${Date.now()}`,
            code: report.report_code,
            incident_type: report.incident_type || 'New Incident Alert',
            severity: report.severity || 'HIGH',
            citizen_name: report.citizen_name || 'Citizen User',
            location_address: report.location_address || '',
            timestamp: new Date().toISOString(),
            read: false,
            report
          };

          setNotifications(prev => [newNotif, ...prev.filter(n => n.code !== report.report_code)]);
        } catch (e) {
          console.error('Error processing notification SSE:', e);
        }
      };

      eventSource.addEventListener('NEW_INCIDENT', handleNewIncident);
      eventSource.addEventListener('NEW_EMERGENCY', handleNewIncident);

    } catch (err) {
      console.warn('SSE notification stream error:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [isEligible]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (code: string) => {
    setNotifications(prev =>
      prev.map(n => (n.code === code ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
        clearNotifications
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
