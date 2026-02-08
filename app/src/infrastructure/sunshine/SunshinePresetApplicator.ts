// Infrastructure Layer - Sunshine Preset Applicator
// Story 5.5: Gère l'application des presets avec stratégie Flush + Apply

import { SunshineConfigManager } from "./SunshineConfigManager";
import type { SunshinePreset, ExpertConfig } from "../../domain/types";
import { ENCODER_PROFILE_KEYS, DEFAULT_ENCODER_PROFILE } from "../../domain/types";

/**
 * Clés de configuration Sunshine SIMPLES avec leurs valeurs par défaut (neutres)
 * Ces valeurs sont ÉCRITES lors du "Flush" pour nettoyer la config
 */
const NEUTRAL_CONFIG: Record<string, string> = {
  // Video/Display
  output_name: "",
  fps: "60",
  minimum_fps_target: "0",
  // Display Configuration
  dd_configuration_option: "disabled",
  dd_resolution_option: "moonlight_request", // "moonlight_request" = Use client resolution (Moonlight request)
  dd_refresh_rate_option: "moonlight_request", // "moonlight_request" = Use client refresh rate (Moonlight request)
  dd_hdr_option: "disabled", // "disabled" = Do not change HDR settings (off by default)
  // Audio
  audio_sink: "",
  virtual_sink: "",
  // Network
  upnp: "enabled",
  // Inputs
  key_rightalt_to_key_win: "disabled",
  keyboard: "enabled",
  mouse: "enabled",
  gamepad: "enabled",
  // Bitrate
  max_bitrate: "35",
  // Encoder - Profil "balanced" par défaut (Story 12.7)
  // NVENC
  nvenc_preset: "3",
  nvenc_twopass: "quarter_res",
  nvenc_spatial_aq: "enabled",
  nvenc_vbv_increase: "0",
  // QSV
  qsv_preset: "medium",
  qsv_coder: "auto",
  // AMD
  amd_usage: "lowlatency_high_quality",
  amd_rc: "vbr_latency",
  amd_quality: "balanced",
  amd_preanalysis: "disabled",
  amd_vbaq: "enabled",
  // Software
  sw_preset: "fast",
  sw_tune: "zerolatency",
};

/**
 * Clés PROTÉGÉES = jamais touchées par les presets
 * Ces clés sont des paramètres "système" qui ne font pas partie de la config streaming
 * Elles sont préservées lors du flush et ne sont jamais écrites par les presets
 */
const PROTECTED_KEYS = new Set([
  // Identité du serveur (nom affiché dans Moonlight)
  "sunshine_name",
  // Credentials et sécurité (jamais touchés)
  "credentials_file",
  "file_state",
  "key_dir",
  "cert",
  "pkey",
  // Ports réseau (configuration une fois, ne change pas)
  "port",
  "https_port",
  // Logging
  "log_path",
  "min_log_level",
  // Bug Fix 7: System tray doit rester désactivé (Eclipse gère les notifications)
  "system_tray",
]);

/**
 * Clés SIMPLES = gérées par le formulaire simple
 * Toutes les autres clés sont considérées comme EXPERT
 * et seront supprimées lors du FLUSH (sauf si le preset expert les définit)
 */
const SIMPLE_FIELDS = new Set([
  // Écran/Display
  "output_name",
  "dd_configuration_option",
  "dd_resolution_option",
  "dd_refresh_rate_option",
  "dd_manual_resolution",
  "dd_manual_refresh_rate",
  "dd_hdr_option", // HDR mode control
  // FPS/Bitrate
  "fps",
  "minimum_fps_target",
  "max_bitrate",
  // Audio
  "audio_sink",
  "virtual_sink",
  // Réseau
  "upnp",
  // Inputs
  "keyboard",
  "mouse",
  "gamepad",
  "key_rightalt_to_key_win",
  // Encoder keys (Story 12.7)
  "nvenc_preset",
  "nvenc_twopass",
  "nvenc_spatial_aq",
  "nvenc_vbv_increase",
  "qsv_preset",
  "qsv_coder",
  "amd_usage",
  "amd_rc",
  "amd_quality",
  "amd_preanalysis",
  "amd_vbaq",
  "sw_preset",
  "sw_tune",
]);

