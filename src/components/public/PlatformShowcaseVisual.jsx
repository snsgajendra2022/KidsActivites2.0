import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Bell,
  Camera,
  ClipboardList,
  FileText,
  MessageCircle,
  Palette,
  QrCode,
  School,
  Smartphone,
  Sparkles,
  Tv,
  Users,
} from 'lucide-react';

const float = (delay = 0) => ({
  y: [0, -10, 0],
  transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay },
});

const pulse = (delay = 0) => ({
  scale: [1, 1.06, 1],
  opacity: [0.7, 1, 0.7],
  transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay },
});

function VisualShell({ children, label }) {
  return (
    <div className="sb-showcase-visual" aria-hidden>
      <div className="sb-showcase-visual__glow" />
      <p className="sb-showcase-visual__label">{label}</p>
      <div className="sb-showcase-visual__stage">{children}</div>
    </div>
  );
}

function Chip({ icon: Icon, text, className = '', delay = 0 }) {
  return (
    <motion.div
      className={`sb-showcase-visual__chip ${className}`.trim()}
      animate={float(delay)}
    >
      <Icon size={16} strokeWidth={1.75} />
      <span>{text}</span>
    </motion.div>
  );
}

function FeaturesVisual() {
  return (
    <VisualShell label="Live platform modules">
      <motion.div className="sb-showcase-visual__hub" animate={pulse()}>
        <Sparkles size={22} />
      </motion.div>
      <Chip icon={ClipboardList} text="Enroll" className="sb-showcase-visual__chip--tl" delay={0.2} />
      <Chip icon={FileText} text="Forms" className="sb-showcase-visual__chip--tr" delay={0.5} />
      <Chip icon={MessageCircle} text="Chat" className="sb-showcase-visual__chip--ml" delay={0.8} />
      <Chip icon={Camera} text="Photos" className="sb-showcase-visual__chip--mr" delay={1.1} />
      <Chip icon={Tv} text="TV" className="sb-showcase-visual__chip--bl" delay={1.4} />
      <Chip icon={Users} text="Roles" className="sb-showcase-visual__chip--br" delay={1.7} />
    </VisualShell>
  );
}

function HowVisual({ activeIndex = 0 }) {
  const steps = ['Create', 'Configure', 'Enroll', 'Admit', 'Connect'];
  return (
    <VisualShell label="Workspace journey">
      <div className="sb-showcase-visual__pipeline">
        {steps.map((step, index) => (
          <div key={step} className="sb-showcase-visual__pipeline-step">
            <motion.span
              className={`sb-showcase-visual__pipeline-dot${index <= activeIndex ? ' is-active' : ''}`}
              animate={index === activeIndex ? pulse(0) : undefined}
            />
            <span className={index <= activeIndex ? 'is-active' : ''}>{step}</span>
            {index < steps.length - 1 && (
              <motion.span
                className="sb-showcase-visual__pipeline-line"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: index < activeIndex ? 1 : 0.15 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              />
            )}
          </div>
        ))}
      </div>
    </VisualShell>
  );
}

function RolesVisual() {
  return (
    <VisualShell label="Role-based access">
      <motion.div className="sb-showcase-visual__orbit" animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}>
        <span className="sb-showcase-visual__orbit-item sb-showcase-visual__orbit-item--1"><School size={14} /></span>
        <span className="sb-showcase-visual__orbit-item sb-showcase-visual__orbit-item--2"><Users size={14} /></span>
        <span className="sb-showcase-visual__orbit-item sb-showcase-visual__orbit-item--3"><BadgeCheck size={14} /></span>
      </motion.div>
      <motion.div className="sb-showcase-visual__hub" animate={pulse(0.3)}>
        <Users size={22} />
      </motion.div>
    </VisualShell>
  );
}

function EnrollmentVisual() {
  return (
    <VisualShell label="Admission pipeline">
      <div className="sb-showcase-visual__bars">
        {['Draft', 'Review', 'Fees', 'Approved'].map((label, i) => (
          <motion.div
            key={label}
            className="sb-showcase-visual__bar"
            initial={{ width: '12%' }}
            animate={{ width: `${30 + i * 18}%` }}
            transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity, repeatType: 'reverse', repeatDelay: 2 }}
          >
            <span>{label}</span>
          </motion.div>
        ))}
      </div>
    </VisualShell>
  );
}

function MediaVisual() {
  return (
    <VisualShell label="Photos, chat & TV">
      <motion.div className="sb-showcase-visual__chat" animate={float(0)}>
        <MessageCircle size={18} />
        <div className="sb-showcase-visual__chat-lines">
          <motion.span animate={{ width: ['40%', '72%', '40%'] }} transition={{ duration: 2.4, repeat: Infinity }} />
          <motion.span animate={{ width: ['55%', '80%', '55%'] }} transition={{ duration: 2.8, repeat: Infinity, delay: 0.3 }} />
        </div>
      </motion.div>
      <motion.div className="sb-showcase-visual__tv" animate={float(0.6)}>
        <Tv size={20} />
        <motion.span className="sb-showcase-visual__tv-scan" animate={{ x: ['-120%', '220%'] }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2 }} />
      </motion.div>
      <Chip icon={QrCode} text="QR sign-in" className="sb-showcase-visual__chip--br" delay={0.4} />
    </VisualShell>
  );
}

function MobileVisual() {
  return (
    <VisualShell label="Mobile apps">
      <motion.div className="sb-showcase-visual__phone" animate={float(0)}>
        <Smartphone size={28} />
        <motion.span className="sb-showcase-visual__phone-ping" animate={pulse()} />
      </motion.div>
      <Chip icon={Bell} text="Alerts" className="sb-showcase-visual__chip--tl" delay={0.3} />
      <Chip icon={Camera} text="Albums" className="sb-showcase-visual__chip--tr" delay={0.7} />
    </VisualShell>
  );
}

function FeesVisual() {
  return (
    <VisualShell label="Fees & operations">
      <motion.div className="sb-showcase-visual__receipt" animate={float(0)}>
        <FileText size={22} />
        <motion.span className="sb-showcase-visual__receipt-stamp" animate={pulse(0.5)}>✓</motion.span>
      </motion.div>
      <Chip icon={Palette} text="Branding" className="sb-showcase-visual__chip--br" delay={0.5} />
    </VisualShell>
  );
}

export default function PlatformShowcaseVisual({ tabId, activeStep = 0 }) {
  switch (tabId) {
    case 'how':
      return <HowVisual activeIndex={activeStep} />;
    case 'roles':
      return <RolesVisual />;
    case 'enrollment':
      return <EnrollmentVisual />;
    case 'media':
      return <MediaVisual />;
    case 'mobile':
      return <MobileVisual />;
    case 'fees':
      return <FeesVisual />;
    default:
      return <FeaturesVisual />;
  }
}
