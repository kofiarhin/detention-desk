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
  const [copied, setCopied] = useState(false)
  const [generatedSchoolCode, setGeneratedSchoolCode] = useState('')
  const [form, setForm] = useState({
    schoolName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  })

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const onCopySchoolCode = async () => {
    if (!generatedSchoolCode) return

    try {
      await navigator.clipboard.writeText(generatedSchoolCode)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const session = await register(form)
      setGeneratedSchoolCode(session?.school?.schoolCode || '')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  if (generatedSchoolCode) {
    return (
      <section className="auth-page">
        <h1>School created successfully</h1>
        <div className="auth-page-success">
          <p className="auth-page-success-label">Your School Code</p>
          <p className="auth-page-success-code">{generatedSchoolCode}</p>
          <p className="auth-page-helper">You’ll use this code to log in.</p>
          <Button label={copied ? 'Copied!' : 'Copy'} onClick={onCopySchoolCode} type="button" />
        </div>
        <div className="auth-page-actions">
          <Button label="Go to Login" onClick={() => navigate('/login')} type="button" />
          <Button label="Continue to Dashboard" onClick={() => navigate('/admin/dashboard')} type="button" />
        </div>
      </section>
    )
  }

  return (
    <form className="auth-page" onSubmit={onSubmit}>
      <h1>Create your school admin account</h1>
      <Input id="schoolName" label="School Name" name="schoolName" onChange={onChange} required value={form.schoolName} />
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
