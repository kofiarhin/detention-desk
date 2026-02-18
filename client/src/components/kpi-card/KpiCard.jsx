import './kpi-card.styles.scss'

const KpiCard = ({ label, value }) => {
  return (
    <article className="kpi-card">
      <p className="kpi-card-label">{label}</p>
      <p className="kpi-card-value">{value}</p>
    </article>
  )
}

export default KpiCard
