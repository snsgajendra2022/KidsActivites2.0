import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, UserRound } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { listStudentsForRelationships } from '../../services/studentDirectoryService.js';
import { getEnrolledStudents } from '../../services/enrollmentService.js';
import { buildMappedStopFromStudent } from '../../services/transportAddressService.js';

function studentOptionLabel(student) {
  const name = student.fullName || student.name || student.studentName || student.applicationNo || student.id;
  const klass = student.classApplying || student.className || student.class?.name || '';
  return klass ? `${name} · ${klass}` : String(name);
}

/**
 * Multi-select enrolled students (all classes) → application addresses → route map stops.
 * Independent of class selection — loads the full enrolled student list.
 */
export default function StudentApplicationStopPicker({
  existingStops = [],
  onAddStops,
  searchBias = null,
}) {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.resolve()
      .then(async () => {
        // Full enrolled roster for route building (not class-scoped).
        let list = await listStudentsForRelationships({ status: 'active' });
        if (!Array.isArray(list) || list.length === 0) {
          list = await getEnrolledStudents();
        }
        return list || [];
      })
      .then((list) => {
        if (cancelled) return;
        const options = (list || [])
          .map((student) => {
            const id = String(student.id || student.studentId || '');
            if (!id) return null;
            return {
              value: id,
              label: studentOptionLabel(student),
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.label.localeCompare(b.label));
        setStudents(options);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

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
    if (!q) return students;
    return students.filter((student) => student.label.toLowerCase().includes(q));
  }, [students, query]);

  const selectableFiltered = filtered.filter((student) => !alreadyOnRoute.has(student.value));
  const allFilteredSelected = selectableFiltered.length > 0
    && selectableFiltered.every((student) => selectedIds.includes(student.value));

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
      const label = students.find((student) => student.value === studentId)?.label || studentId;
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
      toast(`Added ${added.length}, failed ${failed.length} (missing/invalid application address).`, 'warning');
    } else {
      setProgress(failed[0]?.message || 'No stops added. Check application addresses.');
      toast('No stops added. Students need a complete application address.', 'error');
    }
    setAdding(false);
  };

  return (
    <div className="rounded-xl border border-[#d0d5dd] bg-[#f8f9ff] p-4">
      <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-[#0b1c30]">
        <UserRound size={16} className="text-[#0058be]" />
        Add stops from student applications
      </h4>
      <p className="mb-3 text-xs text-[#667085]">
        All enrolled students are listed. Select multiple students at once — each application address becomes a map stop on this route.
      </p>

      <div className="mb-3">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-[#c5c6cd] bg-white px-3 focus-within:border-[#0058be]">
          <Search size={14} className="shrink-0 text-[#667085]" aria-hidden />
          <input
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
            placeholder="Search student name…"
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
          disabled={loading || selectableFiltered.length === 0}
        >
          {allFilteredSelected ? 'Clear filtered' : 'Select all filtered'}
        </button>
        <span className="text-xs text-[#667085]">
          {selectedIds.length} selected · {students.length} students
        </span>
      </div>

      <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-[#d0d5dd] bg-white p-2">
        {loading ? (
          <p className="px-2 py-3 text-sm text-[#667085]">Loading all enrolled students…</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-3 text-sm text-[#667085]">No students found.</p>
        ) : filtered.map((student) => {
          const onRoute = alreadyOnRoute.has(student.value);
          const checked = selectedIds.includes(student.value);
          return (
            <label
              key={student.value}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                onRoute ? 'opacity-50' : 'hover:bg-[#eef4ff]'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#c5c6cd]"
                checked={checked || onRoute}
                disabled={onRoute || adding}
                onChange={() => toggleOne(student.value)}
              />
              <span className="min-w-0 flex-1 truncate text-[#0b1c30]">{student.label}</span>
              {onRoute ? <span className="text-[10px] font-bold uppercase text-emerald-700">On route</span> : null}
            </label>
          );
        })}
      </div>

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

      {progress ? (
        <p className="mt-2 text-xs font-medium text-[#344054]">{progress}</p>
      ) : null}
    </div>
  );
}
