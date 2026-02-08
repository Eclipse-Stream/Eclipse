/**
 * Tray Panel Entry Point - Story 9.2
 * Separate React entry point for the glassmorphism tray panel
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n'; // Initialize i18n before TrayPanel renders
import { TrayPanel } from './ui/components/features/TrayPanel/TrayPanel';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TrayPanel />
  </React.StrictMode>
);
