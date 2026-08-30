import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const roles = [
  {
    key: 'farmer',
    icon: '👨‍🌾',
    titleKey: 'login.farmerTitle',
    descKey: 'login.farmerDesc',
    gradient: 'from-green-700 to-green-600',
  },
  {
    key: 'expert',
    icon: '👩‍🔬',
    titleKey: 'login.expertTitle',
    descKey: 'login.expertDesc',
    gradient: 'from-teal-700 to-teal-500',
  },
  {
    key: 'admin',
    icon: '🗺️',
    titleKey: 'login.adminTitle',
    descKey: 'login.adminDesc',
    gradient: 'from-slate-700 to-slate-500',
  },
];

const ROUTES = { farmer: '/farmer', expert: '/expert', admin: '/admin' };

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role) => {
    login(role);
    navigate(ROUTES[role]);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(160deg, #0f3d22 0%, #1F5F3F 50%, #2D6A4F 100%)' }}
    >
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="text-7xl mb-4 drop-shadow-lg">🌿</div>
        <h1 className="text-4xl font-black text-white tracking-tight">{t('login.title')}</h1>
        <p className="text-green-300 mt-2 text-base font-medium">{t('login.subtitle')}</p>
      </div>

      {/* Role cards */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {roles.map((r) => (
          <button
            key={r.key}
            onClick={() => handleLogin(r.key)}
            className="group relative w-full text-left rounded-2xl overflow-hidden shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl active:scale-95"
          >
            <div className="bg-white px-5 py-5 flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.gradient} flex items-center justify-center text-2xl shadow-md flex-shrink-0`}
              >
                {r.icon}
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-base">{t(r.titleKey)}</div>
                <div className="text-gray-500 text-sm mt-0.5 leading-snug">{t(r.descKey)}</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <p className="text-green-400 text-xs mt-10 font-medium">{t('common.version')}</p>
    </div>
  );
}
