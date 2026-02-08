// WelcomeDialog.tsx - Dialog de bienvenue affiché à la fin de l'onboarding
// Affiche un message de félicitations avant d'accéder à l'application

import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../common/ui/dialog';
import { Button } from '../../common/ui/button';
import { Rocket } from 'lucide-react';

interface WelcomeDialogProps {
  open: boolean;
  onContinue: () => void;
}

export function WelcomeDialog({ open, onContinue }: WelcomeDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[425px] bg-zinc-950/95 border-zinc-800"
      >
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">
            {t('dialogs.welcome.title')}
          </DialogTitle>
          <DialogDescription className="text-text-secondary text-base pt-2">
            {t('dialogs.welcome.description')}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button
            onClick={onContinue}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            {t('dialogs.welcome.letsGo')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
