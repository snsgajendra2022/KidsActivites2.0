import { useEffect, useState, useMemo, useCallback } from 'react';
import { GraduationCap, Image } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PhotoLightbox from '../../components/media/PhotoLightbox.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { loadParentClassPhotos } from '../../services/parentPhotoService.js';
import '../../styles/parent-photos.css';

const INITIAL_VISIBLE_GROUPS = 2;
const GROUPS_PER_LOAD = 2;
const ALL_CHILDREN = 'all';

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

function getPhotoTitle(photo) {
  return photo.title || photo.caption || 'Classroom moment';
}

function getPhotoCategory(photo) {
  if (photo.category) return photo.category;
  if (photo.className) return photo.className.toUpperCase();
  return 'ACTIVITY';
}

function getPhotoGrade(photo) {
  return photo.grade || photo.className || '';
}

function getPhotoSchoolLine(photo) {
  const parts = [photo.schoolName, photo.className || photo.grade].filter(Boolean);
  return parts.join(' · ');
}

function GalleryCard({ photo, onOpen }) {
  if (photo.type === 'video' || photo.mediaType === 'VIDEO') {
    return (
      <article className="parent-photos-masonry-item">
        <div className="parent-photos-video-card">
          <span className="material-symbols-outlined">video_library</span>
          <h4>{getPhotoTitle(photo)}</h4>
          <p>{photo.caption || 'Watch the latest classroom recap.'}</p>
          <button type="button" className="parent-photos-video-card__btn">
            Watch Now
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="parent-photos-masonry-item">
      <button
        type="button"
        className="parent-photos-masonry-item__media"
        onClick={() => onOpen(photo)}
        aria-label={`View full size: ${getPhotoTitle(photo)}`}
      >
        <img src={photo.imageUrl} alt="" loading="lazy" />
      </button>
      <div className="parent-photos-masonry-item__body">
        <span className="parent-photos-masonry-item__category">{getPhotoCategory(photo)}</span>
        <h4 className="parent-photos-masonry-item__title">{getPhotoTitle(photo)}</h4>
        {getPhotoSchoolLine(photo) && (
          <p className="parent-photos-masonry-item__school">{getPhotoSchoolLine(photo)}</p>
        )}
        <div className="parent-photos-masonry-item__footer">
          <div className="parent-photos-masonry-item__teacher">
            <div className="parent-photos-masonry-item__avatar" aria-hidden>
              {getInitials(photo.teacherName)}
            </div>
            <span className="parent-photos-masonry-item__teacher-name">{photo.teacherName}</span>
          </div>
          {getPhotoGrade(photo) && (
            <span className="parent-photos-masonry-item__grade">{getPhotoGrade(photo)}</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ParentPhotos() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [children, setChildren] = useState([]);
  const [classTargets, setClassTargets] = useState([]);
  const [schoolName, setSchoolName] = useState('');
  const [selectedChildId, setSelectedChildId] = useState(ALL_CHILDREN);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [visibleGroups, setVisibleGroups] = useState(INITIAL_VISIBLE_GROUPS);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    loadParentClassPhotos(user.id, user.schoolId, user)
      .then(({ school, children: loadedChildren, photos: loadedPhotos, classTargets: targets }) => {
        setSchoolName(school?.name || '');
        setChildren(loadedChildren);
        setClassTargets(targets);
        setPhotos(loadedPhotos);
        setSelectedChildId(ALL_CHILDREN);
        setVisibleGroups(INITIAL_VISIBLE_GROUPS);
      })
      .catch(() => {
        setPhotos([]);
        setChildren([]);
        setClassTargets([]);
      })
      .finally(() => setLoading(false));
  }, [user?.id, user?.schoolId]);

  const selectedChild = useMemo(
    () => children.find((child) => child.applicationId === selectedChildId) || null,
    [children, selectedChildId],
  );

  const filteredPhotos = useMemo(() => {
    if (selectedChildId === ALL_CHILDREN) return photos;
    const classId = selectedChild?.classId;
    return photos.filter((photo) => {
      if (photo.studentIds?.some((id) => String(id) === String(selectedChildId))) return true;
      if (classId && photo.classId && String(photo.classId) === String(classId)) return true;
      return false;
    });
  }, [photos, selectedChildId, selectedChild]);

  const sortedPhotos = useMemo(
    () => [...filteredPhotos].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)),
    [filteredPhotos],
  );

  const photoGroups = useMemo(
    () => groupPhotosByDate(sortedPhotos),
    [sortedPhotos],
  );

  const visiblePhotoGroups = useMemo(
    () => photoGroups.slice(0, visibleGroups),
    [photoGroups, visibleGroups],
  );

  const featuredPhoto = useMemo(
    () => sortedPhotos.find((p) => p.imageUrl && p.type !== 'video' && p.mediaType !== 'VIDEO'),
    [sortedPhotos],
  );

  const featuredSideCards = useMemo(() => {
    const heroSide = sortedPhotos.filter((p) => p.heroSide && p.imageUrl);
    if (heroSide.length >= 2) return heroSide.slice(0, 2);
    return sortedPhotos
      .filter((p) => p.id !== featuredPhoto?.id && p.type !== 'video' && p.mediaType !== 'VIDEO' && p.imageUrl)
      .slice(0, 2);
  }, [sortedPhotos, featuredPhoto?.id]);

  const lightboxPhotos = useMemo(
    () => sortedPhotos.filter((p) => p.type !== 'video' && p.mediaType !== 'VIDEO' && p.imageUrl),
    [sortedPhotos],
  );

  const lightboxPhoto = lightboxIndex >= 0 ? lightboxPhotos[lightboxIndex] : null;

  const activeClassLabel = useMemo(() => {
    if (selectedChild?.className) return selectedChild.className;
    if (classTargets.length === 1) return classTargets[0].className;
    if (classTargets.length > 1) return `${classTargets.length} classes`;
    return null;
  }, [selectedChild, classTargets]);

  const openLightbox = useCallback((photo) => {
    const idx = lightboxPhotos.findIndex((p) => p.id === photo.id);
    if (idx >= 0) setLightboxIndex(idx);
  }, [lightboxPhotos]);

  const closeLightbox = useCallback(() => setLightboxIndex(-1), []);

  const showPrevPhoto = useCallback(() => {
    setLightboxIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const showNextPhoto = useCallback(() => {
    setLightboxIndex((i) => (i < lightboxPhotos.length - 1 ? i + 1 : i));
  }, [lightboxPhotos.length]);

  const hasMoreGroups = visibleGroups < photoGroups.length;

  return (
    <DashboardLayout>
      <div className="parent-photos-page">
        <section className="parent-photos-highlights">
          <div className="parent-photos-highlights__header">
            <div>
              <h1>Student Class</h1>
              <p>
                {schoolName && activeClassLabel
                  ? `${schoolName} · ${activeClassLabel} — classroom photos from your child’s class.`
                  : schoolName
                    ? `${schoolName} — classroom photos shared with your family.`
                    : 'Classroom photos shared with your family.'}
              </p>
            </div>
            <div className="parent-photos-highlights__actions">
              <button type="button" className="parent-photos-icon-btn" aria-label="Filter gallery">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button type="button" className="parent-photos-icon-btn" aria-label="Search gallery">
                <span className="material-symbols-outlined">search</span>
              </button>
            </div>
          </div>

          {children.length > 0 && (
            <div className="parent-photos-child-filter" role="tablist" aria-label="Filter by child">
              <button
                type="button"
                role="tab"
                aria-selected={selectedChildId === ALL_CHILDREN}
                className={`parent-photos-child-chip${selectedChildId === ALL_CHILDREN ? ' is-active' : ''}`}
                onClick={() => {
                  setSelectedChildId(ALL_CHILDREN);
                  setVisibleGroups(INITIAL_VISIBLE_GROUPS);
                }}
              >
                All children
              </button>
              {children.map((child) => (
                <button
                  key={child.applicationId}
                  type="button"
                  role="tab"
                  aria-selected={selectedChildId === child.applicationId}
                  className={`parent-photos-child-chip${selectedChildId === child.applicationId ? ' is-active' : ''}`}
                  onClick={() => {
                    setSelectedChildId(child.applicationId);
                    setVisibleGroups(INITIAL_VISIBLE_GROUPS);
                  }}
                >
                  <GraduationCap size={14} aria-hidden />
                  {child.studentName || child.student?.fullName || 'Child'}
                  {child.className ? ` · ${child.className}` : ''}
                </button>
              ))}
            </div>
          )}

          {!loading && featuredPhoto && (
            <div className="parent-photos-hero-grid">
              <button
                type="button"
                className="parent-photos-hero-featured"
                onClick={() => openLightbox(featuredPhoto)}
                aria-label={getPhotoTitle(featuredPhoto)}
              >
                <img src={featuredPhoto.imageUrl} alt="" />
                <div className="parent-photos-hero-featured__overlay" />
                <div className="parent-photos-hero-featured__content">
                  <span className="parent-photos-hero-badge">
                    {featuredPhoto.className || 'CLASSROOM'}
                  </span>
                  <h2>{getPhotoTitle(featuredPhoto)}</h2>
                  <p>{getPhotoSchoolLine(featuredPhoto) || schoolName}</p>
                </div>
              </button>

              <div className="parent-photos-hero-side">
                {featuredSideCards.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    className="parent-photos-hero-side-card"
                    onClick={() => openLightbox(photo)}
                    aria-label={getPhotoTitle(photo)}
                  >
                    <img src={photo.imageUrl} alt="" />
                    <div className="parent-photos-hero-side-card__overlay" />
                    <p className="parent-photos-hero-side-card__title">{getPhotoTitle(photo)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {loading ? (
          <div className="parent-photos-loading">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="parent-photos-skeleton" />
            ))}
          </div>
        ) : sortedPhotos.length === 0 ? (
          <div className="parent-photos-empty">
            <div className="parent-photos-empty__icon">
              <Image size={28} strokeWidth={1.75} />
            </div>
            <h2>No class photos yet</h2>
            <p>
              {selectedChild?.className
                ? `No photos have been shared for ${selectedChild.className} yet. When the teacher uploads to the class album, they will appear here.`
                : 'When your child\'s teacher shares classroom photos to the class album, they will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="parent-photos-feed">
              {visiblePhotoGroups.map((group, index) => (
                <section key={group.dateKey}>
                  <div className="parent-photos-date-header">
                    <h3 className={index === 0 ? 'is-recent' : 'is-older'}>{group.label}</h3>
                    <div className="parent-photos-date-header__line" />
                  </div>
                  <div className="parent-photos-masonry">
                    {group.photos.map((photo) => (
                      <GalleryCard key={photo.id} photo={photo} onOpen={openLightbox} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {hasMoreGroups && (
              <div className="parent-photos-load-more-wrap">
                <button
                  type="button"
                  className="parent-photos-load-more"
                  onClick={() => setVisibleGroups((n) => n + GROUPS_PER_LOAD)}
                >
                  Load Older Memories
                  <span className="material-symbols-outlined">expand_more</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <PhotoLightbox
        photo={lightboxPhoto}
        onClose={closeLightbox}
        onPrev={showPrevPhoto}
        onNext={showNextPhoto}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex >= 0 && lightboxIndex < lightboxPhotos.length - 1}
      />
    </DashboardLayout>
  );
}
