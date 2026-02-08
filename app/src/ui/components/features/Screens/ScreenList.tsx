// ScreenList.tsx - Story 3.2: Liste unifiée des écrans en grille
// Affiche tous les écrans (réels + Eclipse + presets) en grille 4-5 colonnes

import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScreenCard } from "./ScreenCard";
import { Button } from "../../common/ui/button";
import type { PhysicalScreen, EclipseScreen, ScreenPreset } from "@domain/types";

interface ScreenListProps {
  physicalScreens: PhysicalScreen[];
  eclipseScreen: EclipseScreen;
  presets: ScreenPreset[];
  activePresetId: string | null;
  isLoading: boolean;
  onActivatePreset: (id: string) => void;
  onDeactivatePreset: () => void;
  onEditPreset: (preset: ScreenPreset) => void;
  onDeletePreset: (id: string) => void;
  onCreatePreset: () => void;
}

export function ScreenList({
  physicalScreens,
  eclipseScreen,
  presets,
  activePresetId,
  isLoading,
  onActivatePreset,
  onDeactivatePreset,
  onEditPreset,
  onDeletePreset,
  onCreatePreset,
}: ScreenListProps) {
  const { t } = useTranslation();

  // Construire le résumé avec gestion du pluriel
  const realCountLabel = physicalScreens.length > 1
    ? t('settings.screens.realCountPlural', { count: physicalScreens.length })
    : t('settings.screens.realCount', { count: physicalScreens.length });
  const presetCountLabel = presets.length > 1
    ? t('settings.screens.presetCountPlural', { count: presets.length })
    : t('settings.screens.presetCount', { count: presets.length });

  return (
    <div className="space-y-4">
      {/* Header avec bouton créer */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-text-secondary">
          {realCountLabel} + {t('settings.screens.defaultCount')} + {presetCountLabel}
        </p>
        <Button
          onClick={onCreatePreset}
          variant="outline"
          size="sm"
          className="h-7 text-[11px] border-corona/30 text-corona hover:bg-corona/10 hover:border-corona/50"
        >
          <Plus size={14} className="mr-1" />
          {t('common.add')}
        </Button>
      </div>

      {/* Grille de toutes les cartes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {/* Écrans physiques */}
        {physicalScreens.map((screen, index) => (
          <ScreenCard key={`physical-${index}`} screen={screen} />
        ))}

        {/* Écran Eclipse */}
        <ScreenCard screen={eclipseScreen} />

        {/* Presets utilisateur */}
        {presets.map((preset) => (
          <ScreenCard
            key={preset.id}
            screen={preset}
            isActive={activePresetId === preset.id}
            isLoading={isLoading}
            onActivate={() => onActivatePreset(preset.id)}
            onDeactivate={onDeactivatePreset}
            onEdit={() => onEditPreset(preset)}
            onDelete={() => onDeletePreset(preset.id)}
          />
        ))}
      </div>

      {/* Message si aucun preset */}
      {presets.length === 0 && (
        <p className="text-[11px] text-text-secondary/60 text-center">
          {t('settings.screens.createCustom')}
        </p>
      )}
    </div>
  );
}
