import { db } from '../db/schema';
import { logIncidentAudit, broadcastEmergencyEvent } from '../controllers/emergencyController';
import { syncEmergencyReportToSupabase, syncPatrolAssignmentToSupabase } from '../db/supabaseSync';

/**
 * Haversine formula to compute great-circle distance between two GPS points in Kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate dynamic ETA in minutes based on distance in KM
 */
export function calculateDynamicETA(distanceKm: number): number {
  // Average city emergency response speed ~30 km/h => 0.5 km per min
  // Add 3 minutes fixed dispatch/preparation buffer, minimum 2 minutes
  const travelMins = Math.round((distanceKm / 30) * 60);
  return Math.max(2, travelMins + 3);
}

/**
 * Automatic Patrol Dispatch Service
 */
export function autoDispatchNearestPatrol(
  reportCode: string,
  incidentLat: number | null,
  incidentLng: number | null
) {
  try {
    // 1. Validate GPS Coordinates
    if (
      incidentLat === null ||
      incidentLng === null ||
      isNaN(incidentLat) ||
      isNaN(incidentLng) ||
      incidentLat < -90 ||
      incidentLat > 90 ||
      incidentLng < -180 ||
      incidentLng > 180 ||
      (incidentLat === 0 && incidentLng === 0)
    ) {
      db.prepare(`
        UPDATE emergency_reports
        SET dispatch_status = 'NO_GPS', updated_at = CURRENT_TIMESTAMP
        WHERE report_code = ?
      `).run(reportCode);

      logIncidentAudit(
        reportCode,
        'SYSTEM_DISPATCH',
        'Auto Dispatch Engine',
        'DISPATCH_SKIPPED_NO_GPS',
        'INCIDENT_REPORTED',
        'INCIDENT_REPORTED',
        'No valid GPS coordinates provided. Incident pending manual dispatch.'
      );
      return { success: false, reason: 'NO_GPS' };
    }

    // 2. Fetch all ACTIVE Police Stations
    const stations: any[] = db.prepare(`SELECT * FROM police_stations WHERE status = 'ACTIVE'`).all();

    if (stations.length === 0) {
      db.prepare(`
        UPDATE emergency_reports
        SET dispatch_status = 'PATROL_UNAVAILABLE', status = 'PATROL_UNAVAILABLE', updated_at = CURRENT_TIMESTAMP
        WHERE report_code = ?
      `).run(reportCode);
      return { success: false, reason: 'NO_STATIONS_CONFIGURED' };
    }

    // 3. Compute distance to each station and sort ascending
    const sortedStations = stations
      .map(st => {
        const dist = calculateHaversineDistance(incidentLat, incidentLng, st.latitude, st.longitude);
        return { ...st, distance_km: dist };
      })
      .sort((a, b) => a.distance_km - b.distance_km);

    // 4. Fallback search through stations for the first available patrol unit
    let assignedStation: any = null;
    let assignedPatrol: any = null;

    for (const station of sortedStations) {
      const availablePatrol = db.prepare(`
        SELECT * FROM patrol_units
        WHERE station_id = ? AND status = 'AVAILABLE'
        ORDER BY last_updated ASC
        LIMIT 1
      `).get(station.id);

      if (availablePatrol) {
        assignedStation = station;
        assignedPatrol = availablePatrol;
        break;
      }
    }

    // 5. If an available patrol unit was found:
    if (assignedStation && assignedPatrol) {
      const distanceKm = assignedStation.distance_km;
      const etaMinutes = calculateDynamicETA(distanceKm);

      // Mark patrol unit as ASSIGNED so it cannot be assigned to another active incident simultaneously
      db.prepare(`
        UPDATE patrol_units
        SET status = 'ASSIGNED', last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(assignedPatrol.id);

      // Insert patrol assignment record
      db.prepare(`
        INSERT INTO patrol_assignments (
          report_code, unit_name, vehicle_type, officer_in_charge, contact_number,
          eta_minutes, dispatch_notes, station_id, station_name, patrol_id, distance_km,
          dispatch_type, status, assigned_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AUTOMATIC', 'ASSIGNED', CURRENT_TIMESTAMP)
      `).run(
        reportCode,
        assignedPatrol.unit_code,
        assignedPatrol.vehicle_type,
        assignedPatrol.officer_in_charge,
        assignedPatrol.contact_number,
        etaMinutes,
        `Auto-assigned nearest patrol unit from ${assignedStation.name} (${distanceKm} km away)`,
        assignedStation.id,
        assignedStation.name,
        assignedPatrol.id,
        distanceKm
      );

      // Fetch incident status timeline & append timeline entry
      const reportRow: any = db.prepare('SELECT status_timeline FROM emergency_reports WHERE report_code = ?').get(reportCode);
      let timeline = [];
      try {
        timeline = reportRow && reportRow.status_timeline ? JSON.parse(reportRow.status_timeline) : [];
      } catch {
        timeline = [];
      }

      timeline.push({
        status: 'PATROL_ASSIGNED',
        timestamp: new Date().toISOString(),
        note: `🚓 AUTO-DISPATCHED: Patrol ${assignedPatrol.unit_code} from ${assignedStation.name} assigned (${distanceKm} km away, ETA ~${etaMinutes} mins)`
      });

      // Update emergency report status
      db.prepare(`
        UPDATE emergency_reports
        SET status = 'PATROL_ASSIGNED',
            nearest_station_id = ?,
            nearest_station_name = ?,
            distance_km = ?,
            estimated_eta_minutes = ?,
            dispatch_status = 'AUTOMATICALLY_DISPATCHED',
            assigned_patrol_id = ?,
            assigned_patrol_code = ?,
            patrol_assigned_at = CURRENT_TIMESTAMP,
            status_timeline = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE report_code = ?
      `).run(
        assignedStation.id,
        assignedStation.name,
        distanceKm,
        etaMinutes,
        assignedPatrol.id,
        assignedPatrol.unit_code,
        JSON.stringify(timeline),
        reportCode
      );

      logIncidentAudit(
        reportCode,
        'SYSTEM_DISPATCH',
        'Auto Dispatch Engine',
        'AUTOMATIC_PATROL_DISPATCHED',
        'INCIDENT_REPORTED',
        'PATROL_ASSIGNED',
        `Nearest station: ${assignedStation.name} (${distanceKm} km). Assigned Patrol: ${assignedPatrol.unit_code} (${assignedPatrol.officer_in_charge}). ETA: ${etaMinutes} mins.`
      );

      const updatedReport = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(reportCode);
      const assignmentRecord = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(reportCode);

      // Sync to Supabase
      syncEmergencyReportToSupabase(updatedReport);
      syncPatrolAssignmentToSupabase(assignmentRecord);

      // Realtime broadcast to Police Command Center
      broadcastEmergencyEvent('PATROL_DISPATCHED', {
        report: updatedReport,
        assignment: assignmentRecord,
        station: assignedStation,
        patrol: assignedPatrol
      });

      return {
        success: true,
        dispatch_status: 'AUTOMATICALLY_DISPATCHED',
        station: assignedStation,
        patrol: assignedPatrol,
        distance_km: distanceKm,
        eta_minutes: etaMinutes
      };
    }

    // 6. Fallback: No available patrol unit found at ANY police station
    const nearestStation = sortedStations[0];
    const distanceKm = nearestStation.distance_km;

    const reportRow: any = db.prepare('SELECT status_timeline FROM emergency_reports WHERE report_code = ?').get(reportCode);
    let timeline = [];
    try {
      timeline = reportRow && reportRow.status_timeline ? JSON.parse(reportRow.status_timeline) : [];
    } catch {
      timeline = [];
    }

    timeline.push({
      status: 'PATROL_UNAVAILABLE',
      timestamp: new Date().toISOString(),
      note: `⚠️ DISPATCH ALERT: Nearest station ${nearestStation.name} (${distanceKm} km away) & nearby stations have NO available patrols. Manual officer assignment required.`
    });

    db.prepare(`
      UPDATE emergency_reports
      SET status = 'PATROL_UNAVAILABLE',
          nearest_station_id = ?,
          nearest_station_name = ?,
          distance_km = ?,
          dispatch_status = 'PATROL_UNAVAILABLE',
          status_timeline = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE report_code = ?
    `).run(
      nearestStation.id,
      nearestStation.name,
      distanceKm,
      JSON.stringify(timeline),
      reportCode
    );

    logIncidentAudit(
      reportCode,
      'SYSTEM_DISPATCH',
      'Auto Dispatch Engine',
      'PATROL_UNAVAILABLE_ALERT',
      'INCIDENT_REPORTED',
      'PATROL_UNAVAILABLE',
      `No available patrol units found at nearest station (${nearestStation.name}, ${distanceKm} km) or surrounding stations.`
    );

    const updatedReport = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(reportCode);
    syncEmergencyReportToSupabase(updatedReport);

    broadcastEmergencyEvent('PATROL_UNAVAILABLE_ALERT', {
      report: updatedReport,
      nearest_station: nearestStation,
      distance_km: distanceKm,
      message: `⚠️ CRITICAL: No available patrol units for incident ${reportCode} near ${nearestStation.name}.`
    });

    return {
      success: false,
      dispatch_status: 'PATROL_UNAVAILABLE',
      nearest_station: nearestStation,
      distance_km: distanceKm
    };
  } catch (err) {
    console.error('Error in autoDispatchNearestPatrol:', err);
    return { success: false, error: String(err) };
  }
}
