import { api } from './api/client.js';
import { API_BASE_URL } from './api/config.js';

function unwrapList(data) {
  if (!data) return { items: [], total: 0 };
  if (Array.isArray(data)) return { items: data, total: data.length };
  const items = data.items
    || data.content
    || data.enrollments
    || data.courses
    || data.records
    || data.results
    || (Array.isArray(data.data) ? data.data : null)
    || [];
  const list = Array.isArray(items) ? items : [];
  return {
    items: list,
    total: data.total ?? data.totalElements ?? list.length,
  };
}

function normalizeLearningItem(item) {
  if (!item) return item;
  const course = item.course || {};
  const progressPct = item.progressPct != null
    ? Number(item.progressPct)
    : (item.progress != null
      ? Number(item.progress)
      : (item.completionPct != null ? Number(item.completionPct) : 0));
  return {
    ...item,
    id: item.id || item.enrollmentId,
    courseId: item.courseId || course.id || null,
    courseTitle: item.courseTitle || course.title || item.title || 'Course',
    subject: item.subject || course.subject || course.subjectName || '',
    learnerName: item.learnerName
      || item.studentName
      || item.student?.fullName
      || item.user?.name
      || '',
    studentId: item.studentId || item.student?.id || null,
    status: String(item.status || 'enrolled').toLowerCase(),
    progressPct: Number.isFinite(progressPct) ? Math.round(progressPct) : 0,
    certificateId: item.certificateId || item.certificate?.id || null,
  };
}

