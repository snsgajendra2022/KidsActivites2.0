import { ApiError, refreshAccessToken } from '../services/api/client.js';
import { API_BASE_URL, resolveTenantSlug, TENANT_HEADER } from '../services/api/config.js';
import { getAccessToken } from '../services/api/tokenStorage.js';
import {
  buildAdminAlbumUploadFormData,
  buildTeacherAlbumUploadFormData,
} from '../services/classAlbumService.js';
import { isVideoMediaFile } from './mediaUploadLimits.js';
import {
  getUploadTuning,
  recordMeasuredUploadSpeed,
  getUploadBytesPerSecond,
  appendSpeedSample,
  getEffectiveSpeedBytesPerSecond,
  getSmoothedBytesPerSecond,
} from '../services/uploadBandwidthService.js';

export const UPLOAD_ENDPOINT = {
  TEACHER: 'teacher',
  ADMIN: 'admin',
};

const UPLOAD_DB_NAME = 'KidsActivitiesClassroomUploadQueue';
const UPLOAD_DB_VERSION = 1;
const UPLOAD_STORE_NAME = 'queue';

/** @deprecated Only used to skip re-writing large blobs on progress ticks — all files persist once on add. */
export const LARGE_FILE_BYTES = 8 * 1024 * 1024;

export const MAX_CONCURRENT = 3;
export const MAX_VIDEO_CONCURRENT = 1;
export const MAX_RETRIES = 3;
export const MAX_UPLOAD_QUEUE = 500;

