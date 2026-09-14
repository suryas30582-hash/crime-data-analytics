import { Request, Response } from 'express';
import { db } from '../db/schema';
import { FilterParams } from '../types';
import { INDIA_LOCATION_MASTER } from '../data/indiaLocationsMaster';

function buildFilterClause(params: FilterParams, prefix: string = ''): { sql: string; args: any[] } {
  const clauses: string[] = [];
  const args: any[] = [];

  const datasetId = params.datasetId || 'ds_india_all';
  clauses.push(`${prefix}dataset_id = ?`);
  args.push(datasetId);

  if (params.state && params.state !== 'All' && params.state.trim() !== '') {
    clauses.push(`${prefix}state = ?`);
    args.push(params.state);
  }

  if (params.district && params.district !== 'All' && params.district.trim() !== '') {
    clauses.push(`${prefix}district = ?`);
    args.push(params.district);
  }

  if (params.city && params.city !== 'All' && params.city.trim() !== '') {
    clauses.push(`${prefix}city = ?`);
    args.push(params.city);
  }

  if (params.year && params.year !== 'All' && String(params.year).trim() !== '') {
    clauses.push(`${prefix}year = ?`);
    args.push(Number(params.year));
  }

  if (params.crimeType && params.crimeType !== 'All' && params.crimeType.trim() !== '') {
    clauses.push(`${prefix}crime_type = ?`);
    args.push(params.crimeType);
  }

  if (params.caseStatus && params.caseStatus !== 'All' && params.caseStatus.trim() !== '') {
    clauses.push(`${prefix}case_status = ?`);
    args.push(params.caseStatus);
  }

  if (params.severity && params.severity !== 'All' && params.severity.trim() !== '') {
    clauses.push(`${prefix}crime_severity = ?`);
    args.push(params.severity);
  }

  if (params.arrestMade && params.arrestMade !== 'All' && params.arrestMade.trim() !== '') {
    clauses.push(`${prefix}arrest_made = ?`);
    args.push(params.arrestMade);
  }

  if (params.search && params.search.trim() !== '') {
    const s = `%${params.search.trim()}%`;
    clauses.push(`(${prefix}crime_id LIKE ? OR ${prefix}crime_type LIKE ? OR ${prefix}city LIKE ? OR ${prefix}state LIKE ? OR ${prefix}location LIKE ? OR ${prefix}police_station LIKE ?)`);
    args.push(s, s, s, s, s, s);
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    args
  };
}

export function getKPIs(req: Request, res: Response) {
  try {
    const filters = req.query as FilterParams;
    const { sql, args } = buildFilterClause(filters);

    const kpiQuery = `
      SELECT
        COUNT(*) as total_crimes,
        SUM(CASE WHEN LOWER(case_status) IN ('closed', 'solved', 'charge sheet filed', 'convicted') THEN 1 ELSE 0 END) as solved_cases,
        SUM(CASE WHEN LOWER(case_status) IN ('unsolved', 'open', 'pending', 'under investigation') THEN 1 ELSE 0 END) as unsolved_cases,
        SUM(CASE WHEN LOWER(arrest_made) IN ('yes', 'y', 'true', '1') THEN 1 ELSE 0 END) as arrests_made,
        SUM(CASE WHEN LOWER(crime_severity) = 'high' THEN 1 ELSE 0 END) as high_severity_crimes,
        ROUND(AVG(CASE WHEN investigation_days IS NOT NULL AND investigation_days >= 0 THEN investigation_days ELSE NULL END), 1) as avg_investigation_days
      FROM crime_records
      ${sql}
    `;

    const row = db.prepare(kpiQuery).get(...args) as any;

    return res.json({
      total_crimes: row?.total_crimes || 0,
      solved_cases: row?.solved_cases || 0,
      unsolved_cases: row?.unsolved_cases || 0,
      arrests_made: row?.arrests_made || 0,
      high_severity_crimes: row?.high_severity_crimes || 0,
      avg_investigation_days: row?.avg_investigation_days !== null ? Number(row?.avg_investigation_days) : 0,
      solve_rate_percentage: row?.total_crimes > 0 ? Math.round(((row.solved_cases || 0) / row.total_crimes) * 100) : 0,
      arrest_rate_percentage: row?.total_crimes > 0 ? Math.round(((row.arrests_made || 0) / row.total_crimes) * 100) : 0
    });
  } catch (error) {
    console.error('getKPIs error:', error);
    return res.status(500).json({ error: 'Failed to calculate KPIs.' });
  }
}

