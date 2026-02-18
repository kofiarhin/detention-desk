import './dashboard-widget.styles.scss'

const DashboardWidget = ({ title, items, emptyText }) => {
  return (
    <section className="dashboard-widget">
      <h2 className="dashboard-widget-title">{title}</h2>

      {items.length === 0 ? (
        <p className="dashboard-widget-empty">{emptyText}</p>
      ) : (
        <ul className="dashboard-widget-list">
          {items.map((item) => (
            <li className="dashboard-widget-item" key={item.id}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default DashboardWidget
