import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Globe, LayoutTemplate, RefreshCw, Save, Upload, X } from 'lucide-react';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { landingPageAction } from '../../services/landingPageApi.js';
import { listTemplateSummaries } from '../templates/index.js';
import { stashPreviewDraft } from '../blockUtils.js';
import LandingPageRenderer from '../LandingPageRenderer.jsx';
import BlockInspector, { BlockList } from './BlockInspector.jsx';
import '../../styles/landing-builder.css';

function actionErrorMessage(err, fallback) {
  return err?.message || err?.details?.[0]?.message || fallback;
}

function DraftPreviewOverlay({
  open,
  draft,
  branding,
  school,
  portalName,
  tenantPath,
  tenantSlug,
  onClose,
  onOpenPublicTab,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !draft || typeof document === 'undefined') return null;

  return createPortal(
    <div className="landing-builder__preview-overlay" role="dialog" aria-modal="true" aria-label="Landing page preview">
      <div className="landing-builder__preview-chrome">
        <div className="landing-builder__preview-chrome-text">
          <strong>Draft preview</strong>
          <span>This is your current builder draft — not live until you publish.</span>
        </div>
        <div className="landing-builder__preview-chrome-actions">
          <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={onOpenPublicTab}>
            <ExternalLink size={14} />
            Open public URL
          </button>
          <button type="button" className="premium-btn premium-btn-primary premium-btn-sm" onClick={onClose}>
            <X size={14} />
            Close preview
          </button>
        </div>
      </div>
      <div className="landing-builder__preview-scroll">
        <LandingPageRenderer
          page={draft}
          branding={branding}
          school={school}
          portalName={portalName}
          tenantPath={tenantPath}
        />
      </div>
      {tenantSlug && (
        <p className="landing-builder__preview-hint">
          Public page after publish: /{tenantSlug}
        </p>
      )}
    </div>,
    document.body,
  );
}

function TemplateThumb({ src, alt }) {
  const [broken, setBroken] = useState(false);
  const display = broken ? '/assets/kidsactivites-hero-placeholder.svg' : (src || '/assets/kidsactivites-hero-placeholder.svg');
  return (
    <div className="landing-builder__template-thumb">
      <img src={display} alt={alt || ''} onError={() => setBroken(true)} />
    </div>
  );
}

function LivePreviewPanel({ draft, config, schoolName, portalName, tenantPath }) {
  if (!draft) return null;
  return (
    <section className="landing-builder__live-preview">
      <p className="landing-builder__field-label">Live preview</p>
      <p className="landing-builder__live-preview-hint">Updates as you edit — same view as Preview &amp; publish.</p>
      <div className="landing-builder__live-preview-frame">
        <LandingPageRenderer
          page={draft}
          branding={config?.branding}
          school={config?.school || { name: schoolName }}
          portalName={portalName}
          tenantPath={tenantPath}
        />
      </div>
    </section>
  );
}

