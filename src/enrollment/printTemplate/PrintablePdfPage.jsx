import { PrintFieldRenderer } from './EditablePdfFields.jsx';
import { getFieldsForPage, getPageBackgroundUrl } from './enrollmentPrintFields.js';

export default function PrintablePdfPage({
  page,
  formData,
  onFieldChange,
  readOnly = false,
  showCalibration = false,
  isAdmin = false,
  schoolName,
}) {
  const fields = getFieldsForPage(page);
  const bgUrl = getPageBackgroundUrl(page);

  return (
    <section
      className="print-page"
      data-page={page}
      style={{ backgroundImage: `url(${bgUrl})` }}
      aria-label={`Enrollment form page ${page}`}
    >
      {showCalibration && (
        <div className="print-calibration-grid" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={`v${i}`} className="print-calibration-grid__v" style={{ left: `${i * 10}%` }}>
              <span>{i * 10}%</span>
            </div>
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <div key={`h${i}`} className="print-calibration-grid__h" style={{ top: `${i * 10}%` }}>
              <span>{i * 10}%</span>
            </div>
          ))}
        </div>
      )}

      {page === 1 && schoolName && (
        <div className="print-tenant-brand no-screen-brand" aria-hidden="true">
          {schoolName}
        </div>
      )}

      {fields.map((field) => (
        <PrintFieldRenderer
          key={field.name}
          field={field}
          formData={formData}
          onFieldChange={onFieldChange}
          readOnly={readOnly}
          showCalibration={showCalibration}
          isAdmin={isAdmin}
        />
      ))}
    </section>
  );
}
