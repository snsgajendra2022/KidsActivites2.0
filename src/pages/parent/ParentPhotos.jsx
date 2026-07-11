import { useEffect, useState, useMemo, useCallback } from 'react';
import { GraduationCap, Heart, Image, Images } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PhotoLightbox from '../../components/media/PhotoLightbox.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { loadParentClassPhotos } from '../../services/parentPhotoService.js';
import '../../styles/parent-photos.css';

const INITIAL_VISIBLE = 12;
const PHOTOS_PER_LOAD = 12;
const ALL_CHILDREN = 'all';

const TABS = {
  DIRECT: 'direct',
  ALBUM: 'album',
};

function formatPhotoDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getPhotoTitle(photo) {
  return photo.title || photo.caption || 'Classroom moment';
}

function getPhotoSchoolLine(photo) {
  const parts = [photo.schoolName, photo.className || photo.grade].filter(Boolean);
  return parts.join(' · ');
}

function sortPhotosNewestFirst(photos) {
  return [...photos].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

function isImagePhoto(photo) {
  return photo.type !== 'video' && photo.mediaType !== 'VIDEO' && Boolean(photo.imageUrl);
}

function filterDirectByChild(photos, selectedChildId, selectedChild) {
  if (selectedChildId === ALL_CHILDREN) return photos;
  return photos.filter((photo) => {
    if (photo.studentIds?.some((id) => String(id) === String(selectedChildId))) return true;
    if (photo.studentId && String(photo.studentId) === String(selectedChildId)) return true;
    return false;
  });
}

function filterAlbumByChild(photos, selectedChildId, selectedChild) {
  if (selectedChildId === ALL_CHILDREN) return photos;
  const classId = selectedChild?.classId;
  if (!classId) return [];
  return photos.filter(
    (photo) => photo.classId && String(photo.classId) === String(classId),
  );
}

function PhotoCard({ photo, onOpen, showChildLabel }) {
  if (!isImagePhoto(photo)) return null;

  return (
    <article className="parent-photos-card">
      <button
        type="button"
        className="parent-photos-card__media"
        onClick={() => onOpen(photo)}
        aria-label={`View: ${getPhotoTitle(photo)}`}
      >
        <img src={photo.imageUrl} alt="" loading="lazy" />
      </button>
      <div className="parent-photos-card__body">
        {showChildLabel && photo.childNames?.length > 0 && (
          <p className="parent-photos-card__child">{photo.childNames.join(' · ')}</p>
        )}
        <p className="parent-photos-card__title">{getPhotoTitle(photo)}</p>
        <div className="parent-photos-card__meta">
          <span>{photo.teacherName || 'Teacher'}</span>
          <span aria-hidden>·</span>
          <span>{formatPhotoDate(photo.sentAt)}</span>
        </div>
        {getPhotoSchoolLine(photo) && (
          <p className="parent-photos-card__context">{getPhotoSchoolLine(photo)}</p>
        )}
      </div>
    </article>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="parent-photos-empty">
      <div className="parent-photos-empty__icon">
        <Icon size={28} strokeWidth={1.75} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function PhotoGallery({
  photos,
  loading,
  onOpen,
  showChildLabels,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const imagePhotos = useMemo(() => photos.filter(isImagePhoto), [photos]);
  const visiblePhotos = useMemo(
    () => imagePhotos.slice(0, visibleCount),
    [imagePhotos, visibleCount],
  );
  const hasMore = visibleCount < imagePhotos.length;

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [photos]);

  if (loading) {
    return (
      <div className="parent-photos-loading">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="parent-photos-skeleton" />
        ))}
      </div>
    );
  }

  if (imagePhotos.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <>
      <div className="parent-photos-grid">
        {visiblePhotos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onOpen={onOpen}
            showChildLabel={showChildLabels}
          />
        ))}
      </div>
      {hasMore && (
        <div className="parent-photos-load-more-wrap">
          <button
            type="button"
            className="parent-photos-load-more"
            onClick={() => setVisibleCount((n) => n + PHOTOS_PER_LOAD)}
          >
            Show more photos
          </button>
        </div>
      )}
    </>
  );
}

