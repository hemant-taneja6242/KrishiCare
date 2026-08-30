import React, { createContext, useContext, useState, useEffect } from 'react';

// Demo farmer profiles — used since there's no backend auth
export const DEMO_FARMERS = {
  farmer: {
    id: 1,
    name: 'Rajesh Kumar',
    role: 'farmer',
    farmId: 1,
    latitude: 19.99,
    longitude: 73.78,
    location: 'Nashik, Maharashtra',
    primaryCrop: 'Rice',
    avatar: '👨‍🌾',
  },
  expert: {
    id: 2,
    name: 'Dr. Priya Sharma',
    role: 'expert',
    designation: 'ICAR Agricultural Scientist',
    avatar: '👩‍🔬',
  },
  admin: {
    id: 3,
    name: 'Admin Officer',
    role: 'admin',
    district: 'Maharashtra',
    avatar: '👤',
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('krishiraksha_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const login = (role) => {
    const profile = DEMO_FARMERS[role];
    if (!profile) return;
    localStorage.setItem('krishiraksha_user', JSON.stringify(profile));
    setUser(profile);
  };

  const logout = () => {
    localStorage.removeItem('krishiraksha_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
