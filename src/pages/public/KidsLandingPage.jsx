import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  DollarSign,
  FileText,
  Heart,
  Home,
  Image as ImageIcon,
  Layers,
  LogIn,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  ShieldCheck,
  Star,
  Tv,
  Users,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react';
import PlatformLandingSections from '../../components/public/PlatformLandingSections.jsx';
import kidsLogo from '../../assets/Logo/KidsLogo.png';
import '../../styles/kids-landing-page.css';

const roleCards = [
  {
    theme: 'yellow',
    icon: ClipboardCheck,
    title: 'For Administrators',
    description: 'Run the whole school without switching between spreadsheets and chats.',
    items: [
      'Admissions pipeline & document review',
      'Classes, sections & staff structure',
      'Fees, receipts and reports',
      'Portal settings and role permissions',
    ],
  },
  {
    theme: 'blue',
    icon: BookOpen,
    title: 'For Teachers',
    description: 'Only what you need for your class—clean, calm and mobile-first.',
    items: [
      'Assigned classes & rosters',
      'Share photos and videos safely',
      'Message parents 1:1 or class-wide',
      'Quick attendance & updates',
    ],
  },
  {
    theme: 'green',
    icon: Heart,
    title: 'For Parents',
    description: "See your child's school day in one warm, simple feed.",
    items: [
      'Track applications & upload documents',
      'Fee status and payment history',
      'Photos and videos of your child',
      'Direct line to the school office',
    ],
  },
];

const features = [
  {
    theme: 'yellow',
    icon: ClipboardCheck,
    eyebrow: 'Onboard Families',
    title: "Admissions that don't lose paperwork",
    description:
      'From inquiry to enrollment—track applications, collect documents, and move families through review stages without email threads.',
  },
  {
    theme: 'blue',
    icon: Users,
    eyebrow: 'Structure',
    title: 'Classes & staff structure',
    description: 'Build class-section trees, assign teachers, and manage rosters in minutes.',
  },
  {
    theme: 'red',
    icon: WalletCards,
    eyebrow: 'Money Made Calm',
    title: 'Fees, receipts & reports',
    description: 'Track dues, share receipts, and export the reports your finance team asks for.',
  },
  {
    theme: 'green',
    icon: MessageCircle,
    eyebrow: 'Messages',
    title: 'Warm, human communication',
    description:
      'Teachers can message parents 1:1 or by class. Admins can send school-wide notices. Every message lands in the same friendly inbox.',
  },
  {
    theme: 'purple',
    icon: ImageIcon,
    eyebrow: 'Photos & Video',
    title: 'Classroom media, safely shared',
    description:
      "Share photos and videos with the right families. Parents see only their child's approved albums.",
  },
  {
    theme: 'orange',
    icon: Tv,
    eyebrow: 'Big Screens',
    title: 'Android TV slideshow',
    description:
      'Turn any approved class album into a smooth photo-and-video slideshow on your lobby or hallway TV—refreshed automatically.',
  },
];

const steps = [
  {
    icon: Home,
    theme: 'yellow',
    title: 'Set up your school',
    description:
      'Add classes, sections and staff. Turn on the modules you need—admissions, fees, media, or all of them.',
  },
  {
    icon: Users,
    theme: 'blue',
    title: 'Invite teachers & families',
    description:
      "Teachers get their class dashboards. Parents get a warm, simple app that shows only what's theirs.",
  },
  {
    icon: Layers,
    theme: 'green',
    title: 'Run the day together',
    description:
      'Approve admissions, send messages, share photos, and stream the lobby TV—all from one workspace.',
  },
];

const testimonials = [
  {
    theme: 'yellow',
    quote:
      '"Parents finally stopped asking me for photos on WhatsApp. Everything lives in Kids Activities."',
    name: 'Ms. Priya',
    role: 'Class Teacher, Grade 3',
  },
  {
    theme: 'blue',
    quote: '"Admissions used to take three folders per family. Now it’s one clean pipeline."',
    name: 'Rahul S.',
    role: 'School Administrator',
  },
  {
    theme: 'green',
    quote: '"Seeing my daughter’s classroom photos on the lobby TV every morning made me smile."',
    name: 'Anita M.',
    role: 'Parent, Grade 1',
  },
];

