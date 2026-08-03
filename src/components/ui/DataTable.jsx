import { Link } from 'react-router-dom';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import '../../styles/admin-modules.css';

function getCellValue(row, column) {
  if (column.render) return column.render(row);
  if (typeof column.accessor === 'function') return column.accessor(row);
  if (column.key != null) return row[column.key];
  return '—';
}

function cellContent(value) {
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

function asPlainText(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function initialsFrom(value) {
  const text = asPlainText(value).trim() || '•';
  const parts = text.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || '•';
}

function formatLabel(value) {
  const text = asPlainText(value);
  if (!text) return '—';
  return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function BadgePill({ value }) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  return <span className="admin-record-pill">{formatLabel(value)}</span>;
}

/** Leave-style advanced cards for admin module lists (all breakpoints). */
function AdvancedRecordCards({
  columns,
  data,
  keyExtractor,
  emptyMessage,
  renderActions,
}) {
  const isEmpty = !data?.length;
  const visible = columns.filter((col) => col.card !== false);
  const primaryColumn = visible.find((col) => col.primary) || visible[0];
  const badgeColumn = visible.find((col) => col.badge);
  const detailColumns = visible.filter(
    (col) => col !== primaryColumn && col !== badgeColumn,
  );

  if (isEmpty) {
    return (
      <div className="admin-record-empty">
        <p className="text-sm text-[#64748b]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="admin-record-list">
      {data.map((row, index) => {
        const actions = renderActions?.(row);
        const titleValue = primaryColumn ? getCellValue(row, primaryColumn) : null;
        const titleText = asPlainText(titleValue) || (primaryColumn?.label || 'Record');
        const subtitle = primaryColumn?.subtitle
          ? cellContent(primaryColumn.subtitle(row))
          : null;
        const badgeValue = badgeColumn ? getCellValue(row, badgeColumn) : null;

        return (
          <article key={keyExtractor(row, index)} className="admin-record-card">
            <div className="admin-record-card__main">
              <div className="admin-record-card__avatar" aria-hidden>
                {initialsFrom(titleText)}
              </div>
              <div className="admin-record-card__body">
                <div className="admin-record-card__top">
                  <div className="min-w-0 flex-1">
                    <h3 className="admin-record-card__title">
                      {cellContent(titleValue)}
                    </h3>
                    {subtitle ? (
                      <p className="admin-record-card__subtitle">{subtitle}</p>
                    ) : null}
                  </div>
                  {badgeColumn ? (
                    <div className="shrink-0">
                      <BadgePill value={badgeValue} />
                    </div>
                  ) : null}
                </div>

                {detailColumns.length > 0 ? (
                  <dl className="admin-record-card__fields">
                    {detailColumns.map((col) => (
                      <div key={col.label} className="admin-record-card__field">
                        <dt>{col.label}</dt>
                        <dd className={col.muted ? 'is-muted' : undefined}>
                          {cellContent(getCellValue(row, col))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            </div>

            {actions ? (
              <div className="admin-record-card__actions">{actions}</div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function DesktopTable({ columns, data, keyExtractor, minWidth, emptyMessage, renderActions, actionsHeaderClass }) {
  const isEmpty = !data?.length;

  return (
    <div className="hidden overflow-x-auto sb-table-scroll md:block">
      <table className="premium-table w-full" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.label} className={col.headerClassName || ''}>
                {col.label}
              </th>
            ))}
            {renderActions && (
              <th className={actionsHeaderClass || '!text-right'}>Action</th>
            )}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td
                colSpan={columns.length + (renderActions ? 1 : 0)}
                className="!py-12 text-center text-sm text-[#45474c]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={keyExtractor(row, index)}>
                {columns.map((col) => (
                  <td
                    key={col.label}
                    className={[
                      col.primary ? 'font-semibold text-[#0058be]' : '',
                      col.muted ? 'text-[#45474c]' : '',
                      col.cellClassName || '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {cellContent(getCellValue(row, col))}
                  </td>
                ))}
                {renderActions && (
                  <td className="table-actions-cell">
                    <div className="table-actions">{renderActions(row)}</div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function MobileCards({
  columns,
  data,
  keyExtractor,
  emptyMessage,
  renderActions,
}) {
  const isEmpty = !data?.length;
  const mobileColumns = columns.filter((col) => col.mobile !== false && !col.hideOnMobile);
  const primaryColumn = columns.find((col) => col.primary) || mobileColumns[0];
  const detailColumns = mobileColumns.filter((col) => col !== primaryColumn);

  if (isEmpty) {
    return (
      <div className="table-mobile-empty md:hidden">
        <p className="text-sm text-[#45474c]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-mobile-list md:hidden">
      {data.map((row, index) => {
        const actions = renderActions?.(row);
        const statusColumn = detailColumns.find((col) => col.badge);

        return (
          <article key={keyExtractor(row, index)} className="table-mobile-card">
            <div className="table-mobile-card-header">
              <div className="min-w-0 flex-1">
                {primaryColumn && (
                  <p className="table-mobile-card-title">
                    {cellContent(getCellValue(row, primaryColumn))}
                  </p>
                )}
                {primaryColumn?.subtitle && (
                  <p className="table-mobile-card-subtitle">
                    {cellContent(primaryColumn.subtitle(row))}
                  </p>
                )}
              </div>
              {statusColumn && (
                <div className="shrink-0 pl-3">{getCellValue(row, statusColumn)}</div>
              )}
            </div>

            <dl className="table-mobile-fields">
              {detailColumns
                .filter((col) => !col.badge)
                .map((col) => (
                  <div key={col.label} className="table-mobile-field">
                    <dt>{col.label}</dt>
                    <dd className={col.muted ? 'text-[#45474c]' : ''}>
                      {cellContent(getCellValue(row, col))}
                    </dd>
                  </div>
                ))}
            </dl>

            {actions && (
              <div className="table-mobile-actions">
                {actions}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

/** Responsive table — desktop table + mobile cards; pass layout="cards" for leave-style lists. */
export function ResponsiveDataTable({
  columns,
  data = [],
  keyExtractor = (row, index) => row.id ?? index,
  emptyMessage = 'No records found.',
  minWidth = 900,
  className = '',
  nested = false,
  layout = 'table',
  renderActions,
  actionsHeaderClass = '!text-right',
}) {
  if (layout === 'cards') {
    return (
      <div className={`admin-record-wrap ${className}`.trim()}>
        <AdvancedRecordCards
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          emptyMessage={emptyMessage}
          renderActions={renderActions}
        />
      </div>
    );
  }

  const wrapClass = nested
    ? `overflow-hidden ${className}`
    : `premium-table-wrap overflow-hidden ${className}`;

  return (
    <div className={wrapClass}>
      <DesktopTable
        columns={columns}
        data={data}
        keyExtractor={keyExtractor}
        minWidth={minWidth}
        emptyMessage={emptyMessage}
        renderActions={renderActions}
        actionsHeaderClass={actionsHeaderClass}
      />
      <MobileCards
        columns={columns}
        data={data}
        keyExtractor={keyExtractor}
        emptyMessage={emptyMessage}
        renderActions={renderActions}
      />
    </div>
  );
}

/** Responsive table with optional toolbar header */
export function ResponsiveDataTablePanel({
  toolbar,
  columns,
  data = [],
  keyExtractor = (row, index) => row.id ?? index,
  emptyMessage = 'No records found.',
  minWidth = 900,
  layout = 'table',
  renderActions,
  actionsHeaderClass = '!text-right',
}) {
  if (layout === 'cards') {
    return (
      <div className="admin-record-wrap">
        {toolbar}
        <AdvancedRecordCards
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          emptyMessage={emptyMessage}
          renderActions={renderActions}
        />
      </div>
    );
  }

  return (
    <div className="premium-table-wrap overflow-hidden">
      {toolbar}
      <DesktopTable
        columns={columns}
        data={data}
        keyExtractor={keyExtractor}
        minWidth={minWidth}
        emptyMessage={emptyMessage}
        renderActions={renderActions}
        actionsHeaderClass={actionsHeaderClass}
      />
      <MobileCards
        columns={columns}
        data={data}
        keyExtractor={keyExtractor}
        emptyMessage={emptyMessage}
        renderActions={renderActions}
      />
    </div>
  );
}

/** Standard KidsActivites table shell — desktop only (legacy) */
export function DataTable({ children, minWidth = 900, className = '', nested = false }) {
  const wrapClass = nested
    ? `overflow-x-auto ${className}`
    : `premium-table-wrap overflow-x-auto ${className}`;

  return (
    <div className={wrapClass}>
      <table className="premium-table hidden w-full md:table" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

/** Table with optional toolbar header (legacy) */
export function DataTablePanel({ toolbar, children, minWidth = 900 }) {
  return (
    <div className="premium-table-wrap overflow-hidden">
      {toolbar}
      <div className="hidden overflow-x-auto sb-table-scroll md:block">
        <table className="premium-table w-full" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function DataTableToolbar({ title, subtitle, actions }) {
  return (
    <div className="premium-table-toolbar">
      <div>
        {title && <h3 className="m-0 font-display text-base font-bold text-[#091426]">{title}</h3>}
        {subtitle && <p className="m-0 mt-1 text-sm text-[#45474c]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function TablePrimaryCell({ children, className = '' }) {
  return <td className={`font-semibold text-[#0058be] ${className}`}>{children}</td>;
}

export function TableMutedCell({ children, className = '' }) {
  return <td className={`text-[#45474c] ${className}`}>{children}</td>;
}

export function TableActionCell({ children, showDash = true }) {
  const isEmpty = !children || (Array.isArray(children) && children.every((c) => !c));
  return (
    <td className="table-actions-cell">
      <div className="table-actions">
        {!isEmpty ? children : showDash ? <span className="text-sm text-[#45474c]/60">—</span> : null}
      </div>
    </td>
  );
}

export function TableActionButton({ variant = 'outline', children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`table-action-btn table-action-btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TableActionLink({ to, variant = 'outline', children, className = '' }) {
  const { tenantPath } = useTenantPath();
  return (
    <Link to={tenantPath(to)} className={`table-action-btn table-action-btn-${variant} ${className}`}>
      {children}
    </Link>
  );
}

export function TableEmptyRow({ colSpan, message = 'No records found.' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="!py-12 text-center text-sm text-[#45474c]">
        {message}
      </td>
    </tr>
  );
}
