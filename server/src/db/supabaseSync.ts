import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Sync user registration to Supabase `users` table
 */
export async function syncUserToSupabase(user: {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
}) {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('users').upsert(
      {
        id: user.id,
        email: user.email.toLowerCase(),
        name: user.name,
        password_hash: user.password_hash,
        role: user.role
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('Supabase sync user error:', error.message);
    } else {
      console.log(`[Supabase] User ${user.email} synced successfully.`);
    }
  } catch (err: any) {
    console.error('Supabase sync user exception:', err.message);
  }
}

/**
 * Sync emergency report to Supabase `emergency_reports` table
 */
export async function syncEmergencyReportToSupabase(report: any): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const { error } = await supabase.from('emergency_reports').upsert(
      {
        report_code: report.report_code,
        incident_type: report.incident_type,
        severity: report.severity,
        description: report.description,
        photo_url: report.photo_url || null,
        audio_url: report.audio_url || null,
        latitude: report.latitude || null,
        longitude: report.longitude || null,
        location_address: report.location_address || null,
        state: report.state || 'Tamil Nadu',
        district: report.district || null,
        city: report.city || null,
        citizen_name: report.citizen_name || 'Anonymous',
        citizen_phone: report.citizen_phone || null,
        status: report.status,
        status_timeline: typeof report.status_timeline === 'string' ? JSON.parse(report.status_timeline) : (report.status_timeline || []),
        reported_at: report.reported_at || new Date().toISOString(),
        verified_at: report.verified_at || null,
        priority_assigned_at: report.priority_assigned_at || null,
        patrol_assigned_at: report.patrol_assigned_at || null,
        en_route_at: report.en_route_at || null,
        arrived_at: report.arrived_at || null,
        evidence_collected_at: report.evidence_collected_at || null,
        officer_report_submitted_at: report.officer_report_submitted_at || null,
        investigation_at: report.investigation_at || null,
        resolved_at: report.resolved_at || null,
        escalated_at: report.escalated_at || null,
        delay_flagged_at: report.delay_flagged_at || null,
        investigation_notes: report.investigation_notes || null,
        evidence_details: report.evidence_details || null,
        action_taken: report.action_taken || null,
        scene_photos: typeof report.scene_photos === 'string' ? JSON.parse(report.scene_photos) : (report.scene_photos || []),
        escalation_reason: report.escalation_reason || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'report_code' }
    );

    if (error) {
      console.error(`[Supabase Sync Error] Emergency report ${report.report_code}:`, error.message);
      return { success: false, error: error.message };
    } else {
      console.log(`[Supabase] Emergency report ${report.report_code} synced successfully.`);
      return { success: true };
    }
  } catch (err: any) {
    console.error(`[Supabase Sync Exception] Emergency report ${report?.report_code}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sync patrol assignment to Supabase `patrol_assignments` table
 */
export async function syncPatrolAssignmentToSupabase(assignment: any) {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('patrol_assignments').insert({
      report_code: assignment.report_code,
      unit_name: assignment.unit_name,
      vehicle_type: assignment.vehicle_type,
      officer_in_charge: assignment.officer_in_charge,
      contact_number: assignment.contact_number || null,
      eta_minutes: assignment.eta_minutes || 5,
      dispatch_notes: assignment.dispatch_notes || null,
      assigned_at: assignment.assigned_at || new Date().toISOString()
    });

    if (error) {
      console.error('Supabase sync patrol assignment error:', error.message);
    } else {
      console.log(`[Supabase] Patrol unit ${assignment.unit_name} assignment synced.`);
    }
  } catch (err: any) {
    console.error('Supabase sync patrol assignment exception:', err.message);
  }
}

/**
 * Sync backup request to Supabase `backup_requests` table
 */
export async function syncBackupRequestToSupabase(backup: any) {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('backup_requests').insert({
      report_code: backup.report_code,
      requested_by: backup.requested_by,
      reason: backup.reason,
      urgency: backup.urgency || 'HIGH',
      status: backup.status || 'PENDING',
      created_at: backup.created_at || new Date().toISOString()
    });

    if (error) {
      console.error('Supabase sync backup request error:', error.message);
    } else {
      console.log(`[Supabase] Backup request for ${backup.report_code} synced.`);
    }
  } catch (err: any) {
    console.error('Supabase sync backup request exception:', err.message);
  }
}

/**
 * Sync incident audit trail to Supabase `incident_audit_trail` table
 */
export async function syncAuditLogToSupabase(log: any) {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('incident_audit_trail').insert({
      report_code: log.report_code,
      user_id: log.user_id || null,
      user_name: log.user_name || 'System',
      action: log.action,
      previous_status: log.previous_status || null,
      new_status: log.new_status || null,
      details: log.details || null,
      timestamp: log.timestamp || new Date().toISOString()
    });

    if (error) {
      console.error('Supabase sync audit log error:', error.message);
    }
  } catch (err: any) {
    console.error('Supabase sync audit log exception:', err.message);
  }
}

/**
 * Sync datasets to Supabase `datasets` table
 */
export async function syncDatasetToSupabase(dataset: any) {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('datasets').upsert({
      id: dataset.id,
      name: dataset.name,
      description: dataset.description || null,
      record_count: dataset.record_count || 0,
      created_by: dataset.created_by || 'System',
      created_at: dataset.created_at || new Date().toISOString(),
      is_default: dataset.is_default || 0
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase sync dataset error:', error.message);
    }
  } catch (err: any) {
    console.error('Supabase sync dataset exception:', err.message);
  }
}

/**
 * Sync crime records batch to Supabase `crime_records` table
 */
export async function syncCrimeRecordsToSupabase(datasetId: string, records: any[]) {
  if (!isSupabaseConfigured() || !supabase || records.length === 0) return;

  try {
    const sanitized = records.map(r => ({
      dataset_id: datasetId,
      crime_id: r.crime_id,
      date: r.date,
      time: r.time || null,
      year: parseInt(r.year, 10),
      month: parseInt(r.month, 10),
      crime_type: r.crime_type,
      city: r.city,
      state: r.state,
      district: r.district || null,
      location: r.location || null,
      victim_age: r.victim_age ? parseInt(r.victim_age, 10) : null,
      victim_gender: r.victim_gender || null,
      suspect_age: r.suspect_age ? parseInt(r.suspect_age, 10) : null,
      suspect_gender: r.suspect_gender || null,
      weapon_used: r.weapon_used || null,
      case_status: r.case_status,
      latitude: r.latitude ? parseFloat(r.latitude) : null,
      longitude: r.longitude ? parseFloat(r.longitude) : null,
      crime_severity: r.crime_severity,
      police_station: r.police_station || null,
      arrest_made: r.arrest_made || 'No',
      incident_day: r.incident_day || null,
      investigation_days: r.investigation_days ? parseInt(r.investigation_days, 10) : null
    }));

    // Batch upload in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < sanitized.length; i += chunkSize) {
      const chunk = sanitized.slice(i, i + chunkSize);
      const { error } = await supabase.from('crime_records').insert(chunk);
      if (error) {
        console.error('Supabase sync crime_records error:', error.message);
        break;
      }
    }
    console.log(`[Supabase] Ingested ${sanitized.length} records for dataset ${datasetId}.`);
  } catch (err: any) {
    console.error('Supabase sync crime_records exception:', err.message);
  }
}
