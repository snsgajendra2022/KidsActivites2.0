import { useEffect, useState } from 'react';
import {
  loadClassOptions,
  loadStudentOptions,
} from '../services/schoolModules/relationshipOptions.js';

/**
 * Loads role-scoped classes and, after class selection, only that class roster.
 * API failures are exposed to the form; no mock names or synthetic options are added.
 */
export function useClassStudentOptions(user, classId, { loadStudents = true } = {}) {
  const [classOptions, setClassOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [classesError, setClassesError] = useState('');
  const [studentsError, setStudentsError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return [];
        setClassesLoading(true);
        setClassesError('');
        return loadClassOptions(user);
      })
      .then((options) => {
        if (active) setClassOptions(Array.isArray(options) ? options : []);
      })
      .catch((error) => {
        if (!active) return;
        setClassOptions([]);
        setClassesError(error?.message || 'Unable to load classes.');
      })
      .finally(() => {
        if (active) setClassesLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return [];
        setStudentOptions([]);
        setStudentsError('');
        if (!loadStudents || !classId) {
          setStudentsLoading(false);
          return [];
        }
        setStudentsLoading(true);
        return loadStudentOptions(user, { classId });
      })
      .then((options) => {
        if (active) setStudentOptions(Array.isArray(options) ? options : []);
      })
      .catch((error) => {
        if (!active) return;
        setStudentOptions([]);
        setStudentsError(error?.message || 'Unable to load students for this class.');
      })
      .finally(() => {
        if (active) setStudentsLoading(false);
      });
    return () => { active = false; };
  }, [user, classId, loadStudents]);

  return {
    classOptions,
    studentOptions,
    classesLoading,
    studentsLoading,
    classesError,
    studentsError,
  };
}
