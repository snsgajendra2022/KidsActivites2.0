export default function PremiumCard({
  children,
  className = '',
  elevated = false,
  goldAccent = false,
  padding = true,
  ...props
}) {
  const classes = [
    'sb-card',
    elevated && 'sb-card--elevated',
    goldAccent && 'sb-card-gold-accent',
    padding && 'p-6',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
