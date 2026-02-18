import Button from '../../components/button/Button'
import EmptyState from '../../components/empty-state/EmptyState'

const StudentsPage = () => {
  return (
    <section className="app-page">
      <h1>Students</h1>
      <Button label="Add Student" />
      <EmptyState title="Student table scaffold" message="List and profile features are planned for the next phase." />
    </section>
  )
}

export default StudentsPage
