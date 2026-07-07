export default function PaperTable({ children, className = '', caption }) {
  return (
    <div className="html-form-table-wrap">
      <table className={`html-form-table ${className}`.trim()}>
        {caption && <caption className="html-form-table__caption">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
