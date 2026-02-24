import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./topbar.styles.scss";

const roleLabelMap = {
  schoolAdmin: "Admin",
  teacher: "Teacher",
  parent: "Parent",
};

const Topbar = ({ isParentLocked = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, school, role, token } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastQueryRef = useRef("");
  const closeTimers = useRef({});

  const canSearchStudents = useMemo(() => {
    if (!user) return false;
    if (isParentLocked) return false;
    return ["schoolAdmin", "teacher", "parent"].includes(user.role);
  }, [user, isParentLocked]);

  const toggleSidebar = () => {
    const isOpen = document.body.classList.contains("app-shell-sidebar-open");
    document.body.classList.toggle("app-shell-sidebar-open", !isOpen);
  };

  const handleLogout = () => {
    logout();
    document.body.classList.remove("app-shell-sidebar-open");
    navigate("/login", { replace: true });
  };

  const roleLabel = roleLabelMap[role] || role || "Staff";
  const schoolName = school?.name || "School";
  const userLabel = user?.name || user?.email || "User";

  const getStudentHref = (studentId) => {
    if (role === "teacher") return `/teacher/students/${studentId}`;
    if (role === "parent") return `/parent/students/${studentId}`;
    return `/admin/students?q=${encodeURIComponent(search)}`;
  };

  const runSearch = async (q) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    setLoading(true);
    lastQueryRef.current = trimmed;
    try {
      if (role === "parent") {
        const payload = await apiRequest({
          path: "/api/parent/students",
          token,
        });
        const all = payload.data || [];
        const lower = trimmed.toLowerCase();
        const filtered = all
          .filter((s) => {
            const name =
              `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
            const form = `${s.form || ""}`.toLowerCase();
            return name.includes(lower) || form.includes(lower);
          })
          .slice(0, 8);
        if (lastQueryRef.current === trimmed) setResults(filtered);
        return;
      }

      const payload = await apiRequest({
        path: `/api/students?page=1&limit=8&q=${encodeURIComponent(trimmed)}`,
        token,
      });
      if (lastQueryRef.current === trimmed) setResults(payload.data || []);
    } catch {
      if (lastQueryRef.current === trimmed) setResults([]);
    } finally {
      if (lastQueryRef.current === trimmed) setLoading(false);
    }
  };

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    document.body.classList.remove("app-shell-sidebar-open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!canSearchStudents) return;

    const id = setTimeout(() => {
      void runSearch(search);
    }, 250);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, canSearchStudents]);

  const closeSearchSoon = () => {
    closeTimers.current.search = setTimeout(() => setSearchOpen(false), 120);
  };

  const cancelCloseSearch = () => {
    clearTimeout(closeTimers.current.search);
  };

  const openSearch = () => {
    if (!canSearchStudents) return;
    setSearchOpen(true);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {isParentLocked ? null : (
          <button
            className="topbar-menu"
            onClick={toggleSidebar}
            type="button"
            aria-label="Open navigation"
          >
            ☰
          </button>
        )}

        <div className="topbar-meta">
          <strong className="topbar-school">{schoolName}</strong>
          <span className="topbar-role">{roleLabel}</span>
        </div>
      </div>

      {canSearchStudents ? (
        <div
          className="topbar-search"
          onBlur={closeSearchSoon}
          onFocus={openSearch}
          onMouseEnter={cancelCloseSearch}
          onMouseLeave={closeSearchSoon}
        >
          <input
            className="topbar-search-input"
            placeholder="Find a student…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={openSearch}
          />
          {searchOpen ? (
            <div className="topbar-search-popover" role="listbox">
              {loading ? (
                <div className="topbar-search-empty">Searching…</div>
              ) : results.length ? (
                <ul className="topbar-search-list">
                  {results.map((s) => (
                    <li key={s._id} className="topbar-search-item">
                      <Link
                        className="topbar-search-link"
                        to={getStudentHref(s._id)}
                        onClick={() => setSearchOpen(false)}
                      >
                        <span className="topbar-search-name">
                          {s.firstName} {s.lastName}
                        </span>
                        <span className="topbar-search-meta">
                          Year {s.yearGroup || "N/A"} • Form {s.form || "N/A"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : search.trim() ? (
                <div className="topbar-search-empty">No matches.</div>
              ) : (
                <div className="topbar-search-empty">Type a name or form…</div>
              )}

              {role === "schoolAdmin" && search.trim() ? (
                <button
                  className="topbar-search-more"
                  type="button"
                  onClick={() => {
                    navigate(`/admin/students?q=${encodeURIComponent(search)}`);
                    setSearchOpen(false);
                  }}
                >
                  View in Student Management
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="topbar-spacer" />
      )}

      <div className="topbar-user">
        <button
          className="topbar-user-trigger"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="topbar-user-name">{userLabel}</span>
          <span className="topbar-user-caret">▾</span>
        </button>

        {menuOpen ? (
          <div className="topbar-user-menu" role="menu">
            {role === "parent" ? (
              <Link
                className="topbar-user-item"
                role="menuitem"
                to="/parent/change-password"
              >
                Change password
              </Link>
            ) : null}

            <button
              className="topbar-user-item topbar-user-item--danger"
              role="menuitem"
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>

      {isParentLocked ? (
        <div className="topbar-lock" role="status">
          Password reset required.
          <Link className="topbar-lock-link" to="/parent/change-password">
            Change password
          </Link>
        </div>
      ) : null}
    </header>
  );
};

export default Topbar;