export default function LandingBuilder({
  schoolId,
  schoolName,
  portalName,
  tenantSlug,
}) {
  const { toast } = useToast();
  const { reload, config } = usePortalConfig();
  const { tenantPath } = useTenantPath();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [meta, setMeta] = useState(null);
  const [draft, setDraft] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadEditor = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await landingPageAction('getEditor', {}, { schoolId });
      setMeta(data);
      setDraft(data.draft);
      setDirty(Boolean(data.isDraftDirty));
      setSelectedId((prev) => {
        if (prev && data.draft?.blocks?.some((b) => b.id === prev)) return prev;
        return data.draft?.blocks?.[0]?.id || null;
      });
    } catch (err) {
      toast(actionErrorMessage(err, 'Failed to load landing page editor.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    setSelectedId(null);
    loadEditor();
  }, [schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDraftChange = (next) => {
    setDraft(next);
    setDirty(true);
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const result = await landingPageAction('saveDraft', { landingPage: draft }, { schoolId });
      setDraft(result.draft);
      setDirty(false);
      setMeta((m) => (m ? { ...m, draft: result.draft, isDraftDirty: false } : m));
      toast('Draft saved.', 'success');
    } catch (err) {
      toast(actionErrorMessage(err, 'Failed to save draft.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      let page = draft;
      if (dirty && draft) {
        const saved = await landingPageAction('saveDraft', { landingPage: draft }, { schoolId });
        page = saved.draft;
        setDraft(page);
      }
      const result = await landingPageAction('publish', {}, { schoolId });
      const published = result.published && typeof result.published === 'object'
        ? result.published
        : page;
      setDirty(false);
      setMeta((m) => ({
        ...m,
        draft: page,
        published,
        isDraftDirty: false,
      }));
      toast('Landing page published.', 'success');
      await reload?.();
    } catch (err) {
      toast(actionErrorMessage(err, 'Failed to publish.'), 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleDiscard = async () => {
    if (!window.confirm('Discard draft changes and restore the last published page?')) return;
    try {
      const result = await landingPageAction('discardDraft', {}, { schoolId });
      setDraft(result.draft);
      setDirty(false);
      setSelectedId(result.draft?.blocks?.[0]?.id || null);
      setMeta((m) => (m ? { ...m, draft: result.draft, isDraftDirty: false } : m));
      toast('Draft reset to last published version.', 'success');
    } catch (err) {
      toast(actionErrorMessage(err, 'Failed to discard draft.'), 'error');
    }
  };

  const handleApplyTemplate = async (templateId) => {
    if (!window.confirm('Replace current draft with this template? Unsaved changes will be lost.')) return;
    try {
      const result = await landingPageAction('applyTemplate', { templateId }, { schoolId });
      const nextDraft = result.draft;
      setDraft(nextDraft);
      setDirty(true);
      const galleryBlock = nextDraft?.blocks?.find((b) => b.type === 'gallery');
      setSelectedId(galleryBlock?.id || nextDraft?.blocks?.[0]?.id || null);
      const count = nextDraft?.blocks?.length || 0;
      toast(`Template applied — ${count} sections${galleryBlock ? ' (includes Our Gallery)' : ''}.`, 'success');
    } catch (err) {
      toast(actionErrorMessage(err, 'Failed to apply template.'), 'error');
    }
  };

  const handlePreview = () => {
    if (!draft) {
      toast('Nothing to preview yet.', 'warning');
      return;
    }
    const keys = [schoolId, tenantSlug, 'default'].filter(Boolean);
    stashPreviewDraft(schoolId || tenantSlug || 'default', draft, keys);
    setPreviewOpen(true);
  };

  const handleOpenPublicTab = async () => {
    if (!draft) return;
    try {
      let page = draft;
      if (dirty) {
        setSaving(true);
        const saved = await landingPageAction('saveDraft', { landingPage: draft }, { schoolId });
        page = saved.draft || draft;
        setDraft(page);
        setDirty(false);
        setSaving(false);
      }
      const keys = [schoolId, tenantSlug, 'default'].filter(Boolean);
      stashPreviewDraft(schoolId || tenantSlug || 'default', page, keys);
      const path = tenantSlug ? `/${tenantSlug}?preview=1` : '/?preview=1';
      window.open(`${window.location.origin}${path}`, '_blank');
    } catch (err) {
      setSaving(false);
      toast(actionErrorMessage(err, 'Could not open public preview tab.'), 'error');
    }
  };

  const handleMigrate = async () => {
    try {
      const result = await landingPageAction('migrateFromV1', {}, { schoolId });
      setDraft(result.draft);
      setDirty(true);
      setSelectedId(result.draft?.blocks?.[0]?.id || null);
      toast('Converted legacy landing page to builder format.', 'success');
    } catch (err) {
      toast(actionErrorMessage(err, 'Migration failed.'), 'error');
    }
  };

  const selectedBlock = draft?.blocks?.find((b) => b.id === selectedId) || null;
  const publicUrl = meta?.publicUrl || (tenantSlug ? `/${tenantSlug}` : '/');
  const canDiscard = Boolean(meta?.published) || dirty;
  const templates = listTemplateSummaries();

  if (loading) {
    return <div className="landing-builder__loading">Loading landing page builder…</div>;
  }

  if (!draft) {
    return (
      <div className="landing-builder__loading">
        No landing page data available.
        <div style={{ marginTop: '0.75rem' }}>
          <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={loadEditor}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-builder">
      <div className="landing-builder__toolbar">
        <div className="landing-builder__toolbar-info">
          <Globe size={16} />
          <span>
            Public URL:{' '}
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <strong>{publicUrl}</strong>
            </a>
            {dirty && <span className="landing-builder__dirty-badge">Unsaved changes</span>}
          </span>
        </div>
        <div className="landing-builder__toolbar-actions">
          {meta?.hasV1Legacy && (
            <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={handleMigrate}>
              <RefreshCw size={14} />
              Import legacy page
            </button>
          )}
          <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={handleDiscard} disabled={!canDiscard}>
            Discard draft
          </button>
          <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={handlePreview}>
            <ExternalLink size={14} />
            Preview
          </button>
          <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={handleSaveDraft} disabled={saving || !dirty}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button type="button" className="premium-btn premium-btn-primary premium-btn-sm" onClick={handlePublish} disabled={publishing || saving}>
            <Upload size={14} />
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      <section className="landing-builder__templates">
        <div className="landing-builder__templates-head">
          <LayoutTemplate size={16} />
          <h3>Templates</h3>
          <p>Click to replace your draft with a starter layout.</p>
        </div>
        <div className="landing-builder__template-grid">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="landing-builder__template-card"
              onClick={() => handleApplyTemplate(tpl.id)}
            >
              <TemplateThumb src={tpl.thumbnailUrl} alt={tpl.name} />
              <p className="landing-builder__template-name">{tpl.name}</p>
              <p className="landing-builder__template-desc">{tpl.description}</p>
              <span className="landing-builder__template-meta">
                {tpl.blockCount} sections
                {tpl.id === 'laugh-and-learn-academy' ? ' · includes Our Gallery' : ''}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="landing-builder__workspace">
        <BlockList
          draft={draft}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDraftChange={handleDraftChange}
          schoolName={schoolName}
          portalName={portalName}
        />
        <BlockInspector
          block={selectedBlock}
          draft={draft}
          onDraftChange={handleDraftChange}
          schoolName={schoolName}
          portalName={portalName}
          schoolId={schoolId}
        />
      </div>

      <LivePreviewPanel
        draft={draft}
        config={config}
        schoolName={schoolName}
        portalName={portalName}
        tenantPath={tenantPath}
      />

      <section className="landing-builder__theme">
        <p className="landing-builder__field-label">Theme colors</p>
        <div className="landing-builder__theme-row">
          <label>
            Primary
            <input
              type="color"
              value={draft.theme?.primaryColor || '#5B4BDB'}
              onChange={(e) => handleDraftChange({
                ...draft,
                theme: { ...draft.theme, primaryColor: e.target.value },
              })}
            />
          </label>
          <label>
            Secondary
            <input
              type="color"
              value={draft.theme?.secondaryColor || '#F59E0B'}
              onChange={(e) => handleDraftChange({
                ...draft,
                theme: { ...draft.theme, secondaryColor: e.target.value },
              })}
            />
          </label>
        </div>
      </section>

      <DraftPreviewOverlay
        open={previewOpen}
        draft={draft}
        branding={config?.branding}
        school={config?.school || { name: schoolName }}
        portalName={portalName}
        tenantPath={tenantPath}
        tenantSlug={tenantSlug}
        onClose={() => setPreviewOpen(false)}
        onOpenPublicTab={handleOpenPublicTab}
      />
    </div>
  );
}
