import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClassStudentOptions } from '../../hooks/useClassStudentOptions.js';
import {
  askSchoolAi,
  generateAiHomework,
  generateAiReportComment,
} from '../../services/schoolModules/index.js';

export default function AiAssistantPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [question, setQuestion] = useState('How many students have attendance below 75%?');
  const [answer, setAnswer] = useState('');
  const [reportForm, setReportForm] = useState({
    classId: '',
    studentId: '',
    subject: 'Science',
    notes: 'Good performance in science.',
  });
  const [reportComment, setReportComment] = useState('');
  const [homeworkForm, setHomeworkForm] = useState({
    classId: '',
    subject: 'Mathematics',
    topic: 'Fractions',
  });
  const [homeworkResult, setHomeworkResult] = useState(null);
  const [loading, setLoading] = useState('');
  const {
    classOptions,
    studentOptions,
    classesLoading,
    studentsLoading,
    classesError,
    studentsError,
  } = useClassStudentOptions(user, reportForm.classId);

  const runAsk = async () => {
    setLoading('ask');
    try {
      const result = await askSchoolAi(question);
      setAnswer(result.answer);
    } catch (err) {
      toast(err?.message || 'AI request failed.', 'error');
    } finally {
      setLoading('');
    }
  };

  const runReport = async () => {
    if (!reportForm.classId || !reportForm.studentId) {
      toast('Select a class and a student.', 'warning');
      return;
    }
    setLoading('report');
    try {
      const result = await generateAiReportComment(reportForm);
      setReportComment(result.comment);
    } catch (err) {
      toast(err?.message || 'AI report generation failed.', 'error');
    } finally {
      setLoading('');
    }
  };

  const runHomework = async () => {
    if (!homeworkForm.classId) {
      toast('Select a class.', 'warning');
      return;
    }
    setLoading('homework');
    try {
      const result = await generateAiHomework(homeworkForm);
      setHomeworkResult(result);
    } catch (err) {
      toast(err?.message || 'AI homework generation failed.', 'error');
    } finally {
      setLoading('');
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="AI School Assistant"
          subtitle="Ask analytics questions, draft report-card comments, and generate homework."
        />

        <div className="grid gap-5 xl:grid-cols-3">
          <section className="sb-card p-5">
            <h2 className="text-base font-bold text-[#0b1c30]">Admin AI Assistant</h2>
            <div className="mt-4 space-y-3">
              <Textarea
                label="Ask a question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <Button loading={loading === 'ask'} onClick={runAsk}>Ask AI</Button>
              {answer && (
                <div className="rounded-lg bg-[#f3f7ff] p-3 text-sm text-[#0b1c30]">{answer}</div>
              )}
            </div>
          </section>

          <section className="sb-card p-5">
            <h2 className="text-base font-bold text-[#0b1c30]">AI Report Card Comments</h2>
            <div className="mt-4 space-y-3">
              <Select
                label="Class"
                required
                value={reportForm.classId}
                onChange={(event) => setReportForm({
                  ...reportForm,
                  classId: event.target.value,
                  studentId: '',
                })}
                options={classOptions}
                placeholder={classesLoading ? 'Loading classes…' : 'Select class'}
                disabled={classesLoading}
              />
              {classesError && <p className="text-xs text-[#b42318]">{classesError}</p>}
              <Select
                label="Student"
                required
                value={reportForm.studentId}
                onChange={(event) => setReportForm({ ...reportForm, studentId: event.target.value })}
                options={studentOptions}
                placeholder={!reportForm.classId
                  ? 'Select class first'
                  : (studentsLoading ? 'Loading students…' : 'Select student')}
                disabled={!reportForm.classId || studentsLoading}
              />
              {studentsError && <p className="text-xs text-[#b42318]">{studentsError}</p>}
              <Input label="Subject" value={reportForm.subject} onChange={(event) => setReportForm({ ...reportForm, subject: event.target.value })} />
              <Textarea label="Teacher notes" value={reportForm.notes} onChange={(event) => setReportForm({ ...reportForm, notes: event.target.value })} />
              <Button loading={loading === 'report'} onClick={runReport}>Generate Comment</Button>
              {reportComment && (
                <div className="rounded-lg bg-[#f3f7ff] p-3 text-sm text-[#0b1c30]">{reportComment}</div>
              )}
            </div>
          </section>

          <section className="sb-card p-5">
            <h2 className="text-base font-bold text-[#0b1c30]">AI Homework Generator</h2>
            <div className="mt-4 space-y-3">
              <Select
                label="Class"
                required
                value={homeworkForm.classId}
                onChange={(event) => setHomeworkForm({ ...homeworkForm, classId: event.target.value })}
                options={classOptions}
                placeholder={classesLoading ? 'Loading classes…' : 'Select class'}
                disabled={classesLoading}
              />
              <Input label="Subject" value={homeworkForm.subject} onChange={(event) => setHomeworkForm({ ...homeworkForm, subject: event.target.value })} />
              <Input label="Topic" value={homeworkForm.topic} onChange={(event) => setHomeworkForm({ ...homeworkForm, topic: event.target.value })} />
              <Button loading={loading === 'homework'} onClick={runHomework}>Generate Worksheet</Button>
              {homeworkResult && (
                <div className="rounded-lg bg-[#f3f7ff] p-3 text-sm text-[#0b1c30] whitespace-pre-wrap">
                  <strong>{homeworkResult.title}</strong>
                  {'\n'}
                  {homeworkResult.description}
                </div>
              )}
            </div>
          </section>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
