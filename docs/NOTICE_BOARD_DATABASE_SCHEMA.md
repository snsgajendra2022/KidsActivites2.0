# Notice Board — Database Schema

**Database:** PostgreSQL (recommended)  
**Tenant column:** `tenant_id` (UUID or VARCHAR, matches school slug/id)

---

## 1. `notices`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID PK | No | Primary key |
| tenant_id | VARCHAR | No | School/workspace ID |
| title | VARCHAR(200) | No | Notice title |
| body | TEXT | No | Message body |
| category | VARCHAR(32) | No | Category enum |
| priority | VARCHAR(16) | No | NORMAL, IMPORTANT, URGENT |
| status | VARCHAR(16) | No | DRAFT, SCHEDULED, PUBLISHED, ARCHIVED, EXPIRED |
| audience_type | VARCHAR(32) | No | Primary audience type enum |
| is_pinned | BOOLEAN | No | Default false |
| requires_acknowledgement | BOOLEAN | No | Default false |
| send_push | BOOLEAN | No | Default true |
| send_email | BOOLEAN | No | Default false |
| send_sms | BOOLEAN | No | Default false |
| cover_image_url | TEXT | Yes | Optional thumbnail |
| publish_at | TIMESTAMPTZ | Yes | Scheduled publish time |
| published_at | TIMESTAMPTZ | Yes | Actual publish time |
| expires_at | TIMESTAMPTZ | Yes | Auto-expire |
| created_by | UUID/VARCHAR | No | User ID |
| updated_by | UUID/VARCHAR | Yes | User ID |
| created_at | TIMESTAMPTZ | No | |
| updated_at | TIMESTAMPTZ | No | |
| archived_at | TIMESTAMPTZ | Yes | |

**Indexes:**

- `idx_notices_tenant_status` ON `(tenant_id, status)`
- `idx_notices_tenant_published` ON `(tenant_id, published_at DESC)`
- `idx_notices_tenant_category` ON `(tenant_id, category)`
- `idx_notices_tenant_priority` ON `(tenant_id, priority)`
- `idx_notices_publish_at` ON `(publish_at)` WHERE status = 'SCHEDULED'
- `idx_notices_expires_at` ON `(expires_at)` WHERE status = 'PUBLISHED'

---

## 2. `notice_audience_rules`

Stores targeting criteria (one notice → many rules).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID PK | No | |
| notice_id | UUID FK | No | → notices.id |
| audience_type | VARCHAR(32) | No | Rule type |
| role | VARCHAR(32) | Yes | For SELECTED_ROLES |
| class_id | VARCHAR | Yes | |
| section_id | VARCHAR | Yes | |
| teacher_id | VARCHAR | Yes | |
| parent_id | VARCHAR | Yes | |
| student_id | VARCHAR | Yes | Application/student ID |
| group_id | UUID | Yes | → notice_groups.id |
| user_id | VARCHAR | Yes | Manual selection |
| include_parents | BOOLEAN | Yes | Class/section flags |
| include_teachers | BOOLEAN | Yes | Class/section flags |
| created_at | TIMESTAMPTZ | No | |

**Indexes:**

- `idx_notice_audience_notice` ON `(notice_id)`
- `idx_notice_audience_class` ON `(class_id)` WHERE class_id IS NOT NULL

---

## 3. `notice_recipients`

Resolved at publish time.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID PK | No | |
| notice_id | UUID FK | No | |
| tenant_id | VARCHAR | No | Denormalized for queries |
| user_id | VARCHAR | No | Recipient user |
| role | VARCHAR(32) | No | At publish time |
| student_id | VARCHAR | Yes | Context |
| class_id | VARCHAR | Yes | Context |
| section_id | VARCHAR | Yes | Context |
| delivered_at | TIMESTAMPTZ | Yes | |
| read_at | TIMESTAMPTZ | Yes | |
| acknowledged_at | TIMESTAMPTZ | Yes | |
| notification_sent_at | TIMESTAMPTZ | Yes | |
| email_sent_at | TIMESTAMPTZ | Yes | |
| sms_sent_at | TIMESTAMPTZ | Yes | |
| created_at | TIMESTAMPTZ | No | |

**Unique:** `(notice_id, user_id)`

**Indexes:**

- `idx_notice_recipients_notice` ON `(notice_id)`
- `idx_notice_recipients_user` ON `(user_id, read_at)`
- `idx_notice_recipients_tenant_user` ON `(tenant_id, user_id, created_at DESC)`
- `idx_notice_recipients_ack` ON `(notice_id, acknowledged_at)` WHERE acknowledged_at IS NULL

---

## 4. `notice_attachments`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID PK | No | |
| notice_id | UUID FK | No | |
| file_name | VARCHAR(255) | No | |
| file_key | VARCHAR(512) | No | S3/storage key |
| file_url | TEXT | No | CDN URL |
| mime_type | VARCHAR(128) | No | |
| file_size | BIGINT | No | Bytes |
| uploaded_by | VARCHAR | No | |
| created_at | TIMESTAMPTZ | No | |

**Index:** `idx_notice_attachments_notice` ON `(notice_id)`

---

## 5. `notice_groups`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID PK | No | |
| tenant_id | VARCHAR | No | |
| name | VARCHAR(120) | No | |
| description | TEXT | Yes | |
| created_by | VARCHAR | No | |
| created_at | TIMESTAMPTZ | No | |
| updated_at | TIMESTAMPTZ | No | |

**Index:** `idx_notice_groups_tenant` ON `(tenant_id)`

---

## 6. `notice_group_members`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID PK | No | |
| group_id | UUID FK | No | |
| user_id | VARCHAR | No | |
| created_at | TIMESTAMPTZ | No | |

**Unique:** `(group_id, user_id)`

---

## 7. `notice_audit_logs`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID PK | No | |
| notice_id | UUID FK | No | |
| action | VARCHAR(64) | No | CREATED, UPDATED, PUBLISHED, etc. |
| old_value | JSONB | Yes | |
| new_value | JSONB | Yes | |
| performed_by | VARCHAR | No | |
| performed_at | TIMESTAMPTZ | No | |

**Index:** `idx_notice_audit_notice` ON `(notice_id, performed_at DESC)`

---

## Relationships

```
notices 1──* notice_audience_rules
notices 1──* notice_recipients
notices 1──* notice_attachments
notices 1──* notice_audit_logs
notice_groups 1──* notice_group_members
notice_groups *──* notices (via audience rules group_id)
users *──* notices (via notice_recipients)
```

---

## Status enums

**status:** `DRAFT` | `SCHEDULED` | `PUBLISHED` | `ARCHIVED` | `EXPIRED`

**category:** `GENERAL` | `ADMISSION` | `FEES` | `EXAM` | `HOLIDAY` | `EVENT` | `EMERGENCY` | `HOMEWORK` | `ACTIVITY` | `TRANSPORT` | `HEALTH` | `OTHER`

**priority:** `NORMAL` | `IMPORTANT` | `URGENT`

**audience_type:** `ALL_USERS` | `ALL_PARENTS` | `ALL_TEACHERS` | `ALL_STAFF` | `SELECTED_ROLES` | `SELECTED_CLASSES` | `SELECTED_SECTIONS` | `SELECTED_TEACHERS` | `SELECTED_PARENTS` | `SELECTED_STUDENTS` | `CUSTOM_GROUP` | `MANUAL_USERS`
