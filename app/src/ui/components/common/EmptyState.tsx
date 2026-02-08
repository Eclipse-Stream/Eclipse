// EmptyState.tsx - Composant réutilisable pour les états vides
// Deux variantes : compact (inline) et full (centré avec grande icône)

import type { LucideIcon } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  /** Variante d'affichage */
  variant?: "compact" | "full";
  /** Icône Lucide à afficher */
  icon: LucideIcon;
  /** Couleur de l'icône (classe Tailwind) */
  iconClassName?: string;
  /** Titre principal */
  title: string;
  /** Description optionnelle */
  description?: string;
  /** Texte du bouton d'action */
  actionLabel?: string;
  /** Callback du bouton d'action */
  onAction?: () => void;
}

export function EmptyState({
  variant = "full",
  icon: Icon,
  iconClassName = "text-text-secondary/50",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  // Variante compacte : inline, fond léger, icône petite
  if (variant === "compact") {
    return (
      <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-white/5 border border-white/5">
        <div className="flex items-center gap-2.5">
          <Icon size={16} className={iconClassName} />
          <span className="text-[12px] text-text-secondary">{title}</span>
        </div>
        {actionLabel && onAction && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onAction}
            className="h-6 text-[11px]"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    );
  }

  // Variante full : centrée, grande icône, padding généreux
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
        <Icon size={40} className={iconClassName} />
      </div>

      <h3 className="text-[16px] font-medium text-text-primary mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-[13px] text-text-secondary text-center max-w-md mb-6">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button onClick={onAction} className="flex items-center gap-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
