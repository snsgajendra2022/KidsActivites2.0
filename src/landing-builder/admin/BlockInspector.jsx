import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import Input from '../../components/ui/Input.jsx';
import ToggleSwitch from '../../components/ui/ToggleSwitch.jsx';
import { BLOCK_PALETTE, BLOCK_TYPES, LAYOUT_OPTIONS, createDefaultBlock } from '../blockRegistry.js';
import { cloneBlock, moveBlock, removeBlockAt, updateBlockAt, updateBlockContent, updateBlockStyle } from '../blockUtils.js';
import {
  formatPhoneDisplay,
  getDialCodeOptions,
  splitPhone,
  validateEmail,
  validatePhoneNational,
  digitsOnly,
} from '../footerContact.js';
import { IMAGE_SPECS } from '../imageSpecs.js';
import LandingImageField from './LandingImageField.jsx';

function blockLabel(type) {
  const labels = {
    contentSplit: 'Split content',
    bentoPair: 'Vision & mission',
    featurePanel: 'Feature panel',
    highlights: 'Highlights grid',
    testimonials: 'Testimonials',
    gallery: 'Our Gallery',
  };
  return BLOCK_PALETTE.find((b) => b.type === type)?.label || labels[type] || type;
}

const ImageField = LandingImageField;

function PhoneField({ dialCode, national, onChange, error }) {
  const options = useMemo(() => getDialCodeOptions(), []);
  const code = dialCode || '91';

  return (
    <div className="landing-builder__phone-field">
      <p className="landing-builder__field-label">Mobile number</p>
      <div className={`landing-builder__phone-row${error ? ' landing-builder__phone-row--error' : ''}`}>
        <select
          className="landing-builder__dial-select"
          value={code}
          aria-label="Country code"
          onChange={(e) => onChange({ dialCode: e.target.value, national })}
        >
          {options.map((opt) => (
            <option key={opt.code} value={opt.code}>{opt.label}</option>
          ))}
        </select>
        <input
          type="tel"
          className="landing-builder__phone-input"
          value={national || ''}
          placeholder="Mobile number"
          inputMode="numeric"
          autoComplete="tel-national"
          onChange={(e) => onChange({ dialCode: code, national: digitsOnly(e.target.value) })}
        />
      </div>
      {error && <p className="landing-builder__field-error">{error}</p>}
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
          <ImageField label="Logo" value={c.logoUrl} onChange={(url) => onContent({ logoUrl: url })} schoolId={schoolId} spec={IMAGE_SPECS.logo} />
          <ImageField label="Hero image" value={c.heroImageUrl} onChange={(url) => onContent({ heroImageUrl: url })} schoolId={schoolId} spec={IMAGE_SPECS.hero} />
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
        <ImageField label="Background image" value={block.style?.backgroundImageUrl} onChange={(url) => onStyle({ backgroundImageUrl: url })} schoolId={schoolId} spec={IMAGE_SPECS.heroBackground} />
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
  const isCurriculum = block.layout === 'curriculum-grid';

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
          {isCurriculum && (
            <Input
              label="Icon name (used when no image)"
              value={item.icon || ''}
              onChange={(e) => patchItem(index, { icon: e.target.value })}
              variant="enrollment"
              helper="Material icon name, e.g. science"
            />
          )}
          <ImageField
            label={isCurriculum ? 'Card image' : 'Image'}
            value={item.imageUrl}
            onChange={(url) => patchItem(index, { imageUrl: url })}
            schoolId={schoolId}
            spec={isCurriculum ? IMAGE_SPECS.curriculum : IMAGE_SPECS.feature}
          />
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
      <ImageField label="Banner image" value={c.imageUrl} onChange={(url) => onContent({ imageUrl: url })} schoolId={schoolId} spec={IMAGE_SPECS.banner} />
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
      <ImageField label="Fallback image" value={c.imageUrl} onChange={(url) => onContent({ imageUrl: url })} schoolId={schoolId} spec={IMAGE_SPECS.mapFallback} />
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
      <ImageField label="Background image" value={block.style?.backgroundImageUrl} onChange={(url) => onStyle({ backgroundImageUrl: url })} schoolId={schoolId} spec={IMAGE_SPECS.ctaBackground} />
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
  const links = c.links || [];
  const parsed = splitPhone(c.phone, c.phoneDialCode || '91');
  const dialCode = c.phoneDialCode || parsed.dialCode;
  const national = c.phoneNational != null ? digitsOnly(c.phoneNational) : parsed.national;
  const emailError = validateEmail(c.email);
  const phoneError = validatePhoneNational(national, dialCode);

  const patchLink = (index, patch) => {
    onContent({ links: links.map((link, i) => (i === index ? { ...link, ...patch } : link)) });
  };

  const setPhone = ({ dialCode: nextCode, national: nextNational }) => {
    const code = nextCode || '91';
    const num = digitsOnly(nextNational);
    onContent({
      phoneDialCode: code,
      phoneNational: num,
      phone: formatPhoneDisplay(code, num),
    });
  };

  if (isRich) {
    return (
      <div className="landing-builder__inspector-fields">
        <Input label="School name" value={c.brandName || ''} onChange={(e) => onContent({ brandName: e.target.value })} variant="enrollment" />
        <Input label="Tagline" value={c.tagline || ''} onChange={(e) => onContent({ tagline: e.target.value })} variant="enrollment" />
        <Input label="Address" value={c.address || ''} onChange={(e) => onContent({ address: e.target.value })} variant="enrollment" />
        <Input
          label="Email"
          type="email"
          value={c.email || ''}
          onChange={(e) => onContent({ email: e.target.value })}
          variant="enrollment"
          error={emailError || undefined}
        />
        <PhoneField
          dialCode={dialCode}
          national={national}
          onChange={setPhone}
          error={phoneError || undefined}
        />
        <p className="landing-builder__field-label">Quick Links</p>
        {links.map((link, index) => (
          <div key={`footer-link-${index}`} className="landing-builder__feature-item">
            <Input
              label={`Link ${index + 1} label`}
              value={link.label || ''}
              onChange={(e) => patchLink(index, { label: e.target.value })}
              variant="enrollment"
            />
            <Input
              label="Href"
              value={link.href || ''}
              onChange={(e) => patchLink(index, { href: e.target.value })}
              variant="enrollment"
            />
          </div>
        ))}
        <button
          type="button"
          className="premium-btn premium-btn-secondary premium-btn-sm"
          onClick={() => onContent({ links: [...links, { label: 'New link', href: '#' }] })}
        >
          Add quick link
        </button>
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

function GalleryInspector({ block, onContent, schoolId }) {
  const c = block.content || {};
  const images = c.images || [];

  const patchImage = (index, patch) => {
    onContent({ images: images.map((img, i) => (i === index ? { ...img, ...patch } : img)) });
  };

  const addImage = () => {
    onContent({
      images: [
        ...images,
        { id: `gal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, imageUrl: null, alt: '' },
      ],
    });
  };

  const removeImage = (index) => {
    onContent({ images: images.filter((_, i) => i !== index) });
  };

  return (
    <div className="landing-builder__inspector-fields">
      <Input label="Section title" value={c.title || ''} onChange={(e) => onContent({ title: e.target.value })} variant="enrollment" />
      <Input label="Subtitle" value={c.subtitle || ''} onChange={(e) => onContent({ subtitle: e.target.value })} variant="enrollment" />
      <Input
        label="Columns (3 or 4)"
        type="number"
        value={c.columns ?? 3}
        onChange={(e) => {
          const n = Number(e.target.value);
          onContent({ columns: Number.isFinite(n) ? Math.min(4, Math.max(3, n)) : 3 });
        }}
        variant="enrollment"
      />
      {images.map((img, index) => (
        <div key={img.id || index} className="landing-builder__feature-item">
          <ImageField
            label={`Image ${index + 1}`}
            value={img.imageUrl}
            onChange={(url) => patchImage(index, { imageUrl: url })}
            schoolId={schoolId}
            spec={IMAGE_SPECS.gallery}
          />
          <Input
            label="Alt text"
            value={img.alt || ''}
            onChange={(e) => patchImage(index, { alt: e.target.value })}
            variant="enrollment"
          />
          <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => removeImage(index)}>
            Remove image
          </button>
        </div>
      ))}
      <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={addImage}>
        Add image
      </button>
    </div>
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
      <ImageField label="Image" value={c.imageUrl} onChange={(url) => onContent({ imageUrl: url })} schoolId={schoolId} spec={IMAGE_SPECS.contentSplit} />
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
          <ImageField label="Avatar" value={item.avatar} onChange={(url) => patchItem(index, { avatar: url })} schoolId={schoolId} spec={IMAGE_SPECS.avatar} />
        </div>
      ))}
    </div>
  );
}

function BentoPairInspector({ block, onContent, schoolId }) {
  const cards = block.content?.cards || [];

  const patchCard = (index, patch) => {
    onContent({
      cards: cards.map((card, i) => (i === index ? { ...card, ...patch } : card)),
    });
  };

  const addCard = () => {
    onContent({
      cards: [
        ...cards,
        {
          id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          icon: 'star',
          title: 'New card',
          description: '',
          imageUrl: null,
          variant: cards.length % 2 === 0 ? 'primary' : 'secondary',
        },
      ],
    });
  };

  const removeCard = (index) => {
    onContent({ cards: cards.filter((_, i) => i !== index) });
  };

  return (
    <div className="landing-builder__inspector-fields">
      <p className="landing-builder__field-label">Vision &amp; Mission cards</p>
      {cards.length === 0 && (
        <p className="landing-builder__inspector-note">No cards yet. Add Vision and Mission cards below.</p>
      )}
      {cards.map((card, index) => (
        <div key={card.id || index} className="landing-builder__feature-item">
          <Input
            label={`Card ${index + 1} title`}
            value={card.title || ''}
            onChange={(e) => patchCard(index, { title: e.target.value })}
            variant="enrollment"
          />
          <div>
            <label className="landing-builder__field-label">Description</label>
            <textarea
              className="landing-builder__textarea"
              rows={3}
              value={card.description || ''}
              onChange={(e) => patchCard(index, { description: e.target.value })}
            />
          </div>
          <Input
            label="Icon name"
            value={card.icon || ''}
            onChange={(e) => patchCard(index, { icon: e.target.value })}
            variant="enrollment"
            helper="Material icon, e.g. visibility or rocket_launch"
          />
          <ImageField
            label="Card image"
            value={card.imageUrl}
            onChange={(url) => patchCard(index, { imageUrl: url })}
            schoolId={schoolId}
            spec={IMAGE_SPECS.bento}
          />
          <div>
            <label className="landing-builder__field-label">Variant</label>
            <select
              className="landing-builder__select"
              value={card.variant || 'primary'}
              onChange={(e) => patchCard(index, { variant: e.target.value })}
            >
              <option value="primary">Primary (teal)</option>
              <option value="secondary">Secondary (gold)</option>
            </select>
          </div>
          <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => removeCard(index)}>
            Remove card
          </button>
        </div>
      ))}
      <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={addCard}>
        Add card
      </button>
    </div>
  );
}

function GenericTextInspector({ block, onContent, schoolId, fields }) {
  const c = block.content || {};
  return (
    <div className="landing-builder__inspector-fields">
      {fields.map(({ key, label, type = 'text', spec }) => (
        type === 'image' ? (
          <ImageField key={key} label={label} value={c[key]} onChange={(url) => onContent({ [key]: url })} schoolId={schoolId} spec={spec} />
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
      {block.type === BLOCK_TYPES.GALLERY && <GalleryInspector block={block} onContent={onContent} schoolId={schoolId} />}
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
            { key: 'imageUrl', label: 'Image', type: 'image', spec: IMAGE_SPECS.featurePanel },
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
        <BentoPairInspector block={block} onContent={onContent} schoolId={schoolId} />
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
  const [addOpen, setAddOpen] = useState(false);
  const blocks = draft?.blocks || [];

  const setBlocks = (nextBlocks) => onDraftChange({ ...draft, blocks: nextBlocks });

  const addBlock = (type) => {
    const block = createDefaultBlock(type, { schoolName, portalName });
    setBlocks([...blocks, block]);
    onSelect(block.id);
    setAddOpen(false);
  };

  return (
    <div className="landing-builder__blocks">
      <div className="landing-builder__blocks-head">
        <p className="landing-builder__field-label">Page sections</p>
        <div className="landing-builder__add-wrap">
          <button
            type="button"
            className={`landing-builder__add-toggle${addOpen ? ' landing-builder__add-toggle--open' : ''}`}
            aria-expanded={addOpen}
            onClick={() => setAddOpen((v) => !v)}
          >
            <Plus size={14} />
            Add section
          </button>
          {addOpen && (
            <>
              <button
                type="button"
                className="landing-builder__add-backdrop"
                aria-label="Close add menu"
                onClick={() => setAddOpen(false)}
              />
              <div className="landing-builder__add-panel" role="menu">
                <p className="landing-builder__add-panel-title">Choose a section</p>
                <div className="landing-builder__add-panel-list">
                  {BLOCK_PALETTE.map(({ type, label, desc }) => (
                    <button
                      key={type}
                      type="button"
                      className="landing-builder__add-item"
                      role="menuitem"
                      onClick={() => addBlock(type)}
                    >
                      <span className="landing-builder__add-item-label">{label}</span>
                      {desc && <span className="landing-builder__add-item-desc">{desc}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
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
