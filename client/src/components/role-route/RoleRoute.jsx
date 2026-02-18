import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const RoleRoute = ({ allowedRoles }) => {
  const { role } = useAuth()

  if (!allowedRoles.includes(role)) {
    return <Navigate replace to="/app/dashboard" />
  }

  return <Outlet />
}

export default RoleRoute
