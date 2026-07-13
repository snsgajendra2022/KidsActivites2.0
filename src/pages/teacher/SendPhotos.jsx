import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Camera, Send, Users, User, GraduationCap, Tv, Image as ImageIcon, ShieldAlert, ArrowRight, Upload,
  Wifi, WifiOff,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import {
  UPLOAD_TARGETS,
  getTeacherAlbumClasses,
} from '../../services/classAlbumService.js';
import { getTeacherStudents } from '../../services/teacherService.js';
import {
  ACCEPTED_CLASSROOM_MEDIA,
  filterAcceptedClassroomMediaFiles,
  getMediaUploadLimitHint,
  isVideoQueueItem,
  loadMediaUploadLimits,
  resolveMediaUploadError,
  validateMediaUploadFiles,
  validateMediaUploadFile,
} from '../../utils/mediaUploadLimits.js';
import {
  classroomUploadManager,
  MAX_UPLOAD_QUEUE,
  UPLOAD_ENDPOINT,
  getBatchUploadSpeedLabel,
  isTeacherQueueItem,
} from '../../utils/classroomUploadQueue.js';
import ClassroomUploadQueuePanel from '../../components/upload/ClassroomUploadQueuePanel.jsx';
import { prepareFilesForUpload } from '../../utils/compressClassroomImage.js';
import { getUploadTuning, probeUploadBandwidth } from '../../services/uploadBandwidthService.js';
import { useUploadBandwidth } from '../../hooks/useUploadBandwidth.js';
import '../../styles/send-photos.css';

const UPLOAD_TARGET_OPTIONS = [
  {
    value: UPLOAD_TARGETS.CLASS_ALBUM,
    label: 'Class Album',
    hint: 'TV playback and class parents',
    icon: ImageIcon,
  },
  {
    value: UPLOAD_TARGETS.PARENT_DIRECT,
    label: 'Parent Direct',
    hint: 'Sends privately to one parent',
    icon: User,
  },
  {
    value: UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT,
    label: 'Album + Parents',
    hint: 'Album and parent notification',
    icon: Tv,
  },
];

const SEND_TYPES = [
  { value: 'class', label: 'Entire Class', icon: GraduationCap },
  { value: 'selected', label: 'Selected', icon: Users },
  { value: 'individual', label: 'Individual', icon: User },
];

const ACCEPTED_MEDIA = ACCEPTED_CLASSROOM_MEDIA;

const SUCCESS_MESSAGES = {
  [UPLOAD_TARGETS.CLASS_ALBUM]: 'Uploaded to class album and shared with class parents.',
  [UPLOAD_TARGETS.PARENT_DIRECT]: 'Media sent to parent successfully.',
  [UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT]: 'Uploaded to class album and shared with parents successfully.',
};

function isAcceptedMediaFile(file) {
  return filterAcceptedClassroomMediaFiles([file]).length > 0;
}

