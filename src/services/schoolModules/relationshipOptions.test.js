import { describe, expect, it } from 'vitest';
import {
  gradeFromMarks,
  DEFAULT_SUBJECTS,
  loadStudentOptions,
} from './relationshipOptions.js';

describe('school relationship helpers', () => {
  it('exposes a reusable subject catalog', () => {
    expect(DEFAULT_SUBJECTS.some((subject) => subject.id === 'subj-math')).toBe(true);
    expect(DEFAULT_SUBJECTS.every((subject) => subject.id && subject.name)).toBe(true);
  });

  it('calculates grades from marks and max marks', () => {
    expect(gradeFromMarks(48, 50)).toBe('A+');
    expect(gradeFromMarks(42, 50)).toBe('A');
    expect(gradeFromMarks(15, 50)).toBe('F');
    expect(gradeFromMarks('bad', 50)).toBe('');
  });

  it('does not load a staff-wide student directory without a selected class', async () => {
    await expect(loadStudentOptions({ role: 'school_admin' })).resolves.toEqual([]);
  });

  it('does not fall through unknown roles to privileged student APIs', async () => {
    await expect(loadStudentOptions({ role: 'unknown_role' }, { classId: 'class-1' }))
      .resolves.toEqual([]);
  });
});