/**
 * Mapping des modes audio vers les valeurs de configuration Sunshine
 * Logique récupérée de Archive_V1:
 * 
 * - moonlight: Son sur TV/Moonlight UNIQUEMENT
 *   → audio_sink = "" (pas de capture du son PC)
 *   → virtual_sink = {ID du périphérique virtuel sélectionné} (Steam Speakers, etc.)
 *   → Le son est routé vers le périphérique virtuel qui est capturé par Sunshine
 * 
 * - pc: Son sur PC UNIQUEMENT (pas de son sur Moonlight)
 *   → audio_sink = "0" (désactive la capture audio)
 *   → virtual_sink = "0" (désactive le sink virtuel)
 * 
 * - both: Son sur PC ET TV/Moonlight
 *   → audio_sink = {ID du périphérique PC sélectionné} (le son PC continue)
 *   → virtual_sink = "0" (Sunshine utilise le son système)
 */

/**
 * Mapping des display modes vers dd_configuration_option
 */
const DISPLAY_MODE_CONFIG: Record<string, string> = {
  standard: "disabled", // Mode auto par défaut
  check: "verify_only",
  enable: "ensure_active",
  "enable-primary": "ensure_primary",
  focus: "ensure_only",
};

/**
 * Résultat de l'application d'un preset
 */
export interface ApplyPresetResult {
  success: boolean;
  error?: string;
  phase?: "flush" | "apply" | "write" | "restart";
}

/**
 * Résultat de la comparaison config/preset
 */
export interface PresetMatchResult {
  matches: boolean;
  presetId: string;
  presetName: string;
  /** Champs qui ne correspondent pas (pour debug) */
  mismatches?: string[];
}

/**
 * Mapping inverse: dd_configuration_option -> display mode
 */
const CONFIG_TO_DISPLAY_MODE: Record<string, string> = {
  disabled: "enable", // "disabled" dans Sunshine = mode "enable" dans Eclipse
  verify_only: "check",
  ensure_active: "enable",
  ensure_primary: "enable-primary",
  ensure_only: "focus",
};

/**
 * Options pour l'application d'un preset
 */
export interface ApplyPresetOptions {
  /** Config actuelle lue (pour l'option "Garder config détectée") */
  currentConfig?: Record<string, string>;
  /** Redémarrer Sunshine après application */
  restartSunshine?: boolean;
}

/**
 * SunshinePresetApplicator
 * Implémente la stratégie Flush + Apply pour l'application des presets
 */
export class SunshinePresetApplicator {
  private configManager: SunshineConfigManager;

  constructor(configManager?: SunshineConfigManager) {
    this.configManager = configManager ?? new SunshineConfigManager();
  }

  /**
   * Génère une configuration "neutre" (Flush)
   * Toutes les clés connues sont réinitialisées à leurs valeurs par défaut
   */
  generateNeutralConfig(): Record<string, string> {
    return { ...NEUTRAL_CONFIG };
  }

