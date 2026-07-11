import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Tv, Play, Eye, Trash2, Upload } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import PhotoLightbox from '../../components/media/PhotoLightbox.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { ApiError } from '../../services/api/client.js';
import {
  getTeacherAlbumClasses,
  getTeacherAlbumByClass,
  updateTeacherAlbumMedia,
  deleteTeacherAlbumMedia,
} from '../../services/classAlbumService.js';
import { resolveVideoStreamUrl } from '../../utils/photoStudioProgressive.js';
import '../../styles/admin-albums.css';
import '../../styles/teacher-class-album.css';

function tvBlockLabel(item, albumDetail) {
  if (!albumDetail?.playbackEnabled) return 'Album playback disabled';
  if (item.approvalStatus !== 'APPROVED') return 'Approval required';
  if (item.tvBlockReason) {
    if (item.tvBlockReason.includes('variant')) return 'Waiting for image variants';
    if (item.tvBlockReason.includes('Video')) return 'Video processing';
    return item.tvBlockReason;
  }
  return 'Not ready for TV';
}

function tvStatusBadge(item) {
  if (item.showOnTv && item.isReadyForTv && item.approvalStatus === 'APPROVED') return 'On TV';
  if (item.isReadyForTv && item.approvalStatus === 'APPROVED') return 'Ready for TV';
  if (item.mediaType === 'VIDEO') return 'Processing';
  if (item.approvalStatus === 'PENDING') return 'Pending approval';
  if (!item.isReadyForTv) return 'Waiting for variants';
  return 'Processing';
}

function toLightboxPhoto(item, albumDetail) {
  return {
    id: item.id,
    mediaType: item.mediaType,
    caption: item.caption || item.fileName,
    className: albumDetail?.className,
    thumbnailUrl: item.thumbnailUrl,
    previewUrl: item.previewUrl || item.imageUrl,
    streamUrl: resolveVideoStreamUrl(item),
    renditions: item.renditions,
    processingStatus: item.processingStatus,
    status: item.status,
  };
}

