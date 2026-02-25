import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../components/modal/Modal";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import { fetchAdminGroups } from "../../services/groups.service";
import "./teachers-page.styles.scss";

const AdminTeachersPage = () => {
  const { token } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", groupId: "" });

  const unownedGroups = useMemo(
    () => groups.filter((group) => !group.ownerTeacherId),
    [groups],
  );

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const [teacherPayload, groupItems] = await Promise.all([
        apiRequest({ path: "/api/admin/teachers", token }),
        fetchAdminGroups({ token }),
      ]);
      setTeachers(teacherPayload.data || []);
      setGroups(groupItems || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const toggleStatus = async (teacher) => {
    const nextAction =
      teacher.status === "active" ? "deactivate" : "reactivate";
    if (!window.confirm(`Confirm ${nextAction} ${teacher.name}?`)) return;
    await apiRequest({
      path: `/api/admin/teachers/${teacher._id || teacher.id}/${nextAction}`,
      method: "PATCH",
      token,
    });
    loadTeachers();
  };

  const createTeacher = async (event) => {
    event.preventDefault();
    await apiRequest({
      path: "/api/admin/teachers",
      method: "POST",
      token,
      body: form,
    });
    setOpen(false);
    setForm({ name: "", email: "", password: "", groupId: "" });
    loadTeachers();
  };

  return (
    <section className="app-page">
      <h1>Teacher Management</h1>

      <button
        className="create-btn"
        onClick={() => setOpen(true)}
        type="button"
      >
        Create Teacher
      </button>

      {loading && <p className="status-msg">Loading teachers...</p>}
      {error && <p className="error-msg">{error}</p>}

      {!loading && !teachers.length && !error && (
        <p className="status-msg">No teachers found.</p>
      )}

      {teachers.length > 0 && (
        <table className="admin-teachers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Owned Group</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher._id || teacher.id}>
                <td>{teacher.name}</td>
                <td>{teacher.email}</td>
                <td>{teacher.ownedGroup?.label || "Unassigned"}</td>
                <td className={`status-${teacher.status}`}>{teacher.status}</td>
                <td>
                  <button onClick={() => toggleStatus(teacher)} type="button">
                    {teacher.status === "active" ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open && (
        <Modal onClose={() => setOpen(false)} title="Create Teacher">
          <form className="admin-form" onSubmit={createTeacher}>
            <input
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
              placeholder="Full Name"
              required
              value={form.name}
            />
            <input
              onChange={(e) =>
                setForm((v) => ({ ...v, email: e.target.value }))
              }
              placeholder="Email Address"
              required
              type="email"
              value={form.email}
            />
            <input
              onChange={(e) =>
                setForm((v) => ({ ...v, password: e.target.value }))
              }
              placeholder="Initial Password"
              required
              type="password"
              value={form.password}
            />
            <select
              onChange={(e) => setForm((v) => ({ ...v, groupId: e.target.value }))}
              required
              value={form.groupId}
            >
              <option value="">Assign Group</option>
              {unownedGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
            <button type="submit">Create Account</button>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default AdminTeachersPage;
