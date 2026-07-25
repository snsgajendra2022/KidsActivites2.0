import {
  CLASS_OPTIONS,
  HOUSEHOLD_INCOME_OPTIONS,
  IMMUNIZATION_COLUMNS,
  IMMUNIZATION_ROWS,
  STAYS_WITH_OPTIONS,
  UNIFORM_SIZES,
  mapApplicationToKidzeeForm,
} from '../enrollment/kidzeePrintFields.js';

function formatValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function joinLines(...parts) {
  const text = parts.filter(Boolean).join(', ');
  return text || null;
}

function formatYesNo(yesNo) {
  if (!yesNo) return null;
  if (yesNo.yes) return 'Yes';
  if (yesNo.no) return 'No';
  return null;
}

function selectedKeys(obj, options) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const labels = (options || [])
    .filter(({ key }) => obj[key])
    .map(({ label }) => label);
  return labels.length ? labels.join(', ') : null;
}

function selectedUniformSizes(uniform) {
  if (!uniform || typeof uniform !== 'object' || Array.isArray(uniform)) return null;
  const sizes = UNIFORM_SIZES.filter((s) => uniform[s]);
  return sizes.length ? sizes.join(', ') : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDoseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[Number(iso[2]) - 1];
    if (month) return `${Number(iso[3])} ${month} ${iso[1]}`;
  }
  return text;
}

function doseColumnLabel(label) {
  return String(label || '').replace(' (dd/mm/yyyy)', '');
}

function immunizationHasAnyDose(immunization) {
  if (!immunization) return false;
  return IMMUNIZATION_ROWS.some(({ key }) => {
    const row = immunization[key];
    if (!row) return false;
    return IMMUNIZATION_COLUMNS.some(({ key: col }) => Boolean(row[col]));
  });
}

function guardianFields(guardian, prefix) {
  if (!guardian?.name) return [];
  const address = joinLines(guardian.addressLine1, guardian.addressLine2, guardian.addressLine3);
  const office = joinLines(guardian.officeLine1, guardian.officeLine2, guardian.officeLine3);
  return [
    [`${prefix} Name`, guardian.name],
    [`${prefix} Mobile`, guardian.mobile || guardian.contactNo],
    [`${prefix} Email`, guardian.email],
    [`${prefix} Qualification`, guardian.qualification],
    [`${prefix} Occupation`, guardian.occupation],
    [`${prefix} Designation`, guardian.designation],
    [`${prefix} Address`, address ? `${address}${guardian.pin ? ` — ${guardian.pin}` : ''}` : null],
    [`${prefix} Office`, office ? `${office}${guardian.officePin ? ` — ${guardian.officePin}` : ''}` : null],
    [`${prefix} Office Contact`, guardian.officeContactNo],
  ];
}

function contactFields(contact, index) {
  if (!contact?.name && !contact?.mobile && !contact?.contactNo) return [];
  const address = joinLines(contact.addressLine1, contact.addressLine2, contact.addressLine3);
  const label = index === 0 ? 'Primary' : `Contact ${index + 1}`;
  return [
    [`${label} Name`, contact.name],
    [`${label} Phone`, contact.mobile || contact.contactNo],
    [`${label} Email`, contact.email],
    [`${label} Address`, address ? `${address}${contact.pin ? ` — ${contact.pin}` : ''}` : null],
  ];
}

function permissionSummary(permission, label) {
  if (!permission) return [];
  const hasContent = permission.date || permission.place || permission.signature || permission.childName;
  if (!hasContent) return [];
  return [
    [`${label} — Date`, permission.date],
    [`${label} — Place`, permission.place],
    [`${label} — Child Name`, permission.childName],
    [`${label} — Signed`, permission.signature ? 'Yes' : null],
  ];
}

function isSignatureDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

