import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './app-store';
import type { Page } from '@domain/types';

describe('AppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ currentPage: 'dashboard' });
  });

  describe('Initial State', () => {
    it('should have dashboard as initial page', () => {
      const { currentPage } = useAppStore.getState();
      expect(currentPage).toBe('dashboard');
    });

    it('should expose setPage action', () => {
      const { setPage } = useAppStore.getState();
      expect(setPage).toBeDefined();
      expect(typeof setPage).toBe('function');
    });
  });

  describe('setPage Action', () => {
    it('should change page to settings when setPage is called', () => {
      const { setPage } = useAppStore.getState();
      setPage('settings');
      expect(useAppStore.getState().currentPage).toBe('settings');
    });

    it('should change page to applications when setPage is called', () => {
      const { setPage } = useAppStore.getState();
      setPage('applications');
      expect(useAppStore.getState().currentPage).toBe('applications');
    });

    it('should change page to help when setPage is called', () => {
      const { setPage } = useAppStore.getState();
      setPage('help');
      expect(useAppStore.getState().currentPage).toBe('help');
    });

    it('should change page to dashboard when setPage is called', () => {
      useAppStore.setState({ currentPage: 'settings' });
      const { setPage } = useAppStore.getState();
      setPage('dashboard');
      expect(useAppStore.getState().currentPage).toBe('dashboard');
    });
  });

  describe('Page Type Validation', () => {
    it('should accept all valid Page values', () => {
      const validPages: Page[] = ['dashboard', 'settings', 'applications', 'help'];
      const { setPage } = useAppStore.getState();

      validPages.forEach((page) => {
        setPage(page);
        expect(useAppStore.getState().currentPage).toBe(page);
      });
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across multiple calls', () => {
      const { setPage } = useAppStore.getState();
      
      setPage('settings');
      expect(useAppStore.getState().currentPage).toBe('settings');
      
      setPage('applications');
      expect(useAppStore.getState().currentPage).toBe('applications');
      
      setPage('dashboard');
      expect(useAppStore.getState().currentPage).toBe('dashboard');
    });
  });

  describe('Store Structure', () => {
    it('should have correct state shape', () => {
      const state = useAppStore.getState();
      expect(state).toHaveProperty('currentPage');
      expect(state).toHaveProperty('setPage');
    });

    it('should only have expected properties', () => {
      const state = useAppStore.getState();
      const keys = Object.keys(state);
      expect(keys).toContain('currentPage');
      expect(keys).toContain('setPage');
      expect(keys).toContain('sunshineStatus');
      expect(keys).toContain('setSunshineStatus');
      expect(keys).toContain('fetchSunshineStatus');
      expect(keys).toContain('hasCredentials');
      expect(keys).toContain('username');
      expect(keys).toContain('needsReauth');
      expect(keys).toContain('checkCredentials');
      expect(keys).toContain('clearCredentials');
      // Story 10.2: Sunshine Health properties
      expect(keys).toContain('sunshineInstalled');
      expect(keys).toContain('sunshineHealthResult');
      expect(keys).toContain('setSunshineInstalled');
      expect(keys).toContain('checkSunshineHealth');
      expect(keys.length).toBe(14);
    });
  });
});
