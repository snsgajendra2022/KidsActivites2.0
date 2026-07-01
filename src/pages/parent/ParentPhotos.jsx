import { useEffect, useState, useMemo } from 'react';
import { Image, Calendar, Camera } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
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

function formatPhotoDateShort(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatPhotoDate(iso);
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
          <div className="parent-photos-grid">
            {sortedPhotos.map((photo) => (
              <article key={photo.id} className="parent-photos-card">
                <div className="parent-photos-card__media">
                  <img
                    src={photo.imageUrl}
                    alt=""
                    loading="lazy"
                  />
                  <span className="parent-photos-card__date-badge">
                    <Calendar size={11} />
                    {formatPhotoDate(photo.sentAt)}
                  </span>
                </div>
                <div className="parent-photos-card__body">
                  {photo.caption ? (
                    <p className="parent-photos-card__caption">{photo.caption}</p>
                  ) : (
                    <p className="parent-photos-card__caption" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                      Classroom photo
                    </p>
                  )}
                  <div className="parent-photos-card__footer">
                    <div className="parent-photos-card__avatar" aria-hidden>
                      {getInitials(photo.teacherName)}
                    </div>
                    <div className="parent-photos-card__meta">
                      <p className="parent-photos-card__teacher">{photo.teacherName}</p>
                      <p className="parent-photos-card__class">{formatPhotoDateShort(photo.sentAt)}</p>
                    </div>
                    {photo.className && (
                      <span className="parent-photos-card__class-tag">{photo.className}</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