const faqs = [
  [
    'Which roles can log in to Kids Activities?',
    'School administrators, teachers, and parents all have dedicated login portals tailored to their specific needs.',
  ],
  [
    "Do parents only see their own child's media?",
    "Yes, safety is our priority. Parents only have access to albums and media explicitly shared with their child's class or account.",
  ],
  [
    'How does the Android TV slideshow work?',
    'Simply install our app on any Android TV and pair it with your school account. You can then push any approved media album directly to the screen.',
  ],
  [
    'Can we start with just admissions or just messaging?',
    'Absolutely. Our platform is modular, allowing you to enable only the features your school needs right now.',
  ],
  [
    'Is our school and family data safe?',
    'We use industry-standard encryption and follow strict data privacy guidelines to ensure all school and student information remains secure.',
  ],
  [
    'Do teachers need a separate app?',
    'Teachers can use the web dashboard or our mobile app, whichever fits their workflow best.',
  ],
];

function Brand() {
  return (
    <a className="kl-brand" href="#top" aria-label="Kids Activities home">
      <img
        src={kidsLogo}
        alt="Kids Activities"
        className="kl-brand__logo"
        width={220}
        height={56}
        decoding="async"
      />
    </a>
  );
}

function SectionBadge({ icon: Icon, children, theme = 'yellow' }) {
  return (
    <div className={`kl-badge kl-badge--${theme}`}>
      <Icon size={16} />
      {children}
    </div>
  );
}

