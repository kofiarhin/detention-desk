// client/src/pages/home/HomePage.jsx
import { Link } from "react-router-dom";
import Button from "../../components/button/Button";
import "./home-page.styles.scss";

const HERO_IMAGE =
  "https://res.cloudinary.com/dlsiabgiw/image/upload/v1761110809/devkofi/xt8lcpd6ea2twj8epmd6.jpg";

const HomePage = () => {
  return (
    <section className="home-page">
      <header className="home-page__hero">
        <div className="home-page__hero-inner">
          <div className="home-page__copy">
            <p className="home-page__badge">Behavior Management Platform</p>

            <h1 className="home-page__title">
              Bring behavior, accountability, and rewards into one school
              workflow.
            </h1>

            <p className="home-page__subtitle">
              DetentionDesk helps staff capture incidents fast, assign
              detentions with clear permissions, and track rewards with a
              transparent audit trail.
            </p>

            <div className="home-page__actions">
              <Link to="/register">
                <Button label="Get Started" />
              </Link>

              <Link to="/login">
                <Button label="Login" variant="secondary" />
              </Link>
            </div>

            <div className="home-page__trust">
              <span className="home-page__trust-item">
                Role-based workflows
              </span>
              <span className="home-page__dot" />
              <span className="home-page__trust-item">
                School-scoped categories
              </span>
              <span className="home-page__dot" />
              <span className="home-page__trust-item">Clear audit trails</span>
            </div>
          </div>

          <div className="home-page__visual" aria-hidden="true">
            <div className="home-page__image-card">
              <img
                className="home-page__image"
                src={HERO_IMAGE}
                alt="Teacher using behavior management software"
                loading="lazy"
              />

              <div className="home-page__stat">
                <p className="home-page__stat-label">
                  Weekly Behavior Overview
                </p>

                <div className="home-page__stat-row">
                  <span className="home-page__stat-number">93%</span>

                  <div className="home-page__bars">
                    <div className="home-page__bar home-page__bar--a" />
                    <div className="home-page__bar home-page__bar--b" />
                  </div>
                </div>

                <p className="home-page__stat-foot">
                  Fewer incidents after consistent follow-through.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="home-page__highlights">
        <div className="home-page__highlights-inner">
          <article className="home-page__card">
            <div className="home-page__card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 7h8M8 11h8M8 15h5M7 3h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3>Fast incident capture</h3>
            <p>
              Log incidents in seconds with structured categories and clean
              notes.
            </p>
          </article>

          <article className="home-page__card">
            <div className="home-page__card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.2 12.2 11 14l3.8-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3>Detentions that make sense</h3>
            <p>
              Clear workflows with permissions, approvals, and visibility for
              staff.
            </p>
          </article>

          <article className="home-page__card">
            <div className="home-page__card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 21h8M12 17v4M7 3h10v6a5 5 0 0 1-10 0V3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 5h2v2a4 4 0 0 1-2 3.5M7 5H5v2a4 4 0 0 0 2 3.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3>Rewards + transparency</h3>
            <p>
              Celebrate positive behavior and maintain accountability with a
              complete audit trail.
            </p>
          </article>
        </div>
      </section>
    </section>
  );
};

export default HomePage;
