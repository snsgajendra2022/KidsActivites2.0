import React, { useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import CardEditor from './components/creative-cards/CardEditor.jsx';
import creativeData from './data/kidsCreativeCards.json';
import { INITIAL_PHOTOS } from './data/mockPhotos.js';
import './styles/global.css';
import './styles/creative-cards.css';

window.__renders = 0;
window.__alive = 0;
window.setInterval(() => { window.__alive += 1; }, 100);

const user = { id: 'u-admin', name: 'Priya Sharma', role: 'school_admin' };
const template = creativeData.templates.find((item) => item.id === 'tpl-achieve-trophy');

function Harness() {
  window.__renders += 1;
  const classOptions = useMemo(() => ([
    { value: 'c-1', label: 'Nursery A' },
    { value: 'c-2', label: 'LKG B' },
  ]), []);
  const classes = useMemo(
    () => classOptions.map((option) => ({ id: option.value, label: option.label })),
    [classOptions],
  );
  const loadStudents = useCallback(
    (classId) => Promise.resolve([{ value: 's-1', label: `Student in ${classId}` }]),
    [],
  );
  const albumImages = useMemo(
    () => INITIAL_PHOTOS.filter((item) => item.imageUrl && item.type !== 'video'),
    [],
  );

  return (
    <React.Profiler id="card-editor" onRender={() => { window.__commits = (window.__commits || 0) + 1; }}>
    <CardEditor
      template={template}
      initialCard={{ senderName: user.name, schoolName: 'Kids School', photoUrl: albumImages[0]?.imageUrl || '' }}
      classes={classes}
      loadStudents={loadStudents}
      albumImages={albumImages}
      onBack={() => {}}
      onSaved={() => {}}
      onDownload={() => {}}
    />
    </React.Profiler>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Harness />
  </React.StrictMode>,
);
