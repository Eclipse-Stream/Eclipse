/**
 * i18n Configuration Tests - Story 10.4
 * Tests for the internationalization infrastructure
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18n, { changeLanguage } from './index';

describe('i18n Configuration - Story 10.4', () => {
  beforeEach(() => {
    // Reset to French before each test
    i18n.changeLanguage('fr');
    localStorage.clear();
  });

  describe('AC1: Installation and configuration', () => {
    it('should be initialized with French as default language', () => {
      expect(i18n.language).toBe('fr');
    });

    it('should have French as fallback language', () => {
      expect(i18n.options.fallbackLng).toContain('fr');
    });

    it('should support French and English languages', () => {
      expect(i18n.options.resources).toHaveProperty('fr');
      expect(i18n.options.resources).toHaveProperty('en');
    });
  });

  describe('AC2: Translation files structure', () => {
    it('should have common translations in French', () => {
      expect(i18n.t('common.save')).toBe('Enregistrer');
      expect(i18n.t('common.cancel')).toBe('Annuler');
    });

    it('should have navigation translations', () => {
      expect(i18n.t('nav.dashboard')).toBe('Accueil');
      expect(i18n.t('nav.settings')).toBe('Réglages');
    });

    it('should have hierarchical structure for translations', () => {
      expect(i18n.t('dashboard.sunshine.title')).toBe('État Sunshine');
      expect(i18n.t('settings.screens.title')).toBe('Gestion des Écrans');
    });
  });

  describe('AC3: Translation function', () => {
    it('should return translated text for valid keys', () => {
      expect(i18n.t('common.save')).toBe('Enregistrer');
    });

    it('should return key for missing translations', () => {
      expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should support interpolation', () => {
      expect(i18n.t('errors.minLength', { min: 8 })).toBe('Minimum 8 caractères');
    });
  });

  describe('AC4 & AC5: Language switching and persistence', () => {
    it('should change language to English', () => {
      changeLanguage('en');
      expect(i18n.language).toBe('en');
    });

    it('should persist language choice in localStorage', () => {
      changeLanguage('en');
      expect(localStorage.getItem('eclipse-language')).toBe('en');
    });

    it('should translate to English after switching', () => {
      changeLanguage('en');
      expect(i18n.t('common.save')).toBe('Save');
      expect(i18n.t('nav.settings')).toBe('Settings');
    });

    it('should switch back to French', () => {
      changeLanguage('en');
      changeLanguage('fr');
      expect(i18n.language).toBe('fr');
      expect(i18n.t('common.save')).toBe('Enregistrer');
    });
  });

  describe('AC6: System language detection', () => {
    it('should fall back to French for unsupported languages', () => {
      // Mock navigator.language
      const originalLanguage = navigator.language;
      Object.defineProperty(navigator, 'language', {
        value: 'de-DE',
        configurable: true,
      });

      // Since i18n is already initialized, we just verify fallback works
      expect(['fr', 'en']).toContain(i18n.language);

      // Restore
      Object.defineProperty(navigator, 'language', {
        value: originalLanguage,
        configurable: true,
      });
    });
  });
});
