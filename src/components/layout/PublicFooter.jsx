export default function PublicFooter({ compact = false }) {
  return (
    <footer className="relative z-10 shrink-0 border-t border-white/5 bg-[#091426] px-4 py-3 md:px-10 md:py-4">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-3 md:flex-row md:gap-4">
        <div className="flex flex-col items-center md:items-start">
          <span className="font-display text-base font-semibold tracking-tighter text-white md:text-lg">
            SchoolBridge
          </span>
          <p className="text-center text-[11px] text-white/40 md:text-left">
            © 2026 SchoolBridge Systems. All rights reserved.
            {!compact && ' Professional Grade Enrollment.'}
          </p>
        </div>
        <div className="hidden flex-wrap justify-center gap-5 md:flex md:gap-8">
          <a className="text-xs text-white/60 transition-premium hover:text-white" href="#">
            Security Policy
          </a>
          <a className="text-xs text-white/60 transition-premium hover:text-white" href="#">
            Terms of Use
          </a>
          <a className="text-xs text-white/60 transition-premium hover:text-white" href="#">
            System Status
          </a>
          <a className="text-xs text-white/60 transition-premium hover:text-white" href="#">
            Direct Support
          </a>
        </div>
      </div>
    </footer>
  );
}
