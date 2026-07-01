import { Megaphone } from 'lucide-react';

const SEPARATOR = '   •   ';

export default function LoginHeaderScrollText({ lines = [] }) {
  const items = lines.map((line) => line?.trim()).filter(Boolean);
  if (!items.length) return null;

  const text = items.join(SEPARATOR);

  return (
    <div className="login-header-marquee" aria-live="polite">
      <Megaphone size={14} className="login-header-marquee__icon shrink-0" aria-hidden />
      <div className="login-header-marquee__viewport">
        <div className="login-header-marquee__track">
          <span className="login-header-marquee__text">{text}{SEPARATOR}</span>
          <span className="login-header-marquee__text" aria-hidden>
            {text}{SEPARATOR}
          </span>
        </div>
      </div>
    </div>
  );
}
