// SimplePresetForm.tsx - Formulaire Mode Simple pour preset Sunshine
// Story 5.1: Sous-composant extrait de SunshinePresetDialog

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../common/ui/input";
import { Switch } from "../../common/ui/switch";
import { Slider } from "../../common/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../common/ui/select";
import type {
  DisplayMode,
  ResolutionStrategy,
  StreamFPS,
  AudioMode,
  EncoderProfile,
  Resolution,
  RefreshRate,
} from "@domain/types";
import {
  STANDARD_RESOLUTIONS,
  AVAILABLE_REFRESH_RATES,
} from "@domain/types";

// Keys for iteration (modes are used as translation keys)
const DISPLAY_MODES: DisplayMode[] = ["standard", "check", "enable", "enable-primary", "focus"];
const RESOLUTION_STRATEGIES: ResolutionStrategy[] = ["moonlight", "preset", "manual"];
const AUDIO_MODES: AudioMode[] = ["moonlight", "pc", "both"];
const ENCODER_PROFILES: EncoderProfile[] = ["low_latency", "balanced", "quality"];

interface AvailableScreen {
  id: string;
  name: string;
  type: "eclipse" | "physical" | "preset";
  deviceId?: string; // Device ID Sunshine pour output_name
}

interface AudioDevice {
  id: string;
  name: string;
}

interface SimplePresetFormProps {
  // Nom
  name: string;
  onNameChange: (value: string) => void;
  nameError?: string;

  // Écran
  selectedScreenId: string;
  onScreenChange: (value: string) => void;
  availableScreens: AvailableScreen[];

  // Display
  displayMode: DisplayMode;
  onDisplayModeChange: (value: DisplayMode) => void;
  resolutionStrategy: ResolutionStrategy;
  onResolutionStrategyChange: (value: ResolutionStrategy) => void;
  manualResolution: Resolution;
  onManualResolutionChange: (value: Resolution) => void;
  manualRefreshRate: RefreshRate;
  onManualRefreshRateChange: (value: RefreshRate) => void;
  fps: StreamFPS;
  onFpsChange: (value: StreamFPS) => void;
  bitrate: number;
  onBitrateChange: (value: number) => void;

  // Encoder profile (Story 12.7)
  encoderProfile: EncoderProfile;
  onEncoderProfileChange: (value: EncoderProfile) => void;

  // Audio
  audioMode: AudioMode;
  onAudioModeChange: (value: AudioMode) => void;
  audioDeviceId: string;
  onAudioDeviceIdChange: (value: string) => void;
  availableAudioDevices: AudioDevice[];
  audioDevicesLoading?: boolean;

  // Network
  upnp: boolean;
  onUpnpChange: (value: boolean) => void;

  // Inputs
  keyboard: boolean;
  onKeyboardChange: (value: boolean) => void;
  mouse: boolean;
  onMouseChange: (value: boolean) => void;
  gamepad: boolean;
  onGamepadChange: (value: boolean) => void;

  // Read-only
  isReadOnly: boolean;
}

