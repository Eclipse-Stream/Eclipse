// PairingDialog.tsx - Modal d'appairage via code PIN (Story 6.2)
// Demande le nom de l'appareil + le code PIN

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle, AlertCircle, Monitor } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/components/common/ui/dialog';
import { Button } from '@ui/components/common/ui/button';
import { useClientStore } from '@application/stores';

interface PairingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PairingDialog({ isOpen, onClose }: PairingDialogProps) {
  const { t } = useTranslation();
  const { pairClient } = useClientStore();

  const [deviceName, setDeviceName] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Focus sur le champ nom à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
      // Reset state
      setDeviceName('');
      setPin(['', '', '', '']);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handlePinChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);

    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(null);

    // Auto-focus sur le prochain input
    if (digit && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async () => {
    const fullPin = pin.join('');

    // Validation nom
    if (!deviceName.trim()) {
      setError(t('dialogs.pairing.nameRequired'));
      nameInputRef.current?.focus();
      return;
    }

    // Validation PIN
    if (fullPin.length !== 4) {
      setError(t('dialogs.pairing.pinRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await pairClient(fullPin, deviceName.trim());

    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(result.error || t('errors.invalidPin'));
      setPin(['', '', '', '']);
      pinInputRefs[0].current?.focus();
    }
  };

  const isPinComplete = pin.every((d) => d !== '');
  const canSubmit = deviceName.trim() && isPinComplete;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="bg-eclipse-bg/95 backdrop-blur-xl border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-text-primary flex items-center gap-2">
            <Monitor size={20} className="text-blue-400" />
            {t('dialogs.pairing.title')}
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            {t('dialogs.pairing.description')}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle className="text-green-400" size={48} />
            <p className="text-[14px] text-green-400 font-medium">
              {t('dialogs.pairing.deviceAdded', { name: deviceName })}
            </p>
          </div>
        ) : (
          <>
            {/* Nom de l'appareil */}
            <div className="space-y-2">
              <label className="text-[12px] text-text-tertiary uppercase tracking-wide">
                {t('dialogs.pairing.deviceName')}
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={deviceName}
                onChange={(e) => {
                  setDeviceName(e.target.value);
                  setError(null);
                }}
                placeholder={t('dialogs.pairing.namePlaceholder')}
                disabled={isLoading}
                className="w-full px-3 py-2 text-[14px] bg-white/5 border border-white/20 rounded-lg text-text-primary placeholder:text-text-tertiary focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              />
            </div>

            {/* Code PIN */}
            <div className="space-y-2 pt-2">
              <label className="text-[12px] text-text-tertiary uppercase tracking-wide">
                {t('dialogs.pairing.pinLabel')}
              </label>
              <div className="flex justify-center gap-2">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinInputRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    disabled={isLoading}
                    className="w-12 h-12 text-center text-xl font-mono bg-white/5 border border-white/20 rounded-lg text-text-primary focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                  />
                ))}
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-[13px] bg-red-500/10 rounded-lg px-3 py-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="mt-2">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="default"
                onClick={handleSubmit}
                disabled={!canSubmit || isLoading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    {t('dialogs.pairing.pairing')}
                  </>
                ) : (
                  t('dialogs.pairing.pair')
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
