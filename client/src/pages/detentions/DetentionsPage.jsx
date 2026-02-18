import Button from '../../components/button/Button'
import EmptyState from '../../components/empty-state/EmptyState'

const DetentionsPage = () => {
  return (
    <section className="app-page">
      <h1>Detentions</h1>
      <Button label="Assign Detention" />
      <EmptyState title="Detention table scaffold" message="Scheduling and completion operations are coming next." />
    </section>
  )
}

export default DetentionsPage
