import { useEffect, useMemo, useState } from 'react';
import {
  Camera, Send, Users, User, GraduationCap, Tv, Image as ImageIcon, ShieldAlert,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ApiError } from '../../services/api/client.js';
import {
  UPLOAD_TARGETS,
  getTeacherAlbumClasses,
  uploadTeacherAlbumMedia,
} from '../../services/classAlbumService.js';
import { getTeacherStudents } from '../../services/teacherService.js';
import '../../styles/send-photos.css';

const UPLOAD_TARGET_OPTIONS = [
  { value: UPLOAD_TARGETS.CLASS_ALBUM, label: 'Class Album', icon: ImageIcon },
  { value: UPLOAD_TARGETS.PARENT_DIRECT, label: 'Parent Direct', icon: User },
  { value: UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT, label: 'Album + Parents', icon: Tv },
];

const SEND_TYPES = [
  { value: 'class', label: 'Entire Class', icon: GraduationCap },
  { value: 'selected', label: 'Selected', icon: Users },
  { value: 'individual', label: 'Individual', icon: User },
];

const SUCCESS_MESSAGES = {
  [UPLOAD_TARGETS.CLASS_ALBUM]: 'Uploaded to class album successfully.',
  [UPLOAD_TARGETS.PARENT_DIRECT]: 'Photo sent to parent successfully.',
  [UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT]: 'Uploaded to class album and shared with parents successfully.',
};

