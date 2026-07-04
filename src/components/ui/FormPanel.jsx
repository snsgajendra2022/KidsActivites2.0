export default function FormPanel({
  title,
  subtitle,
  children,
  className = '',
  as: Tag = 'div',
  ...props
}) {
  return (
    <Tag className={`sb-form-panel ${className}`} {...props}>
      {(title || subtitle) && (
        <header className="mb-6">
          {title && <h2 className="font-display text-xl font-bold text-brand">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </header>
      )}
      {children}
    </Tag>
  );
}
