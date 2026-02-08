// AddAppDialog.tsx - Story 7.4: Dialog d'ajout d'application via exécutable
// Permet de sélectionner un .exe et d'extraire automatiquement nom et icône

import { useState, useEffect } from "react";
import { X, FolderOpen, AppWindow, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "../../common/ui/button";
import { useSunshineAppsStore } from "@application/stores";

interface AddAppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingAppNames: string[];
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

export function AddAppDialog({ isOpen, onClose, existingAppNames }: AddAppDialogProps) {
  const [exePath, setExePath] = useState("");
  const [appName, setAppName] = useState("");
  const [iconBase64, setIconBase64] = useState<string | null>(null);
  const [isLoadingIcon, setIsLoadingIcon] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addApp } = useSunshineAppsStore();

  useEffect(() => {
    if (isOpen) {
      setExePath("");
      setAppName("");
      setIconBase64(null);
      setIsLoadingIcon(false);
      setIsAdding(false);
      setError(null);
    }
  }, [isOpen]);

  const nameError = (() => {
    if (!appName.trim()) return "Le nom est requis";
    if (existingAppNames.some((n) => n.toLowerCase() === appName.trim().toLowerCase())) {
      return "Une application avec ce nom existe déjà";
    }
    return null;
  })();

  const isValid = exePath && appName.trim() && !nameError;

  const handleSelectExe = async () => {
    setError(null);
    try {
      const result = await window.electronAPI.dialog.selectExe();
      if (result.canceled || !result.success) return;
      if (!result.path) {
        setError("Aucun fichier sélectionné");
        return;
      }

      setExePath(result.path);
      setAppName(extractAppNameFromPath(result.path));

      setIsLoadingIcon(true);
      try {
        const iconResult = await window.electronAPI.dialog.extractIcon(result.path);
        if (iconResult.success && iconResult.iconBase64) {
          setIconBase64(iconResult.iconBase64);
        } else {
          setIconBase64(null);
        }
      } catch {
        setIconBase64(null);
      } finally {
        setIsLoadingIcon(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la sélection";
      setError(message);
    }
  };

  const handleAdd = async () => {
    if (!isValid || isAdding) return;
    setError(null);
    setIsAdding(true);

    try {
      await addApp({
        name: appName.trim(),
        exePath: exePath,
        iconBase64: iconBase64 || undefined,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'ajout";
      setError(message);
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-white/10 rounded-xl shadow-2xl w-[420px] max-w-[90vw]">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-[16px] font-semibold text-text-primary">Ajouter une application</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-text-secondary hover:text-text-primary">
            <X size={18} />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-2">Exécutable</label>
            <Button onClick={handleSelectExe} variant="secondary" className="w-full justify-start gap-2 h-10 bg-white/5 border border-white/10 hover:bg-white/10" disabled={isAdding}>
              <FolderOpen size={16} className="text-text-secondary" />
              <span className="truncate text-[13px]">{exePath || "Sélectionner un fichier .exe"}</span>
            </Button>
          </div>

          {exePath && (
            <>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-black/30 border border-white/10">
                  {isLoadingIcon ? (
                    <Loader2 size={24} className="text-text-secondary animate-spin" />
                  ) : iconBase64 ? (
                    <img src={iconBase64} alt="App icon" className="w-10 h-10 object-contain" />
                  ) : (
                    <AppWindow size={24} className="text-text-secondary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-text-secondary">Aperçu</p>
                  <p className="text-[13px] text-text-primary truncate">{appName}</p>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-secondary mb-2">Nom de l'application</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className={`w-full h-10 px-3 rounded-lg bg-white/5 border text-[13px] text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${nameError ? "border-red-500/50" : "border-white/10"}`}
                  placeholder="Nom affiché dans Moonlight"
                  disabled={isAdding}
                />
                {nameError && <p className="mt-1 text-[11px] text-red-400">{nameError}</p>}
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-secondary mb-2">Chemin de l'exécutable</label>
                <div className="w-full h-10 px-3 flex items-center rounded-lg bg-white/5 border border-white/10 text-[11px] text-text-secondary truncate">{exePath}</div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-[12px] text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
          <Button variant="ghost" onClick={onClose} disabled={isAdding} className="text-text-secondary hover:text-text-primary">Annuler</Button>
          <Button onClick={handleAdd} disabled={!isValid || isAdding} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
            {isAdding ? (<><Loader2 size={16} className="animate-spin mr-2" />Ajout...</>) : "Ajouter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
