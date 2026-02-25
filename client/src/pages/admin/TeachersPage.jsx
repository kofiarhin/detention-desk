import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../components/modal/Modal";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
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
  const [openReassignModal, setOpenReassignModal] = useState(false);
  const [savingReassign, setSavingReassign] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [form, setForm] = useState(emptyTeacherForm);

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
    setOpenCreateModal(false);
    setForm(emptyTeacherForm);
    loadTeachers();
  };

  const openReassign = (teacher) => {
    setSelectedTeacher(teacher);
    setSelectedGroupId("");
    setOpenReassignModal(true);
    setError("");
  };

  const closeReassign = () => {
    setOpenReassignModal(false);
    setSelectedTeacher(null);
    setSelectedGroupId("");
    setSavingReassign(false);
  };

  const submitReassign = async (groupId) => {
    if (!selectedTeacher) return;

    if (groupId !== null && !groupId) {
      setError("Select an unassigned group or click Unassign Group.");
      return;
    }

    setSavingReassign(true);
    try {
      await apiRequest({
        path: `/api/admin/teachers/${selectedTeacher._id || selectedTeacher.id}/reassign-group`,
        method: "PATCH",
        token,
        body: { groupId },
      });
      closeReassign();
      await loadTeachers();
    } catch (requestError) {
      setError(requestError.message);
      setSavingReassign(false);
    }
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
                <td>{teacher.name}</td>
                <td>{teacher.email}</td>
                <td>{teacher.ownedGroup?.label || "Unassigned"}</td>
                <td className={`status-${teacher.status}`}>{teacher.status}</td>
                <td>
                  <div className="teacher-actions">
                    <button onClick={() => toggleStatus(teacher)} type="button">
                      {teacher.status === "active" ? "Deactivate" : "Reactivate"}
                    </button>
                    <button onClick={() => openReassign(teacher)} type="button">
                      Reassign Group
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

      {openReassignModal && selectedTeacher && (
        <Modal onClose={closeReassign} title="Reassign Group">
          <div className="teacher-reassign-panel">
            <p>
              <strong>{selectedTeacher.name}</strong> ({selectedTeacher.email})
            </p>
            <p>
              Current Group: <strong>{selectedTeacher.ownedGroup?.label || "Unassigned"}</strong>
            </p>

            <label htmlFor="reassign-group-select">Select Unassigned Group</label>
            <select
              id="reassign-group-select"
              onChange={(event) => setSelectedGroupId(event.target.value)}
              value={selectedGroupId}
            >
              <option value="">Choose group</option>
              {unownedGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>

            <div className="teacher-reassign-actions">
              <button
                disabled={savingReassign}
                onClick={() => submitReassign(selectedGroupId)}
                type="button"
              >
                Save
              </button>
              <button
                className="secondary-btn"
                disabled={savingReassign}
                onClick={() => submitReassign(null)}
                type="button"
              >
                Unassign Group
              </button>
              <button
                className="secondary-btn"
                disabled={savingReassign}
                onClick={closeReassign}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};

export default AdminTeachersPage;
