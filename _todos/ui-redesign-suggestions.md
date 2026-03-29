# UI Redesign Suggestions — Detention Desk

**Date:** 2026-03-29
**Scope:** All frontend pages in `client/src/pages/`

---

## 1. Global Design System Issues (Fix First)

These problems affect every page and should be resolved before tackling individual pages.

### 1.1 Inconsistent Theming

The app has three conflicting themes applied across pages:
- **Dark theme** (`#0b1220` / `#111827` backgrounds): Admin Students, Detentions, Teacher Student Profile
- **Light theme** (`#f8fafc` / `#ffffff`): Admin Dashboard, Home, Auth pages
- **Hybrid** (light page wrapper, dark inputs): Teacher Students, Settings

**Recommendation:** Commit to a single **light theme with dark sidebar** — standard for professional SaaS tools (Linear, Notion, Intercom). Reserve dark theme only for the public marketing pages (Home, Features) where it already works well.

### 1.2 No Shared Design Token File

Variables like `$primary`, `$text-muted`, `$border-color` are defined separately in each SCSS file. Changes require updates in 20+ places.

**Recommendation:** Create `client/src/styles/_tokens.scss` with all design tokens and import it globally.

```scss
// _tokens.scss (proposed)
$color-primary:     #2563eb;
$color-primary-700: #1d4ed8;
$color-success:     #10b981;
$color-warning:     #f59e0b;
$color-danger:      #ef4444;

$color-gray-50:  #f8fafc;
$color-gray-100: #f1f5f9;
$color-gray-200: #e2e8f0;
$color-gray-400: #94a3b8;
$color-gray-500: #64748b;
$color-gray-900: #0f172a;

$radius-sm:  6px;
$radius-md:  10px;
$radius-lg:  14px;
$radius-xl:  20px;
$radius-pill: 999px;

$shadow-sm: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05);
$shadow-md: 0 4px 12px rgba(0,0,0,0.10);
$shadow-lg: 0 10px 30px rgba(0,0,0,0.14);

$font-sans: 'Inter', system-ui, -apple-system, sans-serif;
```

### 1.3 Form Inputs Used Without Labels

In `StudentsPage.jsx` (admin), all `<input>` and `<select>` elements inside `.admin-form` modals use `placeholder` as the only label. This is an accessibility failure and looks unfinished.

**Recommendation:** Every form field needs a visible `<label>` above the input, using the shared `Input` component already built in `components/input/Input.jsx`.

### 1.4 Loading States Are Just Text

Most pages show `<h1>Loading...</h1>` while fetching. This causes layout shift and looks unprofessional.

**Recommendation:** Use skeleton screens — grey pulsing placeholder blocks in the shape of the content. At minimum, replace `Loading...` headings with a centered `<Spinner />` component.

### 1.5 Inline Styles Scattered Throughout

`StudentProfilePage.jsx` has 15+ `style={{...}}` attributes for textarea backgrounds, colors, and grid spans. These should move to SCSS.

---

## 2. Page-by-Page Redesign Recommendations

---

### 2.1 Admin Dashboard (`/admin/dashboard`)

**Current issues:**
- Metric cards have no icons — all numbers look the same with no visual hierarchy
- No trend indicators (is this week better or worse than last?)
- Status dots are `8px` circles with no background — hard to distinguish at a glance
- Activity feed items have no timestamp, no type icon, and no category color
- The secondary section (`status + activity`) has no visual separation from the metrics grid above

**Recommended changes:**

**Metric cards:** Add a colored icon in the top-left of each card and a subtle left-border or icon background tinted by type. Example structure:
```
┌──────────────────────┐
│ 📋  TOTAL INCIDENTS  │
│     (7d)             │
│                      │
│      42              │  ← big number
│  ↑ 12% vs last week  │  ← trend line (green/red)
└──────────────────────┘
```

