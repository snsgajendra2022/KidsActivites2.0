/**
 * Course certificate visual templates (12 printed-paper designs).
 * Backgrounds, frames, and fonts are applied by CSS class `cert-paper--{id}`.
 */

export const COURSE_CERTIFICATE_TEMPLATES = [
  {
    id: 'classic-gold',
    name: 'Classic Gold',
    tagline: 'Ivory parchment & gold foil',
    family: 'Traditional',
    accent: '#C9A227',
    ink: '#3B2F1A',
    paper: '#F7F0DE',
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    tagline: 'Crisp white linen paper',
    family: 'Modern',
    accent: '#0F172A',
    ink: '#1E293B',
    paper: '#FFFEFB',
  },
  {
    id: 'royal-emerald',
    name: 'Royal Emerald',
    tagline: 'Forest velvet & gold leaf',
    family: 'Luxury',
    accent: '#D4AF37',
    ink: '#F4F1E8',
    paper: '#0F3D2E',
  },
  {
    id: 'midnight-navy',
    name: 'Midnight Navy',
    tagline: 'Deep navy vellum & brass',
    family: 'Luxury',
    accent: '#E8C872',
    ink: '#F8F4E8',
    paper: '#0B1C33',
  },
  {
    id: 'pastel-bloom',
    name: 'Pastel Bloom',
    tagline: 'Blush watercolor paper',
    family: 'Soft',
    accent: '#B76E79',
    ink: '#5C2A3A',
    paper: '#FFF6F4',
  },
  {
    id: 'academic-scholar',
    name: 'Academic Scholar',
    tagline: 'Aged cream parchment',
    family: 'Traditional',
    accent: '#8B5A2B',
    ink: '#3E2A14',
    paper: '#F3E6C9',
  },
  {
    id: 'ocean-azure',
    name: 'Ocean Azure',
    tagline: 'Coastal linen & teal',
    family: 'Modern',
    accent: '#1A6B8A',
    ink: '#143447',
    paper: '#F4FAFC',
  },
  {
    id: 'sunset-coral',
    name: 'Sunset Coral',
    tagline: 'Warm terracotta paper',
    family: 'Celebration',
    accent: '#C45C26',
    ink: '#4A2412',
    paper: '#FFF4EA',
  },
  {
    id: 'geometric-modern',
    name: 'Geometric Modern',
    tagline: 'Gallery white & indigo',
    family: 'Modern',
    accent: '#4338CA',
    ink: '#1E1B4B',
    paper: '#F7F6FF',
  },
  {
    id: 'forest-sage',
    name: 'Forest Sage',
    tagline: 'Moss handmade paper',
    family: 'Soft',
    accent: '#4A6B3A',
    ink: '#2A3B22',
    paper: '#F4F6EE',
  },
  {
    id: 'platinum-elite',
    name: 'Platinum Elite',
    tagline: 'Pearl stock & silver',
    family: 'Luxury',
    accent: '#6B7280',
    ink: '#111827',
    paper: '#F4F5F7',
  },
  {
    id: 'celebration-festive',
    name: 'Celebration Festive',
    tagline: 'Champagne & magenta foil',
    family: 'Celebration',
    accent: '#9D174D',
    ink: '#4A1030',
    paper: '#FFF8F0',
  },
];

export function getCourseCertificateTemplate(id) {
  return (
    COURSE_CERTIFICATE_TEMPLATES.find((t) => t.id === id) || COURSE_CERTIFICATE_TEMPLATES[0]
  );
}
