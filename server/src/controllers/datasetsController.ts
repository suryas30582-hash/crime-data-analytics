import { Request, Response } from 'express';
import { db } from '../db/schema';
import { AuthRequest } from '../middleware/auth';

export function getDatasets(req: Request, res: Response) {
  try {
    const datasets = db.prepare(`
      SELECT d.id, d.name, d.description, d.created_by, d.created_at, d.is_default,
             COUNT(r.id) as actual_record_count,
             MIN(r.year) as min_year,
             MAX(r.year) as max_year,
             COUNT(DISTINCT r.state) as state_count,
             COUNT(DISTINCT r.city) as city_count
      FROM datasets d
      LEFT JOIN crime_records r ON d.id = r.dataset_id
      GROUP BY d.id
      ORDER BY d.is_default DESC, d.created_at ASC
    `).all();

    return res.json({ datasets });
  } catch (error) {
    console.error('getDatasets error:', error);
    return res.status(500).json({ error: 'Failed to fetch datasets.' });
  }
}

export function getDatasetById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(id);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_records,
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        COUNT(DISTINCT state) as total_states,
        COUNT(DISTINCT district) as total_districts,
        COUNT(DISTINCT city) as total_cities,
        COUNT(DISTINCT crime_type) as total_crime_types
      FROM crime_records
      WHERE dataset_id = ?
    `).get(id);

    return res.json({ dataset, stats });
  } catch (error) {
    console.error('getDatasetById error:', error);
    return res.status(500).json({ error: 'Failed to fetch dataset details.' });
  }
}

export function deleteDataset(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(id) as any;
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }

    if (dataset.is_default === 1) {
      return res.status(400).json({ error: 'The primary default dataset cannot be deleted.' });
    }

    // Delete records and dataset
    db.prepare('DELETE FROM crime_records WHERE dataset_id = ?').run(id);
    db.prepare('DELETE FROM datasets WHERE id = ?').run(id);

    return res.json({ message: `Dataset "${dataset.name}" and all associated records were successfully removed.` });
  } catch (error) {
    console.error('deleteDataset error:', error);
    return res.status(500).json({ error: 'Failed to delete dataset.' });
  }
}
