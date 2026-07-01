import { Link } from 'react-router-dom';

/** Standard SchoolBridge table shell — matches Admin Fees UI */
export function DataTable({ children, minWidth = 900, className = '', nested = false }) {
  const wrapClass = nested
    ? `overflow-x-auto ${className}`
    : `premium-table-wrap overflow-x-auto ${className}`;

  return (
    <div className={wrapClass}>
      <table className="premium-table w-full" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

/** Table with optional toolbar header (e.g. dashboard recent list) */
export function DataTablePanel({ toolbar, children, minWidth = 900 }) {
  return (
    <div className="premium-table-wrap overflow-hidden">
      {toolbar}
      <div className="overflow-x-auto">
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
  return (
    <Link to={to} className={`table-action-btn table-action-btn-${variant} ${className}`}>
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
