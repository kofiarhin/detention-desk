# Admin Student Detention Ops Dashboard

## Summary

A new admin page at `/admin/detention-ops` that lets school admins search for students by name and immediately see whether each student is serving detention today, then drill into a full per-student detention history. This is a student-centric companion to the existing Detention Command Center (`/admin/detentions`), which surfaces detentions sorted by queue status rather than by student.

## Goal

Admins can look up any student by name in seconds, confirm at a glance whether that student has a scheduled detention today, and open a full detention history for the student — without having to search through the detention queue or navigate to the general student management page.

## Non-Goals

- Creating, editing, or voiding detentions (that stays in the Detention Command Center and the student profile page).
- Replacing the existing Detention Command Center (`/admin/detentions`).
- Replacing the existing admin student management page (`/admin/students`).
- Real-time push updates / live polling.
- Bulk actions on detentions from this view.

## Problem

The existing Detention Command Center organises detentions by queue (Upcoming, Today, Needs Attention, History). If an admin wants to know whether a specific student is serving today, they must scroll through the "Today" tab and scan for the student's name. There is no student-first search that also surfaces detention status at a glance.

## Users / Actors

- **schoolAdmin** — the only role that accesses this page.

## Core Requirements

1. A dedicated page at `/admin/detention-ops`, accessible to `schoolAdmin` only.
2. A search box that filters students by first name or last name (debounced, min 2 characters before triggering).
3. Student search results show each student's name, admission number, year group / form, and a "Serving Today" badge when a `scheduled` detention exists with `scheduledFor` falling on the current calendar day.
4. Results are paginated (20 per page, consistent with the rest of the app).
5. Each student row links to the existing student detail page at `/admin/students/:id`, which already exposes the detention timeline tab.
6. An empty search (< 2 chars) shows an instructional prompt rather than a blank list.
7. A "no results" state is shown when the query returns zero students.
8. The "Serving Today" indicator must be accurate at load time; no live-polling required.
9. The backend student list endpoint is enhanced to accept `includeDetentionToday=true`, which adds a `detentionToday: boolean` field to each student in the response when requested. This avoids a separate client-side cross-reference call.

## User Flows

### Search and identify a student

1. Admin navigates to `/admin/detention-ops` via the app nav.
2. Page loads with an empty search box and the instruction "Search by student name to check detention status".
3. Admin types a name (e.g. "Smith"). After a 300 ms debounce, a request fires: `GET /api/students?q=smith&includeDetentionToday=true&limit=20&page=1`.
4. Results render as a table. Students with a detention scheduled today show a "Serving Today" badge; others show nothing in that column.
5. Admin scans the list and clicks the student's name.
6. Browser navigates to `/admin/students/:id`. The existing `TeacherStudentProfilePage` loads. Admin clicks the "Detentions" tab to review full history.

### No result found

1. Admin types a name that matches no students.
2. Table shows: "No students found for '{query}'."

### Student has no detention today

1. Student appears in results. The "Serving Today" column is empty (or shows "—").

## Functional Details

### UI / Pages / Components

**New file**: `client/src/pages/admin/StudentDetentionOpsPage.jsx`

- `<input>` search box, debounced 300 ms, minimum 2 characters before fetch.
- Results table columns: **Student** (name + admission number as subtext), **Year / Form**, **Group**, **Serving Today** (badge or dash).
- Student name cell is a `<Link to={/admin/students/:id}>`.
- Pagination controls (Previous / Next) matching the pattern in `DetentionsPage.jsx`.
- Loading, error, empty-query, and no-results states.
- SCSS file: `client/src/pages/admin/student-detention-ops-page.styles.scss`.

**No new shared components required.** Reuse the `<Link>` pattern from `DetentionsPage.jsx` and pagination pattern from the same.

### Routing / Navigation

Add route in `client/src/App.jsx` inside the `schoolAdmin` block:

```jsx
<Route element={<StudentDetentionOpsPage />} path="/admin/detention-ops" />
```

Add a nav link in the admin app nav (wherever `/admin/detentions` is listed).

### Authentication / Authorization

- Route is wrapped in the existing `<RequireAuth allowedRoles={["schoolAdmin"]} />` block — no new auth logic needed.
- API requests send `Authorization: Bearer <token>` via `apiRequest()` as usual.

### Backend Behaviour

**Enhance `GET /students`** (handled in `server/controllers/studentController.js`):

- Accept new optional query param `includeDetentionToday` (`"true"` | `"false"`).
- When `true`, after fetching the student list, run a single additional query:

```js
const todayStart = /* start of today */;
const todayEnd   = /* end of today */;
const ids = items.map(s => s._id);
const todaySet = await Detention.distinct("studentId", {
  schoolId,
  studentId: { $in: ids },
  status: "scheduled",
  scheduledFor: { $gte: todayStart, $lte: todayEnd },
});
```

