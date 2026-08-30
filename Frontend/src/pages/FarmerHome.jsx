import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getWeatherRisk, listFarms, getNearbyAlerts } from '../api/client';
import BottomTabBar from '../components/BottomTabBar';

const RISK_COLORS = {
  Critical: { bg: '#fef2f2', badge: '#dc2626', text: '#991b1b' },
  High:     { bg: '#fff7ed', badge: '#ea580c', text: '#9a3412' },
  Medium:   { bg: '#fefce8', badge: '#ca8a04', text: '#92400e' },
  Low:      { bg: '#f0fdf4', badge: '#16a34a', text: '#166534' },
};

export default function FarmerHome() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [weather, setWeather] = useState(null);
  const [farms, setFarms] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [loadingFarms, setLoadingFarms] = useState(true);

  const lat = user?.latitude || 19.99;
  const lon = user?.longitude || 73.78;

  const timeOfDayGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('home.greetingMorning');
    if (h < 17) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
  };

  useEffect(() => {
    getWeatherRisk(lat, lon, user?.primaryCrop)
      .then((r) => setWeather(r.data))
      .catch(() => setWeather(null))
      .finally(() => setLoadingWeather(false));

    listFarms()
      .then((r) => setFarms(r.data?.slice(0, 5) || []))
      .catch(() => setFarms([]))
      .finally(() => setLoadingFarms(false));

    const savedRad = localStorage.getItem('krishi_alert_radius');
    const rad = savedRad ? parseFloat(savedRad) : 5.0;
    getNearbyAlerts(lat, lon, rad)
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.farms || []);
        setAlerts(data.slice(0, 3));
      })
      .catch(() => setAlerts([]));
  }, [lat, lon]);

  const risk = weather?.risk_level || 'Low';
  const riskColors = RISK_COLORS[risk] || RISK_COLORS.Low;
  const temp = weather?.weather?.temperature_c ?? '--';
  const humidity = weather?.weather?.humidity_pct ?? '--';

  const actions = [
    { icon: '📸', labelKey: 'nav.scanCrop', path: '/farmer/scan', color: '#1F5F3F' },
    { icon: '🌾', labelKey: 'nav.myFarms', path: '/farmer/farms', color: '#2D6A4F' },
    { icon: '🔔', labelKey: 'nav.alerts', path: '/farmer/alerts', color: '#ea580c' },
    { icon: '📋', labelKey: 'nav.history', path: '/farmer/history', color: '#7c3aed' },
  ];

  const cropColors = ['#dcfce7', '#dbeafe', '#fef3c7', '#fce7f3', '#ede9fe'];

  return (
    <div className="mobile-app page-enter" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1F5F3F 0%, #2D6A4F 100%)', padding: '52px 20px 24px', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-300 text-sm font-medium mb-1">{timeOfDayGreeting()}</p>
            <h1 className="text-white text-2xl font-black">{user?.name} {user?.avatar}</h1>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-green-300 text-sm">📍</span>
              <span className="text-green-200 text-sm">{user?.location || t('home.location')}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/farmer/alerts')}
            className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg hover:bg-white/30 transition-colors"
            title={t('nav.alerts')}
            aria-label={t('nav.alerts')}
          >
            🔔
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-400 border-2 border-green-800 rounded-full" />
            )}
          </button>
        </div>

        {/* Weather + Risk Card (inline in header) */}
        <div className="mt-5 bg-white rounded-2xl p-4 shadow-lg">
          {loadingWeather ? (
            <div className="flex gap-3">
              <div className="skeleton w-16 h-16 rounded-xl" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="skeleton h-6 w-24 rounded" />
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-6 w-28 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-5xl">🌤️</div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-gray-900">{temp}°C</span>
                  <span className="text-gray-500 text-sm">{t('home.humidity')} {humidity}%</span>
                </div>
                <span
                  className="pill mt-2 text-xs font-bold"
                  style={{ background: riskColors.bg, color: riskColors.text, border: `1.5px solid ${riskColors.badge}` }}
                >
                  {risk === 'Low' ? '✅' : risk === 'Medium' ? '⚠️' : '🔴'} {risk.toUpperCase()} RISK
                  {weather?.reasons?.[0] ? ` · ${weather.reasons[0].split(' ')[0]} ${weather.reasons[0].split(' ')[1]}` : ''}
                </span>
              </div>
              <button
                onClick={() => navigate('/farmer/risk')}
                className="text-green-700 hover:text-green-900 transition-colors"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 mt-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {actions.map((a) => (
            <button
              key={a.labelKey}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md transition-all group-hover:scale-105 group-hover:shadow-lg group-active:scale-95"
                style={{ background: a.color + '18', border: `1.5px solid ${a.color}30` }}
              >
                {a.icon}
              </div>
              <span className="text-xs font-semibold text-gray-600">{t(a.labelKey)}</span>
            </button>
          ))}
        </div>

        {/* Nearby Alerts Banner */}
        {alerts.length > 0 && (
          <div
            className="rounded-2xl p-4 mb-5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
            style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}
            onClick={() => navigate('/farmer/alerts')}
          >
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <p className="font-bold text-orange-800 text-sm">{t('home.affectedFarms', { count: alerts.length })}</p>
              <p className="text-orange-600 text-xs mt-0.5">{alerts[0]?.message?.slice(0, 60)}...</p>
            </div>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#ea580c" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}

        {/* My Farms */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900">{t('home.myFarmsTitle')}</h2>
          <button onClick={() => navigate('/farmer/farms')} className="text-green-700 text-sm font-semibold hover:text-green-900">{t('home.seeAll')}</button>
        </div>

        {loadingFarms ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-44 rounded-2xl overflow-hidden shadow-md">
                <div className="skeleton h-28 w-full" />
                <div className="p-3 bg-white">
                  <div className="skeleton h-4 w-24 rounded mb-2" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : farms.length === 0 ? (
          <div className="card text-center py-10">
            <div className="text-4xl mb-3">🌾</div>
            <p className="text-gray-500 font-medium">{t('farms.noFarms')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('farms.addFarmBtn')}</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {farms.map((farm, i) => (
              <div
                key={farm.id}
                className="flex-shrink-0 w-44 rounded-2xl overflow-hidden shadow-md cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => navigate('/farmer/farms')}
              >
                <div
                  className="h-28 flex items-center justify-center text-4xl"
                  style={{ background: cropColors[i % cropColors.length] }}
                >
                  🌾
                </div>
                <div className="p-3 bg-white">
                  <p className="font-bold text-gray-900 text-sm truncate">{farm.name}</p>
                  <span className="pill text-xs mt-1" style={{ background: '#dcfce7', color: '#15803d' }}>
                    {farm.crop_type || t('home.primaryCrop')}
                  </span>
                  <p className="text-gray-400 text-xs mt-1">{farm.area_acres || 2} acres · {farm.district}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