export default function SendPhotos() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [albumClasses, setAlbumClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [uploadTarget, setUploadTarget] = useState(UPLOAD_TARGETS.CLASS_ALBUM);
  const [form, setForm] = useState({
    classId: '',
    recipients: 'class',
    studentIds: [],
    caption: '',
    files: [],
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getTeacherAlbumClasses().then(setAlbumClasses).catch(() => setAlbumClasses([]));
    getTeacherStudents(user.id).then(setAllStudents);
  }, [user?.id]);

  const activeAlbumClasses = useMemo(
    () => albumClasses.filter(
      (c) => !c.classStatus || c.classStatus.toLowerCase() === 'active',
    ),
    [albumClasses],
  );

  const students = allStudents.filter((s) => s.classId === form.classId);
  const selectedClass = activeAlbumClasses.find((c) => c.classId === form.classId);
  const selectedAlbum = selectedClass?.album;

  const needsClass = true;
  const needsStudent = uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT
    || (uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT && form.recipients !== 'class');

  const footerHint = useMemo(() => {
    if (!form.classId && needsClass) return 'Select a class to continue';
    if (uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM) {
      return selectedAlbum
        ? `${selectedClass?.className} · Album ${selectedAlbum.albumCode}`
        : selectedClass?.className;
    }
    if (uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT) {
      return form.studentIds.length ? `${form.studentIds.length} parent(s) selected` : 'Select a student';
    }
    return `${selectedClass?.className || 'Class'} · Album + parents`;
  }, [form, needsClass, selectedAlbum, selectedClass, uploadTarget]);

  const onFilesChange = (e) => {
    setForm((prev) => ({ ...prev, files: Array.from(e.target.files || []) }));
  };

  const validate = () => {
    if (needsClass && !form.classId) {
      toast('Please select a class.', 'warning');
      return false;
    }
    if (uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT && form.studentIds.length === 0) {
      toast('Please select a student.', 'warning');
      return false;
    }
    if (uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT
      && form.recipients !== 'class' && form.studentIds.length === 0) {
      toast('Please select at least one student.', 'warning');
      return false;
    }
    if (form.files.length === 0) {
      toast('Please choose at least one image.', 'warning');
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const studentId = form.studentIds[0] || null;
      await uploadTeacherAlbumMedia({
        uploadTarget,
        classId: form.classId || null,
        studentId,
        caption: form.caption,
        files: form.files,
      });
      toast(SUCCESS_MESSAGES[uploadTarget], 'success');
      setShowConfirm(false);
      setForm({ classId: '', recipients: 'class', studentIds: [], caption: '', files: [] });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CLASS_INACTIVE') {
        toast('This class is inactive. Please contact admin.', 'error');
      } else {
        toast(err?.message || 'Upload failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="send-photos-page">
        <div className="send-photos-layout">
          <header className="send-photos-intro">
            <div className="send-photos-intro__icon" aria-hidden>
              <Camera size={22} />
            </div>
            <div className="send-photos-intro__text">
              <h1>Share Classroom Media</h1>
              <p>Upload to a class album for TV playback, send directly to parents, or both.</p>
            </div>
          </header>

          <div className="send-photos-card">
            <span className="send-photos-card__label">Upload target</span>
            <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Upload target">
              {UPLOAD_TARGET_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`send-photos-target-card text-left ${uploadTarget === value ? 'send-photos-target-card--active' : ''}`}
                  onClick={() => setUploadTarget(value)}
                >
                  <Icon size={20} className="mb-2 text-accent" />
                  <span className="block text-sm font-bold text-brand">{label}</span>
                </button>
              ))}
            </div>
            {(uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT || uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT) && (
              <div className="send-photos-privacy-warning mt-4">
                <ShieldAlert size={18} className="shrink-0 text-accent" aria-hidden />
                <p>
                  <strong>Privacy reminder:</strong> Parent-direct photos are visible only to authorized guardians.
                  Confirm you have consent before sharing identifiable student images.
                </p>
              </div>
            )}
          </div>

          <div className="send-photos-card">
            <span className="send-photos-card__label">
              {needsClass ? 'Class' : 'Student'}
            </span>

            {needsClass && (
              activeAlbumClasses.length === 0 ? (
                <p className="send-photos-classes-empty">No classes assigned yet.</p>
              ) : (
                <div className="send-photos-classes">
                  {activeAlbumClasses.map((cls) => (
                    <button
                      key={cls.classId}
                      type="button"
                      className={`send-photos-class-chip ${form.classId === cls.classId ? 'is-selected' : ''}`}
                      onClick={() => setForm({ ...form, classId: cls.classId, studentIds: [] })}
                    >
                      <span className="send-photos-class-chip__name">{cls.className}</span>
                      {cls.album?.albumCode && (
                        <span className="send-photos-class-chip__meta">{cls.album.albumCode}</span>
                      )}
                    </button>
                  ))}
                </div>
              )
            )}

            {needsStudent && form.classId && uploadTarget !== UPLOAD_TARGETS.CLASS_ALBUM && (
              <div className="send-photos-recipients">
                {uploadTarget === UPLOAD_TARGETS.CLASS_ALBUM_AND_PARENT && (
                  <>
                    <span className="send-photos-card__label" style={{ marginBottom: 0 }}>Share with</span>
                    <div className="send-photos-pills">
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
                  </>
                )}

                {(uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT || form.recipients !== 'class') && (
                  <div className="send-photos-student-grid">
                    {students.map((s) => (
                      <label
                        key={s.id}
                        className={`send-photos-student-chip ${form.studentIds.includes(s.id) ? 'is-selected' : ''}`}
                      >
                        <input
                          type={uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT ? 'radio' : 'checkbox'}
                          name="student"
                          checked={form.studentIds.includes(s.id)}
                          onChange={() => setForm({
                            ...form,
                            studentIds: uploadTarget === UPLOAD_TARGETS.PARENT_DIRECT
                              ? [s.id]
                              : (form.studentIds.includes(s.id)
                                ? form.studentIds.filter((id) => id !== s.id)
                                : [...form.studentIds, s.id]),
                          })}
                        />
                        <div className="send-photos-student-chip__text">
                          <strong>{s.name}</strong>
                          <span>{s.parentName}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="send-photos-card send-photos-upload-card send-photos-form">
            <span className="send-photos-card__label">Media &amp; caption</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onFilesChange}
            />
            {form.files.length > 0 && (
              <p className="send-photos-classes-empty">{form.files.length} file(s) selected</p>
            )}
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
              onClick={() => { if (validate()) setShowConfirm(true); }}
              disabled={loading}
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
        title="Upload media?"
        message={`This will upload ${form.files.length} file(s) using the selected target.`}
        confirmText="Upload"
        loading={loading}
      />
    </DashboardLayout>
  );
}