- Attach `detentionToday: true/false` to each item before returning.
- When `includeDetentionToday` is absent or `"false"`, behaviour is unchanged (no extra query, no extra field).

### API Endpoints

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/api/students` | Add optional `includeDetentionToday` param (described above). No breaking change. |

No new endpoints required.

### Validation

- `includeDetentionToday` must be `"true"` or `"false"` if present; return `400 VALIDATION_ERROR` otherwise.
- All existing `studentController` validations remain unchanged.

### Database Changes

None. Uses existing `Detention` and `Student` collections. The extra `Detention.distinct` query uses the existing compound index `(schoolId, studentId, status)` plus `scheduledFor`.

## States and Edge Cases

| State | Behaviour |
|-------|-----------|
| Query < 2 characters | Show instructional prompt; do not fire a request |
| Query returns 0 students | Show "No students found for '{query}'" |
| Network / API error | Show inline error message; preserve last query in the search box |
| Student has multiple detentions today | Badge still reads "Serving Today" (boolean flag — count is irrelevant here) |
| Student has a detention scheduled today but status is `pending` (not `scheduled`) | Not shown as "Serving Today" — `pending` means not yet scheduled |
| Student is inactive | Included if the search matches; `showInactive` toggle is out of scope for this page (keep it simple — active only) |
| `includeDetentionToday=true` with a large result set (limit 20) | Single `Detention.distinct` query on 20 IDs is negligible cost |
| Admin navigates to `/admin/students/:id` from this page and the student has no detentions | The existing student profile shows "No records found" under the Detentions tab — no change needed |

## Technical Notes

- **Reuse `apiRequest`** from `client/src/services/api.js`. Path: `/api/students?q=...&includeDetentionToday=true&...`.
- **Debounce**: use a `useEffect` with `setTimeout` / `clearTimeout` pattern — no external library needed.
- **Do not add a new service file** for this feature. The fetch logic is simple enough to live in the page component directly (consistent with how `DetentionsPage.jsx` works).
- The `Detention.distinct` call in the backend adds one extra DB round-trip only when the param is set. It is bounded by the page `limit` (max 20 IDs), so it is safe.
- Keep `includeDetentionToday` as a best-effort decoration: if the secondary query fails, fall back to `detentionToday: false` for all items rather than failing the whole request.
- The student detail view (`/admin/students/:id`) reuses the existing `TeacherStudentProfilePage`. No changes to that page are required by this spec — the detention timeline tab is already there.
- Apply `schoolId` scoping in the backend exactly as all other tenant queries do (via `applyStudentScope` or the equivalent for `Detention.distinct`).

## Acceptance Criteria

- [ ] `/admin/detention-ops` loads without error for a `schoolAdmin` user.
- [ ] Visiting `/admin/detention-ops` as a `teacher` or `parent` redirects to their home route.
- [ ] Typing fewer than 2 characters in the search box does not trigger an API request.
- [ ] Typing 2+ characters fires a debounced request to `GET /api/students?q=...&includeDetentionToday=true`.
- [ ] A student with a `scheduled` detention where `scheduledFor` falls on today shows a "Serving Today" badge.
- [ ] A student with no detention today shows no badge / shows "—" in that column.
- [ ] Clicking a student name navigates to `/admin/students/:id`.
- [ ] Pagination controls advance and retreat through result pages correctly.
- [ ] A query matching no students shows the no-results message.
- [ ] A network error shows an inline error message without crashing the page.
- [ ] `GET /students?includeDetentionToday=true` returns `detentionToday: true` for students with a scheduled detention today and `false` for those without.
- [ ] `GET /students` without `includeDetentionToday` returns the same response shape as before (no regression).
- [ ] `GET /students?includeDetentionToday=banana` returns `400 VALIDATION_ERROR`.
- [ ] The `Detention.distinct` query in the backend is scoped to the requesting school's `schoolId`.
- [ ] A backend test covers the `includeDetentionToday` behaviour (today = true, not today = false, absent = unchanged).

## Open Questions

- None at this stage.

## Assumptions

- "Serving today" means a detention with `status: "scheduled"` and `scheduledFor` falling within the current calendar day (midnight-to-midnight server time). Detentions with `status: "pending"` (not yet scheduled) are excluded.
- Active students only on this page (no toggle to show inactive students — keep it focused on ops).
- The "full student detention detail view" is satisfied by the existing `/admin/students/:id` page (TeacherStudentProfilePage with the Detentions tab). No new dedicated detention-only detail page is needed.
- No changes to the admin nav sidebar are specified — the implementer should add the link wherever `/admin/detentions` currently appears.
