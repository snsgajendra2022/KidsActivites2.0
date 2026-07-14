import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tv, Copy, RefreshCw, Archive, Eye, Play, FolderOpen, Plus, ImageIcon } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PhotoLightbox from '../../components/media/PhotoLightbox.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ApiError } from '../../services/api/client.js';
import {
  backfillAlbums,
  createAdminAlbum,
  getAdminAlbum,
  listAdminAlbums,
  regenerateAlbumCode,
  updateAdminAlbum,
  updateAlbumMedia,
} from '../../services/classAlbumService.js';
import defaultAlbumCover from '../../assets/default-album-cover.png';
import { toLightboxMedia } from '../../utils/toLightboxMedia.js';
import '../../styles/admin-albums.css';

function toLightboxPhoto(item, albumDetail) {
  return toLightboxMedia(item, {
    className: albumDetail?.className,
    schoolName: albumDetail?.schoolName,
  });
}

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
  if (item.isReadyForTv && item.approvalStatus === 'APPROVED') return 'Ready for TV';
  if (item.mediaType === 'VIDEO') return 'Processing';
  if (!item.isReadyForTv) return 'Waiting for variants';
  if (item.approvalStatus === 'PENDING') return 'Pending approval';
  return 'Processing';
}

function albumTypeLabel(album) {
  return album?.albumType === 'CUSTOM' ? 'School album' : 'Class album';
}

function albumScopeLabel(album) {
  if (album?.className) return album.className;
  return albumTypeLabel(album);
}

function AlbumStatusPill({ playbackEnabled, status }) {
  if (status === 'ARCHIVED') {
    return <span className="admin-media-pill admin-media-pill--muted">Archived</span>;
  }
  if (playbackEnabled) {
    return <span className="admin-media-pill admin-media-pill--success">TV On</span>;
  }
  return <span className="admin-media-pill admin-media-pill--default">TV Off</span>;
}

function TvMediaPill({ item }) {
  if (item.isReadyForTv && item.approvalStatus === 'APPROVED') {
    return <span className="admin-media-pill admin-media-pill--success">Ready for TV</span>;
  }
  if (item.approvalStatus === 'PENDING') {
    return <span className="admin-media-pill admin-media-pill--warning">Pending approval</span>;
  }
  if (item.mediaType === 'VIDEO') {
    return <span className="admin-media-pill admin-media-pill--info">Processing video</span>;
  }
  return <span className="admin-media-pill admin-media-pill--default">{tvStatusBadge(item)}</span>;
}

