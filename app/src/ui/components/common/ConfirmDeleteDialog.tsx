// ConfirmDeleteDialog.tsx - Modal de confirmation de suppression
// Remplace le window.confirm() natif par une UI cohérente avec l'app

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation();
  
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-eclipse-bg/95 backdrop-blur-xl border-white/10 max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="text-text-primary">{title}</DialogTitle>
          <DialogDescription className="text-text-secondary">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {cancelText || t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="flex-1"
          >
            {confirmText || t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
