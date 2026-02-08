import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../common/ui/dialog';
import { Input } from '../../common/ui/input';
import { Button } from '../../common/ui/button';

interface ChangeUsernameDialogProps {
  open: boolean;
  currentUsername: string;
  onConfirm: (newUsername: string) => Promise<void> | void;
  onCancel: () => void;
}

export function ChangeUsernameDialog({ open, currentUsername, onConfirm, onCancel }: ChangeUsernameDialogProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(currentUsername);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username) {
      setError(t('dialogs.changeUsername.enterUsername'));
      return;
    }

    if (username === currentUsername) {
      setError(t('dialogs.changeUsername.sameUsername'));
      return;
    }

    setLoading(true);
    try {
      await onConfirm(username);
    } catch (err: any) {
      setError(err.message || t('dialogs.changeUsername.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setUsername(currentUsername);
    setError(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950/95 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{t('dialogs.changeUsername.title')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.changeUsername.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Input
              id="username"
              type="text"
              placeholder={t('dialogs.changeUsername.newUsername')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {loading ? t('common.updating') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
