import { db } from './schema';

export interface PoliceStationSeed {
  id: string;
  station_code: string;
  name: string;
  state: string;
  district: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  patrols: {
    id: string;
    unit_code: string;
    vehicle_type: string;
    officer_in_charge: string;
    contact_number: string;
    status: 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'BUSY' | 'OFFLINE';
  }[];
}

export const INITIAL_POLICE_STATIONS: PoliceStationSeed[] = [
  // --- TAMIL NADU (COIMBATORE) ---
  {
    id: 'PS-TN-CBE-01',
    station_code: 'PS-PEELAMEDU',
    name: 'Peelamedu Police Station',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    city: 'Coimbatore',
    address: 'Avinashi Road, Peelamedu, Coimbatore, TN 641004',
    latitude: 11.0287,
    longitude: 77.0031,
    contact_number: '+91 422 257 2100',
    patrols: [
      { id: 'PAT-PEEL-01', unit_code: 'P-03', vehicle_type: 'PCR Patrol Van', officer_in_charge: 'Insp. R. Suresh', contact_number: '+91 94454 00101', status: 'AVAILABLE' },
      { id: 'PAT-PEEL-02', unit_code: 'P-04', vehicle_type: 'Interceptor SUV', officer_in_charge: 'Sub-Insp. K. Vignesh', contact_number: '+91 94454 00102', status: 'AVAILABLE' },
      { id: 'PAT-PEEL-03', unit_code: 'BIKE-01', vehicle_type: 'Rapid Response Bike', officer_in_charge: 'Officer M. Senthil', contact_number: '+91 94454 00103', status: 'AVAILABLE' }
    ]
  },
  {
    id: 'PS-TN-CBE-02',
    station_code: 'PS-GANDHIPURAM',
    name: 'Gandhipuram Police Station',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    city: 'Coimbatore',
    address: 'Cross Cut Road, Gandhipuram, Coimbatore, TN 641012',
    latitude: 11.0168,
    longitude: 76.9686,
    contact_number: '+91 422 252 3400',
    patrols: [
      { id: 'PAT-GANDH-01', unit_code: 'P-01', vehicle_type: 'PCR Patrol Van', officer_in_charge: 'Insp. T. Murugan', contact_number: '+91 94454 00201', status: 'AVAILABLE' },
      { id: 'PAT-GANDH-02', unit_code: 'P-02', vehicle_type: 'Highway Patrol', officer_in_charge: 'Sub-Insp. A. Praveen', contact_number: '+91 94454 00202', status: 'AVAILABLE' }
    ]
  },
  {
    id: 'PS-TN-CBE-03',
    station_code: 'PS-SINGANALLUR',
    name: 'Singanallur Police Station',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    city: 'Coimbatore',
    address: 'Trichy Road, Singanallur, Coimbatore, TN 641005',
    latitude: 11.0003,
    longitude: 77.0250,
    contact_number: '+91 422 259 1100',
    patrols: [
      { id: 'PAT-SING-01', unit_code: 'P-05', vehicle_type: 'PCR Patrol Van', officer_in_charge: 'Insp. G. Karthik', contact_number: '+91 94454 00301', status: 'AVAILABLE' },
      { id: 'PAT-SING-02', unit_code: 'P-06', vehicle_type: 'Rapid Motorcycle Unit', officer_in_charge: 'Officer D. Ramesh', contact_number: '+91 94454 00302', status: 'AVAILABLE' }
    ]
  },
  {
    id: 'PS-TN-CBE-04',
    station_code: 'PS-RSPURAM',
    name: 'RS Puram Police Station',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    city: 'Coimbatore',
    address: 'DB Road, RS Puram, Coimbatore, TN 641002',
    latitude: 11.0069,
    longitude: 76.9515,
    contact_number: '+91 422 254 8800',
    patrols: [
      { id: 'PAT-RSP-01', unit_code: 'P-07', vehicle_type: 'PCR Patrol Van', officer_in_charge: 'Insp. S. Vijay', contact_number: '+91 94454 00401', status: 'AVAILABLE' }
    ]
  },

  // --- TAMIL NADU (CHENNAI) ---
  {
    id: 'PS-TN-CHN-01',
    station_code: 'PS-THOUSANDLIGHTS',
    name: 'Thousand Lights Police Station',
    state: 'Tamil Nadu',
    district: 'Chennai',
    city: 'Chennai',
    address: 'Greams Road, Thousand Lights, Chennai, TN 600006',
    latitude: 13.0583,
    longitude: 80.2526,
    contact_number: '+91 44 2829 0100',
    patrols: [
      { id: 'PAT-TL-01', unit_code: 'PCR-CHE-01', vehicle_type: 'PCR Command SUV', officer_in_charge: 'Insp. V. Anbarasan', contact_number: '+91 94454 01001', status: 'AVAILABLE' },
      { id: 'PAT-TL-02', unit_code: 'PCR-CHE-02', vehicle_type: 'PCR Patrol Van', officer_in_charge: 'Sub-Insp. E. Jayakumar', contact_number: '+91 94454 01002', status: 'AVAILABLE' }
    ]
  },
  {
    id: 'PS-TN-CHN-02',
    station_code: 'PS-TNAGAR',
    name: 'T. Nagar Police Station',
    state: 'Tamil Nadu',
    district: 'Chennai',
    city: 'Chennai',
    address: 'Venkatanarayana Road, T. Nagar, Chennai, TN 600017',
    latitude: 13.0418,
    longitude: 80.2341,
    contact_number: '+91 44 2434 0200',
    patrols: [
      { id: 'PAT-TNAG-01', unit_code: 'PCR-CHE-03', vehicle_type: 'PCR Patrol Van', officer_in_charge: 'Insp. M. Rajan', contact_number: '+91 94454 01101', status: 'AVAILABLE' }
    ]
  },
  {
    id: 'PS-TN-CHN-03',
    station_code: 'PS-GUINDY',
    name: 'Guindy Police Station',
    state: 'Tamil Nadu',
    district: 'Chennai',
    city: 'Chennai',
    address: 'GST Road, Guindy, Chennai, TN 600032',
    latitude: 13.0067,
    longitude: 80.2106,
    contact_number: '+91 44 2232 0300',
    patrols: [
      { id: 'PAT-GUIN-01', unit_code: 'PCR-CHE-04', vehicle_type: 'Highway Patrol Van', officer_in_charge: 'Insp. P. Saravanan', contact_number: '+91 94454 01201', status: 'AVAILABLE' }
    ]
  },

  // --- KARNATAKA (BENGALURU) ---
  {
    id: 'PS-KA-BLR-01',
    station_code: 'PS-KORAMANGALA',
    name: 'Koramangala Police Station',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    city: 'Bengaluru',
    address: '80 Feet Road, Koramangala 4th Block, Bengaluru, KA 560034',
    latitude: 12.9352,
    longitude: 77.6245,
    contact_number: '+91 80 2294 3456',
    patrols: [
      { id: 'PAT-KORA-01', unit_code: 'HOYSALA-101', vehicle_type: 'Hoysala PCR SUV', officer_in_charge: 'Insp. H. N. Gowda', contact_number: '+91 94808 01001', status: 'AVAILABLE' },
      { id: 'PAT-KORA-02', unit_code: 'HOYSALA-102', vehicle_type: 'Hoysala Patrol Van', officer_in_charge: 'Sub-Insp. B. Chethan', contact_number: '+91 94808 01002', status: 'AVAILABLE' }
    ]
  },
  {
    id: 'PS-KA-BLR-02',
    station_code: 'PS-INDIRANAGAR',
    name: 'Indiranagar Police Station',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    city: 'Bengaluru',
    address: '100 Feet Road, Indiranagar, Bengaluru, KA 560038',
    latitude: 12.9784,
    longitude: 77.6408,
    contact_number: '+91 80 2294 3460',
    patrols: [
      { id: 'PAT-INDI-01', unit_code: 'HOYSALA-103', vehicle_type: 'Hoysala PCR SUV', officer_in_charge: 'Insp. K. S. Reddy', contact_number: '+91 94808 01101', status: 'AVAILABLE' }
    ]
  },

  // --- MAHARASHTRA (MUMBAI & PUNE) ---
  {
    id: 'PS-MH-MUM-01',
    station_code: 'PS-COLABA',
    name: 'Colaba Police Station',
    state: 'Maharashtra',
    district: 'Mumbai City',
    city: 'Mumbai',
    address: 'Shahid Bhagat Singh Road, Colaba, Mumbai, MH 400005',
    latitude: 18.9067,
    longitude: 72.8147,
    contact_number: '+91 22 2285 2885',
    patrols: [
      { id: 'PAT-COL-01', unit_code: 'BEAT-MUM-01', vehicle_type: 'Mumbai Police PCR SUV', officer_in_charge: 'Insp. S. D. Patil', contact_number: '+91 98200 01001', status: 'AVAILABLE' },
      { id: 'PAT-COL-02', unit_code: 'BEAT-MUM-02', vehicle_type: 'PCR Patrol Van', officer_in_charge: 'Sub-Insp. A. R. Shinde', contact_number: '+91 98200 01002', status: 'AVAILABLE' }
    ]
  },
  {
    id: 'PS-MH-PUN-01',
    station_code: 'PS-SHIVAJINAGAR',
    name: 'Shivajinagar Police Station',
    state: 'Maharashtra',
    district: 'Pune',
    city: 'Pune',
    address: 'FC Road, Shivajinagar, Pune, MH 411005',
    latitude: 18.5308,
    longitude: 73.8475,
    contact_number: '+91 20 2553 6233',
    patrols: [
      { id: 'PAT-PUN-01', unit_code: 'BEAT-PUN-01', vehicle_type: 'Pune Police PCR Van', officer_in_charge: 'Insp. V. B. Deshmukh', contact_number: '+91 98220 02001', status: 'AVAILABLE' }
    ]
  },

  // --- TELANGANA (HYDERABAD) ---
  {
    id: 'PS-TS-HYD-01',
    station_code: 'PS-BANJARAHILLS',
    name: 'Banjara Hills Police Station',
    state: 'Telangana',
    district: 'Hyderabad',
    city: 'Hyderabad',
    address: 'Road No. 12, Banjara Hills, Hyderabad, TS 500034',
    latitude: 17.4156,
    longitude: 78.4347,
    contact_number: '+91 40 2785 2435',
    patrols: [
      { id: 'PAT-HYD-01', unit_code: 'BLUECOLT-01', vehicle_type: 'Innova Patrol SUV', officer_in_charge: 'Insp. M. Narsing Rao', contact_number: '+91 94906 12001', status: 'AVAILABLE' },
      { id: 'PAT-HYD-02', unit_code: 'BLUECOLT-02', vehicle_type: 'Rapid Response Bike', officer_in_charge: 'Officer K. Shiva', contact_number: '+91 94906 12002', status: 'AVAILABLE' }
    ]
  },

  // --- DELHI NCR ---
  {
    id: 'PS-DL-ND-01',
    station_code: 'PS-CONNAUGHTPLACE',
    name: 'Connaught Place Police Station',
    state: 'Delhi',
    district: 'Central Delhi',
    city: 'Delhi',
    address: 'Outer Circle, Connaught Place, New Delhi, DL 110001',
    latitude: 28.6328,
    longitude: 77.2197,
    contact_number: '+91 11 2341 2234',
    patrols: [
      { id: 'PAT-DEL-01', unit_code: 'PCR-DEL-101', vehicle_type: 'Delhi Police PCR Van', officer_in_charge: 'Insp. R. S. Sharma', contact_number: '+91 98100 03001', status: 'AVAILABLE' },
      { id: 'PAT-DEL-02', unit_code: 'PCR-DEL-102', vehicle_type: 'PCR Patrol SUV', officer_in_charge: 'Sub-Insp. A. K. Verma', contact_number: '+91 98100 03002', status: 'AVAILABLE' }
    ]
  },

  // --- WEST BENGAL (KOLKATA) ---
  {
    id: 'PS-WB-KOL-01',
    station_code: 'PS-PARKSTREET',
    name: 'Park Street Police Station',
    state: 'West Bengal',
    district: 'Kolkata',
    city: 'Kolkata',
    address: 'Park Street, Kolkata, WB 700016',
    latitude: 22.5532,
    longitude: 88.3524,
    contact_number: '+91 33 2226 5000',
    patrols: [
      { id: 'PAT-KOL-01', unit_code: 'PCR-KOL-01', vehicle_type: 'Kolkata Police PCR SUV', officer_in_charge: 'Insp. P. K. Banerjee', contact_number: '+91 98300 04001', status: 'AVAILABLE' }
    ]
  },

  // --- UTTAR PRADESH (LUCKNOW) ---
  {
    id: 'PS-UP-LKO-01',
    station_code: 'PS-HAZRATGANJ',
    name: 'Hazratganj Police Station',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    city: 'Lucknow',
    address: 'MG Marg, Hazratganj, Lucknow, UP 226001',
    latitude: 26.8500,
    longitude: 80.9500,
    contact_number: '+91 522 220 8500',
    patrols: [
      { id: 'PAT-LKO-01', unit_code: 'UP112-LKO-01', vehicle_type: 'UP 112 Patrol SUV', officer_in_charge: 'Insp. D. N. Singh', contact_number: '+91 94544 05001', status: 'AVAILABLE' }
    ]
  }
];