  /**
   * Convertit un preset en configuration Sunshine
   * @param preset - Le preset à convertir
   * @param currentConfig - Config actuelle (pour les champs "keep")
   */
  presetToConfig(
    preset: SunshinePreset,
    currentConfig?: Record<string, string>
  ): Record<string, string> {
    const config: Record<string, string> = {};

    // === DISPLAY ===
    // Device ID de l'écran sélectionné -> output_name
    if (preset.display.deviceId) {
      config.output_name = preset.display.deviceId;
    }

    // Display mode -> dd_configuration_option
    config.dd_configuration_option = DISPLAY_MODE_CONFIG[preset.display.mode] || "disabled";

    // Résolution strategy
    // - "moonlight" → client_resolution (Sunshine utilise ce que Moonlight demande)
    // - "preset" → manual avec la résolution du preset d'écran (stockée dans manualResolution)
    // - "manual" → manual + valeurs manuelles (Sunshine force la résolution spécifiée)
    //
    // Note: Pour "preset", le Dialog récupère la résolution de l'écran sélectionné
    // et la stocke dans manualResolution. Ainsi Sunshine et MultiMonitorTool sont synchronisés.
    const needsManualResolution =
      (preset.display.resolutionStrategy === "manual" || preset.display.resolutionStrategy === "preset") &&
      preset.display.manualResolution;

    if (needsManualResolution) {
      config.dd_resolution_option = "manual";
      config.dd_manual_resolution = `${preset.display.manualResolution!.width}x${preset.display.manualResolution!.height}`;
    } else {
      // Moonlight request: "moonlight_request" = Use client resolution (what Moonlight asks for)
      // This is the correct default for Eclipse - let the client decide
      config.dd_resolution_option = "moonlight_request";
      // IMPORTANT: Supprimer dd_manual_resolution pour éviter que l'ancienne valeur persiste
      config.dd_manual_resolution = "__DELETE__";
    }

    // Refresh rate strategy (même logique)
    const needsManualRefreshRate =
      (preset.display.resolutionStrategy === "manual" || preset.display.resolutionStrategy === "preset") &&
      preset.display.manualRefreshRate;

    if (needsManualRefreshRate) {
      config.dd_refresh_rate_option = "manual";
      config.dd_manual_refresh_rate = preset.display.manualRefreshRate!.toString();
    } else {
      // Moonlight request: "moonlight_request" = Use client refresh rate (what Moonlight asks for)
      // This is the correct default for Eclipse - let the client decide
      config.dd_refresh_rate_option = "moonlight_request";
      // IMPORTANT: Supprimer dd_manual_refresh_rate pour éviter que l'ancienne valeur persiste
      config.dd_manual_refresh_rate = "__DELETE__";
    }

    // === HDR ===
    // By default, HDR is disabled ("disabled" = do not change HDR settings)
    // This prevents unwanted HDR activation on systems that don't support it well
    config.dd_hdr_option = "disabled";

    // FPS - deux clés pour compatibilité:
    // - fps: clé legacy/custom détectée dans ta config
    // - minimum_fps_target: clé officielle affichée dans l'UI web Sunshine
    config.fps = preset.display.fps.toString();
    config.minimum_fps_target = preset.display.fps.toString();
    
    // Bitrate
    config.max_bitrate = preset.display.bitrate.toString();

    // === ENCODER PROFILE (Story 12.7) ===
    // Résoudre le profil d'encodage → clés Sunshine spécifiques
    // Fallback vers "balanced" si le preset n'a pas de profil (ancien preset)
    const profile = preset.display.encoderProfile ?? DEFAULT_ENCODER_PROFILE;
    const encoderKeys = ENCODER_PROFILE_KEYS[profile];
    for (const [key, value] of Object.entries(encoderKeys)) {
      config[key] = value;
    }

    // === AUDIO ===
    // Logique récupérée de Archive_V1
    switch (preset.audio.mode) {
      case "moonlight":
        // Son sur Moonlight/TV UNIQUEMENT (mode par défaut de Sunshine)
        // On ne met PAS audio_sink et virtual_sink dans la config
        // Sunshine utilise son comportement par défaut quand ces clés sont absentes
        // IMPORTANT: On marque ces clés pour suppression avec une valeur spéciale
        config.audio_sink = "__DELETE__";
        config.virtual_sink = "__DELETE__";
        break;
      case "pc":
        // Son sur PC UNIQUEMENT (pas de son sur Moonlight)
        // audio_sink = "0" et virtual_sink = "0" → désactive la capture audio
        config.audio_sink = "0";
        config.virtual_sink = "0";
        break;
      case "both":
        // Son sur PC ET Moonlight/TV
        // audio_sink = ID du périphérique PC sélectionné, virtual_sink = "0"
        config.audio_sink = preset.audio.deviceId || "";
        config.virtual_sink = "0";
        break;
    }

    // === NETWORK ===
    config.upnp = preset.network.upnp ? "enabled" : "disabled";

    // === INPUTS ===
    config.keyboard = preset.inputs.keyboard ? "enabled" : "disabled";
    config.mouse = preset.inputs.mouse ? "enabled" : "disabled";
    config.gamepad = preset.inputs.gamepad ? "enabled" : "disabled";

    // Expert fields (raw config)
    if (preset.expert) {
      this.applyExpertConfig(config, preset.expert, currentConfig);
    }

    return config;
  }

  /**
   * Applique les champs expert à la config
   * Gère l'option "keep" pour conserver les valeurs actuelles
   */
  private applyExpertConfig(
    config: Record<string, string>,
    expert: ExpertConfig,
    currentConfig?: Record<string, string>
  ): void {
    for (const [key, value] of Object.entries(expert)) {
      if (value === undefined || value === null) continue;

      // Si la valeur est "__KEEP__", conserver la valeur actuelle
      if (value === "__KEEP__" && currentConfig) {
        if (currentConfig[key]) {
          config[key] = currentConfig[key];
        }
        // Si pas de valeur actuelle, on n'ajoute pas la clé
        continue;
      }

      // Sinon, convertir en string et ajouter
      config[key] = String(value);
    }
  }

