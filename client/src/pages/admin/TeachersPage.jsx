import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../../components/modal/Modal";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import { fetchAdminTeachers, updateAdminTeacherStatus } from "../../services/admin-teachers.service";
import { fetchAdminGroups } from "../../services/groups.service";
import "./teachers-page.styles.scss";

const emptyTeacherForm = { name: "", email: "", password: "", groupId: "" };

const AdminTeachersPage = () => {
  const { token } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [form, setForm] = useState(emptyTeacherForm);

  const unownedGroups = useMemo(
    () => groups.filter((group) => !group.ownerTeacherId),
    [groups],
  );

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const [teacherItems, groupItems] = await Promise.all([
        fetchAdminTeachers({ token }),
        fetchAdminGroups({ token }),
      ]);
      setTeachers(teacherItems || []);
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
    const isActive = teacher.status !== "active";
    if (!window.confirm(`Confirm ${isActive ? "activate" : "deactivate"} ${teacher.name}?`)) return;

    try {
      await updateAdminTeacherStatus({
        token,
        teacherId: teacher._id || teacher.id,
        isActive,
      });
      await loadTeachers();
    } catch (requestError) {
      setError(requestError.message || "Could not update status");
    }
  };

  const createTeacher = async (event) => {
    event.preventDefault();
    await apiRequest({
      path: "/api/admin/teachers",
      method: "POST",
      token,
      body: form,
    });
    setOpenCreateModal(false);
    setForm(emptyTeacherForm);
    loadTeachers();
  };

  return (
    <section className="app-page">
      <h1>Teacher Management</h1>

      <button
        className="create-btn"
        onClick={() => setOpenCreateModal(true)}
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
                <td>
                  <Link to={`/admin/teachers/${teacher._id || teacher.id}`}>
                    {teacher.name}
                  </Link>
                </td>
                <td>{teacher.email}</td>
                <td>{teacher.ownedGroup?.label || "Unassigned"}</td>
                <td className={`status-${teacher.status}`}>{teacher.status}</td>
                <td>
                  <div className="teacher-actions">
                    <Link className="teacher-link-btn" to={`/admin/teachers/${teacher._id || teacher.id}`}>
                      View
                    </Link>
                    <button onClick={() => toggleStatus(teacher)} type="button">
                      {teacher.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {openCreateModal && (
        <Modal onClose={() => setOpenCreateModal(false)} title="Create Teacher">
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
