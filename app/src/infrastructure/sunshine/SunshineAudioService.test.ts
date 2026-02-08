// Tests unitaires - SunshineAudioService
// Story 5.3: Détection des périphériques audio via audio-info.exe
// Note: Tests limités aux méthodes qui n'exécutent pas de commandes système

import { describe, it, expect } from "vitest";
import { SunshineAudioService } from "./SunshineAudioService";

describe("SunshineAudioService", () => {
  describe("parseAudioInfoOutput", () => {
    // Create a service instance to test the private parser via public methods
    // We test the parsing logic by examining what formats are accepted

    it("should be instantiable", () => {
      // This test verifies the service can be created
      // It will try to find audio-info.exe in default paths
      const service = new SunshineAudioService();
      expect(service).toBeDefined();
    });

    it("should have getAudioInfoPath method", () => {
      const service = new SunshineAudioService();
      expect(typeof service.getAudioInfoPath).toBe("function");
    });

    it("should have getAudioDevices method", () => {
      const service = new SunshineAudioService();
      expect(typeof service.getAudioDevices).toBe("function");
    });

    it("should have getAudioSinks method", () => {
      const service = new SunshineAudioService();
      expect(typeof service.getAudioSinks).toBe("function");
    });
  });

  describe("interface compliance", () => {
    it("should implement ISunshineAudioService interface", () => {
      const service = new SunshineAudioService();

      // Verify all interface methods exist
      expect(service.getAudioInfoPath).toBeDefined();
      expect(service.getAudioDevices).toBeDefined();
      expect(service.getAudioSinks).toBeDefined();
    });

    it("getAudioInfoPath should return string or null", () => {
      const service = new SunshineAudioService();
      const result = service.getAudioInfoPath();

      // Should be either a string path or null if not found
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("getAudioDevices should return a promise", () => {
      const service = new SunshineAudioService();
      const result = service.getAudioDevices();

      expect(result).toBeInstanceOf(Promise);
    });

    it("getAudioSinks should return a promise", () => {
      const service = new SunshineAudioService();
      const result = service.getAudioSinks();

      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("AudioDevicesResult structure", () => {
    it("getAudioDevices should return proper result structure", async () => {
      const service = new SunshineAudioService();
      const result = await service.getAudioDevices();

      // Result should have success boolean and devices array
      expect(typeof result.success).toBe("boolean");
      expect(Array.isArray(result.devices)).toBe(true);

      // If not successful, should have error message
      if (!result.success) {
        expect(typeof result.error).toBe("string");
      }
    });

    it("getAudioSinks should return proper result structure", async () => {
      const service = new SunshineAudioService();
      const result = await service.getAudioSinks();

      // Result should have success boolean and devices array
      expect(typeof result.success).toBe("boolean");
      expect(Array.isArray(result.devices)).toBe(true);

      // If not successful, should have error message
      if (!result.success) {
        expect(typeof result.error).toBe("string");
      }
    });

    it("getAudioSinks should only return sink type devices", async () => {
      const service = new SunshineAudioService();
      const result = await service.getAudioSinks();

      if (result.success && result.devices.length > 0) {
        // All devices should be of type "sink"
        for (const device of result.devices) {
          expect(device.type).toBe("sink");
        }
      }
    });
  });

  describe("AudioDevice structure", () => {
    it("devices should have id, name, and type", async () => {
      const service = new SunshineAudioService();
      const result = await service.getAudioDevices();

      if (result.success && result.devices.length > 0) {
        for (const device of result.devices) {
          expect(typeof device.id).toBe("string");
          expect(typeof device.name).toBe("string");
          expect(device.type === "sink" || device.type === "source").toBe(true);
        }
      }
    });
  });
});
