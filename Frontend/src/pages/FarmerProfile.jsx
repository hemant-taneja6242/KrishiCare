import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomTabBar from '../components/BottomTabBar';

export default function FarmerProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: '🌾', label: 'My Farms', sub: 'Manage your registered farms', path: '/farmer/farms' },
    { icon: '📋', label: 'Scan History', sub: 'All past crop diagnoses', path: '/farmer/scan' },
    { icon: '🔔', label: 'Alert Settings', sub: 'Manage nearby alert radius', path: null },
    { icon: '🌍', label: 'Language', sub: 'Change preferred language', path: null },
    { icon: '📞', label: 'Krishi Helpline', sub: '1800-180-1551 (Toll Free)', path: null },
    { icon: '❓', label: 'Help & Support', sub: 'FAQs and contact support', path: null },
  ];

  return (
    <div className="mobile-app page-enter" style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1F5F3F, #2D6A4F)', padding: '52px 20px 32px' }}>
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl mb-3 shadow-lg">
            {user?.avatar || '👤'}
          </div>
          <h1 className="text-white font-black text-2xl">{user?.name || 'Farmer'}</h1>
          <p className="text-green-300 text-sm mt-1">📍 {user?.location || 'Maharashtra'}</p>
          <div className="flex gap-2 mt-3">
            <span className="pill text-xs" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              🌾 {user?.primaryCrop || 'Farmer'}
            </span>
            <span className="pill text-xs" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              Farm ID #{user?.farmId || 1}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 -mt-5">
        <div className="card flex divide-x divide-gray-100 p-0 overflow-hidden">
          {[
            { label: 'Scans Done', value: '12' },
            { label: 'Alerts Received', value: '5' },
            { label: 'Farms', value: '1' },
          ].map((s) => (
            <div key={s.label} className="flex-1 text-center py-4">
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="px-5 mt-5">
        <div className="card p-0 overflow-hidden divide-y divide-gray-50">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lg flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.sub}</p>
              </div>
              <span className="text-gray-300">›</span>
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full mt-5 py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-colors"
          style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5' }}
        >
          ← Logout
        </button>

        <p className="text-center text-gray-300 text-xs mt-4 mb-2">KrishiRaksha v1.0 · SIH 2026 · PS 26131</p>
      </div>

      <BottomTabBar />
    </div>
  );
}