export default function TeacherClassAlbum() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [searchParams, setSearchParams] = useSearchParams();
  const [albumClasses, setAlbumClasses] = useState([]);
  const [classId, setClassId] = useState(() => searchParams.get('class') || '');
  const [albumDetail, setAlbumDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [mediaActionId, setMediaActionId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeClasses = useMemo(
    () => albumClasses.filter(
      (c) => !c.classStatus || c.classStatus.toLowerCase() === 'active',
    ),
    [albumClasses],
  );

  const myUploads = useMemo(
    () => (albumDetail?.media || []).filter((item) => item.uploadedBy === user?.id),
    [albumDetail?.media, user?.id],
  );

  const lightboxPhotos = useMemo(
    () => myUploads.map((item) => toLightboxPhoto(item, albumDetail)),
    [myUploads, albumDetail],
  );

  const loadAlbum = useCallback(async (nextClassId) => {
    if (!nextClassId) {
      setAlbumDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getTeacherAlbumByClass(nextClassId);
      setAlbumDetail(data);
    } catch {
      setAlbumDetail(null);
      toast('Could not load class album.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    getTeacherAlbumClasses()
      .then((classes) => {
        setAlbumClasses(classes);
        const fromUrl = searchParams.get('class');
        const initial = fromUrl && classes.some((c) => c.classId === fromUrl)
          ? fromUrl
          : (classes.find((c) => !c.classStatus || c.classStatus.toLowerCase() === 'active')?.classId || '');
        setClassId(initial);
        if (initial) loadAlbum(initial);
        else setLoading(false);
      })
      .catch(() => {
        setAlbumClasses([]);
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectClass = (nextClassId) => {
    setClassId(nextClassId);
    setLightboxIndex(-1);
    if (nextClassId) {
      setSearchParams({ class: nextClassId }, { replace: true });
      loadAlbum(nextClassId);
    } else {
      setSearchParams({}, { replace: true });
      setAlbumDetail(null);
    }
  };

  const toggleShowOnTv = async (item) => {
    if (!classId) return;
    const enabling = !item.showOnTv;
    if (enabling && !item.canShowOnTv) {
      toast(tvBlockLabel(item, albumDetail), 'warning');
      return;
    }
    setMediaActionId(item.id);
    try {
      await updateTeacherAlbumMedia(classId, item.id, { showOnTv: enabling });
      toast(enabling ? 'Media enabled for TV.' : 'Media removed from TV.', 'success');
      await loadAlbum(classId);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'MEDIA_NOT_READY_FOR_TV') {
        toast(err.message, 'error');
      } else {
        toast(err?.message || 'Update failed.', 'error');
      }
    } finally {
      setMediaActionId(null);
    }
  };

  const handleDeleteMedia = async () => {
    if (!deleteTarget || !classId) return;
    setMediaActionId(deleteTarget.id);
    try {
      await deleteTeacherAlbumMedia(classId, deleteTarget.id);
      toast('Media removed from class album.', 'success');
      setDeleteTarget(null);
      setLightboxIndex(-1);
      await loadAlbum(classId);
    } catch (err) {
      toast(err?.message || 'Delete failed.', 'error');
    } finally {
      setMediaActionId(null);
    }
  };

  const selectedClass = activeClasses.find((c) => c.classId === classId);
  const uploadHref = classId
    ? `${tenantPath('/teacher/photos')}?class=${encodeURIComponent(classId)}`
    : tenantPath('/teacher/photos');

  return (
    <DashboardLayout>
      <div className="teacher-class-album-page">
        <PageHeader
          title="Class Album"
          subtitle="Browse photos and videos you shared to the class album. Toggle TV playback or remove items."
          actions={(
            <Link to={uploadHref}>
              <Button type="button" variant="primary">
                <Upload size={16} />
                Upload media
              </Button>
            </Link>
          )}
        />

        {activeClasses.length === 0 && !loading ? (
          <p className="teacher-class-album-empty">No classes assigned yet.</p>
        ) : (
          <>
            <div className="teacher-class-album-classes">
              {activeClasses.map((cls) => (
                <button
                  key={cls.classId}
                  type="button"
                  className={`teacher-class-album-class ${classId === cls.classId ? 'is-selected' : ''}`}
                  onClick={() => selectClass(cls.classId)}
                >
                  <span>{cls.className}</span>
                  {cls.album?.albumCode && <small>{cls.album.albumCode}</small>}
                </button>
              ))}
            </div>

            {albumDetail && (
              <p className="teacher-class-album-meta">
                {selectedClass?.className} · Album code <code>{albumDetail.albumCode}</code>
                {' · '}TV playback {albumDetail.playbackEnabled ? 'enabled' : 'disabled'}
              </p>
            )}

            {loading ? (
              <p className="teacher-class-album-empty">Loading album…</p>
            ) : myUploads.length === 0 ? (
              <div className="teacher-class-album-empty-state">
                <p>No uploads from you in this class album yet.</p>
                <Link to={uploadHref} className="teacher-class-album-empty-link">
                  Upload classroom media
                </Link>
              </div>
            ) : (
              <div className="admin-albums-media-grid teacher-class-album-grid">
                {myUploads.map((item, index) => (
                  <article key={item.id} className="admin-albums-media-card teacher-class-album-card">
                    <button
                      type="button"
                      className="admin-albums-media-card__preview"
                      onClick={() => setLightboxIndex(index)}
                      aria-label={`View ${item.caption || item.fileName || 'media'}`}
                    >
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" />
                      ) : (
                        <div className="admin-albums-media-card__placeholder">
                          {item.mediaType === 'VIDEO' ? <Play size={24} /> : <Eye size={24} />}
                        </div>
                      )}
                      {item.mediaType === 'VIDEO' && (
                        <span className="admin-albums-media-card__badge" aria-hidden>
                          <Play size={12} />
                        </span>
                      )}
                    </button>
                    <p>{item.caption || item.fileName || 'Media'}</p>
                    <span className="admin-albums-media-card__status">{tvStatusBadge(item)}</span>
                    <div className="teacher-class-album-card__actions">
                      <button
                        type="button"
                        onClick={() => toggleShowOnTv(item)}
                        disabled={mediaActionId === item.id || (!item.showOnTv && !item.canShowOnTv)}
                        title={!item.canShowOnTv && !item.showOnTv ? tvBlockLabel(item, albumDetail) : undefined}
                      >
                        <Tv size={14} />
                        TV: {item.showOnTv ? 'On' : 'Off'}
                      </button>
                      <button
                        type="button"
                        className="teacher-class-album-card__delete"
                        onClick={() => setDeleteTarget(item)}
                        disabled={mediaActionId === item.id}
                        aria-label="Remove from album"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                    {!item.canShowOnTv && !item.showOnTv && (
                      <p className="admin-albums-media-card__hint">{tvBlockLabel(item, albumDetail)}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <PhotoLightbox
        photo={lightboxPhotos[lightboxIndex] || null}
        onClose={() => setLightboxIndex(-1)}
        onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
        onNext={() => setLightboxIndex((i) => Math.min(lightboxPhotos.length - 1, i + 1))}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex >= 0 && lightboxIndex < lightboxPhotos.length - 1}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteMedia}
        title="Remove from album?"
        message="This removes the media from the class album and TV playback. It cannot be undone."
        confirmText="Remove"
        loading={Boolean(mediaActionId)}
      />
    </DashboardLayout>
  );
}
