import { Request, Response } from 'express';
import { db } from '../db/schema';
import { FilterParams } from '../types';

export function getPredictions(req: Request, res: Response) {
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

    const whereSql = `WHERE ${clauses.join(' AND ')}`;

    // Total records check
    const totalCount = (db.prepare(`SELECT COUNT(*) as count FROM crime_records ${whereSql}`).get(...args) as { count: number }).count;

    if (totalCount < 5) {
      return res.json({
        hasSufficientData: false,
        message: 'Insufficient historical data for reliable prediction.',
        totalRecords: totalCount
      });
    }

    // 1. Yearly & Monthly Historical Trend for Time-Series Regression
    const timelineData = db.prepare(`
      SELECT year, month, COUNT(*) as crime_count
      FROM crime_records
      ${whereSql}
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `).all(...args) as { year: number; month: number; crime_count: number }[];

    // Calculate simple linear regression trend if we have multiple periods
    let growthRate = 0;
    let projectedNextPeriod = Math.round(totalCount / Math.max(1, timelineData.length));

    if (timelineData.length >= 2) {
      const n = timelineData.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;

      timelineData.forEach((point, i) => {
        const x = i + 1;
        const y = point.crime_count;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });

      const slope = (n * sumXY - sumX * sumY) / Math.max(1, n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const nextX = n + 1;
      projectedNextPeriod = Math.max(1, Math.round(slope * nextX + intercept));

      const firstY = timelineData[0].crime_count;
      const lastY = timelineData[timelineData.length - 1].crime_count;
      growthRate = firstY > 0 ? Math.round(((lastY - firstY) / firstY) * 100) : 0;
    }

    // 2. High Risk Crime Types (Dominant Patterns)
    const topCrimeTypes = db.prepare(`
      SELECT crime_type, COUNT(*) as count,
             ROUND((COUNT(*) * 100.0 / ${totalCount}), 1) as percentage,
             SUM(CASE WHEN LOWER(crime_severity) = 'high' THEN 1 ELSE 0 END) as high_severity_count
      FROM crime_records
      ${whereSql}
      GROUP BY crime_type
      ORDER BY count DESC
      LIMIT 5
    `).all(...args);

    // 3. High Risk Incident Hotspots / Locations
    const topLocations = db.prepare(`
      SELECT location, city, state, COUNT(*) as incident_count,
             ROUND((COUNT(*) * 100.0 / ${totalCount}), 1) as incident_share
      FROM crime_records
      ${whereSql} ${whereSql ? 'AND' : 'WHERE'} location IS NOT NULL AND location != ''
      GROUP BY location, city, state
      ORDER BY incident_count DESC
      LIMIT 6
    `).all(...args);

    // 4. Temporal Pattern: High Risk Days of Week
    const peakDays = db.prepare(`
      SELECT incident_day as day, COUNT(*) as count,
             ROUND((COUNT(*) * 100.0 / ${totalCount}), 1) as percentage
      FROM crime_records
      ${whereSql} ${whereSql ? 'AND' : 'WHERE'} incident_day IS NOT NULL AND incident_day != ''
      GROUP BY incident_day
      ORDER BY count DESC
    `).all(...args);

    // 5. Time Slot Analysis (Morning, Afternoon, Evening, Night)
    const timeSlots = db.prepare(`
      SELECT
        CASE
          WHEN CAST(SUBSTR(time, 1, 2) AS INTEGER) BETWEEN 5 AND 11 THEN 'Morning (05:00 - 11:59)'
          WHEN CAST(SUBSTR(time, 1, 2) AS INTEGER) BETWEEN 12 AND 16 THEN 'Afternoon (12:00 - 16:59)'
          WHEN CAST(SUBSTR(time, 1, 2) AS INTEGER) BETWEEN 17 AND 21 THEN 'Evening (17:00 - 21:59)'
          ELSE 'Night / Early Hours (22:00 - 04:59)'
        END as slot,
        COUNT(*) as count
      FROM crime_records
      ${whereSql} ${whereSql ? 'AND' : 'WHERE'} time IS NOT NULL AND time != ''
      GROUP BY slot
      ORDER BY count DESC
    `).all(...args);

    // 6. Clearance & Arrest Efficiency Forecast
    const resolutionMetrics = db.prepare(`
      SELECT
        SUM(CASE WHEN LOWER(case_status) IN ('closed', 'solved', 'charge sheet filed', 'convicted') THEN 1 ELSE 0 END) as solved_count,
        SUM(CASE WHEN LOWER(arrest_made) IN ('yes', 'y', 'true', '1') THEN 1 ELSE 0 END) as arrest_count,
        ROUND(AVG(investigation_days), 1) as avg_days
      FROM crime_records
      ${whereSql}
    `).get(...args) as any;

    const solveProbability = totalCount > 0 ? Math.round((resolutionMetrics.solved_count / totalCount) * 100) : 0;
    const arrestProbability = totalCount > 0 ? Math.round((resolutionMetrics.arrest_count / totalCount) * 100) : 0;

    return res.json({
      hasSufficientData: true,
      totalRecordsAnalyzed: totalCount,
      growthRate,
      projectedNextPeriodCrimes: projectedNextPeriod,
      historicalTimeline: timelineData,
      topCrimeTypes,
      topLocations,
      peakDays,
      timeSlots,
      solveProbability,
      arrestProbability,
      avgInvestigationDurationDays: resolutionMetrics.avg_days || 0
    });
  } catch (error) {
    console.error('getPredictions error:', error);
    return res.status(500).json({ error: 'Failed to generate predictions from historical data.' });
  }
}
