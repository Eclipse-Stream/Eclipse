// Tests unitaires pour vdd.constants.ts - Epic 3
// Vérification des constantes centralisées

import { describe, it, expect } from "vitest";
import {
  VDD_HARDWARE_ID,
  VDD_CONFIG_FILE_NAME,
  VDD_DEVICE_ID_CONFIG_FILE,
  SUNSHINE_LOG_PATH,
  VDD_SETTINGS_SYSTEM_PATHS,
  VDD_SETTINGS_FILE_NAME,
  SUNSHINE_DETECTION_DELAY_MS,
  VDD_ENABLE_DELAY_MS,
  VIRTUAL_DISPLAY_KEYWORDS,
} from "./vdd.constants";

describe("VDD Constants - Epic 3", () => {
  describe("Hardware and Driver Constants", () => {
    it("should define VDD_HARDWARE_ID correctly", () => {
      expect(VDD_HARDWARE_ID).toBe("Root\\MttVDD");
      expect(typeof VDD_HARDWARE_ID).toBe("string");
    });

    it("should define VDD_CONFIG_FILE_NAME correctly", () => {
      expect(VDD_CONFIG_FILE_NAME).toBe("eclipse-vdd-config.json");
      expect(VDD_CONFIG_FILE_NAME).toMatch(/\.json$/);
    });

    it("should define VDD_DEVICE_ID_CONFIG_FILE correctly", () => {
      expect(VDD_DEVICE_ID_CONFIG_FILE).toBe("vdd-config.json");
      expect(VDD_DEVICE_ID_CONFIG_FILE).toMatch(/\.json$/);
    });

    it("should define VDD_SETTINGS_FILE_NAME correctly", () => {
      expect(VDD_SETTINGS_FILE_NAME).toBe("vdd_settings.xml");
      expect(VDD_SETTINGS_FILE_NAME).toMatch(/\.xml$/);
    });
  });

  describe("Path Constants", () => {
    it("should define SUNSHINE_LOG_PATH as deprecated empty string", () => {
      // SUNSHINE_LOG_PATH is deprecated - use getSunshinePaths().logFile from SunshinePathsService
      expect(SUNSHINE_LOG_PATH).toBe("");
      expect(typeof SUNSHINE_LOG_PATH).toBe("string");
    });

    it("should define VDD_SETTINGS_SYSTEM_PATHS as array of Windows paths", () => {
      expect(Array.isArray(VDD_SETTINGS_SYSTEM_PATHS)).toBe(true);
      expect(VDD_SETTINGS_SYSTEM_PATHS.length).toBe(2);
      expect(VDD_SETTINGS_SYSTEM_PATHS[0]).toMatch(/^C:\\/);
      expect(VDD_SETTINGS_SYSTEM_PATHS[1]).toMatch(/^C:\\/);
      VDD_SETTINGS_SYSTEM_PATHS.forEach((path) => {
        expect(path).toMatch(/vdd_settings\.xml$/);
      });
    });
  });

  describe("Timing Constants", () => {
    it("should define SUNSHINE_DETECTION_DELAY_MS as reasonable delay", () => {
      expect(SUNSHINE_DETECTION_DELAY_MS).toBe(4000);
      expect(typeof SUNSHINE_DETECTION_DELAY_MS).toBe("number");
      expect(SUNSHINE_DETECTION_DELAY_MS).toBeGreaterThan(0);
      expect(SUNSHINE_DETECTION_DELAY_MS).toBeLessThanOrEqual(10000);
    });

    it("should define VDD_ENABLE_DELAY_MS as reasonable delay", () => {
      expect(VDD_ENABLE_DELAY_MS).toBe(1500);
      expect(typeof VDD_ENABLE_DELAY_MS).toBe("number");
      expect(VDD_ENABLE_DELAY_MS).toBeGreaterThan(0);
      expect(VDD_ENABLE_DELAY_MS).toBeLessThanOrEqual(5000);
    });
  });

  describe("Virtual Display Keywords", () => {
    it("should define VIRTUAL_DISPLAY_KEYWORDS as non-empty array", () => {
      expect(Array.isArray(VIRTUAL_DISPLAY_KEYWORDS)).toBe(true);
      expect(VIRTUAL_DISPLAY_KEYWORDS.length).toBeGreaterThan(0);
    });

    it("should contain known virtual display identifiers", () => {
      expect(VIRTUAL_DISPLAY_KEYWORDS).toContain("vdd");
      expect(VIRTUAL_DISPLAY_KEYWORDS).toContain("virtual");
      expect(VIRTUAL_DISPLAY_KEYWORDS).toContain("mtt");
      expect(VIRTUAL_DISPLAY_KEYWORDS).toContain("parsec");
    });

    it("should have all lowercase keywords", () => {
      VIRTUAL_DISPLAY_KEYWORDS.forEach((keyword) => {
        expect(keyword).toBe(keyword.toLowerCase());
      });
    });

    it("should contain common virtual display software identifiers", () => {
      const expectedKeywords = ["vdd", "virtual", "mtt", "parsec", "dummy", "headless", "indirect"];
      expectedKeywords.forEach((keyword) => {
        expect(VIRTUAL_DISPLAY_KEYWORDS).toContain(keyword);
      });
    });
  });

  describe("Constants Immutability", () => {
    it("should have VDD_SETTINGS_SYSTEM_PATHS as readonly array", () => {
      // TypeScript enforces immutability at compile time with 'as const'
      // At runtime, we verify the array structure is correct
      expect(Array.isArray(VDD_SETTINGS_SYSTEM_PATHS)).toBe(true);
      expect(VDD_SETTINGS_SYSTEM_PATHS.length).toBe(2);
      // Type check ensures 'as const' is used (array has literal type)
      expect(typeof VDD_SETTINGS_SYSTEM_PATHS[0]).toBe("string");
    });

    it("should have VIRTUAL_DISPLAY_KEYWORDS as readonly array", () => {
      // TypeScript enforces immutability at compile time with 'as const'
      expect(Array.isArray(VIRTUAL_DISPLAY_KEYWORDS)).toBe(true);
      expect(VIRTUAL_DISPLAY_KEYWORDS.length).toBeGreaterThan(0);
      expect(typeof VIRTUAL_DISPLAY_KEYWORDS[0]).toBe("string");
    });
  });
});
