// ScreenCard.tsx - Story 3.2/3.4: Carte d'affichage pour un écran
// Carte compacte pour affichage en grille (4-5 par ligne)

import { Pencil, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../common/ui/button";
import type { PhysicalScreen, EclipseScreen, ScreenPreset } from "@domain/types";

type Screen = PhysicalScreen | EclipseScreen | ScreenPreset;

interface ScreenCardProps {
  screen: Screen;
  isActive?: boolean;
  isLoading?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ScreenCard({
  screen,
  isActive = false,
  isLoading = false,
  onActivate,
  onDeactivate,
  onEdit,
  onDelete,
}: ScreenCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const isPhysical = screen.type === "physical";
  const isEclipse = screen.type === "eclipse";
  const isPreset = screen.type === "preset";

  // Formater la résolution
  const resolutionLabel = `${screen.resolution.width}x${screen.resolution.height}`;
  const refreshLabel = `${screen.refreshRate}Hz`;

  // Déterminer le Device ID à afficher (tronqué si trop long)
  const deviceId = screen.deviceId || "-";
  const shortDeviceId = deviceId.length > 12 ? `${deviceId.slice(0, 12)}...` : deviceId;

  // Copier l'ID dans le presse-papier
  const handleCopyId = async () => {
    if (!deviceId || deviceId === "-") return;
    try {
      await navigator.clipboard.writeText(deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy ID:", err);
    }
  };

  return (
    <div
      className={`
        relative rounded-lg p-3 transition-all duration-300
        ${isActive ? "bg-corona/5 border border-corona/40 shadow-[0_0_20px_-10px_var(--color-corona)]" : "bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10"}
      `}
    >
      {/* Badge Actif */}
      {isActive && (
        <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-black border border-corona/50 text-corona shadow-[0_0_10px_-3px_var(--color-corona)]">
          {t('settings.screens.active')}
        </span>
      )}

      {/* Header: Nom + Type badge */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <h4 className="text-[12px] font-medium text-text-primary truncate flex-1" title={screen.name}>
          {screen.name}
          {isPhysical && (screen as PhysicalScreen).isPrimary && (
            <span className="ml-1 text-[9px] text-amber-400">*</span>
          )}
        </h4>
        <span
          className={`
            px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0
            ${isPhysical ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_8px_-4px_rgba(59,130,246,0.5)]" : ""}
            ${isEclipse ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_8px_-4px_rgba(168,85,247,0.5)]" : ""}
            ${isPreset ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_-4px_rgba(245,158,11,0.5)]" : ""}
          `}
        >
          {isPhysical ? t('settings.screens.typeReal') : isEclipse ? t('settings.screens.typeDefault') : t('settings.screens.typePreset')}
        </span>
      </div>

      {/* Résolution */}
      <p className="text-[11px] text-text-secondary mb-1">
        {resolutionLabel} @ {refreshLabel}
      </p>

      {/* Device ID avec bouton copier */}
      <div className="flex items-center gap-1 text-[10px] text-text-secondary/70">
        <span>ID:</span>
        <code className="bg-black/40 px-1 py-0.5 rounded truncate flex-1" title={deviceId}>
          {shortDeviceId}
        </code>
        {deviceId !== "-" && (
          <button
            onClick={handleCopyId}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
            title={t('settings.screens.copyId')}
          >
            {copied ? (
              <Check size={10} className="text-green-400" />
            ) : (
              <Copy size={10} className="text-text-secondary hover:text-text-primary" />
            )}
          </button>
        )}
      </div>

      {/* Actions - uniquement pour les presets */}
      {isPreset && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
          {isActive ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onDeactivate}
              disabled={isLoading}
              className="flex-1 h-6 text-[10px] px-2"
            >
              {isLoading ? "..." : t('settings.screens.turnOff')}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onActivate}
              disabled={isLoading}
              className="flex-1 h-6 text-[10px] px-2"
            >
              {isLoading ? "..." : t('settings.screens.turnOn')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={isLoading}
            className="h-6 text-[10px] px-1.5"
            title={t('common.edit')}
          >
            <Pencil size={10} />
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
        </div>
      )}
    </div>
  );
}
