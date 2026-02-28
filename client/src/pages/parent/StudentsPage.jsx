import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../services/api'

const ParentStudentsPage = () => {
  const { token } = useAuth()
  const [students, setStudents] = useState([])
  const [state, setState] = useState({ loading: true, error: '' })

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await apiRequest({ path: '/parent/students', token })
        setStudents(payload.data || [])
        setState({ loading: false, error: '' })
      } catch (error) {
        setState({ loading: false, error: error.message })
      }
    }
    load()
  }, [token])

  return (
    <section className="app-page">
      <h1>Linked Students</h1>
      {state.loading ? <p>Loading students...</p> : null}
      {state.error ? <p>{state.error}</p> : null}
      {!state.loading && !students.length ? <p>No linked students.</p> : null}
      <ul>{students.map((student) => <li key={student._id}><Link to={`/parent/students/${student._id}`}>{student.firstName} {student.lastName}</Link></li>)}</ul>
    </section>
  )
}

export default ParentStudentsPage
