// Tests unitaires pour vdd.schema.ts - Epic 3
// Validation Zod des types VDD et presets

import { describe, it, expect } from "vitest";
import {
  DeviceGUIDSchema,
  ResolutionSchema,
  RefreshRateSchema,
  VirtualDisplayConfigSchema,
  PresetNameSchema,
  ScreenPresetFormSchema,
  isValidDeviceGUID,
  parseDeviceGUID,
  safeParseDeviceGUID,
} from "./vdd.schema";

describe("VDD Schema Validators - Epic 3", () => {
  // ============================================================================
  // DeviceGUIDSchema
  // ============================================================================
  describe("DeviceGUIDSchema", () => {
    it("should accept valid GUID format", () => {
      const validGuid = "{672fd6d3-da89-5032-8e0d-c1aad7572529}";
      const result = DeviceGUIDSchema.safeParse(validGuid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(validGuid);
      }
    });

    it("should accept GUID with uppercase letters", () => {
      const validGuid = "{672FD6D3-DA89-5032-8E0D-C1AAD7572529}";
      const result = DeviceGUIDSchema.safeParse(validGuid);
      expect(result.success).toBe(true);
    });

    it("should accept GUID with mixed case", () => {
      const validGuid = "{672fd6D3-Da89-5032-8e0D-c1aad7572529}";
      const result = DeviceGUIDSchema.safeParse(validGuid);
      expect(result.success).toBe(true);
    });

    it("should reject GUID without braces", () => {
      const invalidGuid = "672fd6d3-da89-5032-8e0d-c1aad7572529";
      const result = DeviceGUIDSchema.safeParse(invalidGuid);
      expect(result.success).toBe(false);
    });

    it("should reject GUID with wrong format", () => {
      const invalidGuid = "{invalid-guid}";
      const result = DeviceGUIDSchema.safeParse(invalidGuid);
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = DeviceGUIDSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject non-string values", () => {
      expect(DeviceGUIDSchema.safeParse(123).success).toBe(false);
      expect(DeviceGUIDSchema.safeParse(null).success).toBe(false);
      expect(DeviceGUIDSchema.safeParse(undefined).success).toBe(false);
      expect(DeviceGUIDSchema.safeParse({}).success).toBe(false);
    });

    it("should reject GUID with missing sections", () => {
      const invalidGuid = "{672fd6d3-da89-5032-8e0d}";
      const result = DeviceGUIDSchema.safeParse(invalidGuid);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // ResolutionSchema
  // ============================================================================
  describe("ResolutionSchema", () => {
    it("should accept valid 1080p resolution", () => {
      const result = ResolutionSchema.safeParse({ width: 1920, height: 1080 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.width).toBe(1920);
        expect(result.data.height).toBe(1080);
      }
    });

    it("should accept valid 4K resolution", () => {
      const result = ResolutionSchema.safeParse({ width: 3840, height: 2160 });
      expect(result.success).toBe(true);
    });

    it("should accept valid 8K resolution", () => {
      const result = ResolutionSchema.safeParse({ width: 7680, height: 4320 });
      expect(result.success).toBe(true);
    });

    it("should accept minimum valid resolution (640x480)", () => {
      const result = ResolutionSchema.safeParse({ width: 640, height: 480 });
      expect(result.success).toBe(true);
    });

    it("should reject resolution below minimum width", () => {
      const result = ResolutionSchema.safeParse({ width: 639, height: 480 });
      expect(result.success).toBe(false);
    });

    it("should reject resolution below minimum height", () => {
      const result = ResolutionSchema.safeParse({ width: 640, height: 479 });
      expect(result.success).toBe(false);
    });

    it("should reject resolution above maximum width", () => {
      const result = ResolutionSchema.safeParse({ width: 7681, height: 1080 });
      expect(result.success).toBe(false);
    });

    it("should reject resolution above maximum height", () => {
      const result = ResolutionSchema.safeParse({ width: 1920, height: 4321 });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer values", () => {
      const result = ResolutionSchema.safeParse({ width: 1920.5, height: 1080 });
      expect(result.success).toBe(false);
    });

    it("should reject negative values", () => {
      const result = ResolutionSchema.safeParse({ width: -1920, height: 1080 });
      expect(result.success).toBe(false);
    });

    it("should reject missing properties", () => {
      expect(ResolutionSchema.safeParse({ width: 1920 }).success).toBe(false);
      expect(ResolutionSchema.safeParse({ height: 1080 }).success).toBe(false);
      expect(ResolutionSchema.safeParse({}).success).toBe(false);
    });
  });

  // ============================================================================
  // RefreshRateSchema
  // ============================================================================
  describe("RefreshRateSchema", () => {
    it("should accept 60Hz", () => {
      const result = RefreshRateSchema.safeParse(60);
      expect(result.success).toBe(true);
    });

    it("should accept 120Hz", () => {
      const result = RefreshRateSchema.safeParse(120);
      expect(result.success).toBe(true);
    });

    it("should accept 144Hz", () => {
      const result = RefreshRateSchema.safeParse(144);
      expect(result.success).toBe(true);
    });

    it("should accept 165Hz", () => {
      const result = RefreshRateSchema.safeParse(165);
      expect(result.success).toBe(true);
    });

    it("should accept 30Hz", () => {
      const result = RefreshRateSchema.safeParse(30);
      expect(result.success).toBe(true);
    });

    it("should accept 90Hz", () => {
      const result = RefreshRateSchema.safeParse(90);
      expect(result.success).toBe(true);
    });

    it("should accept 244Hz", () => {
      const result = RefreshRateSchema.safeParse(244);
      expect(result.success).toBe(true);
    });

    it("should reject invalid refresh rates", () => {
      expect(RefreshRateSchema.safeParse(75).success).toBe(false);
      expect(RefreshRateSchema.safeParse(240).success).toBe(false);
      expect(RefreshRateSchema.safeParse(300).success).toBe(false);
    });

    it("should reject non-number values", () => {
      expect(RefreshRateSchema.safeParse("60").success).toBe(false);
      expect(RefreshRateSchema.safeParse(null).success).toBe(false);
    });
  });

  // ============================================================================
  // PresetNameSchema
  // ============================================================================
  describe("PresetNameSchema", () => {
    it("should accept valid preset name", () => {
      const result = PresetNameSchema.safeParse("TV 4K Salon");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("TV 4K Salon");
      }
    });

    it("should trim whitespace from name", () => {
      const result = PresetNameSchema.safeParse("  Steam Deck  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("Steam Deck");
      }
    });

    it("should accept minimum length name (2 chars)", () => {
      const result = PresetNameSchema.safeParse("TV");
      expect(result.success).toBe(true);
    });

    it("should accept maximum length name (30 chars)", () => {
      const result = PresetNameSchema.safeParse("A".repeat(30));
      expect(result.success).toBe(true);
    });

    it("should reject name shorter than 2 characters", () => {
      const result = PresetNameSchema.safeParse("A");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("2 caractères");
      }
    });

    it("should reject name longer than 30 characters", () => {
      const result = PresetNameSchema.safeParse("A".repeat(31));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("30 caractères");
      }
    });

    it("should reject empty string", () => {
      const result = PresetNameSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only string (trimmed to empty)", () => {
      const result = PresetNameSchema.safeParse("   ");
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // ScreenPresetFormSchema
  // ============================================================================
  describe("ScreenPresetFormSchema", () => {
    it("should accept valid preset form data", () => {
      const result = ScreenPresetFormSchema.safeParse({
        name: "TV 4K Salon",
        resolution: { width: 3840, height: 2160 },
        refreshRate: 60,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("TV 4K Salon");
        expect(result.data.resolution.width).toBe(3840);
        expect(result.data.resolution.height).toBe(2160);
        expect(result.data.refreshRate).toBe(60);
      }
    });

    it("should reject invalid name", () => {
      const result = ScreenPresetFormSchema.safeParse({
        name: "X", // Too short
        resolution: { width: 1920, height: 1080 },
        refreshRate: 60,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid resolution", () => {
      const result = ScreenPresetFormSchema.safeParse({
        name: "Valid Name",
        resolution: { width: 100, height: 100 }, // Too small
        refreshRate: 60,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid refresh rate", () => {
      const result = ScreenPresetFormSchema.safeParse({
        name: "Valid Name",
        resolution: { width: 1920, height: 1080 },
        refreshRate: 75, // Invalid
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing fields", () => {
      expect(ScreenPresetFormSchema.safeParse({}).success).toBe(false);
      expect(ScreenPresetFormSchema.safeParse({ name: "Test" }).success).toBe(false);
      expect(ScreenPresetFormSchema.safeParse({ 
        name: "Test", 
        resolution: { width: 1920, height: 1080 } 
      }).success).toBe(false);
    });
  });

  // ============================================================================
  // VirtualDisplayConfigSchema
  // ============================================================================
  describe("VirtualDisplayConfigSchema", () => {
    it("should accept valid VDD config", () => {
      const result = VirtualDisplayConfigSchema.safeParse({
        deviceGUID: "{672fd6d3-da89-5032-8e0d-c1aad7572529}",
        resolution: { width: 1920, height: 1080 },
        refreshRate: 60,
        hdrEnabled: false,
      });
      expect(result.success).toBe(true);
    });

    it("should accept VDD config with HDR enabled", () => {
      const result = VirtualDisplayConfigSchema.safeParse({
        deviceGUID: "{672fd6d3-da89-5032-8e0d-c1aad7572529}",
        resolution: { width: 3840, height: 2160 },
        refreshRate: 120,
        hdrEnabled: true,
      });
      expect(result.success).toBe(true);
    });

    it("should reject config with invalid GUID", () => {
      const result = VirtualDisplayConfigSchema.safeParse({
        deviceGUID: "invalid",
        resolution: { width: 1920, height: 1080 },
        refreshRate: 60,
        hdrEnabled: false,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================
  describe("isValidDeviceGUID", () => {
    it("should return true for valid GUID", () => {
      expect(isValidDeviceGUID("{672fd6d3-da89-5032-8e0d-c1aad7572529}")).toBe(true);
    });

    it("should return false for invalid GUID", () => {
      expect(isValidDeviceGUID("invalid")).toBe(false);
      expect(isValidDeviceGUID(null)).toBe(false);
      expect(isValidDeviceGUID(undefined)).toBe(false);
    });
  });

  describe("parseDeviceGUID", () => {
    it("should return DeviceGUID for valid input", () => {
      const guid = "{672fd6d3-da89-5032-8e0d-c1aad7572529}";
      expect(parseDeviceGUID(guid)).toBe(guid);
    });

    it("should throw for invalid input", () => {
      expect(() => parseDeviceGUID("invalid")).toThrow();
    });
  });

  describe("safeParseDeviceGUID", () => {
    it("should return DeviceGUID for valid input", () => {
      const guid = "{672fd6d3-da89-5032-8e0d-c1aad7572529}";
      expect(safeParseDeviceGUID(guid)).toBe(guid);
    });

    it("should return null for invalid input", () => {
      expect(safeParseDeviceGUID("invalid")).toBe(null);
      expect(safeParseDeviceGUID(null)).toBe(null);
      expect(safeParseDeviceGUID(undefined)).toBe(null);
    });
  });
});
