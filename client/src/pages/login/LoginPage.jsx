import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import './login-page.styles.scss'

const LoginPage = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({ schoolCode: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      })

      saveSession({ token: data.token, user: data.user })
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-form" onSubmit={onSubmit}>
        <h1 className="login-title">DetentionDesk Login</h1>

        <label className="login-label" htmlFor="schoolCode">
          School Code
        </label>
        <input
          className="login-input"
          id="schoolCode"
          name="schoolCode"
          onChange={onChange}
          required
          type="text"
          value={form.schoolCode}
        />

        <label className="login-label" htmlFor="email">
          Email
        </label>
        <input
          className="login-input"
          id="email"
          name="email"
          onChange={onChange}
          required
          type="email"
          value={form.email}
        />

        <label className="login-label" htmlFor="password">
          Password
        </label>
        <input
          className="login-input"
          id="password"
          name="password"
          onChange={onChange}
          required
          type="password"
          value={form.password}
        />

        {error ? <p className="login-error">{error}</p> : null}

        <button className="login-button" disabled={loading} type="submit">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  )
}

export default LoginPage
