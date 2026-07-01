import { Megaphone } from 'lucide-react';

const SEPARATOR = '   •   ';

export default function LoginHeaderScrollText({ lines = [], variant = 'horizontal' }) {
  const items = lines.map((line) => line?.trim()).filter(Boolean);
  if (!items.length) return null;

  if (variant === 'vertical') {
    const loop = [...items, ...items];

    return (
      <div
        className="login-header-marquee login-header-marquee--vertical"
        aria-live="polite"
        style={{ '--marquee-lines': items.length }}
      >
        <Megaphone size={14} className="login-header-marquee__icon shrink-0" aria-hidden />
        <div className="login-header-marquee__viewport">
          <div className="login-header-marquee__track login-header-marquee__track--vertical">
            {loop.map((line, index) => (
              <p
                key={`${line}-${index}`}
                className="login-header-marquee__line"
                aria-hidden={index >= items.length || undefined}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const text = items.join(SEPARATOR);

  return (
    <div className="login-header-marquee login-header-marquee--horizontal" aria-live="polite">
      <Megaphone size={14} className="login-header-marquee__icon shrink-0" aria-hidden />
      <div className="login-header-marquee__viewport">
        <div className="login-header-marquee__track login-header-marquee__track--horizontal">
          <span className="login-header-marquee__text">{text}{SEPARATOR}</span>
          <span className="login-header-marquee__text" aria-hidden>
            {text}{SEPARATOR}
          </span>
        </div>
      </div>
    </div>
  );
}
