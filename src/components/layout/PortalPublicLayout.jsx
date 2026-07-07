import { Link } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import PortalLogo from '../brand/PortalLogo.jsx';

export default function PortalPublicLayout({
  children,
  homeTo = '/',
  maxWidth = 'max-w-3xl',
}) {
  const { portalName } = usePortalConfig();

  return (
    <div className="portal-shell portal-public-page flex min-h-screen flex-col text-[var(--sb-on-surface,#243447)]">
      <header className="app-header portal-public-header shrink-0 border-b">
        <div className={`mx-auto flex h-16 w-full items-center justify-center px-4 md:px-6 ${maxWidth}`}>
          <Link to={homeTo} className="flex min-w-0 items-center gap-3">
            <span className="sidebar-logo-wrap shrink-0">
              <PortalLogo size="sm" inverse={true} />
            </span>
          </Link>
        </div>
      </header>
      <main className="portal-public-main flex-1">{children}</main>
    </div>
  );
}
