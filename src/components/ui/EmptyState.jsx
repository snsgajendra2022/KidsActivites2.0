export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`sb-empty-state empty-state ${className}`}>
      {Icon && (
        <div className="sb-empty-state__icon empty-state-icon">
          <Icon size={48} />
        </div>
      )}
      <h3 className="sb-empty-state__title">{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
