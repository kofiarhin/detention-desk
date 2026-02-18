import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './auth-layout.styles.scss'

const AuthLayout = () => {
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <main className="auth-layout-state">Loading session...</main>
  }

  if (isAuthenticated) {
    return <Navigate replace to="/app/dashboard" />
  }

  return (
    <main className="auth-layout">
      <section className="auth-layout-card">
        <Outlet />
      </section>
    </main>
  )
}

export default AuthLayout
