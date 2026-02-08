import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CredentialsCard } from './CredentialsCard';

describe('CredentialsCard', () => {
  const mockOnUpdateUsername = vi.fn();
  const mockOnUpdatePassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display (AC1)', () => {
    it('should display username in clear text', () => {
      render(
        <CredentialsCard
          username="testuser"
          password="testpass123"
          onUpdateUsername={mockOnUpdateUsername}
          onUpdatePassword={mockOnUpdatePassword}
        />
      );

      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should display password masked by default', () => {
      render(
        <CredentialsCard
          username="testuser"
          password="testpass123"
          onUpdateUsername={mockOnUpdateUsername}
          onUpdatePassword={mockOnUpdatePassword}
        />
      );

      expect(screen.getByText('••••••••')).toBeInTheDocument();
      expect(screen.queryByText('testpass123')).not.toBeInTheDocument();
    });
  });

  describe('Toggle Visibility (AC2)', () => {
    it('should toggle password visibility when eye icon is clicked', async () => {
      render(
        <CredentialsCard
          username="testuser"
          password="testpass123"
          onUpdateUsername={mockOnUpdateUsername}
          onUpdatePassword={mockOnUpdatePassword}
        />
      );

      const eyeButton = screen.getByRole('button', { name: /afficher le mot de passe/i });
      
      // Initially masked
      expect(screen.getByText('••••••••')).toBeInTheDocument();
      
      // Click to show
      fireEvent.click(eyeButton);
      await waitFor(() => {
        expect(screen.getByText('testpass123')).toBeInTheDocument();
      });
      
      // Click to hide again
      fireEvent.click(eyeButton);
      await waitFor(() => {
        expect(screen.getByText('••••••••')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Username (AC3)', () => {
    it('should show edit button for username', () => {
      render(
        <CredentialsCard
          username="testuser"
          password="testpass123"
          onUpdateUsername={mockOnUpdateUsername}
          onUpdatePassword={mockOnUpdatePassword}
        />
      );

      const editButtons = screen.getAllByRole('button', { name: /modifier/i });
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it('should call onUpdateUsername when username edit is triggered', async () => {
      render(
        <CredentialsCard
          username="testuser"
          password="testpass123"
          onUpdateUsername={mockOnUpdateUsername}
          onUpdatePassword={mockOnUpdatePassword}
        />
      );

      const editButtons = screen.getAllByRole('button', { name: /modifier/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(mockOnUpdateUsername).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Password (AC4)', () => {
    it('should show edit button for password', () => {
      render(
        <CredentialsCard
          username="testuser"
          password="testpass123"
          onUpdateUsername={mockOnUpdateUsername}
          onUpdatePassword={mockOnUpdatePassword}
        />
      );

      const editButtons = screen.getAllByRole('button', { name: /modifier/i });
      expect(editButtons.length).toBe(2);
    });

    it('should call onUpdatePassword when password edit is triggered', async () => {
      render(
        <CredentialsCard
          username="testuser"
          password="testpass123"
          onUpdateUsername={mockOnUpdateUsername}
          onUpdatePassword={mockOnUpdatePassword}
        />
      );

      const editButtons = screen.getAllByRole('button', { name: /modifier/i });
      fireEvent.click(editButtons[1]);

      await waitFor(() => {
        expect(mockOnUpdatePassword).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty username gracefully', () => {
      render(
        <CredentialsCard
          username=""
          password="testpass123"
          onUpdateUsername={mockOnUpdateUsername}
          onUpdatePassword={mockOnUpdatePassword}
        />
      );

      expect(screen.getByText('Non configuré')).toBeInTheDocument();
    });

    it('should handle empty password gracefully', () => {
      render(
        <CredentialsCard
          username="testuser"
          password=""
          onUpdateUsername={mockOnUpdateUsername}
          onUpdatePassword={mockOnUpdatePassword}
        />
      );

      expect(screen.getByText('Non configuré')).toBeInTheDocument();
    });
  });
});
