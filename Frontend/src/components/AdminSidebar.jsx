import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { icon: '📊', label: 'Dashboard',   path: '/admin' },
  { icon: '🗺️', label: 'Hotspot Map', path: '/admin/map' },
  { icon: '👩‍🔬', label: 'Expert Queue', path: '/admin/expert' },
  { icon: '🔔', label: 'Alerts',       path: '/admin/alerts' },
  { icon: '⚙️', label: 'Settings',     path: '/admin/settings' },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="admin-sidebar">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-green-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🌿</div>
          <div>
            <p className="text-white font-black text-base leading-tight">KrishiRaksha</p>
            <p className="text-green-300 text-xs">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-left w-full transition-all"
              style={
                active
                  ? { background: 'rgba(255,255,255,0.18)', color: 'white' }
                  : { color: 'rgba(255,255,255,0.6)' }
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-semibold text-sm">{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-green-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-base">
            {user?.avatar || '👤'}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{user?.name}</p>
            <p className="text-green-300 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left text-green-300 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-white/10 transition-colors font-medium"
        >
          ← Logout
        </button>
      </div>
    </aside>
  );
}
