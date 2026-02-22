import { Link } from "react-router-dom";
import Button from "../../components/button/Button";
import "./about-page.styles.scss";

const AboutPage = () => {
  return (
    <section className="about-page">
      <header className="about-page__header">
        <h1>Built for Educators</h1>
        <p className="subtitle">
          Practical behavior systems that put teachers back in control of their
          classrooms.
        </p>
      </header>

      <div className="about-page__content">
        <article className="mission-card">
          <h2>Our Mission</h2>
          <p>
            We noticed that most school software is built for administrators and
            "enterprise" requirements, often leaving the actual teachers with
            clunky, slow, and confusing tools.
          </p>
          <p>
            DetentionDesk was born from a simple idea:{" "}
            <strong>speed and clarity.</strong> We help schools create
            consistent, transparent, and restorative discipline practices by
            making the data entry effortless and the audit trails undeniable.
          </p>

          <div className="about-page__values">
            <div className="value-item">
              <h4>Teacher-First</h4>
              <p>
                Designed to be used in the middle of a busy hallway or a loud
                classroom.
              </p>
            </div>
            <div className="value-item">
              <h4>Radical Transparency</h4>
              <p>
                No more "he-said, she-said." Every action has a clear timestamp
                and owner.
              </p>
            </div>
            <div className="value-item">
              <h4>Zero Bloat</h4>
              <p>
                We don't do everything. We just do behavior and rewards better
                than anyone else.
              </p>
            </div>
          </div>
        </article>

        <section className="about-page__footer">
          <h3>Ready to transform your school workflow?</h3>
          <div
            style={{ display: "flex", gap: "1rem", justifyContent: "center" }}
          >
            <Link to="/register">
              <Button label="Register Your School" />
            </Link>
            <Link to="/contact">
              <Button label="Talk to Sales" variant="secondary" />
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
};

export default AboutPage;
