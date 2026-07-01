import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/enroll', label: 'Admissions' },
  { to: '/#programs', label: 'Programs', hash: true },
  { to: '/#about', label: 'About', hash: true },
  { to: '/#contact', label: 'Contact', hash: true },
];

export default function PublicHeader({ glass = false, compact = false }) {
  const location = useLocation();

  return (
    <header
      className={`relative z-50 shrink-0 border-b backdrop-blur-md transition-premium ${
        glass
          ? 'border-white/20 bg-white/80'
          : 'border-black/5 bg-white/90'
      }`}
    >
      <nav
        className={`mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 md:px-10 ${
          compact ? 'h-14' : 'h-16 md:h-[4.5rem]'
        }`}
      >
        <div className="flex items-center gap-6 md:gap-8">
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tighter text-[#091426] md:text-2xl"
          >
            SchoolBridge
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map(({ to, label, hash }) => (
              <Link
                key={label}
                to={to}
                className={`text-sm font-semibold transition-premium ${
                  !hash && location.pathname === to
                    ? 'text-[#091426]'
                    : 'text-[#45474c] hover:text-[#091426]'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <Link
            to="/login"
            className={`hidden text-sm font-semibold transition-premium md:block ${
              location.pathname === '/login'
                ? 'text-[#091426]'
                : 'text-[#091426]/60 hover:text-[#091426]'
            } px-3 py-2`}
          >
            Staff Portal
          </Link>
          <Link
            to="/login"
            className="btn-hover-lift rounded-full bg-[#091426] px-5 py-2.5 text-sm font-semibold text-white transition-premium hover:text-white md:px-8 md:py-3"
          >
            Parent Login
          </Link>
        </div>
      </nav>
    </header>
  );
}
