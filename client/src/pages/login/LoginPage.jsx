import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/button/Button'
import Input from '../../components/input/Input'
import { useAuth } from '../../context/AuthContext'
import './login-page.styles.scss'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, getRoleHome, sessionMessage } = useAuth()
  const [form, setForm] = useState({ schoolCode: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const nextSession = await login(form)
      navigate(getRoleHome(nextSession.user), { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-page" onSubmit={onSubmit}>
      <h1>Sign in to your school workspace</h1>
      {sessionMessage ? <p className="auth-page-error">{sessionMessage}</p> : null}
      <Input id="schoolCode" label="School Code" name="schoolCode" onChange={onChange} required value={form.schoolCode} />
      <Input id="email" label="Email" name="email" onChange={onChange} required type="email" value={form.email} />
      <Input id="password" label="Password" name="password" onChange={onChange} required type="password" value={form.password} />
      {error ? <p className="auth-page-error">{error}</p> : null}
      <Button disabled={loading} label={loading ? 'Signing in...' : 'Sign In'} type="submit" />
      <p className="auth-page-helper">
        Need a school account? <Link to="/register">Register</Link>
      </p>
    </form>
  )
}

export default LoginPage
