import { NavLink, useNavigate } from "react-router-dom";
import Button from "../button/Button";
import { useAuth } from "../../context/AuthContext";
import "./navbar.styles.scss";

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isBootstrapping, user, logout, getRoleHome } =
    useAuth();

  const onLogout = () => {
    logout("");
    navigate("/login", { replace: true });
  };

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
          {isBootstrapping ? null : isAuthenticated ? (
            <>
              <NavLink className="navbar-text-link" to={getRoleHome(user)}>
                Dashboard
              </NavLink>
              <Button
                label="Logout"
                onClick={onLogout}
                size="sm"
                variant="secondary"
                type="button"
              />
            </>
          ) : (
            <>
              <NavLink className="navbar-text-link" to="/login">
                Login
              </NavLink>
              <NavLink to="/register">
                <Button label="Get Started" size="sm" type="button" />
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