  /**
   * Applique un preset avec la stratégie Flush + Apply
   *
   * Flow:
   * 1. FLUSH: Supprimer les clés expert + écrire config neutre simple
   * 2. APPLY: Surcharger avec les valeurs du preset
   * 3. WRITE: Écrire chaque clé dans sunshine.conf
   *
   * @param preset - Le preset à appliquer
   * @param options - Options d'application
   */
  async applyPreset(
    preset: SunshinePreset,
    options: ApplyPresetOptions = {}
  ): Promise<ApplyPresetResult> {
    const { currentConfig } = options;

    try {
      console.log(`[PresetApplicator] Applying preset: ${preset.name}`);

      // Backup avant modifications
      const backupResult = await this.configManager.backupConfig();
      if (!backupResult.success) {
        console.warn("[PresetApplicator] Backup failed, continuing anyway:", backupResult.error);
      }

      // 1. DETECT: Lire la config actuelle de Sunshine
      console.log("[PresetApplicator] Phase: DETECT - Reading current config");
      const existingConfig = await this.configManager.readConfig();
      console.log(`[PresetApplicator] Found ${Object.keys(existingConfig).length} keys in sunshine.conf`);

      // 2. FLUSH Phase A: SUPPRIMER les clés EXPERT détectées
      // Une clé est expert si elle n'est pas dans SIMPLE_FIELDS
      // IMPORTANT: Ne jamais toucher aux clés PROTÉGÉES (sunshine_name, credentials, etc.)
      console.log("[PresetApplicator] Phase: FLUSH - Deleting expert keys (preserving protected keys)");
      const expertKeysToDelete = Object.keys(existingConfig).filter(
        (key) => !SIMPLE_FIELDS.has(key) && !PROTECTED_KEYS.has(key)
      );
      console.log(`[PresetApplicator] Expert keys to delete: ${expertKeysToDelete.join(", ") || "(none)"}`);

      // Log les clés protégées trouvées (pour debug)
      const protectedKeysFound = Object.keys(existingConfig).filter((key) => PROTECTED_KEYS.has(key));
      if (protectedKeysFound.length > 0) {
        console.log(`[PresetApplicator] Protected keys preserved: ${protectedKeysFound.join(", ")}`);
      }

      for (const key of expertKeysToDelete) {
        const deleteResult = await this.configManager.deleteConfig(key);
        if (!deleteResult.success) {
          console.warn(`[PresetApplicator] Failed to delete ${key}:`, deleteResult.error);
          // On continue quand même
        }
      }

      // 2. FLUSH Phase B: Écrire les valeurs neutres pour les clés simples
      console.log("[PresetApplicator] Phase: FLUSH - Writing neutral config");
      const neutralConfig = this.generateNeutralConfig();

      // 3. APPLY: Surcharger avec les valeurs du preset
      console.log("[PresetApplicator] Phase: APPLY - Merging preset values");
      const presetConfig = this.presetToConfig(preset, currentConfig);
      const finalConfig = { ...neutralConfig, ...presetConfig };

      // 4. WRITE: Écrire chaque clé dans sunshine.conf
      console.log("[PresetApplicator] Phase: WRITE - Writing to sunshine.conf");

      // Écrire chaque clé
      for (const [key, value] of Object.entries(finalConfig)) {
        // Si la valeur est "__DELETE__", supprimer la clé du fichier config
        // Utilisé pour le mode Moonlight Only où les clés audio doivent être absentes
        if (value === "__DELETE__") {
          const deleteResult = await this.configManager.deleteConfig(key);
          if (!deleteResult.success) {
            console.warn(`[PresetApplicator] Failed to delete ${key}:`, deleteResult.error);
            // On continue quand même, ce n'est pas critique
          }
          continue;
        }

        // Skip les valeurs vides (sauf si explicitement défini dans NEUTRAL_CONFIG)
        if (value === "" && !NEUTRAL_CONFIG.hasOwnProperty(key)) continue;

        const writeResult = await this.configManager.writeConfig(key, value);
        if (!writeResult.success) {
          console.error(`[PresetApplicator] Failed to write ${key}:`, writeResult.error);
          return {
            success: false,
            error: `Erreur lors de l'écriture de ${key}: ${writeResult.error}`,
            phase: "write",
          };
        }
      }

      console.log(`[PresetApplicator] Preset "${preset.name}" applied successfully`);

      // Note: Le restart est géré par le handler IPC (pas ici)
      // car il nécessite le ProcessManager qui est dans le main process

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[PresetApplicator] Error:", error);
      return {
        success: false,
        error: errorMessage,
        phase: "apply",
      };
    }
  }

