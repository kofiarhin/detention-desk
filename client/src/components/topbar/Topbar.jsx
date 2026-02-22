import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./topbar.styles.scss";

const Topbar = () => {
  const navigate = useNavigate();
  const { logout, user, school, role } = useAuth();

  const toggleSidebar = () => {
    const isOpen = document.body.classList.contains("app-shell-sidebar-open");
    document.body.classList.toggle("app-shell-sidebar-open", !isOpen);
  };

  const handleLogout = () => {
    logout();
    document.body.classList.remove("app-shell-sidebar-open");
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <button className="topbar-menu" onClick={toggleSidebar} type="button">
        ☰
      </button>

      <div className="topbar-meta">
        <strong>{school?.name || "School"}</strong>
        <span className="topbar-role">{role || "staff"}</span>
      </div>

      <div className="topbar-user">
        <span>{user?.name || user?.email || "User"}</span>
        <button className="topbar-logout" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </header>
  );
};

export default Topbar;
