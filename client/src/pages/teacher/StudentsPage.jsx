/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./teacher-students-page.styles.scss";

const TeacherStudentsPage = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ pages: 1 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest({
        path: `/students?page=${page}&q=${encodeURIComponent(query)}`,
        token,
      });
      setStudents(payload.data || []);
      setMeta(payload.meta || { pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, query, token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const q = (searchParams.get("q") || "").trim();
    if (q) {
      setQuery(q);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <section className="teacher-students-page">
      <header className="teacher-students-page__header">
        <div className="teacher-students-page__title-wrap">
          <h1 className="teacher-students-page__title">Assigned Students</h1>
          <p className="teacher-students-page__subtitle">
            Search and open a student profile.
          </p>
        </div>

        <form className="teacher-students-page__search" onSubmit={handleSearch}>
          <input
            className="teacher-students-page__search-input"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or group…"
            value={query}
          />
          <button className="teacher-students-page__search-btn" type="submit">
            Search
          </button>
        </form>
      </header>

      {loading ? (
        <div className="teacher-students-page__empty">Refreshing…</div>
      ) : students.length ? (
        <ul className="teacher-students-page__grid">
          {students.map((student) => (
            <li className="teacher-students-page__card" key={student._id}>
              <Link
                className="teacher-students-page__card-link"
                to={`/teacher/students/${student._id}`}
              >
                <div className="teacher-students-page__card-top">
                  <span className="teacher-students-page__name">
                    {student.firstName} {student.lastName}
                  </span>
                  <span className="teacher-students-page__badge">
                    Group
                  </span>
                </div>
                <div className="teacher-students-page__meta">
                  {student.group?.label || student.groupLabel || "Unassigned group"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="teacher-students-page__empty">No students found.</div>
      )}

      <footer className="teacher-students-page__pagination">
        <button
          className="teacher-students-page__page-btn"
          disabled={page <= 1}
          onClick={() => setPage((v) => v - 1)}
          type="button"
        >
          Previous
        </button>

        <span className="teacher-students-page__page-indicator">
          {page} / {meta.pages || 1}
        </span>

        <button
          className="teacher-students-page__page-btn"
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
