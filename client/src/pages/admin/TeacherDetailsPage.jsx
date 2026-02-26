import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  fetchAdminTeacherDetails,
  reassignAdminTeacherGroup,
  updateAdminTeacher,
  updateAdminTeacherStatus,
} from "../../services/admin-teachers.service";
import { fetchAdminGroups } from "../../services/groups.service";
import "./teacher-details-page.styles.scss";

const TeacherDetailsPage = () => {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [teacher, setTeacher] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "" });
  const [editSaving, setEditSaving] = useState(false);

  const [newGroupId, setNewGroupId] = useState("");
  const [transferStudents, setTransferStudents] = useState(false);
  const [reassignSaving, setReassignSaving] = useState(false);

  const [statusSaving, setStatusSaving] = useState(false);

  const splitName = useCallback((name) => {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }, []);

  const hydrateEditForm = useCallback((teacherData) => {
    const nameParts = splitName(teacherData?.name);
    setEditForm({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: teacherData?.email || "",
    });
  }, [splitName]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const [teacherData, groupItems] = await Promise.all([
        fetchAdminTeacherDetails({ token, teacherId }),
        fetchAdminGroups({ token }),
      ]);

      setTeacher(teacherData);
      setGroups(groupItems || []);
      setNewGroupId(teacherData?.ownedGroup?.id || "");
      hydrateEditForm(teacherData);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not load teacher details");
    } finally {
      setLoading(false);
    }
  }, [hydrateEditForm, teacherId, token]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const availableGroups = useMemo(() => {
    if (!teacher) return [];

    return groups.filter((group) => {
      const ownerId = group?.ownerTeacherId?._id || group?.ownerTeacherId || null;
      return !ownerId || ownerId === teacher.id;
    });
  }, [groups, teacher]);

  const submitEdit = async (event) => {
    event.preventDefault();
    const fullName = `${editForm.firstName} ${editForm.lastName}`.trim();
    if (!fullName) {
      setError("First name is required");
      return;
    }

    setEditSaving(true);
    setFeedback("");
    setError("");

    try {
      const updated = await updateAdminTeacher({
        token,
        teacherId,
        body: {
          name: fullName,
          email: editForm.email,
        },
      });

      setTeacher((prev) => ({ ...prev, ...updated }));
      hydrateEditForm({ ...teacher, ...updated });
      setFeedback("Teacher details updated");
    } catch (requestError) {
      setError(requestError.message || "Could not update teacher");
    } finally {
      setEditSaving(false);
    }
  };

  const submitReassign = async () => {
    if (!newGroupId) {
      setError("Select a group first");
      return;
    }

    if (!window.confirm("Confirm group reassignment?")) {
      return;
    }

    setReassignSaving(true);
    setFeedback("");
    setError("");

    try {
      const updated = await reassignAdminTeacherGroup({
        token,
        teacherId,
        body: { newGroupId, transferStudents },
      });

      setTeacher((prev) => ({ ...prev, ...updated }));
      setFeedback("Group reassigned successfully");
    } catch (requestError) {
      setError(requestError.message || "Could not reassign group");
    } finally {
      setReassignSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!teacher) return;
    const isActive = teacher.status !== "active";
    const actionLabel = isActive ? "activate" : "deactivate";

    if (!window.confirm(`Confirm ${actionLabel} teacher?`)) {
      return;
    }

    setStatusSaving(true);
    setFeedback("");
    setError("");

    try {
      const updated = await updateAdminTeacherStatus({ token, teacherId, isActive });
      setTeacher((prev) => ({ ...prev, ...updated }));
      setFeedback(`Teacher ${isActive ? "activated" : "deactivated"}`);
    } catch (requestError) {
      setError(requestError.message || "Could not update teacher status");
    } finally {
      setStatusSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="teacher-details-page">
        <p className="teacher-details-page-status">Loading teacher details...</p>
      </section>
    );
  }

  if (error && !teacher) {
    return (
      <section className="teacher-details-page">
        <div className="teacher-details-page-header-row">
          <button onClick={() => navigate(-1)} type="button">Back</button>
        </div>
        <p className="teacher-details-page-error">{error}</p>
      </section>
    );
  }

  return (
    <section className="teacher-details-page">
      <div className="teacher-details-page-header-row">
        <Link to="/admin/teachers">← Back to Teachers</Link>
      </div>

      <header className="teacher-details-page-header">
        <div>
          <h1>{teacher?.name}</h1>
          <p>{teacher?.email}</p>
        </div>
        <span className={`teacher-details-page-status-badge teacher-details-page-status-${teacher?.status}`}>
          {teacher?.status}
        </span>
      </header>

      {feedback && <p className="teacher-details-page-feedback">{feedback}</p>}
      {error && <p className="teacher-details-page-error">{error}</p>}

      <div className="teacher-details-page-grid">
        <section className="teacher-details-page-card">
          <h2>Overview</h2>
          <p><strong>Teacher ID:</strong> {teacher?.id}</p>
          <p><strong>Owned Group:</strong> {teacher?.ownedGroup?.label || "Unassigned"}</p>
          <p><strong>Student Count:</strong> {teacher?.studentCount ?? 0}</p>
        </section>

        <section className="teacher-details-page-card">
          <h2>Edit Teacher</h2>
          <form className="teacher-details-page-form" onSubmit={submitEdit}>
            <label htmlFor="first-name">First Name</label>
            <input
              id="first-name"
              onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))}
              required
              value={editForm.firstName}
            />

            <label htmlFor="last-name">Last Name</label>
            <input
              id="last-name"
              onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))}
              value={editForm.lastName}
            />

            <label htmlFor="teacher-email">Email</label>
            <input
              id="teacher-email"
              onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
              required
              type="email"
              value={editForm.email}
            />

            <button disabled={editSaving} type="submit">
              {editSaving ? "Saving..." : "Save Teacher"}
            </button>
          </form>
        </section>

        <section className="teacher-details-page-card">
          <h2>Reassign Group</h2>
          <label htmlFor="teacher-group">Group</label>
          <select
            id="teacher-group"
            onChange={(event) => setNewGroupId(event.target.value)}
            value={newGroupId}
          >
            <option value="">Select group</option>
            {availableGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label}
              </option>
            ))}
          </select>

          <label className="teacher-details-page-checkbox" htmlFor="transfer-students">
            <input
              checked={transferStudents}
              id="transfer-students"
              onChange={(event) => setTransferStudents(event.target.checked)}
              type="checkbox"
            />
            Transfer students from old group to new group
          </label>

          <button disabled={reassignSaving} onClick={submitReassign} type="button">
            {reassignSaving ? "Saving..." : "Confirm Reassignment"}
          </button>
        </section>

        <section className="teacher-details-page-card">
          <h2>Status</h2>
          <p>
            Current status: <strong>{teacher?.status}</strong>
          </p>
          <button disabled={statusSaving} onClick={toggleStatus} type="button">
            {statusSaving
              ? "Updating..."
              : teacher?.status === "active"
                ? "Deactivate Teacher"
                : "Activate Teacher"}
          </button>
        </section>
      </div>
    </section>
  );
};

export default TeacherDetailsPage;
