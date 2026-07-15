import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  acknowledgeNotice,
  archiveNotice,
  createNotice,
  deleteNotice,
  duplicateNotice,
  getMyNoticeById,
  getMyNotices,
  getNoticeAnalytics,
  getNoticeAudienceOptions,
  getNoticeById,
  getNoticeRecipients,
  getNotices,
  markNoticeRead,
  previewNoticeAudience,
  publishNotice,
  updateNotice,
} from '../services/noticeBoardService.js';

export function useNotices(filters = {}) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    return getNotices(filters)
      .then(setData)
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...data, loading, error, reload };
}

export function useNoticeDetail(noticeId) {
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    if (!noticeId) return Promise.resolve();
    setLoading(true);
    return getNoticeById(noticeId)
      .then(setNotice)
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [noticeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { notice, loading, error, reload };
}

export function useMyNotices(filters = {}) {
  const { user } = useAuth();
  const [data, setData] = useState({ items: [], total: 0, unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    if (!user?.id) return Promise.resolve();
    setLoading(true);
    return getMyNotices(user.id, filters)
      .then(setData)
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [user?.id, JSON.stringify(filters)]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...data, loading, error, reload };
}

export function useMyNoticeDetail(noticeId) {
  const { user } = useAuth();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !noticeId) return;
    setLoading(true);
    getMyNoticeById(user.id, noticeId)
      .then(setNotice)
      .finally(() => setLoading(false));
  }, [user?.id, noticeId]);

  return { notice, loading };
}

export function useNoticeAudienceOptions() {
  const { user } = useAuth();
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNoticeAudienceOptions(user?.schoolId)
      .then(setOptions)
      .finally(() => setLoading(false));
  }, [user?.schoolId]);

  return { options, loading };
}

export function useNoticeAudiencePreview() {
  const { user } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPreview = useCallback((audience) => {
    setLoading(true);
    return previewNoticeAudience(audience, user?.schoolId)
      .then(setPreview)
      .finally(() => setLoading(false));
  }, [user?.schoolId]);

  return { preview, loading, loadPreview, clearPreview: () => setPreview(null) };
}

export function useNoticeMutations() {
  const { user } = useAuth();

  return {
    createNotice: (payload) => createNotice(payload, user),
    updateNotice: (id, payload) => updateNotice(id, payload, user),
    deleteNotice: (id) => deleteNotice(id, user),
    publishNotice: (id) => publishNotice(id, user),
    archiveNotice: (id) => archiveNotice(id, user),
    duplicateNotice: (id) => duplicateNotice(id, user),
    markRead: (noticeId) => markNoticeRead(user?.id, noticeId),
    acknowledge: (noticeId) => acknowledgeNotice(user?.id, noticeId),
    getAnalytics: getNoticeAnalytics,
    getRecipients: getNoticeRecipients,
  };
}
