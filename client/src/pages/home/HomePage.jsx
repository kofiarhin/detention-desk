import { Link } from 'react-router-dom'
import Button from '../../components/button/Button'
import './home-page.styles.scss'

const HomePage = () => {
  return (
    <section className="home-page">
      <div className="home-page-hero">
        <p className="home-page-badge">Behavior Management Platform</p>
        <h1>Bring behavior, accountability, and rewards into one school workflow.</h1>
        <p>
          DetentionDesk helps staff track incidents, assign detentions, and celebrate positive student behavior
          with confidence.
        </p>
        <div className="home-page-actions">
          <Link to="/register">
            <Button label="Get Started" />
          </Link>
          <Link to="/login">
            <Button label="Login" variant="secondary" />
          </Link>
        </div>
      </div>
      <div className="home-page-features">
        <article>Fast incident capture with school-scoped categories.</article>
        <article>Detention workflows with role-based permissions.</article>
        <article>Rewards and audit trails for transparent discipline.</article>
      </div>
    </section>
  )
}

export default HomePage
