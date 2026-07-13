import { buildDefaultTheme } from '../defaultTheme.js';
import { BLOCK_TYPES } from '../blockRegistry.js';

function id(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Fixed brand — always same as original HTML (do not replace with portal school name). */
export const LAUGH_AND_LEARN_BRAND = {
  name: 'Laugh and Learn Academy',
  badge: 'LAUGH AND LEARN ACADEMY',
  city: 'Frisco, TX',
  email: 'laughlearnacademy@gmail.com',
  phone: '+1 469-247-2706',
  copyrightYear: 2024,
};

const IMAGES = {
  logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCohORorRZXHtBmogrEOzb0IZAmeNjSK7ivcqKU2mdp7yX4DvlXw3q89OSFVZ6w9igu03Zvtq-SoWmdOgDrrx86q4Hi96dlUphYy7nvmzyQMwcxSfHver3X1H3m_YxPUiZ5TqFrp0h0TDdOszOpjw5Uby6nmwnSzVYgIl8zY-vQnXyy0nyBrUGff4Up0Kmsae_AcWaVsh42X_45jzQ8RMw5z0BqYBO547CV5Qf5Bydm_CMTARRDhJ2Lgw',
  hero: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAweQFtkCAHOxG_1aF-A06gW8Ekvouwa7GsRI1fqxfNdNqvnyzstsntLcZ1W4Jbn7aTmQPY2HhjSYGGMtM_kS6XyhUnHAyC-OvrSon8tb7WrCyHBP1PIRs2zn3iKne5q9-72xH9HSYVsYgPlb-NUa59rmUqnqCejwN44CjmGbDQfQLr8zA-fw5HqZF5OSNX4rS2o-gDeRd-D9WO4HwRyj7UH4rD_K0M1kB37bdZ7niG_3mjmzUe64rlJg',
  philosophy: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJ1P33vAmGHan7Hl4XYrbsmXFpE7VlycY2yqA6XZpQxr3df6UoMhZlMU_TwlHbZdDwDqRdzGqwKo4Wo7PapS0U7wrbguJPNLOMSxwanH28vSX3qKtGbsv1_t0C5Fr_DKG__PC6QtjuHLycsmlhiEEUhmABgFL1oC5PGij6Ut9D0yEPE4KTsz5a4KRswjxSpQ_7PotVedvkvQ0Nv8d39ZZfNUFD2xG0mJCpWtDlxtfIGJsiiRZYtiC7IA',
  vision: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdypPhtiNSiNMKjVPY-NLR9McCySNaQXMkY_IehI3ZJXWkv_HwJfw-VVZvYy1EeZ5Di3CnUtTaCp0ufGBH8GP-MZV6jhJRNrXPNbl09WFnCWlbhWV0KfnZkCHGzxydqtoTKyTHvH0hjrPOvWfOxXJlHoA9dclXd-fC8xphnedjAh5DuTk70eJLb2AKq3wzSLd_9hjVgge-ubqHfNv_D0YeM6nGTUYG40t5eb8kw4ZQrg1Y4404J9Szeg',
  mission: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgRllcdNCv8juOoAu6kBbkdyzV-xDmIDR-zN9aN1LgiSFWRYzPR_oczbDeYTVeGbrLHkR1ifed73liBEPieIVwnF82HNpvr-9Kt--CArBGviJdDoBiY0WJqsQtJd22te1QzWEtCw4CE4WgwIKgfB_Ns_jDNnrqIJjwdGc0pmpctFuYgQeQFRLSNZVxgS3d979FxTfPZx205vnzRJyltSMD739BFOjASU--MGUDBDPKt_rCcpH6nFDDoA',
  environment: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBElEsmVl4XWq3voO_9TNfTmWbIVghsxiOwtKlIseOWbA5vmGiCQhHRe8TH1YkwH75pfvLZdgn-mh7KRV9nwNvaVPZ5Y-N3OQ1NEPQKY54hFyT0tQSX951VrvnHGmf-ncA2UhWVC-gasTPp-cLUKB7EZyK3AILMa7ywpr6gX7Pi537z0yYWHR5bNuRFN-3RBQsCF635Mi_RaXgvoVA3m0stS5fByTLyQLOIWHjSkzJRY1vb735b9LnSuw',
};

const CURRICULUM_ITEMS = [
  { icon: 'diversity_3', title: 'Social and Emotional', description: 'Building confidence, empathy, and strong interpersonal connections through collaborative play.' },
  { icon: 'fitness_center', title: 'Physical Development', description: 'Gross and fine motor skill activities designed for active bodies and curious hands.' },
  { icon: 'forum', title: 'Language Development', description: 'Fostering communication, vocabulary, and early literacy through storytelling and song.' },
  { icon: 'science', title: 'Science', description: 'Sparking curiosity about the natural world through hands-on experiments and observation.' },
  { icon: 'calculate', title: 'Mathematics', description: 'Introducing logic, patterns, and counting through tactile and visual learning tools.' },
  { icon: 'palette', title: 'Creative Arts', description: 'Encouraging self-expression through painting, music, and dramatic roleplay.' },
];

const EXPECTATIONS = [
  { icon: 'favorite', title: 'Tender Loving Care', description: 'A warm, home-like feeling where every child feels cherished.' },
  { icon: 'restaurant', title: 'Fresh Homemade Meals', description: 'Nutritious, kid-friendly food prepared daily with care.' },
  { icon: 'add_reaction', title: 'Positive Reinforcement', description: 'Encouraging confidence through praise and guidance.' },
  { icon: 'smoke_free', title: 'Safe Environment', description: 'Strictly non-smoking and sanitized facility for health.' },
];

const REVIEWS = [
  { quote: 'My daughter has grown so much in her social skills. The teachers are truly dedicated to each child\'s happiness.', name: 'Reema Patel', role: 'Happy Parent', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnOFi0jRKJeVVD7Yg9Dm_ZBfIsV7vSvMkGBiBOFT82uXJ1F45Va842Pm1yPyXmZay90dfRgmiZO4nKR7a6yswsIeFpM4nRUFjEklyXGsKxBrTonpNzHMbf_a_xEwnypLSTJEJWH1MpyrQ9y4XgRyAwV3DwE9rPjvWrOfD4dTj1gLSYKyi3VCZa2mO-ULY9HYD6Xu-skpZbCkpwwemyitmo2oa8SXdL8khTL9xzcV_svc84sM3Wljsciw' },
  { quote: 'Finding a place that offers both academic structure and genuine warmth was hard until we found Laugh and Learn.', name: 'Raksha Subramanyam', role: 'Happy Parent', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxV-UE5BlMlmVHMm5gV7o6eQyykzpsYHT6KJ75lRTeExXNqE2S5VYS61AfDOb7CSlFcRXEvicFAe5_6g2l4zGVoWcAVTXsAlRQWHGL1uDq7ouYPUpVschF8pAIk_sP_Ke_J9dLUMNWmSyNKTrwygv7r596fSoL5gm9szJkOOsLaw8Zc1Q9p1cZ5psmsgacoDyLpLUnV1utfPmZXUgQv2Bv5NoXPGZGmzTP1v9ItEaaspqj1NTNN0xxhQ' },
  { quote: 'The homemade meals are a game-changer! Knowing my son eats healthy every day gives me such peace of mind.', name: 'Kakarla Jayasree', role: 'Happy Parent', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMOY8LTB6kSTdJPxLNRtD_Y5FDR-JkbAvDg8Qzr1A6LRQg8eja2zTwZ3bYM7is8ZKoWchJyIREEXjw70MY_4h0fms-BZQnqZ6cGSHz64zggZP7dVw0xsCay0swWwhAAfWnlNSzxShN9fiBWG9kX_-5uLmG51pARjYhMSt16HxvnZpt4A28NhpNV1KsneP597lvONRVeNdG9wj7BjX2WrnzB0KlrGeQ7OYuV_seSeFwnX5m1-RrlzH9Ww' },
  { quote: 'The curriculum is so creative. My child comes home talking about science experiments and new art projects every day.', name: 'Rupal Deshmukh', role: 'Happy Parent', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzwsK9ZRe5noEUL9RWYYXOg3poHwH_cw4IKZ4cKMztt-q20QqjcMdRuFfGGJqZl4fLDgIDG50B82J3YpzxLxzHGGRzRJGDdOXLoeajOV7BySw1OkniGCbcMaaj4DO7howJySR-5KkppddXahP3NO86tyTbeKc0YBj9MRoKYI-wREQNYFq45-EBwMy9h8Iy2f-TGs5xCRtW4SUCmsUxKnjven8HImYMZe2DGzyBvPWHV_FCV1k0ITWDqA' },
  { quote: 'A truly non-smoking, clean, and safe environment. We couldn\'t ask for a better second home for our toddler.', name: 'Pooji Tumuluri', role: 'Happy Parent', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBf9enPw9rFCrVsfgXbTkJnIqP2u10z1cF7pZcFnURXnyeinVN4jgyb1szCNcr7buPNmf_xTsMjF5PA0ZwPbF6AaX5Z9gTe3p2A8DmcIbxMhzl9ky4Kk04qrUzmQppHDRBOpiWk6izR9JBVq8Rlg6voRdq71_HjxqC0WHNMka5jOvQzcXiFpIy5IzBsMXj15u8OE8HBxdj-V8CrHwXNLIETjEwXrrCFHOINXsMX5e3d-_T7w8XB4Rv75Q' },
];

/**
 * Exact copy of the Laugh and Learn Academy HTML demo.
 * Text and images are fixed — not replaced by portal school name.
 */
export function createLaughAndLearnPage() {
  const brand = LAUGH_AND_LEARN_BRAND;

  const theme = buildDefaultTheme({
    skin: 'laugh-and-learn',
    preserveBrand: true,
    primaryColor: '#006875',
    secondaryColor: '#7c5800',
    accentColor: '#feb700',
    tertiaryColor: '#a7391e',
    backgroundColor: '#f6f9ff',
    textColor: '#141d24',
    fontFamily: 'plus-jakarta',
  });

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    theme,
    seo: {
      title: 'Laugh and Learn Academy | Nurturing Early Education',
      description: 'Discover a nurturing environment where your child grows through exploration, discovery, and play-based learning in the heart of Frisco.',
    },
    blocks: [
      {
        id: id('hero'),
        type: BLOCK_TYPES.HERO,
        layout: 'split-playful',
        visible: true,
        style: { paddingY: 'xl' },
        content: {
          brandName: brand.name,
          badge: brand.badge,
          title: 'Learn skills and be confident while',
          titleHighlight: 'sharing a laugh',
          titleSuffix: 'with friends!',
          subtitle: 'Discover a nurturing environment where your child grows through exploration, discovery, and play-based learning in the heart of Frisco.',
          logoUrl: IMAGES.logo,
          heroImageUrl: IMAGES.hero,
          primaryButton: { label: 'Schedule a Visit', href: '/enrollment/kidzee-print-form' },
          secondaryButton: { label: 'Explore Programs', href: '#curriculum' },
          showPrimaryButton: true,
          showSecondaryButton: true,
          navLinks: [
            { label: 'Home', href: '#home' },
            { label: 'Gallery', href: '#curriculum' },
            { label: 'Reviews', href: '#reviews' },
          ],
        },
      },
      {
        id: id('features'),
        type: BLOCK_TYPES.FEATURES,
        layout: 'curriculum-grid',
        visible: true,
        style: { backgroundColor: '#ebf5ff', paddingY: 'xl' },
        content: {
          title: 'Theme based Pre-school/ Daycare Curriculum',
          subtitle: 'Our holistic approach ensures every facet of your child\'s growth is nurtured through meaningful engagement.',
          items: CURRICULUM_ITEMS.map((item) => ({ id: id('cur'), ...item })),
        },
      },
      {
        id: id('philosophy'),
        type: BLOCK_TYPES.CONTENT_SPLIT,
        layout: 'image-left',
        visible: true,
        style: { paddingY: 'xl' },
        content: {
          title: 'Our Philosophy',
          body: [
            'Each child is an individual who has his/her own rate of physical development and own pace of learning. We believe in honoring this unique journey through a balanced environment.',
            'Our program is designed to provide a safe, secure, and stimulating atmosphere where children are encouraged to explore their interests while building the social-emotional foundation they need for life.',
          ],
          quote: 'We don\'t just teach, we inspire a lifelong love for discovery.',
          imageUrl: IMAGES.philosophy,
        },
      },
      {
        id: id('bento'),
        type: BLOCK_TYPES.BENTO_PAIR,
        layout: 'default',
        visible: true,
        style: { backgroundColor: '#e6eff9', paddingY: 'xl' },
        content: {
          cards: [
            {
              id: id('vision'),
              icon: 'visibility',
              title: 'Our Vision',
              description: 'To empower children to think, explore, and discover their unique talents in a world of endless possibilities.',
              imageUrl: IMAGES.vision,
              variant: 'primary',
            },
            {
              id: id('mission'),
              icon: 'rocket_launch',
              title: 'Our Mission',
              description: 'Providing a nurturing early learning experience that builds a strong academic and social foundation for every student.',
              imageUrl: IMAGES.mission,
              variant: 'secondary',
            },
          ],
        },
      },
      {
        id: id('environment'),
        type: BLOCK_TYPES.FEATURE_PANEL,
        layout: 'split-card',
        visible: true,
        style: { paddingY: 'xl' },
        content: {
          title: 'The Learning Environment',
          description: 'Our center-based educational program offers a seamless blend of structured learning and spontaneous play. We prioritize spaces that inspire wonder and provide security.',
          imageUrl: IMAGES.environment,
          highlights: [
            { icon: 'deck', title: 'Indoor Spaces', description: 'Spacious, air-purified rooms with designated discovery zones.' },
            { icon: 'nature_people', title: 'Outdoor Play', description: 'Secure, vibrant areas for sun-safe physical activities.' },
          ],
        },
      },
      {
        id: id('expectations'),
        type: BLOCK_TYPES.HIGHLIGHTS,
        layout: 'dark-grid',
        visible: true,
        style: { paddingY: 'xl' },
        content: {
          title: 'What To Expect From Us',
          subtitle: 'Our commitment to excellence in every detail.',
          items: EXPECTATIONS.map((item) => ({ id: id('exp'), ...item })),
        },
      },
      {
        id: id('reviews'),
        type: BLOCK_TYPES.TESTIMONIALS,
        layout: 'grid',
        visible: true,
        style: { backgroundColor: 'rgba(218, 227, 238, 0.3)', paddingY: 'xl' },
        content: {
          title: 'What Our Parents Say',
          rating: 5,
          items: REVIEWS.map((item) => ({ id: id('rev'), ...item })),
        },
      },
      {
        id: id('footer'),
        type: BLOCK_TYPES.FOOTER,
        layout: 'rich-contact',
        visible: true,
        style: {},
        content: {
          compact: false,
          brandName: brand.name,
          tagline: 'Nurturing the leaders of tomorrow through play, exploration, and laughter in Frisco, TX.',
          address: brand.city,
          email: brand.email,
          phone: brand.phone,
          copyrightYear: brand.copyrightYear,
          badges: ['LICENSED DAYCARE', 'CPR CERTIFIED'],
          socialLinks: [
            { icon: 'face_nod', href: '#' },
            { icon: 'camera_indoor', href: '#' },
          ],
          links: [
            { label: 'Privacy Policy', href: '#' },
            { label: 'Terms of Service', href: '#' },
            { label: 'Curriculum', href: '#curriculum' },
          ],
        },
      },
    ],
  };
}

export const LAUGH_AND_LEARN_TEMPLATE_META = {
  id: 'laugh-and-learn-academy',
  name: 'Laugh & Learn Academy',
  description: 'Exact preschool demo — same images, text, and layout as Laugh and Learn Academy',
  thumbnailUrl: IMAGES.hero,
  category: 'preschool',
};
