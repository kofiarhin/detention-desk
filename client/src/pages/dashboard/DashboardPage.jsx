import Card from '../../components/card/Card'
import EmptyState from '../../components/empty-state/EmptyState'
import './dashboard-page.styles.scss'

const DashboardPage = () => {
  return (
    <section className="app-page">
      <h1>Dashboard</h1>
      <div className="dashboard-grid">
        <Card title="Students">0 Active Records</Card>
        <Card title="Incidents">No incidents this week</Card>
        <Card title="Detentions">No pending detentions</Card>
      </div>
      <EmptyState
        message="Phase 4 will introduce live analytics and dashboard widgets."
        title="Dashboard data is coming next"
      />
    </section>
  )
}

export default DashboardPage
