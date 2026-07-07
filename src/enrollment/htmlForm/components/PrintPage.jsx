export default function PrintPage({ children, className = '', pageNumber, totalPages = 5 }) {
  return (
    <section className={`print-page html-form-page ${className}`.trim()} data-page={pageNumber}>
      <div className="html-form-page__inner">
        {children}
      </div>
      {pageNumber != null && (
        <div className="html-form-page__footer">
          Page {pageNumber} of {totalPages}
        </div>
      )}
    </section>
  );
}