**Status section:** Replace dots with pill badges that have both a background color and text. Example:
- Pending → amber background `#fef3c7`, amber text `#92400e`
- Scheduled → blue background `#dbeafe`, blue text `#1e40af`
- Served → green background `#d1fae5`, green text `#065f46`
- Voided → red background `#fee2e2`, red text `#991b1b`

**Activity feed:** Each item should show:
- A small colored dot or icon based on type (incident = red, reward = green, detention = amber)
- A relative timestamp (`2 hours ago`) aligned right
- The student name in bold, action type in muted text

---

### 2.2 Admin Students (`/admin/students`)

**Current issues (most critical page):**
- The toolbar is unstyled — raw `<input>` with `background: #1a1a1a` next to basic `<button>` tags. It looks like a rough wireframe.
- The `<table>` has no rounded corners, no zebra striping, and action buttons inside `td:last-child` use `display: flex` which squashes on narrow columns
- "Reassign Group Owner" and "Delete" sit side-by-side with identical button size, making it easy to click the wrong one
- Modal form fields use `placeholder` as labels (see §1.3 above)
- Pagination is three unstyled elements with no page context ("Page 2 of 7")
- Dark background (`#111` on `#1a1a1a`) on a light-theme page — needs to match the rest of the admin UI

**Recommended changes:**

**Toolbar:** Rewrite using the `Input` component for the search field. Add a visible search icon inside the input. Group the "Create Student" button on the right with a `+` icon and primary color. Move "Show inactive" to a toggle switch on the right side.

```
┌────────────────────────────────────────────────────────────┐
│  🔍 Search students...              ○ Show inactive  [+ Add Student] │
└────────────────────────────────────────────────────────────┘
```

**Table:**
- Use a white card wrapper with `border-radius: 12px` and `box-shadow: $shadow-sm`
- Add subtle zebra striping: odd rows `#f8fafc`, even rows `white`
- Student name column should show a small avatar circle with initials (first + last name initials)
- "Status" column: use a pill badge, not plain text
- Action column: use icon buttons with tooltips instead of long text buttons. Use outlined "Reassign" and red icon "Delete"

**Pagination:** Make it look like a proper paginator:
```
  ← Prev   [1] [2] [3] ... [7]   Next →
              Page 2 of 7 · 64 results
```

---

### 2.3 Admin Teachers (`/admin/teachers`)

**Current issues:**
- Table structure similar to Students — same problems apply
- "Activate / Deactivate" action is text-only with no visual cue about current state

**Recommended changes:**
- Same table polish as Students (card wrapper, zebra stripes, avatar initials)
- Status should be a colored toggle pill: active = green filled, inactive = grey outlined
- Teacher detail link (`View`) should use a right-arrow icon button

---

### 2.4 Admin Parents (`/admin/parents`)

**Current issues:**
- Very minimal — appears to be a basic list with no styling polish
- Parent accounts management is a sensitive area — should feel professional and trustworthy

**Recommended changes:**
- Match the same table style as Students/Teachers
- Add a "last login" column with relative timestamp
- Linked students should show as small pill badges inside the row, not a separate column with IDs

---

### 2.5 Admin Detentions — Command Center (`/admin/detentions`)

**Current state:** This is the most styled page in the app and the dark theme works well here. Issues are refinements rather than overhauls.

**Issues:**
- Status badges are text-only with color (no background tint) — borderless pills look flat
- The inline editor row (expanded row) has no visual connection to the row it belongs to — no indentation or left-border to show it's a child
- The "Bulk Assign" section at the bottom is visually disconnected — it appears as a floating block with no context
- Tab counts use `#1f2937` background which blends into the dark page — hard to read at a glance

**Recommended changes:**
- Status badges: add semi-transparent background tints (same approach as §2.1 status section)
- Inline editor row: add a `3px` left border in primary color and a slightly lighter background to visually connect it to the parent row
- Tab counts: use contrast pill style — white text on colored background for active tab count
- Move bulk actions to a slide-up drawer or sticky bottom bar that appears only when rows are selected

---

### 2.6 Teacher Students (`/teacher/students`)

