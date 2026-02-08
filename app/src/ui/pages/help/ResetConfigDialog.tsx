// ResetConfigDialog.tsx - Story 10.3: Dialog de confirmation de réinitialisation
// AC2: Liste des éléments impactés, message rassurant sur credentials
// AC3: Annulation
// AC4: Exécution avec indicateur de chargement
// AC5: Feedback de succès
// AC6: Gestion d'erreur

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, AlertTriangle, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/common/ui/dialog";
import { Button } from "../../components/common/ui/button";

import { useDisplayStore } from "@application/stores/useDisplayStore";
import { useSunshinePresetStore } from "@application/stores/useSunshinePresetStore";

interface ResetConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetConfigDialog({ isOpen, onClose }: ResetConfigDialogProps) {
  const { t } = useTranslation();
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store pour reset Sunshine presets
  const resetSunshinePresetStore = useSunshinePresetStore((state) => state.reset);

  const handleReset = async () => {
    setIsResetting(true);
    setError(null);

    try {
      // 1. Reset côté main process (Sunshine config)
      const result = await window.electronAPI.config.reset();

      if (!result.success) {
        setError(result.error || t('toasts.error.generic'));
        return;
      }

      // 2. Reset côté renderer (localStorage stores)
      // Presets écran (useDisplayStore) - appel direct sur le store
      useDisplayStore.setState({ presets: [], activePresetId: null });

      // Presets Sunshine (useSunshinePresetStore) - garde Eclipse Default
      resetSunshinePresetStore();

      // AC5: Toast de succès
      toast.success(t('resetConfig.successTitle'), {
        description: t('resetConfig.successDesc'),
      });

      // Fermer le dialog
      onClose();
    } catch (err) {
      // AC6: Gestion d'erreur
      const errorMessage = err instanceof Error ? err.message : t('toasts.error.generic');
      setError(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    if (!isResetting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-eclipse-bg/95 backdrop-blur-xl border-white/10 max-w-md"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <RotateCcw size={20} className="text-amber-400" />
            </div>
            <DialogTitle className="text-text-primary">
              {t('resetConfig.title')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-text-secondary">
            {t('resetConfig.description')}
          </DialogDescription>
        </DialogHeader>

        {/* AC2: Liste des éléments impactés */}
        <div className="space-y-3 py-4">
          {/* Ce qui sera supprimé */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={14} />
              <span className="text-xs font-medium uppercase tracking-wider">
                {t('resetConfig.warningTitle')}
              </span>
            </div>
            <ul className="space-y-1.5 pl-5 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                {t('resetConfig.warningScreenPresets')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                {t('resetConfig.warningSunshineParams')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                {t('resetConfig.warningSunshinePresets')}
              </li>
            </ul>
          </div>

          {/* AC2: Message rassurant */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Shield size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-emerald-400/90">
              {t('resetConfig.reassurance')}
            </p>
          </div>

          {/* AC6: Message d'erreur */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-400/90">
                <p className="font-medium">{t('resetConfig.errorTitle')}</p>
                <p className="text-red-400/70 mt-1">{t(error)}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          {/* AC3: Bouton Annuler */}
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isResetting}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          {/* AC4: Bouton Réinitialiser avec état de chargement */}
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting}
            className="flex-1"
          >
            {isResetting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                {t('common.loading')}
              </>
            ) : (
              t('common.reset')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ResetConfigDialog;