const PROGRESS_NOTIFY_MS = 400;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(UPLOAD_DB_NAME, UPLOAD_DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(UPLOAD_STORE_NAME)) {
        db.createObjectStore(UPLOAD_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function getAllStored() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readonly');
    const req = tx.objectStore(UPLOAD_STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function putStored(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readwrite');
    tx.objectStore(UPLOAD_STORE_NAME).put(item);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteStored(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readwrite');
    tx.objectStore(UPLOAD_STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export function fileToKey(file) {
  return `${file.name}-${file.size}-${file.lastModified ?? Date.now()}`;
}

/** Stable identity for the same picked file (survives compression size changes). */
export function fileSourceKey(file) {
  return `${file.name}-${file.lastModified ?? Date.now()}`;
}

export function isTeacherQueueItem(item) {
  const endpoint = item.uploadParams?.endpoint ?? item.originEndpoint;
  return !endpoint || endpoint === UPLOAD_ENDPOINT.TEACHER;
}

export function isAdminQueueItem(item) {
  const endpoint = item.uploadParams?.endpoint ?? item.originEndpoint;
  return !endpoint || endpoint === UPLOAD_ENDPOINT.ADMIN;
}

function isActiveQueueItem(item) {
  return item.status === 'waiting' || item.status === 'paused' || item.status === 'uploading';
}

function isFinishedQueueItem(item) {
  return item.status === 'completed' || item.status === 'failed';
}

function parseUploadJsonResponse(text, status) {
  let json = null;
  if (text) {
    try { json = JSON.parse(text); } catch { /* ignore */ }
  }
  if (status === 413) {
    const err = json?.error;
    throw new ApiError(
      err?.message || 'File is too large for the server.',
      413,
      err?.code || 'FILE_TOO_LARGE',
    );
  }
  if (status < 200 || status >= 300) {
    const err = json?.error;
    throw new ApiError(
      err?.message || `Upload failed (${status})`,
      status,
      err?.code,
    );
  }
  if (json && typeof json.success === 'boolean') {
    if (!json.success) {
      throw new ApiError(json.error?.message || 'Upload failed', status, json.error?.code);
    }
    return json.data;
  }
  return json;
}

function resolveUploadEndpoint(uploadParams) {
  if (uploadParams?.endpoint === UPLOAD_ENDPOINT.ADMIN || uploadParams?.albumId) {
    return UPLOAD_ENDPOINT.ADMIN;
  }
  return UPLOAD_ENDPOINT.TEACHER;
}

function buildUploadFormData(uploadParams, file) {
  const endpoint = resolveUploadEndpoint(uploadParams);
  if (endpoint === UPLOAD_ENDPOINT.ADMIN) {
    return buildAdminAlbumUploadFormData({ ...uploadParams, files: [file] });
  }
  return buildTeacherAlbumUploadFormData({ ...uploadParams, files: [file] });
}

function getUploadUrl(uploadParams) {
  const endpoint = resolveUploadEndpoint(uploadParams);
  return endpoint === UPLOAD_ENDPOINT.ADMIN
    ? `${API_BASE_URL}/admin/albums/upload`
    : `${API_BASE_URL}/teacher/albums/upload`;
}

/** XHR upload to album endpoints — supports progress + abort. */
function uploadSingleFileWithProgress(uploadParams, file, { onProgress, signal } = {}, retried = false) {
  return new Promise((resolve, reject) => {
    const formData = buildUploadFormData(uploadParams, file);
    const xhr = new XMLHttpRequest();
    const url = getUploadUrl(uploadParams);

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException('Upload aborted', 'AbortError'));
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });

    let lastReportedPct = -1;
    xhr.upload.addEventListener('progress', (ev) => {
      if (ev.lengthComputable && onProgress) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        if (pct !== lastReportedPct && (pct - lastReportedPct >= 1 || pct === 100 || lastReportedPct < 0)) {
          lastReportedPct = pct;
          onProgress(pct, ev.loaded, ev.total);
        }
      }
    });

    const finish = (fn) => {
      signal?.removeEventListener('abort', onAbort);
      fn();
    };

    xhr.addEventListener('load', () => {
      if (xhr.status === 401 && !retried) {
        finish(() => {});
        refreshAccessToken()
          .then((newToken) => {
            if (newToken) {
              uploadSingleFileWithProgress(uploadParams, file, { onProgress, signal }, true)
                .then(resolve)
                .catch(reject);
              return;
            }
            reject(new ApiError('Session expired. Please sign in again.', 401, 'UNAUTHORIZED'));
          })
          .catch(reject);
        return;
      }

      finish(() => {
        try {
          resolve(parseUploadJsonResponse(xhr.responseText, xhr.status));
        } catch (err) {
          reject(err);
        }
      });
    });

    xhr.addEventListener('error', () => {
      finish(() => reject(new ApiError('Network error during upload.', 0, 'NETWORK_ERROR')));
    });

    xhr.addEventListener('abort', () => {
      finish(() => reject(new DOMException('Upload aborted', 'AbortError')));
    });

    xhr.open('POST', url);
    xhr.timeout = 0;
    const token = getAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    const tenantSlug = resolveTenantSlug();
    if (tenantSlug) xhr.setRequestHeader(TENANT_HEADER, tenantSlug);
    xhr.send(formData);
  });
}

class ClassroomUploadManager {
  items = [];

  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  listeners = new Set();

  activeUploads = new Map();

  /** IDs the user explicitly cancelled/removed — abort must not leave them as Paused. */
  cancellingIds = new Set();

  /** IDs removed this session — hydrate must not resurrect them from IndexedDB. */
  purgedIds = new Set();

  hydratePromise = null;

  lastProgressNotifyAt = 0;

  markPurged(id) {
    if (id) this.purgedIds.add(id);
  }

  markPurgedMany(ids) {
    ids.forEach((id) => this.markPurged(id));
  }

  getState() {
    return { items: [...this.items], isOnline: this.isOnline };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(force = false) {
    if (!force) return;
    this.listeners.forEach((l) => l());
  }

  notifyProgress() {
    const now = Date.now();
    if (now - this.lastProgressNotifyAt >= PROGRESS_NOTIFY_MS) {
      this.lastProgressNotifyAt = now;
      this.listeners.forEach((l) => l());
    }
  }

  flushNotify() {
    this.lastProgressNotifyAt = 0;
    this.listeners.forEach((l) => l());
  }

  setOnline(online) {
    if (this.isOnline === online) return;
    this.isOnline = online;
    if (!online) {
      this.activeUploads.forEach((ac) => ac.abort());
      this.activeUploads.clear();
      this.items = this.items.map((it) =>
        (it.status === 'uploading' ? { ...it, status: 'paused' } : it),
      );
      this.persistAll();
    }
    this.notify(true);
    if (online) this.processQueue();
  }

  async hydrateFromPersisted() {
    if (this.hydratePromise) return this.hydratePromise;
    this.hydratePromise = this._hydrateFromPersisted();
    try {
      await this.hydratePromise;
    } finally {
      this.hydratePromise = null;
    }
  }

  async _hydrateFromPersisted() {
    try {
      const stored = await getAllStored();
      const byId = new Map();

      for (const s of stored) {
        if (!s.blob || this.purgedIds.has(s.id)) continue;
        byId.set(s.id, {
          ...s,
          sourceFileKey: s.sourceFileKey ?? fileSourceKey({ name: s.fileName, lastModified: s.createdAt }),
          file: new File([s.blob], s.fileName, { type: s.fileType }),
          speedSamples: undefined,
        });
      }

      // Keep in-memory items (active uploads, large videos not yet in IDB)
      for (const item of this.items) {
        if (this.purgedIds.has(item.id)) continue;
        const existing = byId.get(item.id);
        if (item.file) {
          byId.set(item.id, { ...(existing || {}), ...item, file: item.file });
        } else if (!existing) {
          byId.set(item.id, item);
        }
      }

      this.items = Array.from(byId.values())
        .filter((item) => !this.purgedIds.has(item.id))
        .map((item) => {
          if (this.activeUploads.has(item.id)) {
            return { ...item, status: 'uploading' };
          }
          // Page was closed mid-upload — resume from saved state
          if (item.status === 'uploading') {
            return {
              ...item,
              status: 'waiting',
              error: undefined,
              progress: item.progress ?? 0,
            };
          }
          return item;
        });

      this.notify(true);
      if (this.isOnline) this.processQueue();
    } catch (e) {
      console.error('[ClassroomUploadManager] hydrateFromPersisted failed', e);
    }
  }

  /** @deprecated Use hydrateFromPersisted */
  async loadFromPersisted() {
    return this.hydrateFromPersisted();
  }

  async persistItem(item) {
    if (!item?.file) return;
    if (this.purgedIds.has(item.id)) return;
    if (this.cancellingIds.has(item.id)) return;
    if (!this.items.some((i) => i.id === item.id)) return;
    try {
      await putStored({
        id: item.id,
        fileName: item.fileName,
        fileSize: item.fileSize,
        fileType: item.fileType,
        fileKey: item.fileKey,
        sourceFileKey: item.sourceFileKey,
        originEndpoint: item.originEndpoint,
        status: item.status,
        progress: item.progress,
        retries: item.retries,
        error: item.error,
        successMessage: item.successMessage,
        uploadParams: item.uploadParams,
        createdAt: item.createdAt,
        blob: item.file,
      });
      if (this.purgedIds.has(item.id) || this.cancellingIds.has(item.id) || !this.items.some((i) => i.id === item.id)) {
        await deleteStored(item.id);
      }
    } catch (e) {
      console.error('[ClassroomUploadManager] persistItem failed', e);
    }
  }

  async persistAll() {
    await Promise.all(this.items.filter((i) => i.file).map((i) => this.persistItem(i)));
  }

  async addFiles(files, { originEndpoint = null } = {}) {
    let added = 0;
    let skipped = 0;
    let skippedDueToLimit = 0;
    let replacedFinished = 0;

    for (const file of files) {
      if (this.items.length >= MAX_UPLOAD_QUEUE) {
        skippedDueToLimit += 1;
        continue;
      }

      const fileKey = fileToKey(file);
      const sourceKey = fileSourceKey(file);

      const finishedDupes = this.items.filter(
        (i) => isFinishedQueueItem(i) && (i.sourceFileKey === sourceKey || i.fileKey === fileKey),
      );
      if (finishedDupes.length > 0) {
        this.markPurgedMany(finishedDupes.map((i) => i.id));
        await Promise.all(finishedDupes.map((i) => deleteStored(i.id)));
        this.items = this.items.filter((i) => !finishedDupes.some((d) => d.id === i.id));
        replacedFinished += finishedDupes.length;
      }

      const hasActiveDuplicate = this.items.some(
        (i) => isActiveQueueItem(i) && (i.sourceFileKey === sourceKey || i.fileKey === fileKey),
      );
      if (hasActiveDuplicate) {
        skipped += 1;
        continue;
      }

      const item = {
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        fileKey,
        sourceFileKey: sourceKey,
        originEndpoint,
        status: 'waiting',
        progress: 0,
        retries: 0,
        bytesLoaded: 0,
        uploadStartedAt: null,
        createdAt: Date.now(),
        file,
      };
      this.items.push(item);
      void this.persistItem(item);
      added += 1;
    }

    this.notify(true);
    return { added, skipped, skippedDueToLimit, replacedFinished };
  }

  async submitPending(uploadParams, { scopeEndpoint = null } = {}) {
    const shouldInclude = (item) => {
      if (item.status !== 'waiting' && item.status !== 'paused') return false;
      if (!scopeEndpoint) return true;
      const ep = item.uploadParams?.endpoint ?? item.originEndpoint;
      return !ep || ep === scopeEndpoint;
    };

    const pending = this.items.filter(shouldInclude);
    if (pending.length === 0) return 0;

    this.items = this.items.map((item) => {
      if (!shouldInclude(item)) return item;
      return {
        ...item,
        uploadParams,
        status: 'waiting',
        progress: 0,
        bytesLoaded: 0,
        uploadStartedAt: null,
        error: undefined,
        retries: 0,
      };
    });

    await Promise.all(
      this.items
        .filter((i) => shouldInclude(i) && i.uploadParams && i.file)
        .map((i) => this.persistItem(i)),
    );

    this.notify(true);
    if (this.isOnline) this.processQueue();
    return pending.length;
  }

  async remove(id) {
    this.cancellingIds.add(id);
    this.markPurged(id);
    try {
      const ac = this.activeUploads.get(id);
      if (ac) {
        ac.abort();
        this.activeUploads.delete(id);
      }
      this.items = this.items.filter((i) => i.id !== id);
      await deleteStored(id);
      this.notify(true);
      this.processQueue();
    } finally {
      this.cancellingIds.delete(id);
    }
  }

  async cancel(id) {
    await this.remove(id);
  }

  async cancelAllActive({ scopeEndpoint = null } = {}) {
    const shouldInclude = (item) => {
      if (item.status !== 'uploading' && item.status !== 'waiting' && item.status !== 'paused') {
        return false;
      }
      if (!scopeEndpoint) return true;
      const ep = item.uploadParams?.endpoint ?? item.originEndpoint;
      return !ep || ep === scopeEndpoint;
    };

    const toRemove = this.items.filter(shouldInclude);
    this.markPurgedMany(toRemove.map((item) => item.id));
    toRemove.forEach((item) => this.cancellingIds.add(item.id));
    try {
      toRemove.forEach((item) => {
        const ac = this.activeUploads.get(item.id);
        if (ac) ac.abort();
        this.activeUploads.delete(item.id);
      });
      await Promise.all(toRemove.map((item) => deleteStored(item.id)));
      const removeIds = new Set(toRemove.map((item) => item.id));
      this.items = this.items.filter((i) => !removeIds.has(i.id));
      this.notify(true);
      this.processQueue();
    } finally {
      toRemove.forEach((item) => this.cancellingIds.delete(item.id));
    }
  }

  async retry(id) {
    const item = this.items.find((i) => i.id === id);
    if (!item || (item.status !== 'failed' && item.status !== 'paused')) return;
    const updated = {
      ...item,
      status: 'waiting',
      retries: 0,
      error: undefined,
      progress: 0,
      bytesLoaded: 0,
      uploadStartedAt: null,
    };
    this.items = this.items.map((i) => (i.id === id ? updated : i));
    await this.persistItem(updated);
    this.notify(true);
    if (this.isOnline) this.processQueue();
  }

  async clearFinished({ scopeEndpoint = null } = {}) {
    const shouldInclude = (item) => {
      if (!isFinishedQueueItem(item)) return false;
      if (!scopeEndpoint) return true;
      const ep = item.uploadParams?.endpoint ?? item.originEndpoint;
      return !ep || ep === scopeEndpoint;
    };

    const ids = this.items.filter(shouldInclude).map((i) => i.id);
    if (ids.length === 0) return ids;

    this.markPurgedMany(ids);
    this.items = this.items.filter((i) => !shouldInclude(i));
    this.notify(true);
    await Promise.all(ids.map((id) => deleteStored(id)));
    this.notify(true);
    return ids;
  }

  isVideoItem(item) {
    return isVideoMediaFile(item.file);
  }

  countActiveVideos() {
    return this.items.filter(
      (i) => this.isVideoItem(i) && (i.status === 'uploading' || i.status === 'processing'),
    ).length;
  }

  getNextToUpload() {
    const candidate = this.items.find(
      (i) =>
        (i.status === 'waiting' || i.status === 'paused') &&
        i.uploadParams &&
        !this.activeUploads.has(i.id),
    );
    if (!candidate) return undefined;
    const { maxVideoConcurrent } = getUploadTuning();
    if (this.isVideoItem(candidate) && this.countActiveVideos() >= maxVideoConcurrent) {
      return undefined;
    }
    return candidate;
  }

  startUploadJob(item) {
    const updated = {
      ...item,
      status: 'uploading',
      progress: 0,
      bytesLoaded: 0,
      uploadStartedAt: Date.now(),
    };
    this.items = this.items.map((i) => (i.id === item.id ? updated : i));
    this.notify(true);

    const controller = new AbortController();
    this.activeUploads.set(item.id, controller);

    void this.runOneUpload(updated, controller.signal).finally(() => {
      this.activeUploads.delete(item.id);
      this.flushNotify();
      if (this.isOnline) this.processQueue();
    });
  }

  processQueue() {
    if (!this.isOnline) return;

    const { maxConcurrent } = getUploadTuning();
    while (this.activeUploads.size < maxConcurrent) {
      const next = this.getNextToUpload();
      if (!next) break;
      this.startUploadJob(next);
    }
  }

  async runOneUpload(item, signal) {
    let current = item;

    const update = (patch, { persist = false, forceNotify = false } = {}) => {
      const idx = this.items.findIndex((i) => i.id === current.id);
      if (idx === -1) return;
      const next = { ...this.items[idx], ...patch };
      this.items[idx] = next;
      current = next;

      const isProgressOnly = Object.keys(patch).every((k) =>
        ['progress', 'bytesLoaded', 'speedSamples'].includes(k),
      );

      if (isProgressOnly) {
        this.notifyProgress();
      } else {
        this.notify(true);
      }

      if (persist) {
        void this.persistItem(next);
      }
    };

    if (!current.uploadParams) {
      update({ status: 'failed', error: 'Missing upload settings.' }, { persist: true, forceNotify: true });
      return;
    }

    try {
      await refreshAccessToken();
    } catch {
      // continue with existing token
    }

    try {
      const uploadResult = await uploadSingleFileWithProgress(
        current.uploadParams,
        current.file,
        {
          signal,
          onProgress: (pct, loaded = 0) => {
            const samples = appendSpeedSample(current.speedSamples, loaded);
            update({
              progress: pct,
              bytesLoaded: loaded,
              uploadStartedAt: current.uploadStartedAt ?? Date.now(),
              speedSamples: samples,
            });
          },
        },
      );

      update({
        status: 'completed',
        progress: 100,
        error: undefined,
        uploadResult,
        successMessage: `"${current.fileName}" uploaded.`,
      }, { persist: true });

      const elapsed = (Date.now() - (current.uploadStartedAt || Date.now())) / 1000;
      const smoothed = getSmoothedBytesPerSecond(current.speedSamples);
      const measured = smoothed || (elapsed >= 1.5 && current.fileSize ? current.fileSize / elapsed : null);
      if (measured) recordMeasuredUploadSpeed(measured);

      this.flushNotify();
    } catch (err) {
      if (err?.name === 'AbortError') {
        if (this.cancellingIds.has(item.id) || !this.items.some((i) => i.id === item.id)) {
          void deleteStored(item.id);
          this.flushNotify();
          return;
        }
        update({
          status: 'paused',
          progress: this.items.find((i) => i.id === item.id)?.progress ?? 0,
        }, { persist: true });
        this.flushNotify();
        return;
      }

      const errorMessage = err instanceof ApiError
        ? err.message
        : (err?.message || 'Upload failed');

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        const refreshed = await refreshAccessToken();
        if (refreshed && current.retries < MAX_RETRIES) {
          update({
            status: 'waiting',
            error: 'Session refreshed — retrying upload…',
            retries: current.retries + 1,
            progress: 0,
            bytesLoaded: 0,
            speedSamples: [],
          }, { persist: true });
          this.flushNotify();
          await new Promise((r) => setTimeout(r, 800));
          if (this.isOnline && !signal.aborted) this.processQueue();
          return;
        }
        update({
          status: 'paused',
          error: errorMessage || 'Session expired. Stay signed in and tap Retry.',
        }, { persist: true });
        this.flushNotify();
        return;
      }

      const newRetries = current.retries + 1;
      if (newRetries >= MAX_RETRIES) {
        update({ status: 'failed', error: errorMessage, retries: newRetries }, { persist: true });
        this.flushNotify();
        return;
      }

      update({
        status: 'waiting',
        error: errorMessage,
        retries: newRetries,
        progress: 0,
        bytesLoaded: 0,
      }, { persist: true });

      const delay = Math.min(1000 * 2 ** newRetries, 30000);
      await new Promise((r) => setTimeout(r, delay));
      if (this.isOnline && !signal.aborted) {
        this.processQueue();
      }
    }
  }
}

export const classroomUploadManager = new ClassroomUploadManager();

export function formatUploadSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '';
  const mbps = (bytesPerSecond * 8) / 1_000_000;
  const mbpsStr = mbps >= 10 ? mbps.toFixed(1) : mbps.toFixed(2);
  const kbPerSec = bytesPerSecond / 1024;
  const rateStr = kbPerSec >= 1024
    ? `${(kbPerSec / 1024).toFixed(1)} MB/s`
    : `${Math.round(kbPerSec)} KB/s`;
  return `${rateStr} · ${mbpsStr} Mbps`;
}

export function formatEta(seconds) {
  if (seconds == null || seconds <= 0) return '';
  if (seconds < 60) return `~${seconds}s left`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `~${m}m ${s}s left` : `~${m}m left`;
}

export function estimateUploadEtaSeconds(bytesLoaded, totalBytes, startedAt, speedOverride) {
  const speed = speedOverride
    ?? (startedAt && bytesLoaded && bytesLoaded > 0
      ? bytesLoaded / Math.max(0.5, (Date.now() - startedAt) / 1000)
      : null);
  if (!totalBytes || !speed || speed <= 0) return null;
  const remaining = totalBytes - (bytesLoaded || 0);
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / speed);
}

