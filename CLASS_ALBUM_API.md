# Class Album & Parent Photo API

This document describes which APIs the web app uses for **uploading classroom media** (teacher/admin) and **viewing shared photos** (parent). All flows are **API-only** — no client-side dummy storage.

**Base URL:** `VITE_API_URL` (e.g. `http://localhost:8080/api`)

**Auth:** Bearer token on all endpoints unless noted.

**Frontend services:**
- Upload: `src/services/classAlbumService.js`
- Parent photos: `src/services/mediaService.js` + `src/services/parentService.js`

---

## Flow overview

```
Teacher / Admin upload
        │
        ▼
POST /teacher/albums/upload   (teacher)
POST /admin/albums/upload     (admin)
        │
        │  Backend must:
        │  1. Save media to class album (TV playback)
        │  2. Share with parents of students in that class
        │
        ▼
GET /media/photos?studentId=...   (parent reads shared photos)
GET /parent/dashboard               (parent gets children + school info)
```

---

## Upload targets (`uploadTarget`)

Used on teacher upload. Tells the backend who should receive the media.

| Value | UI label | Backend behavior |
|-------|----------|----------------|
| `CLASS_ALBUM` | Class Album | Save to class album + share with **all parents** of students assigned to `classId`. TV playback enabled. |
| `PARENT_DIRECT` | Parent Direct | Send only to parent(s) of selected `studentIds`. Not for whole class. |
| `CLASS_ALBUM_AND_PARENT` | Album + Parents | Class album + parent share. Use `recipients` + `studentIds` to control scope. |

### `recipients` (teacher UI)

| Value | Meaning |
|-------|---------|
| `class` | Entire class (all students in `classId`) |
| `selected` | Only students listed in `studentIds[]` |
| `individual` | Single student (same as selected; one student) |

---

## Teacher APIs

### 1. List assigned classes (with albums)

```
GET /teacher/albums/my-classes
```

**Auth:** Teacher

**Used by:** Send Photos, Class Album pages

**Response (per class):**
```json
[
  {
    "classId": "cls-7de133ff",
    "className": "PTP",
    "classStatus": "active",
    "album": {
      "albumCode": "SB-TODDLE-XF23MC",
      "playbackEnabled": true
    }
  }
]
```

---

### 2. Upload media (main upload API)

```
POST /teacher/albums/upload
Content-Type: multipart/form-data
```

**Auth:** Teacher

**Used by:** `src/pages/teacher/SendPhotos.jsx`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uploadTarget` | string | Yes | `CLASS_ALBUM` \| `PARENT_DIRECT` \| `CLASS_ALBUM_AND_PARENT` |
| `classId` | string | Yes | Selected class ID |
| `className` | string | Recommended | Display name, e.g. `PTP` |
| `schoolId` | string | Recommended | School/workspace ID |
| `schoolName` | string | Recommended | School display name for parent UI |
| `recipients` | string | For `CLASS_ALBUM_AND_PARENT` | `class` \| `selected` \| `individual` |
| `studentIds` | string[] | Conditional | Repeat field per ID. All class students for `CLASS_ALBUM`; selected IDs for direct/selected share |
| `studentId` | string | Optional | Legacy single-student field (first selected) |
| `caption` | string | Optional | Album caption / parent-visible title |
| `files` | File[] | Yes | One or more image/video files |

**Example `FormData`:**
```
uploadTarget: CLASS_ALBUM
classId: cls-7de133ff
className: PTP
schoolId: school-shri-001
schoolName: Shri Kidzee
recipients: class
studentIds: stu-001
studentIds: stu-002
caption: Art class today!
files: [image1.jpg, image2.mp4]
```

**Backend must:**
1. Store files in the class album for the given `classId`
2. When `uploadTarget` is `CLASS_ALBUM` or `CLASS_ALBUM_AND_PARENT`, create parent-visible photo records for parents of students in that class
3. When `uploadTarget` is `PARENT_DIRECT`, share only with parents of `studentIds`
4. Include `className`, `schoolName`, `teacherName` on parent photo records

**Response `201`:** Upload result with created media items (shape depends on backend).

---

### 3. View / manage class album

```
GET /teacher/albums/{classId}
```

Returns album detail + media list for TV toggle and delete.

```
PATCH /teacher/albums/{classId}/media/{mediaLinkId}
Body: { "showOnTv": true | false }
```

```
DELETE /teacher/albums/{classId}/media/{mediaLinkId}
```

**Used by:** `src/pages/teacher/TeacherClassAlbum.jsx`

---

### 4. List students in class (for parent targeting)

```
GET /teacher/students
```

**Used by:** Send Photos student picker. Filter client-side by `classId`.

---

## Admin APIs

### 1. List albums

```
GET /admin/albums
```

Returns class albums and custom albums. Class albums should include `classId`, `className`.

---

### 2. Upload to album

```
POST /admin/albums/upload
Content-Type: multipart/form-data
```

**Auth:** School Admin

**Used by:** `src/pages/admin/AdminPhotos.jsx`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `albumId` | string | Yes | Target album ID |
| `classId` | string | For class albums | Class this album belongs to |
| `className` | string | Recommended | Class display name |
| `schoolId` | string | Recommended | School ID |
| `schoolName` | string | Recommended | School display name |
| `uploadTarget` | string | For class albums | Set to `CLASS_ALBUM` when uploading to a class album |
| `caption` | string | Optional | Caption |
| `files` | File[] | Yes | Media files |

**Backend must:** Same parent-sharing rules as teacher upload when `classId` is present.

---

### 3. Link existing Photo Studio asset to album

```
POST /admin/albums/{albumId}/link-existing
Content-Type: application/json

