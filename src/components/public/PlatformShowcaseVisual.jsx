import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Bus,
  Camera,
  Check,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  Headphones,
  Heart,
  Images,
  MapPin,
  MessageCircle,
  Palette,
  QrCode,
  Receipt,
  School,
  SearchCheck,
  Shield,
  Smartphone,
  Sparkles,
  Tv,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  ADMISSION_PIPELINE,
  CLASSROOM_MODULES,
  COMMUNICATION_MEDIA,
  ENROLLMENT_PAGES,
  ENROLLMENT_WORKFLOW,
  FEES_AND_DOCS,
  MOBILE_APP_ROLES,
  OPERATIONS,
  PLATFORM_FEATURES,
  PLATFORM_ROLES,
  TRANSPORT_MODULES,
  TV_PLAYBACK_STEPS,
} from '../../data/platformLandingData.js';

const ease = [0.22, 1, 0.36, 1];
const spring = { type: 'spring', stiffness: 260, damping: 22 };

/** Keeps Lucide icons crisp — never scale the SVG parent directly */
function IconWrap({ children, size = 'md', spin, pulse }) {
  const className = `sb-plat-icon${size === 'lg' ? ' sb-plat-icon--lg' : ''}${size === 'sm' ? ' sb-plat-icon--sm' : ''}`;
  let inner = children;
  if (spin) {
    inner = (
      <motion.span
        className="sb-plat-icon__spin"
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      >
        {children}
      </motion.span>
    );
  } else if (pulse) {
    inner = (
      <motion.span
        className="sb-plat-icon__pulse"
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {children}
      </motion.span>
    );
  }
  return <span className={className}>{inner}</span>;
}

const shellEnter = {
  initial: { opacity: 0, scale: 0.97, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -8 },
  transition: { duration: 0.45, ease },
};

function DemoShell({ label, children, tall, variant }) {
  const particles = [12, 28, 45, 62, 78, 88];

  return (
    <motion.div
      className={`sb-plat-demo${tall ? ' sb-plat-demo--tall' : ''}${variant ? ` sb-plat-demo--${variant}` : ''}`}
      aria-hidden
      {...shellEnter}
    >
      <motion.div
        className="sb-plat-demo__aurora"
        animate={{
          x: ['-8%', '8%', '-8%'],
          y: ['-5%', '6%', '-5%'],
          scale: [1, 1.12, 1],
          opacity: [0.55, 0.9, 0.55],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="sb-plat-demo__aurora sb-plat-demo__aurora--b"
        animate={{
          x: ['10%', '-6%', '10%'],
          y: ['8%', '-4%', '8%'],
          opacity: [0.25, 0.5, 0.25],
        }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="sb-plat-demo__shimmer"
        animate={{ x: ['-120%', '220%'] }}
        transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
      />
      {particles.map((left, i) => (
        <motion.span
          key={left}
          className="sb-plat-demo__particle"
          style={{ left: `${left}%`, top: `${18 + (i % 3) * 22}%` }}
          animate={{ y: [0, -14, 0], opacity: [0.15, 0.55, 0.15], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 3.5 + i * 0.4, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
        />
      ))}
      <motion.p
        className="sb-plat-demo__label"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        {label}
      </motion.p>
      <div className="sb-plat-demo__canvas">{children}</div>
    </motion.div>
  );
}

function BrowserFrame({ children, title = 'Kids Activities' }) {
  return (
    <motion.div
      className="sb-plat-browser"
      initial={{ opacity: 0, y: 16, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.55, ease, delay: 0.1 }}
      style={{ transformPerspective: 800 }}
    >
      <div className="sb-plat-browser__chrome">
        <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }} />
        <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} />
        <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.6 }} />
        <em>{title}</em>
      </div>
      <div className="sb-plat-browser__body">{children}</div>
    </motion.div>
  );
}

function PhoneFrame({ children }) {
  return (
    <motion.div
      className="sb-plat-phone sb-plat-phone--wide"
      initial={{ opacity: 0, y: 20, rotate: -4 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ ...spring, delay: 0.12 }}
    >
      <div className="sb-plat-phone__notch" />
      <div className="sb-plat-phone__screen">{children}</div>
    </motion.div>
  );
}

const MODULE_POSITIONS = [
  { label: 'Enroll', icon: ClipboardList, pos: 'tl' },
  { label: 'Class', icon: BookOpen, pos: 'tr' },
  { label: 'Fees', icon: Wallet, pos: 'ml' },
  { label: 'Bus', icon: Bus, pos: 'mr' },
  { label: 'Photos', icon: Camera, pos: 'bl' },
  { label: 'TV', icon: Tv, pos: 'br' },
];

/** Maps each platform feature to its orbit module (-1 = center focus only). */
const FEATURE_TO_MODULE = [0, 0, 0, 2, -1, 4, 5, -1, 1, 1, 1, 3];

