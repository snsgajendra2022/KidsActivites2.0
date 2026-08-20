import { motion } from 'framer-motion';

export default function WelcomeBanner({ title, subtitle, badge, actions }) {
  return (
    <motion.div
      className="welcome-banner bento-span-12"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {badge && (
        <div
          className="premium-hero-badge"
          style={{
            marginBottom: 12,
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {badge}
        </div>
      )}
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {actions && <div className="welcome-banner-actions">{actions}</div>}
    </motion.div>
  );
}
