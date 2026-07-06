import { create } from 'zustand';

/** @typedef {'not_selected'|'selected'|'waiting_for_internet'|'uploading'|'paused'|'retrying'|'uploaded'|'failed'|'rejected'|'removed'} UploadStatus */

/**
 * @typedef {Object} UploadItem
 * @property {string} id
 * @property {string} fieldKey
 * @property {File} file
 * @property {UploadStatus} status
 * @property {number} progress
 * @property {string|null} error
 * @property {string|null} rejectionReason
 * @property {string|null} previewUrl
 */

export const useUploadStore = create((set, get) => ({
  /** @type {UploadItem[]} */
  items: [],

  addItem: (fieldKey, file) => {
    const id = `${fieldKey}-${Date.now()}`;
    const previewUrl = (file.type.startsWith('image/') || file.type === 'application/pdf')
      ? URL.createObjectURL(file)
      : null;
    const item = {
      id,
      fieldKey,
      file,
      status: 'selected',
      progress: 0,
      error: null,
      rejectionReason: null,
      previewUrl,
    };
    set((s) => ({ items: [...s.items.filter((i) => i.fieldKey !== fieldKey), item] }));
    return id;
  },

  updateItem: (id, patch) => {
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  },

  removeItem: (id) => {
    const item = get().items.find((i) => i.id === id);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  getByField: (fieldKey) => get().items.find((i) => i.fieldKey === fieldKey),

  getPendingUploads: () => get().items.filter((i) =>
    ['selected', 'paused', 'waiting_for_internet', 'retrying', 'failed'].includes(i.status)
  ),

  getUploading: () => get().items.filter((i) => i.status === 'uploading'),

  hasIncompleteUploads: () => get().items.some((i) =>
    !['uploaded', 'removed', 'not_selected'].includes(i.status)
  ),

  pauseAll: () => {
    set((s) => ({
      items: s.items.map((i) =>
        ['uploading', 'selected', 'retrying'].includes(i.status)
          ? { ...i, status: 'paused' }
          : i
      ),
    }));
  },

  resumeAll: () => {
    set((s) => ({
      items: s.items.map((i) =>
        ['paused', 'waiting_for_internet'].includes(i.status)
          ? { ...i, status: 'retrying' }
          : i
      ),
    }));
  },

  clear: () => {
    get().items.forEach((i) => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
    set({ items: [] });
  },
}));
