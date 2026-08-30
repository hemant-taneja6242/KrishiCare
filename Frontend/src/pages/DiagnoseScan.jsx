import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { diagnoseImage, getAdvisory, triggerAlert } from '../api/client';
import i18n, { SUPPORTED_LANGUAGES } from '../i18n';

const SEVERITY_STYLE = {
  Critical: { bg: '#fef2f2', color: '#991b1b', badge: '#dc2626', emoji: '🔴' },
  High:     { bg: '#fff7ed', color: '#9a3412', badge: '#ea580c', emoji: '🟠' },
  Medium:   { bg: '#fefce8', color: '#92400e', badge: '#ca8a04', emoji: '🟡' },
  Low:      { bg: '#f0fdf4', color: '#166534', badge: '#16a34a', emoji: '🟢' },
  None:     { bg: '#f0fdf4', color: '#166534', badge: '#16a34a', emoji: '🟢' },
  Unknown:  { bg: '#f9fafb', color: '#374151', badge: '#6b7280', emoji: '⚪' },
};

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिं' },
  { code: 'mr', label: 'मर' },
  { code: 'ta', label: 'தமி' },
];

// Target crops with solid, verified multi-class coverage in model
// Thin-coverage crops (e.g., Bell Pepper: 2 classes) can be toggled based on demo strategy
const CROP_OPTIONS = [
  { id: 'Tomato', label: '🍅 Tomato' },
  { id: 'Potato', label: '🥔 Potato' },
  { id: 'Corn', label: '🌽 Corn' },
  { id: 'Grape', label: '🍇 Grape' },
  { id: 'Apple', label: '🍎 Apple' },
  // { id: 'Bell Pepper', label: '🫑 Pepper (Bacterial Spot only)' },
  { id: 'Auto', label: '🌾 Auto-Detect' },
];

