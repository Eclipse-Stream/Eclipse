// SunshineMissingDialog.tsx - Dialog affiché quand Sunshine est manquant (Story 10.2)
// Propose la réinstallation automatique ou le mode dégradé

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../common/ui/dialog';
import { Button } from '../../common/ui/button';

export type SunshineMissingState = 'missing' | 'reinstalling' | 'success' | 'error';

export interface SunshineMissingDialogProps {
  isOpen: boolean;
  missingFiles?: string[];
  onReinstall: () => Promise<{ success: boolean; error?: string }>;
  onIgnore: () => void;
  onSuccess: () => void;
}

export function SunshineMissingDialog({
  isOpen,
  missingFiles,
  onReinstall,
  onIgnore,
  onSuccess,
}: SunshineMissingDialogProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<SunshineMissingState>('missing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleReinstall = async () => {
    setState('reinstalling');
    setErrorMessage('');

    try {
      const result = await onReinstall();

      if (result.success) {
        setState('success');
        // Fermer après 1.5s et notifier le parent
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setState('error');
        setErrorMessage(result.error || t('dialogs.sunshineMissing.unknownError'));
      }
    } catch (error: any) {
      setState('error');
      setErrorMessage(error.message || t('dialogs.sunshineMissing.unexpectedError'));
    }
  };

  const handleRetry = () => {
    setState('missing');
    setErrorMessage('');
  };

  // Contenu selon l'état
  const renderContent = () => {
    switch (state) {
      case 'missing':
        return (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-amber-500" />
                </div>
                <DialogTitle className="text-text-primary">
                  {t('dialogs.sunshineMissing.title')}
                </DialogTitle>
              </div>
              <DialogDescription className="text-text-secondary text-[13px]">
                {t('dialogs.sunshineMissing.description')}
                {missingFiles && missingFiles.length > 0 && (
                  <span className="block mt-2 text-[12px] text-text-secondary/70">
                    {t('dialogs.sunshineMissing.missingFiles', { files: missingFiles.join(', ') })}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                onClick={onIgnore}
                className="flex-1"
              >
                {t('dialogs.sunshineMissing.ignore')}
              </Button>
              <Button
                variant="default"
                onClick={handleReinstall}
                className="flex-1 bg-corona hover:bg-corona/90 text-black font-medium"
              >
                <Download size={16} className="mr-2" />
                {t('dialogs.sunshineMissing.reinstall')}
              </Button>
            </DialogFooter>
          </>
        );

      case 'reinstalling':
        return (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-corona/20 flex items-center justify-center">
                  <Loader2 size={20} className="text-corona animate-spin" />
                </div>
                <DialogTitle className="text-text-primary">
                  {t('dialogs.sunshineMissing.reinstalling')}
                </DialogTitle>
              </div>
              <DialogDescription className="text-text-secondary text-[13px]">
                {t('dialogs.sunshineMissing.reinstallingDesc')}
              </DialogDescription>
            </DialogHeader>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-corona animate-pulse w-2/3 transition-all duration-300" />
              </div>
            </div>
          </>
        );

      case 'success':
        return (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-500" />
                </div>
                <DialogTitle className="text-text-primary">
                  {t('dialogs.sunshineMissing.success')}
                </DialogTitle>
              </div>
              <DialogDescription className="text-text-secondary text-[13px]">
                {t('dialogs.sunshineMissing.successDesc')}
              </DialogDescription>
            </DialogHeader>
          </>
        );

      case 'error':
        return (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle size={20} className="text-destructive" />
                </div>
                <DialogTitle className="text-text-primary">
                  {t('dialogs.sunshineMissing.errorTitle')}
                </DialogTitle>
              </div>
              <DialogDescription className="text-text-secondary text-[13px]">
                {errorMessage}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <p className="text-[12px] text-text-secondary">
                <strong className="text-text-primary">{t('dialogs.sunshineMissing.solution')}</strong> {t('dialogs.sunshineMissing.solutionText')}
              </p>
            </div>

            <DialogFooter className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                onClick={onIgnore}
                className="flex-1"
              >
                {t('dialogs.sunshineMissing.continueWithout')}
              </Button>
              <Button
                variant="default"
                onClick={handleRetry}
                className="flex-1"
              >
                {t('common.retry')}
              </Button>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="bg-eclipse-bg/95 backdrop-blur-xl border-white/10 max-w-md"
      >
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

export default SunshineMissingDialog;
