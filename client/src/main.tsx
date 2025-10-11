import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import './index.css';
import AppProviders from './providers/app-providers';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
