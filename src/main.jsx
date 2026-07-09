import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import App from './App.jsx';
import AppProviders from './providers/AppProviders.jsx';
import { AppWithProviders } from './providers/AppWithProviders.jsx';
import './styles/global.css';
import './styles/theme.css';
import './styles/globals.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/responsive.css';
import './styles/toggle-switch.css';
import './styles/premium.css';
import './styles/kidsactivites-theme.css';
import './styles/login-portal.css';
import './styles/editorial.css';
import './styles/public-pages.css';
import './styles/timeline.css';
import { applyPortalTheme } from './utils/themeUtils.js';
import { DEFAULT_PORTAL_CONFIG } from './data/defaultPortalConfig.js';
import { isApiEnabled } from './services/api/config.js';
import { clearMockStorage } from './services/api/clearMockStorage.js';

applyPortalTheme(DEFAULT_PORTAL_CONFIG.theme, DEFAULT_PORTAL_CONFIG.enrollmentTheme);

if (isApiEnabled()) {
  clearMockStorage();
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <AppWithProviders>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AppWithProviders>
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>
);
