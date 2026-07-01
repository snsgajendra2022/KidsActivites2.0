export const INITIAL_PHOTOS = [
  {
    id: 'photo-001',
    teacherId: 'usr-teacher',
    teacherName: 'Meera Iyer',
    className: 'UKG-A',
    caption: 'Art class today! The children made beautiful paintings.',
    sentAt: '2026-06-20T10:00:00Z',
    recipients: 'class',
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
    studentIds: ['aarav'],
  },
  {
    id: 'photo-002',
    teacherId: 'usr-teacher',
    teacherName: 'Meera Iyer',
    className: 'UKG-A',
    caption: 'Sports day practice',
    sentAt: '2026-06-18T14:30:00Z',
    recipients: 'individual',
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=300&fit=crop',
    studentIds: ['aarav'],
  },
];

export const TEACHER_CLASSES = [
  { id: 'class-ukg-a', name: 'UKG-A', section: 'A', grade: 'UKG', studentCount: 28 },
  { id: 'class-ukg-b', name: 'UKG-B', section: 'B', grade: 'UKG', studentCount: 26 },
];

export const CLASS_STUDENTS = [
  { id: 'aarav', name: 'Aarav Kumar', classId: 'class-ukg-a', parentName: 'Rajesh Kumar' },
  { id: 'priya-s', name: 'Priya Sharma', classId: 'class-ukg-a', parentName: 'Ramesh Sharma' },
  { id: 'dev', name: 'Dev Mehta', classId: 'class-ukg-a', parentName: 'Suresh Mehta' },
  { id: 'ananya', name: 'Ananya Reddy', classId: 'class-ukg-b', parentName: 'Krishna Reddy' },
];
