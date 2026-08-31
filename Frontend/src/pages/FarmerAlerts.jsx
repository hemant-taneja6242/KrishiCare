import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getNearbyAlerts } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BottomTabBar from '../components/BottomTabBar';

const MOCK_ALERTS = [
  { id: 1, message: '🔴 Early Blight detected 0.3 km from your farm in Ozar. Inspect your Tomato leaves immediately for brown concentric ring lesions.', created_at: new Date(Date.now() - 7200000).toISOString(), distance: '0.3 km' },
  { id: 2, message: '🟠 Tomato Late Blight detected 2.8 km away in Niphad. Cool humid conditions — monitor for water-soaked spots on leaves and stems.', created_at: new Date(Date.now() - 28800000).toISOString(), distance: '2.8 km' },
  { id: 3, message: '🟡 Powdery Mildew detected 3.5 km from your farm. Spray neem oil or sulfur-based fungicide as a preventive measure.', created_at: new Date(Date.now() - 86400000).toISOString(), distance: '3.5 km' },
  { id: 4, message: '🔴 Rice Blast cluster in Ahmednagar (12 km away) — outbreak spreading rapidly. Avoid water-sharing from affected fields.', created_at: new Date(Date.now() - 172800000).toISOString(), distance: '12.0 km' },
];

const SEVERITY_BY_DISEASE = (msg) => {
  const lower = (msg || '').toLowerCase();
  if (lower.includes('blast') || lower.includes('blight') || lower.includes('esca')) return 'high';
  if (lower.includes('mildew')) return 'medium';
  return 'low';
};

export default function FarmerAlerts() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const savedRadius = localStorage.getItem('krishi_alert_radius');
  const [radius, setRadius] = useState(savedRadius ? parseFloat(savedRadius) : 5.0);

  const lat = user?.latitude || 19.99;
  const lon = user?.longitude || 73.78;

  useEffect(() => {
    const stored = localStorage.getItem('krishi_alert_radius');
    const currentRadius = stored ? parseFloat(stored) : 5.0;
    setRadius(currentRadius);
    setLoading(true);

    getNearbyAlerts(lat, lon, currentRadius)
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.farms || []);
        setAlerts(data);
      })
      .catch(() => {
        // Fallback filter mock alerts
        const filtered = MOCK_ALERTS.filter((a) => {
          const d = parseFloat(a.distance);
          return isNaN(d) || d <= currentRadius;
        });
        setAlerts(filtered);
      })
      .finally(() => setLoading(false));
  }, [lat, lon]);

  const fmtTime = (s) => {
    try {
      const d = new Date(s);
      const diff = Date.now() - d.getTime();
      if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} min ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch { return 'Recently'; }
  };

  const sevColor = { high: '#fff7ed', medium: '#fefce8', low: '#f0fdf4' };
  const sevText  = { high: '#9a3412', medium: '#92400e', low: '#166534' };
  const sevBorder = { high: '#fdba74', medium: '#fcd34d', low: '#86efac' };
  const sevEmoji = { high: '🔴', medium: '🟡', low: '🟢' };

  return (
    <div className="mobile-app page-enter" style={{ paddingBottom: 90 }}>
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">←</button>
        <h1 className="text-lg font-black text-gray-900">{t('alerts.title')}</h1>
        <button
          onClick={() => navigate('/farmer/profile/alerts')}
          title={t('profile.menuAlerts')}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          ⚙️
        </button>
      </div>

      <div className="px-5">
        <div className="rounded-2xl p-4 mb-5 flex items-center justify-between gap-3" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-orange-800 text-sm">{t('alerts.bannerTitle', { radius })}</p>
              <p className="text-orange-600 text-xs mt-0.5">{t('alerts.bannerSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/farmer/profile/alerts')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-orange-800 bg-orange-100 hover:bg-orange-200 transition-colors shrink-0"
          >
            {t('alerts.adjustBtn')}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : alerts.length === 0 ? (
          <div className="card p-8 text-center">
            <span className="text-4xl block mb-2">🛡️</span>
            <p className="font-bold text-gray-800 text-base">{t('alerts.noAlertsTitle')}</p>
            <p className="text-gray-500 text-xs mt-1">{t('alerts.noAlertsDesc', { radius })}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((a, i) => {
              const sev = SEVERITY_BY_DISEASE(a.message || '');
              return (
                <div key={a.id || i} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{sevEmoji[sev]}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="pill text-xs font-bold" style={{ background: sevColor[sev], color: sevText[sev], border: `1px solid ${sevBorder[sev]}` }}>
                          {a.distance || (a.distance_km != null ? `${a.distance_km} ${t('common.km')}` : t('alerts.nearby'))}
                        </span>
                        <span className="text-gray-400 text-xs">{fmtTime(a.created_at)}</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed mt-2">{a.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
