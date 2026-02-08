// SunshinePresetDialog.tsx - Story 5.1: Dialog de création/édition de preset Sunshine
// Interface modale avec onglets Simple/Expert pour configurer les presets streaming

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../common/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../common/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../common/ui/tabs";
import { useDisplayStore } from "@application/stores";
import { SimplePresetForm } from "./SimplePresetForm";
import { ExpertPresetForm } from "./ExpertPresetForm";
import type {
  SunshinePreset,
  DisplayMode,
  ResolutionStrategy,
  StreamFPS,
  AudioMode,
  EncoderProfile,
  CreateSunshinePresetData,
  Resolution,
  RefreshRate,
  ExpertConfig,
} from "@domain/types";
import { DEFAULT_SUNSHINE_PRESET_VALUES, DEFAULT_ENCODER_PROFILE } from "@domain/types";

interface SunshinePresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSunshinePresetData) => void;
  editingPreset?: SunshinePreset | null;
}

export function SunshinePresetDialog({
  isOpen,
  onClose,
  onSubmit,
  editingPreset,
}: SunshinePresetDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!editingPreset;
  const isReadOnly = editingPreset?.isReadOnly ?? false;

  // Récupérer les écrans disponibles depuis le DisplayStore
  const { physicalScreens, eclipseScreen, presets: screenPresets } = useDisplayStore();

  // État du formulaire
  const [activeTab, setActiveTab] = useState<"simple" | "expert">("simple");
  const [name, setName] = useState("");

  // Écran sélectionné (ID de l'écran)
  const [selectedScreenId, setSelectedScreenId] = useState<string>("eclipse");

  // Display config
  const [displayMode, setDisplayMode] = useState<DisplayMode>("standard");
  const [resolutionStrategy, setResolutionStrategy] = useState<ResolutionStrategy>("moonlight");
  const [fps, setFps] = useState<StreamFPS>(60);
  const [bitrate, setBitrate] = useState(20);
  const [encoderProfile, setEncoderProfile] = useState<EncoderProfile>(DEFAULT_ENCODER_PROFILE);

  // Manual resolution (pour override manuel)
  const [manualResolution, setManualResolution] = useState<Resolution>({ width: 1920, height: 1080 });
  const [manualRefreshRate, setManualRefreshRate] = useState<RefreshRate>(60);

  // Audio config
  const [audioMode, setAudioMode] = useState<AudioMode>("moonlight");
  const [audioDeviceId, setAudioDeviceId] = useState<string>("");

  // Network config
  const [upnp, setUpnp] = useState(true);

  // Input config
  const [keyboard, setKeyboard] = useState(true);
  const [mouse, setMouse] = useState(true);
  const [gamepad, setGamepad] = useState(true);

  // Errors
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Audio devices loaded from Sunshine audio-info.exe (Story 5.3)
  const [availableAudioDevices, setAvailableAudioDevices] = useState<{ id: string; name: string; isVirtual?: boolean }[]>([]);
  const [audioDevicesLoading, setAudioDevicesLoading] = useState(false);

  // Expert mode state (Story 5.4)
  const [detectedConfig, setDetectedConfig] = useState<Record<string, string> | null>(null);
  const [expertFields, setExpertFields] = useState<ExpertConfig>({});

  // Load audio devices when dialog opens (Story 5.3)
  useEffect(() => {
    if (isOpen) {
      setAudioDevicesLoading(true);
      window.electronAPI.audio
        .getSinks()
        .then((result) => {
          if (result.success && result.devices) {
            setAvailableAudioDevices(
              result.devices.map((d) => ({ id: d.id, name: d.name, isVirtual: d.isVirtual }))
            );
          } else {
            console.warn("[SunshinePresetDialog] Failed to load audio devices:", result.error);
            setAvailableAudioDevices([]);
          }
        })
        .catch((error) => {
          console.error("[SunshinePresetDialog] Error loading audio devices:", error);
          setAvailableAudioDevices([]);
        })
        .finally(() => {
          setAudioDevicesLoading(false);
        });
    }
  }, [isOpen]);

  // Construire la liste des écrans disponibles avec leurs deviceId et résolution
  const availableScreens = [
    // Écran Eclipse - deviceId stocké dans eclipseScreen
    {
      id: "eclipse",
      name: eclipseScreen.name,
      type: "eclipse" as const,
      deviceId: eclipseScreen.deviceId,
      resolution: eclipseScreen.resolution,
      refreshRate: eclipseScreen.refreshRate,
    },
    // Écrans physiques - deviceId est leur ID
    ...physicalScreens.map((s) => ({
      id: s.deviceId,
      name: s.name,
      type: "physical" as const,
      deviceId: s.deviceId,
      resolution: s.resolution,
      refreshRate: s.refreshRate,
    })),
    // Presets d'écran - partagent le même deviceId que l'écran Eclipse
    ...screenPresets.map((s) => ({
      id: s.id,
      name: s.name,
      type: "preset" as const,
      deviceId: eclipseScreen.deviceId, // Tous les presets utilisent le VDD Eclipse
      resolution: s.resolution,
      refreshRate: s.refreshRate,
    })),
  ];

  // Réinitialiser le formulaire quand on ouvre/ferme ou change de preset
  useEffect(() => {
    if (isOpen) {
      if (editingPreset) {
        setActiveTab(editingPreset.type);
        setName(editingPreset.name);
        // FIX: Charger l'écran sélectionné depuis le preset
        setSelectedScreenId(editingPreset.display.screenId || "eclipse");
        setDisplayMode(editingPreset.display.mode);
        setResolutionStrategy(editingPreset.display.resolutionStrategy);
        setFps(editingPreset.display.fps);
        setBitrate(editingPreset.display.bitrate);
        setEncoderProfile(editingPreset.display.encoderProfile ?? DEFAULT_ENCODER_PROFILE);
        setAudioMode(editingPreset.audio.mode);
        setAudioDeviceId(editingPreset.audio.deviceId || "");
        setUpnp(editingPreset.network.upnp);
        setKeyboard(editingPreset.inputs.keyboard);
        setMouse(editingPreset.inputs.mouse);
        setGamepad(editingPreset.inputs.gamepad);
        // Résolution manuelle si existante - deep copy pour éviter mutation
        if (editingPreset.display.manualResolution) {
          setManualResolution({ ...editingPreset.display.manualResolution });
        } else {
          setManualResolution({ width: 1920, height: 1080 });
        }
        if (editingPreset.display.manualRefreshRate) {
          setManualRefreshRate(editingPreset.display.manualRefreshRate);
        } else {
          setManualRefreshRate(60);
        }
        // Expert config - deep copy
        if (editingPreset.expert) {
          setExpertFields({ ...editingPreset.expert });
        } else {
          setExpertFields({});
        }
        setDetectedConfig(null);
      } else {
        // Valeurs par défaut pour création
        setActiveTab("simple");
        setName("");
        setSelectedScreenId("eclipse");
        setDisplayMode(DEFAULT_SUNSHINE_PRESET_VALUES.display.mode);
        setResolutionStrategy(DEFAULT_SUNSHINE_PRESET_VALUES.display.resolutionStrategy);
        setFps(DEFAULT_SUNSHINE_PRESET_VALUES.display.fps);
        setBitrate(DEFAULT_SUNSHINE_PRESET_VALUES.display.bitrate);
        setEncoderProfile(DEFAULT_SUNSHINE_PRESET_VALUES.display.encoderProfile ?? DEFAULT_ENCODER_PROFILE);
        setAudioMode(DEFAULT_SUNSHINE_PRESET_VALUES.audio.mode);
        setAudioDeviceId("");
        setUpnp(DEFAULT_SUNSHINE_PRESET_VALUES.network.upnp);
        setKeyboard(DEFAULT_SUNSHINE_PRESET_VALUES.inputs.keyboard);
        setMouse(DEFAULT_SUNSHINE_PRESET_VALUES.inputs.mouse);
        setGamepad(DEFAULT_SUNSHINE_PRESET_VALUES.inputs.gamepad);
        setManualResolution({ width: 1920, height: 1080 });
        setManualRefreshRate(60);
        // Reset expert mode state
        setDetectedConfig(null);
        setExpertFields({});
      }
      setErrors({});
    }
  }, [isOpen, editingPreset]);

  const handleNameChange = (value: string) => {
    setName(value);
    setErrors({});
  };

  const handleSubmit = () => {
    // Validation basique du nom
    if (!name.trim()) {
      setErrors({ name: t('errors.required') });
      return;
    }

    if (name.trim().length < 2) {
      setErrors({ name: t('errors.minLength', { min: 2 }) });
      return;
    }

    // Récupérer le deviceId de l'écran sélectionné
    const selectedScreen = availableScreens.find((s) => s.id === selectedScreenId);
    const screenDeviceId = selectedScreen?.deviceId;

    // Pour "preset", récupérer la résolution de l'écran sélectionné
    // Cela permet à Sunshine d'avoir la bonne résolution en "manual"
    // et à MultiMonitorTool d'appliquer la même résolution
    let effectiveResolution = manualResolution;
    let effectiveRefreshRate: RefreshRate = manualRefreshRate;

    if (resolutionStrategy === "preset" && selectedScreen) {
      effectiveResolution = selectedScreen.resolution;
      effectiveRefreshRate = selectedScreen.refreshRate as RefreshRate;
    }

    const data: CreateSunshinePresetData = {
      name: name.trim(),
      type: activeTab,
      display: {
        mode: displayMode,
        screenId: selectedScreenId,
        deviceId: screenDeviceId,
        resolutionStrategy,
        fps,
        bitrate,
        encoderProfile,
        // Pour "manual" ET "preset", on inclut la résolution
        // Pour "preset", c'est la résolution de l'écran sélectionné
        ...((resolutionStrategy === "manual" || resolutionStrategy === "preset") && {
          manualResolution: effectiveResolution,
          manualRefreshRate: effectiveRefreshRate,
        }),
      },
      audio: {
        mode: audioMode,
        // Inclure deviceId pour moonlight (virtual_sink) et both (audio_sink)
        // Pas pour pc (son désactivé)
        ...(audioMode !== "pc" && (() => {
          // Si un périphérique spécifique est sélectionné, l'utiliser
          if (audioDeviceId && audioDeviceId !== "default") {
            return { deviceId: audioDeviceId };
          }
          // En mode Moonlight avec "default", chercher le périphérique virtuel (isVirtual=true)
          // Comme dans Archive_V1: on cherche le device avec is_eclipse=True
          if (audioMode === "moonlight") {
            const virtualDevice = availableAudioDevices.find((d) => d.isVirtual);
            if (virtualDevice) {
              return { deviceId: virtualDevice.id };
            }
          }
          return {};
        })()),
      },
      network: {
        upnp,
      },
      inputs: {
        keyboard,
        mouse,
        gamepad,
      },
      // Expert fields: inclure seulement si mode expert, sinon explicitement undefined
      // Cela garantit que si on modifie un preset expert pour en faire un simple,
      // la config expert sera effacée
      expert: activeTab === "expert" && Object.keys(expertFields).length > 0
        ? expertFields
        : undefined,
    };

    onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isEditing ? t('dialogs.preset.editTitle') : t('dialogs.preset.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              const newTab = v as "simple" | "expert";
              setActiveTab(newTab);
              // Si on passe en mode Simple, on efface la config expert
              // pour que l'enregistrement depuis Simple ne garde pas les champs experts
              if (newTab === "simple") {
                setDetectedConfig(null);
                setExpertFields({});
              }
            }}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="simple" disabled={isReadOnly}>
                {t('settings.sunshinePresets.simple')}
              </TabsTrigger>
              <TabsTrigger value="expert" disabled={isReadOnly}>
                {t('settings.sunshinePresets.expert')}
              </TabsTrigger>
            </TabsList>

            {/* === MODE SIMPLE === */}
            <TabsContent value="simple" className="mt-4">
              <SimplePresetForm
                name={name}
                onNameChange={handleNameChange}
                nameError={errors.name}
                selectedScreenId={selectedScreenId}
                onScreenChange={setSelectedScreenId}
                availableScreens={availableScreens}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                resolutionStrategy={resolutionStrategy}
                onResolutionStrategyChange={setResolutionStrategy}
                manualResolution={manualResolution}
                onManualResolutionChange={setManualResolution}
                manualRefreshRate={manualRefreshRate}
                onManualRefreshRateChange={setManualRefreshRate}
                fps={fps}
                onFpsChange={setFps}
                bitrate={bitrate}
                onBitrateChange={setBitrate}
                encoderProfile={encoderProfile}
                onEncoderProfileChange={setEncoderProfile}
                audioMode={audioMode}
                onAudioModeChange={setAudioMode}
                audioDeviceId={audioDeviceId}
                onAudioDeviceIdChange={setAudioDeviceId}
                availableAudioDevices={availableAudioDevices}
                audioDevicesLoading={audioDevicesLoading}
                upnp={upnp}
                onUpnpChange={setUpnp}
                keyboard={keyboard}
                onKeyboardChange={setKeyboard}
                mouse={mouse}
                onMouseChange={setMouse}
                gamepad={gamepad}
                onGamepadChange={setGamepad}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            {/* === MODE EXPERT === */}
            <TabsContent value="expert" className="mt-4">
              <ExpertPresetForm
                name={name}
                onNameChange={handleNameChange}
                nameError={errors.name}
                selectedScreenId={selectedScreenId}
                onScreenChange={setSelectedScreenId}
                availableScreens={availableScreens}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                resolutionStrategy={resolutionStrategy}
                onResolutionStrategyChange={setResolutionStrategy}
                manualResolution={manualResolution}
                onManualResolutionChange={setManualResolution}
                manualRefreshRate={manualRefreshRate}
                onManualRefreshRateChange={setManualRefreshRate}
                fps={fps}
                onFpsChange={setFps}
                bitrate={bitrate}
                onBitrateChange={setBitrate}
                audioMode={audioMode}
                onAudioModeChange={setAudioMode}
                audioDeviceId={audioDeviceId}
                onAudioDeviceIdChange={setAudioDeviceId}
                availableAudioDevices={availableAudioDevices}
                audioDevicesLoading={audioDevicesLoading}
                upnp={upnp}
                onUpnpChange={setUpnp}
                keyboard={keyboard}
                onKeyboardChange={setKeyboard}
                mouse={mouse}
                onMouseChange={setMouse}
                gamepad={gamepad}
                onGamepadChange={setGamepad}
                detectedConfig={detectedConfig}
                onDetectedConfigChange={setDetectedConfig}
                expertFields={expertFields}
                onExpertFieldsChange={setExpertFields}
                isReadOnly={isReadOnly}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t border-white/10">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isReadOnly}>
            {isEditing ? t('common.save') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
