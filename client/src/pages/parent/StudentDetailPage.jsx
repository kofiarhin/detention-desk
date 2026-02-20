import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../services/api'

const ParentStudentDetailPage = () => {
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [studentPayload, timelinePayload] = await Promise.all([
          apiRequest({ path: `/api/parent/students/${id}`, token }),
          apiRequest({ path: `/api/parent/students/${id}/timeline`, token }),
        ])
        setStudent(studentPayload.data)
        setTimeline(timelinePayload.data || [])
      } catch (requestError) {
        if (requestError.status === 403 || requestError.status === 404) {
          setError('Access revoked')
          return
        }
        setError(requestError.message)
      }
    }
    load()
  }, [id, token])

  if (error === 'Access revoked') {
    return <section className="app-page"><h1>Access revoked</h1><button onClick={() => navigate('/parent/students')} type="button">Back to students</button></section>
  }

  return (
    <section className="app-page">
      <h1>Student Timeline</h1>
      {error ? <p>{error}</p> : null}
      {student ? <p>{student.firstName} {student.lastName}</p> : <p>Loading...</p>}
      {!timeline.length ? <p>No timeline records.</p> : <ul>{timeline.map((item) => <li key={`${item.type}-${item.item._id}`}>{item.type} - {item.item.notes || item.item.text || item.item.status || 'record'}</li>)}</ul>}
      <Link to="/parent/students">Back</Link>
    </section>
  )
}

export default ParentStudentDetailPage
