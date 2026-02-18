import Card from '../../components/card/Card'
import './features-page.styles.scss'

const FeaturesPage = () => {
  const features = [
    'Student profiles with behavior trends',
    'Incident logging with category controls',
    'Detention assignment and completion tracking',
    'Reward minute offsets and positive points',
    'Audit history for accountability',
  ]

  return (
    <section className="features-page">
      <h1>Features</h1>
      <div className="features-page-grid">
        {features.map((item) => (
          <Card key={item}>
            <p>{item}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

export default FeaturesPage
