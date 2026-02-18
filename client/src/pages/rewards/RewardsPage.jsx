import Button from '../../components/button/Button'
import EmptyState from '../../components/empty-state/EmptyState'

const RewardsPage = () => {
  return (
    <section className="app-page">
      <h1>Rewards</h1>
      <Button label="Add Reward" />
      <EmptyState title="Rewards table scaffold" message="Reward creation and offsets will be implemented in a later phase." />
    </section>
  )
}

export default RewardsPage
