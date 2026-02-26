import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  fetchAdminParentDetails,
  reassignAdminParentLink,
  updateAdminParent,
  updateAdminParentLinkStatus,
} from "../../services/admin-parents.service";
import "./parent-details-page.styles.scss";

const defaultRelationships = ["Mother", "Father", "Guardian", "Other"];

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const ParentDetailsPage = () => {
  const { parentLinkId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [editSaving, setEditSaving] = useState(false);

  const [reassignForm, setReassignForm] = useState({ newStudentId: "", relationshipType: "Guardian" });
  const [reassignSaving, setReassignSaving] = useState(false);

  const [statusSaving, setStatusSaving] = useState(false);

  const relationships = useMemo(() => {
    const options = data?.relationshipOptions;
    return Array.isArray(options) && options.length ? options : defaultRelationships;
  }, [data?.relationshipOptions]);

  const hydrateForms = useCallback((payload) => {
    setEditForm({
      firstName: payload?.parent?.firstName || "",
      lastName: payload?.parent?.lastName || "",
      email: payload?.parent?.email || "",
      phone: payload?.parent?.phone || "",
    });
    setReassignForm({
      newStudentId: payload?.student?.id || "",
      relationshipType: payload?.link?.relationshipType || "Guardian",
    });
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchAdminParentDetails({ token, parentLinkId });
      setData(payload);
      hydrateForms(payload);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not load parent details");
    } finally {
      setLoading(false);
    }
  }, [hydrateForms, parentLinkId, token]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const onEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const onReassignChange = (event) => {
    const { name, value } = event.target;
    setReassignForm((current) => ({ ...current, [name]: value }));
  };

  const onSaveParent = async (event) => {
    event.preventDefault();
    setFeedback("");
    setError("");
    setEditSaving(true);

    try {
      const updatedParent = await updateAdminParent({
        token,
        parentLinkId,
        body: {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone,
        },
      });

      setData((current) => ({ ...current, parent: { ...current.parent, ...updatedParent } }));
      setFeedback("Parent profile updated.");
    } catch (requestError) {
      setError(requestError.message || "Could not update parent profile");
    } finally {
      setEditSaving(false);
    }
  };

  const onReassign = async (event) => {
    event.preventDefault();
    setFeedback("");
    setError("");

    if (!reassignForm.newStudentId) {
      setError("Select a student first.");
      return;
    }

    if (!window.confirm("Confirm parent-student reassignment?")) {
      return;
    }

    setReassignSaving(true);
    try {
      await reassignAdminParentLink({
        token,
        parentLinkId,
        body: {
          newStudentId: reassignForm.newStudentId,
          relationshipType: reassignForm.relationshipType,
        },
      });

      await loadPage();
      setFeedback("Parent link updated.");
    } catch (requestError) {
      setError(requestError.message || "Could not reassign parent link");
    } finally {
      setReassignSaving(false);
    }
  };

  const onToggleStatus = async () => {
    if (!data?.link) return;

    const nextStatus = data.link.status === "active" ? "revoked" : "active";
    const promptLabel = nextStatus === "active" ? "activate" : "revoke";

    if (!window.confirm(`Confirm ${promptLabel} this parent-student link?`)) {
      return;
    }

    setStatusSaving(true);
    setFeedback("");
    setError("");

    try {
      const updated = await updateAdminParentLinkStatus({ token, parentLinkId, status: nextStatus });
      setData((current) => ({ ...current, link: { ...current.link, ...updated } }));
      setFeedback(`Parent link ${nextStatus === "active" ? "activated" : "revoked"}.`);
    } catch (requestError) {
      setError(requestError.message || "Could not update link status");
    } finally {
      setStatusSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="parent-details-page">
        <p className="parent-details-status">Loading parent details...</p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="parent-details-page">
        <div className="parent-details-toprow">
          <button onClick={() => navigate(-1)} type="button">Back</button>
        </div>
        <p className="parent-details-error">{error}</p>
      </section>
    );
  }

  return (
    <section className="parent-details-page">
      <div className="parent-details-toprow">
        <Link to="/admin/parents">← Back to Parents</Link>
      </div>

      <header className="parent-details-header">
        <div>
          <h1>{data?.parent?.name || "Parent"}</h1>
          <p>{data?.parent?.email || "-"}</p>
        </div>
        <span className={`parent-details-badge parent-details-badge-${data?.link?.status || "active"}`}>
          {data?.link?.status || "active"}
        </span>
      </header>

      {feedback ? <p className="parent-details-feedback">{feedback}</p> : null}
      {error ? <p className="parent-details-error">{error}</p> : null}

      <article className="parent-details-card">
        <h2>Overview</h2>
        <div className="parent-details-grid">
          <div>
            <label>Parent Name</label>
            <p>{data?.parent?.name || "-"}</p>
          </div>
          <div>
            <label>Email</label>
            <p>{data?.parent?.email || "-"}</p>
          </div>
          <div>
            <label>Student</label>
            <p>{data?.student?.fullName || "-"}</p>
          </div>
          <div>
            <label>Group</label>
            <p>{data?.student?.group?.label || "-"}</p>
          </div>
          <div>
            <label>Relationship</label>
            <p>{data?.link?.relationshipType || "-"}</p>
          </div>
          <div>
            <label>Created</label>
            <p>{formatDate(data?.link?.createdAt)}</p>
          </div>
        </div>
      </article>

      <article className="parent-details-card">
        <h2>Edit Parent</h2>
        <form className="parent-details-form" onSubmit={onSaveParent}>
          <input name="firstName" onChange={onEditChange} placeholder="First name" value={editForm.firstName} />
          <input name="lastName" onChange={onEditChange} placeholder="Last name" value={editForm.lastName} />
          <input name="email" onChange={onEditChange} placeholder="Email" type="email" value={editForm.email} />
          <input disabled name="phone" onChange={onEditChange} placeholder="Phone (not available in current model)" value={editForm.phone} />
          <button disabled={editSaving} type="submit">{editSaving ? "Saving..." : "Save Parent"}</button>
        </form>
      </article>

      <article className="parent-details-card">
        <h2>Reassign Student</h2>
        <form className="parent-details-form" onSubmit={onReassign}>
          <select name="newStudentId" onChange={onReassignChange} value={reassignForm.newStudentId}>
            <option value="">Select student</option>
            {(data?.availableStudents || []).map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
                {student.group?.label ? ` (${student.group.label})` : ""}
              </option>
            ))}
          </select>
          <select name="relationshipType" onChange={onReassignChange} value={reassignForm.relationshipType}>
            {relationships.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button disabled={reassignSaving} type="submit">{reassignSaving ? "Updating..." : "Confirm Reassign"}</button>
        </form>
      </article>

      <article className="parent-details-card">
        <h2>Status</h2>
        <p>Current link status: <strong>{data?.link?.status}</strong></p>
        <button disabled={statusSaving} onClick={onToggleStatus} type="button">
          {statusSaving ? "Saving..." : data?.link?.status === "active" ? "Revoke Link" : "Activate Link"}
        </button>
      </article>
    </section>
  );
};

export default ParentDetailsPage;
