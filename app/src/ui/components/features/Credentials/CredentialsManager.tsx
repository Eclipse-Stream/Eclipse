import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CredentialsCard } from './CredentialsCard';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { ChangeUsernameDialog } from './ChangeUsernameDialog';
import { credentialService } from '@application/services/credential-service';
import { useAppStore } from '@application/stores';

interface CredentialsManagerProps {
  username: string;
  password: string;
  onCredentialsUpdated?: () => void;
}

export function CredentialsManager({ username, password, onCredentialsUpdated }: CredentialsManagerProps) {
  const { t } = useTranslation();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const { checkCredentials, fetchSunshineStatus } = useAppStore();

  const handleUpdateUsername = async (newUsername: string) => {
    try {
      const currentCreds = await credentialService.getCredentials();
      if (!currentCreds) {
        throw new Error('No credentials found');
      }

      // Step 1: Change credentials on Sunshine using /api/password
      // Requires current credentials for auth + new credentials to set
      const result = await window.electronAPI.sunshine.changeCredentials({
        currentUsername: currentCreds.username,
        currentPassword: currentCreds.password,
        newUsername: newUsername,
        newPassword: currentCreds.password, // Password stays the same
      });

      if (!result.success) {
        throw new Error(result.error || t('errors.sunshine.updateFailed'));
      }

      // Step 2: Save credentials locally (after Sunshine confirmed the change)
      await credentialService.saveCredentials(newUsername, currentCreds.password);

      // Step 3: Update UI state
      await checkCredentials();
      await fetchSunshineStatus();
      onCredentialsUpdated?.();

      setIsUsernameDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to update username:', error);
      throw error;
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    try {
      const currentCreds = await credentialService.getCredentials();
      if (!currentCreds) {
        throw new Error('No credentials found');
      }

      // Step 1: Change credentials on Sunshine using /api/password
      // Requires current credentials for auth + new credentials to set
      const result = await window.electronAPI.sunshine.changeCredentials({
        currentUsername: currentCreds.username,
        currentPassword: currentCreds.password,
        newUsername: currentCreds.username, // Username stays the same
        newPassword: newPassword,
      });

      if (!result.success) {
        throw new Error(result.error || t('errors.sunshine.updateFailed'));
      }

      // Step 2: Save credentials locally (after Sunshine confirmed the change)
      await credentialService.saveCredentials(currentCreds.username, newPassword);

      // Step 3: Update UI state
      await checkCredentials();
      await fetchSunshineStatus();
      onCredentialsUpdated?.();

      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to update password:', error);
      throw error;
    }
  };

  return (
    <>
      <CredentialsCard
        username={username}
        password={password}
        onUpdateUsername={() => setIsUsernameDialogOpen(true)}
        onUpdatePassword={() => setIsPasswordDialogOpen(true)}
      />

      <ChangeUsernameDialog
        open={isUsernameDialogOpen}
        currentUsername={username}
        onConfirm={handleUpdateUsername}
        onCancel={() => setIsUsernameDialogOpen(false)}
      />

      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onConfirm={handleUpdatePassword}
        onCancel={() => setIsPasswordDialogOpen(false)}
      />
    </>
  );
}
