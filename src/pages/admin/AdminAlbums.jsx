import { useCallback, useEffect, useState } from 'react';
import { Tv, Copy, RefreshCw, Archive, Eye } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  backfillAlbums,
  getAdminAlbum,
  listAdminAlbums,
  regenerateAlbumCode,
  updateAdminAlbum,
  updateAlbumMedia,
} from '../../services/classAlbumService.js';
import '../../styles/admin-albums.css';

export default function AdminAlbums() {
  const { toast } = useToast();
  const [albums, setAlbums] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

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
    try {
      const data = await getAdminAlbum(albumId);
      setDetail(data);
    } catch (err) {
      toast(err?.message || 'Failed to load album.', 'error');
    }
  };

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
    try {
      await updateAlbumMedia(detail.id, mediaItem.id, { showOnTv: !mediaItem.showOnTv });
      openDetail(detail.id);
    } catch (err) {
      toast(err?.message || 'Update failed.', 'error');
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

        {loading ? (
          <p>Loading albums…</p>
        ) : (
          <div className="admin-albums-layout">
            <div className="admin-albums-list">
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
                      <span className="sb-mobile-data-card__value">{album.status}</span>
                    </div>
                    <div className="sb-mobile-data-card__actions">
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

              <div className="sb-desktop-only admin-albums-table-wrap">
              <table className="admin-albums-table">
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
                    <tr key={album.id}>
                      <td>{album.className}</td>
                      <td>{album.albumName}</td>
                      <td>
                        <code>{album.albumCode}</code>
                        <button type="button" className="admin-albums-icon-btn" onClick={() => copyCode(album.albumCode)}>
                          <Copy size={14} />
                        </button>
                      </td>
                      <td>{album.playbackEnabled ? 'On' : 'Off'}</td>
                      <td>{album.mediaCount}</td>
                      <td>{album.status}</td>
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
              <aside className="admin-albums-detail">
                <h2>{detail.albumName}</h2>
                <p className="admin-albums-detail__meta">
                  {detail.className} · <code>{detail.albumCode}</code>
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
                <div className="admin-albums-media-grid">
                  {(detail.media || []).map((item) => (
                    <article key={item.id} className="admin-albums-media-card">
                      {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" />}
                      <p>{item.caption || item.fileName || 'Media'}</p>
                      <button type="button" onClick={() => toggleShowOnTv(item)}>
                        TV: {item.showOnTv ? 'On' : 'Off'}
                      </button>
                    </article>
                  ))}
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
