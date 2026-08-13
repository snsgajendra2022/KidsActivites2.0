/**
 * Normalize LMS course-certificate payloads from list/get/complete responses.
 * Backend field names vary (nested student/course, snake_case, CERT number vs UUID id).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACEHOLDER_LABELS = new Set([
  'learner',
  'student',
  'course',
  'n/a',
  'na',
  '-',
  'unknown',
  'certificate of completion',
]);

export function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

export function isBlank(value) {
  if (value == null) return true;
  const s = String(value).trim();
  if (!s) return true;
  if (/^\{\{[^}]+\}\}$/.test(s)) return true;
  return false;
}

function isPlaceholderLabel(value) {
  return PLACEHOLDER_LABELS.has(String(value || '').trim().toLowerCase());
}

export function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'object' && value != null) continue;
    if (isBlank(value) || isPlaceholderLabel(value)) continue;
    return String(value).trim();
  }
  return '';
}

export function isDisplayableCertNumber(value, certificateId) {
  const s = String(value ?? '').trim();
  if (!s) return false;
  if (certificateId && s === String(certificateId)) return false;
  if (isUuid(s) || /^[0-9a-f]{32}$/i.test(s)) return false;
  if (/^cert[-_/]/i.test(s)) return true;
  return s.length >= 3 && s.length <= 48;
}

export function personNameFrom(person) {
  if (!person) return '';
  if (typeof person === 'string') {
    if (isUuid(person) || isPlaceholderLabel(person) || isBlank(person)) return '';
    return person.trim();
  }
  if (typeof person !== 'object') return '';
  return firstNonEmpty(
    person.fullName,
    person.full_name,
    person.displayName,
    person.display_name,
    person.name,
    person.studentName,
    person.student_name,
    person.learnerName,
    person.learner_name,
    [person.firstName, person.lastName].filter(Boolean).join(' '),
    [person.first_name, person.last_name].filter(Boolean).join(' '),
    person.preferredName,
  );
}

export function unwrapCertificatePayload(data) {
  if (!data || typeof data !== 'object') return null;
  const inner = data.data && typeof data.data === 'object' && !Array.isArray(data.data)
    ? data.data
    : data;
  const nested = inner.certificate && typeof inner.certificate === 'object'
    ? inner.certificate
    : null;
  const enrollment = nested?.enrollment || inner.enrollment || null;
  const student = (typeof nested?.student === 'object' && nested.student)
    || (typeof inner.student === 'object' && inner.student)
    || (typeof enrollment?.student === 'object' && enrollment.student)
    || (typeof inner.learner === 'object' && inner.learner)
    || null;
  const course = (typeof nested?.course === 'object' && nested.course)
    || (typeof inner.course === 'object' && inner.course)
    || (typeof enrollment?.course === 'object' && enrollment.course)
    || null;
  return {
    ...inner,
    ...(nested || {}),
    student,
    course,
    enrollment,
    user: (typeof nested?.user === 'object' && nested.user)
      || (typeof inner.user === 'object' && inner.user)
      || (typeof enrollment?.user === 'object' && enrollment.user)
      || inner.user,
  };
}

export function pickStudentName(cert) {
  if (!cert) return '';
  return firstNonEmpty(
    cert.learnerName,
    cert.learner_name,
    cert.studentName,
    cert.student_name,
    cert.userName,
    cert.user_name,
    cert.recipientName,
    cert.recipient_name,
    cert.awardeeName,
    cert.childName,
    cert.child_name,
    personNameFrom(cert.student),
    personNameFrom(cert.learner),
    personNameFrom(cert.user),
    personNameFrom(cert.recipient),
    personNameFrom(cert.child),
    personNameFrom(cert.enrollment?.student),
    personNameFrom(cert.enrollment?.learner),
    personNameFrom(cert.enrollment?.user),
  );
}

export function pickCourseName(cert) {
  if (!cert) return '';
  const course = cert.course && typeof cert.course === 'object' ? cert.course : null;
  const enrollmentCourse = cert.enrollment?.course && typeof cert.enrollment.course === 'object'
    ? cert.enrollment.course
    : null;
  return firstNonEmpty(
    cert.courseTitle,
    cert.course_title,
    cert.courseName,
    cert.course_name,
    course?.title,
    course?.name,
    course?.courseTitle,
    enrollmentCourse?.title,
    enrollmentCourse?.name,
    cert.enrollment?.courseTitle,
    cert.enrollment?.course_title,
    typeof cert.course === 'string' && !isUuid(cert.course) ? cert.course : '',
  );
}

export function pickCertificateNumber(cert) {
  if (!cert) return '';
  const id = cert.id || cert.certificateId;
  const candidates = [
    cert.certificateNumber,
    cert.certificate_number,
    cert.certificateNo,
    cert.certificate_no,
    cert.certNumber,
    cert.cert_number,
    cert.serialNumber,
    cert.serial_number,
    cert.number,
    cert.code,
    cert.serial,
  ];
  for (const candidate of candidates) {
    if (isDisplayableCertNumber(candidate, id)) return String(candidate).trim();
  }
  return '';
}

export function pickIssuedAt(cert) {
  if (!cert) return null;
  return firstNonEmpty(
    cert.issuedAt,
    cert.issued_at,
    cert.issuedOn,
    cert.issued_on,
    cert.awardedAt,
    cert.awarded_at,
    cert.awardedOn,
    cert.completedAt,
    cert.completed_at,
    cert.createdAt,
    cert.created_at,
    cert.issuedDate,
    cert.issueDate,
  ) || null;
}

function omitEmpty(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === 'string' && (isBlank(value) || isPlaceholderLabel(value))) return;
    out[key] = value;
  });
  return out;
}

export function mergeCertificateRecords(...parts) {
  let acc = {};
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue;
    const unwrapped = unwrapCertificatePayload(part) || part;
    acc = {
      ...acc,
      ...omitEmpty(unwrapped),
      student: {
        ...(typeof acc.student === 'object' && acc.student ? acc.student : {}),
        ...(typeof unwrapped.student === 'object' && unwrapped.student ? unwrapped.student : {}),
      },
      course: {
        ...(typeof acc.course === 'object' && acc.course ? acc.course : {}),
        ...(typeof unwrapped.course === 'object' && unwrapped.course ? unwrapped.course : {}),
      },
      enrollment: {
        ...(typeof acc.enrollment === 'object' && acc.enrollment ? acc.enrollment : {}),
        ...(typeof unwrapped.enrollment === 'object' && unwrapped.enrollment ? unwrapped.enrollment : {}),
      },
      user: {
        ...(typeof acc.user === 'object' && acc.user ? acc.user : {}),
        ...(typeof unwrapped.user === 'object' && unwrapped.user ? unwrapped.user : {}),
      },
    };
  }

  const id = firstNonEmpty(acc.id, acc.certificateId);
  const studentName = pickStudentName(acc);
  const courseName = pickCourseName(acc);
  const certificateNumber = pickCertificateNumber(acc);
  const issuedAt = pickIssuedAt(acc);

  return {
    ...acc,
    id: id || acc.id || '',
    certificateId: acc.certificateId || id || '',
    learnerName: studentName,
    studentName,
    courseTitle: courseName,
    courseName,
    certificateNumber,
    issuedAt,
    studentId: acc.studentId
      || acc.student?.id
      || acc.enrollment?.studentId
      || acc.learner?.id
      || (typeof acc.student === 'string' && isUuid(acc.student) ? acc.student : null)
      || null,
    courseId: acc.courseId || acc.course?.id || acc.enrollment?.courseId || null,
    enrollmentId: acc.enrollmentId || acc.enrollment?.id || null,
  };
}

export function displayCertificateFields(cert) {
  const record = mergeCertificateRecords(cert);
  return {
    id: record.id,
    studentName: record.learnerName || '',
    courseName: record.courseTitle || '',
    certificateNumber: record.certificateNumber || '',
    issuedAt: record.issuedAt || null,
    studentId: record.studentId,
    courseId: record.courseId,
    enrollmentId: record.enrollmentId,
  };
}

export function hydrateCertificatesWithChildren(items, children = []) {
  const list = Array.isArray(items) ? items : [];
  const names = new Map();
  (children || []).forEach((child) => {
    const id = child?.studentId || child?.enrolledStudentId || child?.student?.id;
    const name = firstNonEmpty(
      child?.studentName,
      personNameFrom(child?.student),
      child?.name,
    );
    if (id && name) names.set(String(id), name);
  });
  const onlyChildName = children.length === 1
    ? firstNonEmpty(
      children[0]?.studentName,
      personNameFrom(children[0]?.student),
      children[0]?.name,
    )
    : '';

  return list.map((item) => {
    const record = mergeCertificateRecords(item);
    if (record.learnerName) return record;
    const fromId = names.get(String(record.studentId || ''));
    const name = fromId || onlyChildName;
    if (!name) return record;
    return mergeCertificateRecords(record, { learnerName: name, studentName: name });
  });
}