{
  "externalAssetIds": ["studio-image-id-1"],
  "caption": "Optional caption"
}
```

---

## Parent APIs

### 1. Parent dashboard (children + school)

```
GET /parent/dashboard?schoolId={schoolId}
```

**Auth:** Parent

**Used by:** Parent Dashboard, Parent Photos

**Response must include `classId` on each child** (e.g. `cls-7de133ff`) so parent photos can load the matching class album.

**Response must include:**
```json
{
  "parent": { "id", "name", "email", "mobile" },
  "school": {
    "id": "school-shri-001",
    "name": "Shri Kidzee",
    "slug": "shri",
    "academicYear": "2026–2027"
  },
  "children": [
    {
      "applicationId": "app-001",
      "classId": "cls-7de133ff",
      "className": "PTP",
      "student": { "fullName": "Aarav Kumar" }
    }
  ]
}
```

`classId` and `className` on each child are **required** for class album photo loading.

---

### 2. Get class album (parent read-only)

```
GET /parent/albums/{classId}
```

**Auth:** Parent (must have a child assigned to this class)

**Used by:** `src/pages/parent/ParentPhotos.jsx`  
**Same data shape as:** `GET /teacher/albums/{classId}` (read-only; all class media, not filtered by uploader)

**Example:** `GET /parent/albums/cls-7de133ff`

**Response `200`:**
```json
{
  "classId": "cls-7de133ff",
  "className": "PTP",
  "schoolId": "school-shri-001",
  "schoolName": "Shri Kidzee",
  "albumCode": "SB-TODDLE-XF23MC",
  "playbackEnabled": true,
  "media": [
    {
      "id": "media-link-001",
      "caption": "Art class today",
      "fileName": "photo.jpg",
      "mediaType": "IMAGE",
      "thumbnailUrl": "https://cdn.../thumb.jpg",
      "previewUrl": "https://cdn.../preview.jpg",
      "imageUrl": "https://cdn.../full.jpg",
      "uploadedAt": "2026-07-11T10:30:00.000Z",
      "uploadedBy": "usr-teacher",
      "uploadedByName": "Ms. Meera Iyer",
      "approvalStatus": "APPROVED"
    }
  ]
}
```

**Frontend maps each `media[]` item to a parent gallery card with `className` and `schoolName` displayed.**

**Backend must:**
- Verify the logged-in parent has a child in `classId`
- Return all parent-visible album media for that class (exclude `REJECTED`)
- Include `className`, `schoolName` on the album response

---

### 3. Get shared photos (direct / legacy shares)

```
GET /media/photos?studentId={applicationId}&classId={classId}&className={className}
```

**Auth:** Parent (and Teacher/Admin for their own filters)

**Used by:** `src/pages/parent/ParentPhotos.jsx` (supplements class album API for direct parent shares)

| Query param | Type | Description |
|-------------|------|-------------|
| `studentId` | string | Child application ID from `/parent/dashboard` |
| `classId` | string | Child's assigned class ID |
| `className` | string | Child's class name (fallback filter) |

**Note:** Class album images come from `GET /parent/albums/{classId}`. This endpoint covers `PARENT_DIRECT` and other non-album shares.

**Response `200` — each photo object should include:**
```json
{
  "id": "photo-uuid",
  "teacherId": "usr-teacher",
  "teacherName": "Ms. Meera Iyer",
  "schoolId": "school-shri-001",
  "schoolName": "Shri Kidzee",
  "classId": "cls-7de133ff",
  "className": "PTP",
  "caption": "Art class today!",
  "title": "Art class today!",
  "sentAt": "2026-07-11T10:30:00.000Z",
  "recipients": "class",
  "studentIds": [],
  "imageUrl": "https://cdn.../thumb.jpg",
  "previewUrl": "https://cdn.../preview.jpg",
  "mediaType": "IMAGE",
  "thumbnailUrl": "https://cdn.../thumb.jpg"
}
```

For video:
```json
{
  "mediaType": "VIDEO",
  "thumbnailUrl": "...",
  "streamUrl": "https://cdn.../video.m3u8",
  "processingStatus": "READY"
}
```

**Parent UI displays:** `schoolName · className` on each card and in the lightbox.

---

## TV playback APIs (classroom display)

```
POST /tv/albums/verify          (no auth)
GET  /tv/albums/{albumCode}/playback   (no auth)
```

Used for classroom TV pairing with album code (e.g. `SB-TODDLE-XF23MC`).

---

## Supported file types (frontend)

**Images:** JPG, JPEG, PNG, WebP  
**Videos:** MP4, MOV, WebM, M4V

---

## Web routes (tenant)

| Role | Page | Route |
|------|------|-------|
| Teacher | Send Photos | `/{slug}/teacher/photos` |
| Teacher | Class Album | `/{slug}/teacher/class-album?class={classId}` |
| Admin | Photo Sharing | `/{slug}/admin/photos` |
| Parent | Photos | `/{slug}/parent/photos` |

Example: `http://localhost:3000/shri/teacher/photos`

