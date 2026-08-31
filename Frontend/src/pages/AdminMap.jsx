import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getHotspots } from '../api/client';
import AdminSidebar from '../components/AdminSidebar';

const SEVERITY_MAP = {
  Critical: { color: '#dc2626', fillColor: '#dc2626', label: 'Critical', emoji: '🔴' },
  High:     { color: '#ea580c', fillColor: '#ea580c', label: 'High',     emoji: '🟠' },
  Medium:   { color: '#ca8a04', fillColor: '#f59e0b', label: 'Medium',   emoji: '🟡' },
  Low:      { color: '#16a34a', fillColor: '#22c55e', label: 'Low',      emoji: '🟢' },
};

const RADIUS_MAP = { Critical: 16, High: 12, Medium: 9, Low: 7 };

const CROPS    = ['All Crops', 'Tomato', 'Rice', 'Wheat', 'Potato', 'Sugarcane', 'Cotton', 'Grape', 'Onion', 'Corn', 'Mango', 'Cashew', 'Soybean'];
const DISEASES = ['All Diseases', 'Early Blight', 'Late Blight', 'Rice Blast', 'Powdery Mildew', 'Bacterial Blight', 'Bacterial Leaf Blight', 'Rust', 'Red Rot', 'Downy Mildew', 'Sheath Blight', 'Purple Blotch', 'Bacterial Spot', 'Anthracnose', 'Northern Corn Leaf Blight', 'Leaf Spot', 'Septoria Leaf Spot'];

export default function AdminMap() {
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cropFilter, setCropFilter]       = useState('All Crops');
  const [diseaseFilter, setDiseaseFilter] = useState('All Diseases');

  useEffect(() => {
    getHotspots(100)
      .then((r) => setHotspots(r.data?.hotspots || []))
      .catch(() => setHotspots([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = hotspots.filter((h) => {
    if (cropFilter !== 'All Crops' && h.crop !== cropFilter) return false;
    if (diseaseFilter !== 'All Diseases' && h.disease !== diseaseFilter) return false;
    return true;
  });

  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  filtered.forEach((h) => { if (counts[h.severity] !== undefined) counts[h.severity]++; });

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-content flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div className="px-8 py-5 bg-white border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-black text-gray-900">Disease Hotspot Map</h1>
            <p className="text-gray-400 text-sm">{filtered.length} hotspots across Maharashtra</p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:border-green-500 cursor-pointer"
            >
              {CROPS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select
              value={diseaseFilter}
              onChange={(e) => setDiseaseFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:border-green-500 cursor-pointer"
            >
              {DISEASES.map((d) => <option key={d}>{d}</option>)}
            </select>
            <button
              onClick={() => { setCropFilter('All Crops'); setDiseaseFilter('All Diseases'); }}
              className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Map + Legend */}
        <div className="relative flex-1 overflow-hidden px-6 py-4">
          {loading ? (
            <div className="w-full h-full rounded-2xl skeleton" />
          ) : (
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-xl">
              <MapContainer
                center={[19.4, 76.0]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filtered.map((h, i) => {
                  const cfg = SEVERITY_MAP[h.severity] || SEVERITY_MAP.Low;
                  const radius = RADIUS_MAP[h.severity] || 8;
                  if (!h.latitude || !h.longitude) return null;
                  return (
                    <CircleMarker
                      key={i}
                      center={[h.latitude, h.longitude]}
                      radius={radius}
                      pathOptions={{
                        color: cfg.color,
                        fillColor: cfg.fillColor,
                        fillOpacity: 0.75,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 180 }}>
                          <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                            {cfg.emoji} {h.disease || 'Unknown Disease'}
                          </p>
                          <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 2 }}>
                            👤 {h.farmer_name || 'Unknown Farmer'}
                          </p>
                          {h.crop && <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 2 }}>🌾 {h.crop}</p>}
                          {h.district && <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>📍 {h.district}</p>}
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 100,
                            fontSize: 11,
                            fontWeight: 700,
                            background: cfg.fillColor + '20',
                            color: cfg.color,
                            border: `1px solid ${cfg.color}50`,
                          }}>
                            {h.severity}
                          </span>
                          {h.reported_at && (
                            <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>
                              {new Date(h.reported_at).toLocaleDateString('en-IN')}
                            </p>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          )}

          {/* Legend */}
          <div
            className="absolute top-8 right-10 bg-white rounded-2xl shadow-xl p-4 z-50"
            style={{ minWidth: 160 }}
          >
            <p className="font-bold text-gray-900 text-sm mb-3">Severity Legend</p>
            {Object.entries(SEVERITY_MAP).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cfg.fillColor }} />
                <span className="text-gray-600 text-xs font-medium">{cfg.emoji} {cfg.label}</span>
                <span className="ml-auto text-xs font-bold text-gray-400">{counts[key]}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2">
              <p className="text-xs text-gray-400 font-medium">Total: {filtered.length} hotspots</p>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="px-6 py-3 bg-white border-t border-gray-100 flex items-center gap-6 flex-shrink-0">
          <span className="text-sm text-gray-500">📍 <strong className="text-gray-900">{filtered.length}</strong> Hotspots Detected</span>
          <span className="text-sm text-gray-500">🔴 <strong className="text-gray-900">{counts.Critical}</strong> Critical</span>
          <span className="text-sm text-gray-500">🟠 <strong className="text-gray-900">{counts.High}</strong> High</span>
          <span className="text-sm text-gray-500 ml-auto text-xs">Data source: /api/hotspots · Last sync: now</span>
        </div>
      </main>
    </div>
  );
}
