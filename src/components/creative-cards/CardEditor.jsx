import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Eye, Image, LayoutTemplate, Palette, Printer, RotateCcw, Save, Send, Sparkles, Type } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CardDownload from './CardDownload.jsx';
import CardPreview from './CardPreview.jsx';
import ColorPicker from './ColorPicker.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import FontPicker from './FontPicker.jsx';
import MessagePicker from './MessagePicker.jsx';
import StickerPicker from './StickerPicker.jsx';
import ThemePicker from './ThemePicker.jsx';
import { callStorage, data, fonts, getId, messages, templates, themes } from './utils.js';

const TABS = [
  { id: 'message', label: 'Message', icon: Type },
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'stickers', label: 'Stickers', icon: Sparkles },
  { id: 'photos', label: 'Photos', icon: Image },
];

// Shared constant so an omitted `students` prop keeps a stable identity across renders.
const EMPTY_STUDENTS = [];

const toStudentOptions = (options) => {
  const list = (options || []).map((option) => ({
    id: option.id || option.value,
    label: option.label || option.name || option.fullName,
  }));
  return list.length ? list : EMPTY_STUDENTS;
};

const sameStudentOptions = (a, b) => a.length === b.length
  && a.every((item, index) => item.id === b[index].id && item.label === b[index].label);

const initialState = (card, template) => ({
  id: card?.id,
  status: card?.status,
  templateId: card?.templateId || getId(template),
  title: card?.title || template?.defaultTitle || template?.title || '',
  recipientName: card?.recipientName || card?.studentName || '',
  occasion: card?.occasion || template?.categoryId || '',
  schoolName: card?.schoolName || 'Kids School',
  classId: card?.classId || '',
  className: card?.className || '',
  studentId: card?.studentId || '',
  studentName: card?.studentName || '',
  message: card?.message || template?.defaultMessage || template?.message || '',
  senderName: card?.senderName || '',
  orientation: card?.orientation || template?.orientation || 'portrait',
  theme: card?.theme || card?.themeId || template?.themeId || getId(themes[0]),
  colors: card?.colors || template?.colors,
  textColor: card?.textColor || template?.textColor,
  font: card?.font || getId(fonts[0]),
  fontSize: card?.fontSize || 18,
  alignment: card?.alignment || 'center',
  background: card?.background || template?.gradient || '',
  photoUrl: card?.photoUrl || '',
  stickers: card?.stickers || template?.stickers || template?.decorations || [],
});

