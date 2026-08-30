import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import BottomTabBar from '../components/BottomTabBar';
import i18n, { SUPPORTED_LANGUAGES } from '../i18n';

export default function FarmerProfile() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { subview: routeSubview } = useParams();

  // Active view: null (main profile), 'alerts', 'language', 'help'
  const [activeView, setActiveView] = useState(routeSubview || null);

  useEffect(() => {
    setActiveView(routeSubview || null);
  }, [routeSubview]);

  // 1. Alert Radius State
  const [radius, setRadius] = useState(() => {
    const saved = localStorage.getItem('krishi_alert_radius');
    return saved ? parseInt(saved, 10) : 5;
  });

  useEffect(() => {
    const saved = localStorage.getItem('krishi_alert_radius');
    if (saved) {
      setRadius(parseInt(saved, 10));
    }
  }, [activeView]);

  const [savedRadiusFeedback, setSavedRadiusFeedback] = useState(false);

  // 2. Language State
  const [currentLang, setCurrentLang] = useState(() => {
    return i18n.language || localStorage.getItem('krishi_app_lang') || 'en';
  });
  const [savedLangFeedback, setSavedLangFeedback] = useState(false);

  // 3. FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0); // first FAQ open by default

  const handleSaveRadius = () => {
    localStorage.setItem('krishi_alert_radius', radius.toString());
    setSavedRadiusFeedback(true);
    setTimeout(() => setSavedRadiusFeedback(false), 2500);
  };

  const handleSelectLang = (code) => {
    i18n.changeLanguage(code);
    setCurrentLang(code);
    setSavedLangFeedback(true);
    setTimeout(() => setSavedLangFeedback(false), 2500);
  };

  const closeSubview = () => {
    setActiveView(null);
    navigate('/farmer/profile', { replace: true });
  };

  const openView = (viewKey) => {
    setActiveView(viewKey);
    navigate(`/farmer/profile/${viewKey}`);
  };

  // -------------------------------------------------------------
  // SUBVIEW 1: ALERT SETTINGS
  // -------------------------------------------------------------
  if (activeView === 'alerts') {
    return (
      <div className="mobile-app page-enter" style={{ paddingBottom: 90 }}>
        <div className="flex items-center justify-between px-5 pt-14 pb-4">
          <button
            onClick={closeSubview}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200 transition-colors"
          >
            ←
          </button>
          <h1 className="text-lg font-black text-gray-900">{t('radius.title')}</h1>
          <div className="w-10" />
        </div>

        <div className="px-5">
          {savedRadiusFeedback && (
            <div className="rounded-xl p-3.5 mb-4 bg-green-50 border border-green-300 text-sm text-green-800 flex items-center gap-2 page-enter">
              <span>✅</span>
              <span className="font-semibold">{t('radius.savedSuccess', { radius })}</span>
            </div>
          )}

          <div className="card mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              {t('radius.thresholdLabel')}
            </span>
            <p className="text-sm text-gray-600 mb-5">
              {t('radius.thresholdDesc')}
            </p>

            <div className="rounded-2xl p-5 bg-green-50 border border-green-200 flex flex-col items-center justify-center mb-6">
              <span className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1">{t('radius.currentRadiusLabel')}</span>
              <span className="text-4xl font-black text-green-900">{radius} {t('common.km')}</span>
              <span className="text-xs text-green-700 mt-1">{t('radius.monitorsDesc', { radius })}</span>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                <span>{t('radius.local')}</span>
                <span>10 {t('common.km')}</span>
                <span>{t('radius.regional')}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-700"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {[2, 5, 10, 15, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRadius(preset)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={
                    radius === preset
                      ? { background: '#1F5F3F', color: 'white' }
                      : { background: '#f3f4f6', color: '#4b5563' }
                  }
                >
                  {preset} {t('common.km')} {preset === 5 ? t('radius.defaultBadge') : ''}
                </button>
              ))}
            </div>

            <button
              onClick={handleSaveRadius}
              className="btn-primary w-full text-center"
            >
              {t('radius.saveBtn')}
            </button>
          </div>

          <div className="card bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed">
              🔔 <strong>{t('common.success')}:</strong> {t('radius.howItWorks', { radius })}
            </p>
          </div>

          <button
            onClick={closeSubview}
            className="w-full mt-4 py-3 text-center text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← {t('common.back')}
          </button>
        </div>

        <BottomTabBar />
      </div>
    );
  }

  // -------------------------------------------------------------
  // SUBVIEW 2: LANGUAGE SELECTION
  // -------------------------------------------------------------
  if (activeView === 'language') {
    return (
      <div className="mobile-app page-enter" style={{ paddingBottom: 90 }}>
        <div className="flex items-center justify-between px-5 pt-14 pb-4">
          <button
            onClick={closeSubview}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200 transition-colors"
          >
            ←
          </button>
          <h1 className="text-lg font-black text-gray-900">{t('language.title')}</h1>
          <div className="w-10" />
        </div>

        <div className="px-5">
          {savedLangFeedback && (
            <div className="rounded-xl p-3.5 mb-4 bg-green-50 border border-green-300 text-sm text-green-800 flex items-center gap-2 page-enter">
              <span>✅</span>
              <span className="font-semibold">
                {t('language.savedToast', { lang: SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.native })}
              </span>
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-gray-500">
              {t('language.subtitle')}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLang(lang.code)}
                  className="card p-4 flex items-center justify-between text-left transition-all"
                  style={
                    isSelected
                      ? { border: '2px solid #1F5F3F', background: '#f1faf3' }
                      : { border: '1px solid #e5e7eb' }
                  }
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-base">{lang.native}</p>
                        <span className="text-xs text-gray-400 font-medium">({lang.label})</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{lang.desc}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-7 h-7 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={closeSubview}
            className="w-full mt-6 py-3 text-center text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← {t('common.back')}
          </button>
        </div>

        <BottomTabBar />
      </div>
    );
  }

  // -------------------------------------------------------------
  // SUBVIEW 3: HELP & SUPPORT
  // -------------------------------------------------------------
  const faqList = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
  ];

  if (activeView === 'help') {
    return (
      <div className="mobile-app page-enter" style={{ paddingBottom: 90 }}>
        <div className="flex items-center justify-between px-5 pt-14 pb-4">
          <button
            onClick={closeSubview}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200 transition-colors"
          >
            ←
          </button>
          <h1 className="text-lg font-black text-gray-900">{t('faq.title')}</h1>
          <div className="w-10" />
        </div>

        <div className="px-5 flex flex-col gap-5">
          {/* Contact Support Card */}
          <div className="card bg-gradient-to-br from-green-800 to-green-900 text-white">
            <h2 className="text-base font-black mb-1">KrishiCare Farmer Support</h2>
            <p className="text-xs text-green-200 mb-4">Official assistance for crop diagnostics and outbreak reporting</p>

            <div className="flex flex-col gap-3">
              <a
                href="tel:18001801551"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-lg">📞</div>
                <div>
                  <p className="text-xs text-green-200 font-medium">{t('profile.menuHelpline')}</p>
                  <p className="text-base font-black text-white">1800-180-1551</p>
                </div>
                <span className="ml-auto text-xs font-bold bg-green-600 px-2 py-1 rounded-full">Call</span>
              </a>

              <a
                href="mailto:support@krishicare.in"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-lg">✉️</div>
                <div>
                  <p className="text-xs text-green-200 font-medium">Email Support</p>
                  <p className="text-sm font-bold text-white">support@krishicare.in</p>
                </div>
                <span className="ml-auto text-xs font-bold bg-white/20 px-2 py-1 rounded-full">Email</span>
              </a>
            </div>

            <p className="text-xs text-green-300 mt-3">🕒 Available Mon – Sat: 6:00 AM to 10:00 PM IST</p>
          </div>

          {/* FAQs Accordion */}
          <div>
            <h2 className="text-base font-black text-gray-900 mb-3">{t('faq.title')}</h2>
            <div className="flex flex-col gap-2.5">
              {faqList.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="card p-0 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 flex items-center justify-between text-left font-bold text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      <span className="pr-3">{faq.q}</span>
                      <span className="text-gray-400 text-base">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-gray-600 border-t border-gray-100 bg-gray-50 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={closeSubview}
            className="w-full py-3 text-center text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← {t('common.back')}
          </button>
        </div>

        <BottomTabBar />
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN PROFILE VIEW
  // -------------------------------------------------------------
  const menuItems = [
    { icon: '🌾', label: t('nav.myFarms'), sub: t('farms.title'), path: '/farmer/farms' },
    { icon: '📋', label: t('nav.history'), sub: t('home.recentScans'), path: '/farmer/scan' },
    { icon: '🔔', label: t('profile.menuAlerts'), sub: t('profile.menuAlertsSub'), action: 'alerts' },
    { icon: '🌍', label: t('profile.menuLanguage'), sub: t('profile.menuLanguageSub'), action: 'language' },
    { icon: '📞', label: t('profile.menuHelpline'), sub: t('profile.menuHelplineSub'), href: 'tel:18001801551' },
    { icon: '❓', label: t('profile.menuHelp'), sub: t('profile.menuHelpSub'), action: 'help' },
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
              🌾 {user?.primaryCrop || t('profile.roleBadge')}
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
            { label: t('home.recentScans'), value: '12' },
            { label: t('nav.alerts'), value: '5' },
            { label: t('nav.farms'), value: '1' },
          ].map((s, idx) => (
            <div key={idx} className="flex-1 text-center py-4">
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="px-5 mt-5">
        <div className="card p-0 overflow-hidden divide-y divide-gray-50">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (item.href) {
                  window.location.href = item.href;
                } else if (item.action) {
                  openView(item.action);
                } else if (item.path) {
                  navigate(item.path);
                }
              }}
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
          ← {t('common.logout')}
        </button>

        <p className="text-center text-gray-300 text-xs mt-4 mb-2">{t('common.version')}</p>
      </div>

      <BottomTabBar />
    </div>
  );
}
