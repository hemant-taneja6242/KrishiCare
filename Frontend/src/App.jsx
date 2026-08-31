import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login         from './pages/Login';
import FarmerHome    from './pages/FarmerHome';
import DiagnoseScan  from './pages/DiagnoseScan';
import FarmerRisk    from './pages/FarmerRisk';
import FarmerAlerts  from './pages/FarmerAlerts';
import FarmerFarms   from './pages/FarmerFarms';
import FarmerHistory  from './pages/FarmerHistory';
import FarmerProfile from './pages/FarmerProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminMap       from './pages/AdminMap';
import AdminAlerts    from './pages/AdminAlerts';
import AdminSettings  from './pages/AdminSettings';
import ExpertQueue    from './pages/ExpertQueue';
import ExpertAlerts   from './pages/ExpertAlerts';
import ExpertSettings from './pages/ExpertSettings';

// Role-based route guard
function ProtectedRoute({ children, allowedRole }) {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (allowedRole) {
    const roles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
    if (!roles.includes(user?.role)) {
      // Redirect to correct home based on actual role
      if (user?.role === 'farmer') return <Navigate to="/farmer" replace />;
      if (user?.role === 'expert') return <Navigate to="/expert" replace />;
      if (user?.role === 'admin')  return <Navigate to="/admin"  replace />;
    }
  }
  return children;
}

// Auto-redirect if already logged in
function PublicRoute({ children }) {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) return children;
  if (user?.role === 'farmer') return <Navigate to="/farmer" replace />;
  if (user?.role === 'expert') return <Navigate to="/expert" replace />;
  if (user?.role === 'admin')  return <Navigate to="/admin"  replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Farmer App */}
      <Route path="/farmer" element={<ProtectedRoute allowedRole="farmer"><FarmerHome /></ProtectedRoute>} />
      <Route path="/farmer/scan"    element={<ProtectedRoute allowedRole="farmer"><DiagnoseScan /></ProtectedRoute>} />
      <Route path="/farmer/risk"    element={<ProtectedRoute allowedRole="farmer"><FarmerRisk /></ProtectedRoute>} />
      <Route path="/farmer/alerts"  element={<ProtectedRoute allowedRole="farmer"><FarmerAlerts /></ProtectedRoute>} />
      <Route path="/farmer/farms"          element={<ProtectedRoute allowedRole="farmer"><FarmerFarms /></ProtectedRoute>} />
      <Route path="/farmer/farms/:farmId"  element={<ProtectedRoute allowedRole="farmer"><FarmerFarms /></ProtectedRoute>} />
      <Route path="/farmer/history"        element={<ProtectedRoute allowedRole="farmer"><FarmerHistory /></ProtectedRoute>} />
      <Route path="/farmer/stats"   element={<ProtectedRoute allowedRole="farmer"><FarmerRisk /></ProtectedRoute>} />
      <Route path="/farmer/profile"          element={<ProtectedRoute allowedRole="farmer"><FarmerProfile /></ProtectedRoute>} />
      <Route path="/farmer/profile/:subview"  element={<ProtectedRoute allowedRole="farmer"><FarmerProfile /></ProtectedRoute>} />

      {/* Expert Portal */}
      <Route path="/expert"          element={<ProtectedRoute allowedRole="expert"><ExpertQueue /></ProtectedRoute>} />
      <Route path="/expert/queue"    element={<ProtectedRoute allowedRole="expert"><ExpertQueue /></ProtectedRoute>} />
      <Route path="/expert/alerts"   element={<ProtectedRoute allowedRole="expert"><ExpertAlerts /></ProtectedRoute>} />
      <Route path="/expert/settings" element={<ProtectedRoute allowedRole="expert"><ExpertSettings /></ProtectedRoute>} />

      {/* Admin Portal */}
      <Route path="/admin"         element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/map"     element={<ProtectedRoute allowedRole="admin"><AdminMap /></ProtectedRoute>} />
      <Route path="/admin/expert"  element={<ProtectedRoute allowedRole="admin"><ExpertQueue /></ProtectedRoute>} />
      <Route path="/admin/alerts"  element={<ProtectedRoute allowedRole="admin"><AdminAlerts /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRole="admin"><AdminSettings /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
