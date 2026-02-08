// Tests for EclipseScriptsService
// Story 7.9: Gestion des scripts Eclipse (do/undo pour Sunshine)
// Version 3.0: Scripts .ps1 dans resources/, wrappers .bat dans AppData

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks hoisted for electron and fs
const mocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  existsSync: vi.fn(),
  getAppPath: vi.fn(),
  isPackaged: false,
}));

// Mock electron
vi.mock("electron", () => ({
  app: {
    isPackaged: mocks.isPackaged,
    getAppPath: mocks.getAppPath,
  },
}));

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: mocks.mkdir,
    writeFile: mocks.writeFile,
    access: mocks.access,
  },
}));

// Mock fs (existsSync) - needs default export
vi.mock("node:fs", () => ({
  default: {
    existsSync: mocks.existsSync,
  },
  existsSync: mocks.existsSync,
}));

// Import after mocking
import { EclipseScriptsService } from "./EclipseScriptsService";

describe("EclipseScriptsService", () => {
  let service: EclipseScriptsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppPath.mockReturnValue("C:\\TestApp");
    mocks.existsSync.mockReturnValue(true);
    mocks.mkdir.mockResolvedValue(undefined);
    mocks.writeFile.mockResolvedValue(undefined);
    mocks.access.mockResolvedValue(undefined);
    service = new EclipseScriptsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // getScriptPaths
  // ============================================================================
  describe("getScriptPaths", () => {
    it("should return correct script paths", () => {
      const paths = service.getScriptPaths();

      expect(paths.doScript).toContain("eclipse-do.bat");
      expect(paths.undoScript).toContain("eclipse-undo.bat");
      expect(paths.doScript).toContain("Eclipse");
      expect(paths.undoScript).toContain("Eclipse");
    });
  });

  // ============================================================================
  // ensureScriptsExist
  // ============================================================================
  describe("ensureScriptsExist", () => {
    it("should create directories and generate .bat wrappers", async () => {
      const result = await service.ensureScriptsExist();

      expect(result.success).toBe(true);
      expect(mocks.mkdir).toHaveBeenCalled();
      // Should NOT copy files anymore (scripts are in resources/)
      // Should only write .bat wrappers
      expect(mocks.writeFile).toHaveBeenCalled();
    });

    it("should create .bat wrappers pointing to .ps1 in resources", async () => {
      await service.ensureScriptsExist();

      // Check that writeFile was called for .bat files
      const writeCalls = mocks.writeFile.mock.calls as Array<[string, string, string]>;
      const batCalls = writeCalls.filter((call) =>
        call[0].endsWith(".bat")
      );

      expect(batCalls.length).toBe(2);

      // Check that .bat content points to resources path
      for (const call of batCalls) {
        const content = call[1];
        expect(content).toContain("powershell.exe");
        expect(content).toContain(".ps1");
      }
    });

    it("should fail if source .ps1 scripts are missing", async () => {
      mocks.existsSync.mockReturnValue(false);

      const result = await service.ensureScriptsExist();

      expect(result.success).toBe(false);
      expect(result.error).toContain("non trouvé");
    });

    it("should return error on file system failure", async () => {
      mocks.mkdir.mockRejectedValue(new Error("Permission denied"));

      const result = await service.ensureScriptsExist();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission denied");
    });
  });

  // ============================================================================
  // updateConfig
  // ============================================================================
  describe("updateConfig", () => {
    it("should write config file with VDD instance ID", async () => {
      const result = await service.updateConfig("ROOT\\MTTVDD\\0000", "{guid-123}");

      expect(result.success).toBe(true);
      expect(mocks.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("eclipse-config.json"),
        expect.stringContaining("ROOT\\\\MTTVDD\\\\0000"),
        "utf-8"
      );
    });

    it("should include VDD device ID in config", async () => {
      await service.updateConfig("instance-id", "{device-guid}");

      const writeCalls = mocks.writeFile.mock.calls as Array<[string, string, string]>;
      const writeCall = writeCalls.find((call) =>
        call[0].includes("eclipse-config.json")
      );
      expect(writeCall).toBeDefined();
      const content = writeCall![1];
      expect(content).toContain("{device-guid}");
    });

    it("should include tools paths in config", async () => {
      await service.updateConfig(null, null);

      const writeCalls = mocks.writeFile.mock.calls as Array<[string, string, string]>;
      const writeCall = writeCalls.find((call) =>
        call[0].includes("eclipse-config.json")
      );
      const config = JSON.parse(writeCall![1]);
      expect(config.toolsPath).toBeDefined();
      expect(config.devconPath).toContain("devcon.exe");
      expect(config.multiMonitorToolPath).toContain("MultiMonitorTool.exe");
    });

    it("should handle null VDD instance ID", async () => {
      const result = await service.updateConfig(null, null);

      expect(result.success).toBe(true);
      const writeCalls = mocks.writeFile.mock.calls as Array<[string, string, string]>;
      const writeCall = writeCalls.find((call) =>
        call[0].includes("eclipse-config.json")
      );
      const config = JSON.parse(writeCall![1]);
      expect(config.vddInstanceId).toBeNull();
    });

    it("should return error on write failure", async () => {
      mocks.writeFile.mockRejectedValue(new Error("Disk full"));

      const result = await service.updateConfig("id", null);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Disk full");
    });
  });

  // ============================================================================
  // exportActivePresetId
  // ============================================================================
  describe("exportActivePresetId", () => {
    it("should export active preset ID to file", async () => {
      const result = await service.exportActivePresetId("preset-123");

      expect(result.success).toBe(true);
      expect(mocks.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("active-preset.json"),
        expect.stringContaining("preset-123"),
        "utf-8"
      );
    });

    it("should handle null preset ID", async () => {
      const result = await service.exportActivePresetId(null);

      expect(result.success).toBe(true);
      const writeCalls = mocks.writeFile.mock.calls as Array<[string, string, string]>;
      const writeCall = writeCalls.find((call) =>
        call[0].includes("active-preset.json")
      );
      const data = JSON.parse(writeCall![1]);
      expect(data.activePresetId).toBeNull();
    });
  });

  // ============================================================================
  // exportPresets
  // ============================================================================
  describe("exportPresets", () => {
    it("should export presets array to file", async () => {
      const presets = [
        { id: "1", name: "Preset 1" },
        { id: "2", name: "Preset 2" },
      ];

      const result = await service.exportPresets(presets);

      expect(result.success).toBe(true);
      expect(mocks.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("presets.json"),
        expect.stringContaining("Preset 1"),
        "utf-8"
      );
    });

    it("should handle empty presets array", async () => {
      const result = await service.exportPresets([]);

      expect(result.success).toBe(true);
    });

    it("should return error on write failure", async () => {
      mocks.writeFile.mockRejectedValue(new Error("IO Error"));

      const result = await service.exportPresets([]);

      expect(result.success).toBe(false);
      expect(result.error).toContain("IO Error");
    });
  });

  // ============================================================================
  // exportSunshineConfig
  // ============================================================================
  describe("exportSunshineConfig", () => {
    it("should export Sunshine config to file", async () => {
      const config = {
        output_name: "{guid}",
        resolution: "1920x1080",
      };

      const result = await service.exportSunshineConfig(config);

      expect(result.success).toBe(true);
      expect(mocks.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("sunshine-active-config.json"),
        expect.stringContaining("{guid}"),
        "utf-8"
      );
    });
  });

  // ============================================================================
  // scriptsExist
  // ============================================================================
  describe("scriptsExist", () => {
    it("should return true if all scripts exist", async () => {
      mocks.access.mockResolvedValue(undefined);

      const exists = await service.scriptsExist();

      expect(exists).toBe(true);
      expect(mocks.access).toHaveBeenCalledTimes(4); // 2 .bat + 2 .ps1
    });

    it("should return false if any script is missing", async () => {
      mocks.access.mockRejectedValue(new Error("ENOENT"));

      const exists = await service.scriptsExist();

      expect(exists).toBe(false);
    });
  });

  // ============================================================================
  // generatePrepCmd
  // ============================================================================
  describe("generatePrepCmd", () => {
    it("should return prep-cmd array with Eclipse marker", () => {
      const prepCmd = service.generatePrepCmd();

      expect(prepCmd).toHaveLength(2);
      expect(prepCmd[0].do).toContain("ECLIPSE_MANAGED_APP");
      expect(prepCmd[0].elevated).toBe("false");
    });

    it("should include do and undo script paths pointing to .ps1 in installation directory", () => {
      const prepCmd = service.generatePrepCmd();

      const scriptCmd = prepCmd[1];
      // Must use direct PowerShell execution of .ps1 files in resources/
      expect(scriptCmd.do).toContain("eclipse-do.ps1");
      expect(scriptCmd.undo).toContain("eclipse-undo.ps1");
      expect(scriptCmd.do).toContain("powershell.exe");
      expect(scriptCmd.undo).toContain("powershell.exe");
      // Should point to the installation resources directory
      expect(scriptCmd.do).toContain("resources");
      expect(scriptCmd.undo).toContain("resources");
    });

    it("should not require elevation", () => {
      const prepCmd = service.generatePrepCmd();

      for (const cmd of prepCmd) {
        expect(cmd.elevated).toBe("false");
      }
    });
  });
});