function FeaturesDemo({ activeIndex = 0 }) {
  const feature = PLATFORM_FEATURES[activeIndex] || PLATFORM_FEATURES[0];
  const FeatureIcon = feature.icon;
  const moduleIndex = FEATURE_TO_MODULE[activeIndex] ?? -1;

  return (
    <DemoShell label="Live workspace modules" tall variant="features">
      <BrowserFrame title={feature.title}>
        <div className="sb-plat-modules sb-plat-modules--orbit">
          <svg className="sb-plat-modules__lines" viewBox="0 0 200 132" preserveAspectRatio="xMidYMid meet">
            {MODULE_POSITIONS.map(({ label }, i) => {
              const lit = moduleIndex === i;
              return (
                <motion.line
                  key={label}
                  x1="100"
                  y1="66"
                  x2={[32, 168, 22, 178, 42, 158][i]}
                  y2={[24, 24, 66, 66, 108, 108][i]}
                  stroke={lit ? 'var(--sb-plat-line-lit, rgba(201,162,39,0.85))' : 'var(--sb-plat-line, rgba(255,255,255,0.18))'}
                  strokeWidth={lit ? 2.5 : 1}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1], opacity: [0, 0.65, lit ? 0.95 : 0.2] }}
                  transition={{ duration: 2.2, delay: i * 0.15, repeat: Infinity, repeatDelay: 3 }}
                />
              );
            })}
          </svg>

          <div className="sb-plat-modules__orbit-grid">
            {MODULE_POSITIONS.map(({ icon: Icon, label, pos }, i) => {
              const lit = moduleIndex === i;
              return (
                <motion.div
                  key={label}
                  className={`sb-plat-modules__tile sb-plat-modules__tile--${pos}${lit ? ' is-lit' : ''}`}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: lit ? 1 : [0.55, 0.75, 0.55],
                    scale: lit ? [1, 1.05, 1] : 1,
                  }}
                  transition={{ duration: lit ? 2.2 : 2.8, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
                >
                  <motion.span
                    className="sb-plat-modules__tile-glow"
                    animate={{ opacity: lit ? [0.45, 1, 0.45] : [0, 0.2, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35 }}
                  />
                  <span className="sb-plat-modules__tile-icon" aria-hidden>
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className="sb-plat-modules__tile-label">{label}</span>
                </motion.div>
              );
            })}

            <motion.div
              className="sb-plat-modules__pulse"
              animate={{
                scale: moduleIndex === -1 ? [1, 1.08, 1] : [1, 1.05, 1],
                boxShadow: [
                  '0 0 0 0 rgba(251,191,36,0.35)',
                  '0 0 0 14px rgba(251,191,36,0)',
                  '0 0 0 0 rgba(251,191,36,0)',
                ],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut' }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={feature.title}
                  className="sb-plat-modules__center-icon"
                  initial={{ scale: 0.7, opacity: 0, rotate: -12 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.8, opacity: 0, rotate: 12 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                >
                  <FeatureIcon size={22} strokeWidth={1.75} />
                </motion.span>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </BrowserFrame>
    </DemoShell>
  );
}

const HOW_SCENES = [
  {
    title: 'Create workspace',
    content: (
      <div className="sb-plat-scene sb-plat-scene--school">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <IconWrap size="lg">
            <School size={26} strokeWidth={1.75} />
          </IconWrap>
        </motion.div>
        <motion.div
          className="sb-plat-scene__field"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0, 1, 1, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 0.8, ease }}
          style={{ transformOrigin: 'left center' }}
        />
        <motion.div
          className="sb-plat-scene__field sb-plat-scene__field--sm"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0, 1, 1, 0] }}
          transition={{ duration: 2.8, delay: 0.25, repeat: Infinity, repeatDelay: 0.8, ease }}
          style={{ transformOrigin: 'left center' }}
        />
        <motion.div
          className="sb-plat-scene__btn"
          animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          whileTap={{ scale: 0.95 }}
        >
          Register school
        </motion.div>
      </div>
    ),
  },
  {
    title: 'Configure portal',
    content: (
      <div className="sb-plat-scene sb-plat-scene--brand">
        <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
          <IconWrap>
            <Palette size={20} strokeWidth={1.75} />
          </IconWrap>
        </motion.div>
        <motion.div className="sb-plat-scene__swatches">
          {['#0f172a', '#fbbf24', '#e0f2fe', '#fef9c3'].map((color, i) => (
            <motion.span
              key={color}
              style={{ background: color }}
              initial={{ scale: 0 }}
              animate={{ scale: [0.9, 1.2, 1], y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease }}
            />
          ))}
        </motion.div>
        <motion.div
          className="sb-plat-scene__brand-bar"
          animate={{ width: ['20%', '85%', '85%', '20%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease }}
        />
      </div>
    ),
  },
  {
    title: 'Parents enroll',
    content: (
      <div className="sb-plat-scene sb-plat-scene--form">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="sb-plat-scene__line"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: i * 0.2, repeat: Infinity, repeatDelay: 2.8 }}
            style={{ transformOrigin: 'left center' }}
          />
        ))}
        <motion.span
          className="sb-plat-scene__upload"
          animate={{ y: [0, -6, 0], borderColor: ['rgba(15,23,42,0.12)', 'rgba(251,191,36,0.75)', 'rgba(15,23,42,0.12)'] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          <IconWrap size="sm" pulse>
            <FileText size={14} strokeWidth={1.75} />
          </IconWrap>
          Upload docs
        </motion.span>
      </div>
    ),
  },
  {
    title: 'Review & admit',
    content: (
      <div className="sb-plat-scene sb-plat-scene--review">
        <motion.div
          className="sb-plat-scene__stamp"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: [0, 1.15, 1], rotate: [-20, 4, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 2.2, ease }}
        >
          <IconWrap size="lg">
            <BadgeCheck size={22} strokeWidth={1.75} />
          </IconWrap>
          <span>Approved</span>
        </motion.div>
        <motion.div
          className="sb-plat-scene__confetti"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.2 }}
        />
      </div>
    ),
  },
  {
    title: 'Run the school day',
    content: (
      <div className="sb-plat-scene sb-plat-scene--connect">
        <motion.div
          className="sb-plat-scene__bubble sb-plat-scene__bubble--a"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: [0, 1, 1, 0], x: [-10, 0, 0, 6], y: [6, 0, 0, -6] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          New photo shared
        </motion.div>
        <motion.div
          className="sb-plat-scene__bubble sb-plat-scene__bubble--b"
          animate={{ opacity: [0, 0, 1, 1, 0], x: [10, 10, 0, 0, -6], y: [6, 6, 0, 0, -6] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        >
          <MessageCircle size={14} /> Parent message
        </motion.div>
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <IconWrap size="lg">
            <Camera size={22} strokeWidth={1.75} />
          </IconWrap>
        </motion.div>
        <motion.span
          className="sb-plat-scene__ping"
          animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      </div>
    ),
  },
];

function HowDemo({ activeIndex = 0 }) {
  const scene = HOW_SCENES[activeIndex] || HOW_SCENES[0];

  return (
    <DemoShell label="Workspace journey">
      <BrowserFrame title={scene.title}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            className="sb-plat-how-stage"
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease }}
          >
            {scene.content}
          </motion.div>
        </AnimatePresence>
        <div className="sb-plat-how-rail">
          {HOW_SCENES.map((s, i) => (
            <div key={s.title} className="sb-plat-how-rail__item">
              {i > 0 && (
                <motion.span
                  className="sb-plat-how-rail__link"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: i <= activeIndex ? 1 : 0.15 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                />
              )}
              <motion.span
                className={`sb-plat-how-rail__dot${i <= activeIndex ? ' is-done' : ''}${i === activeIndex ? ' is-current' : ''}`}
                layout
                animate={i === activeIndex ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                transition={{ duration: 1.6, repeat: i === activeIndex ? Infinity : 0 }}
              >
                {i < activeIndex ? <Check size={10} /> : i + 1}
              </motion.span>
            </div>
          ))}
        </div>
      </BrowserFrame>
    </DemoShell>
  );
}

