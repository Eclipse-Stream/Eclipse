// HelpActionsSection.tsx - Boutons d'action (Story 10.1, AC6, AC7 + Story 10.3)
// Bouton "Ouvrir Sunshine avancé" avec gestion état offline
// Bouton "Réinitialiser la configuration" avec dialog de confirmation (Story 10.3)

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, RotateCcw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@application/stores';
import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/ui/button';
import { ResetConfigDialog } from './ResetConfigDialog';

const SUNSHINE_WEB_URL = 'https://localhost:47990';

export function HelpActionsSection() {
  const { t } = useTranslation();
  const sunshineStatus = useAppStore((state) => state.sunshineStatus);
  const [isStartingSunshine, setIsStartingSunshine] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleOpenSunshineAdvanced = () => {
    // AC7: Si Sunshine n'est pas en cours d'exécution
    if (sunshineStatus !== 'ONLINE') {
      toast.error(t('dashboard.sunshine.stopped'), {
        action: {
          label: t('common.start'),
          onClick: handleStartSunshine,
        },
      });
      return;
    }

    // Ouvrir l'interface web de Sunshine
    window.electronAPI.shell.openExternal(SUNSHINE_WEB_URL);
  };

  const handleStartSunshine = async () => {
    setIsStartingSunshine(true);
    try {
      const result = await window.electronAPI.sunshine.start();
      if (result.success) {
        toast.success(t('toasts.success.sunshineStarted'));
        // Refresh le status
        await useAppStore.getState().fetchSunshineStatus();
      } else {
        toast.error(t('toasts.error.serviceStart'), {
          description: result.error || t('toasts.error.generic'),
        });
      }
    } catch (error) {
      toast.error(t('common.error'), {
        description: error instanceof Error ? error.message : t('toasts.error.generic'),
      });
    } finally {
      setIsStartingSunshine(false);
    }
  };

  // Story 10.3: Ouvre le dialog de confirmation de reset
  const handleResetConfiguration = () => {
    setIsResetDialogOpen(true);
  };

  const isSunshineOnline = sunshineStatus === 'ONLINE';

  return (
    <GlassCard>
      <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-4">
        {t('help.actions.title')}
      </h2>

      <div className="space-y-3">
        {/* Bouton Ouvrir Sunshine avancé */}
        <div>
          <Button
            onClick={handleOpenSunshineAdvanced}
            className="w-full justify-between"
            variant={isSunshineOnline ? "default" : "secondary"}
          >
            <span className="flex items-center gap-2">
              <ExternalLink size={16} />
              {t('help.actions.openLogs')}
            </span>
            {!isSunshineOnline && (
              <AlertCircle size={14} className="text-amber-400" />
            )}
          </Button>

          {/* Message d'avertissement si Sunshine offline */}
          {!isSunshineOnline && (
            <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
              <p className="text-[11px] text-amber-400/90">
                {t('dashboard.sunshine.stopped')}
                <button
                  onClick={handleStartSunshine}
                  disabled={isStartingSunshine}
                  className="ml-1 underline hover:no-underline"
                >
                  {isStartingSunshine ? t('toasts.info.sunshineStarting') : t('common.start')}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Bouton Réinitialiser la configuration */}
        <Button
          onClick={handleResetConfiguration}
          variant="destructive"
          className="w-full justify-start gap-2"
        >
          <RotateCcw size={16} />
          {t('help.actions.resetConfig')}
        </Button>

        <p className="text-[11px] text-text-secondary/60 px-1">
          {t('dialogs.confirm.resetMessage')}
        </p>
      </div>

      {/* Story 10.3: Dialog de confirmation de reset */}
      <ResetConfigDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
      />
    </GlassCard>
  );
}

export default HelpActionsSection;