export default function AdminAlbums() {
  const { toast } = useToast();
  const [albums, setAlbums] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminAlbums();
      setAlbums(data || []);
    } catch (err) {
      toast(err?.message || 'Failed to load albums.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAlbums(); }, [loadAlbums]);

  const openDetail = async (albumId) => {
    setSelectedId(albumId);
    setLightboxIndex(-1);
    try {
      const data = await getAdminAlbum(albumId);
      setDetail(data);
    } catch (err) {
      toast(err?.message || 'Failed to load album.', 'error');
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setSelectedId(null);
    setLightboxIndex(-1);
  };

  const lightboxPhotos = useMemo(
    () => (detail?.media || []).map((item) => toLightboxPhoto(item, detail)),
    [detail],
  );
  const lightboxPhoto = lightboxIndex >= 0 ? lightboxPhotos[lightboxIndex] : null;

  const stats = useMemo(() => ({
    total: albums.length,
    classAlbums: albums.filter((a) => a.albumType !== 'CUSTOM').length,
    customAlbums: albums.filter((a) => a.albumType === 'CUSTOM').length,
    tvOn: albums.filter((a) => a.playbackEnabled).length,
    media: albums.reduce((sum, a) => sum + (a.mediaCount || 0), 0),
  }), [albums]);

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast('Album code copied.', 'success');
    } catch {
      toast('Could not copy code.', 'error');
    }
  };

  const togglePlayback = async (album) => {
    try {
      await updateAdminAlbum(album.id, { playbackEnabled: !album.playbackEnabled });
      toast('Playback setting updated.', 'success');
      loadAlbums();
      if (selectedId === album.id) openDetail(album.id);
    } catch (err) {
      toast(err?.message || 'Update failed.', 'error');
    }
  };

  const handleRegenerate = async (albumId) => {
    try {
      const updated = await regenerateAlbumCode(albumId);
      toast('Album code regenerated.', 'success');
      loadAlbums();
      setDetail(updated);
    } catch (err) {
      toast(err?.message || 'Regenerate failed.', 'error');
    }
  };

  const handleArchive = async (album) => {
    try {
      await updateAdminAlbum(album.id, { status: 'ARCHIVED' });
      toast('Album archived.', 'success');
      loadAlbums();
      setDetail(null);
      setSelectedId(null);
    } catch (err) {
      toast(err?.message || 'Archive failed.', 'error');
    }
  };

  const handleBackfill = async () => {
    try {
      const result = await backfillAlbums();
      toast(`Created ${result.created} album(s).`, 'success');
      loadAlbums();
    } catch (err) {
      toast(err?.message || 'Backfill failed.', 'error');
    }
  };

  const handleCreateAlbum = async () => {
    const name = createName.trim();
    if (!name) {
      toast('Album name is required.', 'warning');
      return;
    }
    setCreating(true);
    try {
      const created = await createAdminAlbum({
        albumName: name,
        description: createDescription.trim() || undefined,
      });
      toast('Album created.', 'success');
      setCreateOpen(false);
      setCreateName('');
      setCreateDescription('');
      await loadAlbums();
      openDetail(created.id);
    } catch (err) {
      toast(err?.message || 'Create failed.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggleShowOnTv = async (mediaItem) => {
    if (!detail?.id) return;
    const enabling = !mediaItem.showOnTv;
    if (enabling && !mediaItem.canShowOnTv) {
      toast(tvBlockLabel(mediaItem, detail), 'warning');
      return;
    }
    try {
      await updateAlbumMedia(detail.id, mediaItem.id, { showOnTv: enabling });
      toast(enabling ? 'Media enabled for TV.' : 'Media removed from TV.', 'success');
      openDetail(detail.id);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'MEDIA_NOT_READY_FOR_TV') {
        toast(err.message, 'error');
      } else {
        toast(err?.message || 'Update failed.', 'error');
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="admin-albums-page">
        <PageHeader
          title="Albums"
          subtitle="Manage class and school-wide albums, TV codes, and playback."
          icon={Tv}
          actions={(
            <>
              <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Create Album
              </Button>
              <Button type="button" variant="secondary" onClick={handleBackfill}>
                <RefreshCw size={16} />
                Backfill Class Albums
              </Button>
            </>
          )}
        />

        {!loading && (
          <div className="admin-media-stats">
            <div className="admin-media-stat">
              <span className="admin-media-stat__value">{stats.total}</span>
              <span className="admin-media-stat__label">Albums</span>
            </div>
            <div className="admin-media-stat">
              <span className="admin-media-stat__value">{stats.classAlbums}</span>
              <span className="admin-media-stat__label">Class albums</span>
            </div>
            <div className="admin-media-stat">
              <span className="admin-media-stat__value">{stats.customAlbums}</span>
              <span className="admin-media-stat__label">School albums</span>
            </div>
            <div className="admin-media-stat">
              <span className="admin-media-stat__value">{stats.tvOn}</span>
              <span className="admin-media-stat__label">TV enabled</span>
            </div>
            <div className="admin-media-stat">
              <span className="admin-media-stat__value">{stats.media}</span>
              <span className="admin-media-stat__label">Total media</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="admin-albums-skeleton-grid" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="admin-media-skeleton admin-media-skeleton--card" />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="admin-media-empty">
            <FolderOpen size={32} strokeWidth={1.5} />
            <h2>No albums yet</h2>
            <p>Create a school-wide album or backfill class albums, then manage TV codes and playback here.</p>
            <div className="admin-albums-empty-actions">
              <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Create Album
              </Button>
              <Button type="button" variant="secondary" onClick={handleBackfill}>
                <RefreshCw size={16} />
                Backfill Class Albums
              </Button>
            </div>
          </div>
        ) : (
          <div className="admin-albums-list">
              <div className="admin-albums-cards">
                {albums.map((album) => {
                  const cover =
                    album.coverImageUrl || album.coverUrl || album.thumbnailUrl || defaultAlbumCover;
                  return (
                    <article
                      key={album.id}
                      className={`admin-album-card${selectedId === album.id ? ' admin-album-card--active' : ''}`}
                    >
                      <button
                        type="button"
                        className="admin-album-card__cover"
                        onClick={() => openDetail(album.id)}
                        aria-label={`View ${album.albumName}`}
                      >
                        <img
                          src={cover}
                          alt=""
                          loading="lazy"
                          onError={(e) => { e.currentTarget.src = defaultAlbumCover; }}
                        />
                        <span className="admin-album-card__type-chip">{albumTypeLabel(album)}</span>
                        <span className="admin-album-card__tv">
                          <AlbumStatusPill playbackEnabled={album.playbackEnabled} status={album.status} />
                        </span>
                        <span className="admin-album-card__count">
                          <ImageIcon size={12} /> {album.mediaCount}
                        </span>
                      </button>
                      <div className="admin-album-card__body">
                        <h3 className="admin-album-card__name" title={album.albumName}>{album.albumName}</h3>
                        {album.className && (
                          <p className="admin-album-card__scope">{album.className}</p>
                        )}
                        <div className="admin-album-card__code">
                          <code>{album.albumCode}</code>
                          <button
                            type="button"
                            className="admin-albums-icon-btn"
                            onClick={() => copyCode(album.albumCode)}
                            aria-label="Copy album code"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="admin-album-card__footer">
                        <button type="button" className="admin-albums-link" onClick={() => openDetail(album.id)}>
                          <Eye size={14} /> View album
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={closeDetail}
        size="xl"
        title={detail ? detail.albumName : 'Album'}
      >
        {detail && (
          <div className="admin-albums-detail">
            <p className="admin-albums-detail__meta">
              {albumScopeLabel(detail)} · <code>{detail.albumCode}</code>
            </p>
            <div className="admin-albums-detail__actions">
              <Button type="button" variant="secondary" onClick={() => copyCode(detail.albumCode)}>
                <Copy size={16} /> Copy Code
              </Button>
              <Button type="button" variant="secondary" onClick={() => togglePlayback(detail)}>
                TV: {detail.playbackEnabled ? 'On' : 'Off'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => handleRegenerate(detail.id)}>
                <RefreshCw size={16} /> Regenerate Code
              </Button>
              <Button type="button" variant="secondary" onClick={() => handleArchive(detail)}>
                <Archive size={16} /> Archive
              </Button>
            </div>
            {(detail.media || []).length === 0 ? (
              <div className="admin-albums-detail__empty">
                <FolderOpen size={26} strokeWidth={1.5} />
                <p>No media in this album yet.</p>
              </div>
            ) : (
              <div className="admin-albums-media-grid">
                {(detail.media || []).map((item, index) => (
                  <article key={item.id} className="admin-albums-media-card">
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
                    <p className="admin-albums-media-card__title">{item.caption || item.fileName || 'Media'}</p>
                    <TvMediaPill item={item} />
                    <button
                      type="button"
                      className={`admin-albums-tv-toggle${item.showOnTv ? ' is-on' : ''}`}
                      onClick={() => toggleShowOnTv(item)}
                      disabled={!item.showOnTv && !item.canShowOnTv}
                      title={!item.canShowOnTv && !item.showOnTv ? tvBlockLabel(item, detail) : undefined}
                    >
                      <Tv size={14} />
                      TV: {item.showOnTv ? 'On' : 'Off'}
                    </button>
                    {!item.canShowOnTv && !item.showOnTv && (
                      <p className="admin-albums-media-card__hint">{tvBlockLabel(item, detail)}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="Create school album"
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleCreateAlbum} loading={creating}>
              Create Album
            </Button>
          </>
        )}
      >
        <div className="admin-albums-create-form">
          <label className="admin-albums-create-form__field">
            <span>Album name</span>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Annual Day 2026"
              maxLength={255}
              disabled={creating}
            />
          </label>
          <label className="admin-albums-create-form__field">
            <span>Description (optional)</span>
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Event or purpose for this album"
              rows={3}
              disabled={creating}
            />
          </label>
        </div>
      </Modal>

      <PhotoLightbox
        photo={lightboxPhoto}
        photos={lightboxPhotos}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(-1)}
        onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
        onNext={() => setLightboxIndex((i) => Math.min(lightboxPhotos.length - 1, i + 1))}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex >= 0 && lightboxIndex < lightboxPhotos.length - 1}
      />
    </DashboardLayout>
  );
}
