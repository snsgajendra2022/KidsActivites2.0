import PublicHeader from './PublicHeader.jsx';
import PublicFooter from './PublicFooter.jsx';

export default function PublicLayout({ children, glassHeader = false, hideFooter = false, className = '' }) {
  return (
    <div className={`flex min-h-screen flex-col bg-[#f8f9ff] text-[#0b1c30] ${className}`}>
      <PublicHeader glass={glassHeader} />
      <main className="flex-1">{children}</main>
      {!hideFooter && <PublicFooter />}
    </div>
  );
}
