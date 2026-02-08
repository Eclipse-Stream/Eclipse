// VDDControlPanel.tsx - Story 3.3: Contrôle et configuration de l'écran virtuel
// Permet d'allumer/éteindre l'écran virtuel et de configurer ses caractéristiques
// Note: "Forcer les paramètres" appartient à la config Sunshine, pas ici

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../common/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../common/ui/select";
import type { Resolution, RefreshRate } from "@domain/types";

interface VDDControlPanelProps {
  isEnabled: boolean;
  onToggle: () => Promise<void>;
  currentResolution?: Resolution;
  currentRefreshRate?: RefreshRate;
  onApplySettings?: (resolution: Resolution, refreshRate: RefreshRate) => Promise<void>;
}

// Toutes les résolutions disponibles dans vdd_settings.xml
const RESOLUTIONS: Array<{ label: string; value: Resolution }> = [
  { label: "800 x 600", value: { width: 800, height: 600 } },
  { label: "1366 x 768 (HD)", value: { width: 1366, height: 768 } },
  { label: "1920 x 1080 (Full HD)", value: { width: 1920, height: 1080 } },
  { label: "2560 x 1440 (2K)", value: { width: 2560, height: 1440 } },
  { label: "3840 x 2160 (4K)", value: { width: 3840, height: 2160 } },
];

// Tous les refresh rates disponibles dans vdd_settings.xml (g_refresh_rate + résolutions)
const REFRESH_RATES: RefreshRate[] = [30, 60, 90, 120, 144, 165, 244];

export function VDDControlPanel({ 
  isEnabled, 
  onToggle,
  currentResolution = { width: 1920, height: 1080 },
  currentRefreshRate = 60,
  onApplySettings,
}: VDDControlPanelProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  
  // État local pour les modifications en cours (avant application)
  const [pendingResolution, setPendingResolution] = useState<Resolution>(currentResolution);
  const [pendingRefreshRate, setPendingRefreshRate] = useState<RefreshRate>(currentRefreshRate);

  // Détecter si des changements sont en attente
  const hasChanges = 
    pendingResolution.width !== currentResolution.width ||
    pendingResolution.height !== currentResolution.height ||
    pendingRefreshRate !== currentRefreshRate;

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await onToggle();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolutionChange = (value: string) => {
    const resolution = RESOLUTIONS.find(r => `${r.value.width}x${r.value.height}` === value);
    if (resolution) {
      setPendingResolution(resolution.value);
    }
  };

  const handleRefreshRateChange = (value: string) => {
    const rate = parseInt(value) as RefreshRate;
    setPendingRefreshRate(rate);
  };

  const handleApply = async () => {
    if (!onApplySettings) return;
    
    setIsApplying(true);
    try {
      await onApplySettings(pendingResolution, pendingRefreshRate);
    } finally {
      setIsApplying(false);
    }
  };

  const pendingResolutionKey = `${pendingResolution.width}x${pendingResolution.height}`;

  return (
    <div className="bg-white/5 rounded-lg p-4 space-y-4">
      {/* Section État */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-text-primary mb-1">
            {t('vddControl.title')}
          </h3>
          <p className="text-[12px] text-text-secondary">
            {t('vddControl.description')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all duration-300 ${
              isEnabled
                ? "bg-corona/10 text-corona border border-corona/20 shadow-[0_0_10px_-5px_var(--color-corona)]"
                : "bg-white/5 text-text-secondary border border-white/5"
            }`}
          >
            {isEnabled ? t('vddControl.active') : t('vddControl.inactive')}
          </span>

          <Button
            onClick={handleToggle}
            disabled={isLoading}
            variant={isEnabled ? "secondary" : "default"}
            className="min-w-[120px]"
          >
            {isLoading
              ? t('common.loading')
              : isEnabled
              ? t('vddControl.turnOff')
              : t('vddControl.turnOn')}
          </Button>
        </div>
      </div>

      {/* Section Configuration (visible uniquement si activé) */}
      {isEnabled && (
        <div className="border-t border-white/10 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-medium text-text-primary">
              {t('vddControl.configuration')}
            </h4>
            {hasChanges && (
              <span className="text-[11px] text-amber-400">
                {t('vddControl.unsavedChanges')}
              </span>
            )}
          </div>

          {/* Résolution */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-[12px] font-medium text-text-primary">
                {t('vddControl.resolution')}
              </label>
              <p className="text-[11px] text-text-secondary">
                {t('vddControl.resolutionDesc')}
              </p>
            </div>
            <Select 
              value={pendingResolutionKey}
              onValueChange={handleResolutionChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTIONS.map((res) => (
                  <SelectItem 
                    key={`${res.value.width}x${res.value.height}`}
                    value={`${res.value.width}x${res.value.height}`}
                  >
                    {res.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Rate */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-[12px] font-medium text-text-primary">
                {t('vddControl.refreshRate')}
              </label>
              <p className="text-[11px] text-text-secondary">
                {t('vddControl.refreshRateDesc')}
              </p>
            </div>
            <Select 
              value={pendingRefreshRate.toString()}
              onValueChange={handleRefreshRateChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFRESH_RATES.map((rate) => (
                  <SelectItem key={rate} value={rate.toString()}>
                    {rate} Hz
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bouton Appliquer */}
          <Button
            onClick={handleApply}
            disabled={isApplying || !hasChanges}
            className="w-full"
          >
            {isApplying ? t('vddControl.applying') : t('vddControl.apply')}
          </Button>
        </div>
      )}

      {/* Message d'aide */}
      <div className="text-[12px] text-text-secondary bg-black/20 rounded p-3">
        💡 {isEnabled 
          ? t('vddControl.helpActive')
          : t('vddControl.helpInactive')}
      </div>
    </div>
  );
}
