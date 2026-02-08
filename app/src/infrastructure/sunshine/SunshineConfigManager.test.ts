// Tests for SunshineConfigManager
// Story 3.4: Configuration automatique output_name

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";

// Test config path (matches mocked SunshinePathsService)
const TEST_CONFIG_PATH = "C:\\TestApp\\resources\\tools\\Sunshine\\config\\sunshine.conf";
const TEST_CONFIG_DIR = "C:\\TestApp\\resources\\tools\\Sunshine\\config";

// Mock SunshinePathsService before importing SunshineConfigManager
vi.mock("./SunshinePathsService", () => ({
  getSunshinePaths: vi.fn(() => ({
    sunshineDir: "C:\\TestApp\\resources\\tools\\Sunshine",
    configFile: TEST_CONFIG_PATH,
    configDir: TEST_CONFIG_DIR,
    appsJson: "C:\\TestApp\\resources\\tools\\Sunshine\\config\\apps.json",
    sunshineExe: "C:\\TestApp\\resources\\tools\\Sunshine\\sunshine.exe",
    logFile: "C:\\TestApp\\resources\\tools\\Sunshine\\config\\sunshine.log",
    toolsDir: "C:\\TestApp\\resources\\tools\\Sunshine\\tools",
    audioInfoExe: "C:\\TestApp\\resources\\tools\\Sunshine\\tools\\audio-info.exe",
    dxgiInfoExe: "C:\\TestApp\\resources\\tools\\Sunshine\\tools\\dxgi-info.exe",
  })),
  sunshinePathsService: {
    getPaths: vi.fn(() => ({
      configFile: TEST_CONFIG_PATH,
    })),
    invalidateCache: vi.fn(),
  },
}));

// Mock fs module
vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(),
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      copyFile: vi.fn(),
      readdir: vi.fn(),
      unlink: vi.fn(),
    },
  },
}));

// Import after mocking
import { SunshineConfigManager } from "./SunshineConfigManager";

