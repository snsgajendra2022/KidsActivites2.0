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

function attachChildContext(photos, children) {
  return photos.map((photo) => {
    const matchingChildren = (children || []).filter(
      (child) => child.classId && photo.classId && String(child.classId) === String(photo.classId),
    );
    if (!matchingChildren.length) return photo;
    const studentIds = [
      ...new Set([
        ...(photo.studentIds || []),
        ...matchingChildren.map((child) => child.applicationId).filter(Boolean),
      ]),
    ];
    const childNames = matchingChildren
      .map((child) => child.studentName || child.student?.fullName)
      .filter(Boolean);
    return { ...photo, studentIds, childNames };
  });
}

async function fetchClassAlbumPhotos(classId, className, school) {
  try {
    const album = await getParentAlbumByClass(classId);
    return albumDetailToParentPhotos(
      {
        ...album,
        classId: album?.classId || classId,
        className: album?.className || className,
        schoolName: album?.schoolName || school?.name,
      },
      school,
    );
  } catch {
    return [];
  }
}

async function fetchDirectPhotos(children) {
  const studentFetches = children
    .filter((child) => child.applicationId)
    .map((child) => getPhotos({ studentId: child.applicationId }).catch(() => []));

  return mergePhotos(await Promise.all(studentFetches)).map((photo) => ({
    ...photo,
    source: photo.source || 'parent_direct',
    studentIds: [
      ...new Set([
        ...(photo.studentIds || []),
        ...(photo.studentId ? [photo.studentId] : []),
      ]),
    ],
  }));
}

/**
 * Parent photos split by source:
 * - directPhotos: GET /media/photos?studentId= (PARENT_DIRECT shares)
 * - albumPhotos: GET /parent/albums/{classId} (CLASS_ALBUM)
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

  const [albumPhotos, directPhotos] = await Promise.all([
    attachChildContext(mergePhotos(await Promise.all(albumFetches)), children),
    attachChildContext(await fetchDirectPhotos(children), children),
  ]);

  return {
    school,
    children,
    directPhotos,
    albumPhotos,
    classTargets: [...classMap.values()],
  };
}
