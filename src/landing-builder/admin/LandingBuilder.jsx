import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Globe, LayoutTemplate, RefreshCw, Save, Upload } from 'lucide-react';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { landingPageAction } from '../../services/landingPageApi.js';
import { stashPreviewDraft } from '../blockUtils.js';
import BlockInspector, { BlockList } from './BlockInspector.jsx';
import '../../styles/landing-builder.css';

export default function LandingBuilder({
  schoolId,
  schoolName,
  portalName,
  tenantSlug,
}) {
  const { toast } = useToast();
  const { reload } = usePortalConfig();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [meta, setMeta] = useState(null);
  const [draft, setDraft] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [dirty, setDirty] = useState(false);

  const loadEditor = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await landingPageAction('getEditor', {}, { schoolId });
      setMeta(data);
      setDraft(data.draft);
      setDirty(Boolean(data.isDraftDirty));
      if (data.draft?.blocks?.length && !selectedId) {
        setSelectedId(data.draft.blocks[0].id);
      }
    } catch (err) {
      toast(err?.message || 'Failed to load landing page editor.', 'error');
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast, selectedId]);

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
      toast('Draft saved.', 'success');
    } catch {
      toast('Failed to save draft.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (dirty) {
        await landingPageAction('saveDraft', { landingPage: draft }, { schoolId });
      }
      const result = await landingPageAction('publish', {}, { schoolId });
      setDirty(false);
      toast('Landing page published.', 'success');
      setMeta((m) => ({ ...m, published: result.published, isDraftDirty: false }));
      await reload?.();
    } catch {
      toast('Failed to publish.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleDiscard = async () => {
    try {
      const result = await landingPageAction('discardDraft', {}, { schoolId });
      setDraft(result.draft);
      setDirty(false);
      toast('Draft reset to last published version.', 'success');
    } catch {
      toast('Failed to discard draft.', 'error');
    }
  };

  const handleApplyTemplate = async (templateId) => {
    if (!window.confirm('Replace current draft with this template? Unsaved changes will be lost.')) return;
    try {
      const result = await landingPageAction('applyTemplate', { templateId }, { schoolId });
      setDraft(result.draft);
      setDirty(true);
      setSelectedId(result.draft?.blocks?.[0]?.id || null);
      toast('Template applied to draft.', 'success');
    } catch {
      toast('Failed to apply template.', 'error');
    }
  };

  const handlePreview = () => {
    if (!draft) return;
    stashPreviewDraft(schoolId, draft);
    const url = tenantSlug ? `/${tenantSlug}?preview=1` : '/?preview=1';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleMigrate = async () => {
    try {
      const result = await landingPageAction('migrateFromV1', {}, { schoolId });
      setDraft(result.draft);
      setDirty(true);
      toast('Converted legacy landing page to builder format.', 'success');
    } catch {
      toast('Migration failed.', 'error');
    }
  };

  const selectedBlock = draft?.blocks?.find((b) => b.id === selectedId) || null;
  const publicUrl = meta?.publicUrl || (tenantSlug ? `/${tenantSlug}` : '/');

  if (loading) {
    return <div className="landing-builder__loading">Loading landing page builder…</div>;
  }

  if (!draft) {
    return <div className="landing-builder__loading">No landing page data available.</div>;
  }

  return (
    <div className="landing-builder">
      <div className="landing-builder__toolbar">
        <div className="landing-builder__toolbar-info">
          <Globe size={16} />
          <span>
            Public URL: <strong>{publicUrl}</strong>
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
          <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={handleDiscard} disabled={!meta?.published}>
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
          <button type="button" className="premium-btn premium-btn-primary premium-btn-sm" onClick={handlePublish} disabled={publishing}>
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
          {(meta?.templates || []).map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="landing-builder__template-card"
              onClick={() => handleApplyTemplate(tpl.id)}
            >
              <div className="landing-builder__template-thumb">
                <img src={tpl.thumbnailUrl} alt="" />
              </div>
              <p className="landing-builder__template-name">{tpl.name}</p>
              <p className="landing-builder__template-desc">{tpl.description}</p>
              <span className="landing-builder__template-meta">{tpl.blockCount} sections</span>
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
        />
      </div>

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
    </div>
  );
}