**Current state:** This page is already in decent shape with card layout and BEM classes.

**Issues:**
- Student cards only show name, group label, and a blue badge — no quick stats (incident count, recent activity)
- The search button is a separate "Search" button — should auto-search on input (or press Enter)
- Cards have no hover state differentiation from each other — all look identical

**Recommended changes:**
- Add 2–3 small stat chips to each card (e.g., "3 incidents this week", "1 pending detention") using colored mini-badges
- Remove the separate Search button; make search reactive on keystroke (debounced 300ms)
- Differentiate cards with "attention needed" state — a student with active detentions should have a subtle amber left-border

---

### 2.7 Teacher Student Profile (`/teacher/students/:id`)

**Current issues:**
- The profile header (`profile-card`) shows only the student's name. There is no group name, admission number, or any context about the student
- The 4 action buttons ("Log Incident", "Log Reward", "Add Note", "Log Detention") are placed below the timeline — they should be in the header area for quick access
- Timeline items don't show the category name — just `notes` or `status` text, which is cryptic
- The "Log Detention" and "Log Incident" actions share the same form (both go to `/incidents`) — but users may not know that. The UI should make this distinction clearer or combine them
- The timeline badge (`-42m`, `+15m`) is unstyled and grey — positive (reward) and negative (detention) values should be different colors
- Inline `style={{...}}` props on textarea, select, and preview text are scattered throughout the JSX and must move to SCSS

**Recommended changes:**

**Profile header redesign:**
```
┌─────────────────────────────────────────────────┐
│  [JD]  James Davidson                           │
│        Year 10 · Class 10B · ADM-2024-0023      │
│                               [← Back to class] │
└─────────────────────────────────────────────────┘
```

**Action buttons:** Move to a sticky top action bar below the profile card, always visible:
```
[+ Incident]  [+ Reward]  [+ Note]  [+ Detention]
```

**Timeline items:** Each entry should show:
- Category name in bold
- Notes/text below in muted color
- Date/time right-aligned
- Badge: detention minutes in red, reward minutes in green

---

### 2.8 Parent — Student List (`/parent/students`)

**Current state:** Very minimal. Appears to be a plain list.

**Recommended changes:**
- Use the same card grid style as Teacher Students
- Show student name, class, and "X active detentions" as a quick badge
- No editing controls needed — emphasize the read-only "monitoring" nature with a clean, calm design (no buttons except "View details")

---

### 2.9 Parent — Student Detail (`/parent/students/:id`)

**Current issues:**
- Read-only timeline with no category names shown
- No visual distinction between incidents (negative) and rewards (positive) beyond the badge number

**Recommended changes:**
- Use color-coded list rows: incidents = red left-border, rewards = green left-border, detentions = amber left-border
- Show a summary bar at top: "3 incidents · 1 detention pending · 2 rewards this term"
- Add a "Contact school" link prominently for parents who want to query a record

---

### 2.10 Login Page (`/login`)

**Current state:** Reasonable — dark card, good contrast, uses shared `Input` component.

**Issues:**
- The form card has no logo or branding mark above it — the first thing a user sees is "Sign in" as an h1 with no visual anchor
- There is no visual indicator of which role the user is logging in as
- "Forgot school code?" link is styled the same size as the footer helper text — it should be more prominent

**Recommended changes:**
- Add the app logo/mark above the form title inside the auth card
- Make "Forgot school code?" a standalone link above the submit button with a question mark icon
- Add a subtle branded gradient or logo watermark to the auth background

---

### 2.11 Register Page (`/register`)

**Current state:** Two-step flow (form → success screen). Reasonable structure.

**Issues:**
- The success screen with school code reveal is a critical moment in the user journey but is visually plain
- "Copy to clipboard" button has no visual feedback after copying (no checkmark animation)

**Recommended changes:**
- The school code should be displayed in a large, styled monospace `<code>` block with a border and copy icon
- Add a success animation or icon (check circle) at the top of the success state
- Add clear next-step instructions: "Log in at /login with your school code"

