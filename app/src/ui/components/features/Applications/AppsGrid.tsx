// AppsGrid.tsx - Liste d'applications
// Affiche les applications en liste verticale style ClientsList

import { AppCard } from "./AppCard";
import type { SunshineApp } from "@domain/types";
import { APP_CONSTANTS } from "@domain/types";
import { useSunshineAppsStore } from "@application/stores";

interface AppsGridProps {
  apps: SunshineApp[];
  onEdit?: (app: SunshineApp) => void;
  onDelete?: (app: SunshineApp) => void;
}

export function AppsGrid({ apps, onEdit, onDelete }: AppsGridProps) {
  const { isEclipseManagedApp } = useSunshineAppsStore();

  // Trier: Eclipse en premier, puis alphabétique
  const sortedApps = [...apps].sort((a, b) => {
    const aIsEclipse = a.name === APP_CONSTANTS.ECLIPSE_APP_NAME;
    const bIsEclipse = b.name === APP_CONSTANTS.ECLIPSE_APP_NAME;
    if (aIsEclipse && !bIsEclipse) return -1;
    if (!aIsEclipse && bIsEclipse) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col gap-2">
      {sortedApps.map((app) => {
        const isEclipse = app.name === APP_CONSTANTS.ECLIPSE_APP_NAME;
        const isManagedApp = isEclipseManagedApp(app);
        return (
          <AppCard
            key={app.name}
            app={app}
            isEclipse={isEclipse}
            isEclipseManagedApp={isManagedApp}
            onEdit={onEdit ? () => onEdit(app) : undefined}
            onDelete={!isEclipse && onDelete ? () => onDelete(app) : undefined}
          />
        );
      })}
    </div>
  );
}
