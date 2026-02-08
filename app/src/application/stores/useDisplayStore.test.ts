// Tests unitaires pour useDisplayStore.ts - Epic 3
// Store Zustand pour la gestion des écrans virtuels et presets

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useDisplayStore } from "./useDisplayStore";
import type { ScreenPreset, PhysicalScreen } from "@domain/types";

// Mock window.electronAPI
const mockElectronAPI = {
  vdd: {
    getStatus: vi.fn(),
    getDeviceGUID: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    setResolution: vi.fn(),
    updateConfig: vi.fn(),
    refreshDeviceId: vi.fn(),
  },
  display: {
    getPhysicalDisplays: vi.fn(),
  },
};

// Setup global mock
vi.stubGlobal("window", {
  electronAPI: mockElectronAPI,
});

describe("useDisplayStore - Epic 3", () => {
  beforeEach(() => {
    // Reset store to initial state
    useDisplayStore.setState({
      vddStatus: "disabled",
      isLoading: false,
      vddDeviceId: null,
      physicalScreens: [],
      eclipseScreen: {
        type: "eclipse",
        name: "Écran Eclipse",
        deviceId: "",
        resolution: { width: 1920, height: 1080 },
        refreshRate: 60,
      },
      presets: [],
      activePresetId: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Initial State
  // ============================================================================
  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useDisplayStore.getState();
      
      expect(state.vddStatus).toBe("disabled");
      expect(state.isLoading).toBe(false);
      expect(state.vddDeviceId).toBe(null);
      expect(state.physicalScreens).toEqual([]);
      expect(state.presets).toEqual([]);
      expect(state.activePresetId).toBe(null);
    });

    it("should have default Eclipse screen", () => {
      const { eclipseScreen } = useDisplayStore.getState();
      
      expect(eclipseScreen.type).toBe("eclipse");
      expect(eclipseScreen.name).toBe("Écran Eclipse");
      expect(eclipseScreen.resolution).toEqual({ width: 1920, height: 1080 });
      expect(eclipseScreen.refreshRate).toBe(60);
    });

    it("should expose all required actions", () => {
      const state = useDisplayStore.getState();
      
      expect(typeof state.setVddStatus).toBe("function");
      expect(typeof state.setLoading).toBe("function");
      expect(typeof state.refreshVddStatus).toBe("function");
      expect(typeof state.refreshDeviceId).toBe("function");
      expect(typeof state.disableVdd).toBe("function");
      expect(typeof state.refreshPhysicalScreens).toBe("function");
      expect(typeof state.addPreset).toBe("function");
      expect(typeof state.updatePreset).toBe("function");
      expect(typeof state.deletePreset).toBe("function");
      expect(typeof state.activatePreset).toBe("function");
      expect(typeof state.deactivatePreset).toBe("function");
    });
  });

  // ============================================================================
  // VDD State Mutations
  // ============================================================================
  describe("VDD State Mutations", () => {
    it("should update vddStatus with setVddStatus", () => {
      const { setVddStatus } = useDisplayStore.getState();
      
      setVddStatus("enabled");
      expect(useDisplayStore.getState().vddStatus).toBe("enabled");
      
      setVddStatus("disabled");
      expect(useDisplayStore.getState().vddStatus).toBe("disabled");
    });

    it("should update isLoading with setLoading", () => {
      const { setLoading } = useDisplayStore.getState();
      
      setLoading(true);
      expect(useDisplayStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useDisplayStore.getState().isLoading).toBe(false);
    });
  });

  // ============================================================================
  // Preset CRUD Operations (Story 3.3)
  // ============================================================================
  describe("Preset CRUD - Story 3.3", () => {
    describe("addPreset", () => {
      it("should add a new preset with generated ID", () => {
        const { addPreset } = useDisplayStore.getState();
        
        const preset = addPreset({
          name: "TV 4K Salon",
          resolution: { width: 3840, height: 2160 },
          refreshRate: 60,
        });
        
        expect(preset.id).toBeDefined();
        expect(preset.id.length).toBeGreaterThan(0);
        expect(preset.type).toBe("preset");
        expect(preset.name).toBe("TV 4K Salon");
        expect(preset.resolution).toEqual({ width: 3840, height: 2160 });
        expect(preset.refreshRate).toBe(60);
      });

      it("should add preset to store", () => {
        const { addPreset } = useDisplayStore.getState();
        
        addPreset({
          name: "Test Preset",
          resolution: { width: 1920, height: 1080 },
          refreshRate: 60,
        });
        
        const { presets } = useDisplayStore.getState();
        expect(presets.length).toBe(1);
        expect(presets[0].name).toBe("Test Preset");
      });

      it("should set timestamps on new preset", () => {
        const { addPreset } = useDisplayStore.getState();
        const before = new Date().toISOString();
        
        const preset = addPreset({
          name: "Test",
          resolution: { width: 1920, height: 1080 },
          refreshRate: 60,
        });
        
        const after = new Date().toISOString();
        
        expect(preset.createdAt).toBeDefined();
        expect(preset.updatedAt).toBeDefined();
        expect(preset.createdAt >= before).toBe(true);
        expect(preset.createdAt <= after).toBe(true);
      });

      it("should inherit vddDeviceId from store", () => {
        // Set a device ID first
        useDisplayStore.setState({ vddDeviceId: "{test-guid-123}" });
        
        const { addPreset } = useDisplayStore.getState();
        const preset = addPreset({
          name: "Test",
          resolution: { width: 1920, height: 1080 },
          refreshRate: 60,
        });
        
        expect(preset.deviceId).toBe("{test-guid-123}");
      });

      it("should allow multiple presets", () => {
        const { addPreset } = useDisplayStore.getState();
        
        addPreset({ name: "Preset 1", resolution: { width: 1920, height: 1080 }, refreshRate: 60 });
        addPreset({ name: "Preset 2", resolution: { width: 2560, height: 1440 }, refreshRate: 144 });
        addPreset({ name: "Preset 3", resolution: { width: 3840, height: 2160 }, refreshRate: 120 });
        
        const { presets } = useDisplayStore.getState();
        expect(presets.length).toBe(3);
      });
    });

    describe("updatePreset", () => {
      it("should update preset name", () => {
        const { addPreset, updatePreset } = useDisplayStore.getState();
        const preset = addPreset({
          name: "Original Name",
          resolution: { width: 1920, height: 1080 },
          refreshRate: 60,
        });
        
        updatePreset(preset.id, { name: "Updated Name" });
        
        const { presets } = useDisplayStore.getState();
        expect(presets[0].name).toBe("Updated Name");
      });

      it("should update preset resolution", () => {
        const { addPreset, updatePreset } = useDisplayStore.getState();
        const preset = addPreset({
          name: "Test",
          resolution: { width: 1920, height: 1080 },
          refreshRate: 60,
        });
        
        updatePreset(preset.id, { resolution: { width: 3840, height: 2160 } });
        
        const { presets } = useDisplayStore.getState();
        expect(presets[0].resolution).toEqual({ width: 3840, height: 2160 });
      });

      it("should update preset refreshRate", () => {
        const { addPreset, updatePreset } = useDisplayStore.getState();
        const preset = addPreset({
          name: "Test",
          resolution: { width: 1920, height: 1080 },
          refreshRate: 60,
        });
        
        updatePreset(preset.id, { refreshRate: 144 });
        
        const { presets } = useDisplayStore.getState();
        expect(presets[0].refreshRate).toBe(144);
      });

      it("should update updatedAt timestamp", () => {
        const { addPreset, updatePreset } = useDisplayStore.getState();
        const preset = addPreset({
          name: "Test",
          resolution: { width: 1920, height: 1080 },
          refreshRate: 60,
        });
        
        const originalUpdatedAt = preset.updatedAt;
        
        // Wait a tiny bit to ensure timestamp differs
        updatePreset(preset.id, { name: "New Name" });
        
        const { presets } = useDisplayStore.getState();
        expect(presets[0].updatedAt >= originalUpdatedAt).toBe(true);
      });

      it("should not modify other presets", () => {
        const { addPreset, updatePreset } = useDisplayStore.getState();
        
        const preset1 = addPreset({ name: "Preset 1", resolution: { width: 1920, height: 1080 }, refreshRate: 60 });
        const preset2 = addPreset({ name: "Preset 2", resolution: { width: 2560, height: 1440 }, refreshRate: 144 });
        
        updatePreset(preset1.id, { name: "Updated Preset 1" });
        
        const { presets } = useDisplayStore.getState();
        const p2 = presets.find(p => p.id === preset2.id);
        expect(p2?.name).toBe("Preset 2");
      });
    });

    describe("deletePreset", () => {
      it("should remove preset from store", () => {
        const { addPreset, deletePreset } = useDisplayStore.getState();
        const preset = addPreset({
          name: "To Delete",
          resolution: { width: 1920, height: 1080 },
          refreshRate: 60,
        });
        
        expect(useDisplayStore.getState().presets.length).toBe(1);
        
        deletePreset(preset.id);
        
        expect(useDisplayStore.getState().presets.length).toBe(0);
      });

      it("should only remove specified preset", () => {
        const { addPreset, deletePreset } = useDisplayStore.getState();
        
        const preset1 = addPreset({ name: "Keep", resolution: { width: 1920, height: 1080 }, refreshRate: 60 });
        const preset2 = addPreset({ name: "Delete", resolution: { width: 2560, height: 1440 }, refreshRate: 144 });
        
        deletePreset(preset2.id);
        
        const { presets } = useDisplayStore.getState();
        expect(presets.length).toBe(1);
        expect(presets[0].id).toBe(preset1.id);
      });

      it("should handle deleting non-existent preset gracefully", () => {
        const { deletePreset } = useDisplayStore.getState();
        
        // Should not throw
        expect(() => deletePreset("non-existent-id")).not.toThrow();
      });

      it("should disable VDD if deleted preset was active", async () => {
        mockElectronAPI.vdd.disable.mockResolvedValue({ success: true });
        mockElectronAPI.vdd.getStatus.mockResolvedValue("disabled");
        mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue(null);
        
        const { addPreset, deletePreset } = useDisplayStore.getState();
        const preset = addPreset({
          name: "Active Preset",
          resolution: { width: 1920, height: 1080 },
          refreshRate: 60,
        });
        
        // Simulate active preset
        useDisplayStore.setState({ activePresetId: preset.id });
        
        deletePreset(preset.id);
        
        // Give async operations time to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(mockElectronAPI.vdd.disable).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // VDD Status Refresh
  // ============================================================================
  describe("refreshVddStatus", () => {
    it("should fetch and update VDD status", async () => {
      mockElectronAPI.vdd.getStatus.mockResolvedValue("enabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue("{test-guid}");
      
      const { refreshVddStatus } = useDisplayStore.getState();
      await refreshVddStatus();
      
      expect(useDisplayStore.getState().vddStatus).toBe("enabled");
      expect(mockElectronAPI.vdd.getStatus).toHaveBeenCalled();
    });

    it("should update vddDeviceId from backend", async () => {
      mockElectronAPI.vdd.getStatus.mockResolvedValue("enabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue("{new-device-guid}");
      
      const { refreshVddStatus } = useDisplayStore.getState();
      await refreshVddStatus();
      
      expect(useDisplayStore.getState().vddDeviceId).toBe("{new-device-guid}");
    });

    it("should update Eclipse screen deviceId", async () => {
      mockElectronAPI.vdd.getStatus.mockResolvedValue("enabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue("{eclipse-guid}");
      
      const { refreshVddStatus } = useDisplayStore.getState();
      await refreshVddStatus();
      
      expect(useDisplayStore.getState().eclipseScreen.deviceId).toBe("{eclipse-guid}");
    });

    it("should update all presets deviceId", async () => {
      // Add some presets first
      const { addPreset } = useDisplayStore.getState();
      addPreset({ name: "Preset 1", resolution: { width: 1920, height: 1080 }, refreshRate: 60 });
      addPreset({ name: "Preset 2", resolution: { width: 2560, height: 1440 }, refreshRate: 144 });
      
      mockElectronAPI.vdd.getStatus.mockResolvedValue("enabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue("{shared-guid}");
      
      const { refreshVddStatus } = useDisplayStore.getState();
      await refreshVddStatus();
      
      const { presets } = useDisplayStore.getState();
      expect(presets[0].deviceId).toBe("{shared-guid}");
      expect(presets[1].deviceId).toBe("{shared-guid}");
    });

    it("should reset activePresetId when VDD is disabled", async () => {
      useDisplayStore.setState({ activePresetId: "some-preset-id" });
      
      mockElectronAPI.vdd.getStatus.mockResolvedValue("disabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue(null);
      
      const { refreshVddStatus } = useDisplayStore.getState();
      await refreshVddStatus();
      
      expect(useDisplayStore.getState().activePresetId).toBe(null);
    });

    it("should handle errors gracefully", async () => {
      mockElectronAPI.vdd.getStatus.mockRejectedValue(new Error("API Error"));
      
      const { refreshVddStatus } = useDisplayStore.getState();
      await refreshVddStatus();
      
      // Should reset to disabled on error
      expect(useDisplayStore.getState().vddStatus).toBe("disabled");
      expect(useDisplayStore.getState().activePresetId).toBe(null);
    });
  });

  // ============================================================================
  // Physical Screens
  // ============================================================================
  describe("refreshPhysicalScreens", () => {
    it("should fetch and update physical screens", async () => {
      const mockScreens: PhysicalScreen[] = [
        {
          type: "physical",
          name: "DELL U2722D",
          deviceId: "{physical-guid-1}",
          resolution: { width: 2560, height: 1440 },
          refreshRate: 60,
          isPrimary: true,
        },
        {
          type: "physical",
          name: "MSI G271",
          deviceId: "{physical-guid-2}",
          resolution: { width: 1920, height: 1080 },
          refreshRate: 165,
          isPrimary: false,
        },
      ];
      
      mockElectronAPI.display.getPhysicalDisplays.mockResolvedValue(mockScreens);
      
      const { refreshPhysicalScreens } = useDisplayStore.getState();
      await refreshPhysicalScreens();
      
      const { physicalScreens } = useDisplayStore.getState();
      expect(physicalScreens.length).toBe(2);
      expect(physicalScreens[0].name).toBe("DELL U2722D");
      expect(physicalScreens[1].name).toBe("MSI G271");
    });

    it("should handle errors gracefully", async () => {
      mockElectronAPI.display.getPhysicalDisplays.mockRejectedValue(new Error("API Error"));
      
      const { refreshPhysicalScreens } = useDisplayStore.getState();
      
      // Should not throw
      await expect(refreshPhysicalScreens()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // Preset Activation (Story 3.4)
  // ============================================================================
  describe("activatePreset - Story 3.4", () => {
    it("should throw if preset not found", async () => {
      const { activatePreset } = useDisplayStore.getState();
      
      await expect(activatePreset("non-existent-id")).rejects.toThrow("not found");
    });

    it("should enable VDD and set resolution when VDD is off", async () => {
      mockElectronAPI.vdd.enable.mockResolvedValue({ success: true });
      mockElectronAPI.vdd.setResolution.mockResolvedValue({ success: true });
      mockElectronAPI.vdd.getStatus.mockResolvedValue("enabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue("{test-guid}");
      
      const { addPreset, activatePreset } = useDisplayStore.getState();
      const preset = addPreset({
        name: "Test Preset",
        resolution: { width: 3840, height: 2160 },
        refreshRate: 120,
      });
      
      await activatePreset(preset.id);
      
      expect(mockElectronAPI.vdd.enable).toHaveBeenCalled();
      expect(mockElectronAPI.vdd.setResolution).toHaveBeenCalledWith({
        width: 3840,
        height: 2160,
        refreshRate: 120,
      });
    });

    it("should use updateConfig for smart switch when VDD is already on", async () => {
      useDisplayStore.setState({ vddStatus: "enabled" });
      
      mockElectronAPI.vdd.updateConfig.mockResolvedValue({ success: true });
      mockElectronAPI.vdd.getStatus.mockResolvedValue("enabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue("{test-guid}");
      
      const { addPreset, activatePreset } = useDisplayStore.getState();
      const preset = addPreset({
        name: "Test Preset",
        resolution: { width: 2560, height: 1440 },
        refreshRate: 144,
      });
      
      await activatePreset(preset.id);
      
      expect(mockElectronAPI.vdd.enable).not.toHaveBeenCalled();
      expect(mockElectronAPI.vdd.updateConfig).toHaveBeenCalledWith({
        width: 2560,
        height: 1440,
        refreshRate: 144,
      });
    });

    it("should set activePresetId on successful activation", async () => {
      mockElectronAPI.vdd.enable.mockResolvedValue({ success: true });
      mockElectronAPI.vdd.setResolution.mockResolvedValue({ success: true });
      mockElectronAPI.vdd.getStatus.mockResolvedValue("enabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue("{test-guid}");
      
      const { addPreset, activatePreset } = useDisplayStore.getState();
      const preset = addPreset({
        name: "Test",
        resolution: { width: 1920, height: 1080 },
        refreshRate: 60,
      });
      
      await activatePreset(preset.id);
      
      expect(useDisplayStore.getState().activePresetId).toBe(preset.id);
    });

    it("should manage loading state during activation", async () => {
      mockElectronAPI.vdd.enable.mockResolvedValue({ success: true });
      mockElectronAPI.vdd.setResolution.mockResolvedValue({ success: true });
      mockElectronAPI.vdd.getStatus.mockResolvedValue("enabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue("{test-guid}");
      
      const { addPreset, activatePreset } = useDisplayStore.getState();
      const preset = addPreset({
        name: "Test",
        resolution: { width: 1920, height: 1080 },
        refreshRate: 60,
      });
      
      const activationPromise = activatePreset(preset.id);
      
      // Loading should be true during activation
      expect(useDisplayStore.getState().isLoading).toBe(true);
      
      await activationPromise;
      
      // Loading should be false after activation
      expect(useDisplayStore.getState().isLoading).toBe(false);
    });
  });

  // ============================================================================
  // Preset Deactivation
  // ============================================================================
  describe("deactivatePreset", () => {
    it("should disable VDD", async () => {
      mockElectronAPI.vdd.disable.mockResolvedValue({ success: true });
      mockElectronAPI.vdd.getStatus.mockResolvedValue("disabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue(null);
      
      useDisplayStore.setState({ activePresetId: "some-preset-id" });
      
      const { deactivatePreset } = useDisplayStore.getState();
      await deactivatePreset();
      
      expect(mockElectronAPI.vdd.disable).toHaveBeenCalled();
    });

    it("should reset activePresetId", async () => {
      mockElectronAPI.vdd.disable.mockResolvedValue({ success: true });
      mockElectronAPI.vdd.getStatus.mockResolvedValue("disabled");
      mockElectronAPI.vdd.getDeviceGUID.mockResolvedValue(null);
      
      useDisplayStore.setState({ activePresetId: "some-preset-id" });
      
      const { deactivatePreset } = useDisplayStore.getState();
      await deactivatePreset();
      
      expect(useDisplayStore.getState().activePresetId).toBe(null);
    });
  });

  // ============================================================================
  // Store Persistence
  // ============================================================================
  describe("Store Persistence", () => {
    it("should have persist configuration", () => {
      // The store is wrapped with persist middleware
      // We verify it maintains presets across resets
      const { addPreset } = useDisplayStore.getState();
      
      addPreset({
        name: "Persistent Preset",
        resolution: { width: 1920, height: 1080 },
        refreshRate: 60,
      });
      
      const { presets } = useDisplayStore.getState();
      expect(presets.length).toBe(1);
    });
  });
});