export function getUploadSpeedLabel(item) {
  if (item.status === 'waiting' || item.status === 'paused') {
    const bps = getUploadBytesPerSecond();
    if (!bps || !item.fileSize) return null;
    const eta = Math.ceil(item.fileSize / bps);
    const speed = formatUploadSpeed(bps);
    return eta > 0 ? `Est. ${speed} · ${formatEta(eta)}` : `Est. ${speed}`;
  }

  if (item.status !== 'uploading' || !item.uploadStartedAt) return null;

  const speedBps = getEffectiveSpeedBytesPerSecond(item);
  if (!speedBps) {
    if (!item.bytesLoaded) return 'Starting upload…';
    return 'Measuring speed…';
  }

  const speed = formatUploadSpeed(speedBps);
  const eta = estimateUploadEtaSeconds(
    item.bytesLoaded,
    item.fileSize,
    item.uploadStartedAt,
    speedBps,
  );
  return eta != null && eta > 0 ? `${speed} · ${formatEta(eta)}` : speed;
}

export function getBatchUploadSpeedLabel(items) {
  const uploading = items.filter((i) => i.status === 'uploading' && i.uploadStartedAt);
  if (uploading.length === 0) return null;

  const speeds = uploading
    .map((i) => getEffectiveSpeedBytesPerSecond(i))
    .filter((s) => s && s > 0);
  if (speeds.length === 0) return 'Starting upload…';

  const speed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const remainingBytes = items
    .filter((i) => i.status !== 'completed')
    .reduce((s, i) => s + Math.max(0, i.fileSize - (i.bytesLoaded || 0)), 0);

  const speedLabel = formatUploadSpeed(speed);
  if (remainingBytes <= 0 || speed <= 0) return speedLabel;
  const eta = Math.ceil(remainingBytes / speed);
  return `${speedLabel} · ${formatEta(eta)}`;
}
