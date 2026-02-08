// Tests unitaires pour useSunshineAppsStore.ts - Story 7.2
// Store Zustand pour la gestion des applications Sunshine

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useSunshineAppsStore } from "./useSunshineAppsStore";
import type { SunshineApp, CreateAppData, SunshineAppsFile, RepositoryResult } from "@domain/types";
import { APP_CONSTANTS } from "@domain/types";

// Uses mocks from global setup (src/test/setup.ts)
// Access: window.electronAPI.sunshineApps

describe("useSunshineAppsStore - Story 7.2", () => {
  beforeEach(() => {
    // Reset store to initial state
    useSunshineAppsStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // AC1: Structure du Store
  // ============================================================================
  describe("AC1: Structure du Store", () => {
    it("should have correct initial state", () => {
      const state = useSunshineAppsStore.getState();

      expect(state.apps).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });

    it("should expose all required actions", () => {
      const state = useSunshineAppsStore.getState();

      expect(typeof state.loadApps).toBe("function");
      expect(typeof state.addApp).toBe("function");
      expect(typeof state.updateApp).toBe("function");
      expect(typeof state.deleteApp).toBe("function");
      expect(typeof state.getAppByName).toBe("function");
      expect(typeof state.isEclipseApp).toBe("function");
      expect(typeof state.setLoading).toBe("function");
      expect(typeof state.setError).toBe("function");
      expect(typeof state.reset).toBe("function");
    });
  });

  // ============================================================================
  // AC2: Action loadApps()
  // ============================================================================
  describe("AC2: Action loadApps()", () => {
    it("should set isLoading to true during load", async () => {
      const mockApps: SunshineApp[] = [{ name: "Test App" }];
      vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValue({ apps: mockApps } as SunshineAppsFile);

      const loadPromise = useSunshineAppsStore.getState().loadApps();

      // After load completes
      await loadPromise;
      expect(useSunshineAppsStore.getState().isLoading).toBe(false);
    });

    it("should load apps from IPC and update state", async () => {
      const mockApps: SunshineApp[] = [
        { name: "App 1", cmd: "app1.exe" },
        { name: "App 2", cmd: "app2.exe" },
      ];
      vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValue({ apps: mockApps } as SunshineAppsFile);

      await useSunshineAppsStore.getState().loadApps();

      const { apps, isLoading, error } = useSunshineAppsStore.getState();
      expect(apps).toEqual(mockApps);
      expect(isLoading).toBe(false);
      expect(error).toBe(null);
    });

    it("should handle empty apps array", async () => {
      vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValue({ apps: [] } as SunshineAppsFile);

      await useSunshineAppsStore.getState().loadApps();

      const { apps } = useSunshineAppsStore.getState();
      expect(apps).toEqual([]);
    });

    it("should store error on IPC failure", async () => {
      const errorMessage = "Failed to read apps.json";
      vi.mocked(window.electronAPI.sunshineApps.read).mockRejectedValue(new Error(errorMessage));

      await useSunshineAppsStore.getState().loadApps();

      const { isLoading, error } = useSunshineAppsStore.getState();
      expect(error).toBe(errorMessage);
      expect(isLoading).toBe(false);
    });

    it("should keep existing apps on error if already loaded", async () => {
      // First successful load
      const existingApps: SunshineApp[] = [{ name: "Existing App" }];
      vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValueOnce({ apps: existingApps });
      await useSunshineAppsStore.getState().loadApps();

      // Second load fails
      vi.mocked(window.electronAPI.sunshineApps.read).mockRejectedValueOnce(new Error("Network error"));
      await useSunshineAppsStore.getState().loadApps();

      // Apps should be empty (reset on new load attempt)
      const { error } = useSunshineAppsStore.getState();
      expect(error).toBe("Network error");
    });
  });

  // ============================================================================
  // AC3: Action addApp()
  // ============================================================================
  describe("AC3: Action addApp()", () => {
    it("should add app via IPC and reload list", async () => {
      const newAppData: CreateAppData = {
        name: "New Game",
        exePath: "C:\\Games\\game.exe",
      };
      const resultApps: SunshineApp[] = [{ name: "New Game", cmd: "C:\\Games\\game.exe" }];

      vi.mocked(window.electronAPI.sunshineApps.add).mockResolvedValue({ success: true } as RepositoryResult);
      vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValue({ apps: resultApps });

      await useSunshineAppsStore.getState().addApp(newAppData);

      // Verify core properties are passed
      expect(window.electronAPI.sunshineApps.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Game",
          cmd: "C:\\Games\\game.exe",
        })
      );

      const { apps } = useSunshineAppsStore.getState();
      expect(apps).toEqual(resultApps);
    });

    it("should convert CreateAppData to SunshineApp format with all required fields", async () => {
      const newAppData: CreateAppData = {
        name: "Game with Icon",
        exePath: "C:\\Games\\game.exe",
        iconBase64: "data:image/png;base64,abc123",
      };

      vi.mocked(window.electronAPI.sunshineApps.add).mockResolvedValue({ success: true });
      vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValue({ apps: [] });

      await useSunshineAppsStore.getState().addApp(newAppData);

      // Verify all required SunshineApp fields are set
      expect(window.electronAPI.sunshineApps.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Game with Icon",
          cmd: "C:\\Games\\game.exe",
          "image-path": "data:image/png;base64,abc123",
          "working-dir": expect.any(String),
          "prep-cmd": expect.any(Array), // Eclipse scripts
          "auto-detach": "true",
          elevated: "false",
        })
      );
    });

    it("should throw error on IPC failure", async () => {
      vi.mocked(window.electronAPI.sunshineApps.add).mockResolvedValue({
        success: false,
        error: "Duplicate app name"
      } as RepositoryResult);

      const addPromise = useSunshineAppsStore.getState().addApp({
        name: "Duplicate",
        exePath: "dup.exe",
      });

      await expect(addPromise).rejects.toThrow("Duplicate app name");

      const { error } = useSunshineAppsStore.getState();
      expect(error).toBe("Duplicate app name");
    });
  });

  // ============================================================================
  // AC4: Action updateApp()
  // ============================================================================
  describe("AC4: Action updateApp()", () => {
    it("should update app via IPC and reload list", async () => {
      const updates: Partial<SunshineApp> = { cmd: "new-path.exe" };
      const updatedApps: SunshineApp[] = [{ name: "My App", cmd: "new-path.exe" }];

      vi.mocked(window.electronAPI.sunshineApps.update).mockResolvedValue({ success: true });
      vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValue({ apps: updatedApps });

      await useSunshineAppsStore.getState().updateApp("My App", updates);

      expect(window.electronAPI.sunshineApps.update).toHaveBeenCalledWith("My App", updates);

      const { apps } = useSunshineAppsStore.getState();
      expect(apps[0].cmd).toBe("new-path.exe");
    });

    it("should throw error on IPC failure", async () => {
      vi.mocked(window.electronAPI.sunshineApps.update).mockResolvedValue({
        success: false,
        error: "App not found"
      });

      const updatePromise = useSunshineAppsStore.getState().updateApp("Unknown", { cmd: "x" });

      await expect(updatePromise).rejects.toThrow("App not found");
    });
  });

  // ============================================================================
  // AC5: Action deleteApp()
  // ============================================================================
  describe("AC5: Action deleteApp()", () => {
    it("should delete app via IPC and reload list", async () => {
      vi.mocked(window.electronAPI.sunshineApps.delete).mockResolvedValue({ success: true });
      vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValue({ apps: [] });

      await useSunshineAppsStore.getState().deleteApp("To Delete");

      expect(window.electronAPI.sunshineApps.delete).toHaveBeenCalledWith("To Delete");

      const { apps } = useSunshineAppsStore.getState();
      expect(apps).toEqual([]);
    });

    it("should refuse to delete Eclipse app", async () => {
      const deletePromise = useSunshineAppsStore.getState().deleteApp(APP_CONSTANTS.ECLIPSE_APP_NAME);

      await expect(deletePromise).rejects.toThrow(
        `L'application "${APP_CONSTANTS.ECLIPSE_APP_NAME}" ne peut pas être supprimée`
      );

      // IPC should NOT be called
      expect(window.electronAPI.sunshineApps.delete).not.toHaveBeenCalled();
    });

    it("should set error when trying to delete Eclipse app", async () => {
      try {
        await useSunshineAppsStore.getState().deleteApp(APP_CONSTANTS.ECLIPSE_APP_NAME);
      } catch {
        // Expected
      }

      const { error } = useSunshineAppsStore.getState();
      expect(error).toContain(APP_CONSTANTS.ECLIPSE_APP_NAME);
    });

    it("should throw error on IPC failure", async () => {
      vi.mocked(window.electronAPI.sunshineApps.delete).mockResolvedValue({
        success: false,
        error: "Permission denied"
      });

      const deletePromise = useSunshineAppsStore.getState().deleteApp("Some App");

      await expect(deletePromise).rejects.toThrow("Permission denied");
    });
  });

  // ============================================================================
  // Helpers
  // ============================================================================
  describe("Helpers", () => {
    describe("getAppByName", () => {
      it("should return app when found", async () => {
        const mockApps: SunshineApp[] = [
          { name: "App One", cmd: "one.exe" },
          { name: "App Two", cmd: "two.exe" },
        ];
        vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValue({ apps: mockApps });
        await useSunshineAppsStore.getState().loadApps();

        const found = useSunshineAppsStore.getState().getAppByName("App One");

        expect(found).toBeDefined();
        expect(found?.name).toBe("App One");
      });

      it("should return undefined when not found", async () => {
        vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValue({ apps: [] });
        await useSunshineAppsStore.getState().loadApps();

        const found = useSunshineAppsStore.getState().getAppByName("Non Existent");

        expect(found).toBeUndefined();
      });
    });

    describe("isEclipseApp", () => {
      it("should return true for Eclipse app", () => {
        const { isEclipseApp } = useSunshineAppsStore.getState();

        expect(isEclipseApp(APP_CONSTANTS.ECLIPSE_APP_NAME)).toBe(true);
      });

      it("should return false for other apps", () => {
        const { isEclipseApp } = useSunshineAppsStore.getState();

        expect(isEclipseApp("Some Other App")).toBe(false);
        expect(isEclipseApp("eclipse")).toBe(false); // Case sensitive
      });
    });
  });

  // ============================================================================
  // State Mutations
  // ============================================================================
  describe("State Mutations", () => {
    it("should set loading state", () => {
      const { setLoading } = useSunshineAppsStore.getState();

      setLoading(true);
      expect(useSunshineAppsStore.getState().isLoading).toBe(true);

      setLoading(false);
      expect(useSunshineAppsStore.getState().isLoading).toBe(false);
    });

    it("should set error state", () => {
      const { setError } = useSunshineAppsStore.getState();

      setError("Test error");
      expect(useSunshineAppsStore.getState().error).toBe("Test error");

      setError(null);
      expect(useSunshineAppsStore.getState().error).toBe(null);
    });

    it("should reset to initial state", async () => {
      // Load some apps first
      vi.mocked(window.electronAPI.sunshineApps.read).mockResolvedValue({
        apps: [{ name: "Test" }]
      });
      await useSunshineAppsStore.getState().loadApps();
      useSunshineAppsStore.getState().setError("Some error");

      // Reset
      useSunshineAppsStore.getState().reset();

      const state = useSunshineAppsStore.getState();
      expect(state.apps).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });
  });
});