  /**
   * Compare une configuration Sunshine avec un preset pour voir s'ils correspondent
   * Utilisé pour détecter quel preset est actuellement actif
   *
   * La comparaison porte sur les champs CRITIQUES:
   * - output_name (écran)
   * - dd_configuration_option (mode display)
   * - fps ou minimum_fps_target
   * - max_bitrate
   *
   * @param config - Configuration Sunshine actuelle
   * @param preset - Preset à comparer
   * @returns true si la config correspond au preset
   */
  matchConfigToPreset(
    config: Record<string, string>,
    preset: SunshinePreset
  ): PresetMatchResult {
    const mismatches: string[] = [];

    // 1. Comparer output_name (écran)
    const configOutputName = config.output_name || "";
    const presetOutputName = preset.display.deviceId || "";
    if (configOutputName !== presetOutputName) {
      mismatches.push(`output_name: "${configOutputName}" vs "${presetOutputName}"`);
    }

    // 2. Comparer display mode (dd_configuration_option)
    const configMode = config.dd_configuration_option || "disabled";
    const expectedMode = DISPLAY_MODE_CONFIG[preset.display.mode] || "disabled";
    if (configMode !== expectedMode) {
      mismatches.push(`dd_configuration_option: "${configMode}" vs "${expectedMode}"`);
    }

    // 3. Comparer FPS (peut être dans fps ou minimum_fps_target)
    const configFps = config.fps || config.minimum_fps_target || "60";
    const presetFps = preset.display.fps.toString();
    if (configFps !== presetFps) {
      mismatches.push(`fps: "${configFps}" vs "${presetFps}"`);
    }

    // 4. Comparer bitrate
    const configBitrate = config.max_bitrate || "35";
    const presetBitrate = preset.display.bitrate.toString();
    if (configBitrate !== presetBitrate) {
      mismatches.push(`max_bitrate: "${configBitrate}" vs "${presetBitrate}"`);
    }

    // 4b. Comparer resolution strategy (dd_resolution_option)
    const configResOption = config.dd_resolution_option || "moonlight_request";
    const needsManualRes = (preset.display.resolutionStrategy === "manual" || preset.display.resolutionStrategy === "preset") && preset.display.manualResolution;
    const expectedResOption = needsManualRes ? "manual" : "moonlight_request";
    if (configResOption !== expectedResOption) {
      mismatches.push(`dd_resolution_option: "${configResOption}" vs "${expectedResOption}"`);
    }

    // 4c. Comparer refresh rate strategy (dd_refresh_rate_option)
    const configRefreshOption = config.dd_refresh_rate_option || "moonlight_request";
    const needsManualRefresh = (preset.display.resolutionStrategy === "manual" || preset.display.resolutionStrategy === "preset") && preset.display.manualRefreshRate;
    const expectedRefreshOption = needsManualRefresh ? "manual" : "moonlight_request";
    if (configRefreshOption !== expectedRefreshOption) {
      mismatches.push(`dd_refresh_rate_option: "${configRefreshOption}" vs "${expectedRefreshOption}"`);
    }

    // 4d. Comparer HDR (dd_hdr_option) - Eclipse Default = disabled
    const configHdr = config.dd_hdr_option || "auto";
    // Pour l'instant, tous nos presets utilisent "disabled" (ne pas changer HDR)
    const expectedHdr = "disabled";
    if (configHdr !== expectedHdr) {
      mismatches.push(`dd_hdr_option: "${configHdr}" vs "${expectedHdr}"`);
    }

    // 4e. Comparer audio mode
    const configAudioSink = config.audio_sink || "";
    const configVirtualSink = config.virtual_sink || "";
    
    // Déterminer le mode audio attendu selon le preset
    let expectedAudioSink = "";
    let expectedVirtualSink = "";
    switch (preset.audio.mode) {
      case "moonlight":
        // Audio sur Moonlight seulement = pas de sink configuré
        expectedAudioSink = "";
        expectedVirtualSink = "";
        break;
      case "pc":
        // Audio sur PC seulement
        expectedAudioSink = "0";
        expectedVirtualSink = "0";
        break;
      case "both":
        // Audio sur les deux
        expectedAudioSink = preset.audio.deviceId || "";
        expectedVirtualSink = "0";
        break;
    }
    
    if (configAudioSink !== expectedAudioSink) {
      mismatches.push(`audio_sink: "${configAudioSink}" vs "${expectedAudioSink}"`);
    }
    if (configVirtualSink !== expectedVirtualSink) {
      mismatches.push(`virtual_sink: "${configVirtualSink}" vs "${expectedVirtualSink}"`);
    }

    // 5. Comparer upnp
    const configUpnp = config.upnp || "enabled";
    const presetUpnp = preset.network.upnp ? "enabled" : "disabled";
    if (configUpnp !== presetUpnp) {
      mismatches.push(`upnp: "${configUpnp}" vs "${presetUpnp}"`);
    }

    // 6. Comparer inputs
    const configKeyboard = config.keyboard || "enabled";
    const presetKeyboard = preset.inputs.keyboard ? "enabled" : "disabled";
    if (configKeyboard !== presetKeyboard) {
      mismatches.push(`keyboard: "${configKeyboard}" vs "${presetKeyboard}"`);
    }

    const configMouse = config.mouse || "enabled";
    const presetMouse = preset.inputs.mouse ? "enabled" : "disabled";
    if (configMouse !== presetMouse) {
      mismatches.push(`mouse: "${configMouse}" vs "${presetMouse}"`);
    }

    const configGamepad = config.gamepad || "enabled";
    const presetGamepad = preset.inputs.gamepad ? "enabled" : "disabled";
    if (configGamepad !== presetGamepad) {
      mismatches.push(`gamepad: "${configGamepad}" vs "${presetGamepad}"`);
    }

    // 7. Comparer encoder profile (Story 12.7)
    const presetProfile = preset.display.encoderProfile ?? DEFAULT_ENCODER_PROFILE;
    const expectedEncoderKeys = ENCODER_PROFILE_KEYS[presetProfile];
    for (const [key, expectedValue] of Object.entries(expectedEncoderKeys)) {
      const configValue = config[key] || "";
      if (configValue !== expectedValue) {
        mismatches.push(`${key}: "${configValue}" vs "${expectedValue}"`);
      }
    }

    const matches = mismatches.length === 0;

    if (!matches) {
      console.log(`[PresetApplicator] Preset "${preset.name}" mismatches:`, mismatches);
    }

    return {
      matches,
      presetId: preset.id,
      presetName: preset.name,
      mismatches: matches ? undefined : mismatches,
    };
  }

