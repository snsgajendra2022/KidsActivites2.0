import { getParentAlbumByClass } from './classAlbumService.js';
import { getPhotos } from './mediaService.js';
import {
  enrichParentChildrenWithClass,
  getParentChildren,
  getParentDashboard,
} from './parentService.js';
import { albumDetailToParentPhotos } from '../utils/parentAlbumPhotos.js';

function mergePhotos(photoLists) {
  const merged = new Map();
  photoLists.flat().forEach((photo) => {
    if (photo?.id) merged.set(photo.id, photo);
  });
  return Array.from(merged.values());
}

async function fetchClassAlbumPhotos(classId, className, school) {
  try {
    const album = await getParentAlbumByClass(classId);
    const photos = albumDetailToParentPhotos(
      {
        ...album,
        classId: album?.classId || classId,
        className: album?.className || className,
        schoolName: album?.schoolName || school?.name,
      },
      school,
    );
    if (photos.length > 0) return photos;
  } catch {
    // fall through to media API
  }

  try {
    return await getPhotos({ classId, className });
  } catch {
    return [];
  }
}

/**
 * Parent → dashboard/children → student classId → GET /parent/albums/{classId}
 * Also loads GET /media/photos?studentId= for direct shares.
 */
export async function loadParentClassPhotos(parentId, schoolId, user) {
  const dashboard = await getParentDashboard(parentId, schoolId, user);
  const school = dashboard?.school || null;
  let children = await enrichParentChildrenWithClass(parentId, dashboard?.children || [], user);

  if (!children.some((child) => child.classId)) {
    const listed = await getParentChildren(user).catch(() => []);
    if (listed.length) {
      children = await enrichParentChildrenWithClass(parentId, listed, user);
    }
  }

  const classMap = new Map();
  children.forEach((child) => {
    if (!child.classId) return;
    classMap.set(child.classId, {
      classId: child.classId,
      className: child.className || child.studentName || 'Class',
    });
  });

  const albumFetches = [...classMap.values()].map(({ classId, className }) => (
    fetchClassAlbumPhotos(classId, className, school)
  ));

  const studentFetches = children
    .filter((child) => child.applicationId)
    .map((child) => getPhotos({
      studentId: child.applicationId,
      classId: child.classId,
      className: child.className,
    }).catch(() => []));

  const photos = mergePhotos(await Promise.all([...albumFetches, ...studentFetches]));

  return {
    school,
    children,
    photos,
    classTargets: [...classMap.values()],
  };
}