export function getCharts(req: Request, res: Response) {
  try {
    const filters = req.query as FilterParams;
    const { sql, args } = buildFilterClause(filters);

    // 1. State-wise Crimes
    const stateData = db.prepare(`
      SELECT state as name, COUNT(*) as count
      FROM crime_records
      ${sql}
      GROUP BY state
      ORDER BY count DESC
      LIMIT 15
    `).all(...args);

    // 2. District-wise Crimes
    const districtData = db.prepare(`
      SELECT district as name, state, COUNT(*) as count
      FROM crime_records
      ${sql} ${sql ? 'AND' : 'WHERE'} district IS NOT NULL AND district != ''
      GROUP BY district, state
      ORDER BY count DESC
      LIMIT 15
    `).all(...args);

    // 3. City-wise Crimes
    const cityData = db.prepare(`
      SELECT city as name, state, COUNT(*) as count
      FROM crime_records
      ${sql}
      GROUP BY city, state
      ORDER BY count DESC
      LIMIT 15
    `).all(...args);

    // 4. Year-wise Trend
    const yearData = db.prepare(`
      SELECT year as name, COUNT(*) as count,
        SUM(CASE WHEN LOWER(arrest_made) IN ('yes', 'y', 'true', '1') THEN 1 ELSE 0 END) as arrests,
        SUM(CASE WHEN LOWER(case_status) IN ('closed', 'solved', 'charge sheet filed', 'convicted') THEN 1 ELSE 0 END) as solved
      FROM crime_records
      ${sql}
      GROUP BY year
      ORDER BY year ASC
    `).all(...args);

    // 5. Month-wise Trend
    const monthData = db.prepare(`
      SELECT month, COUNT(*) as count
      FROM crime_records
      ${sql}
      GROUP BY month
      ORDER BY month ASC
    `).all(...args);

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthData = monthData.map((m: any) => ({
      name: monthNames[m.month] || `Month ${m.month}`,
      month: m.month,
      count: m.count
    }));

    // 6. Crime Type Distribution
    const crimeTypeData = db.prepare(`
      SELECT crime_type as name, COUNT(*) as count
      FROM crime_records
      ${sql}
      GROUP BY crime_type
      ORDER BY count DESC
    `).all(...args);

    // 7. Crime Severity Breakdown
    const severityData = db.prepare(`
      SELECT crime_severity as name, COUNT(*) as count
      FROM crime_records
      ${sql}
      GROUP BY crime_severity
      ORDER BY count DESC
    `).all(...args);

    // 8. Case Status
    const caseStatusData = db.prepare(`
      SELECT case_status as name, COUNT(*) as count
      FROM crime_records
      ${sql}
      GROUP BY case_status
      ORDER BY count DESC
    `).all(...args);

    // 9. Arrest Analysis
    const arrestData = db.prepare(`
      SELECT arrest_made as name, COUNT(*) as count
      FROM crime_records
      ${sql}
      GROUP BY arrest_made
      ORDER BY count DESC
    `).all(...args);

    // 10. Victim Gender
    const genderData = db.prepare(`
      SELECT CASE WHEN victim_gender IS NULL OR victim_gender = '' THEN 'Not Specified' ELSE victim_gender END as name, COUNT(*) as count
      FROM crime_records
      ${sql}
      GROUP BY name
      ORDER BY count DESC
    `).all(...args);

    // 11. Incident Day of Week
    const dayData = db.prepare(`
      SELECT incident_day as name, COUNT(*) as count
      FROM crime_records
      ${sql} ${sql ? 'AND' : 'WHERE'} incident_day IS NOT NULL AND incident_day != ''
      GROUP BY incident_day
      ORDER BY
        CASE incident_day
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
          ELSE 8
        END
    `).all(...args);

    // 12. Weapon Used
    const weaponData = db.prepare(`
      SELECT CASE WHEN weapon_used IS NULL OR weapon_used = '' OR LOWER(weapon_used) = 'none' OR LOWER(weapon_used) = 'nan' THEN 'None / Unspecified' ELSE weapon_used END as name, COUNT(*) as count
      FROM crime_records
      ${sql}
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10
    `).all(...args);

    // 13. Top Police Stations
    const policeStationData = db.prepare(`
      SELECT police_station as name, city, COUNT(*) as count
      FROM crime_records
      ${sql} ${sql ? 'AND' : 'WHERE'} police_station IS NOT NULL AND police_station != ''
      GROUP BY police_station, city
      ORDER BY count DESC
      LIMIT 10
    `).all(...args);

    return res.json({
      stateData,
      districtData,
      cityData,
      yearData,
      monthData: formattedMonthData,
      crimeTypeData,
      severityData,
      caseStatusData,
      arrestData,
      genderData,
      dayData,
      weaponData,
      policeStationData
    });
  } catch (error) {
    console.error('getCharts error:', error);
    return res.status(500).json({ error: 'Failed to fetch chart data.' });
  }
}

