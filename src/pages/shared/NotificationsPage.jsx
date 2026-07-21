import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, FileText, CreditCard, Image, MessageCircle,
  Inbox, Filter, Megaphone,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useNotifications, getNotificationImageUrl } from '../../hooks/useNotifications.js';
import { markAsRead, markAllRead } from '../../services/notificationService.js';
import { getPhotos } from '../../services/mediaService.js';
import { getNotificationTitle, resolveNotificationPath } from '../../utils/notificationLinks.js';
import { rewritePhotoStudioUrl } from '../../utils/photoStudioUrls.js';
import WebPushEnableBanner from '../../components/notifications/WebPushEnableBanner.jsx';
import '../../styles/notifications.css';

const TYPE_CONFIG = {
  enrollment: { label: 'Enrollment', icon: FileText, filter: 'enrollment' },
  fee: { label: 'Fees', icon: CreditCard, filter: 'fee' },
  photo: { label: 'Photos', icon: Image, filter: 'photo' },
  chat: { label: 'Messages', icon: MessageCircle, filter: 'chat' },
  notice: { label: 'Notices', icon: Megaphone, filter: 'notice' },
  system: { label: 'System', icon: Bell, filter: 'system' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'fee', label: 'Fees' },
  { id: 'photo', label: 'Photos' },
  { id: 'chat', label: 'Messages' },
  { id: 'notice', label: 'Notices' },
  { id: 'system', label: 'System' },
];

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dedupePhotoItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id || item.imageUrl;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function NotificationsPage({
  title = 'Notifications',
  subtitle = 'Your school notifications and updates.',
}) {
  const { user, isDemoSession } = useAuth();
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    setNotifications,
    setUnreadCount,
    clearNotificationsFromView,
  } = useNotifications({ pollIntervalMs: 15_000, showToasts: false });
  const [activeFilter, setActiveFilter] = useState('all');
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  useEffect(() => {
    if (error) {
      toast('Unable to load notifications. Please try again.', 'error');
    }
  }, [error, toast]);

  const showPhotoGallery = activeFilter === 'photo' || activeFilter === 'all';

  useEffect(() => {
    if (!showPhotoGallery || !user?.id) {
      setGalleryPhotos([]);
      return undefined;
    }

    let cancelled = false;
    const loadGallery = async () => {
      setGalleryLoading(true);
      try {
        const photos = await getPhotos();
        if (!cancelled) {
          setGalleryPhotos(Array.isArray(photos) ? photos : []);
        }
      } catch {
        if (!cancelled) setGalleryPhotos([]);
      } finally {
        if (!cancelled) setGalleryLoading(false);
      }
    };

    loadGallery();
    const timer = setInterval(loadGallery, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [showPhotoGallery, user?.id, notifications.length]);

  const unread = unreadCount;

  const filterCounts = useMemo(() => {
    const counts = { all: notifications.length, unread };
    FILTERS.slice(2).forEach((f) => {
      counts[f.id] = notifications.filter((n) => n.type === f.id).length;
    });
    return counts;
  }, [notifications, unread]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const photoGalleryItems = useMemo(() => {
    const fromNotifications = notifications
      .filter((n) => n.type === 'photo')
      .map((n) => {
        const imageUrl = getNotificationImageUrl(n);
        if (!imageUrl) return null;
        return {
          id: n.id,
          imageUrl: rewritePhotoStudioUrl(imageUrl),
          caption: n.message,
          createdAt: n.createdAt,
          source: 'notification',
        };
      })
      .filter(Boolean);

    const fromMedia = galleryPhotos.map((photo) => ({
      id: photo.id,
      imageUrl: rewritePhotoStudioUrl(photo.imageUrl || photo.previewUrl || photo.thumbnailUrl),
      caption: photo.caption || photo.className,
      createdAt: photo.sentAt || photo.createdAt || photo.uploadTime,
      source: 'media',
    })).filter((item) => item.imageUrl);

    return dedupePhotoItems([...fromNotifications, ...fromMedia])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, galleryPhotos]);

  const handleRead = async (id) => {
    await markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleOpen = (n) => {
    if (!n.read) {
      handleRead(n.id).catch(() => {});
    }
    const path = resolveNotificationPath(n, user?.role);
    if (path) navigate(tenantPath(path));
  };

  const handleReadAll = async () => {
    await markAllRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClearAll = async () => {
    const ids = notifications.map((n) => n.id).filter(Boolean);
    try {
      await markAllRead(user.id);
    } catch {
      // Still clear the list locally.
    }
    clearNotificationsFromView(ids);
    setUnreadCount(0);
  };

  const filterLabel = FILTERS.find((f) => f.id === activeFilter)?.label || 'All';

  return (
    <DashboardLayout>
      <div className="notif-shell">
        <WebPushEnableBanner />
        <div className="notif-panel">
          <aside className="notif-sidebar">
            <div className="notif-sidebar__head">
              <div className="notif-sidebar__title-row">
                <h1 className="notif-sidebar__title">{title}</h1>
                {isDemoSession && (
                  <span className="notif-demo-badge">Demo</span>
                )}
              </div>
              <p className="notif-sidebar__subtitle">{subtitle}</p>

              <div className="notif-stat-card">
                <div className="notif-stat-card__icon">
                  <Bell size={18} />
                </div>
                <div className="notif-stat-card__text">
                  <strong>{unread}</strong>
                  <span>unread notification{unread !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            <nav className="notif-filters" aria-label="Filter notifications">
              <p className="notif-filters__title">Filter</p>
              <div className="notif-filters__wrap">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`notif-filter-btn ${activeFilter === f.id ? 'is-active' : ''}`}
                    onClick={() => setActiveFilter(f.id)}
                    aria-pressed={activeFilter === f.id}
                  >
                    {f.label}
                    {filterCounts[f.id] > 0 && (
                      <span className="notif-filter-btn__count">{filterCounts[f.id]}</span>
                    )}
                  </button>
                ))}
              </div>
            </nav>

            <div className="notif-sidebar__action">
              <button
                type="button"
                className="notif-mark-all"
                onClick={handleReadAll}
                disabled={unread === 0}
              >
                <CheckCheck size={16} />
                Mark all as read
              </button>
              <button
                type="button"
                className="notif-clear-all"
                onClick={() => { void handleClearAll(); }}
                disabled={notifications.length === 0}
              >
                Clear all messages
              </button>
            </div>
          </aside>

          <div className="notif-main">
            <div className="notif-main__toolbar">
              <div>
                <h2>
                  <Inbox size={16} aria-hidden />
                  {filterLabel}
                </h2>
                <p>
                  {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
                  {activeFilter === 'unread' && unread > 0 ? ' needing attention' : ''}
                </p>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  className="notif-mark-all notif-mark-all--toolbar"
                  onClick={handleReadAll}
                >
                  <CheckCheck size={15} />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  className="notif-clear-all notif-clear-all--toolbar"
                  onClick={() => { void handleClearAll(); }}
                >
                  Clear all
                </button>
              )}
            </div>

            {showPhotoGallery && (
              <section className="notif-photos-section" aria-label="Shared photos">
                <div className="notif-photos-section__head">
                  <h3>
                    <Image size={16} />
                    Shared photos
                  </h3>
                  <span>{photoGalleryItems.length} image{photoGalleryItems.length !== 1 ? 's' : ''}</span>
                </div>
                {galleryLoading && photoGalleryItems.length === 0 ? (
                  <div className="notif-photos-grid notif-photos-grid--loading">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="notif-photos-skeleton" />
                    ))}
                  </div>
                ) : photoGalleryItems.length === 0 ? (
                  <p className="notif-photos-empty">Photos shared by teachers will appear here in real time.</p>
                ) : (
                  <div className="notif-photos-grid">
                    {photoGalleryItems.slice(0, 12).map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        className="notif-photo-card"
                        onClick={() => {
                          const path = resolveNotificationPath({ type: 'photo' }, user?.role) || '/admin/photos';
                          navigate(tenantPath(path));
                        }}
                        title={photo.caption || 'View photo'}
                      >
                        <img src={photo.imageUrl} alt="" loading="lazy" decoding="async" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {loading ? (
              <div className="notif-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="notif-skeleton" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty__icon">
                  <Filter size={28} strokeWidth={1.75} />
                </div>
                <h2>
                  {notifications.length === 0 ? 'No notifications yet' : 'Nothing in this filter'}
                </h2>
                <p>
                  {notifications.length === 0
                    ? 'Updates about enrollment, fees, photos, and messages will appear here.'
                    : 'Try another category or check back later for new updates.'}
                </p>
              </div>
            ) : (
              <div className="notif-feed">
                {filtered.map((n) => {
                  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                  const Icon = config.icon;
                  const imageUrl = getNotificationImageUrl(n);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`notif-card ${!n.read ? 'notif-card--unread' : ''}${imageUrl ? ' notif-card--with-image' : ''}`}
                      onClick={() => handleOpen(n)}
                    >
                      <div className={`notif-card__icon notif-card__icon--${n.type}`}>
                        <Icon size={20} />
                      </div>
                      <div className="notif-card__body">
                        <div className="notif-card__head">
                          <h3 className="notif-card__title">{getNotificationTitle(n)}</h3>
                          <div className="notif-card__meta">
                            {!n.read && <span className="notif-card__dot" aria-label="Unread" />}
                            <time className="notif-card__time">{formatTime(n.createdAt)}</time>
                          </div>
                        </div>
                        <p className="notif-card__message">{n.message}</p>
                        <span className="notif-card__tag">{config.label}</span>
                      </div>
                      {imageUrl && (
                        <div className="notif-card__thumb" aria-hidden>
                          <img
                            src={rewritePhotoStudioUrl(imageUrl)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
