import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AdminSidebar from '../components/AdminSidebar';
import { listAlerts, resolveAlert, escalateAlert } from '../api/client';

const SEVERITY_STYLE = {
  Critical: { bg: '#fef2f2', color: '#991b1b', badge: '#dc2626', emoji: '🔴' },
  High:     { bg: '#fff7ed', color: '#9a3412', badge: '#ea580c', emoji: '🟠' },
  Medium:   { bg: '#fefce8', color: '#92400e', badge: '#ca8a04', emoji: '🟡' },
  Low:      { bg: '#f0fdf4', color: '#166534', badge: '#16a34a', emoji: '🟢' },
  Unknown:  { bg: '#f9fafb', color: '#374151', badge: '#6b7280', emoji: '⚪' },
};

export default function AdminAlerts() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Escalated' | 'Resolved'
  const [actionLoading, setActionLoading] = useState({});
  const [actionNotice, setActionNotice] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await listAlerts();
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolve = async (alertId) => {
    setActionLoading((prev) => ({ ...prev, [alertId]: 'resolving' }));
    try {
      await resolveAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'Resolved' } : a))
      );
      setActionNotice({ type: 'success', message: `Alert #${alertId} marked as Resolved.` });
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      console.error('Resolve failed:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [alertId]: null }));
    }
  };

  const handleEscalate = async (alertId) => {
    setActionLoading((prev) => ({ ...prev, [alertId]: 'escalating' }));
    try {
      await escalateAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'Escalated' } : a))
      );
      setActionNotice({ type: 'escalated', message: `Alert #${alertId} escalated to District Agriculture Officer.` });
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      console.error('Escalate failed:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [alertId]: null }));
    }
  };

  // Extract unique districts
  const districts = useMemo(() => {
    const set = new Set(alerts.map((a) => a.district).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [alerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (statusFilter === 'Active' && a.status === 'Resolved') return false;
      if (statusFilter === 'Escalated' && a.status !== 'Escalated') return false;
      if (statusFilter === 'Resolved' && a.status !== 'Resolved') return false;

      if (severityFilter !== 'All' && a.severity !== severityFilter) return false;
      if (districtFilter !== 'All' && a.district !== districtFilter) return false;
      return true;
    });
  }, [alerts, statusFilter, severityFilter, districtFilter]);

  const activeAlertsCount = useMemo(() => {
    return alerts.filter((a) => a.status !== 'Resolved').length;
  }, [alerts]);

  const fmtTime = (iso) => {
    if (!iso) return 'Recent';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-content px-8 py-8 overflow-y-auto" style={{ maxHeight: '100vh' }}>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900">Active Alerts</h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-black text-white"
                style={{ background: '#ea580c' }}
              >
                {activeAlertsCount} {activeAlertsCount === 1 ? 'Active Alert' : 'Active Alerts'}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Real-time regional outbreak surveillance across monitored Maharashtra agricultural blocks.
            </p>
          </div>

          <button
            onClick={fetchAlerts}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition shadow-sm"
          >
            🔄 Refresh Feeds
          </button>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div
            className="rounded-xl p-3.5 mb-6 text-sm font-semibold flex items-center gap-2 page-enter"
            style={{
              background: actionNotice.type === 'escalated' ? '#fff7ed' : '#f0fdf4',
              color: actionNotice.type === 'escalated' ? '#c2410c' : '#166534',
              border: `1px solid ${actionNotice.type === 'escalated' ? '#fdba74' : '#86efac'}`,
            }}
          >
            <span>{actionNotice.type === 'escalated' ? '🚨' : '✅'}</span>
            <span>{actionNotice.message}</span>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="card mb-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Status:</span>
              {['All', 'Active', 'Escalated', 'Resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === st
                      ? 'bg-green-700 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Severity and District Dropdowns */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500">Severity:</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium bg-white focus:outline-none focus:border-green-600"
                >
                  <option value="All">All Severities</option>
                  <option value="Critical">🔴 Critical</option>
                  <option value="High">🟠 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500">District:</label>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium bg-white focus:outline-none focus:border-green-600"
                >
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d === 'All' ? 'All Districts' : `📍 ${d}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Grid / List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-44 rounded-2xl" />
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="card text-center py-16">
            <span className="text-4xl block mb-2">🛡️</span>
            <p className="text-base font-black text-gray-800">No matching alerts found</p>
            <p className="text-xs text-gray-400 mt-1">Try clearing or broadening your filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAlerts.map((alert) => {
              const sev = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.Unknown;
              const isResolved = alert.status === 'Resolved';
              const isEscalated = alert.status === 'Escalated';

              return (
                <div
                  key={alert.id}
                  className="card p-5 page-enter transition-shadow hover:shadow-md flex flex-col justify-between"
                  style={{
                    borderLeft: `5px solid ${sev.badge}`,
                    opacity: isResolved ? 0.7 : 1,
                  }}
                >
                  <div>
                    {/* Card Top: Disease & Badges */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-gray-900 text-base">{alert.disease}</h3>
                          {isEscalated && (
                            <span className="pill text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                              🚨 Escalated
                            </span>
                          )}
                          {isResolved && (
                            <span className="pill text-xs font-bold bg-gray-100 text-gray-600">
                              ✓ Resolved
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          📍 {alert.district} District • {alert.farms_affected} Farms Affected
                        </p>
                      </div>

                      <span
                        className="pill text-xs font-bold"
                        style={{
                          background: sev.bg,
                          color: sev.color,
                          border: `1px solid ${sev.badge}`,
                        }}
                      >
                        {sev.emoji} {alert.severity}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-gray-700 text-xs leading-relaxed mt-2 mb-4 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      {alert.message}
                    </p>
                  </div>

                  {/* Card Bottom: Timestamp & Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                    <span className="text-gray-400 font-medium">🕒 {fmtTime(alert.created_at)}</span>

                    <div className="flex items-center gap-2">
                      {!isResolved && (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          disabled={actionLoading[alert.id]}
                          className="px-3 py-1.5 rounded-lg font-bold text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition"
                        >
                          {actionLoading[alert.id] === 'resolving' ? 'Updating...' : '✓ Resolve'}
                        </button>
                      )}

                      {!isResolved && !isEscalated && (
                        <button
                          onClick={() => handleEscalate(alert.id)}
                          disabled={actionLoading[alert.id]}
                          className="px-3 py-1.5 rounded-lg font-bold text-xs bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 transition"
                        >
                          {actionLoading[alert.id] === 'escalating' ? 'Escalating...' : '🚨 Escalate'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
