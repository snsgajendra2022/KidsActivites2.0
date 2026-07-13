import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Send } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import NoticeAudienceSelector from '../../components/notice-board/NoticeAudienceSelector.jsx';
import NoticeAudiencePreviewModal from '../../components/notice-board/NoticeAudiencePreviewModal.jsx';
import NoticeConfirmPublishModal from '../../components/notice-board/NoticeConfirmPublishModal.jsx';
import {
  NOTICE_CATEGORY_OPTIONS,
  NOTICE_PRIORITY_OPTIONS,
  NOTICE_STATUS,
  emptyNoticeForm,
} from '../../constants/notices.js';
import {
  useNoticeAudienceOptions,
  useNoticeAudiencePreview,
  useNoticeDetail,
  useNoticeMutations,
} from '../../hooks/useNotices.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useToast } from '../../context/ToastContext.jsx';
import '../../styles/notice-board.css';

export default function AdminNoticeForm() {
  const { noticeId } = useParams();
  const isEdit = Boolean(noticeId);
  const navigate = useNavigate();
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const { notice, loading: loadingNotice } = useNoticeDetail(isEdit ? noticeId : null);
  const { options, loading: loadingOptions } = useNoticeAudienceOptions();
  const { preview, loading: loadingPreview, loadPreview, clearPreview } = useNoticeAudiencePreview();
  const { createNotice, updateNotice, publishNotice } = useNoticeMutations();

  const [form, setForm] = useState(emptyNoticeForm());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (notice) {
      setForm({
        title: notice.title || '',
        body: notice.body || '',
        category: notice.category,
        priority: notice.priority,
        status: notice.status,
        audience: notice.audience,
        publishAt: notice.publishAt || '',
        expiresAt: notice.expiresAt || '',
        isPinned: notice.isPinned,
        requiresAcknowledgement: notice.requiresAcknowledgement,
        sendPush: notice.sendPush,
        sendEmail: notice.sendEmail,
        sendSms: notice.sendSms,
        coverImageUrl: notice.coverImageUrl || '',
        attachments: notice.attachments || [],
      });
    }
  }, [notice]);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handlePreviewAudience = () => {
    setPreviewOpen(true);
    loadPreview(form.audience);
  };

  const handleSaveDraft = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast('Title and message are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, status: NOTICE_STATUS.DRAFT };
      if (isEdit) {
        await updateNotice(noticeId, payload);
        toast('Draft saved', 'success');
      } else {
        const created = await createNotice(payload);
        toast('Draft created', 'success');
        navigate(tenantPath(`/admin/notice-board/${created.id}/edit`), { replace: true });
      }
    } catch (err) {
      toast(err.message || 'Unable to save draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishOpen(true);
    await loadPreview(form.audience);
  };

  const confirmPublish = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast('Title and message are required', 'error');
      return;
    }
    setSaving(true);
    try {
      let id = noticeId;
      if (!isEdit) {
        const created = await createNotice({ ...form, status: NOTICE_STATUS.DRAFT });
        id = created.id;
      } else {
        await updateNotice(id, form);
      }
      await publishNotice(id);
      toast('Notice published', 'success');
      navigate(tenantPath(`/admin/notice-board/${id}`));
    } catch (err) {
      toast(err.message || 'Unable to publish notice', 'error');
    } finally {
      setSaving(false);
      setPublishOpen(false);
    }
  };

  if (isEdit && loadingNotice) {
    return <DashboardLayout><LoadingState message="Loading notice…" /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="notice-form-page">
        <Link to={tenantPath('/admin/notice-board')} className="notice-back-link">
          <ArrowLeft size={16} /> Back to Notice Board
        </Link>

        <PageHeader
          title={isEdit ? 'Edit Notice' : 'Create Notice'}
          subtitle="Compose your announcement and choose who should receive it."
        />

        <div className="notice-form-grid">
          <section className="notice-form-panel">
            <label className="notice-field">
              <span>Title</span>
              <input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Notice title" />
            </label>

            <label className="notice-field">
              <span>Message</span>
              <textarea rows={8} value={form.body} onChange={(e) => updateField('body', e.target.value)} placeholder="Write your notice message…" />
            </label>

            <div className="notice-form-row">
              <label className="notice-field">
                <span>Category</span>
                <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                  {NOTICE_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="notice-field">
                <span>Priority</span>
                <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)}>
                  {NOTICE_PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>

            <div className="notice-form-toggles">
              <label><input type="checkbox" checked={form.isPinned} onChange={(e) => updateField('isPinned', e.target.checked)} /> Pin notice</label>
              <label><input type="checkbox" checked={form.requiresAcknowledgement} onChange={(e) => updateField('requiresAcknowledgement', e.target.checked)} /> Require acknowledgement</label>
              <label><input type="checkbox" checked={form.sendPush} onChange={(e) => updateField('sendPush', e.target.checked)} /> Send push notification</label>
              <label><input type="checkbox" checked={form.sendEmail} onChange={(e) => updateField('sendEmail', e.target.checked)} /> Send email</label>
            </div>

            <div className="notice-form-row">
              <label className="notice-field">
                <span>Schedule publish (optional)</span>
                <input type="datetime-local" value={form.publishAt} onChange={(e) => updateField('publishAt', e.target.value)} />
              </label>
              <label className="notice-field">
                <span>Expiry (optional)</span>
                <input type="datetime-local" value={form.expiresAt} onChange={(e) => updateField('expiresAt', e.target.value)} />
              </label>
            </div>
          </section>

          <aside className="notice-form-side">
            {!loadingOptions && (
              <NoticeAudienceSelector
                audience={form.audience}
                onChange={(audience) => updateField('audience', audience)}
                options={options}
              />
            )}
            <div className="notice-form-actions">
              <button type="button" className="sb-button-secondary" onClick={handlePreviewAudience}>
                <Eye size={16} /> Preview recipients
              </button>
              <button type="button" className="sb-button-secondary" disabled={saving} onClick={handleSaveDraft}>
                Save draft
              </button>
              <button type="button" className="sb-button-primary" disabled={saving} onClick={handlePublish}>
                <Send size={16} /> Publish notice
              </button>
            </div>
          </aside>
        </div>

        <NoticeAudiencePreviewModal
          open={previewOpen}
          preview={preview}
          loading={loadingPreview}
          onClose={() => { setPreviewOpen(false); clearPreview(); }}
        />

        <NoticeConfirmPublishModal
          open={publishOpen}
          preview={preview}
          loading={saving || loadingPreview}
          onClose={() => setPublishOpen(false)}
          onConfirm={confirmPublish}
        />
      </div>
    </DashboardLayout>
  );
}
