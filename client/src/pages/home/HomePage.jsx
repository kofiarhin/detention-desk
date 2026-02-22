import { Link } from "react-router-dom";
import Button from "../../components/button/Button";
import "./home-page.styles.scss";

const HERO_IMAGE =
  "https://res.cloudinary.com/dlsiabgiw/image/upload/v1761110809/devkofi/xt8lcpd6ea2twj8epmd6.jpg";

const HomePage = () => {
  const features = [
    {
      title: "Fast incident capture",
      desc: "Log incidents in seconds with structured categories and clean notes.",
      icon: "M8 7h8M8 11h8M8 15h5M7 3h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z",
    },
    {
      title: "Smart Detentions",
      desc: "Clear workflows with permissions, approvals, and full visibility for staff.",
      icon: "M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4Z",
    },
    {
      title: "Total Transparency",
      desc: "Celebrate positive behavior and maintain accountability with a complete audit trail.",
      icon: "M8 21h8M12 17v4M7 3h10v6a5 5 0 0 1-10 0V3Z",
    },
  ];

  return (
    <section className="home-page">
      <header className="home-page__hero">
        <div className="home-page__hero-inner">
          <div className="home-page__copy">
            <span className="home-page__badge">
              Behavior Management Platform
            </span>
            <h1 className="home-page__title">
              Bring behavior and rewards into one school workflow.
            </h1>
            <p className="home-page__subtitle">
              DetentionDesk helps staff capture incidents fast, assign
              detentions with clear permissions, and track rewards with a
              transparent audit trail.
            </p>

            <div className="home-page__actions">
              <Link to="/register">
                <Button label="Get Started Free" />
              </Link>
              <Link to="/login">
                <Button label="Staff Login" variant="secondary" />
              </Link>
            </div>

            <div className="home-page__trust">
              <span>Role-based workflows</span>
              <div className="home-page__dot" />
              <span>School-scoped</span>
              <div className="home-page__dot" />
              <span>Audit trails</span>
            </div>
          </div>

          <div className="home-page__visual">
            <div className="home-page__image-card">
              <img src={HERO_IMAGE} alt="Software preview" loading="lazy" />
              <div className="home-page__stat">
                <span className="home-page__stat-number">93%</span>
                <p className="home-page__stat-label">Positive Behavior Trend</p>
                <div
                  style={{
                    height: "4px",
                    background: "#1f2937",
                    borderRadius: "2px",
                    marginTop: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "93%",
                      height: "100%",
                      background: "#38bdf8",
                      borderRadius: "2px",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="home-page__highlights">
        <div className="home-page__highlights-inner">
          {features.map((f, i) => (
            <article key={i} className="home-page__card">
              <div className="home-page__card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d={f.icon}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};

export default HomePage;
