import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./student-detention-ops-page.styles.scss";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

const AdminStudentDetentionOpsPage = () => {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  const fetchStudents = useCallback(
    async (q, pg) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          q,
          page: String(pg),
          limit: "20",
          status: "active",
          includeDetentionToday: "true",
        });
        const payload = await apiRequest({ path: `/api/students?${params.toString()}`, token });
        setStudents(payload.data || []);
        setMeta(payload.meta || { page: 1, pages: 0, total: 0 });
      } catch (err) {
        setError(err.message || "Could not load students");
        setStudents([]);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH) {
      setStudents([]);
      setMeta({ page: 1, pages: 0, total: 0 });
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchStudents(query, page);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, page, fetchStudents]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };

  const hasResults = students.length > 0;
  const showNoResults = !loading && !error && query.length >= MIN_QUERY_LENGTH && !hasResults;
  const showPrompt = query.length < MIN_QUERY_LENGTH && !loading;

  return (
    <section className="app-page student-detention-ops">
      <header className="student-detention-ops-header">
        <h1>Detention Ops</h1>
        <p className="student-detention-ops-subtitle">
          Search for a student to check their detention status and history.
        </p>
      </header>

      <div className="student-detention-ops-search">
        <input
          className="student-detention-ops-input"
          onChange={handleQueryChange}
          placeholder="Search by student name…"
          type="search"
          value={query}
        />
      </div>

      {error ? <p className="student-detention-ops-state error">{error}</p> : null}
      {loading ? <p className="student-detention-ops-state">Searching…</p> : null}

      {showPrompt ? (
        <p className="student-detention-ops-state muted">
          Search by student name to check detention status.
        </p>
      ) : null}

      {showNoResults ? (
        <p className="student-detention-ops-state muted">
          No students found for &ldquo;{query}&rdquo;.
        </p>
      ) : null}

      {!loading && !error && hasResults ? (
        <>
          <div className="student-detention-ops-table-wrap">
            <table className="student-detention-ops-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Year / Form</th>
                  <th>Group</th>
                  <th>Serving Today</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <Link to={`/admin/students/${student._id}`}>
                        {student.firstName} {student.lastName}
                      </Link>
                      {student.admissionNumber ? (
                        <div className="student-detention-ops-subtext">{student.admissionNumber}</div>
                      ) : null}
                    </td>
                    <td>
                      {student.yearGroup || "—"}
                      {student.form ? ` / ${student.form}` : ""}
                    </td>
                    <td>{student.groupLabel || student.group?.label || "—"}</td>
                    <td>
                      {student.detentionToday ? (
                        <span className="student-detention-ops-badge today">Serving Today</span>
                      ) : (
                        <span className="student-detention-ops-badge none">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="student-detention-ops-footer">
            <div className="student-detention-ops-meta">
              Page {meta.page} of {meta.pages || 1} ({meta.total} total)
            </div>
            <div className="student-detention-ops-pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                type="button"
              >
                Previous
              </button>
              <button
                disabled={meta.pages ? page >= meta.pages : true}
                onClick={() => setPage((p) => p + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </footer>
        </>
      ) : null}
    </section>
  );
};

export default AdminStudentDetentionOpsPage;
