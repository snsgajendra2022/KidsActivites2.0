import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Plus, Trash2, Save, Send, Upload } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';
import { loadClassOptions } from '../../services/schoolModules/relationshipOptions.js';

const LESSON_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'text', label: 'Text / Notes' },
  { value: 'document', label: 'Document' },
  { value: 'audio', label: 'Audio' },
];

/** crypto.randomUUID is only available in secure contexts (HTTPS / localhost). */
function newKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lms-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyLesson() {
  return {
    key: newKey(),
    title: '',
    type: 'text',
    content: '',
    resourceUrl: '',
    durationMinutes: 0,
    hasFile: false,
    originalFilename: '',
    hlsStatus: null,
    hlsError: null,
    hlsManifestPath: null,
  };
}

function emptyQuestion() {
  return {
    key: newKey(),
    question: '',
    type: 'mcq',
    marks: 1,
    options: [
      { key: newKey(), text: '', correct: true },
      { key: newKey(), text: '', correct: false },
    ],
  };
}

function emptyQuiz() {
  return {
    key: newKey(),
    title: 'Course Quiz',
    description: '',
    passPercentage: 60,
    maxAttempts: 3,
    requiredForCompletion: true,
    questions: [emptyQuestion()],
  };
}

export default function LmsCourseEditorPage({ layout = 'dashboard', basePath = '/admin/lms' }) {
  const Layout = layout === 'app' ? AppLayout : DashboardLayout;
  const { courseId } = useParams();
  const isNew = !courseId || courseId === 'new';
  const navigate = useNavigate();
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [classOptions, setClassOptions] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    classId: '',
    className: '',
    subject: '',
    status: 'draft',
    estimatedDurationMinutes: 0,
  });
  const [lessons, setLessons] = useState([emptyLesson()]);
  const [quiz, setQuiz] = useState(emptyQuiz());
  const [uploadingKey, setUploadingKey] = useState(null);
  const fileInputRefs = useRef({});

  useEffect(() => {
    loadClassOptions(user).then(setClassOptions).catch(() => setClassOptions([]));
  }, [user]);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const course = await lmsApi.getCourse(courseId);
        if (cancelled) return;
        setForm({
          title: course.title || '',
          description: course.description || '',
          classId: course.classId || '',
          className: course.className || '',
          subject: course.subject || '',
          status: course.status || 'draft',
          estimatedDurationMinutes: course.estimatedDurationMinutes || 0,
        });
        const mappedLessons = (course.lessons || []).map((l) => ({
          key: l.id,
          id: l.id,
          title: l.title || '',
          type: l.type || 'text',
          content: l.content || '',
          resourceUrl: l.resourceUrl || '',
          durationMinutes: l.durationMinutes || 0,
          hasFile: Boolean(l.hasFile),
          originalFilename: l.originalFilename || '',
          hlsStatus: l.hlsStatus || null,
          hlsError: l.hlsError || null,
          hlsManifestPath: l.hlsManifestPath || null,
        }));
        setLessons(mappedLessons.length ? mappedLessons : [emptyLesson()]);
        const firstQuiz = (course.quizzes || [])[0];
        if (firstQuiz) {
          setQuiz({
            key: firstQuiz.id,
            id: firstQuiz.id,
            title: firstQuiz.title || 'Course Quiz',
            description: firstQuiz.description || '',
            passPercentage: firstQuiz.passPercentage ?? 60,
            maxAttempts: firstQuiz.maxAttempts ?? 3,
            requiredForCompletion: firstQuiz.requiredForCompletion !== false,
            questions: (firstQuiz.questions || []).map((q) => ({
              key: q.id,
              id: q.id,
              question: q.question || '',
              type: q.type || 'mcq',
              marks: q.marks ?? 1,
              options: (q.options || []).map((o) => ({
                key: o.id,
                id: o.id,
                text: o.text || '',
                correct: Boolean(o.correct),
              })),
            })),
          });
        }
      } catch (err) {
        toast(err?.message || 'Unable to load course.', 'error');
        navigate(tenantPath(basePath));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId, isNew]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onClassChange = (classId) => {
    const option = classOptions.find((o) => String(o.value) === String(classId));
    setForm((prev) => ({
      ...prev,
      classId,
      className: option?.label || '',
    }));
  };

  const applySavedLessons = (saved) => {
    if (!saved?.lessons?.length) return;
    setLessons(saved.lessons.map((l) => ({
      key: l.id,
      id: l.id,
      title: l.title || '',
      type: l.type || 'text',
      content: l.content || '',
      resourceUrl: l.resourceUrl || '',
      durationMinutes: l.durationMinutes || 0,
      hasFile: Boolean(l.hasFile),
      originalFilename: l.originalFilename || '',
      hlsStatus: l.hlsStatus || null,
      hlsError: l.hlsError || null,
      hlsManifestPath: l.hlsManifestPath || null,
    })));
  };

  const buildPayload = () => ({
    ...form,
    estimatedDurationMinutes: Number(form.estimatedDurationMinutes) || 0,
    lessons: lessons
      .filter((l) => l.title.trim())
      .map((l, index) => ({
        ...(l.id ? { id: l.id } : {}),
        title: l.title.trim(),
        type: l.type,
        content: l.content,
        resourceUrl: l.resourceUrl,
        durationMinutes: Number(l.durationMinutes) || 0,
        sortOrder: index,
      })),
    quizzes: quiz.title.trim() && quiz.questions.some((q) => q.question.trim())
      ? [{
        title: quiz.title.trim(),
        description: quiz.description,
        passPercentage: Number(quiz.passPercentage) || 60,
        maxAttempts: Number(quiz.maxAttempts) || 0,
        requiredForCompletion: Boolean(quiz.requiredForCompletion),
        sortOrder: 0,
        questions: quiz.questions
          .filter((q) => q.question.trim())
          .map((q, qi) => ({
            question: q.question.trim(),
            type: q.type || 'mcq',
            marks: Number(q.marks) || 1,
            sortOrder: qi,
            options: (q.options || [])
              .filter((o) => o.text.trim())
              .map((o, oi) => ({
                text: o.text.trim(),
                correct: Boolean(o.correct),
                sortOrder: oi,
              })),
          })),
      }]
      : [],
  });

  const save = async ({ publish = false } = {}) => {
    if (!form.title.trim()) {
      toast('Course title is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (publish) payload.status = 'published';
      let saved;
      if (isNew) {
        saved = await lmsApi.createCourse(payload);
        applySavedLessons(saved);
        toast(publish ? 'Course published.' : 'Course created.', 'success');
        navigate(tenantPath(`${basePath}/courses/${saved.id}`), { replace: true });
      } else {
        saved = await lmsApi.updateCourse(courseId, payload);
        if (publish && saved.status !== 'published') {
          saved = await lmsApi.publishCourse(courseId);
        }
        applySavedLessons(saved);
        toast(publish ? 'Course published.' : 'Course saved.', 'success');
      }
    } catch (err) {
      toast(err?.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadLessonMedia = async (lesson, file) => {
    if (!file) return;
    if (!lesson.id) {
      toast('Save the course first so this lesson has an id, then upload.', 'error');
      return;
    }
    setUploadingKey(lesson.key);
    try {
      const result = await lmsApi.uploadLessonFile(lesson.id, file);
      setLessons((prev) => prev.map((l) => (l.key === lesson.key ? {
        ...l,
        type: result.type || l.type,
        hasFile: true,
        originalFilename: result.originalName || file.name,
        hlsStatus: result.hlsStatus || null,
        hlsError: result.hlsError || null,
        hlsManifestPath: result.hlsManifestPath || null,
      } : l)));
      toast('File uploaded. HLS will process in the background when FFmpeg is available.', 'success');
    } catch (err) {
      toast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploadingKey(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingState label="Loading course…" />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title={isNew ? 'New Course' : 'Edit Course'}
          subtitle="Lessons, notes/videos, and a completion quiz for Digital Classroom."
          actions={(
            <div className="flex flex-wrap gap-2">
              <Link to={tenantPath(basePath)}>
                <Button variant="secondary"><ArrowLeft size={16} /> Back</Button>
              </Link>
              {!isNew && (
                <Link to={tenantPath(`${basePath}/courses/${courseId}/playground`)}>
                  <Button variant="secondary"><Eye size={16} /> Preview</Button>
                </Link>
              )}
              <Button variant="secondary" onClick={() => save()} loading={saving}>
                <Save size={16} /> Save draft
              </Button>
              <Button onClick={() => save({ publish: true })} loading={saving}>
                <Send size={16} /> Publish
              </Button>
            </div>
          )}
        />

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#e4e7ec] bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#0b1b33]">Course details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Title"
                required
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
              />
              <Input
                label="Subject"
                value={form.subject}
                onChange={(e) => setField('subject', e.target.value)}
              />
              <Select
                label="Class"
                value={form.classId}
                onChange={(e) => onClassChange(e.target.value)}
                options={[{ value: '', label: 'All classes' }, ...classOptions]}
              />
              <Input
                label="Estimated duration (minutes)"
                type="number"
                value={form.estimatedDurationMinutes}
                onChange={(e) => setField('estimatedDurationMinutes', e.target.value)}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Description"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e4e7ec] bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#0b1b33]">Lessons</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setLessons((prev) => [...prev, emptyLesson()])}
              >
                <Plus size={14} /> Add lesson
              </Button>
            </div>
            <div className="space-y-4">
              {lessons.map((lesson, index) => (
                <div key={lesson.key} className="rounded-xl border border-[#eef0f4] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#0b1b33]">Lesson {index + 1}</p>
                    {lessons.length > 1 && (
                      <button
                        type="button"
                        className="text-[#98a2b3] hover:text-red-600"
                        onClick={() => setLessons((prev) => prev.filter((l) => l.key !== lesson.key))}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      label="Title"
                      value={lesson.title}
                      onChange={(e) => setLessons((prev) => prev.map((l) =>
                        (l.key === lesson.key ? { ...l, title: e.target.value } : l)))}
                    />
                    <Select
                      label="Type"
                      value={lesson.type}
                      options={LESSON_TYPES}
                      onChange={(e) => setLessons((prev) => prev.map((l) =>
                        (l.key === lesson.key ? { ...l, type: e.target.value } : l)))}
                    />
                    <Input
                      label="YouTube / external URL"
                      value={lesson.resourceUrl}
                      onChange={(e) => setLessons((prev) => prev.map((l) =>
                        (l.key === lesson.key ? { ...l, resourceUrl: e.target.value } : l)))}
                    />
                    <Input
                      label="Duration (minutes)"
                      type="number"
                      value={lesson.durationMinutes}
                      onChange={(e) => setLessons((prev) => prev.map((l) =>
                        (l.key === lesson.key ? { ...l, durationMinutes: e.target.value } : l)))}
                    />
                    {(lesson.type === 'video' || lesson.type === 'audio' || lesson.type === 'document') && (
                      <div className="md:col-span-2 space-y-2">
                        <p className="text-sm font-medium text-[#344054]">Upload file</p>
                        {!lesson.id ? (
                          <p className="text-xs text-[#667085]">Save the course first to enable uploads for this lesson.</p>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              ref={(el) => { fileInputRefs.current[lesson.key] = el; }}
                              type="file"
                              className="hidden"
                              accept={
                                lesson.type === 'audio'
                                  ? 'audio/*'
                                  : lesson.type === 'document'
                                    ? '.pdf,.doc,.docx,.ppt,.pptx,application/*'
                                    : 'video/*,.mp4,.webm,.mov'
                              }
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                uploadLessonMedia(lesson, file);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={uploadingKey === lesson.key}
                              onClick={() => fileInputRefs.current[lesson.key]?.click()}
                            >
                              <Upload size={14} /> {lesson.hasFile ? 'Replace file' : 'Upload file'}
                            </Button>
                            {lesson.hasFile && (
                              <span className="text-xs text-[#475467]">
                                {lesson.originalFilename || 'Uploaded'}
                                {lesson.hlsStatus ? ` · HLS: ${lesson.hlsStatus}` : ''}
                              </span>
                            )}
                          </div>
                        )}
                        {lesson.hlsStatus === 'failed' && lesson.hlsError ? (
                          <p className="text-xs text-[#b54708]">{lesson.hlsError}</p>
                        ) : null}
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <Textarea
                        label="Notes / content"
                        value={lesson.content}
                        onChange={(e) => setLessons((prev) => prev.map((l) =>
                          (l.key === lesson.key ? { ...l, content: e.target.value } : l)))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e4e7ec] bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#0b1b33]">Completion quiz</h2>
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <Input
                label="Quiz title"
                value={quiz.title}
                onChange={(e) => setQuiz((prev) => ({ ...prev, title: e.target.value }))}
              />
              <Input
                label="Pass %"
                type="number"
                value={quiz.passPercentage}
                onChange={(e) => setQuiz((prev) => ({ ...prev, passPercentage: e.target.value }))}
              />
              <Input
                label="Max attempts (0 = unlimited)"
                type="number"
                value={quiz.maxAttempts}
                onChange={(e) => setQuiz((prev) => ({ ...prev, maxAttempts: e.target.value }))}
              />
            </div>
            <label className="mb-4 flex items-center gap-2 text-sm text-[#475467]">
              <input
                type="checkbox"
                checked={quiz.requiredForCompletion}
                onChange={(e) => setQuiz((prev) => ({ ...prev, requiredForCompletion: e.target.checked }))}
              />
              Required for certificate
            </label>

            <div className="space-y-4">
              {quiz.questions.map((question, qi) => (
                <div key={question.key} className="rounded-xl border border-[#eef0f4] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#0b1b33]">Question {qi + 1}</p>
                    {quiz.questions.length > 1 && (
                      <button
                        type="button"
                        className="text-[#98a2b3] hover:text-red-600"
                        onClick={() => setQuiz((prev) => ({
                          ...prev,
                          questions: prev.questions.filter((q) => q.key !== question.key),
                        }))}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <Textarea
                    label="Question"
                    value={question.question}
                    onChange={(e) => setQuiz((prev) => ({
                      ...prev,
                      questions: prev.questions.map((q) =>
                        (q.key === question.key ? { ...q, question: e.target.value } : q)),
                    }))}
                  />
                  <div className="mt-3 space-y-2">
                    {question.options.map((option) => (
                      <div key={option.key} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${question.key}`}
                          checked={option.correct}
                          onChange={() => setQuiz((prev) => ({
                            ...prev,
                            questions: prev.questions.map((q) => {
                              if (q.key !== question.key) return q;
                              return {
                                ...q,
                                options: q.options.map((o) => ({
                                  ...o,
                                  correct: o.key === option.key,
                                })),
                              };
                            }),
                          }))}
                        />
                        <Input
                          className="flex-1"
                          placeholder="Option text"
                          value={option.text}
                          onChange={(e) => setQuiz((prev) => ({
                            ...prev,
                            questions: prev.questions.map((q) => {
                              if (q.key !== question.key) return q;
                              return {
                                ...q,
                                options: q.options.map((o) =>
                                  (o.key === option.key ? { ...o, text: e.target.value } : o)),
                              };
                            }),
                          }))}
                        />
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setQuiz((prev) => ({
                        ...prev,
                        questions: prev.questions.map((q) => {
                          if (q.key !== question.key) return q;
                          return {
                            ...q,
                            options: [...q.options, { key: newKey(), text: '', correct: false }],
                          };
                        }),
                      }))}
                    >
                      <Plus size={14} /> Add option
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => setQuiz((prev) => ({
                  ...prev,
                  questions: [...prev.questions, emptyQuestion()],
                }))}
              >
                <Plus size={14} /> Add question
              </Button>
            </div>
          </section>
        </div>
      </PageTransition>
    </Layout>
  );
}
