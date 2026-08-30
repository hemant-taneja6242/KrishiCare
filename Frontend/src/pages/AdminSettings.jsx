import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminSidebar from '../components/AdminSidebar';
import { getReviewThreshold, updateReviewThreshold, getActiveExperts } from '../api/client';
import i18n from '../i18n';

const LANGS = [
  { code: 'en', label: 'English (EN)' },
  { code: 'hi', label: 'हिन्दी (HI)' },
  { code: 'mr', label: 'मराठी (MR)' },
  { code: 'ta', label: 'தமிழ் (TA)' },
];

export default function AdminSettings() {
  const { t } = useTranslation();

  // Threshold State
  const [threshold, setThreshold] = useState(85);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(null);
  const [thresholdToast, setThresholdToast] = useState(null);

  // Escalation Contact State
  const [daoName, setDaoName] = useState(() => localStorage.getItem('krishi_dao_name') || 'Shri V. S. Pawar');
  const [daoPhone, setDaoPhone] = useState(() => localStorage.getItem('krishi_dao_phone') || '+91 98230 45678');
  const [daoEmail, setDaoEmail] = useState(() => localStorage.getItem('krishi_dao_email') || 'dao.nashik@agri.maharashtra.gov.in');
  const [daoDistrict, setDaoDistrict] = useState(() => localStorage.getItem('krishi_dao_district') || 'Nashik District');
  const [savingDao, setSavingDao] = useState(false);
  const [daoToast, setDaoToast] = useState(null);

  // Experts State
  const [experts, setExperts] = useState([]);
  const [loadingExperts, setLoadingExperts] = useState(true);

  // Language preference bound to shared global i18n
  const [selectedLang, setSelectedLang] = useState(() => i18n.language || localStorage.getItem('krishi_app_lang') || 'en');

  useEffect(() => {
    if (i18n.language && i18n.language !== selectedLang) {
      setSelectedLang(i18n.language);
    }
  }, [i18n.language]);

  // Load initial threshold & experts
  useEffect(() => {
    getReviewThreshold()
      .then((res) => {
        if (res.data?.threshold != null) {
          const t = Math.round(res.data.threshold * 100);
          setThreshold(t);
          localStorage.setItem('krishi_review_threshold', String(t));
        }
      })
      .catch((err) => console.error('Failed to load review threshold:', err));

    getActiveExperts()
      .then((res) => {
        setExperts(res.data?.experts || []);
      })
      .catch((err) => console.error('Failed to load experts:', err))
      .finally(() => setLoadingExperts(false));
  }, []);

  const handleSaveThreshold = async () => {
    setSavingThreshold(true);
    setThresholdToast(null);
    try {
      const val = threshold / 100;
      const res = await updateReviewThreshold(val);
      localStorage.setItem('krishi_review_threshold', String(threshold));
      window.dispatchEvent(new Event('krishi_threshold_updated'));
      setPendingQueueCount(res.data?.pending_count);
      setThresholdToast({
        type: 'success',
        message: `Threshold set to ${threshold}%. Pending expert queue updated to ${res.data?.pending_count} cases.`,
      });
      setTimeout(() => setThresholdToast(null), 4000);
    } catch (err) {
      console.error('Threshold update failed:', err);
      setThresholdToast({
        type: 'error',
        message: 'Could not update threshold. Ensure value is between 50% and 95%.',
      });
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleSaveDao = (e) => {
    e.preventDefault();
    setSavingDao(true);
    localStorage.setItem('krishi_dao_name', daoName);
    localStorage.setItem('krishi_dao_phone', daoPhone);
    localStorage.setItem('krishi_dao_email', daoEmail);
    localStorage.setItem('krishi_dao_district', daoDistrict);
    setSavingDao(false);
    setDaoToast('District Agriculture Officer contact saved successfully.');
    setTimeout(() => setDaoToast(null), 3000);
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
        {/* Top Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">System Admin Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure system-wide AI triage thresholds, escalation protocols, expert reviewer roster, and regional languages.
          </p>
        </div>

        <div className="flex flex-col gap-6 max-w-4xl">
          {/* Section 1: AI Review Confidence Threshold */}
          <div className="card page-enter">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-lg font-black text-gray-900">AI Confidence Review Threshold</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Controls the confidence cutoff for automated farmer confirmation vs mandatory human agronomist review.
                </p>
              </div>
              <span
                className="pill text-xs font-bold"
                style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}
              >
                Admin Configurable
              </span>
            </div>

            {thresholdToast && (
              <div
                className="rounded-xl p-3 my-3 text-xs font-bold flex items-center gap-2 page-enter"
                style={{
                  background: thresholdToast.type === 'error' ? '#fef2f2' : '#f0fdf4',
                  color: thresholdToast.type === 'error' ? '#991b1b' : '#166534',
                  border: `1px solid ${thresholdToast.type === 'error' ? '#fca5a5' : '#86efac'}`,
                }}
              >
                <span>{thresholdToast.type === 'error' ? '❌' : '✅'}</span>
                <span>{thresholdToast.message}</span>
              </div>
            )}

            <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200 mt-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">Minimum Auto-Confirmation Confidence:</span>
                <span className="text-xl font-black text-green-700">{threshold}% Confidence</span>
              </div>

              <input
                type="range"
                min="50"
                max="95"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-700"
              />

              <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                <span>50% (Strict Quality Bar)</span>
                <span className="font-bold text-green-800">85% (Recommended Default)</span>
                <span>95% (Lenient Quality Bar)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-gray-500">
                <span>💡 Diagnoses with model confidence below <strong>{threshold}%</strong> are routed to the <strong>Expert Review Queue</strong>.</span>
                {pendingQueueCount != null && (
                  <span className="block text-green-800 font-bold mt-1">
                    Current Pending Queue: {pendingQueueCount} items
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveThreshold}
                disabled={savingThreshold}
                className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800 transition-colors shadow-sm shrink-0"
              >
                {savingThreshold ? 'Saving...' : '💾 Save Threshold'}
              </button>
            </div>
          </div>

          {/* Section 2: Escalation Contact */}
          <div className="card page-enter">
            <h2 className="text-lg font-black text-gray-900 mb-1">Escalation Protocol Contact</h2>
            <p className="text-gray-400 text-xs mb-4">
              District Agriculture Officer (DAO) designated for emergency disease outbreak dispatch.
            </p>

            {daoToast && (
              <div className="rounded-xl p-3 mb-4 bg-green-50 border border-green-200 text-xs text-green-800 font-bold flex items-center gap-2 page-enter">
                <span>✅</span>
                <span>{daoToast}</span>
              </div>
            )}

            <form onSubmit={handleSaveDao} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Officer Name & Designation</label>
                  <input
                    type="text"
                    value={daoName}
                    onChange={(e) => setDaoName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-green-600 font-medium text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Assigned District Jurisdiction</label>
                  <input
                    type="text"
                    value={daoDistrict}
                    onChange={(e) => setDaoDistrict(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-green-600 font-medium text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Direct Helpline / Emergency Phone</label>
                  <input
                    type="tel"
                    value={daoPhone}
                    onChange={(e) => setDaoPhone(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-green-600 font-medium text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Official Government Email</label>
                  <input
                    type="email"
                    value={daoEmail}
                    onChange={(e) => setDaoEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-green-600 font-medium text-gray-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingDao}
                  className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800 transition-colors shadow-sm"
                >
                  {savingDao ? 'Saving...' : '💾 Save Escalation Contact'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Active Experts Roster */}
          <div className="card page-enter">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-lg font-black text-gray-900">Active Expert Reviewers</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Agronomists, pathologists, and extension scientists authorized for diagnostic queue validation.
                </p>
              </div>
              <span
                className="pill text-xs font-bold"
                style={{ background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd' }}
              >
                {experts.length} Experts Registered
              </span>
            </div>

            {loadingExperts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">
                {experts.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-start justify-between gap-3 hover:border-gray-300 transition"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{exp.avatar || '👩‍🔬'}</span>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-snug">{exp.name}</p>
                        <p className="text-xs text-gray-500">{exp.specialization}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{exp.affiliation}</p>
                      </div>
                    </div>

                    <span className="pill text-xs font-bold bg-green-100 text-green-800 border border-green-200 shrink-0">
                      ● {exp.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Regional Language Preference */}
          <div className="card page-enter">
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
