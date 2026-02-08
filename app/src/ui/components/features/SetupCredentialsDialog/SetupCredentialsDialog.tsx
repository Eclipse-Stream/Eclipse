import { useState, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../common/ui/dialog';
import { Input } from '../../common/ui/input';
import { Button } from '../../common/ui/button';
import { useAppStore } from '@application/stores';
import { credentialService } from '@application/services/credential-service';
import { SunshineStatus } from '@domain/types';

export function SetupCredentialsDialog() {
  const { t } = useTranslation();
  const { hasCredentials, sunshineStatus, checkCredentials, fetchSunshineStatus, clearCredentials } = useAppStore();
  const usernameId = useId();
  const passwordId = useId();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReconnectMode, setIsReconnectMode] = useState(false);

  // Detect credential desync: we have local credentials but Sunshine says AUTH_REQUIRED
  const isCredentialDesync = hasCredentials && sunshineStatus === SunshineStatus.AUTH_REQUIRED;

  // Show dialog if: no credentials OR credentials are desync'd and user hasn't dismissed
  const isOpen = !hasCredentials || (isCredentialDesync && isReconnectMode);

  // Auto-trigger reconnect mode when desync is detected
  useEffect(() => {
    if (isCredentialDesync && !isReconnectMode) {
      setIsReconnectMode(true);
    }
  }, [isCredentialDesync]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t('dialogs.setupCredentials.requiredFields'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // LOGIQUE SIMPLE:
      // - Si on n'a PAS de credentials dans AppData (!hasCredentials) → FIRST TIME SETUP
      //   On crée les credentials dans Sunshine ET on les sauvegarde dans AppData
      // - Si on A des credentials dans AppData mais Sunshine dit AUTH_REQUIRED → RECONNECT
      //   On teste les credentials contre Sunshine existant
      //
      // Le dialog s'ouvre si: !hasCredentials OU (hasCredentials && isCredentialDesync)
      // Donc: !hasCredentials = FIRST TIME, isCredentialDesync = RECONNECT

      const isFirstTimeSetup = !hasCredentials;

      console.log(`[SetupCredentials] hasCredentials: ${hasCredentials}, isCredentialDesync: ${isCredentialDesync}, isFirstTimeSetup: ${isFirstTimeSetup}`);

      if (isFirstTimeSetup) {
        // FIRST TIME: Set credentials via API POST
        // Peu importe si Sunshine a déjà un credentials.json, on le remplace avec les nouveaux
        console.log('[SetupCredentials] First time setup - setting credentials via API');
        const setResult = await window.electronAPI.sunshine.setInitialCredentials({ username, password });

        if (!setResult.success) {
          setError(setResult.error || t('dialogs.setupCredentials.connectError'));
          setLoading(false);
          return;
        }

        // Save credentials securely after successful setup
        await credentialService.saveCredentials(username, password);
      } else {
        // RECONNECT: Test credentials against existing Sunshine config
        // On a des credentials dans AppData mais Sunshine dit AUTH_REQUIRED
        console.log('[SetupCredentials] Reconnect mode - testing credentials');
        const testResult = await window.electronAPI.sunshine.testCredentials({ username, password });

        if (!testResult.success) {
          setError(t('dialogs.setupCredentials.invalidCredentials'));
          setLoading(false);
          return;
        }

        // Credentials are valid - save them securely
        await credentialService.saveCredentials(username, password);
      }

      // Refresh store state
      await checkCredentials();

      // If this was first time setup, start Sunshine and complete the setup
      if (isFirstTimeSetup) {
        console.log('[SetupCredentials] Starting Sunshine after initial credential setup...');
        const startResult = await window.electronAPI.sunshine.start();
        if (startResult.success) {
          console.log('[SetupCredentials] Sunshine started successfully');
          
          // Epic 11: Complete the rest of the setup (scripts, app, preset)
          console.log('[SetupCredentials] Completing Sunshine setup (scripts, app, preset)...');
          const setupResult = await window.electronAPI.sunshine.completeSetup();
          if (setupResult.success) {
            console.log('[SetupCredentials] Sunshine setup completed successfully!');
          } else {
            console.warn('[SetupCredentials] Setup completion warning:', setupResult.error);
          }
        } else {
          console.warn('[SetupCredentials] Failed to start Sunshine:', startResult.error);
        }
      }

      // Trigger Sunshine status refresh (which should now succeed with new creds)
      await fetchSunshineStatus();

      // Reset reconnect mode on success
      setIsReconnectMode(false);
      setUsername('');
      setPassword('');

    } catch (err: any) {
      console.error('Setup failed:', err);
      setError(err.message || t('dialogs.setupCredentials.connectError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsReconnectMode(false);
    setError(null);
    setUsername('');
    setPassword('');
  };

  // Different titles/descriptions for first setup vs reconnect
  const title = isCredentialDesync
    ? t('dialogs.setupCredentials.reconnectTitle')
    : t('dialogs.setupCredentials.title');
  const description = isCredentialDesync
    ? t('dialogs.setupCredentials.reconnectDescription')
    : t('dialogs.setupCredentials.description');

  return (
    <Dialog open={isOpen} onOpenChange={isCredentialDesync ? handleCancel : () => {}}>
      <DialogContent showCloseButton={isCredentialDesync} className="sm:max-w-[425px] bg-zinc-950/95 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor={usernameId} className="text-[12px] font-medium text-text-primary">
              {t('dashboard.credentials.username')}
            </label>
            <Input
              id={usernameId}
              placeholder={t('dashboard.credentials.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor={passwordId} className="text-[12px] font-medium text-text-primary">
              {t('dashboard.credentials.password')}
            </label>
            <Input
              id={passwordId}
              type="password"
              placeholder={t('dashboard.credentials.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {loading ? t('dialogs.setupCredentials.connecting') : t('dialogs.setupCredentials.connect')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
