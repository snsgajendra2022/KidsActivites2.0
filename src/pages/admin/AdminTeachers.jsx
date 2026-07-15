import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  Mail,
  Phone,
  Plus,
  BookOpen,
  Pencil,
  Users,
  UserCheck,
  UserX,
  SearchX,
  Layers,
  Sparkles,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import ToggleSwitch from '../../components/ui/ToggleSwitch.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import {
  listTeachers,
  createTeacher,
  updateTeacher,
  deactivateTeacher,
  assignTeacherClasses,
  getAssignableClassOptions,
} from '../../services/teacherService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLES } from '../../constants/roles.js';
import '../../styles/admin-users.css';
import '../../styles/admin-modules.css';
import '../../styles/admin-teachers.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  mobile: '',
  employeeId: '',
  subjects: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;

function sanitizeMobile(value = '') {
  return String(value).replace(/\D/g, '').slice(0, 10);
}

function validateTeacherForm(form) {
  const errors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const mobile = sanitizeMobile(form.mobile);

  if (!name) {
    errors.name = 'Full name is required.';
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (mobile && !MOBILE_PATTERN.test(mobile)) {
    errors.mobile = 'Enter a valid 10-digit mobile starting with 6–9.';
  }

  return errors;
}

function teacherInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'T';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function TeacherCardSkeleton() {
  return (
    <div className="admin-teacher-card-skeleton" aria-hidden>
      <div className="admin-teacher-card-skeleton__bar" />
      <div className="admin-teacher-card-skeleton__body">
        <div className="admin-teacher-card-skeleton__head">
          <div className="admin-teacher-card-skeleton__avatar" />
          <div className="admin-teacher-card-skeleton__lines">
            <div className="admin-teacher-card-skeleton__line admin-teacher-card-skeleton__line--md" />
            <div className="admin-teacher-card-skeleton__line admin-teacher-card-skeleton__line--sm" />
          </div>
        </div>
        <div className="admin-teacher-card-skeleton__line admin-teacher-card-skeleton__line--lg" />
        <div className="admin-teacher-card-skeleton__tags">
          <div className="admin-teacher-card-skeleton__pill" />
          <div className="admin-teacher-card-skeleton__pill" />
          <div className="admin-teacher-card-skeleton__pill" />
        </div>
        <div className="admin-teacher-card-skeleton__line admin-teacher-card-skeleton__line--md" />
      </div>
    </div>
  );
}

function TeacherCard({ teacher, onEdit, onAssign, onDeactivate }) {
  const inactive = teacher.status !== 'active';
  const subjects = teacher.subjects || [];
  const classes = teacher.classesAssigned || [];

  return (
    <article className={`admin-teacher-card${inactive ? ' admin-teacher-card--inactive' : ''}`}>
      <div className="admin-teacher-card__inner">
        <div className="admin-teacher-card__head">
          <div className="admin-teacher-card__avatar-wrap">
            <div className="admin-teacher-card__avatar" aria-hidden>
              {teacherInitials(teacher.name)}
            </div>
            <span
              className="admin-teacher-card__status-dot"
              title={inactive ? 'Inactive' : 'Active'}
              aria-hidden
            />
          </div>
          <div className="admin-teacher-card__meta">
            <div className="admin-teacher-card__name-row">
              <h2 className="admin-teacher-card__name">{teacher.name}</h2>
              <span className={`admin-badge admin-teacher-card__badge ${inactive ? 'admin-badge--muted' : 'admin-badge--success'}`}>
                {inactive ? 'Inactive' : 'Active'}
              </span>
            </div>
            {teacher.employeeId && (
              <p className="admin-teacher-card__employee">Staff ID · {teacher.employeeId}</p>
            )}
          </div>
        </div>

        <div className="admin-teacher-card__contact">
          <div className="admin-teacher-card__contact-item" title={teacher.email}>
            <span className="admin-teacher-card__contact-icon">
              <Mail size={13} aria-hidden />
            </span>
            <span>{teacher.email}</span>
          </div>
          {teacher.mobile ? (
            <div className="admin-teacher-card__contact-item">
              <span className="admin-teacher-card__contact-icon">
                <Phone size={13} aria-hidden />
              </span>
              <span>{teacher.mobile}</span>
            </div>
          ) : null}
        </div>

        <div className="admin-teacher-card__sections">
          <div className="admin-teacher-card__section">
            <p className="admin-teacher-card__section-label">
              <Sparkles size={11} aria-hidden />
              Subjects
            </p>
            <div className="admin-teacher-card__tags">
              {subjects.length ? subjects.map((subject) => (
                <span key={subject} className="admin-teacher-card__tag">{subject}</span>
              )) : (
                <span className="admin-teacher-card__tag admin-teacher-card__tag--empty">No subjects listed</span>
              )}
            </div>
          </div>

          <div className="admin-teacher-card__section">
            <p className="admin-teacher-card__section-label">
              <Layers size={11} aria-hidden />
              Classes
            </p>
            <div className="admin-teacher-card__tags">
              {classes.length ? classes.map((className) => (
                <span key={className} className="admin-teacher-card__tag admin-teacher-card__tag--class">{className}</span>
              )) : (
                <span className="admin-teacher-card__tag admin-teacher-card__tag--empty">No classes assigned</span>
              )}
            </div>
          </div>
        </div>

        <div className="admin-teacher-card__actions">
          <button
            type="button"
            className="admin-teacher-card__action-btn admin-teacher-card__action-btn--primary admin-teacher-card__action-primary"
            onClick={() => onEdit(teacher)}
          >
            <Pencil size={15} aria-hidden />
            Edit Profile
          </button>
          <button
            type="button"
            className="admin-teacher-card__action-btn admin-teacher-card__action-btn--secondary"
            onClick={() => onAssign(teacher)}
          >
            <BookOpen size={15} aria-hidden />
            Classes
          </button>
          {teacher.status === 'active' && (
            <button
              type="button"
              className="admin-teacher-card__action-btn admin-teacher-card__action-btn--danger"
              onClick={() => onDeactivate(teacher)}
            >
              <UserX size={15} aria-hidden />
              Deactivate
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ClassPillPicker({ classOptions, classSelection, onToggle, emptyMessage }) {
  if (classOptions.length === 0) {
    return <p className="admin-teacher-form__empty-hint">{emptyMessage}</p>;
  }

  return (
    <div className="admin-teacher-form__pills" role="group" aria-label="Assigned classes">
      {classOptions.map((className) => {
        const selected = classSelection.includes(className);
        return (
          <button
            key={className}
            type="button"
            className={`admin-teacher-pill${selected ? ' admin-teacher-pill--selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onToggle(className)}
          >
            {className}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminTeachers() {
  const { user } = useAuth();
  const { activeSchoolId, school, isPlatformAdmin } = usePortalConfig();
  const { tenantSlug } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [classSelection, setClassSelection] = useState([]);
  const [tempPassword, setTempPassword] = useState(null);
  const [classOptions, setClassOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formActive, setFormActive] = useState(true);

  const schoolId = user?.role === ROLES.SUPER_ADMIN
    ? activeSchoolId
    : (user?.schoolId || activeSchoolId);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    getAssignableClassOptions().then(setClassOptions).catch(() => setClassOptions([]));
  }, []);

  const { data: teachers = [], isLoading, isFetching } = useQuery({
    queryKey: ['admin-teachers', tenantSlug, schoolId, search, statusFilter],
    queryFn: () => listTeachers({ schoolId, search, status: statusFilter }, user),
    enabled: Boolean(schoolId),
    staleTime: 20_000,
  });

  const stats = useMemo(() => ({
    total: teachers.length,
    active: teachers.filter((t) => t.status === 'active').length,
    inactive: teachers.filter((t) => t.status !== 'active').length,
  }), [teachers]);

  const refreshTeachers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
  }, [queryClient]);

  const closeModal = () => {
    setModal(null);
    setForm(EMPTY_FORM);
    setSelected(null);
    setClassSelection([]);
    setTempPassword(null);
    setFormErrors({});
    setFormActive(true);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setClassSelection([]);
    setFormErrors({});
    setFormActive(true);
    setModal('create');
  };

  const openEdit = (teacher) => {
    setSelected(teacher);
    setForm({
      name: teacher.name || '',
      email: teacher.email || '',
      mobile: sanitizeMobile(teacher.mobile || ''),
      employeeId: teacher.employeeId || '',
      subjects: (teacher.subjects || []).join(', '),
    });
    setClassSelection(teacher.classesAssigned || []);
    setFormActive(teacher.status === 'active');
    setFormErrors({});
    setModal('edit');
  };

  const openAssign = (teacher) => {
    setSelected(teacher);
    setClassSelection(teacher.classesAssigned || []);
    setModal('assign');
  };

  const openDeactivate = (teacher) => {
    setSelected(teacher);
    setModal('deactivate');
  };

  const handleCreate = async () => {
    const errors = validateTeacherForm(form);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      toast('Please fix the highlighted fields.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const result = await createTeacher({
        schoolId,
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: sanitizeMobile(form.mobile) || undefined,
        employeeId: form.employeeId.trim() || undefined,
        subjects: form.subjects.split(',').map((s) => s.trim()).filter(Boolean),
        classesAssigned: classSelection,
      }, user);
      setTempPassword(result?.tempPassword || null);
      refreshTeachers();
      toast('Teacher account created.', 'success');
      setModal('created');
    } catch (err) {
      toast(err.message || 'Failed to create teacher.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    const errors = validateTeacherForm(form);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      toast('Please fix the highlighted fields.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateTeacher(selected.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: sanitizeMobile(form.mobile) || null,
        employeeId: form.employeeId.trim() || null,
        subjects: form.subjects.split(',').map((s) => s.trim()).filter(Boolean),
        classesAssigned: classSelection,
        active: formActive,
      }, user);
      refreshTeachers();
      toast('Teacher updated.', 'success');
      closeModal();
    } catch (err) {
      toast(err.message || 'Failed to update teacher.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setSaving(true);
    try {
      await deactivateTeacher(selected.id, user);
      refreshTeachers();
      toast('Teacher deactivated.', 'success');
      closeModal();
    } catch (err) {
      toast(err.message || 'Failed to deactivate teacher.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignClasses = async () => {
    setSaving(true);
    try {
      await assignTeacherClasses(selected.id, classSelection, user);
      refreshTeachers();
      toast('Classes assigned.', 'success');
      closeModal();
    } catch (err) {
      toast(err.message || 'Failed to assign classes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleClass = (className) => {
    setClassSelection((prev) => (
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    ));
  };

  const clearFieldError = (field) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const renderTeacherFields = () => (
    <div className="admin-teacher-form__grid">
      <Input
        label="Full Name"
        value={form.name}
        onChange={(e) => {
          setForm((f) => ({ ...f, name: e.target.value }));
          clearFieldError('name');
        }}
        error={formErrors.name}
        required
      />
      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => {
          setForm((f) => ({ ...f, email: e.target.value }));
          clearFieldError('email');
        }}
        error={formErrors.email}
        required
      />
      <Input
        label="Mobile"
        type="tel"
        inputMode="numeric"
        value={form.mobile}
        onChange={(e) => {
          setForm((f) => ({ ...f, mobile: sanitizeMobile(e.target.value) }));
          clearFieldError('mobile');
        }}
        placeholder="10-digit mobile"
        helper="Optional. Must start with 6–9."
        error={formErrors.mobile}
        maxLength={10}
      />
      <Input
        label="Employee ID"
        value={form.employeeId}
        onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
        placeholder="Optional staff ID"
      />
      <div className="admin-teacher-form__span-2">
        <Input
          label="Subjects"
          value={form.subjects}
          onChange={(e) => setForm((f) => ({ ...f, subjects: e.target.value }))}
          placeholder="English, Maths (comma-separated)"
          helper="Separate multiple subjects with commas."
        />
      </div>
    </div>
  );

  const renderClassSection = (emptyMessage, hint) => (
    <div className="admin-teacher-form__section">
      <div className="admin-teacher-form__section-head">
        <div>
          <p className="admin-teacher-form__section-label">Assigned Classes</p>
          {hint && <p className="admin-teacher-form__section-hint">{hint}</p>}
        </div>
        {classOptions.length > 0 && (
          <span className="admin-teacher-form__section-count">
            {classSelection.length} selected
          </span>
        )}
      </div>
      <ClassPillPicker
        classOptions={classOptions}
        classSelection={classSelection}
        onToggle={toggleClass}
        emptyMessage={emptyMessage}
      />
    </div>
  );

  const showInitialLoading = isLoading && !teachers.length;
  const hasFilters = Boolean(search) || statusFilter !== 'all';

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Teachers"
          subtitle={
            isPlatformAdmin
              ? `Teachers for ${school?.name || 'selected school'}. Switch school in Portal Branding.`
              : `Manage teachers at ${school?.name || 'your school'}.`
          }
          actions={(
            <Button variant="primary" onClick={openCreate} disabled={!schoolId}>
              <Plus size={16} className="mr-1.5" />
              Add Teacher
            </Button>
          )}
        />

        <div className="admin-users-filters">
          <Input
            placeholder="Search name, email, mobile…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="admin-users-filters__search"
          />
          <select
            className="admin-users-filters__select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {!showInitialLoading && teachers.length > 0 && (
          <div className="admin-teachers-stats">
            <BentoStatCard icon={Users} value={stats.total} label="Total Teachers" variant="indigo" />
            <BentoStatCard icon={UserCheck} value={stats.active} label="Active" variant="emerald" />
            <BentoStatCard icon={UserX} value={stats.inactive} label="Inactive" variant="rose" />
          </div>
        )}

        {showInitialLoading ? (
          <div className="admin-teachers-loading" aria-busy="true" aria-label="Loading teachers">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <TeacherCardSkeleton key={i} />
            ))}
          </div>
        ) : teachers.length === 0 && !hasFilters ? (
          <EmptyState
            icon={GraduationCap}
            title="No Teachers Yet"
            description="Add teacher accounts to let them manage classes, photos, and parent messages."
            action={(
              <Button variant="primary" onClick={openCreate} disabled={!schoolId}>
                Add Teacher
              </Button>
            )}
          />
        ) : (
          <div className="admin-teachers-grid">
            {teachers.length === 0 ? (
              <div className="admin-teachers-empty-filter">
                <div className="admin-teachers-empty-filter__icon">
                  <SearchX size={24} aria-hidden />
                </div>
                <p className="admin-teachers-empty-filter__title">No matching teachers</p>
                <p className="admin-teachers-empty-filter__desc">
                  Try adjusting your search or status filter to find the teacher you&apos;re looking for.
                </p>
              </div>
            ) : teachers.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onEdit={openEdit}
                onAssign={openAssign}
                onDeactivate={openDeactivate}
              />
            ))}
          </div>
        )}

        {isFetching && !showInitialLoading && (
          <p className="admin-teachers-refresh">Refreshing teachers…</p>
        )}

        <Modal
          open={modal === 'create'}
          onClose={closeModal}
          title="Add Teacher"
          size="lg"
          footer={(
            <>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleCreate}>
                Create Teacher
              </Button>
            </>
          )}
        >
          <div className="admin-teacher-form">
            <div className="admin-teacher-form__profile">
              <div className="admin-teacher-form__avatar" aria-hidden>
                {teacherInitials(form.name)}
              </div>
              <div className="admin-teacher-form__profile-meta">
                <p className="admin-teacher-form__profile-name">
                  {form.name.trim() || 'New Teacher'}
                </p>
                <p className="admin-teacher-form__profile-id">New account</p>
                <span className="admin-badge admin-badge--info">Draft</span>
              </div>
            </div>

            {renderTeacherFields()}
            {renderClassSection(
              'No classes configured yet. Add classes in Class Management first.',
              'Optional. You can assign or change classes later.',
            )}
          </div>
        </Modal>

        <Modal
          open={modal === 'edit'}
          onClose={closeModal}
          title="Edit Teacher"
          size="lg"
          footer={(
            <>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleUpdate}>
                Save Changes
              </Button>
            </>
          )}
        >
          <div className="admin-teacher-form">
            <div className="admin-teacher-form__profile">
              <div className="admin-teacher-form__avatar" aria-hidden>
                {teacherInitials(form.name || selected?.name)}
              </div>
              <div className="admin-teacher-form__profile-meta">
                <p className="admin-teacher-form__profile-name">
                  {form.name.trim() || selected?.name || 'Teacher'}
                </p>
                {selected?.employeeId && (
                  <p className="admin-teacher-form__profile-id">Staff ID · {selected.employeeId}</p>
                )}
                <span className={`admin-badge ${formActive ? 'admin-badge--success' : 'admin-badge--muted'}`}>
                  {formActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {renderTeacherFields()}
            {renderClassSection('No classes configured yet. Add classes in Class Management first.')}

            <div className="admin-teacher-form__status">
              <div>
                <span className="admin-teacher-form__status-label">Account Active</span>
                <span className="admin-teacher-form__status-desc">
                  {formActive
                    ? 'Teacher can sign in and manage classes.'
                    : 'Inactive teachers cannot sign in. Toggle on to reactivate.'}
                </span>
              </div>
              <ToggleSwitch
                checked={formActive}
                onChange={setFormActive}
                label="Account active"
              />
            </div>
          </div>
        </Modal>

        <Modal
          open={modal === 'assign'}
          onClose={closeModal}
          title="Assign Classes"
          size="lg"
          footer={(
            <>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleAssignClasses}>
                Save Classes
              </Button>
            </>
          )}
        >
          <div className="admin-teacher-assign">
            <div className="admin-teacher-assign__intro">
              <div className="admin-teacher-assign__avatar" aria-hidden>
                {teacherInitials(selected?.name)}
              </div>
              <div>
                <p className="admin-teacher-assign__name">{selected?.name || 'Teacher'}</p>
                <p className="admin-teacher-assign__email">{selected?.email}</p>
              </div>
            </div>

            <div className="admin-teacher-form__section-head">
              <div>
                <p className="admin-teacher-form__section-label">Select Classes</p>
                <p className="admin-teacher-form__section-hint">
                  Tap to toggle class assignments for this teacher.
                </p>
              </div>
              {classOptions.length > 0 && (
                <span className="admin-teacher-form__section-count">
                  {classSelection.length} selected
                </span>
              )}
            </div>

            <ClassPillPicker
              classOptions={classOptions}
              classSelection={classSelection}
              onToggle={toggleClass}
              emptyMessage="No classes configured yet. Add classes in Class Management first."
            />
          </div>
        </Modal>

        <Modal
          open={modal === 'created'}
          onClose={closeModal}
          title="Teacher Created"
          footer={<Button variant="primary" onClick={closeModal}>Done</Button>}
        >
          <div className="admin-teacher-created">
            <p className="admin-teacher-created__message">
              Share this temporary password with the teacher. They should change it after first login.
            </p>
            {tempPassword && (
              <div className="admin-teacher-created__password">
                <p className="admin-teacher-created__password-label">Temporary Password</p>
                <p className="admin-teacher-created__password-value">{tempPassword}</p>
              </div>
            )}
          </div>
        </Modal>

        <ConfirmModal
          open={modal === 'deactivate'}
          onClose={closeModal}
          onConfirm={handleDeactivate}
          title="Deactivate Teacher?"
          message={`${selected?.name || 'This teacher'} will no longer be able to sign in.`}
          confirmText="Deactivate"
          confirmVariant="danger"
          loading={saving}
        />
      </PageTransition>
    </AppLayout>
  );
}
