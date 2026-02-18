import './card.styles.scss'

const Card = ({ title, children }) => {
  return (
    <section className="card">
      {title ? <h3 className="card-title">{title}</h3> : null}
      {children}
    </section>
  )
}

export default Card
