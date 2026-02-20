import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './sidebar.styles.scss'

const Sidebar = () => {
  const { role } = useAuth()

  const links = {
    schoolAdmin: [
      { to: '/admin/dashboard', label: 'Dashboard' },
      { to: '/admin/teachers', label: 'Teachers' },
      { to: '/admin/students', label: 'Students' },
      { to: '/admin/detentions', label: 'Detentions' },
    ],
    teacher: [{ to: '/teacher/students', label: 'Students' }],
    parent: [
      { to: '/parent/change-password', label: 'Change Password' },
      { to: '/parent/students', label: 'Students' },
    ],
  }

  return (
    <aside className="sidebar" id="app-sidebar">
      <div className="sidebar-brand">DetentionDesk</div>
      <nav className="sidebar-nav">
        {(links[role] || []).map((link) => (
          <NavLink className="sidebar-link" key={link.to} to={link.to}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
