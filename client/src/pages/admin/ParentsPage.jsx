import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  createAdminParentLink,
  listAdminParentLinks,
  listAdminStudents,
  revokeAdminParentLink,
} from "../../services/admin-parents.service";
import "./parents-page.styles.scss";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  studentId: "",
  relationshipType: "Guardian",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const AdminParentsPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [tempCredential, setTempCredential] = useState("");
  const [copied, setCopied] = useState(false);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsPayload, linksPayload] = await Promise.all([
        listAdminStudents(token),
        listAdminParentLinks(token),
      ]);
      setStudents(studentsPayload || []);
      setLinks(linksPayload || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not load parent links");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  const canSubmit = useMemo(() => {
    if (!form.firstName.trim()) return false;
    if (!form.lastName.trim()) return false;
    if (!emailPattern.test(form.email.trim())) return false;
    if (!form.studentId) return false;
    if (!form.relationshipType.trim()) return false;
    return true;
  }, [form]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const copyCredential = async () => {
    if (!tempCredential) return;
    try {
      await navigator.clipboard.writeText(tempCredential);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const onCreate = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setCopied(false);

    if (!canSubmit) {
      setError("Please complete all fields with a valid email.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = await createAdminParentLink(token, {
        parentName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        studentId: form.studentId,
        relationshipType: form.relationshipType.trim(),
      });

      const apiPassword = payload?.data?.temporaryPassword || "";
      setTempCredential(apiPassword);
      setMessage(
        apiPassword
          ? "Parent created and linked. Share temporary password securely."
          : "Created. Parent must use password reset / check email.",
      );
      setForm(initialForm);
      await loadPageData();
    } catch (requestError) {
      setError(requestError.message || "Could not create parent");
    } finally {
      setSubmitting(false);
    }
  };

  const onRevoke = async (linkId) => {
    if (!window.confirm("Revoke this parent-student link?")) return;
    setError("");
    setMessage("");
    try {
      await revokeAdminParentLink(token, linkId);
      setMessage("Link revoked.");
      await loadPageData();
    } catch (requestError) {
      setError(requestError.message || "Could not revoke link");
    }
  };

  return (
    <section className="admin-parents-page">
      <header className="admin-parents-header">
        <h1>Parent Management</h1>
        <p>Create parent accounts and manage parent-student links.</p>
      </header>

      <form className="admin-parents-form" onSubmit={onCreate}>
        <h2>Create Parent + Link to Student</h2>
        <div className="admin-parents-form-grid">
          <input
            name="firstName"
            onChange={onChange}
            placeholder="Parent first name"
            required
            value={form.firstName}
          />
          <input
            name="lastName"
            onChange={onChange}
            placeholder="Parent last name"
            required
            value={form.lastName}
          />
          <input
            name="email"
            onChange={onChange}
            placeholder="parent@example.com"
            required
            type="email"
            value={form.email}
          />
          <select name="studentId" onChange={onChange} required value={form.studentId}>
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student._id} value={student._id}>
                {student.firstName} {student.lastName}
              </option>
            ))}
          </select>
          <select
            name="relationshipType"
            onChange={onChange}
            required
            value={form.relationshipType}
          >
            <option value="Mother">Mother</option>
            <option value="Father">Father</option>
            <option value="Guardian">Guardian</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <button disabled={!canSubmit || submitting} type="submit">
          {submitting ? "Creating..." : "Create Parent"}
        </button>
      </form>

      {message ? <p className="admin-parents-message">{message}</p> : null}
      {error ? <p className="admin-parents-error">{error}</p> : null}

      {tempCredential ? (
        <div className="admin-parents-credential">
          <strong>Temporary password</strong>
          <code>{tempCredential}</code>
          <button onClick={copyCredential} type="button">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}

      <div className="admin-parents-links">
        <h2>Parent Links</h2>
        {loading ? <p>Loading links...</p> : null}
        {!loading && !links.length ? <p>No parent links found.</p> : null}
        {links.length ? (
          <table>
            <thead>
              <tr>
                <th>Parent</th>
                <th>Email</th>
                <th>Student</th>
                <th>Relationship</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id || link._id}>
                  <td>{link.parentName || "-"}</td>
                  <td>{link.parentEmail || "-"}</td>
                  <td>{link.studentName || "-"}</td>
                  <td>{link.relationshipType || "-"}</td>
                  <td>{link.status || "-"}</td>
                  <td>{formatDate(link.createdAt)}</td>
                  <td className="admin-parents-link-actions">
                    <button
                      onClick={() => navigate(`/admin/parents/${link.id || link._id}`)}
                      type="button"
                    >
                      View
                    </button>
                    <button
                      disabled={link.status === "revoked"}
                      onClick={() => onRevoke(link.id || link._id)}
                      type="button"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
};

export default AdminParentsPage;
