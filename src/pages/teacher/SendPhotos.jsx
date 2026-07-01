import { useEffect, useState } from 'react';
import { Camera, Send, Users, User, GraduationCap } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import SmartFileUpload from '../../components/upload/SmartFileUpload.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { sendPhotos } from '../../services/mediaService.js';
import { getTeacherClasses, getTeacherStudents } from '../../services/teacherService.js';
import '../../styles/send-photos.css';

const SEND_TYPES = [
  { value: 'class', label: 'Entire Class', icon: GraduationCap },
  { value: 'selected', label: 'Selected', icon: Users },
  { value: 'individual', label: 'Individual', icon: User },
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

  const students = allStudents.filter((s) => s.classId === form.classId);
  const selectedClass = classes.find((c) => c.id === form.classId);

  const toggleStudent = (id) => {
    setForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(id)
        ? prev.studentIds.filter((sid) => sid !== id)
        : [...prev.studentIds, id],
    }));
  };

  const handlePreview = () => {
    if (!form.classId) {
      toast('Please select a class.', 'warning');
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
      await sendPhotos({
        teacherId: user?.id,
        teacherName: user?.name,
        className: selectedClass?.name || '',
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

  const footerHint = selectedClass
    ? `${selectedClass.name} · ${form.recipients === 'class' ? 'All parents' : `${form.studentIds.length} selected`}`
    : 'Select a class to continue';

  return (
    <DashboardLayout>
      <div className="send-photos-page">
        <div className="send-photos-layout">
          <header className="send-photos-intro">
            <div className="send-photos-intro__icon" aria-hidden>
              <Camera size={22} />
            </div>
            <div className="send-photos-intro__text">
              <h1>Send Photos</h1>
              <p>Share classroom moments with parents — pick a class, choose recipients, and upload.</p>
            </div>
          </header>

          <div className="send-photos-card">
            <span className="send-photos-card__label">Class &amp; recipients</span>

            {classes.length === 0 ? (
              <p className="send-photos-classes-empty">No classes assigned yet.</p>
            ) : (
              <div className="send-photos-classes">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    className={`send-photos-class-chip ${form.classId === cls.id ? 'is-selected' : ''}`}
                    onClick={() => setForm({
                      ...form,
                      classId: cls.id,
                      studentIds: [],
                    })}
                  >
                    <span className="send-photos-class-chip__name">{cls.name}</span>
                    <span className="send-photos-class-chip__meta">{cls.studentCount} students</span>
                  </button>
                ))}
              </div>
            )}

            {form.classId && (
              <div className="send-photos-recipients">
                <span className="send-photos-card__label" style={{ marginBottom: 0 }}>Send to</span>
                <div className="send-photos-pills" role="group" aria-label="Recipient type">
                  {SEND_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={`send-photos-pill ${form.recipients === value ? 'is-active' : ''}`}
                      onClick={() => setForm({ ...form, recipients: value, studentIds: [] })}
                    >
                      <Icon size={15} />
                      {label}
                    </button>
                  ))}
                </div>

                {form.recipients !== 'class' && (
                  <div className="send-photos-student-grid">
                    {students.length === 0 ? (
                      <p className="send-photos-classes-empty">No students in this class.</p>
                    ) : (
                      students.map((s) => (
                        <label
                          key={s.id}
                          className={`send-photos-student-chip ${form.studentIds.includes(s.id) ? 'is-selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={form.studentIds.includes(s.id)}
                            onChange={() => toggleStudent(s.id)}
                          />
                          <div className="send-photos-student-chip__text">
                            <strong>{s.name}</strong>
                            <span>{s.parentName}</span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="send-photos-card send-photos-upload-card send-photos-form">
            <span className="send-photos-card__label">Photo &amp; caption</span>

            <SmartFileUpload
              fieldKey="teacherPhotos"
              label="Upload Photos"
              category="teacherPhoto"
              required
              value={form.photos}
              onChange={(data) => setForm({ ...form, photos: data })}
            />

            <div className="form-field full">
              <label className="form-label" htmlFor="photo-caption">Caption</label>
              <textarea
                id="photo-caption"
                className="form-textarea"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="What happened in class today?"
                rows={3}
              />
            </div>
          </div>

          <footer className="send-photos-footer">
            <p className="send-photos-footer__hint">
              Ready to share? <strong>{footerHint}</strong>
            </p>
            <button
              type="button"
              className="send-photos-submit"
              onClick={handlePreview}
              disabled={loading || !form.classId}
            >
              <Send size={17} />
              Preview &amp; Send
            </button>
          </footer>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSend}
        title="Send photos?"
        message={`Photos will be delivered to ${recipientSummary}${selectedClass ? ` in ${selectedClass.name}` : ''}.`}
        confirmText="Send Photos"
        loading={loading}
      />
    </DashboardLayout>
  );
}
