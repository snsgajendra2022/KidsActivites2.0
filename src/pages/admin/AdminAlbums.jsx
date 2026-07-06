import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tv, Copy, RefreshCw, Archive, Eye, Play, X, FolderOpen } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import PhotoLightbox from '../../components/media/PhotoLightbox.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ApiError } from '../../services/api/client.js';
import {
  backfillAlbums,
  getAdminAlbum,
  listAdminAlbums,
  regenerateAlbumCode,
  updateAdminAlbum,
  updateAlbumMedia,
} from '../../services/classAlbumService.js';
import '../../styles/admin-albums.css';

function toLightboxPhoto(item, albumDetail) {
  return {
    id: item.id,
    mediaType: item.mediaType,
    caption: item.caption || item.fileName,
    className: albumDetail?.className,
    thumbnailUrl: item.thumbnailUrl,
    previewUrl: item.previewUrl || item.imageUrl,
    streamUrl: item.streamUrl || item.playbackUrl,
    renditions: item.renditions,
    processingStatus: item.processingStatus,
    status: item.status,
  };
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

  const lightboxPhotos = useMemo(
    () => (detail?.media || []).map((item) => toLightboxPhoto(item, detail)),
    [detail],
  );
  const lightboxPhoto = lightboxIndex >= 0 ? lightboxPhotos[lightboxIndex] : null;

  const stats = useMemo(() => ({
    total: albums.length,
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
          title="Class Albums"
          subtitle="Manage class albums and TV playback codes."
          icon={Tv}
          actions={(
            <Button type="button" variant="secondary" onClick={handleBackfill}>
              <RefreshCw size={16} />
              Backfill Albums
            </Button>
          )}
        />

        {!loading && (
          <div className="admin-media-stats">
            <div className="admin-media-stat">
              <span className="admin-media-stat__value">{stats.total}</span>
              <span className="admin-media-stat__label">Albums</span>
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
            <h2>No class albums yet</h2>
            <p>Create albums for your classes using Backfill Albums, then manage TV codes and playback here.</p>
            <Button type="button" variant="primary" onClick={handleBackfill}>
              <RefreshCw size={16} />
              Backfill Albums
            </Button>
          </div>
        ) : (
          <div className="admin-albums-layout">
            <div className="admin-albums-list premium-card">
              <div className="sb-mobile-only sb-mobile-card-list">
                {albums.map((album) => (
                  <article key={album.id} className="sb-mobile-data-card admin-albums-mobile-card">
                    <h3 className="sb-mobile-data-card__title">{album.albumName}</h3>
                    <div className="sb-mobile-data-card__row">
                      <span className="sb-mobile-data-card__label">Class</span>
                      <span className="sb-mobile-data-card__value">{album.className}</span>
                    </div>
                    <div className="sb-mobile-data-card__row">
                      <span className="sb-mobile-data-card__label">Code</span>
                      <span className="sb-mobile-data-card__value"><code>{album.albumCode}</code></span>
                    </div>
                    <div className="sb-mobile-data-card__row">
                      <span className="sb-mobile-data-card__label">TV / Media</span>
                      <span className="sb-mobile-data-card__value">
                        {album.playbackEnabled ? 'On' : 'Off'} · {album.mediaCount}
                      </span>
                    </div>
                    <div className="sb-mobile-data-card__row">
                      <span className="sb-mobile-data-card__label">Status</span>
                      <span className="sb-mobile-data-card__value">
                        <AlbumStatusPill playbackEnabled={album.playbackEnabled} status={album.status} />
                      </span>
                    </div>
                    <div className="sb-mobile-data-card__actions media-card-toolbar">
                      <button type="button" className="admin-albums-icon-btn" onClick={() => copyCode(album.albumCode)}>
                        <Copy size={14} /> Copy
                      </button>
                      <button type="button" className="admin-albums-link" onClick={() => openDetail(album.id)}>
                        <Eye size={14} /> View
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="sb-desktop-only admin-albums-table-wrap premium-table-wrap">
              <table className="admin-albums-table premium-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Album</th>
                    <th>Code</th>
                    <th>TV</th>
                    <th>Media</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {albums.map((album) => (
                    <tr key={album.id} className={selectedId === album.id ? 'admin-albums-row--active' : ''}>
                      <td>{album.className}</td>
                      <td>{album.albumName}</td>
                      <td>
                        <code>{album.albumCode}</code>
                        <button type="button" className="admin-albums-icon-btn" onClick={() => copyCode(album.albumCode)}>
                          <Copy size={14} />
                        </button>
                      </td>
                      <td>
                        <AlbumStatusPill playbackEnabled={album.playbackEnabled} status={album.status} />
                      </td>
                      <td><span className="admin-albums-count">{album.mediaCount}</span></td>
                      <td><span className="admin-media-pill admin-media-pill--muted">{album.status}</span></td>
                      <td>
                        <button type="button" className="admin-albums-link" onClick={() => openDetail(album.id)}>
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {detail && (
              <aside className="admin-albums-detail premium-card">
                <div className="admin-albums-detail__head">
                  <div>
                    <h2>{detail.albumName}</h2>
                    <p className="admin-albums-detail__meta">
                      {detail.className} · <code>{detail.albumCode}</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="admin-albums-detail__close"
                    onClick={() => { setDetail(null); setSelectedId(null); setLightboxIndex(-1); }}
                    aria-label="Close album details"
                  >
                    <X size={18} />
                  </button>
                </div>
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
              </aside>
            )}
          </div>
        )}
      </div>

      <PhotoLightbox
        photo={lightboxPhoto}
        onClose={() => setLightboxIndex(-1)}
        onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
        onNext={() => setLightboxIndex((i) => Math.min(lightboxPhotos.length - 1, i + 1))}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex >= 0 && lightboxIndex < lightboxPhotos.length - 1}
      />
    </DashboardLayout>
  );
}
