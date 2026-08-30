import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWeatherRisk, getNearbyAlerts } from '../api/client';
import BottomTabBar from '../components/BottomTabBar';

const RISK_CONFIG = {
  Critical: { label: 'CRITICAL RISK', bg: 'linear-gradient(135deg, #dc2626, #991b1b)', score: '9/10', emoji: '🔴' },
  High:     { label: 'HIGH RISK',     bg: 'linear-gradient(135deg, #ea580c, #c2410c)', score: '7/10', emoji: '🟠' },
  Medium:   { label: 'MEDIUM RISK',   bg: 'linear-gradient(135deg, #ca8a04, #a16207)', score: '5/10', emoji: '🟡' },
  Low:      { label: 'LOW RISK',      bg: 'linear-gradient(135deg, #16a34a, #166534)', score: '2/10', emoji: '🟢' },
};

export default function FarmerRisk() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const lat = user?.latitude || 19.99;
  const lon = user?.longitude || 73.78;

  useEffect(() => {
    getWeatherRisk(lat, lon, user?.primaryCrop)
      .then((r) => setWeather(r.data))
      .catch(() => setWeather(null))
      .finally(() => setLoading(false));

    getNearbyAlerts(lat, lon, 5)
      .then((r) => setAlerts(r.data?.farms || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoadingAlerts(false));
  }, []);

  const risk = weather?.risk_level || 'Low';
  const rCfg = RISK_CONFIG[risk] || RISK_CONFIG.Low;
  const temp = weather?.weather?.temperature_c ?? '--';
  const humidity = weather?.weather?.humidity_pct ?? '--';
  const rain = weather?.weather?.rain_probability_pct ?? '--';

  const weatherMetrics = [
    { icon: '🌡️', label: 'Temperature', value: `${temp}°C` },
    { icon: '💧', label: 'Humidity',    value: `${humidity}%` },
    { icon: '🌧️', label: 'Rain Chance', value: `${rain}%` },
    { icon: '🌤️', label: 'Conditions',  value: 'Partly Cloudy' },
  ];

  const fmtTime = (str) => {
    if (!str) return 'Just now';
    try {
      return new Date(str).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return 'Recently'; }
  };

  return (
    <div className="mobile-app page-enter" style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">←</button>
        <h1 className="text-lg font-black text-gray-900">Weather & Risk</h1>
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">🔔</div>
      </div>

      <div className="px-5">
        {/* Hero Weather Card */}
        {loading ? (
          <div className="skeleton rounded-2xl h-52 mb-4" />
        ) : (
          <div className="card mb-4 p-0 overflow-hidden">
            {/* Green top section */}
            <div
              className="px-5 py-6"
              style={{ background: 'linear-gradient(135deg, #1F5F3F, #2D6A4F)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm font-medium">📍 {user?.location || 'Your Location'}</p>
                  <div className="flex items-end gap-2 mt-2">
                    <span className="text-5xl font-black text-white">{temp}°C</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl">🌤️</div>
                  <p className="text-green-200 text-sm mt-1">Scattered Clouds</p>
                </div>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3 p-4">
              {weatherMetrics.map((m) => (
                <div key={m.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f9fafb' }}>
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg shadow-sm">{m.icon}</div>
                  <div>
                    <p className="text-gray-400 text-xs">{m.label}</p>
                    <p className="font-bold text-gray-900 text-sm">{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Score Banner */}
        {!loading && (
          <div className="rounded-2xl overflow-hidden shadow-lg mb-4 page-enter">
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: rCfg.bg }}>
              <div>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Outbreak Risk</p>
                <p className="text-white text-2xl font-black mt-1">{rCfg.emoji} {rCfg.label}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">Risk Score</p>
                <p className="text-white text-3xl font-black">{rCfg.score}</p>
              </div>
            </div>
            {weather?.reasons && weather.reasons.length > 0 && (
              <div className="bg-white px-5 py-4">
                <p className="font-bold text-gray-800 text-sm mb-2">Why this risk level?</p>
                <ul className="flex flex-col gap-1.5">
                  {weather.reasons.filter(r => !r.includes('calculated for')).map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                {user?.primaryCrop && (
                  <div className="mt-3 rounded-xl p-3 flex items-center gap-2" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                    <span>🌾</span>
                    <p className="text-green-800 text-xs font-medium">Monitoring for {user.primaryCrop}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nearby Disease Activity */}
        <h2 className="text-lg font-black text-gray-900 mb-3">Nearby Disease Activity</h2>

        {loadingAlerts ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
          </div>
        ) : alerts.length === 0 ? (
          <div className="card text-center py-8">
            <div className="text-3xl mb-2">✅</div>
            <p className="font-semibold text-gray-700">No nearby alerts</p>
            <p className="text-gray-400 text-sm mt-1">No disease outbreaks within 5km</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((a, i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <span className="pill flex-shrink-0 text-xs font-bold" style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74' }}>
                  {typeof a.distance_km === 'number' ? `${a.distance_km} km` : '~km'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{a.farmer_name || 'Nearby Farm'}</p>
                  <p className="text-gray-500 text-xs truncate">{a.message}</p>
                </div>
                <span className="text-gray-400 text-xs flex-shrink-0">
                  {a.created_at ? fmtTime(a.created_at) : 'Recent'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
