// Tests for SunshineAppsRepository
// Story 7.1 & 7.5: Gestion du fichier apps.json

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import type { SunshineAppsFile, SunshineApp } from "@domain/types";
import { APP_CONSTANTS } from "@domain/types";

// Test paths (matches mocked SunshinePathsService)
const TEST_APPS_PATH = "C:\\TestApp\\resources\\tools\\Sunshine\\config\\apps.json";
const TEST_CONFIG_DIR = "C:\\TestApp\\resources\\tools\\Sunshine\\config";

// Mock SunshinePathsService before importing SunshineAppsRepository
vi.mock("./SunshinePathsService", () => ({
  getSunshinePaths: vi.fn(() => ({
    sunshineDir: "C:\\TestApp\\resources\\tools\\Sunshine",
    configFile: "C:\\TestApp\\resources\\tools\\Sunshine\\config\\sunshine.conf",
    configDir: TEST_CONFIG_DIR,
    appsJson: TEST_APPS_PATH,
    sunshineExe: "C:\\TestApp\\resources\\tools\\Sunshine\\sunshine.exe",
    logFile: "C:\\TestApp\\resources\\tools\\Sunshine\\config\\sunshine.log",
    toolsDir: "C:\\TestApp\\resources\\tools\\Sunshine\\tools",
    audioInfoExe: "C:\\TestApp\\resources\\tools\\Sunshine\\tools\\audio-info.exe",
    dxgiInfoExe: "C:\\TestApp\\resources\\tools\\Sunshine\\tools\\dxgi-info.exe",
  })),
}));

