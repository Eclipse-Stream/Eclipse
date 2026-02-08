import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n'; // Initialize i18n before App renders
import App from './ui/App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
