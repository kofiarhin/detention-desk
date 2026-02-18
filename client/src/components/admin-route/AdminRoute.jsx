import { Navigate, Outlet } from 'react-router-dom'
import { getUser } from '../../lib/auth'

const AdminRoute = () => {
  const user = getUser()

  if (user?.role === 'teacher') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default AdminRoute