export default function CardEditor({
  template: templateProp,
  initialCard,
  classes = [],
  students = EMPTY_STUDENTS,
  loadStudents,
  albumImages = [],
  onBack,
  onSaved,
  onDownload,
  onPrint,
  onNavigate,
}) {
  const template = useMemo(
    () => templateProp || templates.find((item) => getId(item) === String(initialCard?.templateId)) || templates[0] || {},
    [initialCard?.templateId, templateProp],
  );
  const baseline = useMemo(() => initialState(initialCard, template), [initialCard, template]);
  const [card, setCard] = useState(baseline);
  const [tab, setTab] = useState('message');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resolvedStudents, setResolvedStudents] = useState(() => toStudentOptions(students));
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const previewRef = useRef(null);
  const update = (key, value) => setCard((current) => ({ ...current, [key]: value }));
  // Keeps the same array instance when the roster is unchanged, so a re-run of the
  // effect below can never schedule a render that would re-trigger the effect.
  const applyStudents = useCallback((options) => {
    const next = toStudentOptions(options);
    setResolvedStudents((current) => (sameStudentOptions(current, next) ? current : next));
  }, []);

  const { classId } = card;
  useEffect(() => {
    setStudentsError('');
    if (!classId || typeof loadStudents !== 'function') {
      applyStudents(students);
      setStudentsLoading(false);
      return undefined;
    }
    let active = true;
    applyStudents(EMPTY_STUDENTS);
    setStudentsLoading(true);
    Promise.resolve()
      .then(() => loadStudents(classId))
      .then((options) => {
        if (active) applyStudents(options);
      })
      .catch((error) => {
        if (!active) return;
        applyStudents(EMPTY_STUDENTS);
        setStudentsError(error?.message || 'Unable to load students for this class.');
      })
      .finally(() => {
        if (active) setStudentsLoading(false);
      });
    return () => { active = false; };
  }, [applyStudents, classId, loadStudents, students]);
  const validate = () => {
    const next = {};
    if (!card.templateId) next.templateId = 'Oops! Choose a magical template first 😊';
    if (!card.title.trim()) next.title = 'Oops! Give your card a cheerful title 😊';
    if (!card.recipientName.trim()) next.recipientName = "Oops! Add your friend's name first 😊";
    if (!card.message.trim()) next.message = 'Oops! Add a kind message before saving 😊';
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const save = async (status) => {
    if (status !== 'draft' && !validate()) return;
    setSaving(true);
    setNotice('');
    const payload = { ...card, status, updatedAt: new Date().toISOString() };
    try {
      const editingDraft = card.status === 'draft';
      const savedCardId = editingDraft ? card.sourceCardId : card.id;
      const editingSavedCard = Boolean(savedCardId);
      const saved = status === 'draft'
        ? await callStorage(['saveCreativeDraft', 'saveDraft'], {
          ...payload,
          id: editingDraft ? card.id : undefined,
          sourceCardId: editingSavedCard ? card.id : card.sourceCardId,
        })
        : await callStorage(
          editingSavedCard ? ['updateCreativeCard', 'updateCard', 'saveCard'] : ['createCreativeCard', 'createCard', 'saveCard'],
          ...(editingSavedCard ? [savedCardId, payload] : [{ ...payload, id: undefined }]),
        );
      setCard((current) => ({ ...current, ...(saved || {}), id: saved?.id || current.id }));
      setNotice(status === 'draft' ? 'Draft saved.' : 'Card saved.');
      onSaved?.(saved || payload);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };
  const handleClass = (event) => {
    const id = event.target.value;
    const selected = classes.find((item) => getId(item) === id);
    setCard((current) => ({ ...current, classId: id, className: selected?.name || selected?.label || '', studentId: '', studentName: '' }));
  };
  const handleStudent = (event) => {
    const id = event.target.value;
    const selected = resolvedStudents.find((item) => getId(item) === id);
    const name = selected?.name || selected?.fullName || selected?.label || '';
    setCard((current) => ({ ...current, studentId: id, studentName: name, recipientName: name }));
  };
  const print = () => onPrint ? onPrint(card, previewRef.current) : window.print();

  return (
    <section className="cc-card-editor min-h-full" aria-labelledby="cc-editor-title">
      <header className="cc-editor-topbar mb-5 rounded-[1.75rem] border border-violet-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">{onBack && <button type="button" onClick={onBack} className="rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-violet-700" aria-label="Back to templates"><ArrowLeft size={19} /></button>}<div><p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-600">Card-making playground</p><h1 id="cc-editor-title" className="text-xl font-black text-slate-900 sm:text-2xl">Make a card they’ll treasure</h1></div></div>
          <ol className="cc-editor-steps hidden items-center lg:flex" aria-label="Creation steps">
            <li className="is-done"><CheckCircle2 size={14} /> Pick a design</li>
            <li className="is-active"><span className="cc-editor-steps__num">2</span> Make it yours</li>
            <li><span className="cc-editor-steps__num">3</span> Save &amp; share</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => save('draft')} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-black text-slate-700"><Save size={17} /> Save draft</button>
            <button type="button" onClick={() => save('saved')} disabled={saving} className="cc-primary-action inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white"><Send size={17} /> {saving ? 'Saving…' : 'Finish card'}</button>
          </div>
        </div>
      </header>
      {notice && <p role="status" className="mb-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-800">{notice}</p>}
      <div className="cc-card-editor__layout grid gap-5 xl:grid-cols-[minmax(270px,.8fr)_minmax(460px,1.55fr)_minmax(290px,.9fr)]">
        <aside className="cc-card-editor__details rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-100 text-xl">💌</span><div><p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Step 2</p><h2 className="flex items-center gap-2 font-black text-slate-900"><LayoutTemplate size={17} /> Who is it for?</h2></div></div>
          <div className="grid gap-4">
            <label className="text-sm font-semibold text-slate-700">Recipient name<input value={card.recipientName} onChange={(event) => update('recipientName', event.target.value)} maxLength={60} placeholder="Who is this card for?" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" aria-invalid={Boolean(errors.recipientName)} />{errors.recipientName && <span className="mt-1 block text-xs text-rose-600">{errors.recipientName}</span>}</label>
            <label className="text-sm font-semibold text-slate-700">Class<select value={card.classId} onChange={handleClass} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal" aria-invalid={Boolean(errors.classId)}><option value="">Select class</option>{classes.map((item, index) => <option key={getId(item, index)} value={getId(item, index)}>{item.name || item.label}</option>)}</select>{errors.classId && <span className="mt-1 block text-xs text-rose-600">{errors.classId}</span>}</label>
            <label className="text-sm font-semibold text-slate-700">Student<select value={card.studentId} onChange={handleStudent} disabled={!card.classId || studentsLoading} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal disabled:cursor-not-allowed disabled:opacity-60" aria-invalid={Boolean(errors.studentId)}><option value="">{!card.classId ? 'Select class first' : (studentsLoading ? 'Loading students…' : 'Select student')}</option>{resolvedStudents.map((item, index) => <option key={getId(item, index)} value={getId(item, index)}>{item.name || item.fullName || item.label}</option>)}</select>{studentsError && <span className="mt-1 block text-xs text-rose-600">{studentsError}</span>}{errors.studentId && <span className="mt-1 block text-xs text-rose-600">{errors.studentId}</span>}</label>
            <label className="text-sm font-semibold text-slate-700">Occasion<select value={card.occasion} onChange={(event) => update('occasion', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="">Choose occasion</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">Card title<input value={card.title} onChange={(event) => update('title', event.target.value)} maxLength={80} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" aria-invalid={Boolean(errors.title)} />{errors.title && <span className="mt-1 block text-xs text-rose-600">{errors.title}</span>}</label>
            <label className="text-sm font-semibold text-slate-700">From<input value={card.senderName} onChange={(event) => update('senderName', event.target.value)} placeholder="Teacher or school name" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">School name<input value={card.schoolName} onChange={(event) => update('schoolName', event.target.value)} maxLength={80} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
            <fieldset><legend className="mb-2 text-sm font-semibold text-slate-700">Orientation</legend><div className="grid grid-cols-2 gap-2">{['portrait', 'landscape'].map((option) => <button key={option} type="button" onClick={() => update('orientation', option)} aria-pressed={card.orientation === option} className={`rounded-xl border px-3 py-2 text-sm font-semibold capitalize ${card.orientation === option ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600'}`}>{option}</button>)}</div></fieldset>
          </div>
        </aside>
        <main className="cc-card-editor__canvas relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] p-5 pt-16 sm:p-9 sm:pt-16">
          <div className="absolute left-5 right-5 top-4 z-20 flex items-center justify-between"><span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-violet-700 shadow-sm backdrop-blur"><Eye size={14} /> Your card</span><span className="rounded-full bg-white/75 px-3 py-1.5 text-[10px] font-bold capitalize text-slate-600 backdrop-blur">{card.orientation} preview</span></div>
          <div className="cc-preview-mat flex w-full items-center justify-center rounded-[2rem] p-4 sm:p-6">
            <motion.div layout className="cc-preview-stage" data-orientation={card.orientation}><CardPreview ref={previewRef} card={card} template={template} orientation={card.orientation} /></motion.div>
          </div>
          <div className="cc-preview-actions mt-5 flex flex-wrap justify-center gap-2 rounded-2xl border border-white/80 bg-white/85 p-2 shadow-lg backdrop-blur">
            <CardDownload targetRef={previewRef} filename={`${card.title || 'creative-card'}.png`} onSuccess={(dataUrl) => onDownload?.(card, dataUrl)}>Download PNG</CardDownload>
            <button type="button" onClick={print} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-100"><Printer size={17} /> Print</button>
            <button type="button" onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-slate-500 hover:bg-rose-50 hover:text-rose-600"><RotateCcw size={17} /> Start over</button>
          </div>
        </main>
        <aside className="cc-card-editor__tools rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto">
          <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-100 text-xl">🎨</span><div><p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Step 1</p><h2 className="font-black text-slate-900">Creative toolbox</h2></div></div>
          <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Card editing tools">
            {TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold ${tab === id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}><Icon size={15} />{label}</button>)}
          </div>
          <div role="tabpanel">{tab === 'message' && <MessagePicker messages={messages.filter((item) => !template.categoryId || item.categoryId === template.categoryId)} value={card.message} onChange={(value) => update('message', value)} />}{tab === 'style' && <div className="grid gap-6"><ThemePicker value={card.theme} onChange={(id, theme) => setCard((current) => ({ ...current, theme: id, themeId: id, colors: theme.colors || theme.palette || [theme.primaryColor, theme.secondaryColor].filter(Boolean), font: theme.fontId || current.font }))} /><label className="text-sm font-bold text-slate-700">Background<select value={card.background} onChange={(event) => update('background', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="">Template background</option>{data.backgrounds.map((item) => <option key={item.id} value={item.value}>{item.name}</option>)}</select></label><ColorPicker value={card.textColor} onChange={(value) => update('textColor', value)} /><FontPicker value={card.font} onChange={(value) => update('font', value)} /><label className="text-sm font-bold text-slate-700">Message size <output>{card.fontSize}px</output><input type="range" min="12" max="28" value={card.fontSize} onChange={(event) => update('fontSize', Number(event.target.value))} className="mt-2 w-full accent-violet-600" /></label><fieldset><legend className="mb-2 text-sm font-bold text-slate-700">Text alignment</legend><div className="grid grid-cols-3 gap-2">{['left', 'center', 'right'].map((value) => <button key={value} type="button" onClick={() => update('alignment', value)} aria-pressed={card.alignment === value} className={`rounded-xl border px-2 py-2 text-xs font-bold capitalize ${card.alignment === value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200'}`}>{value}</button>)}</div></fieldset></div>}{tab === 'stickers' && <StickerPicker value={card.stickers} onChange={(value) => update('stickers', value)} />}{tab === 'photos' && <section aria-labelledby="cc-album-photos"><div className="mb-3 flex items-center justify-between"><div><h3 id="cc-album-photos" className="font-black text-slate-900">Class album photos</h3><p className="text-xs font-semibold text-slate-500">Add a happy school memory</p></div>{card.photoUrl && <button type="button" onClick={() => update('photoUrl', '')} className="text-xs font-black text-rose-600">Remove</button>}</div><div className="grid grid-cols-2 gap-2">{albumImages.map((photo, index) => { const url = typeof photo === 'string' ? photo : (photo.imageUrl || photo.url); return <button key={photo.id || url || index} type="button" onClick={() => update('photoUrl', url)} aria-pressed={card.photoUrl === url} className={`overflow-hidden rounded-xl border-2 bg-slate-100 p-1 ${card.photoUrl === url ? 'border-violet-500 ring-2 ring-violet-100' : 'border-transparent'}`}><img src={url} alt={photo.title || `Album memory ${index + 1}`} crossOrigin="anonymous" className="aspect-[4/3] w-full rounded-lg object-cover" /></button>; })}</div>{!albumImages.length && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">No album photos are available yet.</p>}</section>}</div>
        </aside>
      </div>
      <ConfirmDialog open={confirmReset} title="Reset your card?" description="All unsaved edits will return to their original values." confirmLabel="Reset card" destructive onCancel={() => setConfirmReset(false)} onConfirm={() => { setCard(baseline); setErrors({}); setConfirmReset(false); onNavigate?.('reset'); }} />
    </section>
  );
}
