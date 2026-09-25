const http = require('http');

function post(url, data, token = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(url, token = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log('=== STARTING RBAC DATASET CENTRAL UPLOAD & PROPAGATION TEST ===');

  // 1. Citizen Login
  console.log('\n[1] Logging in as Citizen (Aarav Sharma - citizen.sharma@example.com)...');
  const userLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'citizen.sharma@example.com',
    password: 'password123'
  });
  if (userLogin.status !== 200 || !userLogin.data.token) {
    throw new Error('Citizen login failed: ' + JSON.stringify(userLogin));
  }
  const userToken = userLogin.data.token;
  console.log('✓ Citizen logged in successfully. Role:', userLogin.data.user.role);

  // 2. Citizen uploads a dataset
  console.log('\n[2] Citizen uploading "Citizen Community Crime Watch Q3 2026"...');
  const citizenDatasetName = 'Citizen Community Crime Watch Q3 2026';
  const citizenRecords = [
    {
      crime_id: 'CIT-2026-001',
      date: '2026-08-15',
      time: '21:30',
      year: 2026,
      month: 8,
      crime_type: 'Robbery',
      city: 'Chennai',
      state: 'Tamil Nadu',
      district: 'Central Chennai',
      location: 'T Nagar Commercial Street',
      victim_age: 34,
      victim_gender: 'Male',
      suspect_age: 26,
      suspect_gender: 'Male',
      weapon_used: 'Knife',
      case_status: 'Investigating',
      latitude: 13.0418,
      longitude: 80.2341,
      crime_severity: 'High',
      police_station: 'Mambalam PS',
      arrest_made: 'No',
      incident_day: 'Saturday',
      investigation_days: 12
    },
    {
      crime_id: 'CIT-2026-002',
      date: '2026-08-16',
      time: '14:15',
      year: 2026,
      month: 8,
      crime_type: 'Theft',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      district: 'Coimbatore South',
      location: 'RS Puram Sector 4',
      victim_age: 42,
      victim_gender: 'Female',
      suspect_age: 21,
      suspect_gender: 'Male',
      weapon_used: 'None',
      case_status: 'Closed',
      latitude: 11.0168,
      longitude: 76.9558,
      crime_severity: 'Low',
      police_station: 'RS Puram PS',
      arrest_made: 'Yes',
      incident_day: 'Sunday',
      investigation_days: 5
    }
  ];

  const citizenCommitRes = await post('http://localhost:5000/api/upload/import', {
    datasetName: citizenDatasetName,
    datasetDescription: 'Verified citizen community surveillance records',
    records: citizenRecords
  }, userToken);

  console.log('✓ Citizen commit response status:', citizenCommitRes.status);
  console.log('✓ Response message:', citizenCommitRes.data.message);
  console.log('✓ Dataset ID created:', citizenCommitRes.data.datasetId);

  // 3. Police Officer Login
  console.log('\n[3] Logging in as Police Officer (Inspector Vijay - officer.vijay@police.gov.in)...');
  const policeLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'officer.vijay@police.gov.in',
    password: 'password123'
  });
  if (policeLogin.status !== 200 || !policeLogin.data.token) {
    throw new Error('Police login failed: ' + JSON.stringify(policeLogin));
  }
  const policeToken = policeLogin.data.token;
  console.log('✓ Police logged in successfully. Role:', policeLogin.data.user.role);

  // 4. Police fetches datasets
  console.log('\n[4] Police querying datasets to verify Citizen-uploaded dataset is default & active...');
  const policeDatasetsRes = await get('http://localhost:5000/api/datasets', policeToken);
  const datasets = policeDatasetsRes.data.datasets || policeDatasetsRes.data;
  console.log(`✓ Police retrieved ${datasets.length} datasets.`);
  const activeForPolice = datasets.find(d => d.is_default === 1);
  console.log(`✓ Active central default dataset: "${activeForPolice.name}" (ID: ${activeForPolice.id}, Created by: ${activeForPolice.created_by}, Records: ${activeForPolice.actual_record_count})`);

  if (activeForPolice.id !== citizenCommitRes.data.datasetId) {
    throw new Error('Expected citizen dataset to be default active dataset for police!');
  }
  console.log('✓ Verified: Citizen dataset is immediately active for Police!');

  // 5. Police uploads updated intelligence dataset
  console.log('\n[5] Police officer uploading "Police Command Intelligence Intel 2026"...');
  const policeDatasetName = 'Police Command Intelligence Intel 2026';
  const policeRecords = [
    {
      crime_id: 'POL-2026-881',
      date: '2026-09-01',
      time: '02:45',
      year: 2026,
      month: 9,
      crime_type: 'Cybercrime',
      city: 'Bengaluru',
      state: 'Karnataka',
      district: 'Electronic City',
      location: 'Phase 1 Tech Park',
      victim_age: 29,
      victim_gender: 'Male',
      suspect_age: 31,
      suspect_gender: 'Male',
      weapon_used: 'Digital Trojan',
      case_status: 'Investigating',
      latitude: 12.8452,
      longitude: 77.6602,
      crime_severity: 'Medium',
      police_station: 'Cyber Crime PS',
      arrest_made: 'No',
      incident_day: 'Tuesday',
      investigation_days: 8
    }
  ];

  const policeCommitRes = await post('http://localhost:5000/api/upload/import', {
    datasetName: policeDatasetName,
    datasetDescription: 'Classified verified law enforcement records',
    records: policeRecords
  }, policeToken);

  console.log('✓ Police commit response status:', policeCommitRes.status);
  console.log('✓ Dataset ID created by Police:', policeCommitRes.data.datasetId);

  // 6. Citizen and Admin query datasets to verify Police-uploaded dataset is now default
  console.log('\n[6] Citizen querying datasets to verify Police dataset is automatically active...');
  const citizenDatasetsRes = await get('http://localhost:5000/api/datasets', userToken);
  const citizenViewDatasets = citizenDatasetsRes.data.datasets || citizenDatasetsRes.data;
  const activeForCitizen = citizenViewDatasets.find(d => d.is_default === 1);
  console.log(`✓ Active central default dataset for Citizen: "${activeForCitizen.name}" (ID: ${activeForCitizen.id}, Created by: ${activeForCitizen.created_by})`);

  if (activeForCitizen.id !== policeCommitRes.data.datasetId) {
    throw new Error('Expected police dataset to be active for Citizen!');
  }
  console.log('✓ Verified: Police-uploaded dataset is immediately active for Citizen!');

  // 7. Verify crime records analytics for the active dataset
  console.log('\n[7] Querying crime analytics KPIs for the new active dataset...');
  const analyticsRes = await get(`http://localhost:5000/api/analytics/kpis?dataset_id=${activeForCitizen.id}`, userToken);
  console.log('✓ Analytics KPIs for active dataset status:', analyticsRes.status);
  console.log('✓ Total crimes in dataset:', analyticsRes.data.total_crimes);
  console.log('✓ Arrest rate:', analyticsRes.data.arrest_rate);

  console.log('\n=== ALL CENTRAL UPLOAD & SYNCHRONIZATION TESTS PASSED WITH 100% SUCCESS! ===');
}

runTest().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
