import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { label: 'Home', icon: HomeIcon, path: '/farmer' },
  { label: 'Farms', icon: FarmIcon, path: '/farmer/farms' },
  { label: 'Stats', icon: StatsIcon, path: '/farmer/stats' },
  { label: 'Profile', icon: ProfileIcon, path: '/farmer/profile' },
];

function HomeIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#1F5F3F' : 'none'} stroke={active ? '#1F5F3F' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function FarmIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1F5F3F' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 000 20" /><path d="M2 12h20" />
      <path d="M12 2C6.5 8 6.5 16 12 22" /><path d="M12 2c5.5 6 5.5 14 0 20" />
    </svg>
  );
}
function StatsIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1F5F3F' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function ProfileIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1F5F3F' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="bottom-tab-bar">
      {tabs.map((tab) => {
        const active = pathname === tab.path || (tab.path !== '/farmer' && pathname.startsWith(tab.path));
        const Icon = tab.icon;
        return (
          <button key={tab.label} className={`tab-item ${active ? 'active' : ''}`} onClick={() => navigate(tab.path)}>
            <Icon active={active} />
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 500 }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
