import { Link } from "react-router-dom";
import Button from "../../components/button/Button";
import "./home-page.styles.scss";

const HERO_IMAGE =
  "https://res.cloudinary.com/dlsiabglw/image/upload/v1761110809/devkofi/detention-desk-hero.png";

const Homepage = () => {
  const features = [
    {
      title: "Fast incident capture",
      desc: "Log incidents in seconds with structured categories and clean workflows.",
      icon: "M8 7h8M8 11h8M8 15h5M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
    },
    {
      title: "Smart Detentions",
      desc: "Clear workflows with permissions, approvals, and full visibility for admins.",
      icon: "M12 3l8 4v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V7l8-4Z",
    },
    {
      title: "Total Transparency",
      desc: "Track behavior consistently and keep staff, parents, and students aligned.",
      icon: "M3 12h4l2-3 4 8 2-5h6",
    },
  ];

  return (
    <section className="home-page">
      {/* HERO */}
      <div className="home-page__hero">
        <div className="home-page__container">
          <div className="home-page__hero-inner">
            <div className="home-page__hero-copy">
              <h1 className="home-page__title">
                Manage Student Detentions <br />
                in Minutes — Not Spreadsheets.
              </h1>

              <p className="home-page__subtitle">
                Simple, secure detention management for schools.
              </p>

              <div className="home-page__hero-actions">
                <Link to="/register" className="home-page__cta-link">
                  <Button text="Start Free Trial" variant="primary" />
                </Link>

                <a href="#demo" className="home-page__cta-link">
                  <Button text="Book Demo" variant="outline" />
                </a>
              </div>

              <div
                className="home-page__trustline"
                aria-label="Product benefits highlights"
              >
                <span className="home-page__trust-dot" aria-hidden="true" />
                No spreadsheets
                <span className="home-page__trust-sep" aria-hidden="true">
                  •
                </span>
                Role-based access
                <span className="home-page__trust-sep" aria-hidden="true">
                  •
                </span>
                Audit-ready tracking
              </div>
            </div>

            <div
              className="home-page__hero-visual"
              aria-label="Dashboard preview"
            >
              <div className="home-page__hero-card">
                <div className="home-page__hero-card-top">
                  <div className="home-page__window-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="home-page__hero-card-tags">
                    <span className="home-page__tag">Dashboard</span>
                    <span className="home-page__tag home-page__tag--muted">
                      Secure
                    </span>
                  </div>
                </div>

                <div className="home-page__hero-card-body">
                  <img
                    className="home-page__hero-image"
                    src={HERO_IMAGE}
                    alt="Detention Desk dashboard screenshot"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />

                  <div className="home-page__hero-fallback" aria-hidden="true">
                    <div className="home-page__fallback-side" />
                    <div className="home-page__fallback-main">
                      <div className="home-page__fallback-bar" />
                      <div className="home-page__fallback-row" />
                      <div className="home-page__fallback-row" />
                      <div className="home-page__fallback-row" />
                      <div className="home-page__fallback-row" />
                    </div>
                  </div>
                </div>
              </div>

              <p className="home-page__hero-caption">
                Everything in one place. Clear. Organized. Accountable.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TRIAD */}
      <div className="home-page__triad">
        <div className="home-page__container">
          <div className="home-page__triad-grid">
            <div className="home-page__triad-col">
              <h3 className="home-page__triad-title">The Problem</h3>
              <ul className="home-page__triad-list">
                <li>Manual tracking</li>
                <li>Lost paperwork</li>
                <li>No accountability</li>
              </ul>
            </div>

            <div className="home-page__triad-col home-page__triad-col--center">
              <h3 className="home-page__triad-title">A Better Way</h3>
              <p className="home-page__triad-quote">
                Schools deserve structure <br />
                without complexity.
              </p>
            </div>

            <div className="home-page__triad-col">
              <h3 className="home-page__triad-title">The Solution</h3>
              <ul className="home-page__triad-list">
                <li>Centralized records</li>
                <li>Automated tracking</li>
                <li>Parent communication</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="home-page__features" id="features">
        <div className="home-page__container">
          <div className="home-page__features-grid">
            {features.map((f) => (
              <div className="home-page__feature-card" key={f.title}>
                <div className="home-page__feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d={f.icon}
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="home-page__feature-title">{f.title}</h3>
                <p className="home-page__feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="home-page__checks">
            <div className="home-page__checks-inner">
              <div className="home-page__check">Built for Modern Schools</div>
              <div className="home-page__check">Secure Cloud Storage</div>
              <div className="home-page__check">Role-Based Access</div>
              <div className="home-page__check">GDPR Compliant</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="home-page__final" id="demo">
        <div className="home-page__container">
          <div className="home-page__final-card">
            <h2 className="home-page__final-title">
              Bring Structure to Your Discipline Process.
            </h2>
            <p className="home-page__final-subtitle">
              Start tracking detentions cleanly — with visibility for staff and
              accountability for students.
            </p>

            <div className="home-page__final-actions">
              <Link to="/register" className="home-page__cta-link">
                <Button text="Start Free Trial" variant="primary" />
              </Link>
              <a href="#pricing" className="home-page__cta-link">
                <Button text="View Pricing" variant="outline" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* PRICING ANCHOR */}
      <div className="home-page__pricing" id="pricing">
        <div className="home-page__container">
          <div className="home-page__pricing-mini">
            <h3 className="home-page__pricing-title">
              Simple pricing that scales.
            </h3>
            <p className="home-page__pricing-desc">
              Start free. Upgrade when your school is ready.
            </p>
            <Link to="/pricing" className="home-page__pricing-link">
              See Pricing →
            </Link>
          </div>
        </div>
      </div>

      <footer className="home-page__footer">
        <div className="home-page__container home-page__footer-inner">
          <p className="home-page__footer-text">
            © {new Date().getFullYear()} Detention Desk. All rights reserved.
          </p>
          <div className="home-page__footer-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </section>
  );
};

export default Homepage;
