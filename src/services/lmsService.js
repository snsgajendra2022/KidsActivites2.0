import { api } from './api/client.js';
import { API_BASE_URL } from './api/config.js';
import { mergeCertificateRecords } from '../utils/courseCertificateFields.js';
import {
  keepEarnedCertificates,
  learningRowsWithEarnedCertificates,
  enrollmentQuizOutcome,
  mergeLearningOntoCertificate,
} from '../utils/lmsEnrollmentOutcome.js';

function unwrapList(data) {
  if (!data) return { items: [], total: 0 };
  if (Array.isArray(data)) return { items: data, total: data.length };
  const items = data.items
    || data.content
    || data.certificates
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
      || [item.student?.firstName, item.student?.lastName].filter(Boolean).join(' ')
      || item.user?.name
      || item.user?.fullName
      || '',
    studentId: item.studentId || item.student?.id || null,
    status: String(item.status || 'enrolled').toLowerCase(),
    progressPct: Number.isFinite(progressPct) ? Math.round(progressPct) : 0,
    certificateId: item.certificateId || item.certificate?.id || null,
    quizzes: item.quizzes || item.enrollment?.quizzes,
    passed: item.passed ?? item.quizzes?.[0]?.passed,
    bestScore: item.bestScore ?? item.quizzes?.[0]?.bestScore ?? item.quizzes?.[0]?.bestPercentage,
    quizPercentage: item.quizPercentage ?? item.percentage ?? item.quizzes?.[0]?.percentage,
  };
}

function normalizeCertificate(item) {
  if (!item) return item;
  return mergeCertificateRecords(item);
}

function toIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
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

  getEnrollment: async (enrollmentId) => {
    if (!enrollmentId) return null;
    const attempts = [
      () => api.get(`/lms/my-learning/${enrollmentId}`),
      () => api.get(`/parent/lms/my-learning/${enrollmentId}`),
      () => api.get(`/lms/enrollments/${enrollmentId}`),
    ];
    let lastErr;
    for (const attempt of attempts) {
      try {
        return normalizeLearningItem(await attempt());
      } catch (err) {
        lastErr = err;
        if (!isMissingRouteError(err) && Number(err?.status) !== 403) {
          if (Number(err?.status) >= 500) throw err;
        }
      }
    }
    if (lastErr) throw lastErr;
    return null;
  },

  listQuizAttempts: async (quizId, params = {}) => {
    if (!quizId) return { items: [], total: 0 };
    try {
      const data = unwrapList(await api.get(`/lms/quizzes/${quizId}/attempts`, params));
      return { items: data.items || [], total: data.total };
    } catch (err) {
      if (isMissingRouteError(err) || Number(err?.status) === 403) {
        return { items: [], total: 0 };
      }
      throw err;
    }
  },

  getQuizAttempt: async (quizId, attemptId) => {
    if (!quizId || !attemptId) return null;
    try {
      return await api.get(`/lms/quizzes/${quizId}/attempts/${attemptId}`);
    } catch (err) {
      if (isMissingRouteError(err) || Number(err?.status) === 403) return null;
      throw err;
    }
  },

  updateLessonProgress: (lessonId, body) => api.post(`/lms/lessons/${lessonId}/progress`, body),
  startQuizAttempt: (quizId, body) => api.post(`/lms/quizzes/${quizId}/attempts`, body),
  submitQuizAttempt: (quizId, attemptId, body) =>
    api.post(`/lms/quizzes/${quizId}/attempts/${attemptId}/submit`, body),
  completeCourse: async (enrollmentId) => {
    const data = await api.post(`/lms/enrollments/${enrollmentId}/complete`);
    const payload = data?.data && typeof data.data === 'object' ? { ...data, ...data.data } : data;
    const cert = normalizeCertificate(
      payload?.certificate
      || payload?.issuedCertificate
      || (payload?.certificateId ? { ...payload, id: payload.certificateId } : null),
    );
    return {
      ...payload,
      certificate: cert,
      certificateId: payload?.certificateId || cert?.id || null,
    };
  },

  /**
   * List issued course certificates (role-scoped by backend).
   * Parents may need /parent/lms/certificates or studentIds filter.
   */
  listCertificates: async (params = {}) => {
    const studentIds = toIdList(params.studentIds);
    const classIds = toIdList(params.classIds);
    const query = { ...params };
    delete query.studentIds;
    delete query.classIds;
    if (studentIds.length) query.studentIds = studentIds.join(',');
    if (classIds.length) query.classIds = classIds.join(',');

    const attempts = studentIds.length
      ? [
        () => api.get('/parent/lms/certificates', query),
        () => api.get('/lms/certificates', query),
        () => api.get('/teacher/lms/certificates', query),
      ]
      : [
        () => api.get('/lms/certificates', query),
        () => api.get('/parent/lms/certificates', query),
        () => api.get('/teacher/lms/certificates', query),
      ];

    let lastErr;
    let lastEmpty = { items: [], total: 0 };
    const studentSet = new Set(studentIds.map(String));
    let listed = [];
    for (const attempt of attempts) {
      try {
        const data = unwrapList(await attempt());
        const items = (data.items || []).map(normalizeCertificate);
        const scoped = studentSet.size
          ? items.filter((item) => !item.studentId || studentSet.has(String(item.studentId)))
          : items;
        if (scoped.length) {
          listed = scoped;
          break;
        }
        lastEmpty = { items: [], total: data.total ?? 0 };
      } catch (err) {
        lastErr = err;
        if (!isMissingRouteError(err) && Number(err?.status) !== 403) {
          if (Number(err?.status) >= 500) throw err;
        }
      }
    }

    let learningItems = [];
    try {
      if (studentIds.length || classIds.length) {
        const learning = await lmsApi.myLearning({ studentIds, classIds });
        learningItems = learning.items || [];
      } else {
        const enrollments = await lmsApi.listEnrollments();
        learningItems = enrollments.items || [];
      }
    } catch {
      learningItems = [];
    }

    if (listed.length) {
      const unknown = listed.filter((cert) => {
        const merged = mergeLearningOntoCertificate(cert, learningItems);
        const outcome = enrollmentQuizOutcome(merged);
        return merged.enrollmentId && outcome.passed == null && !outcome.attempted;
      });
      let extraLearning = [];
      if (unknown.length) {
        extraLearning = (await Promise.all(unknown.slice(0, 25).map(async (cert) => {
          try {
            return await lmsApi.getEnrollment(cert.enrollmentId);
          } catch {
            return null;
          }
        }))).filter(Boolean);
      }
      const earned = keepEarnedCertificates(listed, [...learningItems, ...extraLearning])
        .map(normalizeCertificate);
      return { items: earned, total: earned.length };
    }

    const fromLearning = learningRowsWithEarnedCertificates(learningItems)
      .map((row) => normalizeCertificate({
        ...(row.certificate || {}),
        id: row.certificateId || row.certificate?.id,
        learnerName: row.learnerName || row.certificate?.learnerName,
        courseTitle: row.courseTitle || row.certificate?.courseTitle,
        issuedAt: row.certificate?.issuedAt || row.completedAt,
        certificateNumber: row.certificate?.certificateNumber,
        enrollmentId: row.id,
        studentId: row.studentId,
        quizzes: row.quizzes,
        passed: row.passed ?? row.quizzes?.[0]?.passed,
        bestScore: row.bestScore ?? row.quizzes?.[0]?.bestScore,
        percentage: row.quizPercentage ?? row.quizzes?.[0]?.percentage,
        passingPercentage: row.quizzes?.[0]?.passPercentage ?? row.quizzes?.[0]?.passingPercentage,
      }));
    if (fromLearning.length) {
      return { items: dedupeById(fromLearning), total: fromLearning.length };
    }

    if (lastEmpty) return lastEmpty;
    if (lastErr) throw lastErr;
    return { items: [], total: 0 };
  },

  getCertificate: async (certificateId) => {
    if (!certificateId) return null;
    const attempts = [
      () => api.get(`/lms/certificates/${certificateId}`),
      () => api.get(`/parent/lms/certificates/${certificateId}`),
    ];
    for (const attempt of attempts) {
      try {
        const data = await attempt();
        return normalizeCertificate(data);
      } catch (err) {
        if (!isMissingRouteError(err) && Number(err?.status) !== 403) {
          if (Number(err?.status) >= 500) throw err;
        }
      }
    }
    return null;
  },

  /**
   * Fresh GET + merge with a list/enrollment row so preview always has names.
   * Hydrates from my-learning detail when GET is still thin.
   */
  resolveCertificate: async (certificateId, fallback = null) => {
    let fresh = null;
    if (certificateId) {
      try {
        fresh = await lmsApi.getCertificate(certificateId);
      } catch {
        fresh = null;
      }
    }
    let record = mergeCertificateRecords(fallback, fresh);
    if ((!record.learnerName || !record.courseTitle) && record.enrollmentId) {
      try {
        const learning = await lmsApi.myLearningDetail(record.enrollmentId);
        record = mergeCertificateRecords(record, learning, learning?.certificate, {
          learnerName: learning?.learnerName,
          courseTitle: learning?.courseTitle || learning?.title || learning?.course?.title,
          issuedAt: learning?.completedAt || learning?.certificate?.issuedAt,
          certificateNumber: learning?.certificate?.certificateNumber,
          studentId: learning?.studentId,
        });
      } catch {
        // keep merged record
      }
    }
    return record;
  },

  /** Backend-rendered HTML (fallback when portal template is disabled). */
  certificateHtml: async (certificateId) => {
    const attempts = [
      () => api.get(`/lms/certificates/${certificateId}/html`),
      () => api.get(`/parent/lms/certificates/${certificateId}/html`),
    ];
    let lastErr;
    for (const attempt of attempts) {
      try {
        return await attempt();
      } catch (err) {
        lastErr = err;
        if (!isMissingRouteError(err) && Number(err?.status) !== 403) {
          if (Number(err?.status) >= 500) throw err;
        }
      }
    }
    throw lastErr || new Error('Certificate HTML unavailable.');
  },
};

export default lmsApi;