  /**
   * Trouve TOUS les presets qui correspondent à une configuration Sunshine
   * @param config - Configuration Sunshine actuelle
   * @param presets - Liste des presets à comparer
   * @returns Liste des IDs des presets correspondants
   */
  findAllMatchingPresets(
    config: Record<string, string>,
    presets: SunshinePreset[]
  ): string[] {
    console.log("[PresetApplicator] Finding all matching presets for current config...");

    const matchingIds: string[] = [];

    for (const preset of presets) {
      const result = this.matchConfigToPreset(config, preset);
      if (result.matches) {
        console.log(`[PresetApplicator] Found matching preset: ${preset.name}`);
        matchingIds.push(preset.id);
      }
    }

    console.log(`[PresetApplicator] Total matching presets: ${matchingIds.length}`);
    return matchingIds;
  }

  /**
   * Trouve le preset qui correspond à une configuration Sunshine
   * Si plusieurs presets correspondent, retourne le premier
   * @param config - Configuration Sunshine actuelle
   * @param presets - Liste des presets à comparer
   * @returns L'ID du preset correspondant, ou null si aucun ne correspond
   * @deprecated Utiliser findAllMatchingPresets pour gérer les cas de plusieurs presets
   */
  findMatchingPreset(
    config: Record<string, string>,
    presets: SunshinePreset[]
  ): string | null {
    const matchingIds = this.findAllMatchingPresets(config, presets);
    return matchingIds.length > 0 ? matchingIds[0] : null;
  }

  /**
   * Écrit une configuration complète dans sunshine.conf
   * Utilisé pour le mode Expert avec import direct
   */
  async writeFullConfig(config: Record<string, string>): Promise<ApplyPresetResult> {
    try {
      // Backup d'abord
      await this.configManager.backupConfig();

      for (const [key, value] of Object.entries(config)) {
        const result = await this.configManager.writeConfig(key, value);
        if (!result.success) {
          return {
            success: false,
            error: `Erreur lors de l'écriture de ${key}: ${result.error}`,
            phase: "write",
          };
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        phase: "write",
      };
    }
  }
}