---

### 2.12 Settings Page (`/settings`)

**Current issues:**
- The page is almost unstyled — just a CSS grid with cards. There is no page header, no description, no visual hierarchy.
- The three cards (Policy, Categories, Staff) have no icons, no descriptions, and look identical

**Recommended changes:**
- Add a page header: "School Settings" with a subtitle
- Give each settings card a unique icon and a one-line description of what it controls
- Consider adding a left vertical nav within the settings area for larger screens:
  ```
  Settings
  ├── Policy
  ├── Categories
  └── Staff
  ```

---

### 2.13 Home / Marketing Pages (`/`, `/features`, `/about`)

**Current state:** Home page has a polished dark design with radial gradients and a hero image. This is the strongest-looking section of the app.

**Minor issues:**
- The "Book Demo" button links to `#demo` which doesn't exist as a section on the page — it scrolls nowhere
- Features section uses the same 3-card grid as Hero features — lacks visual differentiation
- No social proof (testimonials, school logos, user count) — important for a B2B SaaS product
- Footer is referenced but its styling was not reviewed in detail

**Recommended changes:**
- Fix the `#demo` anchor or replace the button with a mailto/contact link
- Add a testimonials/social proof strip between features and pricing CTA
- Distinguish hero feature cards from the features page cards visually (different card style, icons vs. illustrations)

---

## 3. Component-Level Issues

### 3.1 Button Component

The current `Button` component has `primary` and `secondary` variants. Missing:
- `danger` variant (currently done with `.danger-btn` ad-hoc class)
- `ghost` variant (transparent background, visible on hover)
- `icon-only` variant (square button with icon, no text)
- Loading state with spinner inside button

### 3.2 Modal Component

Currently modals have a title and close button. Missing:
- Footer action area with "Cancel" / "Confirm" buttons standardised inside the modal component (avoid building new button rows inside every modal)
- `size` prop: `sm`, `md`, `lg` — some modals (like Delete confirmation) should be narrower than form modals

### 3.3 Table / DataTable

There is no shared table component — each page builds its own `<table>`. A shared `DataTable` component would:
- Enforce consistent header, row, zebra-stripe, and action column styles
- Handle empty state automatically
- Handle loading skeleton rows automatically

### 3.4 Empty States

Empty states currently show plain `<p>` text. Each should show:
- An illustration or icon
- A short title ("No students yet")
- A sub-text ("Add your first student to get started")
- Optional CTA button

### 3.5 Toast Notifications

Currently, success/error feedback uses inline coloured `<p>` elements that appear inside the page or modal. For data-mutation actions (create, update, delete) a **toast notification** (brief popup at corner) is more professional and less disruptive to page layout.

---

## 4. Priority Order

| Priority | Area | Pages Affected |
|----------|------|----------------|
| P1 | Consistent light theme for all app pages | All admin, teacher, parent pages |
| P1 | Admin Students page overhaul | `admin/StudentsPage.jsx` |
| P1 | Form inputs with proper labels (no placeholder-only) | Admin forms, modal forms |
| P2 | Admin Dashboard — metric card icons + colored status badges | `admin/DashboardPage.jsx` |
| P2 | Teacher Student Profile — header, action bar, timeline polish | `teacher/StudentProfilePage.jsx` |
| P2 | Shared `_tokens.scss` design token file | All SCSS files |
| P3 | Admin Detentions — status badge tints, editor row visual polish | `admin/DetentionsPage.jsx` |
| P3 | Settings page header + card icons | `settings/SettingsPage.jsx` |
| P3 | Skeleton loading states | All pages |
| P3 | Toast notification system | All mutation actions |
| P4 | Shared `DataTable` component | Admin pages |
| P4 | Button component — danger/ghost/loading variants | Components |
| P4 | Parent pages — summary bar, color-coded timeline | Parent pages |
| P4 | Register success state polish | `register/RegisterPage.jsx` |
| P5 | Home page — fix demo anchor, add testimonials | Public pages |
