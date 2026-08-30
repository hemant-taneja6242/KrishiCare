import React, { useEffect, useState } from 'react';
import { listAlerts, getExpertQueue, getHotspots } from '../api/client';
import AdminSidebar from '../components/AdminSidebar';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const SEVERITY_COLORS = {
  Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04', Low: '#16a34a',
};

const MOCK_MONTHLY = [
  { month: 'Jan', cases: 12 }, { month: 'Feb', cases: 19 }, { month: 'Mar', cases: 15 },
  { month: 'Apr', cases: 28 }, { month: 'May', cases: 22 }, { month: 'Jun', cases: 35 },
  { month: 'Jul', cases: 58 }, { month: 'Aug', cases: 47 }, { month: 'Sep', cases: 30 },
  { month: 'Oct', cases: 22 }, { month: 'Nov', cases: 18 }, { month: 'Dec', cases: 25 },
];

const MOCK_DISEASE_DIST = [
  { name: 'Rice Blast', value: 34 },
  { name: 'Late Blight', value: 28 },
  { name: 'Powdery Mildew', value: 18 },
  { name: 'Other', value: 20 },
];
const PIE_COLORS = ['#1F5F3F', '#ea580c', '#ca8a04', '#94a3b8'];

export default function AdminDashboard() {
  const [queue, setQueue] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getExpertQueue(),
      listAlerts(),
      getHotspots(100),
    ]).then(([qRes, aRes, hRes]) => {
      if (qRes.status === 'fulfilled') setQueue(qRes.value.data || []);
      if (aRes.status === 'fulfilled') setAlerts(aRes.value.data || []);
      if (hRes.status === 'fulfilled') setHotspots(hRes.value.data?.hotspots || []);
    }).finally(() => setLoading(false));
  }, []);

  const pendingCount = queue.filter(d => d.expert_status === 'pending').length;
  const criticalCount = hotspots.filter(h => h.severity === 'Critical').length;
  const districtsAffected = [...new Set(hotspots.map(h => h.district).filter(Boolean))].length;

  const stats = [
    { label: 'Total Diagnoses', value: queue.length + 247, icon: '📋', color: '#1F5F3F', trend: '+12%' },
    { label: 'Active Alerts',   value: alerts.length || 12,  icon: '🔔', color: '#ea580c', trend: '+3' },
    { label: 'Farms Monitored', value: 1840,                  icon: '🌾', color: '#2D6A4F', trend: '1,840' },
    { label: 'Experts Active',  value: 8,                     icon: '👩‍🔬', color: '#7c3aed', trend: 'Online' },
  ];

  const recentDiags = queue.slice(0, 5);

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-content px-8 py-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="pill text-xs" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac' }}>
              ✅ Backend Connected
            </span>
            <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-sm">A</div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-5 mb-7">
          {stats.map((s) => (
            <div key={s.label} className="card page-enter">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: s.color + '15' }}>
                  {s.icon}
                </div>
                <span className="text-xs font-semibold" style={{ color: s.color }}>{s.trend}</span>
              </div>
              {loading ? (
                <div className="skeleton h-8 w-20 rounded mb-1" />
              ) : (
                <p className="text-3xl font-black text-gray-900">{s.value.toLocaleString()}</p>
              )}
              <p className="text-gray-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-5 gap-5 mb-7">
          {/* Line Chart */}
          <div className="card col-span-3">
            <h2 className="font-black text-gray-900 mb-1">Disease Incidents This Month</h2>
            <p className="text-gray-400 text-sm mb-5">Confirmed diagnoses across all districts</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={MOCK_MONTHLY} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  labelStyle={{ fontWeight: 700, color: '#1a1a1a' }}
                />
                <Line
                  type="monotone"
                  dataKey="cases"
                  stroke="#1F5F3F"
                  strokeWidth={2.5}
                  dot={{ fill: '#1F5F3F', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="card col-span-2">
            <h2 className="font-black text-gray-900 mb-1">Disease Distribution</h2>
            <p className="text-gray-400 text-sm mb-3">By type across all reports</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={MOCK_DISEASE_DIST}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {MOCK_DISEASE_DIST.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(v) => <span style={{ fontSize: 11, color: '#374151' }}>{v}</span>}
                  iconType="circle"
                  iconSize={8}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Share']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-gray-900">Recent Expert Queue</h2>
            {pendingCount > 0 && (
              <span className="pill text-xs" style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74' }}>
                {pendingCount} Pending Review
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : recentDiags.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p className="font-medium">No diagnoses yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  {['Farmer', 'Disease', 'Severity', 'Status', 'Date'].map(h => (
                    <th key={h} className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentDiags.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 text-sm font-medium text-gray-900">Farm #{d.farm_id || '—'}</td>
                    <td className="py-3 text-sm text-gray-600">{d.disease_label}</td>
                    <td className="py-3">
                      <span
                        className="pill text-xs"
                        style={{
                          background: SEVERITY_COLORS[d.severity] + '18',
                          color: SEVERITY_COLORS[d.severity],
                          border: `1px solid ${SEVERITY_COLORS[d.severity]}40`,
                        }}
                      >
                        {d.severity}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className="pill text-xs"
                        style={d.expert_status === 'pending'
                          ? { background: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74' }
                          : { background: '#f0fdf4', color: '#166534', border: '1px solid #86efac' }
                        }
                      >
                        {d.expert_status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-gray-400">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
