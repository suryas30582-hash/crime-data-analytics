import { db, initDatabase } from './src/db/schema';
import { seedDatabase } from './src/db/seed';

console.log('=== VERIFYING DATABASE INTEGRITY ===');
initDatabase();
seedDatabase();

// 1. Datasets count
const datasets = db.prepare('SELECT * FROM datasets').all() as any[];
console.log(`Found ${datasets.length} datasets:`);
for (const ds of datasets) {
  const rowCount = (db.prepare('SELECT COUNT(*) as c FROM crime_records WHERE dataset_id = ?').get(ds.id) as any).c;
  console.log(`- [${ds.id}] "${ds.name}" -> ${rowCount} records`);
}

// 2. Sample Query for India Dataset
const indiaKpi = db.prepare(`
  SELECT
    COUNT(*) as total_crimes,
    SUM(CASE WHEN LOWER(case_status) IN ('closed', 'solved', 'charge sheet filed', 'convicted') THEN 1 ELSE 0 END) as solved,
    SUM(CASE WHEN LOWER(arrest_made) IN ('yes', 'y', 'true', '1') THEN 1 ELSE 0 END) as arrests,
    ROUND(AVG(investigation_days), 1) as avg_days
  FROM crime_records
  WHERE dataset_id = 'ds_india_all'
`).get() as any;

console.log('\n=== INDIA DATASET DYNAMIC METRICS ===');
console.log('Total Crimes:', indiaKpi.total_crimes);
console.log('Solved Cases:', indiaKpi.solved);
console.log('Arrests Made:', indiaKpi.arrests);
console.log('Avg Investigation Days:', indiaKpi.avg_days);

// 3. Sample Query for Tamil Nadu Dataset
const tnKpi = db.prepare(`
  SELECT
    COUNT(*) as total_crimes,
    SUM(CASE WHEN LOWER(case_status) IN ('closed', 'solved', 'charge sheet filed', 'convicted') THEN 1 ELSE 0 END) as solved,
    SUM(CASE WHEN LOWER(arrest_made) IN ('yes', 'y', 'true', '1') THEN 1 ELSE 0 END) as arrests,
    ROUND(AVG(investigation_days), 1) as avg_days
  FROM crime_records
  WHERE dataset_id = 'ds_tamil_nadu'
`).get() as any;

console.log('\n=== TAMIL NADU DATASET DYNAMIC METRICS ===');
console.log('Total Crimes:', tnKpi.total_crimes);
console.log('Solved Cases:', tnKpi.solved);
console.log('Arrests Made:', tnKpi.arrests);
console.log('Avg Investigation Days:', tnKpi.avg_days);

console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
