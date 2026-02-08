// AppCard.tsx - Carte d'application Sunshine
// Style horizontal unifié avec ClientCard

import { AppWindow, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../common/ui/button";
import type { SunshineApp } from "@domain/types";

interface AppCardProps {
  app: SunshineApp;
  isEclipse: boolean;
  isEclipseManagedApp?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Récupère l'icône de l'application
 * Supporte: Base64, chemin fichier (fallback), ou null
 */
function getAppIconSrc(app: SunshineApp): string | null {
  const imagePath = app["image-path"];
  if (!imagePath) return null;
  if (imagePath.startsWith("data:")) return imagePath;
  return null;
}

export function AppCard({ app, isEclipse, isEclipseManagedApp, onEdit, onDelete }: AppCardProps) {
  const { t } = useTranslation();
  const iconSrc = getAppIconSrc(app);

  // Déterminer le style du badge
  const badgeType = isEclipse ? "default" : isEclipseManagedApp ? "eclipse" : "custom";
  const badgeStyles = {
    default: "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_8px_-4px_rgba(168,85,247,0.5)]",
    eclipse: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_-4px_rgba(59,130,246,0.5)]",
    custom: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_-4px_rgba(245,158,11,0.5)]",
  };
  const badgeLabels = { default: t('applications.defaultBadge'), eclipse: t('applications.eclipse'), custom: "Custom" };

  return (
    <div className="group flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-200">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Icône de l'application */}
        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${badgeStyles[badgeType]}`}>
          {iconSrc ? (
            <img src={iconSrc} alt={app.name} className="w-5 h-5 object-contain" />
          ) : (
            <AppWindow size={16} className={badgeType === "default" ? "text-purple-400" : badgeType === "eclipse" ? "text-blue-400" : "text-amber-400"} />
          )}
        </div>

        {/* Nom + Type */}
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] text-text-primary font-medium leading-tight truncate" title={app.name}>
            {app.name}
          </span>
          <span className="text-[10px] text-text-secondary/60 leading-tight">
            {badgeLabels[badgeType]}
          </span>
        </div>
      </div>

      {/* Actions - visible au hover (sauf pour Eclipse) */}
      {!isEclipse && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-7 w-7 p-0 text-text-tertiary hover:text-text-primary hover:bg-white/10"
              title={t('common.edit')}
            >
              <Pencil size={14} />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-text-tertiary hover:text-red-400 hover:bg-red-500/10"
              title={t('common.delete')}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
