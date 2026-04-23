import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'

// ── Auth pages ───────────────────────────────────────────
import LoginPage    from './pages/auth/Login'
import RegisterPage        from './pages/auth/Register'
import AcceptInvitationPage from './pages/auth/AcceptInvitation'

// ── Owner pages ──────────────────────────────────────────
import OwnerDashboard  from './pages/owner/Dashboard'
import InstancesPage   from './pages/owner/Instances'
import SubscriptionPage from './pages/owner/Subscription'
import ProfilePage     from './pages/owner/Profile'

// ── Admin pages ──────────────────────────────────────────
import AdminDashboard     from './pages/admin/Dashboard'
import AdminInstances     from './pages/admin/AllInstances'
import AdminUsers         from './pages/admin/Users'
import AdminSubscriptions from './pages/admin/Subscriptions'
import SystemHealth       from './pages/admin/Health'

// ── Staff page ───────────────────────────────────────────
import StaffRedirect from './pages/staff/StaffRedirect'

// ── Global styles ────────────────────────────────────────
import './styles/global.css'
import './styles/instances.css'
import './styles/subscription.css'
import './styles/profile.css'
import './styles/admin.css'
import ForgotPasswordPage from './pages/auth/Forgotpassword'
import ResetPasswordPage from './pages/auth/ResetPassword'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register"           element={<RegisterPage />} />
            <Route path="/accept-invitation"  element={<AcceptInvitationPage />} />

            {/* Root redirect — ProtectedRoute handles role-based redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* ── Owner routes ───────────────────────────── */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/instances" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <InstancesPage />
              </ProtectedRoute>
            } />
            <Route path="/subscription" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <SubscriptionPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <ProfilePage />
              </ProtectedRoute>
            } />

            {/* ── Admin routes ───────────────────────────── */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/instances" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminInstances />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/subscriptions" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminSubscriptions />
              </ProtectedRoute>
            } />
            <Route path="/admin/health" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <SystemHealth />
              </ProtectedRoute>
            } />

            {/* ── Staff route ────────────────────────────── */}
            <Route path="/staff" element={
              <ProtectedRoute allowedRoles={['STAFF']}>
                <StaffRedirect />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password"   element={<ForgotPasswordPage />} />
            <Route path="/reset-password"    element={<ResetPasswordPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

// Root "/" — ProtectedRoute on /dashboard handles the auth check.
// If cookie is valid → user lands on dashboard.
// If cookie is missing/expired → ProtectedRoute redirects to /login.
function RootRedirect() {
  return <Navigate to="/dashboard" replace />
}
