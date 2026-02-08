// LanguageDialog.tsx - Dialog pour choisir la langue au premier lancement
// Affiché uniquement si useSettingsStore.language === null

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../common/ui/dialog';
import { Button } from '../../common/ui/button';
import { useSettingsStore, type AppLanguage } from '@application/stores';
import { useTranslation } from 'react-i18next';

interface LanguageDialogProps {
  open: boolean;
  onLanguageSelected: (language: AppLanguage) => void;
}

export function LanguageDialog({ open, onLanguageSelected }: LanguageDialogProps) {
  const { i18n } = useTranslation();
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const handleSelectLanguage = (language: AppLanguage) => {
    // Sauvegarder dans le store (persist)
    setLanguage(language);
    // Changer la langue de i18n immédiatement
    i18n.changeLanguage(language);
    // Notifier le parent
    onLanguageSelected(language);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[400px] bg-zinc-950/95 border-zinc-800"
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">
            Choose your language / Choisissez votre langue
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            Select the language for Eclipse / Sélectionnez la langue d'Eclipse
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-6">
          <Button
            onClick={() => handleSelectLanguage('en')}
            variant="outline"
            className="h-14 text-lg font-medium hover:bg-zinc-800 hover:border-primary transition-colors"
          >
            <span className="mr-3 text-2xl">🇬🇧</span>
            English
          </Button>

          <Button
            onClick={() => handleSelectLanguage('fr')}
            variant="outline"
            className="h-14 text-lg font-medium hover:bg-zinc-800 hover:border-primary transition-colors"
          >
            <span className="mr-3 text-2xl">🇫🇷</span>
            Français
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
