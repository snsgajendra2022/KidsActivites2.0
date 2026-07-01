import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import SmartFileUpload from '../../components/upload/SmartFileUpload.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { sendPhotos } from '../../services/mediaService.js';
import { getTeacherClasses, getTeacherStudents } from '../../services/teacherService.js';
import '../../styles/send-photos.css';

const SEND_TYPES = [
  { value: 'class', label: 'Entire Class' },
  { value: 'selected', label: 'Selected Students' },
  { value: 'individual', label: 'Individual Parent' },
];

export default function SendPhotos() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [form, setForm] = useState({
    classId: '',
    recipients: 'class',
    studentIds: [],
    caption: '',
    photos: null,
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getTeacherClasses(user.id).then(setClasses);
    getTeacherStudents(user.id).then(setAllStudents);
  }, [user?.id]);

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));
  const students = allStudents.filter((s) => s.classId === form.classId);

  const toggleStudent = (id, checked) => {
    setForm((prev) => ({
      ...prev,
      studentIds: checked
        ? [...prev.studentIds, id]
        : prev.studentIds.filter((sid) => sid !== id),
    }));
  };

  const handlePreview = () => {
    if (!form.classId) {
      toast('Please select at least one class.', 'warning');
      return;
    }
    if (form.recipients !== 'class' && form.studentIds.length === 0) {
      toast('Please select at least one student.', 'warning');
      return;
    }
    if (!form.photos) {
      toast('Please upload at least one photo.', 'warning');
      return;
    }
    setShowConfirm(true);
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const cls = classes.find((c) => c.id === form.classId);
      await sendPhotos({
        teacherId: user?.id,
        teacherName: user?.name,
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

  const recipientSummary = form.recipients === 'class'
    ? 'the entire class'
    : `${form.studentIds.length} selected parent(s)`;

  return (
    <DashboardLayout>
      <div className="send-photos-page">
        <PageHeader
          title="Send Photos"
          subtitle="Share classroom photos with class groups or individual parents."
        />

        <div className="send-photos-card sb-card">
          <div className="send-photos-form">
            <Select
              label="Select Class"
              required
              options={classOptions}
              placeholder="Choose class"
              value={form.classId}
              onChange={(e) => setForm({
                ...form,
                classId: e.target.value,
                studentIds: [],
              })}
            />

            <div className="send-photos-field">
              <span className="send-photos-field__label">Send Type</span>
              <div className="send-photos-type-grid" role="group" aria-label="Send type">
                {SEND_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`send-photos-type-btn ${form.recipients === value ? 'is-active' : ''}`}
                    onClick={() => setForm({ ...form, recipients: value, studentIds: [] })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.recipients !== 'class' && form.classId && (
              <div className="send-photos-field">
                <span className="send-photos-field__label">
                  Select Students
                  <span className="required">*</span>
                </span>
                <div className="send-photos-students">
                  {students.length === 0 ? (
                    <p className="text-sm text-muted px-1">No students in this class.</p>
                  ) : (
                    students.map((s) => (
                      <label key={s.id} className="send-photos-student-row">
                        <input
                          type="checkbox"
                          checked={form.studentIds.includes(s.id)}
                          onChange={(e) => toggleStudent(s.id, e.target.checked)}
                        />
                        <span>
                          {s.name}
                          <small>Parent: {s.parentName}</small>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <SmartFileUpload
              fieldKey="teacherPhotos"
              label="Upload Photos"
              category="teacherPhoto"
              required
              value={form.photos}
              onChange={(data) => setForm({ ...form, photos: data })}
            />

            <Textarea
              label="Caption"
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="Add a caption for the photos"
            />

            <div className="send-photos-actions">
              <button
                type="button"
                className="send-photos-submit"
                onClick={handlePreview}
                disabled={loading}
              >
                <Send size={16} />
                Preview &amp; Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSend}
        title="Send Photos?"
        message={`Photos will be sent to ${recipientSummary}.`}
        confirmText="Send Photos"
        loading={loading}
      />
    </DashboardLayout>
  );
}