export default function SendPhotos() {
  const { toast } = useToast();
  useUploadBandwidth();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [searchParams] = useSearchParams();
  const [albumClasses, setAlbumClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [uploadTarget, setUploadTarget] = useState(UPLOAD_TARGETS.CLASS_ALBUM);
  const [form, setForm] = useState({
    classId: '',
    recipients: 'class',
    studentIds: [],
    caption: '',
  });
  const [queueState, setQueueState] = useState(() => classroomUploadManager.getState());
  const [showConfirm, setShowConfirm] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [uploadLimits, setUploadLimits] = useState(null);
  const uploadLimitHint = useMemo(
    () => getMediaUploadLimitHint(uploadLimits || {}),
    [uploadLimits],
  );
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const teacherQueueItems = useMemo(
    () => queueState.items.filter(isTeacherQueueItem),
    [queueState.items],
  );

  const queueThumbKey = useMemo(
    () => teacherQueueItems.map((i) => `${i.id}:${i.fileKey}`).join('|'),
    [teacherQueueItems],
  );

  const queueStatusKey = useMemo(
    () => teacherQueueItems.map((i) => `${i.id}:${i.status}`).join('|'),
    [teacherQueueItems],
  );

  const [thumbnailUrls, setThumbnailUrls] = useState(() => new Map());
  const queueListRef = useRef(null);
  const prevQueueLengthRef = useRef(0);
  const batchSuccessShownRef = useRef(false);

  useEffect(() => {
    loadMediaUploadLimits().then(setUploadLimits).catch(() => setUploadLimits(null));
  }, []);

  useEffect(() => {
    const unsub = classroomUploadManager.subscribe(() => {
      setQueueState(classroomUploadManager.getState());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const onOnline = () => classroomUploadManager.setOnline(true);
    const onOffline = () => classroomUploadManager.setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getTeacherAlbumClasses()
      .then((classes) => {
        setAlbumClasses(classes);
        const fromUrl = searchParams.get('class');
        if (fromUrl && classes.some((c) => c.classId === fromUrl)) {
          setForm((prev) => ({ ...prev, classId: fromUrl }));
        }
      })
      .catch(() => setAlbumClasses([]));
    getTeacherStudents(user.id).then(setAllStudents);
  }, [user?.id, searchParams]);

  useEffect(() => {
    const items = teacherQueueItems;
    const ids = new Set(items.map((i) => i.id));

    setThumbnailUrls((prev) => {
      const next = new Map(prev);
      let changed = false;

      for (const [id, url] of next) {
        if (!ids.has(id)) {
          URL.revokeObjectURL(url);
          next.delete(id);
          changed = true;
        }
      }

      for (const item of items) {
        if (item.file && !next.has(item.id)) {
          next.set(item.id, URL.createObjectURL(item.file));
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [queueThumbKey, teacherQueueItems]);

  useEffect(() => {
    return () => {
      thumbnailUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [thumbnailUrls]);

  useEffect(() => {
    if (teacherQueueItems.length > prevQueueLengthRef.current) {
      queueListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevQueueLengthRef.current = teacherQueueItems.length;
  }, [teacherQueueItems.length]);

  const activeAlbumClasses = useMemo(
    () => albumClasses.filter(
      (c) => !c.classStatus || c.classStatus.toLowerCase() === 'active',
    ),
    [albumClasses],
  );

  const students = allStudents.filter((s) => s.classId === form.classId);
  const selectedClass = activeAlbumClasses.find((c) => c.classId === form.classId);
  const selectedAlbum = selectedClass?.album;
  const classAlbumHref = form.classId
    ? `${tenantPath('/teacher/class-album')}?class=${encodeURIComponent(form.classId)}`
    : tenantPath('/teacher/class-album');

  const needsClass = true;
  const needsStudent = uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT
    || (uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT && form.recipients !== 'class');

  const pendingQueueItems = useMemo(
    () => teacherQueueItems.filter((i) => i.status === 'waiting' || i.status === 'paused'),
    [teacherQueueItems],
  );

  const uploadingCount = useMemo(
    () => teacherQueueItems.filter((i) => i.status === 'uploading').length,
    [teacherQueueItems],
  );

  const completedCount = useMemo(
    () => teacherQueueItems.filter((i) => i.status === 'completed').length,
    [teacherQueueItems],
  );

  const failedCount = useMemo(
    () => teacherQueueItems.filter((i) => i.status === 'failed').length,
    [teacherQueueItems],
  );

  const isUploading = uploadingCount > 0;

  const hasActiveBatch = useMemo(
    () => teacherQueueItems.some(
      (i) => i.status === 'uploading'
        || ((i.status === 'waiting' || i.status === 'paused') && i.uploadParams),
    ),
    [teacherQueueItems],
  );

  const footerHint = useMemo(() => {
    if (!form.classId && needsClass) return 'Select a class to continue';
    if (uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM) {
      return selectedAlbum
        ? `${selectedClass?.className} · Album ${selectedAlbum.albumCode}`
        : selectedClass?.className;
    }
    if (uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT) {
      return form.studentIds.length ? `${form.studentIds.length} parent(s) selected` : 'Select a student';
    }
    return `${selectedClass?.className || 'Class'} · Album + parents`;
  }, [form, needsClass, selectedAlbum, selectedClass, uploadTarget]);

  const buildUploadParams = useCallback(() => {
    const shareStudentIds = uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT
      || (uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT && form.recipients !== 'class')
      ? form.studentIds
      : students.map((s) => s.id);

    return {
      endpoint: UPLOAD_ENDPOINT.TEACHER,
      uploadTarget,
      classId: form.classId || null,
      className: selectedClass?.className || null,
      schoolId: user?.schoolId || null,
      schoolName: user?.schoolName || selectedClass?.schoolName || null,
      studentId: form.studentIds[0] || null,
      studentIds: shareStudentIds,
      recipients: form.recipients,
      caption: form.caption,
    };
  }, [form, selectedClass, students, uploadTarget, user?.schoolId, user?.schoolName]);

  const applyPickedFiles = useCallback(async (fileList) => {
    const picked = Array.from(fileList || []).filter(isAcceptedMediaFile);
    if (picked.length < (fileList?.length || 0)) {
      toast('Some files were skipped. Use images (JPG, PNG, WebP) or videos (MP4, MOV, WebM).', 'warning');
    }
    const sizeCheck = validateMediaUploadFiles(picked, uploadLimits || {});
    if (!sizeCheck.valid) {
      toast(sizeCheck.error, 'error');
      return;
    }

    setIsAddingFiles(true);
    try {
      await probeUploadBandwidth();
      const tuning = getUploadTuning();
      const prepared = await prepareFilesForUpload(sizeCheck.files, {
        quality: tuning.compressionQuality,
        maxWidth: tuning.maxWidth,
        maxHeight: tuning.maxHeight,
        targetMaxBytes: tuning.targetMaxBytes,
      });
      const compressedCount = prepared.filter((f, i) => f.size < sizeCheck.files[i].size).length;
      const { added, skipped, skippedDueToLimit } = await classroomUploadManager.addFiles(prepared, {
        originEndpoint: UPLOAD_ENDPOINT.TEACHER,
      });
      if (added) {
        toast(
          compressedCount
            ? `${added} file${added === 1 ? '' : 's'} added (${compressedCount} photo${compressedCount === 1 ? '' : 's'} optimized for faster upload)`
            : `${added} file${added === 1 ? '' : 's'} added to upload queue`,
          'success',
        );
      }
      if (skipped) toast(`${skipped} file${skipped === 1 ? '' : 's'} already in queue`, 'warning');
      if (skippedDueToLimit) {
        toast(`Queue limit (${MAX_UPLOAD_QUEUE}) reached — ${skippedDueToLimit} file(s) not added`, 'error');
      }
    } finally {
      setIsAddingFiles(false);
    }
  }, [toast, uploadLimits]);

  const onFilesChange = (e) => {
    applyPickedFiles(e.target.files);
    e.target.value = '';
  };

  const onFilesDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    applyPickedFiles(e.dataTransfer.files);
  };

  const revokeThumbnail = useCallback((id) => {
    setThumbnailUrls((prev) => {
      const url = prev.get(id);
      if (!url) return prev;
      URL.revokeObjectURL(url);
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const cancelUpload = useCallback(async (id) => {
    revokeThumbnail(id);
    await classroomUploadManager.cancel(id);
    toast('Upload cancelled.', 'warning');
  }, [toast, revokeThumbnail]);

  const cancelAllUploads = useCallback(async () => {
    const activeIds = teacherQueueItems
      .filter((i) => i.status === 'uploading' || i.status === 'waiting' || i.status === 'paused')
      .map((i) => i.id);
    activeIds.forEach((id) => revokeThumbnail(id));
    await classroomUploadManager.cancelAllActive({ scopeEndpoint: UPLOAD_ENDPOINT.TEACHER });
    toast('All uploads cancelled.', 'warning');
  }, [toast, revokeThumbnail, teacherQueueItems]);

  const removeFromQueue = useCallback(async (id) => {
    revokeThumbnail(id);
    await classroomUploadManager.remove(id);
  }, [revokeThumbnail]);

  const retryUpload = useCallback(async (id) => {
    await classroomUploadManager.retry(id);
  }, []);

  const handleClearFinished = useCallback(async () => {
    const removedIds = await classroomUploadManager.clearFinished({
      scopeEndpoint: UPLOAD_ENDPOINT.TEACHER,
    });
    removedIds.forEach((id) => revokeThumbnail(id));
  }, [revokeThumbnail]);

  const validate = () => {
    if (needsClass && !form.classId) {
      toast('Please select a class.', 'warning');
      return false;
    }
    if (uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT && form.studentIds.length === 0) {
      toast('Please select a student.', 'warning');
      return false;
    }
    if (uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT
      && form.recipients !== 'class' && form.studentIds.length === 0) {
      toast('Please select at least one student.', 'warning');
      return false;
    }
    if (pendingQueueItems.length === 0) {
      toast('Please choose at least one image or video.', 'warning');
      return false;
    }
    for (const item of pendingQueueItems) {
      const sizeCheck = validateMediaUploadFile(item.file, uploadLimits || {});
      if (!sizeCheck.valid) {
        toast(sizeCheck.error, 'error');
        return false;
      }
    }
    return true;
  };

  // Show success toast when a batch finishes (all items completed, none uploading)
  useEffect(() => {
    const hasWaiting = teacherQueueItems.some(
      (i) => i.status === 'waiting' || i.status === 'uploading' || i.status === 'paused',
    );
    const allDone = teacherQueueItems.length > 0
      && teacherQueueItems.every((i) => i.status === 'completed' || i.status === 'failed');
    if (hasWaiting || !allDone) {
      batchSuccessShownRef.current = false;
      return;
    }
    if (batchSuccessShownRef.current) return;
    if (completedCount > 0 && failedCount === 0) {
      batchSuccessShownRef.current = true;
      toast(SUCCESS_MESSAGES[uploadTarget], 'success');
      const uploadedClassId = form.classId;
      setForm({
        classId: uploadedClassId,
        recipients: 'class',
        studentIds: [],
        caption: '',
      });
    }
  }, [queueStatusKey, completedCount, failedCount, form.classId, toast, uploadTarget, teacherQueueItems]);

  const handleSend = async () => {
    setShowConfirm(false);
    batchSuccessShownRef.current = false;
    try {
      const uploadParams = buildUploadParams();
      const count = await classroomUploadManager.submitPending(uploadParams, {
        scopeEndpoint: UPLOAD_ENDPOINT.TEACHER,
      });
      if (count === 0) {
        toast('No files waiting to upload.', 'warning');
      }
    } catch (err) {
      toast(resolveMediaUploadError(err, uploadLimits || {}), 'error');
    }
  };

  const overallProgressPct = teacherQueueItems.length
    ? Math.round((completedCount / teacherQueueItems.length) * 100)
    : 0;

  const queueProgressKey = useMemo(
    () => teacherQueueItems.map((i) => `${i.id}:${i.progress}:${i.bytesLoaded ?? 0}`).join('|'),
    [teacherQueueItems],
  );

  const batchSpeedLabel = useMemo(
    () => getBatchUploadSpeedLabel(teacherQueueItems),
    [teacherQueueItems, queueProgressKey],
  );

  const finishedCount = completedCount + failedCount;
  const remainingCount = teacherQueueItems.filter((i) => i.status !== 'completed').length;

  return (
    <DashboardLayout>
      <div className="send-photos-page">
        <div className="send-photos-layout">
          <header className="send-photos-intro">
            <div className="send-photos-intro__icon" aria-hidden>
              <Camera size={22} />
            </div>
            <div className="send-photos-intro__text">
              <h1>Share Classroom Media</h1>
              <p>Upload to a class album for TV playback, send directly to parents, or both. Photos and videos are supported.</p>
              <Link to={classAlbumHref} className="send-photos-album-link">
                View &amp; manage your class album uploads
                <ArrowRight size={15} />
              </Link>
            </div>
            <div className="send-photos-online-badge" aria-live="polite">
              {queueState.isOnline ? (
                <>
                  <Wifi size={14} aria-hidden />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} aria-hidden />
                  <span>Offline — uploads paused</span>
                </>
              )}
            </div>
          </header>

          <div className="send-photos-card">
            <span className="send-photos-card__label">Upload target</span>
            <div className="send-photos-target-list" role="group" aria-label="Upload target">
              {UPLOAD_TARGET_OPTIONS.map(({ value, label, hint, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`send-photos-target-option${uploadTarget === value ? ' is-selected' : ''}`}
                  onClick={() => setUploadTarget(value)}
                  aria-pressed={uploadTarget === value}
                  disabled={isUploading}
                >
                  <span className="send-photos-target-option__icon" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <span className="send-photos-target-option__text">
                    <strong>{label}</strong>
                    <span className="send-photos-target-option__hint">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
            {(uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT || uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT) && (
              <div className="send-photos-privacy-warning">
                <ShieldAlert size={18} className="send-photos-privacy-warning__icon" aria-hidden />
                <p>
                  <strong>Privacy reminder:</strong> Parent-direct photos are visible only to authorized guardians.
                  Confirm you have consent before sharing identifiable student images.
                </p>
              </div>
            )}
          </div>

          <div className="send-photos-card">
            <span className="send-photos-card__label">
              {needsClass ? 'Class' : 'Student'}
            </span>

            {needsClass && (
              activeAlbumClasses.length === 0 ? (
                <p className="send-photos-classes-empty">No classes assigned yet.</p>
              ) : (
                <div className="send-photos-classes">
                  {activeAlbumClasses.map((cls) => (
                    <button
                      key={cls.classId}
                      type="button"
                      className={`send-photos-class-chip ${form.classId === cls.classId ? 'is-selected' : ''}`}
                      onClick={() => setForm({ ...form, classId: cls.classId, studentIds: [] })}
                      disabled={isUploading}
                    >
                      <span className="send-photos-class-chip__name">{cls.className}</span>
                      {cls.album?.albumCode && (
                        <span className="send-photos-class-chip__meta">{cls.album.albumCode}</span>
                      )}
                    </button>
                  ))}
                </div>
              )
            )}

            {needsStudent && form.classId && uploadTarget !== UPLOAD_TARGETS.CLASS_ALBUM && (
              <div className="send-photos-recipients">
                {uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT && (
                  <>
                    <span className="send-photos-card__label" style={{ marginBottom: 0 }}>Share with</span>
                    <div className="send-photos-pills">
                      {SEND_TYPES.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          className={`send-photos-pill ${form.recipients === value ? 'is-active' : ''}`}
                          onClick={() => setForm({ ...form, recipients: value, studentIds: [] })}
                          disabled={isUploading}
                        >
                          <Icon size={15} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {(uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT || form.recipients !== 'class') && (
                  <div className="send-photos-student-grid">
                    {students.map((s) => (
                      <label
                        key={s.id}
                        className={`send-photos-student-chip ${form.studentIds.includes(s.id) ? 'is-selected' : ''}`}
                      >
                        <input
                          type={uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT ? 'radio' : 'checkbox'}
                          name="student"
                          checked={form.studentIds.includes(s.id)}
                          disabled={isUploading}
                          onChange={() => setForm({
                            ...form,
                            studentIds: uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT
                              ? [s.id]
                              : (form.studentIds.includes(s.id)
                                ? form.studentIds.filter((id) => id !== s.id)
                                : [...form.studentIds, s.id]),
                          })}
                        />
                        <div className="send-photos-student-chip__text">
                          <strong>{s.name}</strong>
                          <span>{s.parentName}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="send-photos-card send-photos-upload-card send-photos-form">
            <span className="send-photos-card__label">Media &amp; caption</span>
            <div
              className={`file-upload${dragOver ? ' dragover' : ''}${pendingQueueItems.length > 0 ? ' file-upload--has-files' : ''}`}
              onClick={() => !isAddingFiles && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onFilesDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Choose photos or videos to upload"
            >
              <div className="file-upload-icon" aria-hidden>
                <Upload size={28} />
              </div>
              <div className="file-upload-text">
                {pendingQueueItems.length > 0
                  ? `${pendingQueueItems.length} file${pendingQueueItems.length === 1 ? '' : 's'} in queue — tap to add more`
                  : 'Tap to browse or drag photos & videos here'}
              </div>
              <div className="file-upload-hint">
                JPG, PNG, WebP, MP4, MOV, WebM
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MEDIA}
                multiple
                hidden
                disabled={isAddingFiles}
                onChange={onFilesChange}
              />
            </div>
            {pendingQueueItems.length > 0 && (
              <div className="send-photos-file-preview" aria-label="Files in upload queue">
                {pendingQueueItems.map((item) => {
                  const previewUrl = thumbnailUrls.get(item.id) ?? null;
                  const isVideo = isVideoQueueItem(item);
                  return (
                    <div key={item.id} className="send-photos-file-preview__item">
                      {previewUrl && isVideo ? (
                        <video
                          src={previewUrl}
                          className="send-photos-file-preview__video"
                          muted
                          playsInline
                          preload="metadata"
                          aria-label={item.fileName}
                        />
                      ) : previewUrl ? (
                        <img
                          src={previewUrl}
                          alt=""
                          className="send-photos-file-preview__thumb"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="send-photos-file-preview__video" aria-hidden>
                          {isVideo ? 'Video' : 'File'}
                        </div>
                      )}
                      <span className="send-photos-file-preview__name" title={item.fileName}>
                        {item.fileName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="send-photos-upload-limit-hint">{uploadLimitHint}</p>
            <div className="form-field full">
              <label className="form-label" htmlFor="photo-caption">Caption</label>
              <textarea
                id="photo-caption"
                className="form-textarea"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="What happened in class today?"
                rows={3}
                disabled={isUploading}
              />
            </div>
          </div>

          {teacherQueueItems.length > 0 && (
            <div ref={queueListRef}>
              <ClassroomUploadQueuePanel
                items={teacherQueueItems}
                thumbnailUrls={thumbnailUrls}
                hasActiveBatch={hasActiveBatch}
                remainingCount={remainingCount}
                finishedCount={finishedCount}
                onCancel={cancelUpload}
                onCancelAll={cancelAllUploads}
                onRemove={removeFromQueue}
                onRetry={retryUpload}
                onClearFinished={() => { void handleClearFinished(); }}
              />
            </div>
          )}

          <footer className="send-photos-footer">
            <div className="send-photos-footer__left">
              <p className="send-photos-footer__hint">
                Ready to share? <strong>{footerHint}</strong>
              </p>
              {teacherQueueItems.length > 0 && (
                <div className="send-photos-footer__progress">
                  <div className="send-photos-footer__progress-bar">
                    <div
                      className="send-photos-footer__progress-fill"
                      style={{ width: `${overallProgressPct}%` }}
                    />
                  </div>
                  <span className="send-photos-footer__progress-label">
                    {completedCount} of {teacherQueueItems.length} uploaded
                  </span>
                  {batchSpeedLabel && isUploading && (
                    <span className="send-photos-footer__speed">{batchSpeedLabel}</span>
                  )}
                </div>
              )}
            </div>
            <div className="send-photos-footer__actions">
              {hasActiveBatch && (
                <button
                  type="button"
                  className="send-photos-cancel"
                  onClick={cancelAllUploads}
                >
                  Cancel uploads
                </button>
              )}
              <button
                type="button"
                className="send-photos-submit"
                onClick={() => { if (validate()) setShowConfirm(true); }}
                disabled={isUploading || isAddingFiles || pendingQueueItems.length === 0}
              >
                <Send size={17} />
                {isUploading ? 'Uploading…' : 'Preview & Send'}
              </button>
            </div>
          </footer>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSend}
        title="Upload media?"
        message={`This will upload ${pendingQueueItems.length} file(s) using the selected target.`}
        confirmText="Upload"
        loading={false}
      />
    </DashboardLayout>
  );
}
