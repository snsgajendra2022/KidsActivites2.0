import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import SmartFileUpload from '../../components/upload/SmartFileUpload.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { sendPhotos } from '../../services/mediaService.js';
import { TEACHER_CLASSES, CLASS_STUDENTS } from '../../data/mockPhotos.js';

export default function SendPhotos() {
  const { toast } = useToast();
  const [form, setForm] = useState({ classId: '', recipients: 'class', studentIds: [], caption: '', photos: null });
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const classOptions = TEACHER_CLASSES.map((c) => ({ value: c.id, label: c.name }));

  const handleSend = async () => {
    setLoading(true);
    try {
      const cls = TEACHER_CLASSES.find((c) => c.id === form.classId);
      await sendPhotos({
        className: cls?.name || '',
        caption: form.caption,
        recipients: form.recipients,
        studentIds: form.studentIds,
      });
      toast('Photos sent successfully.', 'success');
      setShowConfirm(false);
      setForm({ classId: '', recipients: 'class', studentIds: [], caption: '', photos: null });
    } catch {
      toast('Photo upload failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Send Photos" subtitle="Share classroom photos with class groups or individual parents." />

      <div className="card" style={{ maxWidth: 640 }}>
        <Select label="Select Class" required options={classOptions} placeholder="Choose class" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} />

        <div className="form-field" style={{ marginTop: 16 }}>
          <label className="form-label">Send Type</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['class', 'selected', 'individual'].map((type) => (
              <button key={type} type="button" className={`btn ${form.recipients === type ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setForm({ ...form, recipients: type })}>
                {type === 'class' ? 'Entire Class' : type === 'selected' ? 'Selected Students' : 'Individual Parent'}
              </button>
            ))}
          </div>
        </div>

        {form.recipients !== 'class' && form.classId && (
          <div className="form-field" style={{ marginTop: 16 }}>
            <label className="form-label">Select Students</label>
            {CLASS_STUDENTS.filter((s) => s.classId === form.classId).map((s) => (
              <label key={s.id} className="form-checkbox-row">
                <input type="checkbox" checked={form.studentIds.includes(s.id)} onChange={(e) => {
                  setForm({ ...form, studentIds: e.target.checked ? [...form.studentIds, s.id] : form.studentIds.filter((id) => id !== s.id) });
                }} />
                {s.name} ({s.parentName})
              </label>
            ))}
          </div>
        )}

        <SmartFileUpload fieldKey="teacherPhotos" label="Upload Photos" category="teacherPhoto" value={form.photos} onChange={(data) => setForm({ ...form, photos: data })} />
        <Textarea label="Caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Add a caption for the photos" />

        <Button variant="primary" style={{ marginTop: 16 }} onClick={() => {
          if (!form.classId) { toast('Please select at least one class.', 'warning'); return; }
          setShowConfirm(true);
        }}>Preview & Send</Button>
      </div>

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSend}
        title="Send Photos?"
        message={`Photos will be sent to ${form.recipients === 'class' ? 'the entire class' : `${form.studentIds.length} selected parent(s)`}.`}
        confirmText="Send Photos"
        loading={loading}
      />
    </DashboardLayout>
  );
}
