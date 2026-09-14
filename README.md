# Crime Data Analytics (CDA)
### *Analyze. Understand. Predict.*

A full-stack, intelligence-grade Web Application built for national and regional crime data analysis, spatial hotspot exploration, mathematical risk forecasting, and executive briefing generation.

---

## 🚀 Key Highlights & Architecture

- **True Database-Backed Architecture**: Zero fake or hardcoded dashboard numbers. Every metric, chart slice, resolution rate, and time series projection is computed in real time from SQL database records.
- **Dual Preloaded National & Regional Datasets**:
  1. **India Crime Dataset**: 2,000 verified incident records across Indian States, Union Territories, and municipal centers (2026–2027).
  2. **Tamil Nadu Crime Dataset**: 1,000 regional incident records across Tamil Nadu districts and cities (2023).
- **13 Indian Languages Localization**: Dynamic multi-language engine supporting **English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Malayalam (മലയാളം), Kannada (ಕನ್ನಡ), Bengali (বাংলা), Marathi (मराठी), Gujarati (ગુજરાતી), Punjabi (ਪੰਜਾਬੀ), Odia (ଓଡ଼ିଆ), Assamese (অসমীয়া), and Urdu (اردو)**.
- **Real Authentication & RBAC**: Account registration (Full Name, Email, Password, Confirm Password), password hashing with `bcryptjs`, JWT session tokens, and route protection distinguishing **Normal Users** from **Administrators**.
- **Dataset Ingestion & Validation Engine**: Upload current or future crime records in **XLSX** or **CSV** formats with automated 12-point integrity check, missing value diagnostics, duplicate row detection, and safe database committing without data loss.
- **Data-Driven Predictive Analytics**: Historical linear regression trend forecasting, diurnal threat time slots, and spatial crime hotspot clusters.
- **Official Regional PDF Reports**: Client-side compiled multi-page intelligence briefings for State, District, or City jurisdictions.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS (Command Room / Intelligence theme), Lucide Icons, Recharts, jsPDF, jspdf-autotable, PapaParse, XLSX.
- **Backend**: Node.js, Express, TypeScript, `node:sqlite` (high-performance built-in SQLite engine with WAL mode and transaction safety), JWT, bcryptjs, Multer.

---

## 📁 Standard 19-Column Dataset Schema

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `Crime_ID` | String (Unique) | Unique reference identifier (e.g. `CR202700001`) |
| `Date` | Date (`YYYY-MM-DD`) | Incident occurrence date |
| `Time` | Time (`HH:MM`) | Incident occurrence time (24h) |
| `Crime_Type` | String | Crime classification (e.g. `Cyber Crime`, `Kidnapping`, `Robbery`) |
| `City` | String | Urban area or municipality |
| `State` | String | Indian State or Union Territory |
| `Location` | String | Specific area or landmark category |
| `Victim_Age` | Integer | Age of victim (0–125) |
| `Victim_Gender` | String | Gender (`Male`, `Female`, `Other`) |
| `Suspect_Age` | Integer | Age of suspect |
| `Suspect_Gender` | String | Gender of suspect |
| `Weapon_Used` | String | Modus operandi or weapon recorded |
| `Case_Status` | String | `Closed`, `Solved`, `Under Investigation`, `Pending`, `Charge Sheet Filed` |
| `Latitude` | Float | Spatial coordinate |
| `Crime_Severity` | String | `High`, `Medium`, `Low` |
| `Police_Station` | String | Jurisdictional station house |
| `Arrest_Made` | String | `Yes` / `No` |
| `Incident_Day` | String | Day of week (`Monday` – `Sunday`) |
| `Investigation_Days` | Integer | Number of days to investigation completion |

---

## 💻 Quick Start & Running Locally

### 1. Start the Server (Backend + Built-in Database)
```bash
cd server
npm start
```
*The server automatically boots on port `5000` and serves the production client bundle.*

### 2. Or Run in Development Mode:
```bash
# In terminal 1 (Backend API):
cd server
npm run dev

# In terminal 2 (Frontend Client):
cd client
npm run dev
```

Open your browser at `http://localhost:3000` (Dev) or `http://localhost:5000` (Production).
