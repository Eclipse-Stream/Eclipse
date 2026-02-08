// Tests unitaires pour SunshinePresetApplicator - Story 12.7
// Focus: Profils d'encodage, NEUTRAL_CONFIG, presetToConfig, matchConfigToPreset

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SunshinePresetApplicator } from "./SunshinePresetApplicator";
import type { SunshinePreset } from "../../domain/types";
import { ENCODER_PROFILE_KEYS, DEFAULT_ENCODER_PROFILE } from "../../domain/types";

// Mock SunshineConfigManager (non utilisé pour ces tests unitaires)
vi.mock("./SunshineConfigManager", () => {
  return {
    SunshineConfigManager: class MockSunshineConfigManager {
      readConfig = vi.fn().mockResolvedValue({});
      writeConfig = vi.fn().mockResolvedValue({ success: true });
      deleteConfig = vi.fn().mockResolvedValue({ success: true });
      backupConfig = vi.fn().mockResolvedValue({ success: true });
    },
  };
});

/**
 * Crée un preset simple minimal pour les tests
 */
function createSimplePreset(overrides?: Partial<SunshinePreset> & { display?: Partial<SunshinePreset["display"]> }): SunshinePreset {
  return {
    id: "test-id",
    name: "Test Preset",
    type: "simple",
    display: {
      mode: "enable",
      resolutionStrategy: "moonlight",
      fps: 60,
      bitrate: 35,
      encoderProfile: "balanced",
      ...(overrides?.display ?? {}),
    },
    audio: { mode: "moonlight", ...(overrides?.audio ?? {}) },
    network: { upnp: false, ...(overrides?.network ?? {}) },
    inputs: { keyboard: true, mouse: true, gamepad: true, ...(overrides?.inputs ?? {}) },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...(overrides?.expert !== undefined ? { expert: overrides.expert } : {}),
    ...(overrides?.isReadOnly !== undefined ? { isReadOnly: overrides.isReadOnly } : {}),
  };
}

