# KidsActivities 2.0 — Backend docs

## Start here

| Doc | Purpose |
|-----|---------|
| **[FULL_BACKEND_API_CONTRACT.md](./FULL_BACKEND_API_CONTRACT.md)** | APIs required only by the newly added Student Profile and School ERP work |
| **[NEW.1.0/CourseAndLocationAndChat.md](./NEW.1.0/CourseAndLocationAndChat.md)** | Outstanding backend work for LMS course/quiz/certificates, transport map location / live GPS / stop rosters, and chat attachments / unread counts / realtime. Supersedes and extends `courseAndLocation.md` |
| **[transport/LIVE_BUS_TRACKING.md](./transport/LIVE_BUS_TRACKING.md)** | Production live bus GPS tracking architecture and deployment |

## Specialized domain contracts

| Doc | Domain |
|-----|--------|
| [CHAT_API_CONTRACT.md](./CHAT_API_CONTRACT.md) | Chat HTTP + STOMP (corrections tracked in [NEW.1.0/CourseAndLocationAndChat.md](./NEW.1.0/CourseAndLocationAndChat.md) section 3) |
| [NOTICE_BOARD_API_CONTRACT.md](./NOTICE_BOARD_API_CONTRACT.md) | Notice board API |
| [NOTICE_BOARD_REQUIREMENTS.md](./NOTICE_BOARD_REQUIREMENTS.md) | Notice product requirements |
| [NOTICE_BOARD_DATABASE_SCHEMA.md](./NOTICE_BOARD_DATABASE_SCHEMA.md) | Notice DB schema |
| [NOTICE_BOARD_IMPLEMENTATION_PLAN.md](./NOTICE_BOARD_IMPLEMENTATION_PLAN.md) | Notice implementation plan |
| [NOTICE_BOARD_UI_FLOW.md](./NOTICE_BOARD_UI_FLOW.md) | Notice UI flows |
| [NOTICE_BOARD_TEST_CASES.md](./NOTICE_BOARD_TEST_CASES.md) | Notice test cases |
| [STUDENT_ATTENDANCE_BACKEND_CONTRACT.md](./STUDENT_ATTENDANCE_BACKEND_CONTRACT.md) | Core attendance sessions |
| [STUDENT_ATTENDANCE_IMPLEMENTATION_PROMPT.md](./STUDENT_ATTENDANCE_IMPLEMENTATION_PROMPT.md) | Attendance implementation notes |
| [SCHOOL_CALENDAR_API_CONTRACT.md](./SCHOOL_CALENDAR_API_CONTRACT.md) | School calendar, holidays, emergencies, feed, notifications, attendance/transport hooks |

Existing feature contracts remain in their specialized documents. The new-work contract intentionally excludes legacy APIs.