export function SimplePresetForm({
  name,
  onNameChange,
  nameError,
  selectedScreenId,
  onScreenChange,
  availableScreens,
  displayMode,
  onDisplayModeChange,
  resolutionStrategy,
  onResolutionStrategyChange,
  manualResolution,
  onManualResolutionChange,
  manualRefreshRate,
  onManualRefreshRateChange,
  fps,
  onFpsChange,
  bitrate,
  onBitrateChange,
  encoderProfile,
  onEncoderProfileChange,
  audioMode,
  onAudioModeChange,
  audioDeviceId,
  onAudioDeviceIdChange,
  availableAudioDevices,
  audioDevicesLoading = false,
  upnp,
  onUpnpChange,
  keyboard,
  onKeyboardChange,
  mouse,
  onMouseChange,
  gamepad,
  onGamepadChange,
  isReadOnly,
}: SimplePresetFormProps) {
  const { t } = useTranslation();
  // IDs accessibles pour les labels
  const nameInputId = useId();

  const resolutionKey = `${manualResolution.width}x${manualResolution.height}`;

  const handleResolutionChange = (value: string) => {
    const found = STANDARD_RESOLUTIONS.find(
      (r) => `${r.value.width}x${r.value.height}` === value
    );
    if (found) {
      onManualResolutionChange(found.value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Nom */}
      <div className="space-y-2">
        <label htmlFor={nameInputId} className="text-[12px] font-medium text-text-primary">
          {t('dialogs.preset.name')}
        </label>
        <Input
          id={nameInputId}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('settings.sunshinePresets.namePlaceholder')}
          className={nameError ? "border-red-500" : ""}
          disabled={isReadOnly}
        />
        {nameError && (
          <p className="text-[11px] text-red-400">{nameError}</p>
        )}
      </div>

      {/* Section Écran */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {t('settings.sunshinePresets.display')}
        </h3>

        {/* Choix de l'écran */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-text-primary">
            {t('dialogs.preset.selectScreen')}
          </label>
          <Select
            value={selectedScreenId}
            onValueChange={onScreenChange}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="..." />
            </SelectTrigger>
            <SelectContent>
              {availableScreens.map((screen) => (
                <SelectItem key={screen.id} value={screen.id}>
                  {screen.name}
                  {screen.type === "eclipse" && " (VDD)"}
                  {screen.type === "physical" && ` (${t('settings.screens.typeReal')})`}
                  {screen.type === "preset" && ` (${t('settings.screens.typePreset')})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mode d'affichage */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-text-primary">
            {t('settings.sunshinePresets.mode')}
          </label>
          <Select
            value={displayMode}
            onValueChange={(v) => onDisplayModeChange(v as DisplayMode)}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISPLAY_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {t(`settings.sunshinePresets.displayModes.${mode}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stratégie de résolution (si mode actif) */}
        {displayMode !== "standard" && (
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-text-primary">
              {t('settings.screens.resolution')}
            </label>
            <Select
              value={resolutionStrategy}
              onValueChange={(v) =>
                onResolutionStrategyChange(v as ResolutionStrategy)
              }
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_STRATEGIES.map((strategy) => (
                  <SelectItem key={strategy} value={strategy}>
                    {t(`settings.sunshinePresets.resolutionStrategies.${strategy}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Champs résolution manuelle (si override manuel) */}
        {displayMode !== "standard" && resolutionStrategy === "manual" && (
          <div className="space-y-3 pl-3 border-l-2 border-corona/30">
            {/* Résolution manuelle */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-text-primary">
                {t('settings.screens.resolution')}
              </label>
              <Select
                value={resolutionKey}
                onValueChange={handleResolutionChange}
                disabled={isReadOnly}
              >
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

            {/* Refresh rate manuel */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-text-primary">
                {t('settings.screens.refreshRate')}
              </label>
              <Select
                value={manualRefreshRate.toString()}
                onValueChange={(v) =>
                  onManualRefreshRateChange(parseInt(v) as RefreshRate)
                }
                disabled={isReadOnly}
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
          </div>
        )}

        {/* FPS Minimum */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-text-primary">
              {t('settings.sunshinePresets.fpsMin')} : {fps}
            </label>
            <span className="text-[11px] font-medium text-corona">
              {fps <= 30 ? t('settings.sunshinePresets.fpsEconomy') : fps <= 60 ? t('settings.sunshinePresets.fpsStandard') : fps <= 90 ? t('settings.sunshinePresets.fpsSmooth') : t('settings.sunshinePresets.fpsUltra')}
            </span>
          </div>
          <Slider
            min={10}
            max={120}
            step={1}
            value={fps}
            onChange={(val) => onFpsChange(val as StreamFPS)}
            disabled={isReadOnly}
          />
          <div className="flex justify-between text-[10px] text-text-secondary">
            <span>10 FPS</span>
            <span>60 FPS</span>
            <span>120 FPS</span>
          </div>
        </div>

        {/* Séparateur visuel */}
        <div className="pt-2" />

        {/* Maximum Bitrate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-text-primary">
              {t('settings.sunshinePresets.bitrateMax')} : {bitrate} Mbps
            </label>
            <span className="text-[11px] font-medium text-corona">
              {bitrate <= 15 ? t('settings.sunshinePresets.bitrateEco') : bitrate <= 35 ? t('settings.sunshinePresets.bitrateStable') : bitrate <= 70 ? t('settings.sunshinePresets.bitrateHd') : t('settings.sunshinePresets.bitrateUltra')}
            </span>
          </div>
          <Slider
            min={5}
            max={120}
            step={1}
            value={bitrate}
            onChange={(val) => onBitrateChange(val)}
            disabled={isReadOnly}
          />
          <div className="flex justify-between text-[10px] text-text-secondary">
            <span>5 Mbps</span>
            <span>50 Mbps</span>
            <span>120 Mbps</span>
          </div>
        </div>

        {/* Séparateur visuel */}
        <div className="pt-2" />

        {/* Profil d'encodage (Story 12.7) */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-text-primary">
            {t('settings.sunshinePresets.encoderProfile')}
          </label>
          <Select
            value={encoderProfile}
            onValueChange={(v) => onEncoderProfileChange(v as EncoderProfile)}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENCODER_PROFILES.map((profile) => (
                <SelectItem key={profile} value={profile}>
                  {t(`settings.sunshinePresets.encoderProfiles.${profile}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-text-secondary">
            {t(`settings.sunshinePresets.encoderProfiles.${encoderProfile}_desc`)}
          </p>
        </div>
      </div>

      {/* Section Audio */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {t('settings.sunshinePresets.audio')}
        </h3>

        <div className="space-y-2">
          <label className="text-[12px] font-medium text-text-primary">
            {t('settings.sunshinePresets.audio')}
          </label>
          <Select
            value={audioMode}
            onValueChange={(v) => onAudioModeChange(v as AudioMode)}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIO_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {t(`settings.sunshinePresets.audioModes.${mode}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sélection périphérique audio (tous modes sauf PC Only) */}
        {audioMode !== "pc" && (
          <div className="space-y-2 pl-3 border-l-2 border-corona/30">
            <label className="text-[12px] font-medium text-text-primary">
              {t('settings.sunshinePresets.audio')}
            </label>
            <Select
              value={audioDeviceId || "default"}
              onValueChange={onAudioDeviceIdChange}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  {audioMode === "moonlight"
                    ? `Steam Streaming Speakers (${t('common.default').toLowerCase()})`
                    : `${t('common.default')} (système)`}
                </SelectItem>
                {availableAudioDevices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {audioDevicesLoading && (
              <p className="text-[10px] text-text-secondary animate-pulse">
                {t('common.loading')}
              </p>
            )}
            {!audioDevicesLoading && availableAudioDevices.length === 0 && (
              <p className="text-[10px] text-text-secondary">
                {t('common.default')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Section Contrôles */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {t('settings.sunshinePresets.controls')}
        </h3>

        <div className="space-y-2">
          {/* UPnP */}
          <div className="flex items-center justify-between">
            <label className="text-[12px] text-text-primary">UPnP</label>
            <Switch
              checked={upnp}
              onCheckedChange={onUpnpChange}
              disabled={isReadOnly}
            />
          </div>

          {/* Keyboard */}
          <div className="flex items-center justify-between">
            <label className="text-[12px] text-text-primary">
              {t('settings.sunshinePresets.keyboard')}
            </label>
            <Switch
              checked={keyboard}
              onCheckedChange={onKeyboardChange}
              disabled={isReadOnly}
            />
          </div>

          {/* Mouse */}
          <div className="flex items-center justify-between">
            <label className="text-[12px] text-text-primary">
              {t('settings.sunshinePresets.mouse')}
            </label>
            <Switch
              checked={mouse}
              onCheckedChange={onMouseChange}
              disabled={isReadOnly}
            />
          </div>

          {/* Gamepad */}
          <div className="flex items-center justify-between">
            <label className="text-[12px] text-text-primary">
              {t('settings.sunshinePresets.gamepad')}
            </label>
            <Switch
              checked={gamepad}
              onCheckedChange={onGamepadChange}
              disabled={isReadOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
