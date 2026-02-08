// ApplicationsPage.tsx - Story 7.3 & 7.4: Page des applications Sunshine
// AC: Affiche grille d'apps, état vide, chargement, erreurs, ajout

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@ui/components/common/ui/button";
import { GlassCard } from "@ui/components/common/GlassCard";
import { AppsGrid, AppsEmptyState, AppFormDialog } from "@ui/components/features/Applications";
import { useSunshineAppsStore } from "@application/stores";
import { APP_CONSTANTS } from "@domain/types";
import type { SunshineApp } from "@domain/types";

export function ApplicationsPage() {
  const { t } = useTranslation();
  const { apps, isLoading, error, loadApps, deleteApp } = useSunshineAppsStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<SunshineApp | null>(null);

  // AC6: Chargement automatique au montage
  useEffect(() => {
    loadApps();
  }, [loadApps]);

  // Handler: Ouvrir dialog d'ajout (Story 7.7)
  const handleAdd = () => {
    setEditingApp(null);
    setIsDialogOpen(true);
  };

  // Handler: Ouvrir dialog de modification (Story 7.7)
  const handleEdit = (app: SunshineApp) => {
    if (app.name === APP_CONSTANTS.ECLIPSE_APP_NAME) return;
    setEditingApp(app);
    setIsDialogOpen(true);
  };

  // Handler: Fermer le dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingApp(null);
  };

  // Handler: Supprimer une application (Story 7.5)
  const handleDelete = async (app: { name: string }) => {
    if (app.name === APP_CONSTANTS.ECLIPSE_APP_NAME) return;
    try {
      await deleteApp(app.name);
    } catch (err) {
      console.error("[ApplicationsPage] Delete error:", err);
    }
  };

  // Filtrer: ne pas compter Eclipse pour l'empty state
  const hasNonEclipseApps = apps.some(
    (app) => app.name !== APP_CONSTANTS.ECLIPSE_APP_NAME
  );
  const showEmptyState = !isLoading && !error && apps.length <= 1 && !hasNonEclipseApps;

  return (
    <div className="page-container p-8 overflow-y-auto">
      {/* Header avec titre et bouton ajouter */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title text-[18px] font-semibold text-text-primary m-0">
          {t('applications.title')}
        </h1>
        <Button
          onClick={handleAdd}
          variant="outline"
          className="flex items-center gap-2 border-corona/30 text-corona hover:bg-corona/10 hover:border-corona/50"
        >
          <Plus size={16} />
          {t('common.add')}
        </Button>
      </div>

      <GlassCard size="sm" className="max-w-5xl">
        {/* AC7: État de chargement */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={20} className="animate-spin text-text-secondary" />
            <span className="ml-3 text-[13px] text-text-secondary">
              {t('common.loading')}
            </span>
          </div>
        )}

        {/* AC8: Erreur */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <AlertCircle size={24} className="text-red-400 mb-2" />
            <p className="text-[12px] text-text-secondary text-center mb-3">
              {error}
            </p>
            <Button
              onClick={() => loadApps()}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw size={14} />
              {t('common.retry')}
            </Button>
          </div>
        )}

        {/* Grille d'applications - toujours affichée si apps existent */}
        {!isLoading && !error && apps.length > 0 && (
          <AppsGrid apps={apps} onEdit={handleEdit} onDelete={handleDelete} />
        )}

        {/* État vide - seulement si aucune app */}
        {!isLoading && !error && apps.length === 0 && (
          <AppsEmptyState onAdd={handleAdd} />
        )}
      </GlassCard>

      {/* Dialog création/modification (Story 7.7) */}
      <AppFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        existingAppNames={apps.map((app) => app.name)}
        editingApp={editingApp}
      />
    </div>
  );
}

export default ApplicationsPage;