export function getLocationHierarchy(req: Request, res: Response) {
  try {
    const datasetId = (req.query.datasetId as string) || 'ds_india_all';
    const state = req.query.state as string;
    const district = req.query.district as string;

    // 1. States Selection
    const dbStates = db.prepare(`
      SELECT DISTINCT state
      FROM crime_records
      WHERE dataset_id = ? AND state IS NOT NULL AND state != ''
      ORDER BY state ASC
    `).all(datasetId).map((r: any) => r.state as string);

    let states: string[] = [];
    if (datasetId === 'ds_tamil_nadu') {
      states = ['Tamil Nadu'];
    } else {
      const allStatesSet = new Set<string>([...Object.keys(INDIA_LOCATION_MASTER), ...dbStates]);
      states = Array.from(allStatesSet).sort();
    }

    // 2. Districts Selection
    const dbDistricts = db.prepare(`
      SELECT DISTINCT district, state
      FROM crime_records
      WHERE dataset_id = ? AND district IS NOT NULL AND district != ''
      ORDER BY district ASC
    `).all(datasetId) as { district: string; state: string }[];

    let districts: string[] = [];
    if (state && state !== 'All') {
      const masterDistricts = INDIA_LOCATION_MASTER[state] ? Object.keys(INDIA_LOCATION_MASTER[state]) : [];
      const dbMatched = dbDistricts.filter(d => d.state === state).map(d => d.district);
      districts = Array.from(new Set([...masterDistricts, ...dbMatched])).sort();
    } else if (datasetId === 'ds_tamil_nadu') {
      const tnDistricts = Object.keys(INDIA_LOCATION_MASTER['Tamil Nadu'] || {});
      const dbMatched = dbDistricts.map(d => d.district);
      districts = Array.from(new Set([...tnDistricts, ...dbMatched])).sort();
    } else {
      const allMasterDistricts: string[] = [];
      Object.values(INDIA_LOCATION_MASTER).forEach(stateObj => {
        allMasterDistricts.push(...Object.keys(stateObj));
      });
      const dbMatched = dbDistricts.map(d => d.district);
      districts = Array.from(new Set([...allMasterDistricts, ...dbMatched])).sort();
    }

    // 3. Cities Selection
    const dbCities = db.prepare(`
      SELECT DISTINCT city, district, state
      FROM crime_records
      WHERE dataset_id = ? AND city IS NOT NULL AND city != ''
      ORDER BY city ASC
    `).all(datasetId) as { city: string; district: string; state: string }[];

    let cities: string[] = [];
    if (district && district !== 'All') {
      const masterCities: string[] = [];
      if (state && state !== 'All' && INDIA_LOCATION_MASTER[state]?.[district]) {
        masterCities.push(...INDIA_LOCATION_MASTER[state][district]);
      } else {
        Object.values(INDIA_LOCATION_MASTER).forEach(stateObj => {
          if (stateObj[district]) {
            masterCities.push(...stateObj[district]);
          }
        });
      }
      const dbMatched = dbCities.filter(c => c.district === district).map(c => c.city);
      cities = Array.from(new Set([...masterCities, ...dbMatched])).sort();
    } else if (state && state !== 'All') {
      const masterCities: string[] = [];
      if (INDIA_LOCATION_MASTER[state]) {
        Object.values(INDIA_LOCATION_MASTER[state]).forEach(cityList => masterCities.push(...cityList));
      }
      const dbMatched = dbCities.filter(c => c.state === state).map(c => c.city);
      cities = Array.from(new Set([...masterCities, ...dbMatched])).sort();
    } else if (datasetId === 'ds_tamil_nadu') {
      const tnCities: string[] = [];
      Object.values(INDIA_LOCATION_MASTER['Tamil Nadu'] || {}).forEach(cityList => tnCities.push(...cityList));
      const dbMatched = dbCities.map(c => c.city);
      cities = Array.from(new Set([...tnCities, ...dbMatched])).sort();
    } else {
      const allMasterCities: string[] = [];
      Object.values(INDIA_LOCATION_MASTER).forEach(stateObj => {
        Object.values(stateObj).forEach(cityList => allMasterCities.push(...cityList));
      });
      const dbMatched = dbCities.map(c => c.city);
      cities = Array.from(new Set([...allMasterCities, ...dbMatched])).sort();
    }

    const crimeTypes = db.prepare(`
      SELECT DISTINCT crime_type
      FROM crime_records
      WHERE dataset_id = ? AND crime_type IS NOT NULL AND crime_type != ''
      ORDER BY crime_type ASC
    `).all(datasetId).map((r: any) => r.crime_type);

    return res.json({
      states,
      districts,
      cities,
      crimeTypes
    });
  } catch (error) {
    console.error('getLocationHierarchy error:', error);
    return res.status(500).json({ error: 'Failed to fetch location hierarchy.' });
  }
}

export function getAvailableYears(req: Request, res: Response) {
  try {
    const datasetId = (req.query.datasetId as string) || 'ds_india_all';
    const years = db.prepare(`
      SELECT DISTINCT year
      FROM crime_records
      WHERE dataset_id = ? AND year IS NOT NULL
      ORDER BY year ASC
    `).all(datasetId).map((r: any) => r.year);

    return res.json({ years });
  } catch (error) {
    console.error('getAvailableYears error:', error);
    return res.status(500).json({ error: 'Failed to fetch available years.' });
  }
}
