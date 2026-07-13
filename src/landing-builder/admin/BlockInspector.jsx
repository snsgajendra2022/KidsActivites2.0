import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Input from '../../components/ui/Input.jsx';
import ToggleSwitch from '../../components/ui/ToggleSwitch.jsx';
import { readFileAsDataUrl } from '../../services/portalConfigService.js';
import { landingPageAction } from '../../services/landingPageApi.js';
import { BLOCK_PALETTE, BLOCK_TYPES, LAYOUT_OPTIONS, createDefaultBlock } from '../blockRegistry.js';
import { cloneBlock, moveBlock, removeBlockAt, updateBlockAt, updateBlockContent, updateBlockStyle } from '../blockUtils.js';

function blockLabel(type) {
  const labels = {
    contentSplit: 'Split content',
    bentoPair: 'Vision & mission',
    featurePanel: 'Feature panel',
    highlights: 'Highlights grid',
    testimonials: 'Testimonials',
  };
  return BLOCK_PALETTE.find((b) => b.type === type)?.label || labels[type] || type;
}

function ImageField({ label, value, onChange, schoolId }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      try {
        const result = await landingPageAction('uploadAsset', {
          field: label,
          fileName: file.name,
          mimeType: file.type || 'image/png',
          dataUrl,
        }, { schoolId });
        onChange(result.url || dataUrl);
      } catch (err) {
        console.error('[LandingBuilder] image upload failed', err);
        // Keep local preview; saveDraft/publish will upload base64 on the server.
        onChange(dataUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="landing-builder__image-field">
      <p className="landing-builder__field-label">{label}</p>
      <div className="landing-builder__image-row">
        {value ? (
          <img src={value} alt="" className="landing-builder__image-thumb" />
        ) : (
          <div className="landing-builder__image-empty">No image</div>
        )}
        <div className="landing-builder__image-actions">
          <label className={`premium-btn premium-btn-secondary premium-btn-sm${uploading ? ' is-disabled' : ''}`}>
            {uploading ? 'Uploading…' : 'Upload'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          {value && (
            <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => onChange(null)} disabled={uploading}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroInspector({ block, onContent, onStyle, schoolId }) {
  const c = block.content || {};
  const isSplit = block.layout === 'split-playful';
  return (
    <div className="landing-builder__inspector-fields">
      {isSplit && (
        <>
          <Input label="Brand / school name" value={c.brandName || ''} onChange={(e) => onContent({ brandName: e.target.value })} variant="enrollment" />
          <ImageField label="Logo" value={c.logoUrl} onChange={(url) => onContent({ logoUrl: url })} schoolId={schoolId} />
          <ImageField label="Hero image" value={c.heroImageUrl} onChange={(url) => onContent({ heroImageUrl: url })} schoolId={schoolId} />
          <Input label="Title (before highlight)" value={c.title || ''} onChange={(e) => onContent({ title: e.target.value })} variant="enrollment" />
          <Input label="Highlighted words" value={c.titleHighlight || ''} onChange={(e) => onContent({ titleHighlight: e.target.value })} variant="enrollment" />
          <Input label="Title (after highlight)" value={c.titleSuffix || ''} onChange={(e) => onContent({ titleSuffix: e.target.value })} variant="enrollment" />
        </>
      )}
      {!isSplit && (
        <Input label="Title" value={c.title || ''} onChange={(e) => onContent({ title: e.target.value })} variant="enrollment" />
      )}
      <Input label="Badge" value={c.badge || ''} onChange={(e) => onContent({ badge: e.target.value })} variant="enrollment" />
      <div>
        <label className="landing-builder__field-label">Subtitle</label>
        <textarea
          className="landing-builder__textarea"
          rows={3}
          value={c.subtitle || ''}
          onChange={(e) => onContent({ subtitle: e.target.value })}
        />
      </div>
      {!isSplit && (
        <ImageField label="Background image" value={block.style?.backgroundImageUrl} onChange={(url) => onStyle({ backgroundImageUrl: url })} schoolId={schoolId} />
      )}
      <Input label="Primary button label" value={c.primaryButton?.label || ''} onChange={(e) => onContent({ primaryButton: { ...c.primaryButton, label: e.target.value } })} variant="enrollment" />
      <Input label="Primary button link" value={c.primaryButton?.href || ''} onChange={(e) => onContent({ primaryButton: { ...c.primaryButton, href: e.target.value } })} variant="enrollment" />
      <Input label="Secondary button label" value={c.secondaryButton?.label || ''} onChange={(e) => onContent({ secondaryButton: { ...c.secondaryButton, label: e.target.value } })} variant="enrollment" />
      <Input label="Secondary button link" value={c.secondaryButton?.href || ''} onChange={(e) => onContent({ secondaryButton: { ...c.secondaryButton, href: e.target.value } })} variant="enrollment" />
      <ToggleSwitch checked={c.showPrimaryButton !== false} onChange={(v) => onContent({ showPrimaryButton: v })} label="Show primary button" />
      <ToggleSwitch checked={c.showSecondaryButton !== false} onChange={(v) => onContent({ showSecondaryButton: v })} label="Show secondary button" />
    </div>
  );
}

function FeaturesInspector({ block, onContent, schoolId }) {
  const c = block.content || {};
  const items = c.items || [];

  const patchItem = (index, patch) => {
    onContent({
      items: items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  return (
    <div className="landing-builder__inspector-fields">
      <Input label="Section title" value={c.title || ''} onChange={(e) => onContent({ title: e.target.value })} variant="enrollment" />
      <Input label="Subtitle" value={c.subtitle || ''} onChange={(e) => onContent({ subtitle: e.target.value })} variant="enrollment" />
      <p className="landing-builder__field-label">Feature items</p>
      {items.map((item, index) => (
        <div key={item.id || index} className="landing-builder__feature-item">
          <Input label={`Item ${index + 1} title`} value={item.title || ''} onChange={(e) => patchItem(index, { title: e.target.value })} variant="enrollment" />
          <Input label="Description" value={item.description || ''} onChange={(e) => patchItem(index, { description: e.target.value })} variant="enrollment" />
          <ImageField label="Image" value={item.imageUrl} onChange={(url) => patchItem(index, { imageUrl: url })} schoolId={schoolId} />
        </div>
      ))}
    </div>
  );
}

function ImageBannerInspector({ block, onContent, schoolId }) {
  const c = block.content || {};
  return (
    <div className="landing-builder__inspector-fields">
      <Input label="Title" value={c.title || ''} onChange={(e) => onContent({ title: e.target.value })} variant="enrollment" />
      <Input label="Subtitle" value={c.subtitle || ''} onChange={(e) => onContent({ subtitle: e.target.value })} variant="enrollment" />
      <ImageField label="Banner image" value={c.imageUrl} onChange={(url) => onContent({ imageUrl: url })} schoolId={schoolId} />
    </div>
  );
}

function MapInspector({ block, onContent, schoolId }) {
  const c = block.content || {};
  return (
    <div className="landing-builder__inspector-fields">
      <Input label="Title" value={c.title || ''} onChange={(e) => onContent({ title: e.target.value })} variant="enrollment" />
      <Input label="Subtitle" value={c.subtitle || ''} onChange={(e) => onContent({ subtitle: e.target.value })} variant="enrollment" />
      <Input label="Map embed URL" value={c.embedUrl || ''} onChange={(e) => onContent({ embedUrl: e.target.value })} variant="enrollment" helper="Google Maps embed iframe src URL" />
      <ImageField label="Fallback image" value={c.imageUrl} onChange={(url) => onContent({ imageUrl: url })} schoolId={schoolId} />
      <ToggleSwitch checked={c.showAddress !== false} onChange={(v) => onContent({ showAddress: v })} label="Show school address" />
    </div>
  );
}

function CtaInspector({ block, onContent, onStyle, schoolId }) {
  const c = block.content || {};
  return (
    <div className="landing-builder__inspector-fields">
      <Input label="Title" value={c.title || ''} onChange={(e) => onContent({ title: e.target.value })} variant="enrollment" />
      <Input label="Subtitle" value={c.subtitle || ''} onChange={(e) => onContent({ subtitle: e.target.value })} variant="enrollment" />
      <Input label="Button label" value={c.button?.label || ''} onChange={(e) => onContent({ button: { ...c.button, label: e.target.value } })} variant="enrollment" />
      <ImageField label="Background image" value={block.style?.backgroundImageUrl} onChange={(url) => onStyle({ backgroundImageUrl: url })} schoolId={schoolId} />
      <div>
        <label className="landing-builder__field-label">Background color</label>
        <input
          type="color"
          value={block.style?.backgroundColor || '#5B4BDB'}
          onChange={(e) => onStyle({ backgroundColor: e.target.value })}
          className="landing-builder__color-input"
        />
      </div>
    </div>
  );
}

function FooterInspector({ block, onContent }) {
  const c = block.content || {};
  const isRich = block.layout === 'rich-contact';
  if (isRich) {
    return (
      <div className="landing-builder__inspector-fields">
        <Input label="School name" value={c.brandName || ''} onChange={(e) => onContent({ brandName: e.target.value })} variant="enrollment" />
        <Input label="Tagline" value={c.tagline || ''} onChange={(e) => onContent({ tagline: e.target.value })} variant="enrollment" />
        <Input label="Address" value={c.address || ''} onChange={(e) => onContent({ address: e.target.value })} variant="enrollment" />
        <Input label="Email" value={c.email || ''} onChange={(e) => onContent({ email: e.target.value })} variant="enrollment" />
        <Input label="Phone" value={c.phone || ''} onChange={(e) => onContent({ phone: e.target.value })} variant="enrollment" />
      </div>
    );
  }
  return (
    <ToggleSwitch
      checked={block.content?.compact !== false}
      onChange={(v) => onContent({ compact: v })}
      label="Compact footer"
    />
  );
}

function ContentSplitInspector({ block, onContent, schoolId }) {
  const c = block.content || {};
  return (
    <div className="landing-builder__inspector-fields">
      <Input label="Title" value={c.title || ''} onChange={(e) => onContent({ title: e.target.value })} variant="enrollment" />
      {(c.body || ['']).map((para, i) => (
        <div key={i}>
          <label className="landing-builder__field-label">Paragraph {i + 1}</label>
          <textarea
            className="landing-builder__textarea"
            rows={3}
            value={para}
            onChange={(e) => {
              const body = [...(c.body || [])];
              body[i] = e.target.value;
              onContent({ body });
            }}
          />
        </div>
      ))}
      <Input label="Quote" value={c.quote || ''} onChange={(e) => onContent({ quote: e.target.value })} variant="enrollment" />
      <ImageField label="Image" value={c.imageUrl} onChange={(url) => onContent({ imageUrl: url })} schoolId={schoolId} />
    </div>
  );
}

function TestimonialsInspector({ block, onContent, schoolId }) {
  const c = block.content || {};
  const items = c.items || [];
  const patchItem = (index, patch) => {
    onContent({ items: items.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  };
  return (
    <div className="landing-builder__inspector-fields">
      <Input label="Section title" value={c.title || ''} onChange={(e) => onContent({ title: e.target.value })} variant="enrollment" />
      {items.map((item, index) => (
        <div key={item.id || index} className="landing-builder__feature-item">
          <Input label={`Review ${index + 1}`} value={item.quote || ''} onChange={(e) => patchItem(index, { quote: e.target.value })} variant="enrollment" />
          <Input label="Name" value={item.name || ''} onChange={(e) => patchItem(index, { name: e.target.value })} variant="enrollment" />
          <ImageField label="Avatar" value={item.avatar} onChange={(url) => patchItem(index, { avatar: url })} schoolId={schoolId} />
        </div>
      ))}
    </div>
  );
}

function GenericTextInspector({ block, onContent, schoolId, fields }) {
  const c = block.content || {};
  return (
    <div className="landing-builder__inspector-fields">
      {fields.map(({ key, label, type = 'text' }) => (
        type === 'image' ? (
          <ImageField key={key} label={label} value={c[key]} onChange={(url) => onContent({ [key]: url })} schoolId={schoolId} />
        ) : (
          <Input key={key} label={label} value={c[key] || ''} onChange={(e) => onContent({ [key]: e.target.value })} variant="enrollment" />
        )
      ))}
    </div>
  );
}

export default function BlockInspector({ block, draft, onDraftChange, schoolName, portalName, schoolId }) {
  if (!block) {
    return (
      <div className="landing-builder__inspector landing-builder__inspector--empty">
        <p>Select a block to edit its content and layout.</p>
      </div>
    );
  }

  const onContent = (patch) => {
    onDraftChange({
      ...draft,
      blocks: updateBlockContent(draft.blocks, block.id, patch),
    });
  };

  const onStyle = (patch) => {
    onDraftChange({
      ...draft,
      blocks: updateBlockStyle(draft.blocks, block.id, patch),
    });
  };

  const onLayout = (layout) => {
    onDraftChange({
      ...draft,
      blocks: draft.blocks.map((b) => (b.id === block.id ? { ...b, layout } : b)),
    });
  };

  const layouts = LAYOUT_OPTIONS[block.type] || [];

  return (
    <div className="landing-builder__inspector">
      <h3 className="landing-builder__inspector-title">{blockLabel(block.type)}</h3>

      {layouts.length > 1 && (
        <div className="landing-builder__layout-picker">
          <p className="landing-builder__field-label">Layout</p>
          <div className="landing-builder__layout-options">
            {layouts.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`landing-builder__layout-btn${block.layout === opt.id ? ' landing-builder__layout-btn--active' : ''}`}
                onClick={() => onLayout(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {block.type === BLOCK_TYPES.HERO && <HeroInspector block={block} onContent={onContent} onStyle={onStyle} schoolId={schoolId} />}
      {block.type === BLOCK_TYPES.FEATURES && <FeaturesInspector block={block} onContent={onContent} schoolId={schoolId} />}
      {block.type === BLOCK_TYPES.IMAGE_BANNER && <ImageBannerInspector block={block} onContent={onContent} schoolId={schoolId} />}
      {block.type === BLOCK_TYPES.MAP && <MapInspector block={block} onContent={onContent} schoolId={schoolId} />}
      {block.type === BLOCK_TYPES.CTA && <CtaInspector block={block} onContent={onContent} onStyle={onStyle} schoolId={schoolId} />}
      {block.type === BLOCK_TYPES.FOOTER && <FooterInspector block={block} onContent={onContent} />}
      {block.type === BLOCK_TYPES.CONTENT_SPLIT && <ContentSplitInspector block={block} onContent={onContent} schoolId={schoolId} />}
      {block.type === BLOCK_TYPES.TESTIMONIALS && <TestimonialsInspector block={block} onContent={onContent} schoolId={schoolId} />}
      {block.type === BLOCK_TYPES.FEATURE_PANEL && (
        <GenericTextInspector
          block={block}
          onContent={onContent}
          schoolId={schoolId}
          fields={[
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
            { key: 'imageUrl', label: 'Image', type: 'image' },
          ]}
        />
      )}
      {block.type === BLOCK_TYPES.HIGHLIGHTS && (
        <GenericTextInspector
          block={block}
          onContent={onContent}
          schoolId={schoolId}
          fields={[
            { key: 'title', label: 'Title' },
            { key: 'subtitle', label: 'Subtitle' },
          ]}
        />
      )}
      {block.type === BLOCK_TYPES.BENTO_PAIR && (
        <p className="landing-builder__inspector-note">Edit vision &amp; mission cards in the draft JSON or re-apply the Laugh &amp; Learn template.</p>
      )}
    </div>
  );
}

export function BlockList({
  draft,
  selectedId,
  onSelect,
  onDraftChange,
  schoolName,
  portalName,
}) {
  const blocks = draft?.blocks || [];

  const setBlocks = (nextBlocks) => onDraftChange({ ...draft, blocks: nextBlocks });

  const addBlock = (type) => {
    const block = createDefaultBlock(type, { schoolName, portalName });
    setBlocks([...blocks, block]);
    onSelect(block.id);
  };

  return (
    <div className="landing-builder__blocks">
      <div className="landing-builder__blocks-head">
        <p className="landing-builder__field-label">Page sections</p>
        <div className="landing-builder__add-menu">
          {BLOCK_PALETTE.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              className="landing-builder__add-btn"
              title={`Add ${label}`}
              onClick={() => addBlock(type)}
            >
              <Plus size={14} />
            </button>
          ))}
        </div>
      </div>

      <ul className="landing-builder__block-list">
        {blocks.map((block, index) => (
          <li
            key={block.id}
            className={`landing-builder__block-item${selectedId === block.id ? ' landing-builder__block-item--active' : ''}${block.visible === false ? ' landing-builder__block-item--hidden' : ''}`}
          >
            <button type="button" className="landing-builder__block-select" onClick={() => onSelect(block.id)}>
              <GripVertical size={14} className="landing-builder__block-grip" />
              <span>{blockLabel(block.type)}</span>
            </button>
            <div className="landing-builder__block-actions">
              <button
                type="button"
                title="Move up"
                disabled={index === 0}
                onClick={(e) => { e.stopPropagation(); setBlocks(moveBlock(blocks, index, index - 1)); }}
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                title="Move down"
                disabled={index === blocks.length - 1}
                onClick={(e) => { e.stopPropagation(); setBlocks(moveBlock(blocks, index, index + 1)); }}
              >
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                title={block.visible === false ? 'Show section' : 'Hide section'}
                onClick={(e) => {
                  e.stopPropagation();
                  setBlocks(updateBlockAt(blocks, index, { visible: block.visible === false }));
                }}
              >
                {block.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                title="Duplicate"
                onClick={(e) => {
                  e.stopPropagation();
                  const copy = cloneBlock(block);
                  const next = [...blocks];
                  next.splice(index + 1, 0, copy);
                  setBlocks(next);
                  onSelect(copy.id);
                }}
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                title="Remove"
                className="landing-builder__block-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  setBlocks(removeBlockAt(blocks, index));
                  if (selectedId === block.id) onSelect(null);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