describe("SunshinePresetApplicator - Story 12.7 Encoder Profiles", () => {
  let applicator: SunshinePresetApplicator;

  beforeEach(() => {
    applicator = new SunshinePresetApplicator();
  });

  // ============================================================================
  // generateNeutralConfig - Encoder keys
  // ============================================================================
  describe("generateNeutralConfig", () => {
    it("should include all encoder keys with balanced values", () => {
      const neutral = applicator.generateNeutralConfig();
      const balancedKeys = ENCODER_PROFILE_KEYS.balanced;

      for (const [key, value] of Object.entries(balancedKeys)) {
        expect(neutral[key]).toBe(value);
      }
    });

    it("should NOT include the 'encoder' key (auto-detection preserved)", () => {
      const neutral = applicator.generateNeutralConfig();
      expect(neutral).not.toHaveProperty("encoder");
    });

    it("should still include all original simple keys", () => {
      const neutral = applicator.generateNeutralConfig();
      // Original keys from pre-12.7
      expect(neutral).toHaveProperty("output_name");
      expect(neutral).toHaveProperty("fps");
      expect(neutral).toHaveProperty("max_bitrate");
      expect(neutral).toHaveProperty("upnp");
      expect(neutral).toHaveProperty("keyboard");
      expect(neutral).toHaveProperty("mouse");
      expect(neutral).toHaveProperty("gamepad");
    });
  });

  // ============================================================================
  // presetToConfig - Encoder profile resolution
  // ============================================================================
  describe("presetToConfig - encoder profiles", () => {
    it("should resolve balanced profile to correct NVENC keys", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "balanced" } });
      const config = applicator.presetToConfig(preset);

      expect(config.nvenc_preset).toBe("3");
      expect(config.nvenc_twopass).toBe("quarter_res");
      expect(config.nvenc_spatial_aq).toBe("enabled");
      expect(config.nvenc_vbv_increase).toBe("0");
    });

    it("should resolve balanced profile to correct QSV keys", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "balanced" } });
      const config = applicator.presetToConfig(preset);

      expect(config.qsv_preset).toBe("medium");
      expect(config.qsv_coder).toBe("auto");
    });

    it("should resolve balanced profile to correct AMD keys", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "balanced" } });
      const config = applicator.presetToConfig(preset);

      expect(config.amd_usage).toBe("lowlatency_high_quality");
      expect(config.amd_rc).toBe("vbr_latency");
      expect(config.amd_quality).toBe("balanced");
      expect(config.amd_preanalysis).toBe("disabled");
      expect(config.amd_vbaq).toBe("enabled");
    });

    it("should resolve balanced profile to correct Software keys", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "balanced" } });
      const config = applicator.presetToConfig(preset);

      expect(config.sw_preset).toBe("fast");
      expect(config.sw_tune).toBe("zerolatency");
    });

    it("should resolve low_latency profile to correct keys", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "low_latency" } });
      const config = applicator.presetToConfig(preset);

      expect(config.nvenc_preset).toBe("1");
      expect(config.nvenc_twopass).toBe("disabled");
      expect(config.nvenc_spatial_aq).toBe("disabled");
      expect(config.nvenc_vbv_increase).toBe("0");
      expect(config.qsv_preset).toBe("veryfast");
      expect(config.qsv_coder).toBe("cavlc");
      expect(config.amd_usage).toBe("ultralowlatency");
      expect(config.amd_rc).toBe("vbr_latency");
      expect(config.amd_quality).toBe("speed");
      expect(config.amd_preanalysis).toBe("disabled");
      expect(config.amd_vbaq).toBe("disabled");
      expect(config.sw_preset).toBe("ultrafast");
      expect(config.sw_tune).toBe("zerolatency");
    });

    it("should resolve quality profile to correct keys", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "quality" } });
      const config = applicator.presetToConfig(preset);

      expect(config.nvenc_preset).toBe("5");
      expect(config.nvenc_twopass).toBe("full_res");
      expect(config.nvenc_spatial_aq).toBe("enabled");
      expect(config.nvenc_vbv_increase).toBe("10");
      expect(config.qsv_preset).toBe("slow");
      expect(config.qsv_coder).toBe("cabac");
      expect(config.amd_usage).toBe("transcoding");
      expect(config.amd_rc).toBe("vbr_peak");
      expect(config.amd_quality).toBe("quality");
      expect(config.amd_preanalysis).toBe("enabled");
      expect(config.amd_vbaq).toBe("enabled");
      expect(config.sw_preset).toBe("medium");
      expect(config.sw_tune).toBe("zerolatency");
    });

    it("should fallback to balanced when encoderProfile is undefined (backward compat)", () => {
      const preset = createSimplePreset();
      // Simuler un ancien preset sans encoderProfile
      delete (preset.display as Record<string, unknown>).encoderProfile;
      const config = applicator.presetToConfig(preset);

      // Doit utiliser les valeurs balanced
      expect(config.nvenc_preset).toBe("3");
      expect(config.qsv_preset).toBe("medium");
      expect(config.amd_quality).toBe("balanced");
      expect(config.sw_preset).toBe("fast");
    });

    it("should NEVER write the 'encoder' key for any profile", () => {
      const profiles = ["low_latency", "balanced", "quality"] as const;
      for (const profile of profiles) {
        const preset = createSimplePreset({ display: { encoderProfile: profile } });
        const config = applicator.presetToConfig(preset);
        expect(config).not.toHaveProperty("encoder");
      }
    });

    it("should still generate correct non-encoder fields", () => {
      const preset = createSimplePreset({
        display: { fps: 120, bitrate: 80, encoderProfile: "quality" },
      });
      const config = applicator.presetToConfig(preset);

      expect(config.fps).toBe("120");
      expect(config.max_bitrate).toBe("80");
      expect(config.dd_configuration_option).toBe("ensure_active"); // mode "enable"
    });

    it("expert fields should override encoder profile keys", () => {
      const preset = createSimplePreset({
        display: { encoderProfile: "balanced" },
        expert: { nvenc_preset: "7", amd_quality: "speed" },
      });
      const config = applicator.presetToConfig(preset);

      // Expert overrides
      expect(config.nvenc_preset).toBe("7");
      expect(config.amd_quality).toBe("speed");
      // Non-overridden keys still from balanced profile
      expect(config.qsv_preset).toBe("medium");
      expect(config.sw_preset).toBe("fast");
    });
  });

  // ============================================================================
  // matchConfigToPreset - Encoder profile matching
  // ============================================================================
  describe("matchConfigToPreset - encoder profiles", () => {
    /**
     * Crée une config sunshine.conf complète qui matche un preset balanced
     */
    function createMatchingConfig(profileOverrides?: Record<string, string>): Record<string, string> {
      return {
        output_name: "",
        dd_configuration_option: "ensure_active",
        fps: "60",
        minimum_fps_target: "60",
        max_bitrate: "35",
        dd_resolution_option: "moonlight_request",
        dd_refresh_rate_option: "moonlight_request",
        dd_hdr_option: "disabled",
        upnp: "disabled",
        keyboard: "enabled",
        mouse: "enabled",
        gamepad: "enabled",
        // Balanced encoder keys
        ...ENCODER_PROFILE_KEYS.balanced,
        ...profileOverrides,
      };
    }

    it("should match when config has correct balanced encoder keys", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "balanced" } });
      const config = createMatchingConfig();

      const result = applicator.matchConfigToPreset(config, preset);
      expect(result.matches).toBe(true);
    });

    it("should NOT match when encoder keys differ from preset profile", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "quality" } });
      // Config has balanced values but preset expects quality
      const config = createMatchingConfig();

      const result = applicator.matchConfigToPreset(config, preset);
      expect(result.matches).toBe(false);
      expect(result.mismatches).toBeDefined();
      expect(result.mismatches!.length).toBeGreaterThan(0);
    });

    it("should match quality preset with quality encoder keys in config", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "quality" } });
      const config = createMatchingConfig(ENCODER_PROFILE_KEYS.quality);

      const result = applicator.matchConfigToPreset(config, preset);
      expect(result.matches).toBe(true);
    });

    it("should match low_latency preset with low_latency encoder keys in config", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "low_latency" } });
      const config = createMatchingConfig(ENCODER_PROFILE_KEYS.low_latency);

      const result = applicator.matchConfigToPreset(config, preset);
      expect(result.matches).toBe(true);
    });

    it("should not match when a single encoder key differs", () => {
      const preset = createSimplePreset({ display: { encoderProfile: "balanced" } });
      const config = createMatchingConfig({ nvenc_preset: "5" }); // Quality value in balanced context

      const result = applicator.matchConfigToPreset(config, preset);
      expect(result.matches).toBe(false);
    });

    it("should use balanced as fallback for preset without encoderProfile", () => {
      const preset = createSimplePreset();
      delete (preset.display as Record<string, unknown>).encoderProfile;
      const config = createMatchingConfig(); // balanced values

      const result = applicator.matchConfigToPreset(config, preset);
      expect(result.matches).toBe(true);
    });
  });

  // ============================================================================
  // Non-regression: existing fields untouched
  // ============================================================================
  describe("Non-regression", () => {
    it("audio mode moonlight should still use __DELETE__ markers", () => {
      const preset = createSimplePreset({
        display: { encoderProfile: "balanced" },
      });
      const config = applicator.presetToConfig(preset);

      expect(config.audio_sink).toBe("__DELETE__");
      expect(config.virtual_sink).toBe("__DELETE__");
    });

    it("display mode should still map correctly", () => {
      const modes = [
        { mode: "standard" as const, expected: "disabled" },
        { mode: "enable" as const, expected: "ensure_active" },
        { mode: "enable-primary" as const, expected: "ensure_primary" },
        { mode: "focus" as const, expected: "ensure_only" },
      ];

      for (const { mode, expected } of modes) {
        const preset = createSimplePreset({ display: { mode, encoderProfile: "balanced" } });
        const config = applicator.presetToConfig(preset);
        expect(config.dd_configuration_option).toBe(expected);
      }
    });

    it("network upnp should still map correctly", () => {
      const presetOn = createSimplePreset({ network: { upnp: true } });
      const presetOff = createSimplePreset({ network: { upnp: false } });

      expect(applicator.presetToConfig(presetOn).upnp).toBe("enabled");
      expect(applicator.presetToConfig(presetOff).upnp).toBe("disabled");
    });

    it("inputs should still map correctly", () => {
      const preset = createSimplePreset({
        inputs: { keyboard: false, mouse: true, gamepad: false },
      });
      const config = applicator.presetToConfig(preset);

      expect(config.keyboard).toBe("disabled");
      expect(config.mouse).toBe("enabled");
      expect(config.gamepad).toBe("disabled");
    });
  });
});
