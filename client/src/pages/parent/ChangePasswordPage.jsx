import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../services/api'

const ParentChangePasswordPage = () => {
  const navigate = useNavigate()
  const { token, refreshMe } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.newPassword !== form.confirmNewPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await apiRequest({ path: '/auth/change-password', method: 'POST', token, body: { currentPassword: form.currentPassword, newPassword: form.newPassword } })
      await refreshMe()
      navigate('/parent/students', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="app-page">
      <h1>Change Password</h1>
      <form onSubmit={submit}>
        <input onChange={(e) => setForm((v) => ({ ...v, currentPassword: e.target.value }))} placeholder="Current password" required type="password" value={form.currentPassword} />
        <input onChange={(e) => setForm((v) => ({ ...v, newPassword: e.target.value }))} placeholder="New password" required type="password" value={form.newPassword} />
        <input onChange={(e) => setForm((v) => ({ ...v, confirmNewPassword: e.target.value }))} placeholder="Confirm password" required type="password" value={form.confirmNewPassword} />
        {error ? <p>{error}</p> : null}
        <button disabled={loading} type="submit">{loading ? 'Saving...' : 'Update password'}</button>
      </form>
    </section>
  )
}

export default ParentChangePasswordPage
