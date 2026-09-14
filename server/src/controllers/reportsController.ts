import { Request, Response } from 'express';
import { db } from '../db/schema';
import { FilterParams } from '../types';

export function getRegionReport(req: Request, res: Response) {
  try {
    const filters = req.query as FilterParams;
    const datasetId = filters.datasetId || 'ds_india_all';

    const clauses: string[] = ['dataset_id = ?'];
    const args: any[] = [datasetId];

    if (filters.state && filters.state !== 'All') {
      clauses.push('state = ?');
      args.push(filters.state);
    }
    if (filters.district && filters.district !== 'All') {
      clauses.push('district = ?');
      args.push(filters.district);
    }
    if (filters.city && filters.city !== 'All') {
      clauses.push('city = ?');
      args.push(filters.city);
    }
    if (filters.year && filters.year !== 'All') {
      clauses.push('year = ?');
      args.push(Number(filters.year));
    }

    const whereSql = `WHERE ${clauses.join(' AND ')}`;

    const totalRow = db.prepare(`
      SELECT
        COUNT(*) as total_crimes,
        SUM(CASE WHEN LOWER(case_status) IN ('closed', 'solved', 'charge sheet filed', 'convicted') THEN 1 ELSE 0 END) as solved_cases,
        SUM(CASE WHEN LOWER(case_status) IN ('unsolved', 'open', 'pending', 'under investigation') THEN 1 ELSE 0 END) as unsolved_cases,
        SUM(CASE WHEN LOWER(arrest_made) IN ('yes', 'y', 'true', '1') THEN 1 ELSE 0 END) as arrests_made,
        SUM(CASE WHEN LOWER(crime_severity) = 'high' THEN 1 ELSE 0 END) as high_severity,
        SUM(CASE WHEN LOWER(crime_severity) = 'medium' THEN 1 ELSE 0 END) as medium_severity,
        SUM(CASE WHEN LOWER(crime_severity) = 'low' THEN 1 ELSE 0 END) as low_severity,
        ROUND(AVG(investigation_days), 1) as avg_investigation_days
      FROM crime_records
      ${whereSql}
    `).get(...args) as any;

    if (!totalRow || totalRow.total_crimes === 0) {
      return res.json({
        hasData: false,
        message: 'No data available for this selection.',
        region: {
          state: filters.state || 'All',
          district: filters.district || 'All',
          city: filters.city || 'All',
          year: filters.year || 'All'
        }
      });
    }

    // Crime types breakdown
    const crimeTypes = db.prepare(`
      SELECT crime_type, COUNT(*) as count,
             ROUND((COUNT(*) * 100.0 / ${totalRow.total_crimes}), 1) as percentage
      FROM crime_records
      ${whereSql}
      GROUP BY crime_type
      ORDER BY count DESC
    `).all(...args);

    // Case status breakdown
    const caseStatuses = db.prepare(`
      SELECT case_status, COUNT(*) as count,
             ROUND((COUNT(*) * 100.0 / ${totalRow.total_crimes}), 1) as percentage
      FROM crime_records
      ${whereSql}
      GROUP BY case_status
      ORDER BY count DESC
    `).all(...args);

    // Police stations breakdown
    const policeStations = db.prepare(`
      SELECT police_station, COUNT(*) as count,
             SUM(CASE WHEN LOWER(case_status) IN ('closed', 'solved', 'charge sheet filed', 'convicted') THEN 1 ELSE 0 END) as solved,
             SUM(CASE WHEN LOWER(arrest_made) IN ('yes', 'y', 'true', '1') THEN 1 ELSE 0 END) as arrests
      FROM crime_records
      ${whereSql} ${whereSql ? 'AND' : 'WHERE'} police_station IS NOT NULL AND police_station != ''
      GROUP BY police_station
      ORDER BY count DESC
      LIMIT 10
    `).all(...args);

    // Monthly breakdown
    const monthlyTrend = db.prepare(`
      SELECT month, COUNT(*) as count
      FROM crime_records
      ${whereSql}
      GROUP BY month
      ORDER BY month ASC
    `).all(...args);

    return res.json({
      hasData: true,
      region: {
        state: filters.state || 'All States',
        district: filters.district || 'All Districts',
        city: filters.city || 'All Cities',
        year: filters.year || 'All Years'
      },
      summary: {
        totalCrimes: totalRow.total_crimes,
        solvedCases: totalRow.solved_cases,
        unsolvedCases: totalRow.unsolved_cases,
        solveRate: Math.round((totalRow.solved_cases / totalRow.total_crimes) * 100),
        arrestsMade: totalRow.arrests_made,
        arrestRate: Math.round((totalRow.arrests_made / totalRow.total_crimes) * 100),
        highSeverity: totalRow.high_severity,
        mediumSeverity: totalRow.medium_severity,
        lowSeverity: totalRow.low_severity,
        avgInvestigationDays: totalRow.avg_investigation_days || 0
      },
      crimeTypes,
      caseStatuses,
      policeStations,
      monthlyTrend,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('getRegionReport error:', error);
    return res.status(500).json({ error: 'Failed to generate region report.' });
  }
}
