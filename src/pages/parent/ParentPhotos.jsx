import { useEffect, useState, useMemo, useCallback } from 'react';
import { Image, Calendar, Camera, Expand } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PhotoLightbox from '../../components/media/PhotoLightbox.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getPhotos } from '../../services/mediaService.js';
import '../../styles/parent-photos.css';

function getInitials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatPhotoDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getLocalDateKey(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatGroupDateLabel(iso) {
  const photoDay = getLocalDateKey(iso);
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  if (photoDay === todayKey) return 'Today';
  if (photoDay === yesterdayKey) return 'Yesterday';
  return formatPhotoDate(iso);
}

function groupPhotosByDate(photos) {
  const groups = new Map();
  photos.forEach((photo) => {
    const key = getLocalDateKey(photo.sentAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(photo);
  });
  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: formatGroupDateLabel(items[0].sentAt),
    photos: items,
  }));
}

/** Parent's child id for photo filtering — demo maps parent to aarav */
function getStudentIdForParent(userId) {
  if (userId === 'usr-parent' || userId === 'usr-student') return 'aarav';
  return null;
}

export default function ParentPhotos() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    const studentId = getStudentIdForParent(user?.id);
    getPhotos(studentId ? { studentId } : {})
      .then(setPhotos)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)),
    [photos],
  );

  const classCount = useMemo(
    () => new Set(photos.map((p) => p.className)).size,
    [photos],
  );

  const photoGroups = useMemo(
    () => groupPhotosByDate(sortedPhotos),
    [sortedPhotos],
  );

  const lightboxPhoto = lightboxIndex >= 0 ? sortedPhotos[lightboxIndex] : null;

  const openLightbox = useCallback((photo) => {
    const idx = sortedPhotos.findIndex((p) => p.id === photo.id);
    if (idx >= 0) setLightboxIndex(idx);
  }, [sortedPhotos]);

  const closeLightbox = useCallback(() => setLightboxIndex(-1), []);

  const showPrevPhoto = useCallback(() => {
    setLightboxIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const showNextPhoto = useCallback(() => {
    setLightboxIndex((i) => (i < sortedPhotos.length - 1 ? i + 1 : i));
  }, [sortedPhotos.length]);

  return (
    <DashboardLayout>
      <div className="parent-photos-shell">
        <header className="parent-photos-hero">
          <div className="parent-photos-hero__icon" aria-hidden>
            <Camera size={22} />
          </div>
          <div className="parent-photos-hero__text">
            <h1>Photos from Teacher</h1>
            <p>Classroom moments shared by your child&apos;s teacher.</p>
            {photos.length > 0 && (
              <div className="parent-photos-stats" style={{ marginTop: '0.75rem' }}>
                <span className="parent-photos-stat">
                  <Image size={14} />
                  <strong>{photos.length}</strong> photo{photos.length !== 1 ? 's' : ''}
                </span>
                {classCount > 0 && (
                  <span className="parent-photos-stat">
                    <strong>{classCount}</strong> class{classCount !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <div className="parent-photos-loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="parent-photos-skeleton" />
            ))}
          </div>
        ) : sortedPhotos.length === 0 ? (
          <div className="parent-photos-empty">
            <div className="parent-photos-empty__icon">
              <Image size={28} strokeWidth={1.75} />
            </div>
            <h2>No photos shared yet</h2>
            <p>
              When your child&apos;s teacher shares classroom photos, they will appear here.
            </p>
          </div>
        ) : (
          <div className="parent-photos-groups">
            {photoGroups.map((group) => (
              <section key={group.dateKey} className="parent-photos-group">
                <header className="parent-photos-group__header">
                  <Calendar size={15} aria-hidden />
                  <h2 className="parent-photos-group__title">{group.label}</h2>
                  <span className="parent-photos-group__count">
                    {group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}
                  </span>
                </header>
                <div className="parent-photos-grid">
                  {group.photos.map((photo) => (
                    <article key={photo.id} className="parent-photos-card">
                      <button
                        type="button"
                        className="parent-photos-card__media"
                        onClick={() => openLightbox(photo)}
                        aria-label={`View full size: ${photo.caption || 'Classroom photo'}`}
                      >
                        <img
                          src={photo.imageUrl}
                          alt=""
                          loading="lazy"
                        />
                        <span className="parent-photos-card__zoom-hint" aria-hidden>
                          <Expand size={14} />
                          View
                        </span>
                      </button>
                      <div className="parent-photos-card__body">
                        {photo.caption ? (
                          <p className="parent-photos-card__caption">{photo.caption}</p>
                        ) : (
                          <p className="parent-photos-card__caption parent-photos-card__caption--muted">
                            Classroom photo
                          </p>
                        )}
                        <div className="parent-photos-card__footer">
                          <div className="parent-photos-card__avatar" aria-hidden>
                            {getInitials(photo.teacherName)}
                          </div>
                          <div className="parent-photos-card__meta">
                            <p className="parent-photos-card__teacher">{photo.teacherName}</p>
                            {photo.className && (
                              <p className="parent-photos-card__class">{photo.className}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <PhotoLightbox
        photo={lightboxPhoto}
        onClose={closeLightbox}
        onPrev={showPrevPhoto}
        onNext={showNextPhoto}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex >= 0 && lightboxIndex < sortedPhotos.length - 1}
      />
    </DashboardLayout>
  );
}
