import Card from '../../components/card/Card'
import './settings-page.styles.scss'

const SettingsPage = () => {
  return (
    <section className="app-page">
      <h1>Settings</h1>
      <div className="settings-grid">
        <Card title="Policy">Default detention settings and offsets placeholder.</Card>
        <Card title="Categories">Behaviour and reward categories placeholder.</Card>
        <Card title="Staff">Staff invite and permissions placeholder.</Card>
      </div>
    </section>
  )
}

export default SettingsPage
