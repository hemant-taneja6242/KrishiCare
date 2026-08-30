import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminSidebar from '../components/AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { getReviewThreshold } from '../api/client';
import i18n from '../i18n';

const LANGS = [
  { code: 'en', label: 'English (EN)' },
  { code: 'hi', label: 'हिन्दी (HI)' },
  { code: 'mr', label: 'मराठी (MR)' },
  { code: 'ta', label: 'தமிழ் (TA)' },
];

export default function ExpertSettings() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const [reviewThreshold, setReviewThreshold] = useState(() => {
    const cached = localStorage.getItem('krishi_review_threshold');
    return cached ? parseInt(cached, 10) : 85;
  });

  const fetchLiveThreshold = () => {
    getReviewThreshold()
      .then((res) => {
        if (res.data?.threshold != null) {
          const t = Math.round(res.data.threshold * 100);
          setReviewThreshold(t);
          localStorage.setItem('krishi_review_threshold', String(t));
        }
      })
      .catch((err) => console.error('Failed to load review threshold:', err));
  };

  useEffect(() => {
    fetchLiveThreshold();

    const handleStorage = (e) => {
      if (e.key === 'krishi_review_threshold' && e.newValue) {
        setReviewThreshold(parseInt(e.newValue, 10));
      }
    };
    const handleCustomUpdate = () => fetchLiveThreshold();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('krishi_threshold_updated', handleCustomUpdate);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('krishi_threshold_updated', handleCustomUpdate);
    };
  }, []);

  // Profile preferences
  const [name, setName] = useState(() => localStorage.getItem('expert_name') || user?.name || 'Dr. Priya Sharma');
  const [title, setTitle] = useState(() => localStorage.getItem('expert_title') || 'Senior Plant Pathologist & Epidemiologist');
  const [affiliation, setAffiliation] = useState(() => localStorage.getItem('expert_affiliation') || 'ICAR - National Research Centre for Grapes, Pune');

  // Notification toggles
  const [notifyNewQueue, setNotifyNewQueue] = useState(() => {
    const saved = localStorage.getItem('expert_notify_queue');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [notifyCritical, setNotifyCritical] = useState(() => {
    const saved = localStorage.getItem('expert_notify_critical');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Language preference bound to shared global i18n instance & krishi_app_lang
  const [selectedLang, setSelectedLang] = useState(() => i18n.language || localStorage.getItem('krishi_app_lang') || 'en');

  useEffect(() => {
    if (i18n.language && i18n.language !== selectedLang) {
      setSelectedLang(i18n.language);
    }
  }, [i18n.language]);

  // Feedback state
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem('expert_name', name);
    localStorage.setItem('expert_title', title);
    localStorage.setItem('expert_affiliation', affiliation);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleToggleQueue = () => {
    const next = !notifyNewQueue;
    setNotifyNewQueue(next);
    localStorage.setItem('expert_notify_queue', JSON.stringify(next));
  };

  const handleToggleCritical = () => {
    const next = !notifyCritical;
    setNotifyCritical(next);
    localStorage.setItem('expert_notify_critical', JSON.stringify(next));
  };

  const handleLangSelect = (code) => {
    i18n.changeLanguage(code);
    setSelectedLang(code);
    localStorage.setItem('krishi_app_lang', code);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-content px-8 py-8 overflow-y-auto" style={{ maxHeight: '100vh' }}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Expert Review Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure your review workflow preferences, notification alerts, and reviewer profile.
          </p>
        </div>

        {savedSuccess && (
          <div className="rounded-xl p-3.5 mb-6 bg-green-50 border border-green-300 text-sm text-green-800 flex items-center gap-2 page-enter">
            <span>✅</span>
            <span className="font-semibold">Settings and profile details saved successfully!</span>
          </div>
        )}

        <div className="flex flex-col gap-6 max-w-3xl">
          {/* Section 1: Reviewer Profile */}
          <div className="card">
            <h2 className="text-lg font-black text-gray-900 mb-1">Reviewer Profile</h2>
            <p className="text-gray-400 text-xs mb-4">Your professional information displayed on validated farmer advisories.</p>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-green-500 transition font-medium text-gray-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Specialization & Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-green-500 transition font-medium text-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Institution / Affiliation</label>
                  <input
                    type="text"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-green-500 transition font-medium text-gray-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800 transition-colors shadow-sm"
                >
                  💾 Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: AI Review Threshold */}
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-black text-gray-900">AI Confidence Review Threshold</h2>
              <span className="pill text-xs font-bold" style={{ background: '#fef3c7', color: '#92400e', border: '1.5px solid #fcd34d' }}>
                🔒 System Configured (Read-Only)
              </span>
            </div>
            <p className="text-gray-400 text-xs mb-4">
              Determines which crop leaf diagnoses require mandatory review before auto-confirmation.
            </p>

            <div className="rounded-xl p-4 bg-gray-100/75 border border-gray-200 mb-3 select-none">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">Review Threshold</span>
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-gray-200 text-gray-600 font-semibold border border-gray-300">
                    🔒 Locked for Expert
                  </span>
                </div>
                <span className="text-base font-black text-green-700">{reviewThreshold}% Confidence</span>
              </div>
              <div className="relative py-1">
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={reviewThreshold}
                  disabled
                  readOnly
                  aria-readonly="true"
                  title="Read-only: AI Confidence Threshold is configured by Administrators in Admin Settings"
                  className="w-full h-2.5 bg-gray-300 rounded-lg appearance-none cursor-not-allowed opacity-60 pointer-events-none accent-green-700"
                />
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400 mt-1.5">
                <span>50% (Strict)</span>
                <span className="font-bold text-green-800 bg-green-100 px-2.5 py-0.5 rounded-full border border-green-300 shadow-xs">
                  {reviewThreshold}% (Active)
                </span>
                <span>95% (Lenient)</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-xl p-3.5 leading-relaxed">
              🔒 <strong>Configured by system admin</strong> (<code className="font-mono text-amber-950 bg-amber-100/80 px-1 py-0.5 rounded font-bold">EXPERT_REVIEW_THRESHOLD = {(reviewThreshold / 100).toFixed(2)}</code>). Diagnoses below {reviewThreshold}% confidence automatically route to your review queue; high-confidence or healthy scans bypass review to avoid backlog.
            </p>
          </div>

          {/* Section 3: Notification Preferences */}
          <div className="card">
            <h2 className="text-lg font-black text-gray-900 mb-1">Notification Preferences</h2>
            <p className="text-gray-400 text-xs mb-4">Manage alerts when new items arrive in your queue or regional outbreaks occur.</p>

            <div className="flex flex-col divide-y divide-gray-100">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">Queue Notifications</p>
                  <p className="text-xs text-gray-400">Notify me immediately when a new diagnosis arrives in my review queue.</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleQueue}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    notifyNewQueue ? 'bg-green-700' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      notifyNewQueue ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">Critical Outbreak Alerts</p>
                  <p className="text-xs text-gray-400">Receive high-priority alerts for cluster diseases (3+ cases in 5km).</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleCritical}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    notifyCritical ? 'bg-green-700' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      notifyCritical ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Regional Language Preference */}
          <div className="card">
            <h2 className="text-lg font-black text-gray-900 mb-1">{t('language.title')}</h2>
            <p className="text-gray-400 text-xs mb-4">{t('language.subtitle')}</p>

            <div className="flex gap-3 flex-wrap">
              {LANGS.map((lang) => {
                const isActive = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLangSelect(lang.code)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer"
                    style={
                      isActive
                        ? {
                            background: '#1F5F3F',
                            color: 'white',
                            border: '2px solid #1F5F3F',
                            boxShadow: '0 4px 12px rgba(31, 95, 63, 0.25)',
                          }
                        : {
                            background: '#f3f4f6',
                            color: '#4b5563',
                            border: '1.5px solid #e5e7eb',
                          }
                    }
                  >
                    <span>{lang.label}</span>
                    {isActive && (
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
