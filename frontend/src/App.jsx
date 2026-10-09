import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppLayout from './components/AppLayout';
import CitizenDashboard from './pages/CitizenDashboard';
import AuthorityDashboard from './pages/AuthorityDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ComplaintsPage from './pages/ComplaintsPage';
import SubmitComplaintPage from './pages/SubmitComplaintPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import ProfilePage from './pages/ProfilePage';
import UsersAdminPage from './pages/UsersAdminPage';
import BlockchainExplorerPage from './pages/BlockchainExplorerPage';
import AuditLedgerPage from './pages/AuditLedgerPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'CITIZEN') return <Navigate to="/citizen-dashboard" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin-dashboard" replace />;
  return <Navigate to="/authority-dashboard" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0f172a',
                color: '#f1f5f9',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.9rem'
              }
            }}
          />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/citizen-dashboard" element={
                <ProtectedRoute roles={['CITIZEN']}><CitizenDashboard /></ProtectedRoute>
              } />
              <Route path="/authority-dashboard" element={
                <ProtectedRoute roles={['AUTHORITY','INVESTIGATOR','VERIFIER']}><AuthorityDashboard /></ProtectedRoute>
              } />
              <Route path="/admin-dashboard" element={
                <ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/complaints/new" element={
                <ProtectedRoute roles={['CITIZEN','ADMIN']}><SubmitComplaintPage /></ProtectedRoute>
              } />
              <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
              <Route path="/users" element={
                <ProtectedRoute roles={['ADMIN']}><UsersAdminPage /></ProtectedRoute>
              } />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/explorer" element={<AuditLedgerPage />} />
              <Route path="/ledger" element={<AuditLedgerPage />} />
              <Route path="/ledgern" element={<AuditLedgerPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
