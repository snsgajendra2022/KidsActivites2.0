# Notice Board — Test Cases

## 1. Audience selection

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| A1 | All users | Select ALL_USERS, preview | Count = all active tenant users |
| A2 | All parents | Select ALL_PARENTS | Only parent role accounts |
| A3 | All teachers | Select ALL_TEACHERS | Only teacher accounts |
| A4 | Selected teachers | Pick 2 teachers | Exactly 2 recipients |
| A5 | Selected parents | Pick 3 parents | Exactly 3 recipients |
| A6 | Class parents only | Class + includeParents | Parents linked to class |
| A7 | Class teachers only | Class + includeTeachers | Assigned teachers only |
| A8 | Section | Class A section | Section users only |
| A9 | Custom group | Select group | Group members only |
| A10 | Manual users | Multi-select 5 users | 5 recipients |
| A11 | Zero recipients | Empty class | Publish blocked, error shown |
| A12 | Dedup | Class + manual overlap | No duplicate recipient rows |

---

## 2. Permissions

| ID | Case | Expected |
|----|------|----------|
| P1 | Parent opens create URL | Redirect / 403 |
| P2 | Teacher creates all-school notice | Blocked unless permission |
| P3 | Teacher creates class notice | Allowed with assigned class |
| P4 | Accountant creates fee notice | Allowed if permission |
| P5 | Admin publishes any audience | Allowed |
| P6 | Non-recipient opens notice detail | 404 / access denied |

---

## 3. Notice lifecycle

| ID | Case | Expected |
|----|------|----------|
| L1 | Save draft | status=DRAFT, no recipients |
| L2 | Edit draft | Fields updated |
| L3 | Publish now | status=PUBLISHED, recipients created |
| L4 | Schedule future | status=SCHEDULED |
| L5 | Archive published | status=ARCHIVED |
| L6 | Delete draft | Removed |
| L7 | Delete published | Rejected |
| L8 | Edit published | Rejected; duplicate offered |
| L9 | Pin notice | Appears first in inbox |
| L10 | Expired notice | status=EXPIRED, read-only |

---

## 4. Read & acknowledgement

| ID | Case | Expected |
|----|------|----------|
| R1 | Open notice | read_at set |
| R2 | Re-open notice | read_at unchanged |
| R3 | Acknowledge required | Button visible |
| R4 | Acknowledge tap | acknowledged_at set |
| R5 | Double acknowledge | Idempotent, no error |
| R6 | Ack not required | No button |
| R7 | Analytics update | readCount increments |

---

## 5. Notifications

| ID | Case | Expected |
|----|------|----------|
| N1 | Publish with push on | In-app notification per recipient |
| N2 | Publish with push off | No notification |
| N3 | Duplicate user | Single notification |
| N4 | Email enabled, SMTP down | Notice published, email log failure |
| N5 | Notification title | "New Notice: {title}" |

---

## 6. UI

| ID | Case | Expected |
|----|------|----------|
| U1 | Empty admin list | Empty state + Create CTA |
| U2 | Empty parent inbox | Friendly empty message |
| U3 | Loading | Skeleton/spinner |
| U4 | API error | Toast + retry |
| U5 | Preview modal | Shows count breakdown |
| U6 | Publish confirm | Summary before send |
| U7 | Mobile layout | Usable on 375px width |
| U8 | Attachment upload | File appears in list |
| U9 | Search notices | Filters list |
| U10 | Filter by category | Correct subset |

---

## 7. API (integration)

| ID | Endpoint | Expected |
|----|----------|----------|
| API1 | POST /notices | 201 draft |
| API2 | POST .../publish | 200 + recipientCount |
| API3 | GET /notices/my | Only user's notices |
| API4 | POST .../read | 200 idempotent |
| API5 | GET .../analytics | Correct counts |
| API6 | POST audience/preview | Correct breakdown |

---

## 8. Edge cases

| ID | Case | Expected |
|----|------|----------|
| E1 | Schedule in past | 400 validation |
| E2 | Expiry before publish | 400 validation |
| E3 | Tenant mismatch | 403 |
| E4 | Large recipient list | Paginated preview |
| E5 | Inactive user in class | Excluded |
