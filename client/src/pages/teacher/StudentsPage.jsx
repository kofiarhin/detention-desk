/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../services/api'

const TeacherStudentsPage = () => {
  const { token } = useAuth()
  const [students, setStudents] = useState([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ pages: 1 })

  const load = useCallback(async () => {
    const payload = await apiRequest({ path: `/api/students?page=${page}&q=${encodeURIComponent(query)}`, token })
    setStudents(payload.data || [])
    setMeta(payload.meta || { pages: 1 })
  }, [page, query, token])

    useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="app-page">
      <h1>Assigned Students</h1>
      <input onChange={(e) => setQuery(e.target.value)} placeholder="Search" value={query} />
      <button onClick={() => setPage(1)} type="button">Search</button>
      {students.length ? <ul>{students.map((student) => <li key={student._id}><Link to={`/teacher/students/${student._id}`}>{student.firstName} {student.lastName}</Link></li>)}</ul> : <p>No assigned students found.</p>}
      <div><button disabled={page <= 1} onClick={() => setPage((v) => v - 1)} type="button">Prev</button><span>{page}/{meta.pages || 1}</span><button disabled={page >= (meta.pages || 1)} onClick={() => setPage((v) => v + 1)} type="button">Next</button></div>
    </section>
  )
}

export default TeacherStudentsPage
