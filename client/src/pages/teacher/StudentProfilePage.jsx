/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Modal from "../../components/modal/Modal";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./student-profile-page.styles.scss";

const TeacherStudentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  // server returns paginated timeline lists: { items, page, limit, total }
  const [timeline, setTimeline] = useState({
    incidents: null,
    rewards: null,
    detentions: null,
    offsets: null,
    notes: [],
  });
  const [tab, setTab] = useState("incidents");
  const [openAction, setOpenAction] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [profilePayload, timelinePayload] = await Promise.all([
        apiRequest({ path: `/api/students/${id}/profile`, token }),
        apiRequest({ path: `/api/students/${id}/timeline`, token }),
      ]);

      setProfile(profilePayload.data?.student || profilePayload.data);

      setTimeline((prev) => ({
        incidents: timelinePayload.data?.incidents ?? prev.incidents,
        detentions: timelinePayload.data?.detentions ?? prev.detentions,
        rewards: timelinePayload.data?.rewards ?? prev.rewards,
        offsets: timelinePayload.data?.offsets ?? prev.offsets,
        // notes are not part of the timeline endpoint (kept for UI compatibility)
        notes: Array.isArray(prev.notes) ? prev.notes : [],
      }));
    } catch (error) {
      if (error.status === 403) {
        navigate("/teacher/students", { replace: true });
        return;
      }
      setMessage(error.message);
    }
  }, [id, navigate, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    const value = timeline?.[tab];
    const list = Array.isArray(value)
      ? value
      : Array.isArray(value?.items)
        ? value.items
        : [];

    return [...list].sort((a, b) => {
      const bTime = new Date(
        b.createdAt || b.occurredAt || b.awardedAt || b.appliedAt,
      ).getTime();
      const aTime = new Date(
        a.createdAt || a.occurredAt || a.awardedAt || a.appliedAt,
      ).getTime();
      return bTime - aTime;
    });
  }, [timeline, tab]);

  const detentionItems = useMemo(() => {
    const value = timeline?.detentions;
    return Array.isArray(value)
      ? value
      : Array.isArray(value?.items)
        ? value.items
        : [];
  }, [timeline]);

  const submitAction = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      if (openAction === "incident") {
        await apiRequest({
          path: "/api/incidents",
          method: "POST",
          token,
          body: {
            studentId: id,
            categoryId: payload.categoryId,
            notes: payload.notes,
            minutesAssigned: Number(payload.minutesAssigned || 0),
          },
        });
      }

      if (openAction === "reward") {
        await apiRequest({
          path: "/api/rewards",
          method: "POST",
          token,
          body: {
            studentId: id,
            categoryId: payload.categoryId,
            notes: payload.notes,
            minutesAwarded: Number(payload.minutesAwarded || 0),
          },
        });
      }

      if (openAction === "note") {
        await apiRequest({
          path: "/api/notes",
          method: "POST",
          token,
          body: { entityType: "student", entityId: id, text: payload.text },
        });
      }

      if (openAction === "detention") {
        await apiRequest({
          path: "/api/incidents",
          method: "POST",
          token,
          body: {
            studentId: id,
            categoryId: payload.categoryId,
            notes: payload.notes,
            minutesAssigned: Number(payload.minutesAssigned || 30),
          },
        });
      }

      setOpenAction("");
      setMessage("Saved successfully");
      load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const transitionDetention = async (detentionId, action) => {
    const pathMap = {
      serve: `/api/detentions/${detentionId}/serve`,
      void: `/api/detentions/${detentionId}/void`,
      schedule: `/api/detentions/${detentionId}`,
    };
    const methodMap = { serve: "POST", void: "POST", schedule: "PUT" };
    const body =
      action === "schedule"
        ? { status: "scheduled", scheduledFor: new Date().toISOString() }
        : undefined;

    try {
      await apiRequest({
        path: pathMap[action],
        method: methodMap[action],
        token,
        body,
      });
      setMessage("Detention updated");
      load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    await apiRequest({
      path: `/api/students/${id}`,
      method: "PUT",
      token,
      body: payload,
    });
    setMessage("Student updated");
    load();
  };

  return (
    <section className="app-page teacher-student-profile-page">
      <h1>Student Profile</h1>

      {message ? <p>{message}</p> : null}

      {profile ? (
        <>
          <h2>
            {profile.firstName} {profile.lastName}
          </h2>

          <form className="teacher-edit-form" onSubmit={saveEdit}>
            <input defaultValue={profile.firstName} name="firstName" required />
            <input defaultValue={profile.lastName} name="lastName" required />
            <input defaultValue={profile.yearGroup} name="yearGroup" required />
            <input defaultValue={profile.form} name="form" required />
            <select defaultValue={profile.status} name="status">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
            <button type="submit">Edit student</button>
          </form>
        </>
      ) : (
        <p>Loading profile...</p>
      )}

      <div>
        {["incidents", "rewards", "detentions", "offsets", "notes"].map(
          (item) => (
            <button key={item} onClick={() => setTab(item)} type="button">
              {item}
            </button>
          ),
        )}
      </div>

      <div>
        {!items.length ? (
          <p>No {tab} yet.</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item._id}>
                {item.notes ||
                  item.text ||
                  item.status ||
                  item.minutesAssigned ||
                  item.minutesAwarded}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <button onClick={() => setOpenAction("incident")} type="button">
          Log incident
        </button>
        <button onClick={() => setOpenAction("reward")} type="button">
          Create reward
        </button>
        <button onClick={() => setOpenAction("note")} type="button">
          Add note
        </button>
        <button onClick={() => setOpenAction("detention")} type="button">
          Issue detention
        </button>
      </div>

      {detentionItems.map((detention) => (
        <div key={detention._id}>
          <span>{detention.status}</span>
          <button
            onClick={() => transitionDetention(detention._id, "serve")}
            type="button"
          >
            serve
          </button>
          <button
            onClick={() => transitionDetention(detention._id, "schedule")}
            type="button"
          >
            schedule
          </button>
          <button
            onClick={() => transitionDetention(detention._id, "void")}
            type="button"
          >
            void
          </button>
        </div>
      ))}

      {openAction ? (
        <Modal onClose={() => setOpenAction("")} title={`New ${openAction}`}>
          <form className="teacher-action-form" onSubmit={submitAction}>
            <input name="categoryId" placeholder="Category ID" required />
            <textarea name="notes" placeholder="Notes" />
            {openAction === "note" ? (
              <textarea name="text" placeholder="Note" required />
            ) : null}
            {openAction !== "note" ? (
              <input
                name={
                  openAction === "reward" ? "minutesAwarded" : "minutesAssigned"
                }
                placeholder="Minutes"
                type="number"
              />
            ) : null}
            <button type="submit">Save</button>
          </form>
        </Modal>
      ) : null}
    </section>
  );
};

export default TeacherStudentProfilePage;