export default function ParentPhotos() {
  const { user } = useAuth();
  const [directPhotos, setDirectPhotos] = useState([]);
  const [albumPhotos, setAlbumPhotos] = useState([]);
  const [children, setChildren] = useState([]);
  const [classTargets, setClassTargets] = useState([]);
  const [schoolName, setSchoolName] = useState('');
  const [selectedChildId, setSelectedChildId] = useState(ALL_CHILDREN);
  const [activeTab, setActiveTab] = useState(TABS.DIRECT);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    loadParentClassPhotos(user.id, user.schoolId, user)
      .then(({
        school,
        children: loadedChildren,
        directPhotos: loadedDirect,
        albumPhotos: loadedAlbum,
        classTargets: targets,
      }) => {
        setSchoolName(school?.name || '');
        setChildren(loadedChildren);
        setClassTargets(targets);
        setDirectPhotos(loadedDirect);
        setAlbumPhotos(loadedAlbum);
        setSelectedChildId(ALL_CHILDREN);
        setActiveTab(TABS.DIRECT);
      })
      .catch(() => {
        setDirectPhotos([]);
        setAlbumPhotos([]);
        setChildren([]);
        setClassTargets([]);
      })
      .finally(() => setLoading(false));
  }, [user?.id, user?.schoolId]);

  const selectedChild = useMemo(
    () => children.find((child) => child.applicationId === selectedChildId) || null,
    [children, selectedChildId],
  );

  const filteredDirectPhotos = useMemo(
    () => sortPhotosNewestFirst(
      filterDirectByChild(directPhotos, selectedChildId, selectedChild),
    ),
    [directPhotos, selectedChildId, selectedChild],
  );

  const filteredAlbumPhotos = useMemo(
    () => sortPhotosNewestFirst(
      filterAlbumByChild(albumPhotos, selectedChildId, selectedChild),
    ),
    [albumPhotos, selectedChildId, selectedChild],
  );

  const activePhotos = activeTab === TABS.DIRECT ? filteredDirectPhotos : filteredAlbumPhotos;

  const lightboxPhotos = useMemo(
    () => activePhotos.filter(isImagePhoto),
    [activePhotos],
  );

  const lightboxPhoto = lightboxIndex >= 0 ? lightboxPhotos[lightboxIndex] : null;

  const activeClassLabel = useMemo(() => {
    if (selectedChild?.className) return selectedChild.className;
    if (classTargets.length === 1) return classTargets[0].className;
    if (classTargets.length > 1) return `${classTargets.length} classes`;
    return null;
  }, [selectedChild, classTargets]);

  const showChildLabels = children.length > 1 && selectedChildId === ALL_CHILDREN;

  const directCount = filteredDirectPhotos.filter(isImagePhoto).length;
  const albumCount = filteredAlbumPhotos.filter(isImagePhoto).length;

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

  const selectedChildName = selectedChild?.studentName
    || selectedChild?.student?.fullName
    || 'your child';

  const directEmptyTitle = 'Nothing shared with you yet';
  const directEmptyDescription = selectedChild
    ? `When ${selectedChildName}'s teacher sends photos directly to your family, they will appear here.`
    : 'When a teacher sends photos directly to your family, they will appear here.';

  const albumEmptyTitle = 'No class photos yet';
  const albumEmptyDescription = selectedChild?.className
    ? `Photos added to the ${selectedChild.className} class album will appear here.`
    : activeClassLabel
      ? `Photos added to the ${activeClassLabel} class album will appear here.`
      : 'When your child\'s teacher adds photos to the class album, they will appear here.';

  return (
    <DashboardLayout>
      <div className="parent-photos-page">
        <header className="parent-photos-header">
          <h1 className="parent-photos-header__title">Photos</h1>
          <p className="parent-photos-header__subtitle">
            {schoolName && activeClassLabel
              ? `${schoolName} · ${activeClassLabel}`
              : schoolName || 'Classroom photos from your child\'s school'}
          </p>
        </header>

        {children.length > 1 && (
          <div className="parent-photos-child-filter" role="tablist" aria-label="Filter by child">
            <button
              type="button"
              role="tab"
              aria-selected={selectedChildId === ALL_CHILDREN}
              className={`parent-photos-child-chip${selectedChildId === ALL_CHILDREN ? ' is-active' : ''}`}
              onClick={() => setSelectedChildId(ALL_CHILDREN)}
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
                onClick={() => setSelectedChildId(child.applicationId)}
              >
                <GraduationCap size={14} aria-hidden />
                {child.studentName || child.student?.fullName || 'Child'}
                {child.className ? ` · ${child.className}` : ''}
              </button>
            ))}
          </div>
        )}

        <div className="parent-photos-tabs" role="tablist" aria-label="Photo collections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TABS.DIRECT}
            className={`parent-photos-tab${activeTab === TABS.DIRECT ? ' is-active' : ''}`}
            onClick={() => {
              setActiveTab(TABS.DIRECT);
              setLightboxIndex(-1);
            }}
          >
            <span className="parent-photos-tab__icon" aria-hidden>
              <Heart size={18} />
            </span>
            <span className="parent-photos-tab__text">
              <span className="parent-photos-tab__label">For You</span>
              <span className="parent-photos-tab__hint">Direct from teacher</span>
            </span>
            {!loading && directCount > 0 && (
              <span className="parent-photos-tab__count">{directCount}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TABS.ALBUM}
            className={`parent-photos-tab${activeTab === TABS.ALBUM ? ' is-active' : ''}`}
            onClick={() => {
              setActiveTab(TABS.ALBUM);
              setLightboxIndex(-1);
            }}
          >
            <span className="parent-photos-tab__icon" aria-hidden>
              <Images size={18} />
            </span>
            <span className="parent-photos-tab__text">
              <span className="parent-photos-tab__label">Class Album</span>
              <span className="parent-photos-tab__hint">All class photos</span>
            </span>
            {!loading && albumCount > 0 && (
              <span className="parent-photos-tab__count">{albumCount}</span>
            )}
          </button>
        </div>

        <section
          className="parent-photos-panel"
          role="tabpanel"
          aria-label={activeTab === TABS.DIRECT ? 'For You' : 'Class Album'}
        >
          {activeTab === TABS.DIRECT ? (
            <PhotoGallery
              photos={filteredDirectPhotos}
              loading={loading}
              onOpen={openLightbox}
              showChildLabels={showChildLabels}
              emptyIcon={Heart}
              emptyTitle={directEmptyTitle}
              emptyDescription={directEmptyDescription}
            />
          ) : (
            <PhotoGallery
              photos={filteredAlbumPhotos}
              loading={loading}
              onOpen={openLightbox}
              showChildLabels={showChildLabels}
              emptyIcon={Image}
              emptyTitle={albumEmptyTitle}
              emptyDescription={albumEmptyDescription}
            />
          )}
        </section>
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
