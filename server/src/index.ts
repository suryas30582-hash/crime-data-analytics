import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db/schema';
import { seedDatabase } from './db/seed';
import apiRouter from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

import { validateSupabaseConfig, ensureStorageBuckets } from './db/supabase';

// Initialize DB and Seed preloaded Excel datasets
initDatabase();
seedDatabase();

// Validate Supabase storage credentials & ensure buckets exist
validateSupabaseConfig();
ensureStorageBuckets().catch(err => {
  console.warn('[Startup] Storage bucket setup check notice:', err?.message || err);
});

// Mount API routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve uploaded media with correct MIME headers & byte ranges for browser image/audio playback
const uploadsDir = path.resolve(__dirname, '../../uploads');
const emergencyUploadsDir = path.resolve(__dirname, '../../uploads/emergency');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(emergencyUploadsDir)) {
  fs.mkdirSync(emergencyUploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.webm') {
      res.setHeader('Content-Type', 'audio/webm');
    } else if (ext === '.ogg') {
      res.setHeader('Content-Type', 'audio/ogg');
    } else if (ext === '.mp3') {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (ext === '.wav') {
      res.setHeader('Content-Type', 'audio/wav');
    } else if (ext === '.mp4' || ext === '.m4a') {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (ext === '.aac') {
      res.setHeader('Content-Type', 'audio/aac');
    } else if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.webp') {
      res.setHeader('Content-Type', 'image/webp');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    }
    res.setHeader('Accept-Ranges', 'bytes');
  }
}));

// Serve frontend in production if dist exists
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Crime Data Analytics API Server Running');
    }
  });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Crime Data Analytics Backend Server     `);
  console.log(` Port: http://localhost:${PORT}          `);
  console.log(` Ready for requests                      `);
  console.log(`=========================================`);
});
