import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import AppProviders from './providers/AppProviders.jsx';
import { AppWithProviders } from './providers/AppWithProviders.jsx';
import './styles/global.css';
import './styles/premium.css';
import './styles/schoolbridge-theme.css';
import './styles/login-portal.css';
import { applyPortalTheme } from './utils/themeUtils.js';
import { DEFAULT_PORTAL_CONFIG } from './data/defaultPortalConfig.js';

applyPortalTheme(DEFAULT_PORTAL_CONFIG.theme, DEFAULT_PORTAL_CONFIG.enrollmentTheme);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <AppWithProviders>
          <App />
        </AppWithProviders>
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>
);
