import { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../common/ui/dialog';
import { Input } from '../../common/ui/input';
import { Button } from '../../common/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface ChangePasswordDialogProps {
  open: boolean;
  onConfirm: (newPassword: string) => Promise<void> | void;
  onCancel: () => void;
}

export function ChangePasswordDialog({ open, onConfirm, onCancel }: ChangePasswordDialogProps) {
  const { t } = useTranslation();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError(t('dialogs.changePassword.enterPassword'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('dialogs.changePassword.mismatch'));
      return;
    }

    setLoading(true);
    try {
      await onConfirm(password);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || t('dialogs.changePassword.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setConfirmPassword('');
    setError(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950/95 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{t('dialogs.changePassword.title')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.changePassword.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor={passwordId} className="text-[12px] font-medium text-text-primary">
              {t('dialogs.changePassword.newPassword')}
            </label>
            <div className="relative">
              <Input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                placeholder={t('dialogs.changePassword.newPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor={confirmPasswordId} className="text-[12px] font-medium text-text-primary">
              {t('dialogs.changePassword.confirmPassword')}
            </label>
            <div className="relative">
              <Input
                id={confirmPasswordId}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('dialogs.changePassword.confirmPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
