import Button from '../../components/button/Button'
import EmptyState from '../../components/empty-state/EmptyState'

const IncidentsPage = () => {
  return (
    <section className="app-page">
      <h1>Incidents</h1>
      <Button label="Add Incident" />
      <EmptyState title="Incident table scaffold" message="Filtering, categories, and workflows will be wired in upcoming phases." />
    </section>
  )
}

export default IncidentsPage
