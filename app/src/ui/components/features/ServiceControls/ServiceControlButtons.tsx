// ServiceControlButtons - Story 2.2
// Provides Start/Stop/Restart controls for Sunshine service

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, RefreshCw } from 'lucide-react';
import { Button } from '../../common/ui/button';
import { getSunshineControlService } from '../../../../application/services/sunshine-control';
import { useAppStore } from '../../../../application/stores/app-store';
import { SunshineStatus } from '../../../../domain/types';
import { toast } from 'sonner';

const sunshineControl = getSunshineControlService();

interface ServiceControlButtonsProps {
  className?: string;
}

export function ServiceControlButtons({ className }: ServiceControlButtonsProps) {
  const { t } = useTranslation();
  const { sunshineStatus } = useAppStore();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const isOnline = sunshineStatus === SunshineStatus.ONLINE;
  const isOffline = sunshineStatus === SunshineStatus.OFFLINE;

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const result = await sunshineControl.start();
      if (result.success) {
        toast.success(t('toasts.success.sunshineStarted'));
        // Refresh status
        setTimeout(() => {
          useAppStore.getState().fetchSunshineStatus();
        }, 500);
      } else {
        toast.error(t('toasts.error.startFailed', { error: result.error }));
      }
    } catch (error) {
      toast.error(t('toasts.error.serviceStart'));
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      const result = await sunshineControl.stop();
      if (result.success) {
        toast.success(t('toasts.success.sunshineStopped'));
        // Refresh status
        setTimeout(() => {
          useAppStore.getState().fetchSunshineStatus();
        }, 500);
      } else {
        toast.error(t('toasts.error.stopFailed', { error: result.error }));
      }
    } catch (error) {
      toast.error(t('toasts.error.serviceStop'));
    } finally {
      setIsStopping(false);
    }
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      const result = await sunshineControl.restart();
      if (result.success) {
        toast.success(t('toasts.success.sunshineRestarted'));
        // Refresh status
        setTimeout(() => {
          useAppStore.getState().fetchSunshineStatus();
        }, 1000);
      } else {
        toast.error(t('toasts.error.restartFailed', { error: result.error }));
      }
    } catch (error) {
      toast.error(t('toasts.error.serviceRestart'));
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleStart}
        disabled={isOnline || isStarting}
        className="gap-2"
      >
        {isStarting ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {t('common.start')}
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleStop}
        disabled={isOffline || isStopping}
        className="gap-2"
      >
        {isStopping ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Square className="h-4 w-4" />
        )}
        {t('common.stop')}
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleRestart}
        disabled={isOffline || isRestarting}
        className="gap-2"
      >
        {isRestarting ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {t('common.restart')}
      </Button>
    </div>
  );
}
