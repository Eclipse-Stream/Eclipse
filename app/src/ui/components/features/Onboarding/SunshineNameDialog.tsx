// SunshineNameDialog.tsx - Dialog pour choisir le nom Sunshine au premier lancement
// Affiché uniquement si useSettingsStore.sunshineName === null ET nom actuel est par défaut

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../common/ui/dialog';
import { Input } from '../../common/ui/input';
import { Button } from '../../common/ui/button';
import { useSettingsStore } from '@application/stores';
import { useClientStore } from '@application/stores';
import { Loader2 } from 'lucide-react';

interface SunshineNameDialogProps {
  open: boolean;
  onNameSet: () => void;
}

export function SunshineNameDialog({ open, onNameSet }: SunshineNameDialogProps) {
  const { t } = useTranslation();
  const setSunshineName = useSettingsStore((state) => state.setSunshineName);
  const { setServerName } = useClientStore();

  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger le hostname au montage pour pré-remplir
  useEffect(() => {
    if (!open) return;

    const init = async () => {
      setInitializing(true);
      try {
        // Récupérer le hostname du système
        const systemHostname = await window.electronAPI.system.getHostname();
        setHostname(systemHostname);
      } catch (err) {
        console.error('[SunshineNameDialog] Failed to get hostname:', err);
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('dashboard.computerName.emptyName'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Sauvegarder dans sunshine.conf via l'API existante
      const result = await setServerName(trimmed);

      if (!result.success) {
        setError(result.error || t('dashboard.computerName.saveError'));
        setLoading(false);
        return;
      }

      // 2. Sauvegarder dans le store Zustand (persist)
      setSunshineName(trimmed);

      // 3. Notifier le parent
      onNameSet();
    } catch (err: any) {
      console.error('[SunshineNameDialog] Failed to set name:', err);
      setError(err.message || t('dashboard.computerName.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[425px] bg-zinc-950/95 border-zinc-800"
      >
        <DialogHeader>
          <DialogTitle>{t('dialogs.sunshineNameSetup.title')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.sunshineNameSetup.description')}
          </DialogDescription>
        </DialogHeader>

        {initializing ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoFocus
                placeholder={hostname || t('dialogs.sunshineNameSetup.placeholder')}
                className="text-center text-lg"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive font-medium text-center">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('dialogs.sunshineNameSetup.continue')
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
