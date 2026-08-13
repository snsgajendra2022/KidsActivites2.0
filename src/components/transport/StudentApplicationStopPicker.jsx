import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, UserRound } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClassStudentOptions } from '../../hooks/useClassStudentOptions.js';
import { buildMappedStopFromStudent, fetchStudentTransportContext } from '../../services/transportAddressService.js';

/**
 * Class → roster picker. Selected students become map stops from enrollment address.
 * Never loads the full school directory.
 */
export default function StudentApplicationStopPicker({
  existingStops = [],
  onAddStops,
  searchBias = null,
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [classId, setClassId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [progress, setProgress] = useState('');
  const [addressByStudent, setAddressByStudent] = useState({});

  const {
    classOptions,
    studentOptions,
    classesLoading,
    studentsLoading,
    classesError,
    studentsError,
  } = useClassStudentOptions(user, classId, { loadStudents: Boolean(classId) });

  useEffect(() => {
    setSelectedIds([]);
    setQuery('');
    setAddressByStudent({});
    setProgress('');
  }, [classId]);

  const alreadyOnRoute = useMemo(() => {
    const set = new Set(
      (existingStops || [])
        .map((stop) => (stop.studentId ? String(stop.studentId) : ''))
        .filter(Boolean),
    );
    return set;
  }, [existingStops]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return studentOptions;
    return studentOptions.filter((student) => student.label.toLowerCase().includes(q));
  }, [studentOptions, query]);

  const selectableFiltered = filtered.filter((student) => !alreadyOnRoute.has(student.value));
  const allFilteredSelected = selectableFiltered.length > 0
    && selectableFiltered.every((student) => selectedIds.includes(student.value));

  useEffect(() => {
    let cancelled = false;
    const ids = selectedIds.filter(Boolean);
    if (!ids.length) {
      setAddressByStudent({});
      return undefined;
    }
    Promise.all(ids.map(async (studentId) => {
      try {
        const ctx = await fetchStudentTransportContext(studentId);
        return [studentId, ctx];
      } catch {
        return [studentId, null];
      }
    })).then((entries) => {
      if (cancelled) return;
      const next = {};
      entries.forEach(([id, ctx]) => {
        if (ctx) next[id] = ctx;
      });
      setAddressByStudent(next);
    });
    return () => { cancelled = true; };
  }, [selectedIds]);

  const toggleOne = (id) => {
    if (alreadyOnRoute.has(id)) return;
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    ));
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(selectableFiltered.map((student) => student.value));
      setSelectedIds((current) => current.filter((id) => !filteredSet.has(id)));
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      selectableFiltered.forEach((student) => next.add(student.value));
      return [...next];
    });
  };

  const handleAddSelected = async () => {
    const ids = selectedIds.filter((id) => !alreadyOnRoute.has(id));
    if (!ids.length) {
      toast('Select one or more students to add.', 'warning');
      return;
    }

    setAdding(true);
    setProgress(`Adding 0/${ids.length}…`);
    const added = [];
    const failed = [];

    for (let index = 0; index < ids.length; index += 1) {
      const studentId = ids[index];
      const label = studentOptions.find((student) => student.value === studentId)?.label
        || addressByStudent[studentId]?.fullName
        || studentId;
      setProgress(`Adding ${index + 1}/${ids.length}: ${label}`);
      try {
        const result = await buildMappedStopFromStudent(studentId, {
          latitude: searchBias?.lat,
          longitude: searchBias?.lng,
        });
        added.push(result.stop);
      } catch (err) {
        failed.push({ studentId, label, message: err?.message || 'Failed' });
      }
    }

    if (added.length) {
      onAddStops?.(added);
    }

    setSelectedIds([]);
    if (added.length && !failed.length) {
      setProgress(`Added ${added.length} student stop${added.length === 1 ? '' : 's'} to the route.`);
      toast(`Added ${added.length} student home stop(s) to the map.`, 'success');
    } else if (added.length && failed.length) {
      setProgress(`Added ${added.length}. Failed ${failed.length}: ${failed.map((item) => item.label).join(', ')}`);
      toast(`Added ${added.length}, failed ${failed.length} (missing/invalid enrollment address).`, 'warning');
    } else {
      setProgress(failed[0]?.message || 'No stops added. Check enrollment addresses.');
      toast('No stops added. Students need a complete enrollment address.', 'error');
    }
    setAdding(false);
  };

  const selectedPreview = selectedIds
    .map((id) => addressByStudent[id])
    .filter(Boolean);

  return (
    <div className="rounded-xl border border-[#d0d5dd] bg-[#f8f9ff] p-4">
      <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-[#0b1c30]">
        <UserRound size={16} className="text-[#0058be]" />
        Add stops from enrolled students
      </h4>
      <p className="mb-3 text-xs text-[#667085]">
        Select a class, then students in that class. Each student&apos;s enrollment address becomes a map stop.
        Other classes and unassigned students are not listed.
      </p>

      <div className="mb-3">
        <Select
          label="Class"
          required
          value={classId}
          options={classOptions}
          placeholder={classesLoading ? 'Loading classes…' : 'Select class'}
          disabled={classesLoading}
          error={classesError || undefined}
          onChange={(event) => setClassId(event.target.value)}
        />
      </div>

      {!classId ? (
        <p className="rounded-lg border border-dashed border-[#c5c6cd] bg-white px-3 py-3 text-sm text-[#667085]">
          Select a class to see that class roster. Students from other classes are hidden.
        </p>
      ) : (
        <>
          <div className="mb-3">
            <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-[#c5c6cd] bg-white px-3 focus-within:border-[#0058be]">
              <Search size={14} className="shrink-0 text-[#667085]" aria-hidden />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                placeholder="Search student in this class…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs font-semibold text-[#0058be]"
              onClick={toggleAllFiltered}
              disabled={studentsLoading || selectableFiltered.length === 0}
            >
              {allFilteredSelected ? 'Clear filtered' : 'Select all in this class'}
            </button>
            <span className="text-xs text-[#667085]">
              {selectedIds.length} selected · {studentOptions.length} in class
            </span>
          </div>

          <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-[#d0d5dd] bg-white p-2">
            {studentsLoading ? (
              <p className="px-2 py-3 text-sm text-[#667085]">Loading class roster…</p>
            ) : studentsError ? (
              <p className="px-2 py-3 text-sm text-[#b42318]">{studentsError}</p>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[#667085]">No students in this class.</p>
            ) : filtered.map((student) => {
              const onRoute = alreadyOnRoute.has(student.value);
              const checked = selectedIds.includes(student.value);
              const ctx = addressByStudent[student.value];
              return (
                <label
                  key={student.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
                    onRoute ? 'opacity-50' : 'hover:bg-[#eef4ff]'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-[#c5c6cd]"
                    checked={checked || onRoute}
                    disabled={onRoute || adding}
                    onChange={() => toggleOne(student.value)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#0b1c30]">{student.label}</span>
                    {ctx?.addressLabel ? (
                      <span className="mt-0.5 block truncate text-[11px] text-[#667085]">
                        {ctx.addressLabel}
                      </span>
                    ) : null}
                  </span>
                  {onRoute ? <span className="text-[10px] font-bold uppercase text-emerald-700">On route</span> : null}
                </label>
              );
            })}
          </div>

          {selectedPreview.length > 0 ? (
            <div className="mt-3 rounded-lg border border-[#c5d0e0] bg-white px-3 py-2 text-xs text-[#344054]">
              <p className="font-semibold text-[#0b1c30]">Selected pickup address</p>
              {selectedPreview.map((ctx) => (
                <p key={ctx.studentId} className="mt-1">
                  <span className="font-semibold">{ctx.fullName || 'Student'}</span>
                  {' · '}
                  {ctx.addressComplete ? ctx.addressLabel : 'Enrollment address missing'}
                </p>
              ))}
            </div>
          ) : null}

          <Button
            type="button"
            className="mt-3 w-full"
            loading={adding}
            disabled={!selectedIds.length}
            onClick={handleAddSelected}
          >
            <MapPin size={14} />
            Add {selectedIds.length || ''} selected to map
          </Button>
        </>
      )}

      {progress ? (
        <p className="mt-2 text-xs font-medium text-[#344054]">{progress}</p>
      ) : null}
    </div>
  );
}
