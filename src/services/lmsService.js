import { api } from './api/client.js';
import { API_BASE_URL } from './api/config.js';

function unwrapList(data) {
  if (!data) return { items: [], total: 0 };
  if (Array.isArray(data)) return { items: data, total: data.length };
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: data.total ?? (Array.isArray(data.items) ? data.items.length : 0),
  };
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

  listEnrollments: async (params = {}) => unwrapList(await api.get('/lms/enrollments', params)),
  createEnrollment: (body) => api.post('/lms/enrollments', body),
  enrollClass: (body) => api.post('/lms/enrollments/enroll-class', body),
  deleteEnrollment: (enrollmentId) => api.delete(`/lms/enrollments/${enrollmentId}`),

  myLearning: async () => unwrapList(await api.get('/lms/my-learning')),
  myLearningDetail: (enrollmentId) => api.get(`/lms/my-learning/${enrollmentId}`),
  updateLessonProgress: (lessonId, body) => api.post(`/lms/lessons/${lessonId}/progress`, body),
  startQuizAttempt: (quizId, body) => api.post(`/lms/quizzes/${quizId}/attempts`, body),
  submitQuizAttempt: (quizId, attemptId, body) =>
    api.post(`/lms/quizzes/${quizId}/attempts/${attemptId}/submit`, body),
  completeCourse: (enrollmentId) => api.post(`/lms/enrollments/${enrollmentId}/complete`),

  listCertificates: async () => unwrapList(await api.get('/lms/certificates')),
  certificateHtml: (certificateId) => api.get(`/lms/certificates/${certificateId}/html`),
};

export default lmsApi;