function ImmunizationRecord({ immunization }) {
  if (!immunizationHasAnyDose(immunization)) return null;

  return (
    <section className="sb-card app-review-card">
      <h3 className="app-review-card-title">Kidzee — Immunization</h3>
      <p className="app-review-immunization-hint">Vaccination dates by age and dose</p>

      <div className="app-review-immunization-scroll">
        <table className="app-review-immunization-table">
          <thead>
            <tr>
              <th scope="col">Age</th>
              <th scope="col">Recommended</th>
              {IMMUNIZATION_COLUMNS.map((col) => (
                <th key={col.key} scope="col">{doseColumnLabel(col.label)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {IMMUNIZATION_ROWS.map((row) => {
              const doses = immunization?.[row.key] || {};
              const hasRowDose = IMMUNIZATION_COLUMNS.some(({ key }) => Boolean(doses[key]));
              if (!hasRowDose) return null;
              return (
                <tr key={row.key}>
                  <th scope="row">{row.age}</th>
                  <td className="app-review-immunization-rec">{row.recommendation}</td>
                  {IMMUNIZATION_COLUMNS.map((col) => {
                    const formatted = formatDoseDate(doses[col.key]);
                    return (
                      <td key={col.key} className={formatted ? 'has-date' : 'empty-date'}>
                        {formatted || '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="app-review-immunization-cards" aria-label="Vaccination record">
        {IMMUNIZATION_ROWS.map((row) => {
          const doses = immunization?.[row.key] || {};
          const filled = IMMUNIZATION_COLUMNS
            .map((col) => ({
              label: doseColumnLabel(col.label),
              value: formatDoseDate(doses[col.key]),
            }))
            .filter((d) => d.value);
          if (!filled.length) return null;
          return (
            <li key={row.key} className="app-review-immunization-card">
              <div className="app-review-immunization-card__head">
                <strong>{row.age}</strong>
                <span>{row.recommendation}</span>
              </div>
              <dl>
                {filled.map((d) => (
                  <div key={d.label}>
                    <dt>{d.label}</dt>
                    <dd>{d.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PermissionSignatures({ permissions, officeUse, includeOfficeUse = true }) {
  const entries = [
    { label: 'Emergency Treatment', signature: permissions?.emergency?.signature },
    { label: 'Field Trip', signature: permissions?.fieldTrip?.signature },
    { label: 'Verification', signature: permissions?.verification?.signature },
    ...(includeOfficeUse ? [{ label: 'Office Use', signature: officeUse?.signature }] : []),
  ].filter(({ signature }) => isSignatureDataUrl(signature));

  if (!entries.length) return null;

  return (
    <section className="sb-card app-review-card">
      <h3 className="app-review-card-title">Kidzee — Signature Images</h3>
      <div className="app-review-grid">
        {entries.map(({ label, signature }) => (
          <div key={label} className="app-review-field app-review-field--full">
            <dt>{label}</dt>
            <dd>
              <img src={signature} alt={`${label} signature`} className="app-review-signature__image" />
            </dd>
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailSection({ title, fields }) {
  const entries = fields.filter(([, value]) => formatValue(value) !== null);
  if (!entries.length) return null;

  return (
    <section className="sb-card app-review-card">
      <h3 className="app-review-card-title">{title}</h3>
      <dl className="app-review-grid">
        {entries.map(([label, value]) => (
          <div key={label} className="app-review-field">
            <dt>{label}</dt>
            <dd>{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function KidzeeApplicationDetails({ app, includeOfficeUse = true }) {
  const data = mapApplicationToKidzeeForm(app);
  const child = data.child || {};
  const health = data.health || {};
  const doctor = data.doctor || {};
  const staysWith = selectedKeys(child.staysWith, STAYS_WITH_OPTIONS)
    || (child.staysWith?.others ? `Others: ${child.staysWith.othersText || '—'}` : null);

  const childAddress = joinLines(child.addressLine1, child.addressLine2, child.addressLine3);
  const doctorAddress = joinLines(doctor.addressLine1, doctor.addressLine2);

  const siblings = asArray(data.siblings)
    .filter((s) => s?.name)
    .map((s, i) => [
      `Sibling ${i + 1}`,
      joinLines(
        s.name,
        s.gender,
        s.dateOfBirth,
        s.school,
        s.standard,
        s.alumni ? 'Alumni' : null,
      ),
    ]);

  const familyMembers = asArray(data.otherFamilyMembers)
    .filter((m) => m?.name)
    .map((m, i) => [
      `Family Member ${i + 1}`,
      joinLines(m.name, m.gender, m.relationship, m.dateOfBirth),
    ]);

  const emergencyFields = asArray(data.emergencyContacts).flatMap(contactFields);

  const permissionFields = [
    ...permissionSummary(data.permissions?.emergency, 'Emergency Treatment'),
    ...permissionSummary(data.permissions?.fieldTrip, 'Field Trip'),
    ...permissionSummary(data.permissions?.verification, 'Verification'),
  ];

  return (
    <>
      <DetailSection
        title="Kidzee — Admission"
        fields={[
          ['Form No.', data.formNo],
          ['Admission No.', data.admissionNo],
          ['Tel No.', data.telNo],
          ['Class', selectedKeys(data.class, CLASS_OPTIONS)],
          ['Batch', data.batch],
          ['Timing', data.timing],
        ]}
      />

      <DetailSection
        title="Kidzee — Child Details"
        fields={[
          ['Full Name', child.fullName],
          ['Gender', child.gender?.male ? 'Male' : child.gender?.female ? 'Female' : null],
          ['Date of Birth', child.dateOfBirth],
          ['Place of Birth', child.placeOfBirth],
          ['Height', child.height],
          ['Weight', child.weight],
          ['Blood Group', child.bloodGroup],
          ['Uniform (Regular)', selectedUniformSizes(child.uniformRegular)],
          ['Uniform (Winter)', selectedUniformSizes(child.uniformWinter)],
          ['Languages at Home', child.languagesAtHome],
          ['Address', childAddress ? `${childAddress}${child.pin ? ` — ${child.pin}` : ''}` : null],
          ['Contact No.', child.contactNo],
          ['Stays With', staysWith],
        ]}
      />

      <DetailSection
        title="Kidzee — Health"
        fields={[
          ['Allergies', formatYesNo(health.allergies)],
          ['Allergies Details', health.allergiesExplanation],
          ['Physical / Emotional Condition', formatYesNo(health.physicalEmotional)],
          ['Physical / Emotional Details', health.physicalEmotionalExplanation],
          ['Daily Medication', formatYesNo(health.dailyMedication)],
          ['Medication Details', health.dailyMedicationExplanation],
          ['Further Information', health.furtherInfo],
          ['Other Comments', health.otherComments],
        ]}
      />

      <DetailSection
        title="Kidzee — Doctor"
        fields={[
          ['Name', doctor.name],
          ['Address', doctorAddress ? `${doctorAddress}${doctor.pin ? ` — ${doctor.pin}` : ''}` : null],
          ['Home Phone', doctor.homePhone],
          ['Mobile', doctor.mobile],
          ['Email', doctor.email],
        ]}
      />

      <DetailSection
        title="Kidzee — Mother / Guardian"
        fields={guardianFields(data.motherGuardian, 'Mother')}
      />

      <DetailSection
        title="Kidzee — Father / Guardian"
        fields={guardianFields(data.fatherGuardian, 'Father')}
      />

      <DetailSection
        title="Kidzee — Family"
        fields={[
          ['Household Income', selectedKeys(data.householdIncome, HOUSEHOLD_INCOME_OPTIONS)],
          ...siblings,
          ...familyMembers,
        ]}
      />

      {emergencyFields.length > 0 && (
        <DetailSection title="Kidzee — Emergency Contacts" fields={emergencyFields} />
      )}

      <ImmunizationRecord immunization={data.immunization} />

      {permissionFields.length > 0 && (
        <DetailSection title="Kidzee — Permissions & Signatures" fields={permissionFields} />
      )}

      <PermissionSignatures
        permissions={data.permissions}
        officeUse={data.officeUse}
        includeOfficeUse={includeOfficeUse}
      />
    </>
  );
}
