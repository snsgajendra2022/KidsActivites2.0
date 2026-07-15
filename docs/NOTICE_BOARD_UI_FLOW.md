# Notice Board — UI Flow

## 1. Admin — Notice Board Dashboard

```
Sidebar → Notice Board
    ↓
Dashboard (tabs: All | Published | Draft | Scheduled | Important)
    ↓
[Create Notice] button
    ↓
Stats row: Total published | Unread rate | Pending ack | Scheduled
```

**Actions from list card/menu:**
- View → Detail page
- Edit → Form (draft/scheduled only)
- Duplicate → New draft pre-filled
- Archive → Confirm modal
- Delete → Confirm (draft only)
- Export report → CSV download

---

## 2. Admin — Create / Edit Notice

```
Create Notice
    ↓
Step-like form (single page, sections):
  1. Basic info (title, category, priority, body)
  2. Audience selector
  3. Delivery options (pin, ack, notifications, schedule)
  4. Attachments
    ↓
[Preview Recipients] → Modal with count + list
    ↓
[Preview Notice] → Read-only preview panel
    ↓
[Save Draft] OR [Publish] OR [Schedule]
    ↓
Publish → Confirm modal:
  "Send to 248 users: 180 parents, 45 teachers, 23 staff"
    ↓
Success toast → Redirect to Notice Detail
```

---

## 3. Audience selection flow

```
Select audience type (dropdown/cards)
    ↓
Type-specific controls appear:
  ALL_* → no extra fields, show live count
  SELECTED_ROLES → role chips multi-select
  SELECTED_CLASSES → class chips + include parents/teachers toggles
  SELECTED_SECTIONS → class → section picker
  SELECTED_TEACHERS/PARENTS → searchable multi-select
  CUSTOM_GROUP → group picker
  MANUAL_USERS → user search multi-select
    ↓
[Preview recipients] button enabled
    ↓
Modal: searchable table, role/class columns, total count
    ↓
[Clear selection] resets type-specific fields
```

---

## 4. Admin — Notice Detail

```
Notice Detail
    ├── Header: title, badges (status, priority, category)
    ├── Meta: author, published date, expiry, audience summary
    ├── Body content
    ├── Attachments list (download)
    ├── Analytics panel:
    │     read % | ack % | breakdown by role
    └── Recipients tab (paginated, filter read/unread/ack)
```

---

## 5. Parent — Notice Board

```
Sidebar → Notice Board
    ↓
Inbox cards sorted: pinned first, then urgent, then date
    ↓
Card shows: title, category, priority badge, date, unread dot
    ↓
Filters: All | Unread | Important | Category
    ↓
Tap card → Notice Detail
    ↓
Auto mark read on open
    ↓
If requiresAcknowledgement → [Acknowledge] button
    ↓
Success toast
```

**Notification deep-link:**  
`/parent/notice-board/{noticeId}`

---

## 6. Teacher — Notice Board

Same as parent flow at `/teacher/notice-board`.

Teachers with create permission see **Create Notice** (class-scoped audience only).

---

## 7. Mobile app flow (reference)

```
Push: "New Notice: Holiday Notice"
    ↓
Tap → Notice detail screen
    ↓
Mark read + optional acknowledge
```

---

## 8. UI states

| State | Admin list | Inbox | Form |
|-------|------------|-------|------|
| Loading | Skeleton cards | Skeleton cards | Form skeleton |
| Empty | "No notices yet" + CTA | "No notices shared" | N/A |
| Error | Retry banner | Retry banner | Inline field errors |
| Success | Toast | Toast on ack | Toast on save/publish |

---

## 9. Responsive behavior

- **Desktop:** Master-detail optional; full-width form  
- **Tablet:** Stacked layout  
- **Mobile:** Full-screen list → full-screen detail with back button  

---

## 10. Integration points

- **Notifications:** New type `notice` with link to notice detail  
- **Sidebar:** Unread notice badge (optional hook)  
- **Chat:** Independent; no merge with notice threads  
