# Chat API contract

The web client supports a **core live path** and an **advanced proposed path**.

## Live / documented core

These match `backend.md` §7 and the mobile client:

- `GET /chat/contacts`
- `GET /chat/conversations`
- `POST /chat/conversations` `{ "participantId" }`
- `GET /chat/conversations/{conversationId}/messages?limit=30&before={cursor}`
  - Accepts a bare array or `{ "items": [], "hasMore": true, "nextCursor": "..." }`.
  - Pages are oldest-to-newest within each page.
- `POST /chat/conversations/{conversationId}/messages` `{ "text": "..." }`
- `POST /chat/conversations/{conversationId}/read`
- `GET /chat/unread-count` (optional)
- STOMP topic `/topic/tenant/{tenantSlug}/conversation/{conversationId}`
  - `message:new`
  - `conversation:read`
- Client publish `/app/chat/read`

## Proposed advanced features

The web UI implements these for mock mode and future API support. Against a live server they soft-disable after `404` / `405` / `501`.

### Messages

- `POST /chat/conversations/{conversationId}/messages`
  - Optional body extension: `{ "text": "...", "attachments": [Attachment] }`
  - Core path still sends `{ "text" }` only when there are no attachments.
- `PATCH /chat/conversations/{conversationId}/messages/{messageId}`
  - Body: `{ "text": "Updated text" }`
  - Sender only
- `DELETE /chat/conversations/{conversationId}/messages/{messageId}`
  - Soft-delete preferred: `{ "deleted": true, "deletedAt": "...", "text": "", "attachments": [] }`
- `POST /chat/conversations/{conversationId}/messages/{messageId}/reactions`
  - Body: `{ "emoji": "👍" }`
  - Toggles the current user's reaction

### Attachments

- `POST /chat/conversations/{conversationId}/attachments`
  - Multipart field: `file`
  - Maximum 10 MB
  - Allowed: JPEG, PNG, WEBP, PDF, DOC/DOCX, XLS/XLSX
  - Response:

```json
{
  "id": "att-123",
  "name": "progress-report.pdf",
  "mimeType": "application/pdf",
  "size": 48231,
  "url": "https://..."
}
```

The server must verify conversation membership, MIME type, file signature, size, and tenant ownership. Downloads must use tenant-authorized or short-lived signed URLs.

### Realtime events

Conversation topic: `/topic/tenant/{tenantSlug}/conversation/{conversationId}`

Server → client (proposed):

- `message:updated`
- `message:deleted`
- `message:reaction`
- `typing` `{ "conversationId", "userId", "isTyping" }`
- `presence:update` `{ "userId", "status": "online|away|offline", "lastSeenAt" }`

Client destinations (fire-and-forget; ignored if unsupported):

- `/app/chat/typing`
- `/app/chat/presence`

Typing events should expire server-side after about three seconds. Presence must be server-derived from authenticated connections.

## Authorization

- Every operation requires authentication, tenant membership, and conversation membership.
- `SEND_MESSAGES` gates conversation creation, sending, attachments, reactions, editing, and deleting.
- Editing is sender-only.
- Deleting is sender-only unless a separate moderation permission is introduced.
- `VIEW_ALL_CHAT` allows authorized school support/admin roles to discover school conversations; it does not bypass tenant isolation.
