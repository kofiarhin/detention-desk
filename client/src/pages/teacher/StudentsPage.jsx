/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./teacher-students-page.styles.scss";

const TeacherStudentsPage = () => {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ pages: 1 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest({
        path: `/api/students?page=${page}&q=${encodeURIComponent(query)}`,
        token,
      });
      setStudents(payload.data || []);
      setMeta(payload.meta || { pages: 1 });
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoading(false);
    }
  }, [page, query, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <section className="app-page teacher-students-page">
      <h1>Assigned Students</h1>

      <form className="search-container" onSubmit={handleSearch}>
        <input
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by student name or form..."
          value={query}
        />
        <button className="search-btn" type="submit">
          Search
        </button>
      </form>

      {loading ? (
        <div className="empty-state">Refreshing student records...</div>
      ) : students.length ? (
        <ul className="students-grid">
          {students.map((student) => (
            <li key={student._id}>
              <Link
                className="student-card-link"
                to={`/teacher/students/${student._id}`}
              >
                <span className="student-name">
                  {student.firstName} {student.lastName}
                </span>
                <span className="student-meta">
                  Year {student.yearGroup || "N/A"} • Form{" "}
                  {student.form || "N/A"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          No students found matching your criteria.
        </div>
      )}

      <footer className="pagination-bar">
        <button
          disabled={page <= 1}
          onClick={() => setPage((v) => v - 1)}
          type="button"
        >
          Previous
        </button>

        <span className="page-indicator">
          {page} <small style={{ color: "#4b5563", margin: "0 4px" }}>/</small>{" "}
          {meta.pages || 1}
        </span>

        <button
          disabled={page >= (meta.pages || 1)}
          onClick={() => setPage((v) => v + 1)}
          type="button"
        >
          Next
        </button>
      </footer>
    </section>
  );
};

export default TeacherStudentsPage;
