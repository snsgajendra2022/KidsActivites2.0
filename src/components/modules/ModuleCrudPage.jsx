import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout.jsx';
import AppLayout from '../layout/AppLayout.jsx';
import PageTransition from '../ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader, SearchField } from '../ui/index.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import Modal, { ConfirmModal } from '../ui/Modal.jsx';
import { ResponsiveDataTable, TableActionButton } from '../ui/DataTable.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { findOption } from '../../services/schoolModules/relationshipOptions.js';
import '../../styles/admin-modules.css';
const EMPTY_LIST_FILTERS = Object.freeze({});

function isFieldVisible(field, form, user, editing) {
  if (typeof field.visibleWhen === 'function') {
    return field.visibleWhen({ form, user, editing });
  }
  return field.visible !== false;
}

function FieldControl({
  field,
  value,
  form,
  onChange,
  options = [],
  loadingOptions = false,
}) {
  if (field.type === 'textarea') {
    return (
      <Textarea
        label={field.label}
        required={field.required}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        disabled={field.disabled}
      />
    );
  }

  if (field.type === 'select' || field.type === 'entity') {
    const disabled = field.disabled
      || loadingOptions
      || (field.dependsOn && !form[field.dependsOn]);
    return (
      <div>
        <Select
          label={field.label}
          required={field.required}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          options={field.type === 'entity' ? options : (field.options || [])}
          placeholder={
            loadingOptions
              ? 'Loading…'
              : (field.placeholder || `Select ${field.label.toLowerCase()}`)
          }
          disabled={disabled}
        />
        {field.helpText && (
          <p className="mt-1 text-xs text-[#667085]">{field.helpText}</p>
        )}
        {field.dependsOn && !form[field.dependsOn] && (
          <p className="mt-1 text-xs text-amber-700">
            Select {field.dependsOnLabel || 'the parent field'} first.
          </p>
        )}
      </div>
    );
  }

  if (field.type === 'multiselect') {
    const disabled = field.disabled
      || loadingOptions
      || (field.dependsOn && !form[field.dependsOn]);
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="form-label">
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>
          {options.length > 0 && !disabled && (
            <button
              type="button"
              className="text-xs font-semibold text-[#0058be]"
              onClick={() => {
                const allSelected = selected.length === options.length;
                onChange(allSelected ? [] : options.map((option) => option.value));
              }}
            >
              {selected.length === options.length ? 'Clear all' : 'Select all'}
            </button>
          )}
        </div>
        {loadingOptions ? (
          <p className="rounded-lg border border-[#c5c6cd] bg-[#f8f9ff] px-3 py-3 text-sm text-[#667085]">
            Loading students…
          </p>
        ) : options.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#c5c6cd] bg-[#f8f9ff] px-3 py-3 text-sm text-[#667085]">
            {field.emptyText || 'No related records available.'}
          </p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-[#c5c6cd] bg-[#f8f9ff] p-3">
            {options.map((option) => {
              const checked = selected.includes(String(option.value));
              return (
                <label key={option.value} className="flex items-center gap-2 text-sm text-[#0b1c30]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#c5c6cd]"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onChange([...selected, String(option.value)]);
                      } else {
                        onChange(selected.filter((id) => id !== String(option.value)));
                      }
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        )}
        {field.helpText && (
          <p className="mt-1 text-xs text-[#667085]">{field.helpText}</p>
        )}
      </div>
    );
  }

  return (
    <Input
      label={field.label}
      required={field.required}
      type={field.type || 'text'}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      disabled={field.disabled}
    />
  );
}

/**
 * Reusable CRUD module page used across school ERP modules.
 * Supports static selects, async entity selectors, dependent fields, and multiselects.
 */
export default function ModuleCrudPage({
  title,
  subtitle,
  service,
  columns,
  fields,
  emptyTitle = 'No records yet',
  emptyDescription = 'Create the first record to get started.',
  createLabel = 'Add Record',
  layout = 'dashboard',
  transformCreate,
  searchKeys = [],
  readOnly = false,
  headerActions = null,
  listFilters = EMPTY_LIST_FILTERS,
  /** Optional override for table row actions. Receives (item, helpers). */
  renderRowActions,
  hideCreate = false,
}) {
  const Layout = layout === 'app' ? AppLayout : DashboardLayout;
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [optionMap, setOptionMap] = useState({});
  const [optionLoading, setOptionLoading] = useState({});
  const optionRequestRef = useRef({});

  const visibleFields = useMemo(
    () => fields.filter((field) => isFieldVisible(field, form, user, editing)),
    [fields, form, user, editing],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = typeof listFilters === 'function' ? listFilters(user) : listFilters;
      setItems(await service.list(filters || {}));
    } catch (err) {
      toast(err?.message || 'Unable to load records.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [service, toast, listFilters, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch module data on mount
    load();
  }, [load]);

  const loadFieldOptions = useCallback(async (field, currentForm) => {
    if (field.type !== 'entity' && field.type !== 'multiselect') return;
    if (typeof field.loadOptions !== 'function') return;
    if (field.dependsOn && !currentForm[field.dependsOn]) {
      optionRequestRef.current[field.key] = (optionRequestRef.current[field.key] || 0) + 1;
      setOptionMap((prev) => ({ ...prev, [field.key]: [] }));
      setOptionLoading((prev) => ({ ...prev, [field.key]: false }));
      return;
    }

    const requestId = (optionRequestRef.current[field.key] || 0) + 1;
    optionRequestRef.current[field.key] = requestId;
    setOptionLoading((prev) => ({ ...prev, [field.key]: true }));
    try {
      const options = await field.loadOptions(currentForm, user) || [];
      if (optionRequestRef.current[field.key] !== requestId) return;
      setOptionMap((prev) => ({ ...prev, [field.key]: options }));
    } catch (err) {
      if (optionRequestRef.current[field.key] !== requestId) return;
      toast(err?.message || `Unable to load ${field.label}.`, 'error');
      setOptionMap((prev) => ({ ...prev, [field.key]: [] }));
    } finally {
      if (optionRequestRef.current[field.key] === requestId) {
        setOptionLoading((prev) => ({ ...prev, [field.key]: false }));
      }
    }
  }, [toast, user]);

  const dependencyKey = useMemo(() => (
    visibleFields
      .filter((field) => field.type === 'entity' || field.type === 'multiselect')
      .map((field) => `${field.key}:${form[field.dependsOn] || ''}`)
      .join('|')
  ), [visibleFields, form]);

  useEffect(() => {
    if (!modalOpen) return;
    visibleFields.forEach((field) => {
      if (field.type === 'entity' || field.type === 'multiselect') {
        void loadFieldOptions(field, form);
      }
    });
    // Only reload when modal opens or parent dependency values change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependencyKey gate
  }, [modalOpen, dependencyKey, loadFieldOptions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    const keys = searchKeys.length
      ? searchKeys
      : columns.map((column) => column.key).filter(Boolean);
    return items.filter((item) => keys.some((key) => String(item[key] || '').toLowerCase().includes(query)));
  }, [items, search, searchKeys, columns]);

  const kpiCards = useMemo(() => {
    const statusKey = columns.find((col) => col.badge && col.key)?.key
      || (columns.some((col) => col.key === 'status') ? 'status' : null);
    const cards = [
      { label: 'Total', value: items.length, hint: 'All records' },
      { label: 'Showing', value: filtered.length, hint: search.trim() ? 'Match search' : 'Current list' },
    ];
    if (statusKey) {
      const counts = {};
      items.forEach((item) => {
        const raw = String(item[statusKey] || 'other').toLowerCase();
        counts[raw] = (counts[raw] || 0) + 1;
      });
      const ranked = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);
      ranked.forEach(([key, count]) => {
        cards.push({
          label: key.replace(/_/g, ' '),
          value: count,
          hint: 'By status',
        });
      });
    } else {
      cards.push(
        { label: 'Editable', value: readOnly ? 0 : items.length, hint: readOnly ? 'Read only' : 'Can update' },
        { label: 'Fields', value: fields.length, hint: 'Form fields' },
      );
    }
    return cards.slice(0, 4);
  }, [columns, fields.length, filtered.length, items, readOnly, search]);
  const buildDefaults = () => {
    const defaults = {};
    fields.forEach((field) => {
      if (field.type === 'multiselect') {
        defaults[field.key] = field.defaultValue ?? [];
      } else {
        defaults[field.key] = field.defaultValue ?? '';
      }
    });
    return defaults;
  };

  const openCreate = () => {
    setEditing(null);
    setForm(buildDefaults());
    setOptionMap({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    const next = {};
    fields.forEach((field) => {
      if (field.type === 'multiselect') {
        const raw = item[field.key] ?? field.defaultValue ?? [];
        next[field.key] = Array.isArray(raw) ? raw.map(String) : [];
      } else {
        next[field.key] = item[field.key] ?? field.defaultValue ?? '';
      }
    });
    setEditing(item);
    setForm(next);
    setOptionMap({});
    setModalOpen(true);
  };

  const handleFieldChange = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field.key]: value };
      const selected = findOption(optionMap[field.key] || field.options || [], value);

      if (selected?.meta && field.syncMeta !== false) {
        Object.entries(selected.meta).forEach(([metaKey, metaValue]) => {
          if (metaKey === field.key) return;
          if (fields.some((candidate) => candidate.key === metaKey) || field.metaKeys?.includes(metaKey)) {
            next[metaKey] = metaValue;
          }
        });
      }

      (field.clears || []).forEach((clearKey) => {
        const clearField = fields.find((candidate) => candidate.key === clearKey);
        next[clearKey] = clearField?.type === 'multiselect' ? [] : '';
      });

      // A dependent entity can never remain selected after its parent changes.
      fields
        .filter((candidate) => candidate.dependsOn === field.key)
        .forEach((dependent) => {
          next[dependent.key] = dependent.type === 'multiselect' ? [] : '';
          (dependent.metaKeys || []).forEach((metaKey) => {
            next[metaKey] = '';
          });
        });

      return next;
    });
  };

  const handleSave = async () => {
    for (const field of visibleFields) {
      if (!field.required) continue;
      const current = form[field.key];
      if (field.type === 'multiselect') {
        if (!Array.isArray(current) || current.length === 0) {
          toast(`${field.label} is required.`, 'warning');
          return;
        }
      } else if (!String(current ?? '').trim()) {
        toast(`${field.label} is required.`, 'warning');
        return;
      }
    }

    if (typeof fields.find((field) => field.validate)?.validate === 'function') {
      // no-op placeholder for typed fields
    }
    for (const field of visibleFields) {
      if (typeof field.validate === 'function') {
        const message = field.validate(form[field.key], form, { user, editing });
        if (message) {
          toast(message, 'warning');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = transformCreate
        ? await transformCreate(form, editing, { user })
        : form;
      if (editing) {
        await service.update(editing.id, payload);
        toast('Record updated.', 'success');
      } else {
        await service.create(payload);
        toast('Record created.', 'success');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to save record.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await service.remove(deleteId);
      toast('Record deleted.', 'success');
      setDeleteId(null);
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to delete record.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={(
            <div className="flex flex-wrap gap-2">
              {headerActions}
              {!readOnly && !hideCreate && (
                <Button onClick={openCreate}>
                  <Plus size={16} /> {createLabel}
                </Button>
              )}
            </div>
          )}
        />

        <div className="admin-record-toolbar">
          <SearchField
            className="admin-record-search min-w-[200px] flex-1"
            maxWidthClass=""
            placeholder="Search records…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {!loading && items.length > 0 && (
          <div className="admin-record-kpi">
            {kpiCards.map((card) => (
              <div key={card.label} className="admin-record-kpi__card">
                <p className="admin-record-kpi__label">{card.label}</p>
                <p className="admin-record-kpi__value">{card.value}</p>
                <p className="admin-record-kpi__hint">{card.hint}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading module data…" />
        ) : items.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={!readOnly && !hideCreate ? <Button onClick={openCreate}>{createLabel}</Button> : null}
          />
        ) : (
          <ResponsiveDataTable
            layout="cards"
            columns={columns}
            data={filtered}
            emptyMessage="No records match your search."
            minWidth={860}
            renderActions={readOnly && !renderRowActions ? undefined : ((item) => {
              if (typeof renderRowActions === 'function') {
                return renderRowActions(item, {
                  openEdit,
                  requestDelete: (id) => setDeleteId(id),
                  reload: load,
                });
              }
              return (
                <>
                  <TableActionButton variant="outline" onClick={() => openEdit(item)}>Edit</TableActionButton>
                  <TableActionButton variant="danger" onClick={() => setDeleteId(item.id)}>
                    <Trash2 size={14} /> Delete
                  </TableActionButton>
                </>
              );
            })}
          />
        )}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? `Edit ${title}` : createLabel}
          size="lg"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button loading={saving} onClick={handleSave}>Save</Button>
            </>
          )}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {visibleFields.map((field) => (
              <div key={field.key} className={field.fullWidth ? 'md:col-span-2' : undefined}>
                <FieldControl
                  field={field}
                  value={form[field.key]}
                  form={form}
                  options={optionMap[field.key] || field.options || []}
                  loadingOptions={Boolean(optionLoading[field.key])}
                  onChange={(value) => handleFieldChange(field, value)}
                />
              </div>
            ))}
          </div>
        </Modal>

        <ConfirmModal
          open={Boolean(deleteId)}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Delete record?"
          message="This action cannot be undone."
          confirmText="Delete"
          confirmVariant="danger"
          loading={saving}
        />
      </PageTransition>
    </Layout>
  );
}
