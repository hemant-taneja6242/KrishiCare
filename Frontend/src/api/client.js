import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: BASE,
  timeout: 120000, // 2 min — ML inference can be slow on first run
});

// ── Health ────────────────────────────────────────
export const getHealth = () => api.get('/api/health');

// ── Farms ─────────────────────────────────────────
export const listFarms = (params = {}) => api.get('/api/farms', { params });
export const getFarm = (farmId) => api.get(`/api/farms/${farmId}`);
export const createFarm = (data) => api.post('/api/farms', data);

// ── Diagnose (multipart) ──────────────────────────
export const diagnoseImage = (file, { farmId, cropHint, latitude, longitude } = {}, onProgress) => {
  const form = new FormData();
  form.append('image', file);
  if (farmId)    form.append('farm_id', farmId);
  if (cropHint)  form.append('crop_hint', cropHint);
  if (latitude)  form.append('latitude', latitude);
  if (longitude) form.append('longitude', longitude);
  return api.post('/api/diagnose', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress || undefined,
    timeout: 120000,
  });
};

// ── Advisory ──────────────────────────────────────
export const getAdvisory = (disease, crop, lang = 'en') =>
  api.get('/api/advisory', { params: { disease, crop, lang } });

// ── Weather & Risk ────────────────────────────────
export const getWeatherRisk = (lat, lon, crop) =>
  api.get('/api/weather/risk', { params: { lat, lon, crop } });

// ── Alerts ────────────────────────────────────────
export const listAlerts = (farmId) =>
  api.get('/api/alerts', { params: farmId ? { farm_id: farmId } : {} });

export const getNearbyAlerts = (lat, lon, radius = 5.0) =>
  api.get('/api/alerts/nearby', { params: { lat, lon, radius } });

export const triggerAlert = (diagnosisId, radiusKm = 5.0) =>
  api.post('/api/alerts/trigger', { diagnosis_id: diagnosisId, radius_km: radiusKm });

// ── Expert Queue ──────────────────────────────────
export const getExpertQueue = () => api.get('/api/expert/queue');

export const validateDiagnosis = (diagnosisId, action, { correctedDisease, note } = {}) =>
  api.post('/api/expert/validate', {
    diagnosis_id: diagnosisId,
    action,
    corrected_disease: correctedDisease || undefined,
    note: note || undefined,
  });

// ── Hotspots (Admin Map) ──────────────────────────
export const getHotspots = (limit = 50) =>
  api.get('/api/hotspots', { params: { limit } });

export default api;
