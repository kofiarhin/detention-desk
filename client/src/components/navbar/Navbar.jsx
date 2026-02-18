import { NavLink } from 'react-router-dom'
import Button from '../button/Button'
import './navbar.styles.scss'

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink className="navbar-brand" to="/">
          DetentionDesk
        </NavLink>
        <nav className="navbar-links">
          <NavLink className="navbar-link" to="/about">
            About
          </NavLink>
          <NavLink className="navbar-link" to="/features">
            Features
          </NavLink>
        </nav>
        <div className="navbar-actions">
          <NavLink className="navbar-text-link" to="/login">
            Login
          </NavLink>
          <NavLink to="/register">
            <Button label="Get Started" size="sm" type="button" />
          </NavLink>
        </div>
      </div>
    </header>
  )
}

export default Navbar
