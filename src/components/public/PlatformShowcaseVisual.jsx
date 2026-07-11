import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Camera,
  Check,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  Headphones,
  Heart,
  Images,
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
  COMMUNICATION_MEDIA,
  ENROLLMENT_PAGES,
  ENROLLMENT_WORKFLOW,
  FEES_AND_DOCS,
  MOBILE_APP_ROLES,
  OPERATIONS,
  PLATFORM_FEATURES,
  PLATFORM_ROLES,
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

function DemoShell({ label, children, tall }) {
  const particles = [12, 28, 45, 62, 78, 88];

  return (
    <motion.div
      className={`sb-plat-demo${tall ? ' sb-plat-demo--tall' : ''}`}
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
      className="sb-plat-phone"
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
  { label: 'Forms', icon: FileText, pos: 'tr' },
  { label: 'Fees', icon: Wallet, pos: 'ml' },
  { label: 'Chat', icon: MessageCircle, pos: 'mr' },
  { label: 'Photos', icon: Camera, pos: 'bl' },
  { label: 'TV', icon: Tv, pos: 'br' },
];

function FeaturesDemo({ activeIndex = 0 }) {
  const feature = PLATFORM_FEATURES[activeIndex] || PLATFORM_FEATURES[0];
  const FeatureIcon = feature.icon;

  return (
    <DemoShell label="Live workspace modules">
      <BrowserFrame title={feature.title}>
        <div className="sb-plat-modules sb-plat-modules--orbit">
          <svg className="sb-plat-modules__lines" viewBox="0 0 200 120" preserveAspectRatio="none">
            {MODULE_POSITIONS.map(({ label }, i) => (
              <motion.line
                key={label}
                x1="100"
                y1="60"
                x2={[30, 170, 20, 180, 40, 160][i]}
                y2={[28, 28, 60, 60, 92, 92][i]}
                stroke={i === activeIndex % MODULE_POSITIONS.length ? 'rgba(201,162,39,0.75)' : 'rgba(255,255,255,0.2)'}
                strokeWidth={i === activeIndex % MODULE_POSITIONS.length ? 2 : 1}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: [0, 1, 1], opacity: [0, 0.6, i === activeIndex % MODULE_POSITIONS.length ? 0.9 : 0.25] }}
                transition={{ duration: 2.2, delay: i * 0.15, repeat: Infinity, repeatDelay: 3 }}
              />
            ))}
          </svg>
          <motion.div
            className="sb-plat-modules__pulse"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(201,162,39,0.35)',
                '0 0 0 14px rgba(201,162,39,0)',
                '0 0 0 0 rgba(201,162,39,0)',
              ],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut' }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={feature.title}
                initial={{ scale: 0.7, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0, rotate: 12 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              >
                <IconWrap size="lg" pulse>
                  <FeatureIcon size={20} strokeWidth={1.75} />
                </IconWrap>
              </motion.span>
            </AnimatePresence>
          </motion.div>
          {MODULE_POSITIONS.map(({ icon: Icon, label, pos }, i) => {
            const lit = i === activeIndex % MODULE_POSITIONS.length;
            return (
              <motion.div
                key={label}
                className={`sb-plat-modules__tile sb-plat-modules__tile--${pos}${lit ? ' is-lit' : ''}`}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: lit ? [0.85, 1, 0.85] : [0.35, 0.55, 0.35],
                  y: lit ? [0, -8, 0] : [0, -3, 0],
                  scale: lit ? [1, 1.08, 1] : 1,
                }}
                transition={{ duration: lit ? 2.2 : 2.8, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
              >
                <motion.span
                  className="sb-plat-modules__tile-glow"
                  animate={{ opacity: lit ? [0.4, 1, 0.4] : [0, 0.3, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35 }}
                />
                <IconWrap size="sm">
                  <Icon size={16} strokeWidth={1.75} />
                </IconWrap>
                <span>{label}</span>
              </motion.div>
            );
          })}
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
          {['#6b4c9a', '#c9a227', '#e8dff5', '#3d2a66'].map((color, i) => (
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
          animate={{ y: [0, -6, 0], borderColor: ['rgba(255,255,255,0.2)', 'rgba(201,162,39,0.6)', 'rgba(255,255,255,0.2)'] }}
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
    title: 'Stay connected',
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

const ROLE_ICONS = [Shield, SearchCheck, Wallet, GraduationCap, Heart, Headphones];
const ROLE_SHORT = ['Admin', 'Admissions', 'Finance', 'Teacher', 'Parent', 'Support'];
const MOBILE_ROLE_ICONS = [Heart, GraduationCap, Shield];

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
                  <span className="sb-plat-role-strip__label">{ROLE_SHORT[i]}</span>
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
    <DemoShell label="Kidzee admissions">
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
          animate={{ borderColor: ['rgba(255,255,255,0.2)', 'rgba(201,162,39,0.7)', 'rgba(255,255,255,0.2)'] }}
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
          {['#6b4c9a', '#c9a227', '#e8dff5', '#3d2a66'].map((color, i) => (
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
                    style={{ '--i': i }}
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

const MOBILE_PREVIEW = {
  0: { icon: Heart, title: 'Enrollment', detail: 'Track admission status' },
  1: { icon: Camera, title: 'Class photos', detail: 'Share albums with parents' },
  2: { icon: ClipboardList, title: 'Applications', detail: 'Review pending admits' },
};

function MobileDemo({ activeIndex = 0 }) {
  const role = MOBILE_APP_ROLES[activeIndex] || MOBILE_APP_ROLES[0];
  const screens = role.screens.split(', ').filter(Boolean);
  const RoleIcon = MOBILE_ROLE_ICONS[activeIndex] || Smartphone;
  const preview = MOBILE_PREVIEW[activeIndex] || MOBILE_PREVIEW[0];
  const PreviewIcon = preview.icon;

  return (
    <DemoShell label="iOS & Android apps">
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
              key={`${activeIndex}-preview`}
              className="sb-plat-mobile__hero-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease }}
            >
              <span className="sb-plat-mobile__hero-icon" aria-hidden>
                <PreviewIcon size={18} strokeWidth={1.75} />
              </span>
              <div>
                <strong>{preview.title}</strong>
                <span>{preview.detail}</span>
              </div>
            </motion.div>
          </AnimatePresence>

          <p className="sb-plat-mobile__screens-label">Screens</p>
          <ul className="sb-plat-mobile__screen-list">
            {screens.map((screen, i) => (
              <motion.li
                key={screen}
                className={i === 0 ? 'is-active' : ''}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.28 }}
              >
                {screen}
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
