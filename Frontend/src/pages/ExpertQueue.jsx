import React, { useEffect, useState, useCallback } from 'react';
import { getExpertQueue, validateDiagnosis } from '../api/client';
import AdminSidebar from '../components/AdminSidebar';

const SEVERITY_STYLE = {
  Critical: { bg: '#fef2f2', color: '#991b1b', badge: '#dc2626' },
  High:     { bg: '#fff7ed', color: '#9a3412', badge: '#ea580c' },
  Medium:   { bg: '#fefce8', color: '#92400e', badge: '#ca8a04' },
  Low:      { bg: '#f0fdf4', color: '#166534', badge: '#16a34a' },
  None:     { bg: '#f0fdf4', color: '#166534', badge: '#16a34a' },
  Unknown:  { bg: '#f9fafb', color: '#374151', badge: '#6b7280' },
};

const STATUS_FILTERS = ['All', 'pending', 'approved', 'rejected', 'auto_confirmed'];

export default function ExpertQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [editNote, setEditNote] = useState({});
  const [editDisease, setEditDisease] = useState({});

  const fetchQueue = useCallback(() => {
    setLoading(true);
    getExpertQueue()
      .then((r) => setQueue(r.data || []))
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const displayed = filter === 'All' ? queue : queue.filter((d) => d.expert_status === filter);

  const counts = {
    All: queue.length,
    pending: queue.filter(d => d.expert_status === 'pending').length,
    approved: queue.filter(d => d.expert_status === 'approved').length,
    rejected: queue.filter(d => d.expert_status === 'rejected').length,
    auto_confirmed: queue.filter(d => d.expert_status === 'auto_confirmed').length,
  };

  const pending = counts.pending;

  const doAction = async (id, action) => {
    setActionLoading((prev) => ({ ...prev, [id]: action }));
    try {
      await validateDiagnosis(id, action, {
        correctedDisease: editDisease[id] || undefined,
        note: editNote[id] || undefined,
      });
      fetchQueue();
      setExpandedId(null);
      setFilter(action === 'approve' ? 'approved' : 'rejected');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Action failed. Please try again.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const fmtDate = (s) => {
    try { return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-content px-8 py-8 overflow-y-auto" style={{ maxHeight: '100vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Expert Review Queue</h1>
            <p className="text-gray-400 text-sm mt-1">AI diagnoses below confidence threshold requiring expert validation</p>
          </div>
          <div className="flex items-center gap-3">
            {pending > 0 && (
              <span className="pill" style={{ background: '#fff7ed', color: '#9a3412', border: '1.5px solid #fdba74' }}>
                ⏳ {pending} Pending
              </span>
            )}
            <button
              onClick={fetchQueue}
              className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors"
            >
              ↺ Refresh
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all capitalize"
              style={
                filter === f
                  ? { background: '#1F5F3F', color: 'white' }
                  : { background: '#f3f4f6', color: '#6b7280' }
              }
            >
              {f.replace('_', ' ')} ({counts[f] || 0})
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-xl font-bold text-gray-700">Queue is clear</p>
            <p className="text-gray-400 mt-2">No {filter !== 'All' ? filter : ''} diagnoses at this time</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayed.map((d) => {
              const sev = SEVERITY_STYLE[d.severity] || SEVERITY_STYLE.Low;
              const isExpanded = expandedId === d.id;
              const busy = actionLoading[d.id];

              return (
                <div
                  key={d.id}
                  className="card transition-all page-enter"
                  style={{ padding: isExpanded ? 0 : undefined, overflow: 'hidden' }}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-5 p-5">
                    {/* Leaf image placeholder */}
                    <div
                      className="w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center text-3xl shadow-md overflow-hidden"
                      style={{ background: sev.bg }}
                    >
                      {d.image_path ? (
                        <img
                          src={`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/uploads/${d.image_path.split(/[/\\]/).pop()}`}
                          alt="leaf"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '🌿'; }}
                        />
                      ) : '🌿'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-gray-900 text-lg truncate">{d.disease_label}</p>
                        {d.type === 'pest' && (
                          <span className="pill text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex-shrink-0">
                            🐛 Pest
                          </span>
                        )}
                        <span className="pill text-xs flex-shrink-0" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.badge}` }}>
                          {d.severity}
                        </span>
                      </div>
                      {d.crop && (
                        <span className="pill text-xs mb-2" style={{ background: '#dcfce7', color: '#166534' }}>🌾 {d.crop}</span>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400 font-medium">Confidence</span>
                        <div className="flex-1 max-w-32 confidence-bar-bg">
                          <div className="confidence-bar-fill" style={{ width: `${(d.confidence * 100).toFixed(0)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-green-700">{(d.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="pill text-xs" style={{
                          background: d.expert_status === 'pending' ? '#fff7ed' : d.expert_status === 'approved' ? '#f0fdf4' : '#fef2f2',
                          color: d.expert_status === 'pending' ? '#9a3412' : d.expert_status === 'approved' ? '#166534' : '#991b1b',
                        }}>
                          {d.expert_status}
                        </span>
                        {d.farm_id && <span className="text-xs text-gray-400">Farm #{d.farm_id}</span>}
                        <span className="text-xs text-gray-400">{fmtDate(d.created_at)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {d.expert_status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => doAction(d.id, 'approve')}
                          disabled={!!busy}
                          className="px-5 py-2 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800 transition-colors disabled:opacity-50"
                        >
                          {busy === 'approve' ? '...' : '✅ Approve'}
                        </button>
                        <button
                          onClick={() => doAction(d.id, 'reject')}
                          disabled={!!busy}
                          className="px-5 py-2 rounded-xl border-2 border-red-500 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {busy === 'reject' ? '...' : '❌ Reject'}
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : d.id)}
                          className="px-5 py-2 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors"
                        >
                          {isExpanded ? '▲ Close' : '✏️ Edit'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Edit Panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50 page-enter">
                      <h3 className="font-bold text-gray-900 mb-4">Edit Diagnosis Details</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                            Correct Disease Label
                          </label>
                          <input
                            type="text"
                            placeholder={d.disease_label}
                            value={editDisease[d.id] || ''}
                            onChange={(e) => setEditDisease((p) => ({ ...p, [d.id]: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                            Expert Note
                          </label>
                          <input
                            type="text"
                            placeholder="Add a note for the farmer..."
                            value={editNote[d.id] || ''}
                            onChange={(e) => setEditNote((p) => ({ ...p, [d.id]: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition"
                          />
                        </div>
                      </div>

                      {d.advisory_text && (
                        <div className="rounded-xl p-4 bg-white border border-gray-100 mb-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current Advisory</p>
                          <p className="text-sm text-gray-600">{d.advisory_text}</p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => doAction(d.id, 'approve')}
                          disabled={!!busy}
                          className="btn-primary"
                          style={{ width: 'auto', padding: '10px 24px' }}
                        >
                          {busy ? '...' : '✅ Approve with Edits'}
                        </button>
                        <button
                          onClick={() => doAction(d.id, 'reject')}
                          disabled={!!busy}
                          className="btn-danger-outline"
                          style={{ width: 'auto', padding: '10px 24px' }}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
