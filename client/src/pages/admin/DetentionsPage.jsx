/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../services/api'

const AdminDetentionsPage = () => {
  const { token } = useAuth()
  const [detentions, setDetentions] = useState([])
  const [selected, setSelected] = useState([])
  const [status, setStatus] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [result, setResult] = useState('')

  const load = useCallback(async () => {
    const payload = await apiRequest({ path: `/api/detentions?status=${status}`, token })
    setDetentions(payload.data || [])
  }, [status, token])

    useEffect(() => {
    void load()
  }, [load])

  const toggle = (id) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const runBulk = async (path, body = {}) => {
    if (!selected.length) return
    if (!window.confirm('Confirm bulk action?')) return
    const payload = await apiRequest({ path, method: 'POST', token, body: { detentionIds: selected, ...body } })
    setResult(JSON.stringify(payload.data))
    setSelected([])
    load()
  }

  return (
    <section className="app-page">
      <h1>Bulk Detention Operations</h1>
      <label htmlFor="status-filter">Status</label>
      <select id="status-filter" onChange={(e) => setStatus(e.target.value)} value={status}>
        <option value="">All</option><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="served">Served</option><option value="voided">Voided</option>
      </select>
      <table>
        <thead><tr><th /></tr></thead>
        <tbody>
          {detentions.map((item) => (
            <tr key={item._id}><td><input checked={selected.includes(item._id)} onChange={() => toggle(item._id)} type="checkbox" /> {item.status} - {item.minutesAssigned} minutes</td></tr>
          ))}
        </tbody>
      </table>
      <div>
        <button onClick={() => runBulk('/api/detentions/bulk/serve')} type="button">Serve Selected</button>
        <button onClick={() => runBulk('/api/detentions/bulk/void')} type="button">Void Selected</button>
        <input onChange={(e) => setScheduledFor(e.target.value)} type="datetime-local" value={scheduledFor} />
        <button onClick={() => runBulk('/api/detentions/bulk/schedule', { scheduledFor: new Date(scheduledFor).toISOString() })} type="button">Schedule Selected</button>
      </div>
      {result ? <pre>{result}</pre> : null}
    </section>
  )
}

export default AdminDetentionsPage