---

## Backend checklist

When implementing or testing the upload → parent share flow:

- [ ] `POST /teacher/albums/upload` accepts all FormData fields listed above
- [ ] `POST /admin/albums/upload` accepts `classId`, `className`, `schoolName`, `uploadTarget`
- [ ] Class album upload creates entries visible on `GET /media/photos` for parents of students in that class
- [ ] Parent photo response includes `schoolName`, `className`, `classId`, `teacherName`, `caption`, `imageUrl`
- [ ] `GET /parent/albums/{classId}` returns class album media for parents with a child in that class
- [ ] `GET /parent/dashboard` returns `classId` and `className` per child
- [ ] `PARENT_DIRECT` only shares with selected student parent(s)
- [ ] `CLASS_ALBUM` shares with all parents in the selected class

---

## Related files

| File | Purpose |
|------|---------|
| `src/services/classAlbumService.js` | Teacher/admin album API calls |
| `src/services/mediaService.js` | `GET /media/photos` for parent gallery |
| `src/services/parentService.js` | `GET /parent/dashboard` |
| `src/pages/teacher/SendPhotos.jsx` | Teacher upload UI |
| `src/pages/teacher/TeacherClassAlbum.jsx` | Teacher album management |
| `src/pages/admin/AdminPhotos.jsx` | Admin upload UI |
| `src/pages/parent/ParentPhotos.jsx` | Parent gallery UI |
| `backend.md` | General API reference (media section) |
| `PLATFORM_FULL_DETAILS.md` | Product spec for upload targets |
