import { useEffect, useRef, useState } from 'react';
import { Archive, Copy, Edit, Eye, Trash2 } from 'lucide-react';
import { NOTICE_STATUS } from '../../constants/notices.js';

export default function NoticeActionsMenu({
  notice,
  trigger,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isDraft = notice.status === NOTICE_STATUS.DRAFT;
  const isPublished = notice.status === NOTICE_STATUS.PUBLISHED;

  return (
    <div className="notice-actions" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className="notice-actions__menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { onView?.(notice); setOpen(false); }}>
            <Eye size={16} /> View
          </button>
          {isDraft && (
            <button type="button" role="menuitem" onClick={() => { onEdit?.(notice); setOpen(false); }}>
              <Edit size={16} /> Edit
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => { onDuplicate?.(notice); setOpen(false); }}>
            <Copy size={16} /> Duplicate
          </button>
          {isPublished && (
            <button type="button" role="menuitem" onClick={() => { onArchive?.(notice); setOpen(false); }}>
              <Archive size={16} /> Archive
            </button>
          )}
          {isDraft && (
            <button type="button" role="menuitem" className="is-danger" onClick={() => { onDelete?.(notice); setOpen(false); }}>
              <Trash2 size={16} /> Delete draft
            </button>
          )}
        </div>
      )}
    </div>
  );
}