// Mock EclipseScriptsService
vi.mock("../scripts/EclipseScriptsService", () => ({
  eclipseScriptsService: {
    generatePrepCmd: vi.fn(() => [
      {
        do: 'powershell -File "C:\\scripts\\eclipse-do.ps1" ## ECLIPSE_MANAGED_APP',
        undo: 'powershell -File "C:\\scripts\\eclipse-undo.ps1"',
        elevated: "false",
      },
    ]),
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
import { SunshineAppsRepository } from "./SunshineAppsRepository";

describe("SunshineAppsRepository", () => {
  let repository: SunshineAppsRepository;

  const validAppsFile: SunshineAppsFile = {
    env: {},
    apps: [
      { name: "Test App", cmd: "test.exe" },
      { name: APP_CONSTANTS.ECLIPSE_APP_NAME, cmd: "eclipse.exe" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: apps.json exists
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === TEST_APPS_PATH;
    });
    repository = new SunshineAppsRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // getAppsPath
  // ============================================================================
  describe("getAppsPath", () => {
    it("should return the detected apps path", () => {
      expect(repository.getAppsPath()).toBe(TEST_APPS_PATH);
    });

    it("should return null if apps.json not found", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const noPathRepo = new SunshineAppsRepository();
      expect(noPathRepo.getAppsPath()).toBeNull();
    });
  });

  // ============================================================================
  // readApps
  // ============================================================================
  describe("readApps", () => {
    it("should read and parse apps.json correctly", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(validAppsFile));

      const result = await repository.readApps();

      expect(result.apps).toHaveLength(2);
      expect(result.apps[0].name).toBe("Test App");
    });

    it("should throw error if apps.json path is null", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const noPathRepo = new SunshineAppsRepository();

      await expect(noPathRepo.readApps()).rejects.toThrow("apps.json non trouvé");
    });

    it("should throw error for malformed JSON", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue("{ invalid json }");

      await expect(repository.readApps()).rejects.toThrow("apps.json malformé");
    });

    it("should throw error if apps array is missing", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify({ env: {} }));

      await expect(repository.readApps()).rejects.toThrow("Structure apps.json invalide");
    });
  });

  // ============================================================================
  // addApp
  // ============================================================================
  describe("addApp", () => {
    it("should add a new application", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(validAppsFile));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const newApp: SunshineApp = { name: "New Game", cmd: "game.exe" };
      const result = await repository.addApp(newApp);

      expect(result.success).toBe(true);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        TEST_APPS_PATH,
        expect.stringContaining('"New Game"'),
        "utf-8"
      );
    });

    it("should create backup before adding", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(validAppsFile));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      await repository.addApp({ name: "New App", cmd: "app.exe" });

      expect(fs.promises.copyFile).toHaveBeenCalled();
    });

    it("should reject duplicate app names", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(validAppsFile));
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const duplicateApp: SunshineApp = { name: "Test App", cmd: "dup.exe" };
      const result = await repository.addApp(duplicateApp);

      expect(result.success).toBe(false);
      expect(result.error).toContain("existe déjà");
    });

    it("should return error if apps path is null", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const noPathRepo = new SunshineAppsRepository();

      const result = await noPathRepo.addApp({ name: "Test", cmd: "test.exe" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("apps.json non trouvé");
    });
  });

  // ============================================================================
  // updateApp
  // ============================================================================
  describe("updateApp", () => {
    it("should update an existing application", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(validAppsFile));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const result = await repository.updateApp("Test App", { cmd: "new-path.exe" });

      expect(result.success).toBe(true);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        TEST_APPS_PATH,
        expect.stringContaining('"new-path.exe"'),
        "utf-8"
      );
    });

    it("should return error for non-existent app", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(validAppsFile));
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const result = await repository.updateApp("Unknown App", { cmd: "x.exe" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("non trouvée");
    });

    it("should merge updates with existing properties", async () => {
      const fileWithDetails: SunshineAppsFile = {
        env: {},
        apps: [{ name: "Game", cmd: "game.exe", "working-dir": "C:\\Games" }],
      };
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(fileWithDetails));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      await repository.updateApp("Game", { elevated: "true" });

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as SunshineAppsFile;
      expect(writtenContent.apps[0].cmd).toBe("game.exe");
      expect(writtenContent.apps[0]["working-dir"]).toBe("C:\\Games");
      expect(writtenContent.apps[0].elevated).toBe("true");
    });
  });

  // ============================================================================
  // deleteApp
  // ============================================================================
  describe("deleteApp", () => {
    it("should delete an application", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(validAppsFile));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const result = await repository.deleteApp("Test App");

      expect(result.success).toBe(true);
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as SunshineAppsFile;
      expect(writtenContent.apps.some((a) => a.name === "Test App")).toBe(false);
    });

    it("should refuse to delete Eclipse app (Story 7.5)", async () => {
      const result = await repository.deleteApp(APP_CONSTANTS.ECLIPSE_APP_NAME);

      expect(result.success).toBe(false);
      expect(result.error).toContain("ne peut pas être supprimée");
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });

    it("should be case-insensitive for Eclipse protection", async () => {
      const result = await repository.deleteApp("eclipse");

      expect(result.success).toBe(false);
      expect(result.error).toContain("ne peut pas être supprimée");
    });

    it("should return error for non-existent app", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(validAppsFile));
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const result = await repository.deleteApp("Unknown");

      expect(result.success).toBe(false);
      expect(result.error).toContain("non trouvée");
    });
  });

  // ============================================================================
  // backupApps
  // ============================================================================
  describe("backupApps", () => {
    it("should create backup with timestamp", async () => {
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const result = await repository.backupApps();

      expect(result.success).toBe(true);
      expect(fs.promises.copyFile).toHaveBeenCalledWith(
        TEST_APPS_PATH,
        expect.stringMatching(/apps\.json\.backup\.\d{4}-\d{2}-\d{2}/)
      );
    });

    it("should rotate old backups", async () => {
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([
        "apps.json.backup.2026-01-01",
        "apps.json.backup.2026-01-02",
        "apps.json.backup.2026-01-03",
        "apps.json.backup.2026-01-04",
        "apps.json.backup.2026-01-05",
        "apps.json.backup.2026-01-06", // 6th backup (exceeds MAX_BACKUPS)
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);

      await repository.backupApps();

      // Should delete oldest backup(s) to keep MAX_BACKUPS
      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    it("should return error if apps path is null", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const noPathRepo = new SunshineAppsRepository();

      const result = await noPathRepo.backupApps();

      expect(result.success).toBe(false);
      expect(result.error).toContain("non trouvé");
    });
  });

  // ============================================================================
  // restoreFromBackup
  // ============================================================================
  describe("restoreFromBackup", () => {
    it("should restore from latest backup", async () => {
      vi.mocked(fs.promises.readdir).mockResolvedValue([
        "apps.json.backup.2026-01-01",
        "apps.json.backup.2026-01-03",
        "apps.json.backup.2026-01-02",
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);

      const result = await repository.restoreFromBackup();

      expect(result.success).toBe(true);
      // Most recent backup (2026-01-03) should be restored
      expect(fs.promises.copyFile).toHaveBeenCalledWith(
        expect.stringContaining("2026-01-03"),
        TEST_APPS_PATH
      );
    });

    it("should return error if no backup found", async () => {
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const result = await repository.restoreFromBackup();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Aucun backup");
    });
  });

  // ============================================================================
  // ensureEclipseAppExists
  // ============================================================================
  describe("ensureEclipseAppExists", () => {
    it("should create Eclipse app if not present", async () => {
      const appsWithoutEclipse: SunshineAppsFile = {
        env: {},
        apps: [{ name: "Desktop", cmd: "" }],
      };
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(appsWithoutEclipse));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await repository.ensureEclipseAppExists();

      expect(result.success).toBe(true);
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as SunshineAppsFile;
      expect(writtenContent.apps.some((a) => a.name === APP_CONSTANTS.ECLIPSE_APP_NAME)).toBe(true);
    });

    it("should remove Desktop app if present", async () => {
      const appsWithDesktop: SunshineAppsFile = {
        env: {},
        apps: [{ name: "Desktop", cmd: "" }, { name: APP_CONSTANTS.ECLIPSE_APP_NAME, cmd: "" }],
      };
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(appsWithDesktop));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      await repository.ensureEclipseAppExists();

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as SunshineAppsFile;
      expect(writtenContent.apps.some((a) => a.name.toLowerCase() === "desktop")).toBe(false);
    });

    it("should add Eclipse scripts to apps without them", async () => {
      const appsWithoutScripts: SunshineAppsFile = {
        env: {},
        apps: [
          { name: APP_CONSTANTS.ECLIPSE_APP_NAME, cmd: "" },
          { name: "Game", cmd: "game.exe" },
        ],
      };
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(appsWithoutScripts));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      await repository.ensureEclipseAppExists();

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as SunshineAppsFile;
      const gameApp = writtenContent.apps.find((a) => a.name === "Game");
      expect(gameApp?.["prep-cmd"]).toBeDefined();
      expect(gameApp?.["prep-cmd"]?.[0]?.do).toContain("ECLIPSE_MANAGED_APP");
    });

    it("should not modify apps that already have Eclipse scripts", async () => {
      const appsWithScripts: SunshineAppsFile = {
        env: {},
        apps: [
          {
            name: APP_CONSTANTS.ECLIPSE_APP_NAME,
            cmd: "",
            "prep-cmd": [{ do: "powershell ## ECLIPSE_MANAGED_APP", undo: "undo", elevated: "false" }],
          },
        ],
      };
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(appsWithScripts));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      await repository.ensureEclipseAppExists();

      // writeFile should not be called if nothing changed
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe("Error Handling", () => {
    it("should handle permission errors", async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(validAppsFile));
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error("EPERM: operation not permitted"));

      const result = await repository.addApp({ name: "New", cmd: "new.exe" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission refusée");
    });
  });
});