function RoleCard({ role }) {
  const Icon = role.icon;
  return (
    <article className={`kl-role-card kl-theme--${role.theme}`}>
      <div className="kl-icon-tile">
        <Icon size={32} />
      </div>
      <h3>{role.title}</h3>
      <p>{role.description}</p>
      <ul>
        {role.items.map((item) => (
          <li key={item}>
            <Check size={20} strokeWidth={2.7} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function FeatureCard({ feature, index }) {
  const Icon = feature.icon;
  return (
    <article
      className={`kl-feature-card kl-feature-reveal kl-theme--${feature.theme}`}
      style={{ '--kl-reveal-delay': `${120 + index * 110}ms` }}
    >
      <span className="kl-feature-card__blob" />
      <div className="kl-icon-tile">
        <Icon size={24} />
      </div>
      <div className="kl-card-eyebrow">{feature.eyebrow}</div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </article>
  );
}

export default function KidsLandingPage() {
  const navigate = useNavigate();
  const [workspaceSlug, setWorkspaceSlug] = useState('');

  useEffect(() => {
    const revealItems = document.querySelectorAll('.kl-feature-reveal');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
    );

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function handleSignIn(e) {
    e.preventDefault();
    const slug = workspaceSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) return;
    navigate(`/${slug}/login`);
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  return (
    <div className="kids-landing" id="top">
      <header className={`kl-header${mobileNavOpen ? ' kl-header--nav-open' : ''}`}>
        <nav className="kl-container kl-nav" aria-label="Main navigation">
          <Brand />
          <div className="kl-nav__links">
            <a href="#get-started">Get started</a>
            <a href="#roles">Roles</a>
            <a href="#features">Features</a>
            <a href="#platform-overview">Overview</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="kl-nav__actions">
            <a className="kl-button kl-button--navy kl-button--small" href="#get-started" onClick={closeMobileNav}>
              Open workspace
            </a>
            <button
              type="button"
              className="kl-nav__toggle"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
        {mobileNavOpen && (
          <div className="kl-nav__drawer" role="navigation" aria-label="Mobile sections">
            <a href="#get-started" onClick={closeMobileNav}>Get started</a>
            <a href="#roles" onClick={closeMobileNav}>Roles</a>
            <a href="#features" onClick={closeMobileNav}>Features</a>
            <a href="#platform-overview" onClick={closeMobileNav}>Overview</a>
            <a href="#faq" onClick={closeMobileNav}>FAQ</a>
          </div>
        )}
      </header>

      <main>
        <section className="kl-hero">
          <div className="kl-container kl-hero__grid">
            <div className="kl-hero__content">
              <SectionBadge icon={DollarSign}>One workspace for the whole school</SectionBadge>
              <h1>
                Bring your school
                <br />
                <span>closer to families</span>
                <br />
                —every single day.
              </h1>
              <p className="kl-hero__lead">
                Kids Activities is the friendly, role-based workspace that connects admins,
                teachers, and parents—from first enrollment form to daily classroom moments and
                Android TV displays.
              </p>
              <div className="kl-actions">
                <a className="kl-button kl-button--yellow" href="#get-started">
                  Start workspace setup <ArrowRight size={20} />
                </a>
                <a className="kl-button kl-button--outline" href="#platform-overview">
                  <Play size={19} /> Full platform overview
                </a>
              </div>
              <div className="kl-checks">
                {['Admissions to alumni', 'Web + Mobile + TV', 'Built for schools'].map((item) => (
                  <span key={item}>
                    <Check size={20} strokeWidth={3} /> {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="kl-hero-visual">
              <div className="kl-dashboard">
                <div className="kl-dashboard__top">
                  <div className="kl-window-dots">
                    <i />
                    <i />
                    <i />
                  </div>
                  <span>Class 3-B · Today</span>
                </div>
                <div className="kl-dashboard__cards">
                  <div className="kl-dashboard-row kl-dashboard-row--yellow">
                    <div><FileText /></div>
                    <span><strong>3 new admissions</strong><small>Ready for principal review</small></span>
                  </div>
                  <div className="kl-dashboard-row kl-dashboard-row--blue">
                    <div><ImageIcon /></div>
                    <span><strong>12 new class photos</strong><small>Approved for TV slideshow</small></span>
                  </div>
                  <div className="kl-dashboard-row kl-dashboard-row--green">
                    <div><MessageCircle /></div>
                    <span><strong>Ms. Priya messaged parents</strong><small>Field trip reminder · 28 delivered</small></span>
                  </div>
                  <div className="kl-dashboard__shortcuts">
                    <span>Fees</span><span>Reports</span><span>Staff</span>
                  </div>
                </div>
              </div>
              <div className="kl-float-card kl-float-card--parent">
                <div><Heart /></div>
                <span><small>Parent said</small><strong>“Finally, one app!”</strong></span>
              </div>
              <div className="kl-float-card kl-float-card--tv">
                <div><Tv /></div>
                <span><small>Now Playing</small><strong>Lobby TV · Sports Day</strong></span>
              </div>
            </div>
          </div>

          <div className="kl-container kl-trust">
            {[
              'Trusted by school leaders',
              'K-12 Ready',
              'Data Private by Design',
              'Web · Mobile · Android TV',
            ].map((item) => <span key={item}>{item}</span>)}
          </div>
        </section>

        <section className="kl-section kl-section--muted" id="get-started">
          <div className="kl-container">
            <div className="kl-section-heading kl-section-heading--center">
              <SectionBadge icon={Building2} theme="blue">Get started</SectionBadge>
              <h2>Create a workspace or sign in.</h2>
              <p>New schools request a portal. Existing schools open their workspace login with a slug.</p>
            </div>
            <div className="kl-access-grid">
              <article className="kl-access-card kl-theme--yellow">
                <div className="kl-icon-tile">
                  <Building2 size={28} />
                </div>
                <h3>New to Kids Activities?</h3>
                <p>
                  Request a dedicated workspace for your activity program. We&apos;ll send a confirmation
                  email and set up your portal after verification.
                </p>
                <Link className="kl-button kl-button--yellow" to="/workspace/new">
                  Start Workspace Setup <ArrowRight size={18} />
                </Link>
              </article>

              <article className="kl-access-card kl-theme--blue">
                <div className="kl-icon-tile">
                  <LogIn size={28} />
                </div>
                <h3>Sign in to your workspace</h3>
                <p>Enter your workspace slug to open your portal login.</p>
                <form className="kl-access-form" onSubmit={handleSignIn}>
                  <label className="kl-access-field">
                    <span className="kl-access-field__label">Workspace slug</span>
                    <input
                      name="workspaceSlug"
                      value={workspaceSlug}
                      onChange={(e) => setWorkspaceSlug(e.target.value)}
                      placeholder="your-program"
                      autoComplete="organization"
                      required
                    />
                    <small>e.g. little-stars → /little-stars/login</small>
                  </label>
                  <button className="kl-button kl-button--navy" type="submit">
                    Continue <ArrowRight size={18} />
                  </button>
                </form>
              </article>
            </div>
          </div>
        </section>

        <section className="kl-section" id="roles">
          <div className="kl-container">
            <div className="kl-section-heading kl-section-heading--center">
              <SectionBadge icon={Users} theme="blue">Built for every role</SectionBadge>
              <h2>One school. Three different <br /> views.</h2>
              <p>Every person in your school gets an experience shaped around what they actually do.</p>
            </div>
            <div className="kl-role-grid">
              {roleCards.map((role) => <RoleCard key={role.title} role={role} />)}
            </div>
          </div>
        </section>

        <section className="kl-section kl-features-section" id="features">
          <div className="kl-container">
            <div
              className="kl-section-heading kl-section-heading--split kl-feature-reveal"
              style={{ '--kl-reveal-delay': '0ms' }}
            >
              <div>
                <SectionBadge icon={Layers} theme="red">Everything a school needs</SectionBadge>
                <h2>Six connected surfaces. <br /> One joyful workspace.</h2>
              </div>
              <p>Replace scattered forms, spreadsheets, chats and media folders with a single, role-based experience.</p>
            </div>
            <div className="kl-feature-grid">
              {features.map((feature, index) => (
                <FeatureCard key={feature.title} feature={feature} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="kl-section" id="how-it-works">
          <div className="kl-container">
            <div
              className="kl-section-heading kl-section-heading--center kl-feature-reveal"
              style={{ '--kl-reveal-delay': '0ms' }}
            >
              <SectionBadge icon={Play} theme="green">How it works</SectionBadge>
              <h2>Live in your school in three <br /> warm steps.</h2>
            </div>
            <div className="kl-step-grid">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article
                    className={`kl-step kl-feature-reveal kl-theme--${step.theme}`}
                    key={step.title}
                    style={{ '--kl-reveal-delay': `${120 + index * 140}ms` }}
                  >
                    <span className="kl-step__number">0{index + 1}</span>
                    <div className="kl-step__card">
                      <div className="kl-icon-tile"><Icon size={32} /></div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="kl-section kl-section--muted">
          <div className="kl-container">
            <div
              className="kl-section-heading kl-section-heading--split kl-section-heading--bottom kl-feature-reveal"
              style={{ '--kl-reveal-delay': '0ms' }}
            >
              <div>
                <SectionBadge icon={Star} theme="purple">Loved by school people</SectionBadge>
                <h2>Kind words from schools & <br /> families.</h2>
              </div>
              <p><em>A few voices from the school communities that are already using Kids Activities.</em></p>
            </div>
            <div className="kl-testimonial-grid">
              {testimonials.map((testimonial, index) => (
                <article
                  className={`kl-testimonial kl-feature-reveal kl-theme--${testimonial.theme}`}
                  key={testimonial.name}
                  style={{ '--kl-reveal-delay': `${120 + index * 140}ms` }}
                >
                  <div>
                    <div className="kl-stars" aria-label="5 out of 5 stars">
                      {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} fill="currentColor" />)}
                    </div>
                    <blockquote>{testimonial.quote}</blockquote>
                  </div>
                  <div><strong>{testimonial.name}</strong><small>{testimonial.role}</small></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="kl-platform-wrap">
          <PlatformLandingSections />
        </div>

        <section className="kl-section" id="faq">
          <div className="kl-container kl-faq">
            <div className="kl-section-heading kl-section-heading--center">
              <SectionBadge icon={MessageCircle}>Good Questions</SectionBadge>
              <h2>Frequently asked questions</h2>
            </div>
            <div className="kl-faq__list">
              {faqs.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}<ChevronDown size={20} /></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="kl-footer" id="contact">
        <div className="kl-container">
          <div className="kl-footer__main">
            <div>
              <SectionBadge icon={Wrench} theme="dark">Let&apos;s Talk</SectionBadge>
              <h2>Ready to bring your school together?</h2>
              <p>
                Book a 20-minute walkthrough. We&apos;ll show admissions, media, and the Android TV
                slideshow live—on your school&apos;s real workflow.
              </p>
              <div className="kl-actions">
                <a className="kl-button kl-button--yellow" href="#get-started">
                  Start Workspace Setup <ArrowRight size={20} />
                </a>
                <a className="kl-button kl-button--dark-outline" href="#platform-overview">See features</a>
              </div>
            </div>
            <div className="kl-contact-card">
              <h3>Talk to our team</h3>
              <p>We reply within one working day.</p>
              <div className="kl-contact-list">
                <a href="mailto:kidsactivities@snssystem.us"><Mail /><span>kidsactivities@snssystem.us</span></a>
                <a href="tel:+91-932-934-5222"><Phone /><span>+91-932-934-5222</span></a>
                <div><MapPin /><span>Software Technology Park Of India, I.T. Park, Ministry of Communication and Information Technology, Govt. of India, NH – 92, Gwalior (M.P.) – 474010 </span></div>
              </div>
            </div>
          </div>
          <div className="kl-footer__bottom">
            <a className="kl-brand kl-brand--footer" href="#top" aria-label="Kids Activities home">
              <img
                src={kidsLogo}
                alt="Kids Activities"
                className="kl-brand__logo"
                width={180}
                height={46}
                decoding="async"
              />
            </a>
            <p className='text-white'>© 2024 Kids Activities · Built for schools, teachers and families.</p>
            <ShieldCheck size={18} aria-label="Secure platform" className='text-white' />
          </div>
        </div>
      </footer>
    </div>
  );
}
