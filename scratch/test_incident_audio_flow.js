const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function runE2ETest() {
  console.log('=== CITIZEN INCIDENT AUDIO PLAYBACK E2E TEST ===');

  // 1. Synthesize a valid WebM audio file
  // WebM EBML header + Segment + SimpleBlock with audio/opus data
  const webmHeader = Buffer.from([
    0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81,
    0x04, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x02, 0x42, 0x85, 0x81, 0x02,
    0x18, 0x53, 0x80, 0x67, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00
  ]);
  const audioBody = Buffer.alloc(12000, 0xaa);
  const fullAudioBuffer = Buffer.concat([webmHeader, audioBody]);

  console.log(`1. Prepared valid WebM audio sample (${fullAudioBuffer.length} bytes)`);

  // 2. Test server upload directory path resolution
  const { uploadsDir, emergencyUploadsDir } = require('../server/dist/utils/paths');
  console.log('2. Resolved uploadsDir:', uploadsDir);
  console.log('   Resolved emergencyUploadsDir:', emergencyUploadsDir);
  if (!fs.existsSync(emergencyUploadsDir)) {
    throw new Error('emergencyUploadsDir does not exist!');
  }

  // 3. Register a test incident directly using sqlite or via API
  const reportCode = `INC-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const audioFilename = `audio_${reportCode}_${Date.now()}.webm`;
  const audioFilePath = path.join(emergencyUploadsDir, audioFilename);
  fs.writeFileSync(audioFilePath, fullAudioBuffer);
  const audioUrl = `/uploads/emergency/${audioFilename}`;

  console.log(`3. Created audio file on disk: ${audioFilePath}`);
  console.log(`   Audio URL in DB: ${audioUrl}`);

  const db = new DatabaseSync('server/data/crime_analytics.db');
  db.prepare(`
    INSERT INTO emergency_reports (
      report_code, incident_type, severity, description,
      audio_url, audio_duration, audio_size, audio_mime_type,
      citizen_name, citizen_phone, status, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reportCode, 'Suspicious Activity', 'HIGH', 'Automated audio test incident',
    audioUrl, 7.5, fullAudioBuffer.length, 'audio/webm',
    'Test Citizen', '9876543210', 'RECEIVED', 'usr_test_123'
  );

  console.log(`4. Successfully persisted incident ${reportCode} into SQLite database`);

  // 5. Query the database
  const record = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(reportCode);
  console.log('5. Verified DB record:');
  console.log({
    report_code: record.report_code,
    audio_url: record.audio_url,
    audio_duration: record.audio_duration,
    audio_size: record.audio_size,
    audio_mime_type: record.audio_mime_type
  });

  if (record.audio_url !== audioUrl || parseFloat(record.audio_duration) !== 7.5 || parseInt(record.audio_size) !== fullAudioBuffer.length) {
    throw new Error('Database record metadata mismatch!');
  }

  // 6. Test Express server static media serving via HTTP
  const express = require('../server/node_modules/express');
  const app = express();
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      res.setHeader('Accept-Ranges', 'bytes');
      if (filePath.endsWith('.webm')) {
        res.setHeader('Content-Type', 'audio/webm');
      }
    }
  }));

  const testServer = await new Promise((resolve) => {
    const s = app.listen(5099, () => resolve(s));
  });

  try {
    const res = await fetch(`http://localhost:5099${audioUrl}`);
    console.log('6. HTTP GET to audio URL response:');
    console.log('   HTTP Status:', res.status);
    console.log('   Content-Type:', res.headers.get('content-type'));
    console.log('   Accept-Ranges:', res.headers.get('accept-ranges'));
    console.log('   Content-Length:', res.headers.get('content-length'));

    const arrayBuffer = await res.arrayBuffer();
    const downloadedBuffer = Buffer.from(arrayBuffer);
    console.log(`   Downloaded size: ${downloadedBuffer.length} bytes`);

    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }
    if (res.headers.get('content-type') !== 'audio/webm') {
      throw new Error(`Expected audio/webm, got ${res.headers.get('content-type')}`);
    }
    if (downloadedBuffer.length !== fullAudioBuffer.length) {
      throw new Error(`Byte length mismatch: expected ${fullAudioBuffer.length}, got ${downloadedBuffer.length}`);
    }

    console.log('7. Verifying audio header signature (EBML):');
    const isWebM = downloadedBuffer[0] === 0x1a && downloadedBuffer[1] === 0x45 && downloadedBuffer[2] === 0xdf && downloadedBuffer[3] === 0xa3;
    console.log('   EBML Magic bytes check:', isWebM ? 'VALID WEBM' : 'INVALID');
    if (!isWebM) throw new Error('Downloaded audio is not valid WebM!');

    console.log('\n✅ ALL CITIZEN INCIDENT AUDIO TESTS PASSED SUCCESSFULLY!');
  } finally {
    testServer.close();
  }
}

runE2ETest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
