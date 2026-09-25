const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

async function testFullApiIncidentAudio() {
  console.log('=== FULL API CITIZEN INCIDENT AUDIO TEST ===');

  // 1. Create WebM audio blob buffer
  const webmHeader = Buffer.from([
    0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81,
    0x04, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x02, 0x42, 0x85, 0x81, 0x02,
    0x18, 0x53, 0x80, 0x67, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00
  ]);
  const audioBody = Buffer.alloc(24000, 0xbb);
  const fullAudioBuffer = Buffer.concat([webmHeader, audioBody]);

  // 1. Authenticate (login with admin or fallback to register)
  let token = null;
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@crimelytixs.gov.in', password: 'Admin@123' })
  });
  if (loginRes.ok) {
    const loginJson = await loginRes.json();
    token = loginJson.token;
    console.log('1. Auth status:', loginRes.status, 'User:', loginJson.user?.name);
  } else {
    // Register unique test user
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `citizen_${Date.now()}@test.com`,
        password: 'Password@123',
        name: 'Surya Verified Citizen',
        role: 'user'
      })
    });
    const regJson = await regRes.json();
    token = regJson.token;
    console.log('1. Registered test citizen:', regJson.user?.name);
  }
  if (!token) throw new Error('Authentication failed');

  // 2. Submit incident via FormData
  const formData = new FormData();
  formData.append('incident_type', 'Theft & Burglary');
  formData.append('severity', 'HIGH');
  formData.append('description', 'Test citizen voice incident report with audio statement');
  formData.append('citizen_name', 'Aarav Sharma (Citizen)');
  formData.append('citizen_phone', '9840133333');
  formData.append('location_address', 'Anna Nagar, Chennai');
  formData.append('latitude', '13.0850');
  formData.append('longitude', '80.2100');
  formData.append('audio_duration', '12');

  const audioBlob = new Blob([fullAudioBuffer], { type: 'audio/webm' });
  formData.append('audio', audioBlob, 'incident_voice.webm');

  // Submit to API
  const submitRes = await fetch('http://localhost:5000/api/incidents/report', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const submitJson = await submitRes.json();
  console.log('1. Submission response status:', submitRes.status);
  console.log('   Report Code:', submitJson.report_code);
  console.log('   Audio URL:', submitJson.incident?.audio_url);

  if (!submitJson.success || !submitJson.report_code) {
    throw new Error('Incident submission failed!');
  }

  // 3. Verify audio file on disk
  const audioUrl = submitJson.incident.audio_url;
  const filename = path.basename(audioUrl);
  const diskPath = path.resolve('server/uploads/emergency', filename);
  console.log('2. Verifying disk file exists at:', diskPath);
  if (!fs.existsSync(diskPath)) {
    throw new Error(`File not found on disk at ${diskPath}`);
  }
  const diskSize = fs.statSync(diskPath).size;
  console.log(`   Disk file size: ${diskSize} bytes (Uploaded buffer: ${fullAudioBuffer.length} bytes)`);
  if (diskSize !== fullAudioBuffer.length) {
    throw new Error('Disk file size mismatch!');
  }

  // 4. Download media directly via HTTP GET on port 5000
  console.log('3. Fetching audio through Express static route: http://localhost:5000' + audioUrl);
  const mediaRes = await fetch(`http://localhost:5000${audioUrl}`);
  console.log('   Media GET status:', mediaRes.status);
  console.log('   Content-Type:', mediaRes.headers.get('content-type'));
  console.log('   Accept-Ranges:', mediaRes.headers.get('accept-ranges'));
  console.log('   Content-Length:', mediaRes.headers.get('content-length'));

  if (mediaRes.status !== 200) {
    throw new Error(`Expected HTTP 200, got ${mediaRes.status}`);
  }
  if (!mediaRes.headers.get('content-type')?.includes('audio/webm')) {
    throw new Error(`Expected Content-Type audio/webm, got ${mediaRes.headers.get('content-type')}`);
  }

  const downloadedBytes = Buffer.from(await mediaRes.arrayBuffer());
  if (downloadedBytes.length !== fullAudioBuffer.length) {
    throw new Error(`Downloaded buffer length mismatch: ${downloadedBytes.length} vs ${fullAudioBuffer.length}`);
  }

  // 5. Query user reports feed
  const db = new DatabaseSync('server/data/crime_analytics.db');
  const dbRow = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(submitJson.report_code);
  console.log('4. SQLite stored record:', {
    report_code: dbRow.report_code,
    audio_url: dbRow.audio_url,
    audio_duration: dbRow.audio_duration,
    audio_size: dbRow.audio_size,
    audio_mime_type: dbRow.audio_mime_type
  });

  if (parseFloat(dbRow.audio_duration) !== 12 || parseInt(dbRow.audio_size) !== fullAudioBuffer.length) {
    throw new Error('DB metadata mismatch for duration or size');
  }

  console.log('\n🎉 FULL API CITIZEN INCIDENT AUDIO TEST PASSED 100%!');
}

testFullApiIncidentAudio().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
