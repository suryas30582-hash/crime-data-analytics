import {
  User,
  Dataset,
  FilterState,
  AnalyticsKPIs,
  AnalyticsCharts,
  CrimeRecord,
  PredictionData,
  RegionReportData,
  ValidationReport
} from '../types';

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`)
  : '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('crime_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch {
      errorMessage = `Server Error: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: any) => request<{ message: string; token: string; user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  login: (data: any) => request<{ message: string; token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  forgotPassword: (data: any) => request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getMe: () => request<{ user: User }>('/auth/me'),

  // Datasets
  getDatasets: () => request<{ datasets: Dataset[] }>('/datasets'),

  getDatasetById: (id: string) => request<{ dataset: Dataset; stats: any }>(`/datasets/${id}`),

  deleteDataset: (id: string) => request<{ message: string }>(`/datasets/${id}`, {
    method: 'DELETE'
  }),

  // Analytics
  getKPIs: (filters: Partial<FilterState>) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });
    return request<AnalyticsKPIs>(`/analytics/kpis?${params.toString()}`);
  },

  getCharts: (filters: Partial<FilterState>) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });
    return request<AnalyticsCharts>(`/analytics/charts?${params.toString()}`);
  },

  getLocationHierarchy: (datasetId: string, state?: string, district?: string) => {
    const params = new URLSearchParams({ datasetId });
    if (state && state !== 'All') params.append('state', state);
    if (district && district !== 'All') params.append('district', district);
    return request<{ states: string[]; districts: string[]; cities: string[]; crimeTypes: string[] }>(`/analytics/locations?${params.toString()}`);
  },

  getAvailableYears: (datasetId: string) => {
    return request<{ years: number[] }>(`/analytics/years?datasetId=${encodeURIComponent(datasetId)}`);
  },

  // Records
  getRecords: (filters: Partial<FilterState> & { page?: number; limit?: number; sortBy?: string; sortOrder?: string }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    return request<{ records: CrimeRecord[]; pagination: { page: number; limit: number; totalRecords: number; totalPages: number } }>(`/records?${params.toString()}`);
  },

  exportRecords: (filters: Partial<FilterState>) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });
    return request<{ records: any[] }>(`/records/export?${params.toString()}`);
  },

  // Upload & Validation
  validateFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('crime_auth_token');
    const response = await fetch(`${API_BASE}/upload/validate`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ error: 'Upload validation failed' }));
      throw new Error(errorJson.error || 'Upload validation failed');
    }

    return response.json() as Promise<ValidationReport>;
  },

  commitImport: (data: { datasetName?: string; datasetDescription?: string; targetDatasetId?: string; records: CrimeRecord[] }) => {
    return request<{ success: boolean; message: string; datasetId: string; totalDatasetRecords: number }>('/upload/import', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Predictions
  getPredictions: (filters: Partial<FilterState>) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });
    return request<PredictionData>(`/predictions?${params.toString()}`);
  },

  // Reports
  getRegionReport: (filters: Partial<FilterState>) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });
    return request<RegionReportData>(`/reports/region?${params.toString()}`);
  }
};
