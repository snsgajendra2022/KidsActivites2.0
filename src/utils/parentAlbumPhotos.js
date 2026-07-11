import { resolveVideoStreamUrl } from './photoStudioProgressive.js';

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
  const isVideo = item.mediaType === 'VIDEO';
  const imageUrl = item.thumbnailUrl || item.previewUrl || item.imageUrl || '';
  return {
    id: item.id,
    teacherId: item.uploadedBy || item.teacherId,
    teacherName: item.uploadedByName || item.teacherName || 'Teacher',
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
    imageUrl,
    previewUrl: item.previewUrl || item.imageUrl,
    thumbnailUrl: item.thumbnailUrl,
    mediaType: item.mediaType || (isVideo ? 'VIDEO' : 'IMAGE'),
    type: isVideo ? 'video' : undefined,
    streamUrl: resolveVideoStreamUrl(item),
    renditions: item.renditions,
    processingStatus: item.processingStatus,
    source: 'class_album',
  };
}

export function albumDetailToParentPhotos(albumDetail, school = null) {
  if (!albumDetail?.classId) return [];
  return (albumDetail.media || [])
    .filter(isParentVisibleAlbumItem)
    .map((item) => mapAlbumMediaToParentPhoto(item, albumDetail, school));
}
