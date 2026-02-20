import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/spinner/Spinner'

const RequireAuth = ({ allowedRoles = [] }) => {
  const { isAuthenticated, isBootstrapping, user, getRoleHome } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return <Spinner />
  }

  if (!isAuthenticated || !user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (user.role === 'owner') {
    return <Navigate replace to="/login" />
  }

  if (user.role === 'parent' && user.mustChangePassword && location.pathname !== '/parent/change-password') {
    return <Navigate replace to="/parent/change-password" />
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate replace to={getRoleHome(user)} />
  }

  return <Outlet />
}

export default RequireAuth