const ROLE_ICONS = [Shield, SearchCheck, Wallet, GraduationCap, Heart, Bus, Headphones];
const MOBILE_ROLE_ICONS = [Heart, GraduationCap, Shield, Bus];

function RolesDemo({ activeIndex = 0 }) {
  const role = PLATFORM_ROLES[activeIndex] || PLATFORM_ROLES[0];
  const ActiveIcon = ROLE_ICONS[activeIndex] || Users;

  return (
    <DemoShell label="Role-based portals">
      <BrowserFrame title={role.title}>
        <div className="sb-plat-role-stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={role.title}
              className="sb-plat-role-focus"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.35, ease }}
            >
              <motion.span
                className="sb-plat-role-focus__icon"
                aria-hidden
                initial={{ scale: 0.85, rotate: -6 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              >
                <ActiveIcon size={24} strokeWidth={1.75} />
              </motion.span>
              <div className="sb-plat-role-focus__copy">
                <strong>{role.title}</strong>
                <p>{role.items}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="sb-plat-role-strip" aria-hidden>
            {PLATFORM_ROLES.map((item, i) => {
              const Icon = ROLE_ICONS[i];
              const lit = i === activeIndex;
              return (
                <motion.div
                  key={item.title}
                  className={`sb-plat-role-strip__item${lit ? ' is-active' : ''}`}
                  animate={lit ? { scale: [1, 1.05, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                  transition={{ duration: 1.8, repeat: lit ? Infinity : 0, ease: 'easeInOut' }}
                >
                  <span className="sb-plat-role-strip__icon">
                    <Icon size={14} strokeWidth={1.75} />
                  </span>
                  <span className="sb-plat-role-strip__label">{item.title}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </BrowserFrame>
    </DemoShell>
  );
}

function EnrollmentDemo({ view = 'form', step = 0 }) {
  const pages = ENROLLMENT_PAGES;
  const stages = ADMISSION_PIPELINE;
  const page = pages[step] || pages[0];
  const stage = stages[step] || stages[0];

  return (
    <DemoShell label="Enrollment">
      <BrowserFrame title={view === 'workflow' ? 'Application workflow' : view === 'pipeline' ? 'Admission pipeline' : page.page}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${view}-${step}`}
            className="sb-plat-enroll-stage"
            initial={{ opacity: 0, scale: 0.94, filter: 'blur(5px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(3px)' }}
            transition={{ duration: 0.38, ease }}
          >
            {view === 'form' && (
              <div className="sb-plat-enroll-form">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    className="sb-plat-enroll-form__card"
                    initial={{ opacity: 0, x: 28, rotateY: -14 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0 }}
                    exit={{ opacity: 0, x: -28, rotateY: 14 }}
                    transition={{ duration: 0.38, ease }}
                  >
                    <span className="sb-plat-enroll-form__card-label">{page.page}</span>
                    <p>{page.details}</p>
                    <motion.span
                      className="sb-plat-enroll-form__cursor"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="sb-plat-enroll-form__dots" aria-hidden>
                  {pages.map((p, i) => (
                    <motion.span
                      key={p.page}
                      className={i === step ? 'is-active' : ''}
                      animate={i === step ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                      transition={{ duration: 1.6, repeat: i === step ? Infinity : 0 }}
                    />
                  ))}
                </div>
              </div>
            )}

            {view === 'pipeline' && (
              <div className="sb-plat-enroll-pipe">
                <div className="sb-plat-enroll-pipe__track">
                  <motion.span
                    className="sb-plat-enroll-pipe__fill"
                    animate={{ width: `${((step + 1) / stages.length) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                  />
                </div>
                <div className="sb-plat-enroll-pipe__steps">
                  {stages.map((s, i) => (
                    <motion.div
                      key={s.title}
                      className={`sb-plat-enroll-pipe__node${i <= step ? ' is-done' : ''}${i === step ? ' is-current' : ''}`}
                      animate={i === step ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                      transition={{ duration: 1.5, repeat: i === step ? Infinity : 0 }}
                    >
                      <span>{i < step ? <Check size={9} strokeWidth={3} /> : i + 1}</span>
                      <em>{s.title}</em>
                    </motion.div>
                  ))}
                </div>
                <motion.p
                  key={stage.title}
                  className="sb-plat-enroll-pipe__detail"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {stage.description}
                </motion.p>
              </div>
            )}

            {view === 'workflow' && (
              <div className="sb-plat-enroll-flow">
                <motion.div
                  className="sb-plat-enroll-flow__beam"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
                />
                <ol className="sb-plat-enroll-flow__list">
                  {ENROLLMENT_WORKFLOW.map((tag, i) => (
                    <motion.li
                      key={tag}
                      animate={{
                        opacity: [0.4, 1, 0.4],
                        y: [0, -3, 0],
                      }}
                      transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.28 }}
                    >
                      <span>{tag}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </BrowserFrame>
    </DemoShell>
  );
}

const FEE_ITEMS = [...FEES_AND_DOCS, ...OPERATIONS];

const FEE_SCENES = [
  {
    title: 'Fee structures',
    content: (
      <div className="sb-plat-fees-scene sb-plat-fees-scene--structure">
        {['Admission', 'Tuition', 'Transport'].map((label, i) => (
          <motion.div
            key={label}
            className="sb-plat-fees__row"
            initial={{ x: -16, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.45, delay: i * 0.15, repeat: Infinity, repeatDelay: 2.5 }}
          >
            <Receipt size={16} />
            <span>{label}</span>
            <motion.strong
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            >
              {['₹12,500', '₹8,200', '₹2,400'][i]}
            </motion.strong>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    title: 'Payment verify',
    content: (
      <div className="sb-plat-fees-scene sb-plat-fees-scene--verify">
        <motion.div
          className="sb-plat-fees__upload"
          animate={{ borderColor: ['rgba(15,23,42,0.12)', 'rgba(251,191,36,0.8)', 'rgba(15,23,42,0.12)'] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          <Upload size={18} />
          <span>Payment proof</span>
        </motion.div>
        <div className="sb-plat-fees__actions">
          <motion.span className="sb-plat-fees__approve" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
            <Check size={12} /> Approve
          </motion.span>
          <motion.span className="sb-plat-fees__reject" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
            <X size={12} /> Reject
          </motion.span>
        </div>
      </div>
    ),
  },
  {
    title: 'Secure documents',
    content: (
      <div className="sb-plat-fees-scene sb-plat-fees-scene--docs">
        {[FileText, FolderOpen, FileText].map((Icon, i) => (
          <motion.div
            key={i}
            className="sb-plat-fees__doc"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: [12, 0, 0], opacity: [0, 1, 1] }}
            transition={{ duration: 0.5, delay: i * 0.2, repeat: Infinity, repeatDelay: 2.8 }}
          >
            <Icon size={18} />
            <span>{['Birth cert', 'Address proof', 'Photo'][i]}</span>
            <motion.span className="sb-plat-fees__doc-lock" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }}>
              Secure
            </motion.span>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    title: 'Digital receipts',
    content: (
      <div className="sb-plat-fees-scene sb-plat-fees-scene--receipt">
        <motion.div
          className="sb-plat-fees__receipt"
          animate={{ y: [24, 0, 0], opacity: [0, 1, 1], rotate: [10, 0, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2, ease }}
        >
          <BookOpen size={20} />
          <motion.span
            className="sb-plat-fees__receipt-num"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1] }}
            transition={{ duration: 0.6, delay: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            RCP-2026-0842
          </motion.span>
          <motion.span
            className="sb-plat-fees__check"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.45, delay: 0.8, repeat: Infinity, repeatDelay: 2 }}
          >
            <Check size={12} />
          </motion.span>
        </motion.div>
      </div>
    ),
  },
  {
    title: 'Class management',
    content: (
      <div className="sb-plat-fees-scene sb-plat-fees-scene--classes">
        {['Nursery A', 'KG B', 'Prep C'].map((name, i) => (
          <motion.div
            key={name}
            className="sb-plat-fees__class"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: [0.9, 1, 1], opacity: [0, 1, 1] }}
            transition={{ duration: 0.45, delay: i * 0.18, repeat: Infinity, repeatDelay: 2.6 }}
          >
            <School size={16} />
            <strong>{name}</strong>
            <span>Teacher assigned</span>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    title: 'User management',
    content: (
      <div className="sb-plat-fees-scene sb-plat-fees-scene--users">
        <motion.div className="sb-plat-fees__avatars">
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="sb-plat-fees__avatar"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.1, 1] }}
              transition={{ duration: 0.4, delay: i * 0.12, repeat: Infinity, repeatDelay: 2.8 }}
            />
          ))}
        </motion.div>
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Invite staff · Manage roles
        </motion.p>
      </div>
    ),
  },
  {
    title: 'Portal settings',
    content: (
      <div className="sb-plat-scene sb-plat-scene--brand">
        <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
          <IconWrap>
            <Palette size={20} strokeWidth={1.75} />
          </IconWrap>
        </motion.div>
        <motion.div className="sb-plat-scene__swatches">
          {['#0f172a', '#fbbf24', '#e0f2fe', '#fef9c3'].map((color, i) => (
            <motion.span
              key={color}
              style={{ background: color }}
              animate={{ scale: [0.9, 1.15, 1], y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease }}
            />
          ))}
        </motion.div>
        <motion.div
          className="sb-plat-scene__brand-bar"
          animate={{ width: ['20%', '85%', '85%', '20%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease }}
        />
      </div>
    ),
  },
  {
    title: 'Reports & audit',
    content: (
      <div className="sb-plat-fees-scene sb-plat-fees-scene--reports">
        <div className="sb-plat-fees__bars">
          {[42, 68, 55, 82, 48].map((h, i) => (
            <motion.span
              key={i}
              style={{ '--h': `${h}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: [0, 1, 1] }}
              transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity, repeatDelay: 2.5 }}
            />
          ))}
        </div>
        <motion.span className="sb-plat-fees__report-label" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
          <BarChart3 size={14} /> Applications · Fees · Audit log
        </motion.span>
      </div>
    ),
  },
];

function FeesDemo({ activeIndex = 0 }) {
  const step = activeIndex % FEE_SCENES.length;
  const scene = FEE_SCENES[step] || FEE_SCENES[0];
  const item = FEE_ITEMS[step];

  return (
    <DemoShell label="Fees & operations">
      <BrowserFrame title={item?.title || scene.title}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="sb-plat-how-stage"
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease }}
          >
            {scene.content}
          </motion.div>
        </AnimatePresence>
      </BrowserFrame>
    </DemoShell>
  );
}

const MEDIA_ITEMS = [...COMMUNICATION_MEDIA, ...TV_PLAYBACK_STEPS];

function MediaDemo({ activeIndex = 0 }) {
  const step = activeIndex % MEDIA_ITEMS.length;
  const item = MEDIA_ITEMS[step];
  const isTvFlow = step >= COMMUNICATION_MEDIA.length;

  return (
    <DemoShell label="Photos, chat & TV" tall>
      <BrowserFrame title={item?.title || item?.label}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="sb-plat-media-stage"
            initial={{ opacity: 0, scale: 0.94, filter: 'blur(5px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(3px)' }}
            transition={{ duration: 0.38, ease }}
          >
            {!isTvFlow && step === 0 && (
              <div className="sb-plat-media sb-plat-media--chat-focus">
                <motion.div className="sb-plat-media__chat" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <MessageCircle size={16} />
                  <div>
                    {['Great work today!', 'See you tomorrow'].map((msg, i) => (
                      <motion.span
                        key={msg}
                        className="sb-plat-media__msg"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: '100%', opacity: 1 }}
                        transition={{ duration: 0.5, delay: i * 0.3, repeat: Infinity, repeatDelay: 2 }}
                      >
                        {msg}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
            {!isTvFlow && step === 1 && (
              <div className="sb-plat-media sb-plat-media--bell-focus">
                <motion.div className="sb-plat-media__bell" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <Bell size={28} />
                  <motion.span className="sb-plat-media__bell-ring" animate={{ scale: [1, 2], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                </motion.div>
              </div>
            )}
            {!isTvFlow && step === 2 && (
              <div className="sb-plat-media sb-plat-media--photos">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="sb-plat-media__photo"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.15, repeat: Infinity, repeatDelay: 2.5 }}
                  >
                    <Camera size={16} />
                  </motion.div>
                ))}
              </div>
            )}
            {!isTvFlow && step === 3 && (
              <div className="sb-plat-media sb-plat-media--share">
                <motion.div animate={{ x: [0, 40, 0], opacity: [1, 0.5, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                  <Images size={22} />
                </motion.div>
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
                  → Parents
                </motion.span>
              </div>
            )}
            {!isTvFlow && step === 4 && (
              <div className="sb-plat-media sb-plat-media--album">
                <motion.div className="sb-plat-media__album-grid">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span key={i} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </motion.div>
                <FolderOpen size={20} />
              </div>
            )}
            {!isTvFlow && step === 5 && (
              <div className="sb-plat-media sb-plat-media--tv-ready">
                <motion.div className="sb-plat-media__tv" animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                  <Tv size={22} />
                  <motion.div className="sb-plat-media__scan" animate={{ x: ['-120%', '220%'] }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }} />
                </motion.div>
              </div>
            )}
            {isTvFlow && (
              <div className="sb-plat-media sb-plat-media--tv-flow">
                <motion.div
                  className="sb-plat-media__tv-step"
                  key={item?.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {step === 6 && (
                    <>
                      <QrCode size={36} />
                      <motion.div className="sb-plat-media__scan" animate={{ x: ['-120%', '220%'] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
                    </>
                  )}
                  {step === 7 && (
                    <motion.div animate={{ x: [20, 0, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}>
                      <Smartphone size={28} />
                      <Check size={14} className="sb-plat-media__scan-ok" />
                    </motion.div>
                  )}
                  {step === 8 && (
                    <motion.div className="sb-plat-media__album-pick" animate={{ scale: [0.95, 1.05, 0.95] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Images size={24} />
                      <span>Class album</span>
                    </motion.div>
                  )}
                  {step === 9 && (
                    <motion.div className="sb-plat-media__tv-play" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Tv size={28} />
                      <motion.span className="sb-plat-media__play-beam" animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                    </motion.div>
                  )}
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </BrowserFrame>
    </DemoShell>
  );
}

const CLASS_ROSTER = [
  { name: 'Aarav', status: 'Present' },
  { name: 'Meera', status: 'Present' },
  { name: 'Kabir', status: 'Late' },
  { name: 'Anaya', status: 'Present' },
];

const CLASS_MARKS = [
  { subject: 'Science', score: '92' },
  { subject: 'English', score: '88' },
  { subject: 'Math', score: '95' },
];

const CLASS_PERIODS = [
  { day: 'Mon', subject: 'Math' },
  { day: 'Tue', subject: 'Art', live: true },
  { day: 'Wed', subject: 'PE' },
];

const BUS_FLEET = [
  { name: 'Bus 12', driver: 'Ravi', status: 'On route' },
  { name: 'Van 04', driver: 'Sita', status: 'At school' },
];

const TRIP_STOPS = ['School', 'City Park', 'Home'];

function ClassroomScenes({ step }) {
  if (step === 0) {
    return (
      <div className="sb-plat-class">
        {CLASS_ROSTER.map((student, i) => (
          <motion.div
            key={student.name}
            className={`sb-plat-class__row${student.status === 'Late' ? ' is-late' : ''}`}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.38, delay: i * 0.08, ease }}
          >
            <span>{student.name}</span>
            <motion.em
              className={`sb-plat-class__mark${student.status === 'Late' ? ' is-late' : ''}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.18 + i * 0.08 }}
            >
              {student.status === 'Late' ? 'L' : <Check size={11} strokeWidth={3} />}
            </motion.em>
            <small>{student.status}</small>
          </motion.div>
        ))}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="sb-plat-class sb-plat-class--card">
        <div className="sb-plat-class__head">
          <BookOpen size={16} />
          <div>
            <strong>Math worksheet</strong>
            <span>Due tomorrow · Class 3-B</span>
          </div>
        </div>
        <div className="sb-plat-class__meta">
          <span>18 of 24 submitted</span>
          <b>75%</b>
        </div>
        <div className="sb-plat-class__progress" role="presentation">
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 0.75 }}
            transition={{ duration: 0.9, ease, delay: 0.15 }}
          />
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="sb-plat-class sb-plat-class--marks">
        {CLASS_MARKS.map((row, i) => (
          <motion.div
            key={row.subject}
            className="sb-plat-class__row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.1, ease }}
          >
            <span>{row.subject}</span>
            <strong>{row.score}</strong>
          </motion.div>
        ))}
        <motion.span
          className="sb-plat-class__stamp"
          initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: -6, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 16, delay: 0.45 }}
        >
          Published
        </motion.span>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="sb-plat-class__grid">
        {CLASS_PERIODS.map((cell, i) => (
          <motion.div
            key={cell.day}
            className={`sb-plat-class__cell${cell.live ? ' is-live' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={cell.live ? { opacity: 1, y: 0, scale: [1, 1.04, 1] } : { opacity: 1, y: 0 }}
            transition={cell.live
              ? { opacity: { duration: 0.35, delay: i * 0.1 }, scale: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } }
              : { duration: 0.35, delay: i * 0.1, ease }}
          >
            <small>{cell.day}</small>
            <strong>{cell.subject}</strong>
          </motion.div>
        ))}
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="sb-plat-class sb-plat-class--card sb-plat-class--lms">
        <div className="sb-plat-class__head">
          <GraduationCap size={16} />
          <div>
            <strong>Phonics Level 2</strong>
            <span>Lesson 8 of 12</span>
          </div>
        </div>
        <div className="sb-plat-class__ring-wrap">
          <svg className="sb-plat-class__ring" viewBox="0 0 72 72" aria-hidden>
            <circle cx="36" cy="36" r="28" />
            <motion.circle
              cx="36"
              cy="36"
              r="28"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 0.72 }}
              transition={{ duration: 1.05, ease, delay: 0.12 }}
            />
          </svg>
          <b>72%</b>
        </div>
        <motion.span
          className="sb-plat-class__cert"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.35, ease }}
        >
          Certificate ready
        </motion.span>
      </div>
    );
  }

  return (
    <div className="sb-plat-class sb-plat-class--card">
      <div className="sb-plat-class__head">
        <BookMarked size={16} />
        <div>
          <strong>Sick leave</strong>
          <span>Anaya · 1 day · Class 3-B</span>
        </div>
      </div>
      <div className="sb-plat-class__actions">
        <motion.span
          className="sb-plat-class__approve"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Check size={12} strokeWidth={3} /> Approve
        </motion.span>
        <span className="sb-plat-class__ghost">Review</span>
      </div>
    </div>
  );
}

function ClassroomDemo({ activeIndex = 0 }) {
  const step = activeIndex % CLASSROOM_MODULES.length;
  const item = CLASSROOM_MODULES[step];

  return (
    <DemoShell label="Classroom" tall>
      <BrowserFrame title={item.title}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="sb-plat-class-stage"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.36, ease }}
          >
            <ClassroomScenes step={step} />
          </motion.div>
        </AnimatePresence>
      </BrowserFrame>
    </DemoShell>
  );
}

function TransportScenes({ step }) {
  if (step === 0) {
    return (
      <div className="sb-plat-bus">
        {BUS_FLEET.map((vehicle, i) => (
          <motion.div
            key={vehicle.name}
            className="sb-plat-bus__card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: i * 0.12, ease }}
          >
            <span className="sb-plat-bus__icon"><Bus size={16} /></span>
            <div>
              <strong>{vehicle.name}</strong>
              <small>{vehicle.driver}</small>
            </div>
            <em className={i === 0 ? 'is-live' : ''}>{vehicle.status}</em>
          </motion.div>
        ))}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="sb-plat-bus-map">
        <span className="sb-plat-bus-map__road" />
        <span className="sb-plat-bus-map__road sb-plat-bus-map__road--v" />
        <motion.div
          className="sb-plat-bus-map__pin"
          animate={{ left: ['14%', '72%', '14%'] }}
          transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="sb-plat-bus-map__ping"
            animate={{ scale: [0.7, 1.55], opacity: [0.55, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
          <Bus size={16} />
          <small>Live</small>
        </motion.div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="sb-plat-bus-parent">
        <div className="sb-plat-bus-parent__eta">
          <MapPin size={16} />
          <div>
            <strong>Bus 12</strong>
            <span>Arriving in 4 min</span>
          </div>
          <motion.b
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            4:12
          </motion.b>
        </div>
        <div className="sb-plat-bus-map sb-plat-bus-map--mini">
          <span className="sb-plat-bus-map__road" />
          <motion.div
            className="sb-plat-bus-map__pin"
            animate={{ left: ['22%', '64%', '22%'] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Bus size={14} />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="sb-plat-bus-trip">
      <span className="sb-plat-bus-trip__line" />
      <motion.span
        className="sb-plat-bus-trip__fill"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 0.62 }}
        transition={{ duration: 1.1, ease, delay: 0.12 }}
      />
      {TRIP_STOPS.map((stop, i) => (
        <motion.div
          key={stop}
          className={`sb-plat-bus-trip__stop${i === 1 ? ' is-current' : ''}${i === 0 ? ' is-done' : ''}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: i * 0.12, ease }}
        >
          <i>{i === 0 ? <Check size={10} strokeWidth={3} /> : i + 1}</i>
          <strong>{stop}</strong>
        </motion.div>
      ))}
    </div>
  );
}

function TransportDemo({ activeIndex = 0 }) {
  const step = activeIndex % TRANSPORT_MODULES.length;
  const item = TRANSPORT_MODULES[step];

  return (
    <DemoShell label="Live transport" tall>
      <BrowserFrame title={item.title}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="sb-plat-bus-stage"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.36, ease }}
          >
            <TransportScenes step={step} />
          </motion.div>
        </AnimatePresence>
      </BrowserFrame>
    </DemoShell>
  );
}

function MobileScreenScene({ screen }) {
  const kind = screen.kind;

  if (kind === 'home') {
    return (
      <div className="sb-plat-app-scene">
        {[
          { icon: Bus, label: 'Bus 12', value: '4 min' },
          { icon: BookOpen, label: 'Homework', value: 'Due' },
          { icon: Wallet, label: 'Fees', value: '₹8,200' },
        ].map((tile, i) => {
          const Icon = tile.icon;
          return (
            <motion.div
              key={tile.label}
              className="sb-plat-app-tile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.32, ease }}
            >
              <Icon size={13} />
              <span>{tile.label}</span>
              <strong>{tile.value}</strong>
            </motion.div>
          );
        })}
      </div>
    );
  }

  if (kind === 'photos' || kind === 'albums') {
    return (
      <div className="sb-plat-app-photos">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07, duration: 0.3, ease }}
          >
            <Camera size={12} />
          </motion.span>
        ))}
      </div>
    );
  }

  if (kind === 'fees') {
    return (
      <div className="sb-plat-app-card">
        <Wallet size={16} />
        <strong>₹8,200</strong>
        <span>Term fee due</span>
        <motion.em
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          Pay now
        </motion.em>
      </div>
    );
  }

  if (kind === 'homework') {
    return (
      <div className="sb-plat-app-card">
        <BookOpen size={16} />
        <strong>{screen.title}</strong>
        <span>{screen.detail}</span>
        <div className="sb-plat-class__progress">
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 0.75 }}
            transition={{ duration: 0.8, ease }}
          />
        </div>
      </div>
    );
  }

  if (kind === 'exams') {
    return (
      <div className="sb-plat-app-card">
        <FileText size={16} />
        <strong>{screen.title}</strong>
        <span>{screen.detail}</span>
        <b className="sb-plat-app-score">92</b>
      </div>
    );
  }

  if (kind === 'bus' || kind === 'gps' || kind === 'route') {
    return (
      <div className="sb-plat-app-bus">
        <div className="sb-plat-app-card sb-plat-app-card--row">
          <MapPin size={14} />
          <div>
            <strong>{screen.title}</strong>
            <span>{screen.detail}</span>
          </div>
        </div>
        <div className="sb-plat-bus-map sb-plat-bus-map--mini">
          <span className="sb-plat-bus-map__road" />
          <motion.div
            className="sb-plat-bus-map__pin"
            animate={{ left: ['18%', '70%', '18%'] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Bus size={13} />
          </motion.div>
        </div>
      </div>
    );
  }

  if (kind === 'chat') {
    return (
      <div className="sb-plat-app-chat">
        {['Field trip at 9am', 'Noted, thank you'].map((msg, i) => (
          <motion.span
            key={msg}
            className={i === 1 ? 'is-reply' : ''}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.18, duration: 0.32, ease }}
          >
            {msg}
          </motion.span>
        ))}
      </div>
    );
  }

  if (kind === 'enroll') {
    return (
      <div className="sb-plat-app-card">
        <ClipboardList size={16} />
        <strong>{screen.title}</strong>
        <span>{screen.detail}</span>
        <div className="sb-plat-app-pills">
          {['Draft', 'Review', 'Fees'].map((pill, i) => (
            <em key={pill} className={i === 1 ? 'is-on' : ''}>{pill}</em>
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'classes') {
    return (
      <div className="sb-plat-app-card">
        <School size={16} />
        <strong>{screen.title}</strong>
        <span>{screen.detail}</span>
      </div>
    );
  }

  if (kind === 'attendance') {
    return (
      <div className="sb-plat-app-card">
        <Check size={16} />
        <strong>28 / 30</strong>
        <span>Class 3-B marked</span>
      </div>
    );
  }

  if (kind === 'reports') {
    return (
      <div className="sb-plat-app-bars">
        {[42, 68, 55, 82].map((h, i) => (
          <motion.span
            key={i}
            style={{ '--h': `${h}%` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease }}
          />
        ))}
      </div>
    );
  }

  if (kind === 'users') {
    return (
      <div className="sb-plat-app-users">
        {[0, 1, 2, 3].map((i) => (
          <motion.i
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 360, damping: 18 }}
          />
        ))}
      </div>
    );
  }

  if (kind === 'tvqr') {
    return (
      <div className="sb-plat-app-card sb-plat-app-card--center">
        <QrCode size={36} />
        <span>{screen.detail}</span>
      </div>
    );
  }

  if (kind === 'trip') {
    return (
      <div className="sb-plat-app-card sb-plat-app-card--center">
        <Bus size={18} />
        <strong>Start trip</strong>
        <motion.em
          className="sb-plat-class__approve"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Go live
        </motion.em>
      </div>
    );
  }

  return (
    <div className="sb-plat-app-stops">
      {['School', 'City Park', 'Home'].map((stop, i) => (
        <motion.div
          key={stop}
          className={i < 2 ? 'is-done' : ''}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3, ease }}
        >
          <i>{i < 2 ? <Check size={10} strokeWidth={3} /> : i + 1}</i>
          {stop}
        </motion.div>
      ))}
    </div>
  );
}

