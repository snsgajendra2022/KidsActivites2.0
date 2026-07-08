import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getSystemStatus } from '../../services/portalConfigService.js';
import { submitSupportTicket } from '../../services/supportService.js';
import { isApiEnabled } from '../../services/api/config.js';
import '../../styles/legal-page.css';

function StatusIcon({ status }) {
  if (status === 'operational') return <CheckCircle2 size={18} className="legal-status-icon legal-status-icon--ok" />;
  if (status === 'degraded') return <AlertTriangle size={18} className="legal-status-icon legal-status-icon--warn" />;
  return <Wrench size={18} className="legal-status-icon legal-status-icon--maint" />;
}

function statusLabel(status) {
  if (status === 'operational') return 'Operational';
  if (status === 'degraded') return 'Degraded';
  return 'Maintenance';
}

export function LegalDocumentPage({ title, subtitle, lastUpdated, intro, sections }) {
  return (
    <PublicLayout hideFooter>
      <div className="legal-page legal-page--doc">
        <div className="legal-page__inner">
          <Link to="/" className="legal-page__back">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <div className="legal-doc">
            <header className="legal-page__header legal-doc__header">
              <h1>{title}</h1>
              {subtitle && <p className="legal-page__subtitle">{subtitle}</p>}
              {lastUpdated && (
                <p className="legal-page__updated">Last updated: {lastUpdated}</p>
              )}
            </header>
            <div className="legal-doc__scroll">
              <div className="legal-page__body">
                {intro && <p className="legal-page__intro">{intro}</p>}
                {sections.map((section) => (
                  <section key={section.heading} className="legal-page__section">
                    <h2>{section.heading}</h2>
                    {(Array.isArray(section.body) ? section.body : [section.body])
                      .filter(Boolean)
                      .map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    {Array.isArray(section.bullets) && section.bullets.length > 0 && (
                      <ul className="legal-page__list">
                        {section.bullets.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function SystemStatusPage({ services: staticServices }) {
  const [services, setServices] = useState(staticServices || []);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    getSystemStatus().then((data) => {
      const list = data.services?.map((s) => ({
        name: s.name,
        status: s.status,
        detail: s.detail || 'All systems running normally.',
      })) || staticServices || [];
      setServices(list);
      setLastChecked(data.lastChecked);
    });
  }, [staticServices]);

  const operational = services.filter((s) => s.status === 'operational').length;

  return (
    <PublicLayout>
      <div className="legal-page">
        <div className="legal-page__inner">
          <Link to="/" className="legal-page__back">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <header className="legal-page__header">
            <h1>System Status</h1>
            <p className="legal-page__subtitle">
              Live status of Kids Activities platform services.
            </p>
            <p className="legal-page__updated">
              {operational} of {services.length} services operational
              {lastChecked ? ` · Updated ${new Date(lastChecked).toLocaleString()}` : ' · Updated just now'}
            </p>
          </header>
          <div className="legal-status-list">
            {services.map((service) => (
              <div key={service.name} className={`legal-status-card legal-status-card--${service.status}`}>
                <div className="legal-status-card__head">
                  <StatusIcon status={service.status} />
                  <div>
                    <h2>{service.name}</h2>
                    <p>{service.detail}</p>
                  </div>
                  <span className={`legal-status-badge legal-status-badge--${service.status}`}>
                    {statusLabel(service.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function DirectSupportPage({ faq }) {
  const { school, portalName } = usePortalConfig();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      contact: form.contact.value.trim(),
      message: form.message.value.trim(),
    };
    try {
      const result = await submitSupportTicket(payload);
      toast(result.message || 'Support request received. The school team will contact you shortly.', 'success');
      form.reset();
    } catch (err) {
      toast(err.message || 'Unable to submit support request.', 'error');
    }
  };

  return (
    <PublicLayout>
      <div className="legal-page">
        <div className="legal-page__inner legal-page__inner--wide">
          <Link to="/" className="legal-page__back">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <header className="legal-page__header">
            <h1>Direct Support</h1>
            <p className="legal-page__subtitle">
              Get help with enrollment, fees, login, and parent communication.
            </p>
          </header>

          <div className="legal-support-grid">
            <div className="legal-support-card">
              <h2>Contact {school?.name || portalName}</h2>
              <dl className="legal-support-contact">
                {school?.email && (
                  <div>
                    <dt>Admissions Email</dt>
                    <dd>
                      <a href={`mailto:${school.email}`}>{school.email}</a>
                    </dd>
                  </div>
                )}
                {school?.phone && (
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${school.phone.replace(/\s/g, '')}`}>{school.phone}</a>
                    </dd>
                  </div>
                )}
                {school?.address && (
                  <div>
                    <dt>Address</dt>
                    <dd>{school.address}</dd>
                  </div>
                )}
              </dl>
              <Link to="/login" className="legal-support-cta">
                Go to Parent Login
              </Link>
            </div>

            <div className="legal-support-card">
              <h2>Send a Message</h2>
              <form
                className="legal-support-form"
                onSubmit={handleSubmit}
              >
                <label>
                  <span>Your Name</span>
                  <input type="text" name="name" placeholder="Full name" required />
                </label>
                <label>
                  <span>Email or Mobile</span>
                  <input type="text" name="contact" placeholder="you@email.com or mobile" required />
                </label>
                <label>
                  <span>How can we help?</span>
                  <textarea name="message" rows={4} placeholder="Describe your issue…" required />
                </label>
                <button type="submit" className="legal-support-submit">
                  Submit Request
                </button>
                <p className="legal-support-form-note">
                  {isApiEnabled()
                    ? 'Your message will be sent to the school support team.'
                    : 'Demo mode: requests are saved locally. Use school contact details for urgent help.'}
                </p>
              </form>
            </div>
          </div>

          <section className="legal-page__section legal-faq">
            <h2 className="legal-faq__title">Frequently Asked Questions</h2>
            <div className="legal-faq-list">
              {faq.map((item) => (
                <details key={item.q} className="legal-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
