import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/button/Button'
import Input from '../../components/input/Input'
import { useAuth } from '../../context/AuthContext'
import './register-page.styles.scss'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    schoolName: '',
    schoolCode: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  })

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await register(form)
      navigate('/app/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-page" onSubmit={onSubmit}>
      <h1>Create your school admin account</h1>
      <Input id="schoolName" label="School Name" name="schoolName" onChange={onChange} required value={form.schoolName} />
      <Input id="schoolCode" label="School Code" name="schoolCode" onChange={onChange} required value={form.schoolCode} />
      <Input id="adminName" label="Admin Full Name" name="adminName" onChange={onChange} required value={form.adminName} />
      <Input id="adminEmail" label="Admin Email" name="adminEmail" onChange={onChange} required type="email" value={form.adminEmail} />
      <Input id="adminPassword" label="Admin Password" name="adminPassword" onChange={onChange} required type="password" value={form.adminPassword} />
      {error ? <p className="auth-page-error">{error}</p> : null}
      <Button disabled={loading} label={loading ? 'Creating school...' : 'Create School'} type="submit" />
      <p className="auth-page-helper">
        Already registered? <Link to="/login">Login</Link>
      </p>
    </form>
  )
}

export default RegisterPage