function MobileDemo({ activeIndex = 0 }) {
  const role = MOBILE_APP_ROLES[activeIndex] || MOBILE_APP_ROLES[0];
  const screens = role.screens;
  const RoleIcon = MOBILE_ROLE_ICONS[activeIndex] || Smartphone;
  const [screenIndex, setScreenIndex] = useState(0);
  const current = screens[screenIndex] || screens[0];

  useEffect(() => {
    setScreenIndex(0);
    if (screens.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setScreenIndex((index) => (index + 1) % screens.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [activeIndex, screens.length]);

  return (
    <DemoShell label="iOS & Android apps" tall>
      <div className="sb-plat-mobile-wrap">
        <PhoneFrame>
          <div className="sb-plat-mobile__app-bar">
            <span className="sb-plat-mobile__app-icon" aria-hidden>
              <RoleIcon size={14} strokeWidth={1.75} />
            </span>
            <span className="sb-plat-mobile__app-name">{role.role}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeIndex}-${current.label}`}
              className="sb-plat-mobile__hero-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease }}
            >
              <div>
                <strong>{current.title}</strong>
                <span>{current.detail}</span>
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeIndex}-${current.kind}`}
              className="sb-plat-mobile__body"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease }}
            >
              <MobileScreenScene screen={current} />
            </motion.div>
          </AnimatePresence>

          <p className="sb-plat-mobile__screens-label">Screens</p>
          <ul className="sb-plat-mobile__screen-list">
            {screens.map((screen, i) => (
              <motion.li
                key={screen.label}
                className={i === screenIndex ? 'is-active' : ''}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.24 }}
                onClick={() => setScreenIndex(i)}
              >
                {screen.label}
              </motion.li>
            ))}
          </ul>
        </PhoneFrame>
      </div>
    </DemoShell>
  );
}

export default function PlatformShowcaseVisual({
  tabId,
  activeStep = 0,
  enrollmentView = 'form',
  enrollmentStep = 0,
}) {
  const renderDemo = () => {
    switch (tabId) {
      case 'how':
        return <HowDemo activeIndex={activeStep} />;
      case 'enrollment':
        return <EnrollmentDemo view={enrollmentView} step={enrollmentStep} />;
      case 'roles':
        return <RolesDemo activeIndex={activeStep} />;
      case 'classroom':
        return <ClassroomDemo activeIndex={activeStep} />;
      case 'transport':
        return <TransportDemo activeIndex={activeStep} />;
      case 'fees':
        return <FeesDemo activeIndex={activeStep} />;
      case 'media':
        return <MediaDemo activeIndex={activeStep} />;
      case 'mobile':
        return <MobileDemo activeIndex={activeStep} />;
      default:
        return <FeaturesDemo activeIndex={activeStep} />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabId}
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.99, y: -6 }}
        transition={{ duration: 0.38, ease }}
      >
        {renderDemo()}
      </motion.div>
    </AnimatePresence>
  );
}