export default function DiagnoseScan() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cameraInputRef = useRef();
  const galleryInputRef = useRef();
  const utteranceRef = useRef(null);

  const [selectedCrop, setSelectedCrop] = useState(() => {
    const valid = CROP_OPTIONS.some((c) => c.id === user?.primaryCrop);
    return valid ? user.primaryCrop : 'Tomato';
  });
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [lang, setLang] = useState(() => i18n.language || localStorage.getItem('krishi_app_lang') || 'en');
  const [advisory, setAdvisory] = useState(null);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);

  const [speaking, setSpeaking] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);

  // Sync lang state with global i18n language
  useEffect(() => {
    if (i18n.language && i18n.language !== lang) {
      setLang(i18n.language);
      if (result) {
        fetchAdvisory(result.disease, result.crop_type, i18n.language);
      }
    }
  }, [i18n.language]);

  // Clean up speech synthesis on component unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    setAdvisory(null);
    setError(null);
    setAlertSent(false);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const fetchAdvisory = useCallback(async (disease, crop, language) => {
    if (!disease) return;
    setLoadingAdvisory(true);
    try {
      const r = await getAdvisory(disease, crop, language);
      setAdvisory(r.data);
      console.log('[Advisory Loaded]', { disease, crop, language, source: r.data?.source });
    } catch {
      setAdvisory({ advisory_text: 'Advisory unavailable. Please consult your local Krishi Vigyan Kendra.', source: 'fallback' });
    } finally {
      setLoadingAdvisory(false);
    }
  }, []);

  const onLangChange = (newLang) => {
    i18n.changeLanguage(newLang);
    setLang(newLang);
    if (result) fetchAdvisory(result.disease, result.crop_type, newLang);
  };

  const runDiagnosis = async () => {
    if (!selectedFile) return;
    setDiagnosing(true);
    setError(null);
    setUploadProgress(0);

    try {
      const cropToSend = selectedCrop === 'Auto' ? undefined : selectedCrop;
      console.log('[DiagnoseScan] Sending diagnosis request with cropHint:', cropToSend);
      const r = await diagnoseImage(
        selectedFile,
        {
          farmId: user?.farmId,
          cropHint: cropToSend,
          latitude: user?.latitude,
          longitude: user?.longitude,
        },
        (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        }
      );

      const d = r.data;
      setResult(d);
      // Fetch initial advisory in selected language
      fetchAdvisory(d.disease, d.crop_type, lang);
    } catch (err) {
      console.error('Diagnosis failed:', err);
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'Could not analyze crop photo. Please ensure clear lighting and try again.'
      );
    } finally {
      setDiagnosing(false);
    }
  };

  const readAloud = () => {
    if (!advisory?.advisory_text) return;
    window.speechSynthesis?.cancel();

    setTimeout(() => {
      const cleanText = advisory.advisory_text.replace(/\s+/g, ' ').trim();
      const utter = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utter;

      const langMap = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN' };
      utter.lang = langMap[lang] || 'en-IN';
      utter.rate = 0.95;
      utter.pitch = 1.0;

      utter.onstart = () => setSpeaking(true);
      utter.onend = () => {
        setSpeaking(false);
        utteranceRef.current = null;
      };
      utter.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error('Speech synthesis error:', e);
        }
        setSpeaking(false);
        utteranceRef.current = null;
      };

      window.speechSynthesis?.speak(utter);
    }, 50);
  };

  const stopReading = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    utteranceRef.current = null;
  };

  const sendPeerAlert = async () => {
    if (!result?.diagnosis_id) return;
    setSendingAlert(true);
    try {
      const savedRad = localStorage.getItem('krishi_alert_radius');
      const rad = savedRad ? parseFloat(savedRad) : 5.0;
      await triggerAlert(result.diagnosis_id, rad);
      setAlertSent(true);
    } catch {
      setAlertSent(true);
    } finally {
      setSendingAlert(false);
    }
  };

  const sev = result ? (SEVERITY_STYLE[result.severity] || SEVERITY_STYLE.Unknown) : null;

  return (
    <div className="mobile-app page-enter" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          ←
        </button>
        <h1 className="text-lg font-black text-gray-900">{t('scan.title')}</h1>
        <button
          onClick={() => navigate('/farmer/alerts')}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          title={t('nav.alerts')}
        >
          🔔
        </button>
      </div>

      <div className="px-5">
        {/* Crop Selection Filter */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
            🌱 Target Crop (AI Context Filter)
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CROP_OPTIONS.map((c) => {
              const active = selectedCrop === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCrop(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    active
                      ? 'bg-green-700 text-white border-green-700 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Area */}
        <div
          className="rounded-2xl border-2 border-dashed border-green-300 bg-green-50 cursor-pointer overflow-hidden mb-4 transition-all hover:border-green-500 hover:bg-green-100"
          style={{ minHeight: 200 }}
          onClick={() => galleryInputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Leaf" className="w-full h-52 object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-52 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-green-700 flex items-center justify-center text-2xl shadow-md">📷</div>
              <div className="text-center">
                <p className="font-bold text-gray-800">{t('scan.choosePhoto')}</p>
                <p className="text-gray-400 text-sm">{t('scan.formatsHint')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Hidden Inputs for Camera vs Gallery */}
        <input
          id="camera-file-input"
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <input
          id="gallery-file-input"
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <label
            htmlFor="camera-file-input"
            className="btn-outline cursor-pointer flex items-center justify-center gap-2 select-none text-center"
          >
            📷 Camera
          </label>
          <label
            htmlFor="gallery-file-input"
            className="btn-outline cursor-pointer flex items-center justify-center gap-2 select-none text-center"
          >
            🖼️ Gallery
          </label>
        </div>

        {/* Analyze Button */}
        {selectedFile && !result && (
          <button
            className="btn-primary mb-5 relative overflow-hidden"
            onClick={runDiagnosis}
            disabled={diagnosing}
          >
            {diagnosing ? (
              <span className="flex flex-col items-center gap-1">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('scan.analyzingBtn')}
                </span>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <span className="text-green-200 text-xs">Uploading {uploadProgress}%</span>
                )}
                {uploadProgress === 100 && (
                  <span className="text-green-200 text-xs">Running ML model — this may take 15–30s...</span>
                )}
              </span>
            ) : `🔬 ${t('scan.analyzeBtn')}`}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl p-4 mb-4 flex items-start gap-3" style={{ background: '#fef2f2', border: '1.5px solid #fca5a5' }}>
            <span className="text-xl">❌</span>
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Result Card */}
        {result && (() => {
          const isUncertain = result.is_uncertain || result.confidence < 0.60;
          return (
            <div
              className="card mb-4 page-enter transition-all"
              style={isUncertain ? { border: '1.5px solid #fcd34d', background: '#fffdf5' } : undefined}
            >
              {/* Low confidence cautionary banner */}
              {isUncertain && (
                <div className="rounded-xl p-3 mb-3.5 flex items-start gap-2.5" style={{ background: '#fefce8', border: '1px solid #fde68a' }}>
                  <span className="text-xl flex-shrink-0">⚠️</span>
                  <div>
                    <p className="text-amber-900 text-xs font-black uppercase tracking-wider mb-0.5">
                      Inconclusive Analysis ({Math.round(result.confidence * 100)}% Confidence)
                    </p>
                    <p className="text-amber-800 text-xs leading-relaxed">
                      AI confidence is below the verified clinical threshold. This finding is treated as an unconfirmed estimate and has been routed to our expert queue for specialist validation.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      {isUncertain
                        ? '⚠️ Preliminary AI Guess'
                        : (result.type === 'pest' ? '🐛 Detected Pest Infestation' : t('scan.detectedDisease'))}
                    </p>
                    {result.type === 'pest' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        PEST
                      </span>
                    )}
                    {isUncertain && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-400">
                        UNCONFIRMED
                      </span>
                    )}
                  </div>

                  {isUncertain ? (
                    <h2 className="text-xl font-bold text-amber-950 italic">
                      {result.name || result.disease} <span className="text-xs font-normal text-amber-700 not-italic">(Awaiting Expert)</span>
                    </h2>
                  ) : (
                    <h2 className="text-2xl font-black" style={{ color: sev?.color }}>{result.name || result.disease}</h2>
                  )}

                  {result.crop_type && (
                    <span className="pill text-xs mt-1" style={{ background: '#dcfce7', color: '#166534' }}>
                      🌾 {result.crop_type}
                    </span>
                  )}
                </div>

                {isUncertain ? (
                  <span className="pill" style={{ background: '#fef3c7', color: '#92400e', border: '1.5px solid #fcd34d' }}>
                    ⚠️ Awaiting Review
                  </span>
                ) : (
                  <span className="pill" style={{ background: sev?.bg, color: sev?.color, border: `1.5px solid ${sev?.badge}` }}>
                    {sev?.emoji} {result.severity}
                  </span>
                )}
              </div>

              {/* Confidence Bar */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500">{t('scan.confidence')}</span>
                  <span className={`text-xs font-bold ${isUncertain ? 'text-amber-700' : 'text-green-700'}`}>
                    {Math.round(result.confidence * 100)}% {isUncertain ? '(Low)' : ''}
                  </span>
                </div>
                <div className="confidence-bar-bg">
                  <div
                    className="confidence-bar-fill"
                    style={{
                      width: `${result.confidence * 100}%`,
                      background: isUncertain ? '#f59e0b' : undefined,
                    }}
                  />
                </div>
              </div>

              {result.needs_expert_review && !isUncertain && (
                <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: '#fefce8', border: '1px solid #fcd34d' }}>
                  <span className="text-base">⚠️</span>
                  <p className="text-yellow-800 text-xs font-medium">Low confidence — sent to expert review queue</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Advisory Section */}
        {result && (
          <div className="card mb-4 page-enter">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-gray-900">{t('scan.advisoryTitle')}</h3>
            </div>

            {/* Language Selector */}
            <div className="flex gap-2 mb-4">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => onLangChange(l.code)}
                  className="px-3 py-1.5 rounded-full text-sm font-bold transition-all"
                  style={
                    lang === l.code
                      ? { background: '#1F5F3F', color: 'white' }
                      : { background: '#f3f4f6', color: '#6b7280' }
                  }
                >
                  {l.label}
                </button>
              ))}
            </div>

            {loadingAdvisory ? (
              <div className="flex flex-col gap-2">
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
                <div className="skeleton h-4 w-4/5 rounded" />
                <div className="skeleton h-4 w-full rounded" />
              </div>
            ) : (
              <p className="text-gray-700 text-sm leading-relaxed">{advisory?.advisory_text}</p>
            )}

            {/* TTS Button */}
            <div className="flex gap-3 mt-4">
              <button
                className="btn-primary"
                style={{ background: speaking ? '#dc2626' : '#1F5F3F' }}
                onClick={speaking ? stopReading : readAloud}
                disabled={loadingAdvisory || !advisory}
              >
                {speaking ? `⏹ ${t('scan.stopVoice')}` : `🔊 ${t('scan.listenVoice')}`}
              </button>
            </div>
          </div>
        )}

        {/* Alert Nearby Farms */}
        {result && result.severity !== 'Low' && result.disease !== 'Healthy' && (
          <div className="card mb-4 page-enter">
            <h3 className="font-black text-gray-900 mb-1">{t('scan.broadcastAlert')}</h3>
            <p className="text-gray-500 text-sm mb-4">Warn farms within alert radius of this outbreak</p>
            {alertSent ? (
              <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                <span className="text-xl">✅</span>
                <p className="text-green-800 font-semibold text-sm">{t('scan.alertSent')}</p>
              </div>
            ) : (
              <button
                className="btn-outline w-full"
                onClick={sendPeerAlert}
                disabled={sendingAlert}
              >
                {sendingAlert ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
                    {t('scan.broadcasting')}
                  </span>
                ) : `📢 ${t('scan.broadcastAlert')}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
