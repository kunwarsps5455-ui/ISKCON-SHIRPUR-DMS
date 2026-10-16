import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Donors from './pages/Donors';
import DonorForm from './pages/DonorForm';
import DonorProfile from './pages/DonorProfile';
import Birthdays from './pages/Birthdays';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Donations from './pages/Donations';
import Family from './pages/Family';
import Crm from './pages/Crm';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cream">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/crm" element={<ProtectedRoute><Crm /></ProtectedRoute>} />
        <Route path="/donors" element={<ProtectedRoute><Donors /></ProtectedRoute>} />
        <Route path="/donors/new" element={<ProtectedRoute><DonorForm /></ProtectedRoute>} />
        <Route path="/donors/:id" element={<ProtectedRoute><DonorProfile /></ProtectedRoute>} />
        <Route path="/donations" element={<ProtectedRoute><Donations /></ProtectedRoute>} />
        <Route path="/family" element={<ProtectedRoute><Family /></ProtectedRoute>} />
        <Route path="/birthdays" element={<ProtectedRoute><Birthdays /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        <Route path="*" element={<div className="p-8 text-center text-red-500 font-bold text-2xl">404 - Page Not Found</div>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
