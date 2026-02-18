import { Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/admin-route/AdminRoute'
import ProtectedRoute from './components/protected-route/ProtectedRoute'
import DashboardPage from './pages/dashboard/DashboardPage'
import LoginPage from './pages/login/LoginPage'

const App = () => {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminRoute />}>
          <Route element={<DashboardPage />} path="/dashboard" />
        </Route>
      </Route>

      <Route element={<Navigate replace to="/dashboard" />} path="*" />
    </Routes>
  )
}

export default App
