// SettingsPage.tsx - Page de réglages
// Story 3.2/3.3/3.4: Gestion des écrans avec liste unifiée et presets
// Story 5.1: Gestion des presets Sunshine
// Story 9.7: Démarrage automatique Windows

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";
import { useDisplayStore, useSunshinePresetStore, useSettingsStore } from "@application/stores";
import { changeLanguage } from "../../i18n";
import { ScreenList } from "../components/features/Screens/ScreenList";
import { ScreenPresetForm } from "../components/features/Screens/ScreenPresetForm";
import { ConfirmDeleteDialog } from "../components/common/ConfirmDeleteDialog";
import { SunshinePresetDialog } from "../components/features/SunshinePresets/SunshinePresetDialog";
import { SunshinePresetCard } from "../components/features/SunshinePresets/SunshinePresetCard";
import { ServerNameEditor } from "../components/features/Clients";
import { Button } from "../components/common/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/common/ui/select";
import { GlassCard } from "../components/common/GlassCard";
import type {
  ScreenPreset,
  RefreshRate,
  Resolution,
  SunshinePreset,
  CreateSunshinePresetData,
} from "@domain/types";

/**
 * Section Système - Story 10.4
 * Gère les paramètres système : langue
 */
function SystemSection() {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as "fr" | "en");
    changeLanguage(lang);
    toast.success(t('settings.system.languageChanged'), {
      description: lang === 'fr' ? t('settings.system.languageChangedFr') : t('settings.system.languageChangedEn'),
    });
  };

  return (
    <GlassCard>
      <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-3">
        {t('settings.system.title')}
      </h2>

      {/* Sélecteur de langue (Story 10.4 - AC4) */}
      <div className="flex items-center justify-between py-2">
        <div className="flex-1 min-w-0 mr-4">
          <p className="text-[13px] text-text-primary font-medium">
            {t('settings.system.language')}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {t('settings.system.languageDesc')}
          </p>
        </div>
        <Select value={language ?? "fr"} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[140px] h-8 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </GlassCard>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const {
    vddStatus,
    physicalScreens,
    eclipseScreen,
    presets,
    activePresetId,
    isLoading,
    refreshVddStatus,
    refreshPhysicalScreens,
    refreshDeviceId,
    addPreset,
    updatePreset,
    deletePreset,
    activatePreset,
    deactivatePreset,
  } = useDisplayStore();

  // État du dialog de création/édition
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ScreenPreset | null>(null);

  // État du dialog de confirmation de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<ScreenPreset | null>(null);

  // === Sunshine Presets (Story 5.1) ===
  const {
    presets: sunshinePresets,
    activePresetId: activeSunshinePresetId,
    isLoading: isSunshineLoading,
    addPreset: addSunshinePreset,
    updatePreset: updateSunshinePreset,
    deletePreset: deleteSunshinePreset,
    activatePreset: activateSunshinePreset,
    detectAndSyncActivePreset,
  } = useSunshinePresetStore();

  // État du dialog de création/édition Sunshine Preset
  const [isSunshineFormOpen, setIsSunshineFormOpen] = useState(false);
  const [editingSunshinePreset, setEditingSunshinePreset] =
    useState<SunshinePreset | null>(null);

  // État du dialog de suppression Sunshine Preset
  const [sunshineDeleteDialogOpen, setSunshineDeleteDialogOpen] = useState(false);
  const [sunshinePresetToDelete, setSunshinePresetToDelete] =
    useState<SunshinePreset | null>(null);

  // Charger les données au montage
  useEffect(() => {
    refreshVddStatus();
    refreshPhysicalScreens();
  }, [refreshVddStatus, refreshPhysicalScreens]);

  // Epic 11: Sync active Sunshine preset with actual config when page is visited
  // This detects if user made manual changes via localhost and updates UI accordingly
  useEffect(() => {
    console.log('[SettingsPage] Syncing active preset with Sunshine config...');
    detectAndSyncActivePreset();
  }, [detectAndSyncActivePreset]);

  // === Handlers ===

  const handleCreatePreset = () => {
    setEditingPreset(null);
    setIsFormOpen(true);
  };

  const handleEditPreset = (preset: ScreenPreset) => {
    setEditingPreset(preset);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: {
    name: string;
    resolution: Resolution;
    refreshRate: RefreshRate;
  }) => {
    if (editingPreset) {
      // Modification
      updatePreset(editingPreset.id, data);
      toast.success(t('settings.screens.screenModified'), {
        description: t('settings.screens.screenModifiedDesc', { name: data.name }),
      });
    } else {
      // Création
      addPreset(data);
      toast.success(t('settings.screens.screenCreated'), {
        description: t('settings.screens.screenCreatedDesc', { name: data.name }),
      });
    }
  };

  const handleDeletePreset = (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;

    // Ouvrir le dialog de confirmation
    setPresetToDelete(preset);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePreset = () => {
    if (!presetToDelete) return;

    deletePreset(presetToDelete.id);
    toast.success(t('settings.screens.screenDeleted'), {
      description: t('settings.screens.screenDeletedDesc', { name: presetToDelete.name }),
    });
    setPresetToDelete(null);
  };

  const handleActivatePreset = async (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;

    try {
      await activatePreset(id);
      toast.success(t('settings.screens.screenActivated'), {
        description: t('settings.screens.screenActivatedDesc', {
          name: preset.name,
          resolution: `${preset.resolution.width}x${preset.resolution.height}`,
          refresh: preset.refreshRate,
        }),
      });
    } catch (error) {
      toast.error(t('settings.screens.activateError'), {
        description: error instanceof Error ? t(error.message) : t('toasts.error.generic'),
      });
    }
  };

  const handleDeactivatePreset = async () => {
    try {
      await deactivatePreset();
      toast.success(t('settings.screens.screenDeactivated'), {
        description: t('settings.screens.screenDeactivatedDesc'),
      });
    } catch (error) {
      toast.error(t('settings.screens.deactivateError'), {
        description: error instanceof Error ? t(error.message) : t('toasts.error.generic'),
      });
    }
  };

  const handleRefreshDeviceId = async () => {
    try {
      toast.info(t('settings.screens.detecting'), {
        description: t('settings.screens.detectingDesc'),
      });
      await refreshDeviceId();
      toast.success(t('settings.screens.detected'), {
        description: t('settings.screens.detectedDesc'),
      });
    } catch (error) {
      toast.error(t('settings.screens.detectFailed'), {
        description: error instanceof Error ? t(error.message) : t('toasts.error.generic'),
      });
    }
  };

  // === Handlers Sunshine Presets (Story 5.1) ===

  const handleCreateSunshinePreset = () => {
    setEditingSunshinePreset(null);
    setIsSunshineFormOpen(true);
  };

  const handleEditSunshinePreset = (preset: SunshinePreset) => {
    setEditingSunshinePreset(preset);
    setIsSunshineFormOpen(true);
  };

  const handleSunshineFormSubmit = (data: CreateSunshinePresetData) => {
    try {
      if (editingSunshinePreset) {
        updateSunshinePreset(editingSunshinePreset.id, data);
        toast.success(t('settings.sunshinePresets.presetModified'), {
          description: t('settings.sunshinePresets.presetModifiedDesc', { name: data.name }),
        });
      } else {
        addSunshinePreset(data);
        toast.success(t('settings.sunshinePresets.presetCreated'), {
          description: t('settings.sunshinePresets.presetCreatedDesc', { name: data.name }),
        });
      }
    } catch (error) {
      toast.error(t('common.error'), {
        description: error instanceof Error ? error.message : t('toasts.error.generic'),
      });
    }
  };

  const handleDeleteSunshinePreset = (preset: SunshinePreset) => {
    if (preset.isReadOnly) {
      toast.error(t('settings.sunshinePresets.cannotDelete'), {
        description: t('settings.sunshinePresets.readOnly'),
      });
      return;
    }
    setSunshinePresetToDelete(preset);
    setSunshineDeleteDialogOpen(true);
  };

  const confirmDeleteSunshinePreset = () => {
    if (!sunshinePresetToDelete) return;
    try {
      deleteSunshinePreset(sunshinePresetToDelete.id);
      toast.success(t('settings.sunshinePresets.presetDeleted'), {
        description: t('settings.sunshinePresets.presetDeletedDesc', { name: sunshinePresetToDelete.name }),
      });
    } catch (error) {
      toast.error(t('common.error'), {
        description: error instanceof Error ? error.message : t('toasts.error.generic'),
      });
    }
    setSunshinePresetToDelete(null);
  };

  const handleActivateSunshinePreset = async (preset: SunshinePreset) => {
    console.log("[SettingsPage] handleActivateSunshinePreset called for:", preset.name);

    // Story 5.5: Afficher un toast de chargement pendant l'application
    const loadingToastId = toast.loading(t('settings.sunshinePresets.applyingPreset'), {
      description: t('settings.sunshinePresets.applyingPresetDesc', { name: preset.name }),
    });

    try {
      console.log("[SettingsPage] Calling activateSunshinePreset...");
      await activateSunshinePreset(preset.id);
      console.log("[SettingsPage] activateSunshinePreset completed successfully");
      console.log("[SettingsPage] Current activeSunshinePresetId should be:", preset.id);

      toast.success(t('settings.sunshinePresets.presetActivated'), {
        id: loadingToastId,
        description: t('settings.sunshinePresets.presetActivatedDesc', { name: preset.name }),
      });
    } catch (error) {
      console.error("[SettingsPage] activateSunshinePreset FAILED:", error);
      toast.error(t('settings.sunshinePresets.activateError'), {
        id: loadingToastId,
        description: error instanceof Error ? error.message : t('toasts.error.generic'),
      });
    }
  };

  return (
    <div className="page-container p-8 overflow-y-auto">
      <h1 className="page-title text-[18px] font-semibold text-text-primary mb-6">
        {t('settings.title')}
      </h1>

      <div className="space-y-4 max-w-2xl">
        {/* Section Nom du Serveur (Story 6.4) */}
        <GlassCard>
          <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-3">
            {t('settings.serverSunshine.title')}
          </h2>
          <p className="text-[12px] text-text-secondary mb-3">
            {t('settings.serverSunshine.description')}
          </p>
          <ServerNameEditor />
        </GlassCard>

        {/* Section Gestion des Écrans */}
        <GlassCard>
          <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-4">
            {t('settings.screens.title')}
          </h2>

          {/* Indicateur de statut VDD global + bouton Refresh */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shadow-[0_0_8px_var(--color-corona)] ${
                  vddStatus === "enabled" ? "bg-corona animate-pulse" : "bg-white/20"
                }`}
              />
              <span className="text-[12px] text-text-secondary">
                {t('settings.screens.virtualDisplay')}: <span className={vddStatus === "enabled" ? "text-corona text-corona-glow" : ""}>{vddStatus === "enabled" ? t('settings.screens.active') : t('settings.screens.inactive')}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshDeviceId}
                disabled={isLoading}
                className="h-6 w-6 p-0"
                title={t('settings.screens.refreshScreens')}
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>

          {/* Liste des écrans */}
          <ScreenList
            physicalScreens={physicalScreens}
            eclipseScreen={eclipseScreen}
            presets={presets}
            activePresetId={activePresetId}
            isLoading={isLoading}
            onActivatePreset={handleActivatePreset}
            onDeactivatePreset={handleDeactivatePreset}
            onEditPreset={handleEditPreset}
            onDeletePreset={handleDeletePreset}
            onCreatePreset={handleCreatePreset}
          />
        </GlassCard>

        {/* Section Configuration Sunshine (Story 5.1) */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3]">
              {t('settings.sunshinePresets.title')}
            </h2>
            <Button
              onClick={handleCreateSunshinePreset}
              variant="outline"
              size="sm"
              className="h-7 text-[11px] border-corona/30 text-corona hover:bg-corona/10 hover:border-corona/50"
            >
              <Plus size={14} className="mr-1" />
              {t('common.add')}
            </Button>
          </div>

          {/* Grille des presets Sunshine (même format que les écrans) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {sunshinePresets.map((preset) => (
              <SunshinePresetCard
                key={preset.id}
                preset={preset}
                isActive={activeSunshinePresetId === preset.id}
                isLoading={isSunshineLoading}
                onActivate={() => handleActivateSunshinePreset(preset)}
                onEdit={() => handleEditSunshinePreset(preset)}
                onDelete={() => handleDeleteSunshinePreset(preset)}
              />
            ))}
          </div>

          {/* Message si aucun preset custom */}
          {sunshinePresets.filter(p => !p.isReadOnly).length === 0 && (
            <p className="text-[11px] text-text-secondary/60 text-center mt-2">
              {t('settings.sunshinePresets.createFirst')}
            </p>
          )}
        </GlassCard>

        {/* Section Système (Story 9.7) */}
        <SystemSection />
      </div>

      {/* Dialog création/édition de preset */}
      <ScreenPresetForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        editingPreset={editingPreset}
      />

      {/* Dialog confirmation de suppression */}
      <ConfirmDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPresetToDelete(null);
        }}
        onConfirm={confirmDeletePreset}
        title={t('settings.screens.deletePreset')}
        description={t('settings.screens.deletePresetDesc', { name: presetToDelete?.name })}
      />

      {/* Dialog création/édition de preset Sunshine (Story 5.1) */}
      <SunshinePresetDialog
        isOpen={isSunshineFormOpen}
        onClose={() => setIsSunshineFormOpen(false)}
        onSubmit={handleSunshineFormSubmit}
        editingPreset={editingSunshinePreset}
      />

      {/* Dialog confirmation de suppression Sunshine Preset */}
      <ConfirmDeleteDialog
        isOpen={sunshineDeleteDialogOpen}
        onClose={() => {
          setSunshineDeleteDialogOpen(false);
          setSunshinePresetToDelete(null);
        }}
        onConfirm={confirmDeleteSunshinePreset}
        title={t('settings.sunshinePresets.deletePreset')}
        description={t('settings.sunshinePresets.deletePresetDesc', { name: sunshinePresetToDelete?.name })}
      />

    </div>
  );
}

export default SettingsPage;
