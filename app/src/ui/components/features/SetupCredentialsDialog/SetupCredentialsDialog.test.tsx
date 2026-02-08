import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SetupCredentialsDialog } from './SetupCredentialsDialog';
import { useAppStore } from '@application/stores';
import { credentialService } from '@application/services/credential-service';

// Mock dependencies
vi.mock('@application/stores');
vi.mock('@application/services/credential-service');
vi.mock('../../common/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h1>{children}</h1>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

// Mock window.electronAPI
const mockTestCredentials = vi.fn();

describe('SetupCredentialsDialog', () => {
  const mockCheckCredentials = vi.fn();
  const mockFetchSunshineStatus = vi.fn();
  const mockClearCredentials = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockTestCredentials.mockResolvedValue({ success: true });
    
    // Setup window.electronAPI mock
    Object.defineProperty(window, 'electronAPI', {
      value: {
        sunshine: {
          testCredentials: mockTestCredentials,
        },
      },
      writable: true,
    });
    
    (useAppStore as any).mockReturnValue({
      hasCredentials: false,
      sunshineStatus: null,
      checkCredentials: mockCheckCredentials,
      fetchSunshineStatus: mockFetchSunshineStatus,
      clearCredentials: mockClearCredentials,
    });
  });

  it('should render when hasCredentials is false', () => {
    render(<SetupCredentialsDialog />);
    expect(screen.getByText('Connexion Sunshine')).toBeDefined();
    expect(screen.getByPlaceholderText('Identifiant')).toBeDefined();
    expect(screen.getByPlaceholderText('Mot de passe')).toBeDefined();
  });

  it('should not render when hasCredentials is true and status is ONLINE', () => {
    (useAppStore as any).mockReturnValue({
      hasCredentials: true,
      sunshineStatus: 'ONLINE',
      checkCredentials: mockCheckCredentials,
      fetchSunshineStatus: mockFetchSunshineStatus,
      clearCredentials: mockClearCredentials,
    });
    const { container } = render(<SetupCredentialsDialog />);
    expect(container.firstChild).toBeNull();
  });

  it('should show error when fields are empty', async () => {
    render(<SetupCredentialsDialog />);
    
    const submitBtn = screen.getByText('Se connecter');
    fireEvent.click(submitBtn);

    expect(screen.getByText('Veuillez entrer un identifiant et un mot de passe')).toBeDefined();
  });

  it('should call saveCredentials and update store on submit', async () => {
    render(<SetupCredentialsDialog />);
    
    fireEvent.change(screen.getByPlaceholderText('Identifiant'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), { target: { value: 'secret' } });
    
    const submitBtn = screen.getByText('Se connecter');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(credentialService.saveCredentials).toHaveBeenCalledWith('admin', 'secret');
      expect(mockCheckCredentials).toHaveBeenCalled();
      expect(mockFetchSunshineStatus).toHaveBeenCalled();
    });
  });

  it('should show error when credentials are invalid', async () => {
    mockTestCredentials.mockResolvedValue({ success: false, error: 'Identifiants incorrects' });

    render(<SetupCredentialsDialog />);
    
    fireEvent.change(screen.getByPlaceholderText('Identifiant'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), { target: { value: 'wrongpassword' } });
    
    const submitBtn = screen.getByText('Se connecter');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // The error message should contain information about connection failure
      expect(screen.getByText(/Connexion refusée/)).toBeDefined();
    });
    
    // Credentials should NOT be saved if test failed
    expect(credentialService.saveCredentials).not.toHaveBeenCalled();
  });
});
