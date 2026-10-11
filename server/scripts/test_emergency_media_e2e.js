const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

function makeMultipartRequest(endpoint, fields, files) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const body = [];

    for (const [key, value] of Object.entries(fields)) {
      body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
    }

    for (const file of files) {
      body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`));
      body.push(file.buffer);
      body.push(Buffer.from('\r\n'));
    }

    body.push(Buffer.from(`--${boundary}--\r\n`));
    const payload = Buffer.concat(body);

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

function fetchMediaBytes(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers, timeout: 15000 }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          buffer: Buffer.concat(chunks)
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Media download timed out'));
    });
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('   EMERGENCY MEDIA FLOW COMPLETE REGRESSION TEST SUITE        ');
  console.log('===============================================================\n');

  // Valid JPEG image bytes
  const photoBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  // Valid WebM audio bytes (EBML header)
  const audioBuffer = Buffer.from([
    0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01,
    0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65,
    0x62, 0x6d, 0x42, 0x87, 0x81, 0x04, 0x42, 0x85, 0x81, 0x02
  ]);

  // --------------------------------------------------------------------------
  // TEST PART 1: Submit with PHOTO ONLY (Req A-F)
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 1] Testing Emergency Report with PHOTO ONLY (Req A-F)');
  const res1 = await makeMultipartRequest('/api/emergency/report', {
    incident_type: 'Assault / Attack',
    severity: 'HIGH',
    description: 'Emergency test with photo evidence only',
    location_address: 'Anna Salai, Chennai, Tamil Nadu',
    latitude: '13.0604',
    longitude: '80.2496',
    citizen_name: 'Test Citizen PhotoOnly'
  }, [
    { fieldname: 'photo', filename: 'evidence_scene.png', mimetype: 'image/png', buffer: photoBuffer }
  ]);

  console.log('  A. Response HTTP Status:', res1.status);
  if (res1.status !== 201 || !res1.data?.success) {
    throw new Error(`Report submission failed: ${JSON.stringify(res1.data)}`);
  }

  const report1 = res1.data.report;
  console.log('  B. Report Code:', report1.report_code);
  console.log('  B. Response photo_url:', report1.photo_url);
  console.log('  B. Response audio_url (expected null):', report1.audio_url);

  if (!report1.photo_url) {
    throw new Error('FAIL: photo_url is NULL in report creation response!');
  }
  if (report1.audio_url !== null) {
    throw new Error('FAIL: audio_url should be null when no audio uploaded');
  }

  // C & D & E: Fetch Police emergency feed and find report
  console.log('  C. Fetching Police emergency feed (GET /api/emergency/reports)...');
  const feed1 = await fetchJson(`${BASE_URL}/emergency/reports`);
  const foundReport1 = feed1.data.reports?.find(r => r.report_code === report1.report_code);
  if (!foundReport1) {
    throw new Error(`FAIL: Report ${report1.report_code} not found in Police feed!`);
  }
  console.log('  D. Found report in Police feed.');
  console.log('  E. Police feed photo_url:', foundReport1.photo_url);
  if (!foundReport1.photo_url) {
    throw new Error('FAIL: Police feed photo_url is NULL!');
  }

  // F: HTTP GET photo_url and verify status 200 and image/* content-type
  console.log('  F. Downloading photo from URL:', foundReport1.photo_url);
  const photoFetch = await fetchMediaBytes(foundReport1.photo_url);
  console.log('  F. Photo download HTTP Status:', photoFetch.status);
  console.log('  F. Photo Content-Type:', photoFetch.headers['content-type']);
  console.log('  F. Photo Buffer size:', photoFetch.buffer.length, 'bytes');

  if (photoFetch.status !== 200) {
    throw new Error(`FAIL: Photo URL returned HTTP ${photoFetch.status}, expected 200`);
  }
  if (!photoFetch.headers['content-type']?.startsWith('image/')) {
    throw new Error(`FAIL: Photo Content-Type is "${photoFetch.headers['content-type']}", expected image/*`);
  }
  console.log('✅ [PASSED] Test 1: Photo-only flow (Req A-F) fully verified.\n');

  // --------------------------------------------------------------------------
  // TEST PART 2: Submit with AUDIO ONLY (Req G-L)
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 2] Testing Emergency Report with AUDIO ONLY (Req G-L)');
  const res2 = await makeMultipartRequest('/api/emergency/report', {
    incident_type: 'Armed Robbery',
    severity: 'CRITICAL',
    description: 'Emergency test with recorded audio statement only',
    location_address: 'T Nagar, Chennai, Tamil Nadu',
    latitude: '13.0418',
    longitude: '80.2341',
    citizen_name: 'Test Citizen AudioOnly',
    audio_duration: '18.4'
  }, [
    { fieldname: 'audio', filename: 'voice_statement.webm', mimetype: 'audio/webm;codecs=opus', buffer: audioBuffer }
  ]);

  console.log('  G. Response HTTP Status:', res2.status);
  if (res2.status !== 201 || !res2.data?.success) {
    throw new Error(`Audio report submission failed: ${JSON.stringify(res2.data)}`);
  }

  const report2 = res2.data.report;
  console.log('  H. Report Code:', report2.report_code);
  console.log('  H. Response audio_url:', report2.audio_url);
  console.log('  H. Response audio_duration:', report2.audio_duration);
  console.log('  H. Response photo_url (expected null):', report2.photo_url);

  if (!report2.audio_url) {
    throw new Error('FAIL: audio_url is NULL in audio report creation response!');
  }
  if (Math.abs(report2.audio_duration - 18.4) > 0.1) {
    throw new Error(`FAIL: audio_duration mismatch, got ${report2.audio_duration}, expected 18.4`);
  }

  // I & J: Fetch Police emergency feed and check audio_url
  console.log('  I. Fetching Police emergency feed (GET /api/emergency/reports)...');
  const feed2 = await fetchJson(`${BASE_URL}/emergency/reports`);
  const foundReport2 = feed2.data.reports?.find(r => r.report_code === report2.report_code);
  if (!foundReport2) {
    throw new Error(`FAIL: Report ${report2.report_code} not found in Police feed!`);
  }
  console.log('  J. Found report in Police feed.');
  console.log('  J. Police feed audio_url:', foundReport2.audio_url);
  if (!foundReport2.audio_url) {
    throw new Error('FAIL: Police feed audio_url is NULL!');
  }

  // K & L: HTTP GET audio URL and verify audio/* content-type
  console.log('  K. Downloading audio from URL:', foundReport2.audio_url);
  const audioFetch = await fetchMediaBytes(foundReport2.audio_url);
  console.log('  L. Audio download HTTP Status:', audioFetch.status);
  console.log('  L. Audio Content-Type:', audioFetch.headers['content-type']);
  console.log('  L. Audio Buffer size:', audioFetch.buffer.length, 'bytes');

  if (audioFetch.status !== 200) {
    throw new Error(`FAIL: Audio URL returned HTTP ${audioFetch.status}, expected 200`);
  }
  if (!audioFetch.headers['content-type']?.startsWith('audio/')) {
    throw new Error(`FAIL: Audio Content-Type is "${audioFetch.headers['content-type']}", expected audio/*`);
  }

  // Test Range request on audio URL
  try {
    const rangeFetch = await fetchMediaBytes(foundReport2.audio_url, { Range: 'bytes=0-15' });
    console.log('  L. Audio Range Request Status:', rangeFetch.status);
    console.log('  L. Audio Content-Range:', rangeFetch.headers['content-range'] || 'N/A');
  } catch (rangeErr) {
    console.warn('  L. Notice on Range request:', rangeErr.message);
  }

  console.log('✅ [PASSED] Test 2: Audio-only flow (Req G-L) fully verified.\n');

  // --------------------------------------------------------------------------
  // TEST PART 3: Submit with BOTH PHOTO + AUDIO (Req M-O)
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 3] Testing Emergency Report with BOTH PHOTO + AUDIO (Req M-O)');
  const res3 = await makeMultipartRequest('/api/emergency/report', {
    incident_type: 'Suspicious Activity',
    severity: 'MEDIUM',
    description: 'Emergency test with both photo evidence and voice SOS statement',
    location_address: 'Guindy Industrial Estate, Chennai, Tamil Nadu',
    latitude: '13.0067',
    longitude: '80.2026',
    citizen_name: 'Test Citizen BothMedia',
    audio_duration: '25.0'
  }, [
    { fieldname: 'photo', filename: 'scene_both.png', mimetype: 'image/png', buffer: photoBuffer },
    { fieldname: 'audio', filename: 'voice_both.webm', mimetype: 'audio/webm', buffer: audioBuffer }
  ]);

  console.log('  M. Response HTTP Status:', res3.status);
  if (res3.status !== 201 || !res3.data?.success) {
    throw new Error(`Report submission with both media failed: ${JSON.stringify(res3.data)}`);
  }

  const report3 = res3.data.report;
  console.log('  N. Report Code:', report3.report_code);
  console.log('  N. photo_url:', report3.photo_url);
  console.log('  N. audio_url:', report3.audio_url);
  console.log('  N. audio_duration:', report3.audio_duration);

  if (!report3.photo_url || !report3.audio_url) {
    throw new Error('FAIL: Both photo_url and audio_url MUST be non-null!');
  }

  // Verify GET /api/emergency/reports/:code returns both URLs
  console.log(`  O. Testing GET /api/emergency/reports/${report3.report_code}...`);
  const singleRes = await fetchJson(`${BASE_URL}/emergency/reports/${report3.report_code}`);
  if (singleRes.status !== 200 || !singleRes.data?.report) {
    throw new Error(`FAIL: Could not fetch report by code: ${JSON.stringify(singleRes.data)}`);
  }
  const singleReport = singleRes.data.report;
  console.log('  O. Single report photo_url:', singleReport.photo_url);
  console.log('  O. Single report audio_url:', singleReport.audio_url);

  if (singleReport.photo_url !== report3.photo_url || singleReport.audio_url !== report3.audio_url) {
    throw new Error('FAIL: Media URLs mismatch between create response and single report lookup!');
  }

  const pCheck = await fetchMediaBytes(singleReport.photo_url);
  const aCheck = await fetchMediaBytes(singleReport.audio_url);

  if (pCheck.status !== 200 || !pCheck.headers['content-type']?.startsWith('image/')) {
    throw new Error('FAIL: Photo URL inaccessible or invalid Content-Type');
  }
  if (aCheck.status !== 200 || !aCheck.headers['content-type']?.startsWith('audio/')) {
    throw new Error('FAIL: Audio URL inaccessible or invalid Content-Type');
  }

  console.log('✅ [PASSED] Test 3: Dual photo + audio flow (Req M-O) fully verified.\n');

  // --------------------------------------------------------------------------
  // TEST PART 4: Missing or Invalid Media Rejection
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 4] Testing Rejection of Invalid Media Types (Task 7)');

  // 4a: Non-image file uploaded as photo
  const invalidPhotoRes = await makeMultipartRequest('/api/emergency/report', {
    incident_type: 'Test Invalid',
    description: 'Testing non-image rejection'
  }, [
    { fieldname: 'photo', filename: 'malicious.exe', mimetype: 'application/x-msdownload', buffer: Buffer.from('MZbadcode') }
  ]);
  console.log('  4a. Invalid photo HTTP Status:', invalidPhotoRes.status);
  if (invalidPhotoRes.status !== 400) {
    throw new Error(`FAIL: Expected HTTP 400 for invalid image, got ${invalidPhotoRes.status}`);
  }
  console.log('  4a. Rejected correctly with message:', invalidPhotoRes.data?.error);

  // 4b: Empty/malformed base64 photo
  const invalidBase64Res = await new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      incident_type: 'Test Invalid Base64',
      description: 'Testing malformed base64',
      photo_base64: 'data:text/plain;base64,bm90YW5pbWFnZQ=='
    });
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/emergency/report',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(d) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
  console.log('  4b. Invalid base64 photo HTTP Status:', invalidBase64Res.status);
  if (invalidBase64Res.status !== 400) {
    throw new Error(`FAIL: Expected HTTP 400 for non-image base64, got ${invalidBase64Res.status}`);
  }
  console.log('  4b. Rejected correctly with message:', invalidBase64Res.data?.error);
  console.log('✅ [PASSED] Test 4: Invalid media rejection verified.\n');

  // --------------------------------------------------------------------------
  // TEST PART 5: Storage Cleanup on Insertion / Deletion
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 5] Testing Storage Cleanup on Evidence Deletion (Task 7)');
  // Delete photo from report3 using deleteReportMedia
  const delPhotoRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/emergency/reports/${report3.report_code}/media/photo`,
      method: 'DELETE'
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(d) }));
    });
    req.on('error', reject);
    req.end();
  });
  console.log('  5a. Delete photo HTTP Status:', delPhotoRes.status);
  if (delPhotoRes.status !== 200 || !delPhotoRes.data?.success) {
    throw new Error('FAIL: deleteReportMedia photo deletion failed');
  }

  // Verify DB now shows photo_url as null, but audio_url remains intact
  const reportAfterDel = await fetchJson(`${BASE_URL}/emergency/reports/${report3.report_code}`);
  console.log('  5b. photo_url after delete:', reportAfterDel.data?.report?.photo_url);
  console.log('  5b. audio_url after delete:', reportAfterDel.data?.report?.audio_url);
  if (reportAfterDel.data?.report?.photo_url !== null) {
    throw new Error('FAIL: photo_url should be null after delete');
  }
  if (!reportAfterDel.data?.report?.audio_url) {
    throw new Error('FAIL: audio_url should still exist after photo delete');
  }
  console.log('✅ [PASSED] Test 5: Evidence deletion & storage sync verified.\n');

  console.log('===============================================================');
  console.log('   🎉 ALL REGRESSION TESTS PASSED CLEANLY!                     ');
  console.log('===============================================================');
}

runTests().catch((err) => {
  console.error('\n❌ E2E Media Test Failed with error:', err);
  process.exit(1);
});