/**
  Seed initial Police Stations and Patrol Units into DB if empty
 */
export function seedPoliceStationsAndPatrols() {
  try {
    const existing = db.prepare('SELECT COUNT(*) as count FROM police_stations').get() as { count: number };
    if (existing && existing.count > 0) {
      return;
    }

    console.log('[PoliceStationSeed] Seeding verified India-wide police stations and patrol units...');

    const insertStation = db.prepare(`
      INSERT INTO police_stations (
        id, station_code, name, state, district, city, address, latitude, longitude, contact_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `);

    const insertPatrol = db.prepare(`
      INSERT INTO patrol_units (
        id, station_id, unit_code, vehicle_type, officer_in_charge, contact_number, status, current_latitude, current_longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const st of INITIAL_POLICE_STATIONS) {
        insertStation.run(
          st.id,
          st.station_code,
          st.name,
          st.state,
          st.district,
          st.city,
          st.address,
          st.latitude,
          st.longitude,
          st.contact_number
        );

        for (const p of st.patrols) {
          insertPatrol.run(
            p.id,
            st.id,
            p.unit_code,
            p.vehicle_type,
            p.officer_in_charge,
            p.contact_number,
            p.status,
            st.latitude,
            st.longitude
          );
        }
      }
      db.exec('COMMIT;');
      console.log(`[PoliceStationSeed] Successfully seeded ${INITIAL_POLICE_STATIONS.length} police stations and associated patrol units.`);
    } catch (err) {
      db.exec('ROLLBACK;');
      console.error('[PoliceStationSeed] Error seeding police stations:', err);
    }
  } catch (err) {
    console.error('[PoliceStationSeed] Exception during police station initialization:', err);
  }
}
