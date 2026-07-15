import { toLightboxMedia } from './toLightboxMedia.js';

export function getChildClassTargets(children = [], school = null) {
  const targets = new Map();
  (children || []).forEach((child) => {
    const classId = child.classId;
    if (!classId) return;
    targets.set(classId, {
      classId,
      className: child.className || child.student?.className || child.student?.classApplying || 'Class',
      schoolId: school?.id || child.schoolId || null,
      schoolName: school?.name || '',
    });
  });
  return Array.from(targets.values());
}

function isParentVisibleAlbumItem(item) {
  if (!item) return false;
  if (item.approvalStatus === 'REJECTED') return false;
  return true;
}

export function mapAlbumMediaToParentPhoto(item, albumDetail, school = null) {
  const lightbox = toLightboxMedia(item, {
    className: albumDetail?.className,
    schoolName: school?.name || albumDetail?.schoolName,
    teacherName: item.uploadedByName || item.teacherName || 'Teacher',
  });

  return {
    ...lightbox,
    teacherId: item.uploadedBy || item.teacherId,
    teacherName: lightbox.teacherName || 'Teacher',
    schoolId: school?.id || albumDetail?.schoolId || null,
    schoolName: school?.name || albumDetail?.schoolName || '',
    classId: albumDetail?.classId || null,
    className: albumDetail?.className || '',
    grade: albumDetail?.className || '',
    category: albumDetail?.className || 'CLASSROOM',
    title: item.caption || item.fileName || 'Classroom moment',
    caption: item.caption || item.fileName || '',
    sentAt: item.uploadedAt || item.createdAt || item.sentAt || new Date().toISOString(),
    recipients: 'class',
    source: 'class_album',
  };
}

export function albumDetailToParentPhotos(albumDetail, school = null) {
  if (!albumDetail?.media?.length) return [];
  const classId = albumDetail.classId || null;
  return albumDetail.media
    .filter(isParentVisibleAlbumItem)
    .map((item) => mapAlbumMediaToParentPhoto(
      item,
      { ...albumDetail, classId: classId || albumDetail.classId },
      school,
    ));
}
