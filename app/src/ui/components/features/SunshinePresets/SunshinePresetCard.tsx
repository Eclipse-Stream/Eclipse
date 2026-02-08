// SunshinePresetCard.tsx - Story 5.6: Carte compacte pour preset Sunshine
// Format carré similaire à ScreenCard pour cohérence visuelle

import { useTranslation } from "react-i18next";
import { Button } from "../../common/ui/button";
import type { SunshinePreset } from "@domain/types";

interface SunshinePresetCardProps {
  preset: SunshinePreset;
  isActive?: boolean;
  isLoading?: boolean;
  onActivate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SunshinePresetCard({
  preset,
  isActive = false,
  isLoading = false,
  onActivate,
  onEdit,
  onDelete,
}: SunshinePresetCardProps) {
  const { t } = useTranslation();
  const isReadOnly = preset.isReadOnly;
  const isExpert = preset.type === "expert";

  return (
    <div
      className={`
        relative rounded-lg p-3 transition-all duration-300
        ${isActive 
          ? "bg-corona/5 border border-corona/40 shadow-[0_0_20px_-10px_var(--color-corona)]" 
          : "bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10"}
      `}
    >
      {/* Badge Actif */}
      {isActive && (
        <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-black border border-corona/50 text-corona shadow-[0_0_10px_-3px_var(--color-corona)]">
          ON
        </span>
      )}

      {/* Header: Nom + Type badge */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <h4 className="text-[12px] font-medium text-text-primary truncate flex-1" title={preset.name}>
          {preset.name}
        </h4>
        <span
          className={`
            px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0
            ${isReadOnly
              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_8px_-4px_rgba(168,85,247,0.5)]"
              : isExpert
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_-4px_rgba(245,158,11,0.5)]"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_8px_-4px_rgba(59,130,246,0.5)]"
            }
          `}
        >
          {isReadOnly ? t('common.default') : isExpert ? t('settings.sunshinePresets.expert') : t('settings.sunshinePresets.simple')}
        </span>
      </div>

      {/* Infos principales */}
      <p className="text-[11px] text-text-secondary mb-1">
        {preset.display.fps} FPS &middot; {preset.display.bitrate} Mbps
      </p>

      {/* Mode display */}
      <p className="text-[10px] text-text-secondary/70 truncate">
        {t(`settings.sunshinePresets.displayModes.${preset.display.mode}`)}
      </p>

      {/* Audio mode */}
      <p className="text-[10px] text-text-secondary/70 truncate">
        {t(`settings.sunshinePresets.audioModes.${preset.audio.mode}`)}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
        {!isActive ? (
          <Button
            variant="default"
            size="sm"
            onClick={onActivate}
            disabled={isLoading}
            className="flex-1 h-6 text-[10px] px-2"
          >
            {isLoading ? "..." : t('common.on')}
          </Button>
        ) : (
          <span className="flex-1 h-6 flex items-center justify-center text-[10px] text-corona">
            {t('settings.screens.active')}
          </span>
        )}
        {!isReadOnly && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              disabled={isLoading}
              className="h-6 text-[10px] px-2"
            >
              {t('common.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isLoading || isActive}
              className="h-6 text-[10px] px-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              X
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
