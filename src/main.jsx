import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AppProviders from './providers/AppProviders.jsx';
import './styles/global.css';
import './styles/premium.css';
import './styles/schoolbridge-theme.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>
);
