import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChangePasswordDialog } from './ChangePasswordDialog';

describe('ChangePasswordDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <ChangePasswordDialog
        open={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Modifier le mot de passe')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <ChangePasswordDialog
        open={false}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('Modifier le mot de passe')).not.toBeInTheDocument();
  });

  it('should have password and confirm password fields', () => {
    render(
      <ChangePasswordDialog
        open={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByPlaceholderText('Nouveau mot de passe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirmer le mot de passe')).toBeInTheDocument();
  });

  it('should show error when passwords do not match', async () => {
    render(
      <ChangePasswordDialog
        open={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    const confirmInput = screen.getByPlaceholderText('Confirmer le mot de passe');
    const submitButton = screen.getByRole('button', { name: /confirmer/i });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/les mots de passe ne correspondent pas/i)).toBeInTheDocument();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should show error when password is empty', async () => {
    render(
      <ChangePasswordDialog
        open={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /confirmer/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/veuillez entrer un mot de passe/i)).toBeInTheDocument();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should call onConfirm with new password when valid', async () => {
    render(
      <ChangePasswordDialog
        open={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    const confirmInput = screen.getByPlaceholderText('Confirmer le mot de passe');
    const submitButton = screen.getByRole('button', { name: /confirmer/i });

    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('newpassword123');
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ChangePasswordDialog
        open={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should show loading state when submitting', async () => {
    const slowConfirm = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <ChangePasswordDialog
        open={true}
        onConfirm={slowConfirm}
        onCancel={mockOnCancel}
      />
    );

    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    const confirmInput = screen.getByPlaceholderText('Confirmer le mot de passe');
    const submitButton = screen.getByRole('button', { name: /confirmer/i });

    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});
