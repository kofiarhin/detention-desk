import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/protected-route/ProtectedRoute'
import RoleRoute from './components/role-route/RoleRoute'
import AppLayout from './layouts/app-layout/AppLayout'
import AuthLayout from './layouts/auth-layout/AuthLayout'
import PublicLayout from './layouts/public-layout/PublicLayout'
import AboutPage from './pages/about/AboutPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import DetentionsPage from './pages/detentions/DetentionsPage'
import FeaturesPage from './pages/features/FeaturesPage'
import HomePage from './pages/home/HomePage'
import IncidentsPage from './pages/incidents/IncidentsPage'
import LoginPage from './pages/login/LoginPage'
import RegisterPage from './pages/register/RegisterPage'
import RewardsPage from './pages/rewards/RewardsPage'
import SettingsPage from './pages/settings/SettingsPage'
import StudentsPage from './pages/students/StudentsPage'

const App = () => {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route element={<HomePage />} path="/" />
        <Route element={<AboutPage />} path="/about" />
        <Route element={<FeaturesPage />} path="/features" />
      </Route>

      <Route element={<AuthLayout />}>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />} path="/app">
          <Route element={<DashboardPage />} path="dashboard" />
          <Route element={<StudentsPage />} path="students" />
          <Route element={<IncidentsPage />} path="incidents" />
          <Route element={<DetentionsPage />} path="detentions" />
          <Route element={<RewardsPage />} path="rewards" />
          <Route element={<RoleRoute allowedRoles={['schoolAdmin']} />}>
            <Route element={<SettingsPage />} path="settings" />
          </Route>
          <Route element={<Navigate replace to="/app/dashboard" />} path="*" />
        </Route>
      </Route>

      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  )
}

export default App
