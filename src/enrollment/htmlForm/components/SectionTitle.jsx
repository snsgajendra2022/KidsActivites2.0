export default function SectionTitle({ children, className = '' }) {
  return (
    <h2 className={`html-form-section-title ${className}`.trim()}>
      {children}
    </h2>
  );
}
