# DetentionDesk: 10 Simple Features to Implement Next

1. **Live dashboard cards (replace placeholder counts).**
   - Show real totals for active students, incidents this week, and pending detentions.
   - Pull from `/api/dashboard/admin` and wire into `client/src/pages/dashboard/DashboardPage.jsx`.

2. **Settings → Policy editor (replace placeholder card).**
   - Add a small form to edit default detention minutes and basic behavior policy text.
   - Save via existing policy routes and display success/error toast state.

3. **Settings → Staff invite flow (replace placeholder card).**
   - Simple email + role form for inviting teacher/admin staff.
   - Hook into existing admin user routes and show pending invites list.

4. **Detention status quick actions.**
   - Add one-click actions on detention rows: `Mark Complete`, `Mark Missed`, `Reopen`.
   - Keep this in the detentions list view to reduce navigation.

5. **Student profile timeline filters.**
   - Add tabs/filter chips: `All`, `Incidents`, `Detentions`, `Rewards`, `Notes`.
   - Improves readability of mixed timeline data without backend changes.

6. **Parent portal: unread updates badge.**
   - Show a badge count for new incidents/detentions since parent’s last login.
   - Start simple with local “last viewed” timestamp per parent user.

7. **Category color tags.**
   - Let admins choose a color for each incident category.
   - Render colored pills in incident lists and student timeline for faster scanning.

8. **Bulk detention assignment helper.**
   - In detention-ops page, add “Assign same detention to selected students.”
   - Reuse existing bulk detention API and keep form minimal.

9. **CSV export for admin tables.**
   - Add “Export CSV” button on admin Students/Teachers/Parents tables.
   - Export currently filtered rows only (client-side first iteration).

10. **Global search bar (admin scope).**
    - Simple search across students, teachers, and parents by name/email.
    - Return grouped results with links to detail pages.

---

## Suggested implementation order (quick wins)
1) Live dashboard cards  
2) Policy editor  
3) Detention quick actions  
4) CSV export  
5) Category color tags
