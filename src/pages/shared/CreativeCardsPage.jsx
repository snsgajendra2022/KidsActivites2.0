import { ArrowLeft, Edit3, LayoutGrid, Plus, Sparkles } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import {
  CardDownload,
  CardEditor,
  CardPreview,
  CelebrationAnimation,
  CreativeCardsDashboard,
  EmptyState,
  SavedCards,
  TemplateGallery,
} from '../../components/creative-cards/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import creativeData from '../../data/kidsCreativeCards.json';
import { CLASS_STUDENTS, INITIAL_PHOTOS, TEACHER_CLASSES } from '../../data/mockPhotos.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import {
  getCreativeCardById,
  getCreativeCards,
  getCreativeDraftById,
  getCreativeDrafts,
  getCreativeFavorites,
  getCreativeStatistics,
  toggleCreativeFavorite,
} from '../../services/creativeCardsStorage.js';

const cardTemplate = (templateId) => creativeData.templates.find((item) => item.id === templateId);

function CardViewer({ card, onBack, onEdit }) {
  const previewRef = useRef(null);
  const template = cardTemplate(card?.templateId) || {};

  if (!card) {
    return <EmptyState title="We couldn't find that card" description="It may have been removed from this scrapbook." actionLabel="Back to My Cards" onAction={onBack} />;
  }

  return (
    <section className="mx-auto max-w-5xl" aria-labelledby="cc-view-title">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700" aria-label="Back to My Cards"><ArrowLeft size={19} /></button>
          <div><p className="text-xs font-black uppercase tracking-widest text-violet-600">Your creation</p><h1 id="cc-view-title" className="text-2xl font-black text-slate-900">{card.title}</h1></div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onEdit(card)} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 font-bold text-violet-700"><Edit3 size={17} /> Edit</button>
          <CardDownload targetRef={previewRef} filename={`${card.title || 'creative-card'}.png`} />
        </div>
      </header>
      <div className="rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-5 shadow-sm sm:p-10">
        <CardPreview ref={previewRef} card={card} template={template} className={card.orientation === 'landscape' ? 'mx-auto max-w-3xl' : 'mx-auto max-w-md'} />
      </div>
    </section>
  );
}

export default function CreativeCardsPage() {
  const { templateId, cardId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantPath } = useTenantPath();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState(() => getCreativeCards());
  const [drafts, setDrafts] = useState(() => getCreativeDrafts());
  const [favorites, setFavorites] = useState(() => getCreativeFavorites());
  const [statistics, setStatistics] = useState(() => getCreativeStatistics());
  const [celebrating, setCelebrating] = useState(false);

  const refresh = () => {
    setCards(getCreativeCards());
    setDrafts(getCreativeDrafts());
    setFavorites(getCreativeFavorites());
    setStatistics(getCreativeStatistics());
  };

  const go = (path, state) => navigate(tenantPath(path), { state });
  const mode = location.pathname.includes('/templates')
    ? 'templates'
    : location.pathname.includes('/create/')
      ? 'create'
      : location.pathname.includes('/my-cards')
        ? 'saved'
        : location.pathname.includes('/view/')
          ? 'view'
          : 'dashboard';
  const selectedTemplate = cardTemplate(templateId) || creativeData.templates[0];
  const editingCard = location.state?.card || (cardId ? (getCreativeCardById(cardId) || getCreativeDraftById(cardId)) : null);
  const recentCards = [...cards, ...drafts].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const favoriteTemplateIds = favorites.filter((item) => item.targetType === 'template').map((item) => item.targetId);
  const classes = useMemo(() => TEACHER_CLASSES.map((item) => ({ ...item, label: item.name })), []);
  const students = useMemo(() => CLASS_STUDENTS.map((item) => ({ ...item, className: TEACHER_CLASSES.find((group) => group.id === item.classId)?.name })), []);
  const albumImages = useMemo(() => INITIAL_PHOTOS.filter((item) => item.imageUrl && item.type !== 'video'), []);
  const earnedAchievements = creativeData.achievements.filter((achievement) => Number(statistics[achievement.metric] || 0) >= achievement.threshold).length;
  const dashboardStats = {
    ...statistics,
    created: cards.length,
    favorites: favoriteTemplateIds.length,
    points: cards.length * 25 + Number(statistics.stickersUsed || 0) * 2,
    achievements: earnedAchievements,
  };
  const senderName = user?.name || '';
  const schoolName = user?.schoolName || user?.school?.name || 'Kids School';

  const chooseTemplate = (template) => go(`/creative-cards/create/${template.id}`);
  const editCard = (card) => go(`/creative-cards/create/${card.templateId || creativeData.templates[0].id}`, { card });
  const handleSaved = (saved) => {
    refresh();
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), 2200);
    toast(saved.status === 'draft' ? 'Your creative idea is safely saved!' : 'Your amazing card is ready! 🎉', 'success');
  };
  const handleFavorite = (template) => {
    const result = toggleCreativeFavorite(template.id, 'template');
    refresh();
    toast(result.isFavorite ? 'Added to favorite templates 💖' : 'Removed from favorites', 'success');
  };
  const viewCard = (card) => go(`/creative-cards/view/${card.id}`);

  return (
    <AppLayout>
      <div className="cc-studio mx-auto w-full max-w-[1500px]">
        {mode !== 'create' && mode !== 'view' && (
          <nav className="cc-studio-nav mb-6 inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-violet-100 bg-white p-1.5 shadow-sm" aria-label="Creative Cards sections">
            {[
              ['/creative-cards', 'Studio Home', Sparkles],
              ['/creative-cards/templates', 'Templates', LayoutGrid],
              ['/creative-cards/my-cards', 'My Cards', Plus],
            ].map(([path, label, Icon]) => <button key={path} type="button" onClick={() => go(path)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${location.pathname.endsWith(path) ? 'bg-violet-600 text-white shadow-md' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'}`}><Icon size={16} /> {label}</button>)}
          </nav>
        )}

        {mode === 'dashboard' && <CreativeCardsDashboard recentCards={recentCards} stats={dashboardStats} onCreate={() => go('/creative-cards/templates')} onBrowseTemplates={(categoryId) => go('/creative-cards/templates', categoryId ? { categoryId } : undefined)} onOpenCard={viewCard} onOpenSaved={() => go('/creative-cards/my-cards')} onSelectTemplate={chooseTemplate} />}
        {mode === 'templates' && <TemplateGallery initialCategory={location.state?.categoryId} albumImages={albumImages} favoriteIds={favoriteTemplateIds} onSelect={chooseTemplate} onFavorite={handleFavorite} onCreateBlank={() => chooseTemplate(creativeData.templates[0])} />}
        {mode === 'create' && <CardEditor template={selectedTemplate} initialCard={location.state?.card ? { ...location.state.card, schoolName: location.state.card.schoolName || schoolName } : { senderName, schoolName, photoUrl: albumImages[0]?.imageUrl || '' }} classes={classes} students={students} albumImages={albumImages} onBack={() => go('/creative-cards/templates')} onSaved={handleSaved} onDownload={() => toast('Your PNG card has been downloaded!', 'success')} />}
        {mode === 'saved' && <SavedCards cards={recentCards} onCreate={() => go('/creative-cards/templates')} onEdit={editCard} onDownload={viewCard} onCardsChange={refresh} />}
        {mode === 'view' && <CardViewer card={editingCard} onBack={() => go('/creative-cards/my-cards')} onEdit={editCard} />}
        <CelebrationAnimation show={celebrating} />
      </div>
    </AppLayout>
  );
}
