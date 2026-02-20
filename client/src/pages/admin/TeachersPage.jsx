import { useCallback, useEffect, useState } from 'react'
import Modal from '../../components/modal/Modal'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../services/api'
import './teachers-page.styles.scss'

const AdminTeachersPage = () => {
  const { token } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const loadTeachers = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await apiRequest({ path: '/api/admin/teachers', token })
      setTeachers(payload.data || [])
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadTeachers()
  }, [loadTeachers])

  const toggleStatus = async (teacher) => {
    const nextAction = teacher.status === 'active' ? 'deactivate' : 'reactivate'
    if (!window.confirm(`Confirm ${nextAction} ${teacher.name}?`)) return
    await apiRequest({ path: `/api/admin/teachers/${teacher._id || teacher.id}/${nextAction}`, method: 'PATCH', token })
    loadTeachers()
  }

  const createTeacher = async (event) => {
    event.preventDefault()
    await apiRequest({ path: '/api/admin/teachers', method: 'POST', token, body: form })
    setOpen(false)
    setForm({ name: '', email: '', password: '' })
    loadTeachers()
  }

  return (
    <section className="app-page">
      <h1>Teacher Management</h1>
      <button onClick={() => setOpen(true)} type="button">Create Teacher</button>
      {loading ? <p>Loading teachers...</p> : null}
      {error ? <p>{error}</p> : null}
      {!loading && !teachers.length ? <p>No teachers found.</p> : null}
      {teachers.length ? (
        <table className="admin-teachers-table">
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher._id || teacher.id}>
                <td>{teacher.name}</td><td>{teacher.email}</td><td>{teacher.status}</td>
                <td><button onClick={() => toggleStatus(teacher)} type="button">{teacher.status === 'active' ? 'Deactivate' : 'Reactivate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {open ? (
        <Modal onClose={() => setOpen(false)} title="Create Teacher">
          <form className="admin-form" onSubmit={createTeacher}>
            <input onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="Name" required value={form.name} />
            <input onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} placeholder="Email" required type="email" value={form.email} />
            <input onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} placeholder="Password" required type="password" value={form.password} />
            <button type="submit">Create</button>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}

export default AdminTeachersPage
