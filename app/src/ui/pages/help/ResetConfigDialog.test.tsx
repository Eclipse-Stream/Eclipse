// ResetConfigDialog.test.tsx - Story 10.3: Tests du dialog de reset
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ResetConfigDialog } from './ResetConfigDialog';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock stores
const mockReset = vi.fn();

vi.mock('@application/stores/useDisplayStore', () => {
  const setState = vi.fn();
  const hook = vi.fn(() => ({}));
  hook.setState = setState;
  return { useDisplayStore: hook };
});

vi.mock('@application/stores/useSunshinePresetStore', () => ({
  useSunshinePresetStore: vi.fn(() => mockReset),
}));

// Mock de l'API Electron
const mockConfigReset = vi.fn();

describe('ResetConfigDialog', () => {
  beforeEach(() => {
    // Setup window.electronAPI mock
    (window as any).electronAPI = {
      config: {
        reset: mockConfigReset,
      },
    };

    // Reset all mocks
    vi.clearAllMocks();
    mockConfigReset.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  describe('AC1: Affichage du dialog', () => {
    it('affiche le dialog quand isOpen est true', () => {
      render(<ResetConfigDialog isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('Réinitialiser la configuration')).toBeInTheDocument();
    });

    it("n'affiche pas le dialog quand isOpen est false", () => {
      render(<ResetConfigDialog isOpen={false} onClose={vi.fn()} />);

      expect(screen.queryByText('Réinitialiser la configuration')).not.toBeInTheDocument();
    });
  });

  describe('AC2: Contenu du dialog', () => {
    it('affiche la liste des éléments qui seront réinitialisés', () => {
      render(<ResetConfigDialog isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText(/presets d'écran personnalisés seront supprimés/i)).toBeInTheDocument();
      expect(screen.getByText(/paramètres Sunshine seront remis par défaut/i)).toBeInTheDocument();
      expect(screen.getByText(/presets Sunshine personnalisés seront supprimés/i)).toBeInTheDocument();
    });

    it('affiche le message rassurant sur les credentials', () => {
      render(<ResetConfigDialog isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText(/Vos identifiants seront conservés/i)).toBeInTheDocument();
    });

    it('affiche les boutons Annuler et Réinitialiser', () => {
      render(<ResetConfigDialog isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Réinitialiser$/i })).toBeInTheDocument();
    });
  });

  describe('AC3: Annulation', () => {
    it('appelle onClose quand le bouton Annuler est cliqué', async () => {
      const onClose = vi.fn();
      render(<ResetConfigDialog isOpen={true} onClose={onClose} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Annuler/i }));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC4: Exécution du reset', () => {
    it('appelle config.reset lors du reset', async () => {
      render(<ResetConfigDialog isOpen={true} onClose={vi.fn()} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Réinitialiser$/i }));
      });

      await waitFor(() => {
        expect(mockConfigReset).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('AC5: Feedback de succès', () => {
    it('ferme le dialog après un reset réussi', async () => {
      mockConfigReset.mockResolvedValue({ success: true });
      const onClose = vi.fn();

      render(<ResetConfigDialog isOpen={true} onClose={onClose} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Réinitialiser$/i }));
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe("AC6: Gestion d'erreur", () => {
    it("affiche un message d'erreur en cas d'échec", async () => {
      mockConfigReset.mockResolvedValue({
        success: false,
        error: 'Erreur de test',
      });

      render(<ResetConfigDialog isOpen={true} onClose={vi.fn()} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Réinitialiser$/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Erreur lors de la réinitialisation/i)).toBeInTheDocument();
        expect(screen.getByText(/Erreur de test/i)).toBeInTheDocument();
      });
    });

    it("ne ferme pas le dialog en cas d'erreur", async () => {
      mockConfigReset.mockResolvedValue({
        success: false,
        error: 'Une erreur technique',
      });
      const onClose = vi.fn();

      render(<ResetConfigDialog isOpen={true} onClose={onClose} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Réinitialiser$/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Une erreur technique/i)).toBeInTheDocument();
      });

      // Le dialog ne devrait pas être fermé
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
