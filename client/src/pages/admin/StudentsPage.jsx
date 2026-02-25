/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Modal from "../../components/modal/Modal";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./students-page.styles.scss";

const emptyForm = {
  firstName: "",
  lastName: "",
  admissionNumber: "",
  yearGroup: "",
  form: "",
  assignedTeacherId: "",
};

const AdminStudentsPage = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ pages: 1 });
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openReassign, setOpenReassign] = useState(false);

  const loadTeachers = useCallback(async () => {
    const payload = await apiRequest({
      path: "/api/admin/teachers?limit=200",
      token,
    });
    setTeachers(payload.data || []);
  }, [token]);

  const loadStudents = useCallback(async () => {
    const payload = await apiRequest({
      path: `/api/students?page=${page}&q=${encodeURIComponent(query)}`,
      token,
    });
    setStudents(payload.data || []);
    setMeta(payload.meta || { pages: 1 });
  }, [page, query, token]);

  useEffect(() => {
    const q = (searchParams.get("q") || "").trim();
    if (q) {
      setQuery(q);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const createStudent = async (event) => {
    event.preventDefault();
    await apiRequest({
      path: "/api/students",
      method: "POST",
      token,
      body: form,
    });
    setOpenCreate(false);
    setForm(emptyForm);
    loadStudents();
  };

  const updateStudent = async (student) => {
    await apiRequest({
      path: `/api/students/${student._id}`,
      method: "PUT",
      token,
      body: student,
    });
    loadStudents();
  };

  const reassignStudent = async (teacherId) => {
    await apiRequest({
      path: `/api/admin/students/${selected._id}/reassign`,
      method: "PATCH",
      token,
      body: { assignedTeacherId: teacherId },
    });
    setOpenReassign(false);
    setSelected(null);
    loadStudents();
  };

  return (
    <section className="app-page">
      <h1>Student Management</h1>
      <div className="admin-students-toolbar">
        <input
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students"
          value={query}
        />
        <button onClick={() => setPage(1)} type="button">
          Search
        </button>
        <button onClick={() => setOpenCreate(true)} type="button">
          Create Student
        </button>
      </div>
      <table className="admin-students-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Admission</th>
            <th>Year</th>
            <th>Form</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student._id}>
              <td>
                {student.firstName} {student.lastName}
              </td>
              <td>{student.admissionNumber}</td>
              <td>
                <input
                  defaultValue={student.yearGroup}
                  onBlur={(e) =>
                    updateStudent({ ...student, yearGroup: e.target.value })
                  }
                />
              </td>
              <td>
                <input
                  defaultValue={student.form}
                  onBlur={(e) =>
                    updateStudent({ ...student, form: e.target.value })
                  }
                />
              </td>
              <td>{student.status}</td>
              <td>
                <button
                  onClick={() => {
                    setSelected(student);
                    setOpenReassign(true);
                  }}
                  type="button"
                >
                  Reassign
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button
          disabled={page <= 1}
          onClick={() => setPage((v) => v - 1)}
          type="button"
        >
          Prev
        </button>
        <span>
          {" "}
          Page {page} of {meta.pages || 1}{" "}
        </span>
        <button
          disabled={page >= (meta.pages || 1)}
          onClick={() => setPage((v) => v + 1)}
          type="button"
        >
          Next
        </button>
      </div>
      {openCreate ? (
        <Modal onClose={() => setOpenCreate(false)} title="Create Student">
          <form className="admin-form" onSubmit={createStudent}>
            {Object.keys(emptyForm).map((key) =>
              key === "assignedTeacherId" ? (
                <select
                  key={key}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      assignedTeacherId: e.target.value,
                    }))
                  }
                  required
                  value={form.assignedTeacherId}
                >
                  <option value="">Assigned Teacher</option>
                  {teachers.map((teacher) => (
                    <option
                      key={teacher._id || teacher.id}
                      value={teacher._id || teacher.id}
                    >
                      {teacher.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  key={key}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, [key]: e.target.value }))
                  }
                  placeholder={key}
                  required
                  value={form[key]}
                />
              ),
            )}
            <button type="submit">Create</button>
          </form>
        </Modal>
      ) : null}
      {openReassign && selected ? (
        <Modal onClose={() => setOpenReassign(false)} title="Reassign Student">
          <select
            defaultValue=""
            onChange={(e) => reassignStudent(e.target.value)}
          >
            <option value="" disabled>
              Select teacher
            </option>
            {teachers.map((teacher) => (
              <option
                key={teacher._id || teacher.id}
                value={teacher._id || teacher.id}
              >
                {teacher.name}
              </option>
            ))}
          </select>
        </Modal>
      ) : null}
    </section>
  );
};

export default AdminStudentsPage;
