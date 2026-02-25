/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Modal from "../../components/modal/Modal";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import { assignGroupOwner, fetchAdminGroups } from "../../services/groups.service";
import "./students-page.styles.scss";

const emptyForm = {
  firstName: "",
  lastName: "",
  admissionNumber: "",
  groupId: "",
};

const AdminStudentsPage = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ pages: 1 });
  const [form, setForm] = useState(emptyForm);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openReassign, setOpenReassign] = useState(false);

  const teachersById = useMemo(
    () => new Map(teachers.map((teacher) => [teacher._id || teacher.id, teacher])),
    [teachers],
  );

  const resolveGroupId = (groupValue) => {
    if (!groupValue) return "";
    if (typeof groupValue === "string") return groupValue;
    return groupValue._id || groupValue.id || "";
  };

  const loadTeachers = useCallback(async () => {
    const payload = await apiRequest({
      path: "/api/admin/teachers?limit=200",
      token,
    });
    setTeachers(payload.data || []);
  }, [token]);

  const loadGroups = useCallback(async () => {
    const payload = await fetchAdminGroups({ token });
    setGroups(payload || []);
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
    void loadGroups();
  }, [loadTeachers, loadGroups]);

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

  const reassignGroupOwner = async (teacherId) => {
    if (!selectedGroup) return;

    await assignGroupOwner({
      token,
      groupId: selectedGroup._id || selectedGroup.id,
      ownerTeacherId: teacherId || null,
    });

    setOpenReassign(false);
    setSelectedGroup(null);
    loadGroups();
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
            <th>Group</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const studentGroupId = resolveGroupId(student.groupId);
            const selected = groups.find((group) => group.id === studentGroupId);
            const ownerId = selected?.ownerTeacherId?._id || selected?.ownerTeacherId;

            return (
              <tr key={student._id}>
                <td>
                  <Link to={`/admin/students/${student._id}`}>
                    {student.firstName} {student.lastName}
                  </Link>
                </td>
                <td>{student.admissionNumber}</td>
                <td>
                  <select
                    defaultValue={studentGroupId || ""}
                    onChange={(e) =>
                      updateStudent({ ...student, groupId: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      Select group
                    </option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{teachersById.get(ownerId)?.name || selected?.ownerTeacherId?.name || "Unassigned"}</td>
                <td>{student.status}</td>
                <td>
                  <button
                    onClick={() => {
                      setSelectedGroup(selected || student.group || { _id: studentGroupId });
                      setOpenReassign(true);
                    }}
                    type="button"
                  >
                    Reassign Group Owner
                  </button>
                </td>
              </tr>
            );
          })}
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
          Page {page} of {meta.pages || 1}
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
            <input
              onChange={(e) =>
                setForm((v) => ({ ...v, firstName: e.target.value }))
              }
              placeholder="firstName"
              required
              value={form.firstName}
            />
            <input
              onChange={(e) =>
                setForm((v) => ({ ...v, lastName: e.target.value }))
              }
              placeholder="lastName"
              required
              value={form.lastName}
            />
            <input
              onChange={(e) =>
                setForm((v) => ({ ...v, admissionNumber: e.target.value }))
              }
              placeholder="admissionNumber"
              required
              value={form.admissionNumber}
            />
            <select
              onChange={(e) =>
                setForm((v) => ({ ...v, groupId: e.target.value }))
              }
              required
              value={form.groupId}
            >
              <option value="">Group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
            <button type="submit">Create</button>
          </form>
        </Modal>
      ) : null}
      {openReassign && selectedGroup ? (
        <Modal onClose={() => setOpenReassign(false)} title="Reassign Group Owner">
          <select
            defaultValue={selectedGroup.ownerTeacherId?._id || selectedGroup.ownerTeacherId || ""}
            onChange={(e) => reassignGroupOwner(e.target.value)}
          >
            <option value="">Unassigned</option>
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
