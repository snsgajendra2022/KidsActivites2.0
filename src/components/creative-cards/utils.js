import creativeCardsData from '../../data/kidsCreativeCards.json';
import * as creativeCardsStorage from '../../services/creativeCardsStorage.js';

export const data = creativeCardsData?.default || creativeCardsData || {};
export const templates = Array.isArray(data) ? data : (data.templates || []);
export const stickers = data.stickers || ['🎉', '⭐', '🌈', '🎈', '🏆', '💛', '🚀', '🦋'];
export const themes = data.themes || [
  { id: 'sunshine', name: 'Sunshine', colors: ['#f59e0b', '#fef3c7'] },
  { id: 'ocean', name: 'Ocean', colors: ['#0284c7', '#cffafe'] },
  { id: 'garden', name: 'Garden', colors: ['#16a34a', '#dcfce7'] },
  { id: 'berry', name: 'Berry', colors: ['#db2777', '#fce7f3'] },
];
export const fonts = data.fonts || [
  { id: 'playful', name: 'Playful', family: 'ui-rounded, "Comic Sans MS", cursive' },
  { id: 'classic', name: 'Classic', family: 'Georgia, serif' },
  { id: 'modern', name: 'Modern', family: 'Inter, ui-sans-serif, sans-serif' },
  { id: 'handwritten', name: 'Handwritten', family: '"Bradley Hand", cursive' },
];
export const messages = data.messages || [
  'You make every day brighter!',
  'Keep learning, growing, and shining!',
  'We are so proud of you!',
  'Your kindness is your superpower!',
];

export const getId = (item, fallback = '') => String(item?.id ?? item?.value ?? item?.name ?? fallback);
export const getLabel = (item, fallback = '') => typeof item === 'string'
  ? item
  : (item?.name || item?.label || item?.title || item?.text || fallback);

export function templateStyle(template = {}, card = {}) {
  const palette = card.colors || template.colors || template.palette || ['#7c3aed', '#ec4899'];
  const colors = Array.isArray(palette) ? palette : [palette.primary, palette.secondary].filter(Boolean);
  const [from = '#7c3aed', to = '#ec4899'] = colors;
  const hex = String(from).replace('#', '');
  const rgb = hex.length === 6 ? [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ] : [124, 58, 237];
  const luminance = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  return {
    background: card.background || (card.colors ? `linear-gradient(135deg, ${from}, ${to})` : null) || template.background || template.gradient || `linear-gradient(135deg, ${from}, ${to})`,
    color: card.textColor || template.textColor || (luminance > 165 ? '#1f2937' : '#ffffff'),
  };
}

export async function callStorage(methods, ...args) {
  const names = Array.isArray(methods) ? methods : [methods];
  const method = names.map((name) => creativeCardsStorage[name]).find((candidate) => typeof candidate === 'function');
  if (!method) throw new Error(`Creative Cards storage method unavailable: ${names.join(' / ')}`);
  return method(...args);
}

export const formatDate = (value) => {
  if (!value) return 'Not saved yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(date);
};

export const cx = (...values) => values.filter(Boolean).join(' ');