describe("SunshineConfigManager", () => {
  let manager: SunshineConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock existsSync to find config at test path
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === TEST_CONFIG_PATH;
    });
    manager = new SunshineConfigManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getConfigPath", () => {
    it("should return the detected config path", () => {
      expect(manager.getConfigPath()).toBe(TEST_CONFIG_PATH);
    });

    it("should return null if config not found", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const noConfigManager = new SunshineConfigManager();
      expect(noConfigManager.getConfigPath()).toBeNull();
    });
  });

  describe("readConfig", () => {
    it("should parse key=value pairs correctly", async () => {
      const configContent = `# Comment line
sunshine_name = MyPC
output_name = {some-guid}
port = 47990
# Another comment
encoder = nvenc`;

      vi.mocked(fs.promises.readFile).mockResolvedValue(configContent);

      const config = await manager.readConfig();

      expect(config).toEqual({
        sunshine_name: "MyPC",
        output_name: "{some-guid}",
        port: "47990",
        encoder: "nvenc",
      });
    });

    it("should handle key=value without spaces", async () => {
      const configContent = `key1=value1
key2 = value2
key3= value3
key4 =value4`;

      vi.mocked(fs.promises.readFile).mockResolvedValue(configContent);

      const config = await manager.readConfig();

      expect(config.key1).toBe("value1");
      expect(config.key2).toBe("value2");
      expect(config.key3).toBe("value3");
      expect(config.key4).toBe("value4");
    });

    it("should ignore empty lines and comments", async () => {
      const configContent = `
# This is a comment
key1 = value1

# Another comment
key2 = value2
`;

      vi.mocked(fs.promises.readFile).mockResolvedValue(configContent);

      const config = await manager.readConfig();

      expect(Object.keys(config)).toHaveLength(2);
      expect(config.key1).toBe("value1");
      expect(config.key2).toBe("value2");
    });

    it("should return empty object if config path is null", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const noConfigManager = new SunshineConfigManager();

      const config = await noConfigManager.readConfig();

      expect(config).toEqual({});
    });
  });

  describe("writeConfig", () => {
    it("should update existing key", async () => {
      const existingContent = `sunshine_name = OldName
output_name = old-guid
port = 47990`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(existingContent);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await manager.writeConfig(
        "output_name",
        "{new-guid-12345}"
      );

      expect(result.success).toBe(true);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        TEST_CONFIG_PATH,
        expect.stringContaining("output_name = {new-guid-12345}"),
        "utf-8"
      );
    });

    it("should add new key if not exists", async () => {
      const existingContent = `sunshine_name = MyPC
port = 47990`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(existingContent);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await manager.writeConfig(
        "output_name",
        "{new-guid}"
      );

      expect(result.success).toBe(true);
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const writtenContent = writeCall[1] as string;
      expect(writtenContent).toContain("output_name = {new-guid}");
    });

    it("should preserve comments and format", async () => {
      const existingContent = `# Sunshine config
sunshine_name = MyPC
# Output display
output_name = old-guid`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(existingContent);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      await manager.writeConfig("output_name", "{new-guid}");

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const writtenContent = writeCall[1] as string;
      expect(writtenContent).toContain("# Sunshine config");
      expect(writtenContent).toContain("# Output display");
      expect(writtenContent).toContain("sunshine_name = MyPC");
    });

    it("should return error if config path is null", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const noConfigManager = new SunshineConfigManager();

      const result = await noConfigManager.writeConfig("key", "value");

      expect(result.success).toBe(false);
      expect(result.error).toContain("non trouvé");
    });
  });

  describe("backupConfig", () => {
    it("should create backup with timestamp", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const result = await manager.backupConfig();

      expect(result.success).toBe(true);
      expect(fs.promises.copyFile).toHaveBeenCalledWith(
        TEST_CONFIG_PATH,
        expect.stringMatching(/sunshine\.conf\.backup\.\d{4}-\d{2}-\d{2}/)
      );
    });

    it("should rotate old backups", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([
        "sunshine.conf.backup.2026-01-01",
        "sunshine.conf.backup.2026-01-02",
        "sunshine.conf.backup.2026-01-03",
        "sunshine.conf.backup.2026-01-04",
        "sunshine.conf.backup.2026-01-05",
        "sunshine.conf.backup.2026-01-06",
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);

      await manager.backupConfig();

      // Should delete oldest backup (only keeping 5)
      expect(fs.promises.unlink).toHaveBeenCalled();
    });
  });

  describe("restoreFromBackup", () => {
    it("should restore from latest backup", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readdir).mockResolvedValue([
        "sunshine.conf.backup.2026-01-01",
        "sunshine.conf.backup.2026-01-03",
        "sunshine.conf.backup.2026-01-02",
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);

      const result = await manager.restoreFromBackup();

      expect(result.success).toBe(true);
      // Should restore from the most recent (sorted alphabetically desc = 2026-01-03)
      expect(fs.promises.copyFile).toHaveBeenCalledWith(
        expect.stringContaining("2026-01-03"),
        TEST_CONFIG_PATH
      );
    });

    it("should return error if no backup found", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const result = await manager.restoreFromBackup();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Aucun backup");
    });
  });

  describe("updateOutputName", () => {
    it("should backup then write config", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);
      vi.mocked(fs.promises.readFile).mockResolvedValue("output_name = old");
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await manager.updateOutputName("{new-guid-12345}");

      expect(result.success).toBe(true);
      // Verify backup was called first
      expect(fs.promises.copyFile).toHaveBeenCalled();
      // Then write was called
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("output_name = {new-guid-12345}"),
        "utf-8"
      );
    });

    it("should return error for invalid GUID", async () => {
      const result = await manager.updateOutputName("");

      expect(result.success).toBe(false);
      expect(result.error).toContain("GUID invalide");
    });

    it("should continue even if backup fails", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.copyFile).mockRejectedValue(
        new Error("Permission denied")
      );
      vi.mocked(fs.promises.readFile).mockResolvedValue("output_name = old");
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await manager.updateOutputName("{guid}");

      // Should still succeed even if backup failed
      expect(result.success).toBe(true);
    });
  });

  // Story 9.6: Tests pour ensureSystemTrayDisabled et restoreSystemTray
  describe("ensureSystemTrayDisabled", () => {
    it("AC4: should return modified=false if config path is null", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const noConfigManager = new SunshineConfigManager();

      const result = await noConfigManager.ensureSystemTrayDisabled();

      expect(result.modified).toBe(false);
      expect(result.needsRestart).toBe(false);
    });

    it("AC3: should return modified=false if already disabled", async () => {
      const configContent = `sunshine_name = MyPC
system_tray = disabled
port = 47990`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(configContent);

      const result = await manager.ensureSystemTrayDisabled();

      expect(result.modified).toBe(false);
      expect(result.needsRestart).toBe(false);
      // Should NOT call writeFile
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });

    it("AC1/AC2: should disable and return needsRestart=true if was enabled", async () => {
      const configContent = `sunshine_name = MyPC
system_tray = enabled
port = 47990`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(configContent);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await manager.ensureSystemTrayDisabled();

      expect(result.modified).toBe(true);
      expect(result.needsRestart).toBe(true);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        TEST_CONFIG_PATH,
        expect.stringContaining("system_tray = disabled"),
        "utf-8"
      );
    });

    it("AC1: should add system_tray if not present", async () => {
      const configContent = `sunshine_name = MyPC
port = 47990`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(configContent);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await manager.ensureSystemTrayDisabled();

      expect(result.modified).toBe(true);
      expect(result.needsRestart).toBe(true);
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const writtenContent = writeCall[1] as string;
      expect(writtenContent).toContain("system_tray = disabled");
    });

    it("should return error if write fails", async () => {
      const configContent = `system_tray = enabled`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(configContent);
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error("EPERM: permission denied"));

      const result = await manager.ensureSystemTrayDisabled();

      expect(result.modified).toBe(false);
      expect(result.needsRestart).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("restoreSystemTray", () => {
    it("AC5: should set system_tray to enabled", async () => {
      const configContent = `sunshine_name = MyPC
system_tray = disabled
port = 47990`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(configContent);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await manager.restoreSystemTray();

      expect(result.success).toBe(true);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        TEST_CONFIG_PATH,
        expect.stringContaining("system_tray = enabled"),
        "utf-8"
      );
    });

    it("should return error if config path is null", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const noConfigManager = new SunshineConfigManager();

      const result = await noConfigManager.restoreSystemTray();

      expect(result.success).toBe(false);
      expect(result.error).toContain("non trouvé");
    });

    it("should return error if write fails", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue("system_tray = disabled");
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error("EPERM"));

      const result = await manager.restoreSystemTray();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
