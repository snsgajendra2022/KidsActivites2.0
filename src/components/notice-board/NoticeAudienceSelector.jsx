import { useEffect, useState } from 'react';
import {
  AUDIENCE_ROLE_OPTIONS,
  AUDIENCE_TYPE_OPTIONS,
  NOTICE_AUDIENCE_TYPE,
} from '../../constants/notices.js';

function Chip({ label, selected, onClick }) {
  return (
    <button type="button" className={`notice-chip${selected ? ' is-selected' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

export default function NoticeAudienceSelector({ audience, onChange, options, disabled }) {
  const [local, setLocal] = useState(audience);

  useEffect(() => {
    setLocal(audience);
  }, [audience]);

  const update = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  const toggleArray = (key, value) => {
    const arr = local[key] || [];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    update({ [key]: next });
  };

  return (
    <section className="notice-audience">
      <header className="notice-audience__head">
        <h3>Audience</h3>
        <p>Choose exactly who should receive this notice.</p>
      </header>

      <div className="notice-audience__types">
        {AUDIENCE_TYPE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={local.type === opt.value}
            onClick={() => !disabled && update({
              type: opt.value,
              roles: [],
              classIds: [],
              sectionIds: [],
              teacherIds: [],
              parentIds: [],
              studentIds: [],
              groupIds: [],
              userIds: [],
            })}
          />
        ))}
      </div>

      {local.type === NOTICE_AUDIENCE_TYPE.SELECTED_ROLES && (
        <div className="notice-audience__section">
          <p className="notice-audience__label">Roles</p>
          <div className="notice-audience__chips">
            {AUDIENCE_ROLE_OPTIONS.map((r) => (
              <Chip key={r.value} label={r.label} selected={local.roles?.includes(r.value)} onClick={() => toggleArray('roles', r.value)} />
            ))}
          </div>
        </div>
      )}

      {local.type === NOTICE_AUDIENCE_TYPE.SELECTED_CLASSES && (
        <div className="notice-audience__section">
          <p className="notice-audience__label">Classes</p>
          <div className="notice-audience__chips">
            {(options?.classes || []).map((cls) => (
              <Chip key={cls.id} label={cls.name} selected={local.classIds?.includes(cls.id)} onClick={() => toggleArray('classIds', cls.id)} />
            ))}
          </div>
          <div className="notice-audience__toggles">
            <label><input type="checkbox" checked={local.includeParents} onChange={(e) => update({ includeParents: e.target.checked })} /> Include parents</label>
            <label><input type="checkbox" checked={local.includeTeachers} onChange={(e) => update({ includeTeachers: e.target.checked })} /> Include teachers</label>
          </div>
        </div>
      )}

      {local.type === NOTICE_AUDIENCE_TYPE.SELECTED_TEACHERS && (
        <div className="notice-audience__section">
          <p className="notice-audience__label">Teachers</p>
          <div className="notice-audience__chips">
            {(options?.teachers || []).map((t) => (
              <Chip key={t.id} label={t.name} selected={local.teacherIds?.includes(t.id)} onClick={() => toggleArray('teacherIds', t.id)} />
            ))}
          </div>
        </div>
      )}

      {local.type === NOTICE_AUDIENCE_TYPE.SELECTED_PARENTS && (
        <div className="notice-audience__section">
          <p className="notice-audience__label">Parents</p>
          <div className="notice-audience__chips">
            {(options?.parents || []).map((p) => (
              <Chip key={p.id} label={p.name} selected={local.parentIds?.includes(p.id)} onClick={() => toggleArray('parentIds', p.id)} />
            ))}
          </div>
        </div>
      )}

      {local.type === NOTICE_AUDIENCE_TYPE.CUSTOM_GROUP && (
        <div className="notice-audience__section">
          <p className="notice-audience__label">Groups</p>
          <div className="notice-audience__chips">
            {(options?.groups || []).map((g) => (
              <Chip key={g.id} label={`${g.name} (${g.memberCount})`} selected={local.groupIds?.includes(g.id)} onClick={() => toggleArray('groupIds', g.id)} />
            ))}
          </div>
        </div>
      )}

      {local.type === NOTICE_AUDIENCE_TYPE.MANUAL_USERS && (
        <div className="notice-audience__section">
          <p className="notice-audience__label">Users</p>
          <div className="notice-audience__chips">
            {(options?.users || []).map((u) => (
              <Chip key={u.id} label={`${u.name} (${u.role})`} selected={local.userIds?.includes(u.id)} onClick={() => toggleArray('userIds', u.id)} />
            ))}
          </div>
        </div>
      )}

      {options?.counts && (
        <p className="notice-audience__hint">
          {local.type === NOTICE_AUDIENCE_TYPE.ALL_USERS && `${options.counts.allUsers} active users`}
          {local.type === NOTICE_AUDIENCE_TYPE.ALL_PARENTS && `${options.counts.allParents} parents`}
          {local.type === NOTICE_AUDIENCE_TYPE.ALL_TEACHERS && `${options.counts.allTeachers} teachers`}
          {local.type === NOTICE_AUDIENCE_TYPE.ALL_STAFF && `${options.counts.allStaff} staff`}
        </p>
      )}
    </section>
  );
}
