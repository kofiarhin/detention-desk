import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import "./navbar.styles.scss";

const Navbar = () => {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const touchStartX = useRef(null);
  const touchLastX = useRef(null);

  const navItems = useMemo(
    () => [
      { label: "Features", href: "/#features", type: "hash" },
      { label: "Pricing", href: "/#pricing", type: "hash" },
      { label: "About", href: "/about", type: "route" },
    ],
    [],
  );

  const closeAll = () => {
    setMenuOpen(false);
    setDropdownOpen(false);
  };

  useEffect(() => {
    closeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const original = document.body.style.overflow;
    if (menuOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // swipe: right swipe from left edge opens, left swipe closes
  useEffect(() => {
    const onTouchStart = (e) => {
      if (!e.touches?.length) return;
      const x = e.touches[0].clientX;
      touchStartX.current = x;
      touchLastX.current = x;
    };

    const onTouchMove = (e) => {
      if (!e.touches?.length) return;
      touchLastX.current = e.touches[0].clientX;
    };

    const onTouchEnd = () => {
      const start = touchStartX.current;
      const end = touchLastX.current;
      if (start == null || end == null) return;

      const delta = end - start;

      // open: swipe right from left edge
      if (!menuOpen && start < 24 && delta > 60) setMenuOpen(true);

      // close: swipe left while open
      if (menuOpen && delta < -60) setMenuOpen(false);

      touchStartX.current = null;
      touchLastX.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [menuOpen]);

  const handleHashNav = (href) => (e) => {
    if (pathname === "/" && href.startsWith("/#")) {
      e.preventDefault();
      const id = href.replace("/#", "");
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      closeAll();
    }
  };

  return (
    <header className={`app-navbar ${isLanding ? "app-navbar--landing" : ""}`}>
      <div className="app-navbar__container">
        <div className="app-navbar__left">
          <button
            className={`app-navbar__burger ${menuOpen ? "is-open" : ""}`}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <Link
            to="/"
            className="app-navbar__brand"
            aria-label="Detention Desk"
          >
            <span className="app-navbar__brand-mark" aria-hidden="true">
              ⌂
            </span>
            <span className="app-navbar__brand-name">Detention Desk</span>
          </Link>
        </div>

        {/* Desktop top nav */}
        <nav className="app-navbar__nav" aria-label="Primary">
          {navItems.map((item) =>
            item.type === "hash" ? (
              <a
                key={item.label}
                className="app-navbar__nav-link"
                href={item.href}
                onClick={handleHashNav(item.href)}
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                key={item.label}
                className={({ isActive }) =>
                  `app-navbar__nav-link ${isActive ? "is-active" : ""}`
                }
                to={item.href}
              >
                {item.label}
              </NavLink>
            ),
          )}

          <div
            className={`app-navbar__dropdown ${dropdownOpen ? "is-open" : ""}`}
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <button
              type="button"
              className="app-navbar__nav-link app-navbar__nav-link--dropdown"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              onClick={() => setDropdownOpen((v) => !v)}
            >
              Resources
              <span className="app-navbar__chev" aria-hidden="true">
                ▾
              </span>
            </button>

            <div className="app-navbar__dropdown-menu" role="menu">
              <Link
                to="/contact"
                className="app-navbar__dropdown-item"
                role="menuitem"
              >
                Contact
              </Link>
              <Link
                to="/privacy"
                className="app-navbar__dropdown-item"
                role="menuitem"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="app-navbar__dropdown-item"
                role="menuitem"
              >
                Terms
              </Link>
            </div>
          </div>

          <NavLink
            className={({ isActive }) =>
              `app-navbar__nav-link app-navbar__nav-link--muted ${
                isActive ? "is-active" : ""
              }`
            }
            to="/login"
          >
            Login
          </NavLink>
        </nav>

        <div className="app-navbar__right">
          <Link to="/register" className="app-navbar__cta">
            Start Free Trial
          </Link>
        </div>
      </div>

      {/* Mobile backdrop */}
      <button
        className={`app-navbar__backdrop ${menuOpen ? "is-open" : ""}`}
        type="button"
        aria-label="Close menu"
        onClick={closeAll}
      />

      {/* Mobile side nav */}
      <aside className={`app-navbar__sidenav ${menuOpen ? "is-open" : ""}`}>
        <div className="app-navbar__sidenav-top">
          <span className="app-navbar__sidenav-title">Menu</span>
          <button
            type="button"
            className="app-navbar__sidenav-close"
            aria-label="Close menu"
            onClick={closeAll}
          >
            ×
          </button>
        </div>

        <div className="app-navbar__sidenav-links">
          {navItems.map((item) =>
            item.type === "hash" ? (
              <a
                key={item.label}
                className="app-navbar__side-link"
                href={item.href}
                onClick={handleHashNav(item.href)}
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                key={item.label}
                className={({ isActive }) =>
                  `app-navbar__side-link ${isActive ? "is-active" : ""}`
                }
                to={item.href}
                onClick={closeAll}
              >
                {item.label}
              </NavLink>
            ),
          )}

          <div className="app-navbar__side-divider" />

          <NavLink
            className={({ isActive }) =>
              `app-navbar__side-link ${isActive ? "is-active" : ""}`
            }
            to="/login"
            onClick={closeAll}
          >
            Login
          </NavLink>

          <Link
            className="app-navbar__side-cta"
            to="/register"
            onClick={closeAll}
          >
            Start Free Trial
          </Link>

          <div className="app-navbar__side-mini">
            <Link to="/privacy" onClick={closeAll}>
              Privacy
            </Link>
            <Link to="/terms" onClick={closeAll}>
              Terms
            </Link>
            <Link to="/contact" onClick={closeAll}>
              Contact
            </Link>
          </div>
        </div>
      </aside>
    </header>
  );
};

export default Navbar;
