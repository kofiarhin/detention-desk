import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './sidebar.styles.scss'

const Sidebar = () => {
  const { isAdmin } = useAuth()

  return (
    <aside className="sidebar" id="app-sidebar">
      <div className="sidebar-brand">DetentionDesk</div>
      <nav className="sidebar-nav">
        <NavLink className="sidebar-link" to="/app/dashboard">
          Dashboard
        </NavLink>
        <NavLink className="sidebar-link" to="/app/students">
          Students
        </NavLink>
        <NavLink className="sidebar-link" to="/app/incidents">
          Incidents
        </NavLink>
        <NavLink className="sidebar-link" to="/app/detentions">
          Detentions
        </NavLink>
        <NavLink className="sidebar-link" to="/app/rewards">
          Rewards
        </NavLink>
        {isAdmin ? (
          <NavLink className="sidebar-link" to="/app/settings">
            Settings
          </NavLink>
        ) : null}
      </nav>
    </aside>
  )
}

export default Sidebar
