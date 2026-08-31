import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getDiagnoseHistory } from '../api/client';
import BottomTabBar from '../components/BottomTabBar';

const SEVERITY_STYLE = {
  Critical: { bg: '#fef2f2', color: '#991b1b', badge: '#dc2626', emoji: '🔴' },
  High:     { bg: '#fff7ed', color: '#9a3412', badge: '#ea580c', emoji: '🟠' },
  Medium:   { bg: '#fefce8', color: '#92400e', badge: '#ca8a04', emoji: '🟡' },
  Low:      { bg: '#f0fdf4', color: '#166534', badge: '#16a34a', emoji: '🟢' },
  None:     { bg: '#f0fdf4', color: '#166534', badge: '#16a34a', emoji: '🟢' },
  Unknown:  { bg: '#f9fafb', color: '#374151', badge: '#6b7280', emoji: '⚪' },
};

export default function FarmerHistory() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDiagnoseHistory(user?.farmId);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError('Could not load diagnosis history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-app bg-gray-50 min-h-screen pb-24 page-enter">
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          ←
        </button>
        <h1 className="text-xl font-black text-gray-900">Scan History</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 mt-5">
        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="skeleton h-28 w-full rounded-2xl" />
            <div className="skeleton h-28 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
            <span className="text-xl">❌</span>
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">📸</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Scans Yet</h3>
            <p className="text-gray-500 text-sm">Your crop diagnosis history will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {history.map((scan) => {
              const sev = SEVERITY_STYLE[scan.severity] || SEVERITY_STYLE.Unknown;
              const date = new Date(scan.created_at || Date.now()).toLocaleDateString();
              
              return (
                <div key={scan.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 break-words">{scan.disease_label}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{scan.crop} • {date}</p>
                    </div>
                    <span 
                      className="px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                      style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.badge}` }}
                    >
                      {sev.emoji} {scan.severity}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-semibold uppercase">Confidence</span>
                      <span className="text-xs font-bold text-gray-900">{Math.round(scan.confidence * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-semibold uppercase">Status</span>
                      <span className={`text-xs font-bold ${
                        scan.expert_status === 'pending' ? 'text-amber-600' :
                        scan.expert_status === 'approved' ? 'text-green-600' :
                        scan.expert_status === 'auto_confirmed' ? 'text-blue-600' :
                        'text-red-600'
                      }`}>
                        {scan.expert_status.replace('_', ' ').toUpperCase()}
                      </span>
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
