import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listFarms, createFarm } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BottomTabBar from '../components/BottomTabBar';

const CROP_EMOJIS = { Rice: '🌾', Wheat: '🌿', Tomato: '🍅', Potato: '🥔', Sugarcane: '🎋', Cotton: '☁️' };

export default function FarmerFarms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ farmer_name: user?.name || '', latitude: user?.latitude || 19.99, longitude: user?.longitude || 73.78, primary_crop: '', village: '', district: '', state: 'Maharashtra' });
  const [saving, setSaving] = useState(false);

  const fetchFarms = () => {
    listFarms()
      .then((r) => setFarms(r.data || []))
      .catch(() => setFarms([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFarms(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createFarm(form);
      fetchFarms();
      setShowForm(false);
      setForm({ farmer_name: user?.name || '', latitude: user?.latitude || 19.99, longitude: user?.longitude || 73.78, primary_crop: '', village: '', district: '', state: 'Maharashtra' });
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to add farm');
    } finally {
      setSaving(false);
    }
  };

  const CROP_COLORS = ['#dcfce7', '#dbeafe', '#fef3c7', '#fce7f3', '#ede9fe', '#e0f2fe'];

  return (
    <div className="mobile-app page-enter" style={{ paddingBottom: 90 }}>
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">←</button>
        <h1 className="text-lg font-black text-gray-900">My Farms</h1>
        <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-xl hover:bg-green-800 transition-colors">+</button>
      </div>

      <div className="px-5">
        {/* Add Farm Form */}
        {showForm && (
          <div className="card mb-5 page-enter">
            <h3 className="font-black text-gray-900 mb-4">Add New Farm</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {[
                { key: 'farmer_name', label: 'Farmer Name', type: 'text', placeholder: 'Rajesh Kumar' },
                { key: 'primary_crop', label: 'Primary Crop', type: 'text', placeholder: 'Rice, Wheat, Tomato...' },
                { key: 'village', label: 'Village', type: 'text', placeholder: 'Village name' },
                { key: 'district', label: 'District', type: 'text', placeholder: 'Nashik' },
                { key: 'latitude', label: 'Latitude', type: 'number', placeholder: '19.99' },
                { key: 'longitude', label: 'Longitude', type: 'number', placeholder: '73.78' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    step={f.type === 'number' ? '0.001' : undefined}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    required={['farmer_name', 'latitude', 'longitude'].includes(f.key)}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: f.type === 'number' ? parseFloat(e.target.value) : e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-green-500 transition"
                  />
                </div>
              ))}
              <div className="flex gap-3 mt-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : '✅ Add Farm'}
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
          </div>
        ) : farms.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-5xl mb-4">🌾</div>
            <p className="font-bold text-gray-700">No farms registered</p>
            <p className="text-gray-400 text-sm mt-2 mb-5">Add your first farm to start monitoring</p>
            <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: 'auto', padding: '12px 32px' }}>Add Farm</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {farms.map((farm, i) => {
              const emoji = CROP_EMOJIS[farm.primary_crop] || '🌾';
              return (
                <div key={farm.id} className="card flex gap-4 p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/farmer/scan`)}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: CROP_COLORS[i % CROP_COLORS.length] }}>
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-base truncate">{farm.farmer_name}'s Farm</p>
                    {farm.primary_crop && (
                      <span className="pill text-xs" style={{ background: '#dcfce7', color: '#166534' }}>🌾 {farm.primary_crop}</span>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-400">📍</span>
                      <span className="text-xs text-gray-500 truncate">{[farm.village, farm.district, farm.state].filter(Boolean).join(', ') || 'Location not set'}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Lat {farm.latitude?.toFixed(3)}, Lon {farm.longitude?.toFixed(3)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-gray-300 text-lg">›</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/farmer/scan'); }}
                      className="text-xs font-semibold text-green-700 hover:text-green-900"
                    >
                      Scan →
                    </button>
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
