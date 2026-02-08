// ScreenPresetForm.tsx - Story 3.3: Dialog de création/édition de preset
// Permet de définir: nom, résolution, taux de rafraîchissement
// Utilise le schéma Zod pour la validation (DRY - règles centralisées dans le domaine)

import { useState, useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../common/ui/button";
import { Input } from "../../common/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../common/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../common/ui/select";
import type { ScreenPreset, Resolution, RefreshRate } from "@domain/types";
import { STANDARD_RESOLUTIONS, AVAILABLE_REFRESH_RATES } from "@domain/types";
import { ScreenPresetFormSchema } from "@domain/validators/vdd.schema";

interface ScreenPresetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    resolution: Resolution;
    refreshRate: RefreshRate;
  }) => void;
  editingPreset?: ScreenPreset | null;
}

export function ScreenPresetForm({
  isOpen,
  onClose,
  onSubmit,
  editingPreset,
}: ScreenPresetFormProps) {
  const { t } = useTranslation();
  const isEditing = !!editingPreset;

  // IDs accessibles pour les labels
  const nameInputId = useId();

  // État du formulaire
  const [name, setName] = useState("");
  const [resolution, setResolution] = useState<Resolution>({ width: 1920, height: 1080 });
  const [refreshRate, setRefreshRate] = useState<RefreshRate>(60);
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Réinitialiser le formulaire quand on ouvre/ferme ou change de preset
  useEffect(() => {
    if (isOpen) {
      if (editingPreset) {
        setName(editingPreset.name);
        setResolution(editingPreset.resolution);
        setRefreshRate(editingPreset.refreshRate);
      } else {
        setName("");
        setResolution({ width: 1920, height: 1080 });
        setRefreshRate(60);
      }
      setErrors({});
    }
  }, [isOpen, editingPreset]);

  const handleResolutionChange = (value: string) => {
    const found = STANDARD_RESOLUTIONS.find(
      (r) => `${r.value.width}x${r.value.height}` === value
    );
    if (found) {
      setResolution(found.value);
    }
  };

  const handleRefreshRateChange = (value: string) => {
    setRefreshRate(parseInt(value) as RefreshRate);
  };

  const handleSubmit = () => {
    // Validation via schéma Zod (règles centralisées dans le domaine)
    const result = ScreenPresetFormSchema.safeParse({
      name,
      resolution,
      refreshRate,
    });

    if (!result.success) {
      // Extraire les erreurs Zod
      const newErrors: { name?: string } = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "name") {
          newErrors.name = issue.message;
        }
      }
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: result.data.name,
      resolution: result.data.resolution,
      refreshRate: result.data.refreshRate as RefreshRate,
    });

    onClose();
  };

  const resolutionKey = `${resolution.width}x${resolution.height}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('settings.screens.editPreset') : t('settings.screens.createPreset')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nom */}
          <div className="space-y-2">
            <label htmlFor={nameInputId} className="text-[12px] font-medium text-text-primary">
              {t('dialogs.preset.name')}
            </label>
            <Input
              id={nameInputId}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors({});
              }}
              placeholder="Ex: TV Salon, Steam Deck"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-[11px] text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Résolution */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-text-primary">
              {t('settings.screens.resolution')}
            </label>
            <Select value={resolutionKey} onValueChange={handleResolutionChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STANDARD_RESOLUTIONS.map((res) => (
                  <SelectItem
                    key={`${res.value.width}x${res.value.height}`}
                    value={`${res.value.width}x${res.value.height}`}
                  >
                    {res.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fréquence */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-text-primary">
              {t('settings.screens.refreshRate')}
            </label>
            <Select
              value={refreshRate.toString()}
              onValueChange={handleRefreshRateChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_REFRESH_RATES.map((rate) => (
                  <SelectItem key={rate} value={rate.toString()}>
                    {rate} Hz
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aperçu */}
          <div className="bg-black/20 rounded-lg p-3 mt-4">
            <p className="text-[13px] text-text-primary font-medium">
              {name || t('dialogs.preset.name')} - {resolution.width}x{resolution.height} @ {refreshRate}Hz
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? t('common.save') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
