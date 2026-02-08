// AppFormDialog.tsx - Dialog unifié création/modification d'application
// Simplifié: juste nom, exe (optionnel), icône PNG
// Le script Eclipse détecte la config active automatiquement

import { useState, useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  FolderOpen,
  AppWindow,
  AlertCircle,
  Loader2,
  Image,
} from "lucide-react";
import { Button } from "../../common/ui/button";
import { useSunshineAppsStore } from "@application/stores";
import type { SunshineApp } from "@domain/types";

interface AppFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingAppNames: string[];
  /** Si fourni, mode modification. Sinon, mode création. */
  editingApp?: SunshineApp | null;
}

/**
 * Extrait un nom d'application lisible depuis un chemin d'exécutable
 */
function extractAppNameFromPath(exePath: string): string {
  const fileName = exePath.split(/[/\\]/).pop() || "";
  const nameWithoutExt = fileName.replace(/\.exe$/i, "");

  return nameWithoutExt
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
}

export function AppFormDialog({
  isOpen,
  onClose,
  existingAppNames,
  editingApp,
}: AppFormDialogProps) {
  const { t } = useTranslation();
  // Mode création ou modification
  const isEditMode = !!editingApp;

  // IDs accessibles pour les labels
  const nameInputId = useId();

  // Form state - simplifié: juste nom, exe, icône
  const [appName, setAppName] = useState("");
  const [exePath, setExePath] = useState("");
  const [iconBase64, setIconBase64] = useState<string | null>(null);

  // UI state
  const [isLoadingIcon, setIsLoadingIcon] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store
  const { addApp, updateApp } = useSunshineAppsStore();

  // Reset du form quand le dialog s'ouvre
  useEffect(() => {
    if (isOpen) {
      if (editingApp) {
        // Mode modification: pré-remplir avec les données existantes
        setAppName(editingApp.name);
        setExePath(editingApp.cmd || "");
        setIconBase64(editingApp["image-path"]?.startsWith("data:") ? editingApp["image-path"] : null);
      } else {
        // Mode création: reset
        setAppName("");
        setExePath("");
        setIconBase64(null);
      }
      setIsLoadingIcon(false);
      setIsSaving(false);
      setError(null);
    }
  }, [isOpen, editingApp]);

  // Validation du nom
  const nameError = (() => {
    if (!appName.trim()) return t('errors.required');
    const trimmedName = appName.trim().toLowerCase();
    const existingNames = existingAppNames
      .filter((n) => !isEditMode || n !== editingApp?.name) // Exclure le nom actuel en mode édition
      .map((n) => n.toLowerCase());
    if (existingNames.includes(trimmedName)) {
      return t('toasts.error.generic');
    }
    return null;
  })();

  const isValid = appName.trim() && !nameError;

  // Handler: Sélectionner un exécutable
  const handleSelectExe = async () => {
    setError(null);
    try {
      const result = await window.electronAPI.dialog.selectExe();
      if (result.canceled || !result.success) return;
      if (!result.path) {
        setError(t('dialogs.application.noFileSelected'));
        return;
      }

      setExePath(result.path);
      // Auto-remplir le nom si vide
      if (!appName.trim()) {
        setAppName(extractAppNameFromPath(result.path));
      }

      // Extraire l'icône automatiquement
      setIsLoadingIcon(true);
      try {
        const iconResult = await window.electronAPI.dialog.extractIcon(result.path);
        if (iconResult.success && iconResult.iconBase64) {
          setIconBase64(iconResult.iconBase64);
        }
      } catch {
        // Ignore - icône optionnelle
      } finally {
        setIsLoadingIcon(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('dialogs.application.selectionError');
      setError(message);
    }
  };

  // Handler: Sélectionner une icône PNG
  const handleSelectIcon = async () => {
    setError(null);
    try {
      const result = await window.electronAPI.dialog.selectImage();
      if (result.canceled || !result.success) return;
      if (result.imageBase64) {
        setIconBase64(result.imageBase64);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('dialogs.application.selectionError');
      setError(message);
    }
  };

  // Handler: Sauvegarder
  const handleSave = async () => {
    if (!isValid || isSaving) return;
    setError(null);
    setIsSaving(true);

    try {
      if (isEditMode && editingApp) {
        // Mode modification: mettre à jour nom, exe, icône
        // Garder les prep-cmd existants (ne pas régénérer pour ne pas casser les apps existantes)
        const updates: Partial<SunshineApp> = {
          name: appName.trim(),
          cmd: exePath || "",
          "image-path": iconBase64 || "",
        };

        // Mettre à jour le working-dir si l'exe change
        if (exePath && exePath !== editingApp.cmd) {
          updates["working-dir"] = exePath.split(/[/\\]/).slice(0, -1).join("\\");
        }

        await updateApp(editingApp.name, updates);
      } else {
        // Mode création: addApp génère automatiquement les prep-cmd Eclipse
        await addApp({
          name: appName.trim(),
          exePath: exePath || "",
          iconBase64: iconBase64 || undefined,
        });
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('dialogs.application.saveError');
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl w-[440px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-[16px] font-semibold text-text-primary">
            {isEditMode ? t('dialogs.application.editTitle') : t('dialogs.application.createTitle')}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-text-secondary hover:text-text-primary"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Nom de l'application */}
          <div>
            <label htmlFor={nameInputId} className="block text-[12px] font-medium text-text-secondary mb-2">
              {t('applications.name')} *
            </label>
            <input
              id={nameInputId}
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className={`w-full h-10 px-3 rounded-lg bg-white/5 border text-[13px] text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-corona/50 ${
                nameError ? "border-red-500/50" : "border-white/10"
              }`}
              placeholder="Visible dans Moonlight"
              disabled={isSaving}
            />
            {nameError && <p className="mt-1 text-[11px] text-red-400">{nameError}</p>}
          </div>

          {/* Exécutable (optionnel) */}
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-2">
              {t('applications.path')}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 h-10 px-3 flex items-center rounded-lg bg-white/5 border border-white/10 text-[12px] text-text-secondary truncate">
                {exePath || t('dialogs.application.windowsDesktop')}
              </div>
              <Button
                onClick={handleSelectExe}
                variant="secondary"
                size="sm"
                className="h-10 px-3 bg-white/5 border border-white/10 hover:bg-white/10"
                disabled={isSaving}
              >
                <FolderOpen size={16} className="mr-2" />
                {t('applications.browse')}
              </Button>
            </div>
          </div>

          {/* Icône */}
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-2">
              {t('applications.icon')}
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-white/5 border border-white/10">
                {isLoadingIcon ? (
                  <Loader2 size={24} className="text-text-secondary animate-spin" />
                ) : iconBase64 ? (
                  <img src={iconBase64} alt="App icon" className="w-10 h-10 object-contain" />
                ) : (
                  <AppWindow size={24} className="text-text-secondary" />
                )}
              </div>
              <Button
                onClick={handleSelectIcon}
                variant="secondary"
                size="sm"
                className="h-9 px-3 bg-white/5 border border-white/10 hover:bg-white/10"
                disabled={isSaving}
              >
                <Image size={14} className="mr-2" />
                {t('common.edit')}
              </Button>
              <span className="text-[10px] text-text-secondary/50">PNG</span>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-[12px] text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="text-text-secondary hover:text-text-primary"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="bg-corona hover:bg-corona/90 text-black font-medium disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                {t('common.loading')}
              </>
            ) : isEditMode ? (
              t('common.save')
            ) : (
              t('common.add')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
