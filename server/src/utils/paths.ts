import path from 'path';
import fs from 'fs';

// Resolve server uploads directory reliably across tsx dev, compiled dist, and root cwd
export const uploadsDir = (() => {
  const possiblePaths = [
    path.resolve(__dirname, '../../uploads'), // from server/src/utils or server/dist/utils -> server/uploads
    path.resolve(__dirname, '../uploads'),    // from server/src or server/dist -> server/uploads
    path.resolve(process.cwd(), 'server/uploads'),
    path.resolve(process.cwd(), 'uploads')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback and create if needed
  const fallback = path.resolve(process.cwd(), 'server/uploads');
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
})();

export const emergencyUploadsDir = (() => {
  const dir = path.join(uploadsDir, 'emergency');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
})();
