import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./sidebar.styles.scss";

const Sidebar = () => {
  const { role } = useAuth();

  const links = {
    schoolAdmin: [
      { to: "/admin/dashboard", label: "Dashboard" },
      { to: "/admin/teachers", label: "Teachers" },
      { to: "/admin/students", label: "Students" },
      { to: "/admin/detentions", label: "Detentions" },
      { to: "/admin/parents", label: "Parents" },
    ],
    teacher: [{ to: "/teacher/students", label: "Students" }],
    parent: [
      { to: "/parent/change-password", label: "Change Password" },
      { to: "/parent/students", label: "Students" },
    ],
  };

  const closeSidebar = () => {
    document.body.classList.remove("app-shell-sidebar-open");
  };

  return (
    <aside className="sidebar" id="app-sidebar" aria-label="Sidebar navigation">
      <div className="sidebar-top">
        <div className="sidebar-brand">DetentionDesk</div>

        <button
          className="sidebar-close"
          type="button"
          onClick={closeSidebar}
          aria-label="Close sidebar"
          title="Close"
        >
          ×
        </button>
      </div>

      <nav className="sidebar-nav">
        {(links[role] || []).map((link) => (
          <NavLink
            className="sidebar-link"
            key={link.to}
            to={link.to}
            onClick={closeSidebar}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