function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const id = String(item?.id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function isMissingRouteError(err) {
  const status = Number(err?.status || 0);
  return status === 404 || status === 405;
}

function mediaBaseUrl() {
  return API_BASE_URL.replace(/\/$/, '');
}

/** Build authenticated progressive stream URL for a lesson. */
export function lmsStreamUrl(lessonId, playbackToken) {
  const url = new URL(`${mediaBaseUrl()}/lms/lessons/${lessonId}/stream`);
  if (playbackToken) url.searchParams.set('playback', playbackToken);
  return url.toString();
}

/** Build HLS manifest URL (basename e.g. index.m3u8). */
export function lmsHlsManifestUrl(lessonId, manifestBasename, playbackToken) {
  const name = manifestBasename || 'index.m3u8';
  const url = new URL(`${mediaBaseUrl()}/lms/lessons/${lessonId}/hls/${name}`);
  if (playbackToken) url.searchParams.set('playback', playbackToken);
  return url.toString();
}

async function fetchMyLearningRaw(params = {}) {
  const attempts = [
    () => api.get('/lms/my-learning', params),
    () => api.get('/parent/lms/my-learning', params),
    () => api.get('/parent/lms/enrollments', params),
  ];
  let lastEmpty = { items: [], total: 0 };
  let lastErr;
  for (const attempt of attempts) {
    try {
      const data = unwrapList(await attempt());
      if (data.items.length) {
        return {
          items: data.items.map(normalizeLearningItem),
          total: data.total,
        };
      }
      lastEmpty = data;
    } catch (err) {
      lastErr = err;
      if (!isMissingRouteError(err) && Number(err?.status) !== 403) {
        // Keep trying alternate parent paths on 403/404 only for empty primary
        if (Number(err?.status) >= 500) throw err;
      }
    }
  }
  if (lastEmpty.items) return { items: [], total: 0 };
  if (lastErr) throw lastErr;
  return { items: [], total: 0 };
}

async function fetchEnrollmentsByParam(paramName, ids = []) {
  const unique = [...new Set((ids || []).map(String).filter(Boolean))];
  if (!unique.length) return [];
  const collected = [];
  await Promise.all(unique.map(async (id) => {
    const attempts = [
      () => api.get('/lms/enrollments', { [paramName]: id }),
      () => api.get('/parent/lms/enrollments', { [paramName]: id }),
    ];
    for (const attempt of attempts) {
      try {
        const data = unwrapList(await attempt());
        collected.push(...data.items.map(normalizeLearningItem));
        break;
      } catch {
        // Parent may lack admin enrollments permission; try next path.
      }
    }
  }));
  return dedupeById(collected);
}

export const lmsApi = {
  listCourses: async (params = {}) => unwrapList(await api.get('/lms/courses', params)),
  getCourse: (courseId) => api.get(`/lms/courses/${courseId}`),
  createCourse: (body) => api.post('/lms/courses', body),
  updateCourse: (courseId, body) => api.patch(`/lms/courses/${courseId}`, body),
  publishCourse: (courseId) => api.post(`/lms/courses/${courseId}/publish`),
  archiveCourse: (courseId) => api.post(`/lms/courses/${courseId}/archive`),
  deleteCourse: (courseId) => api.delete(`/lms/courses/${courseId}`),

  addLesson: (courseId, body) => api.post(`/lms/courses/${courseId}/lessons`, body),
  updateLesson: (lessonId, body) => api.patch(`/lms/lessons/${lessonId}`, body),
  deleteLesson: (lessonId) => api.delete(`/lms/lessons/${lessonId}`),

  uploadLessonFile: (lessonId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/lms/lessons/${lessonId}/upload`, form);
  },

  issuePlaybackToken: (lessonId) => api.post(`/lms/lessons/${lessonId}/playback-token`),

  upsertQuiz: (courseId, body) => api.post(`/lms/courses/${courseId}/quizzes`, body),
  deleteQuiz: (quizId) => api.delete(`/lms/quizzes/${quizId}`),

  listEnrollments: async (params = {}) => {
    const data = unwrapList(await api.get('/lms/enrollments', params));
    return {
      items: data.items.map(normalizeLearningItem),
      total: data.total,
    };
  },
  createEnrollment: (body) => api.post('/lms/enrollments', body),
  enrollClass: (body) => api.post('/lms/enrollments/enroll-class', body),
  deleteEnrollment: (enrollmentId) => api.delete(`/lms/enrollments/${enrollmentId}`),

  /**
   * Parent/learner classroom list.
   * Tries /lms/my-learning (+ parent aliases), then enrollments by child studentId/classId
   * (covers admin "enroll class" which creates student enrollments).
   */
  myLearning: async (params = {}) => {
    const toIdList = (value) => (Array.isArray(value)
      ? value
      : String(value || '').split(','))
      .map((id) => String(id).trim())
      .filter(Boolean);

    const studentIds = toIdList(params.studentIds);
    const classIds = toIdList(params.classIds);

    const query = { ...params };
    delete query.studentIds;
    delete query.classIds;
    if (studentIds.length) query.studentIds = studentIds.join(',');
    if (classIds.length) query.classIds = classIds.join(',');

    const primary = await fetchMyLearningRaw(query);
    if (primary.items.length) {
      return {
        items: dedupeById(primary.items),
        total: primary.items.length,
      };
    }

    const fromStudents = await fetchEnrollmentsByParam('studentId', studentIds);
    if (fromStudents.length) {
      return { items: fromStudents, total: fromStudents.length };
    }

    const fromClasses = await fetchEnrollmentsByParam('classId', classIds);
    if (fromClasses.length) {
      // Prefer enrollments that match this parent's children when both ids exist.
      const studentSet = new Set(studentIds.map(String));
      const scoped = studentSet.size
        ? fromClasses.filter((item) => !item.studentId || studentSet.has(String(item.studentId)))
        : fromClasses;
      const items = scoped.length ? scoped : fromClasses;
      return { items, total: items.length };
    }

    return { items: [], total: 0 };
  },

  myLearningDetail: async (enrollmentId) => {
    try {
      return normalizeLearningItem(await api.get(`/lms/my-learning/${enrollmentId}`));
    } catch (err) {
      if (!isMissingRouteError(err)) throw err;
      return normalizeLearningItem(await api.get(`/parent/lms/my-learning/${enrollmentId}`));
    }
  },

  updateLessonProgress: (lessonId, body) => api.post(`/lms/lessons/${lessonId}/progress`, body),
  startQuizAttempt: (quizId, body) => api.post(`/lms/quizzes/${quizId}/attempts`, body),
  submitQuizAttempt: (quizId, attemptId, body) =>
    api.post(`/lms/quizzes/${quizId}/attempts/${attemptId}/submit`, body),
  completeCourse: (enrollmentId) => api.post(`/lms/enrollments/${enrollmentId}/complete`),

  listCertificates: async () => {
    const data = unwrapList(await api.get('/lms/certificates'));
    return { items: data.items, total: data.total };
  },
  certificateHtml: (certificateId) => api.get(`/lms/certificates/${certificateId}/html`),
};

export default lmsApi;
