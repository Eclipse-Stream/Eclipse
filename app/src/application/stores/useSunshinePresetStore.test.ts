// Tests unitaires pour useSunshinePresetStore.ts - Story 5.1
// Store Zustand pour la gestion des presets Sunshine

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useSunshinePresetStore } from "./useSunshinePresetStore";
import type { SunshinePreset, CreateSunshinePresetData } from "@domain/types";

describe("useSunshinePresetStore - Story 5.1", () => {
  beforeEach(() => {
    // Reset store to initial state avec Eclipse Default
    useSunshinePresetStore.getState().reset();
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
      const state = useSunshinePresetStore.getState();

      expect(state.isLoading).toBe(false);
      expect(state.activePresetId).toBe(null);
      expect(state.presets.length).toBe(1); // Eclipse Default
    });

    it("should have Eclipse Default preset", () => {
      const { presets } = useSunshinePresetStore.getState();
      const eclipseDefault = presets.find((p) => p.id === "eclipse-default");

      expect(eclipseDefault).toBeDefined();
      expect(eclipseDefault?.name).toBe("Eclipse Default");
      expect(eclipseDefault?.isReadOnly).toBe(true);
      expect(eclipseDefault?.type).toBe("simple");
    });

    it("should expose all required actions", () => {
      const state = useSunshinePresetStore.getState();

      expect(typeof state.addPreset).toBe("function");
      expect(typeof state.updatePreset).toBe("function");
      expect(typeof state.deletePreset).toBe("function");
      expect(typeof state.getPresetById).toBe("function");
      expect(typeof state.activatePreset).toBe("function");
      expect(typeof state.deactivatePreset).toBe("function");
      expect(typeof state.setLoading).toBe("function");
      expect(typeof state.reset).toBe("function");
    });
  });

  // ============================================================================
  // CRUD Operations
  // ============================================================================
  describe("CRUD Operations", () => {
    describe("addPreset", () => {
      it("should add a new preset with default values", () => {
        const { addPreset, presets } = useSunshinePresetStore.getState();
        const initialCount = presets.length;

        const newPreset = addPreset({ name: "Test Preset" });

        const updatedState = useSunshinePresetStore.getState();
        expect(updatedState.presets.length).toBe(initialCount + 1);
        expect(newPreset.name).toBe("Test Preset");
        expect(newPreset.type).toBe("simple");
        expect(newPreset.isReadOnly).toBe(false);
      });

      it("should add a preset with custom display config", () => {
        const { addPreset } = useSunshinePresetStore.getState();

        const data: CreateSunshinePresetData = {
          name: "Gaming Preset",
          type: "simple",
          display: {
            mode: "enable-primary",
            resolutionStrategy: "moonlight",
            fps: 120,
            bitrate: 50,
          },
        };

        const newPreset = addPreset(data);

        expect(newPreset.display.mode).toBe("enable-primary");
        expect(newPreset.display.fps).toBe(120);
        expect(newPreset.display.bitrate).toBe(50);
      });

      it("should add a preset with custom audio config", () => {
        const { addPreset } = useSunshinePresetStore.getState();

        const newPreset = addPreset({
          name: "Audio Preset",
          audio: { mode: "both" },
        });

        expect(newPreset.audio.mode).toBe("both");
      });

      it("should generate unique IDs for each preset", () => {
        const { addPreset } = useSunshinePresetStore.getState();

        const preset1 = addPreset({ name: "Preset 1" });
        const preset2 = addPreset({ name: "Preset 2" });

        expect(preset1.id).not.toBe(preset2.id);
      });

      it("should set createdAt and updatedAt timestamps", () => {
        const { addPreset } = useSunshinePresetStore.getState();

        const beforeAdd = new Date().toISOString();
        const newPreset = addPreset({ name: "Timestamped Preset" });
        const afterAdd = new Date().toISOString();

        expect(newPreset.createdAt >= beforeAdd).toBe(true);
        expect(newPreset.createdAt <= afterAdd).toBe(true);
        expect(newPreset.updatedAt).toBe(newPreset.createdAt);
      });
    });

    describe("updatePreset", () => {
      it("should update an existing preset", async () => {
        const { addPreset, updatePreset, getPresetById } =
          useSunshinePresetStore.getState();

        const preset = addPreset({ name: "Original Name" });
        await updatePreset(preset.id, { name: "Updated Name" });

        const updatedPreset = getPresetById(preset.id);
        expect(updatedPreset?.name).toBe("Updated Name");
      });

      it("should update nested display config", async () => {
        const { addPreset, updatePreset, getPresetById } =
          useSunshinePresetStore.getState();

        const preset = addPreset({ name: "Test", display: { fps: 60 } });
        await updatePreset(preset.id, { display: { fps: 120 } });

        const updatedPreset = getPresetById(preset.id);
        expect(updatedPreset?.display.fps).toBe(120);
        // Other display properties should be preserved
        expect(updatedPreset?.display.mode).toBe(preset.display.mode);
      });

      it("should update updatedAt timestamp", async () => {
        const { addPreset, updatePreset, getPresetById } =
          useSunshinePresetStore.getState();

        const preset = addPreset({ name: "Test" });
        const originalUpdatedAt = preset.updatedAt;

        // Small delay to ensure different timestamp
        await updatePreset(preset.id, { name: "Updated" });

        const updatedPreset = getPresetById(preset.id);
        expect(updatedPreset?.updatedAt >= originalUpdatedAt).toBe(true);
      });

      it("should throw error when updating read-only preset", async () => {
        const { updatePreset } = useSunshinePresetStore.getState();

        await expect(
          updatePreset("eclipse-default", { name: "Hacked" })
        ).rejects.toThrow('Preset "Eclipse Default" is read-only');
      });

      it("should throw error when preset not found", async () => {
        const { updatePreset } = useSunshinePresetStore.getState();

        await expect(
          updatePreset("non-existent-id", { name: "Test" })
        ).rejects.toThrow("Preset non-existent-id not found");
      });
    });

    describe("deletePreset", () => {
      it("should delete an existing preset", () => {
        const { addPreset, deletePreset, presets } =
          useSunshinePresetStore.getState();

        const preset = addPreset({ name: "To Delete" });
        const countAfterAdd = useSunshinePresetStore.getState().presets.length;

        deletePreset(preset.id);

        const countAfterDelete =
          useSunshinePresetStore.getState().presets.length;
        expect(countAfterDelete).toBe(countAfterAdd - 1);
      });

      it("should throw error when deleting read-only preset", () => {
        const { deletePreset } = useSunshinePresetStore.getState();

        expect(() => {
          deletePreset("eclipse-default");
        }).toThrow('Preset "Eclipse Default" cannot be deleted');
      });

      it("should throw error when preset not found", () => {
        const { deletePreset } = useSunshinePresetStore.getState();

        expect(() => {
          deletePreset("non-existent-id");
        }).toThrow("Preset non-existent-id not found");
      });

      it("should reset activePresetId when deleting active preset", () => {
        const { addPreset, activatePreset, deletePreset } =
          useSunshinePresetStore.getState();

        const preset = addPreset({ name: "Active Preset" });
        useSunshinePresetStore.setState({ activePresetId: preset.id });

        deletePreset(preset.id);

        const { activePresetId } = useSunshinePresetStore.getState();
        expect(activePresetId).toBe(null);
      });
    });

    describe("getPresetById", () => {
      it("should return preset when found", () => {
        const { addPreset, getPresetById } = useSunshinePresetStore.getState();

        const preset = addPreset({ name: "Test" });
        const found = getPresetById(preset.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(preset.id);
      });

      it("should return undefined when not found", () => {
        const { getPresetById } = useSunshinePresetStore.getState();

        const found = getPresetById("non-existent-id");

        expect(found).toBeUndefined();
      });

      it("should find Eclipse Default by ID", () => {
        const { getPresetById } = useSunshinePresetStore.getState();

        const found = getPresetById("eclipse-default");

        expect(found).toBeDefined();
        expect(found?.name).toBe("Eclipse Default");
      });
    });
  });

  // ============================================================================
  // Activation
  // ============================================================================
  describe("Activation", () => {
    it("should activate a preset", async () => {
      const { addPreset, activatePreset } = useSunshinePresetStore.getState();

      const preset = addPreset({ name: "To Activate" });
      await activatePreset(preset.id);

      const { activePresetId } = useSunshinePresetStore.getState();
      expect(activePresetId).toBe(preset.id);
    });

    it("should deactivate the active preset", async () => {
      const { addPreset, activatePreset, deactivatePreset } =
        useSunshinePresetStore.getState();

      const preset = addPreset({ name: "Active" });
      await activatePreset(preset.id);
      deactivatePreset();

      const { activePresetId } = useSunshinePresetStore.getState();
      expect(activePresetId).toBe(null);
    });

    it("should throw error when activating non-existent preset", async () => {
      const { activatePreset } = useSunshinePresetStore.getState();

      await expect(activatePreset("non-existent-id")).rejects.toThrow(
        "Preset non-existent-id not found"
      );
    });

    it("should set loading state during activation", async () => {
      const { addPreset, activatePreset } = useSunshinePresetStore.getState();

      const preset = addPreset({ name: "Test" });

      // Start activation
      const activationPromise = activatePreset(preset.id);

      // Check loading state after activation completes
      await activationPromise;
      const { isLoading } = useSunshinePresetStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  // ============================================================================
  // State Mutations
  // ============================================================================
  describe("State Mutations", () => {
    it("should set loading state", () => {
      const { setLoading } = useSunshinePresetStore.getState();

      setLoading(true);
      expect(useSunshinePresetStore.getState().isLoading).toBe(true);

      setLoading(false);
      expect(useSunshinePresetStore.getState().isLoading).toBe(false);
    });

    it("should reset to initial state", () => {
      const { addPreset, reset } = useSunshinePresetStore.getState();

      // Add some presets
      addPreset({ name: "Preset 1" });
      addPreset({ name: "Preset 2" });
      useSunshinePresetStore.setState({ activePresetId: "some-id" });

      // Reset
      reset();

      const state = useSunshinePresetStore.getState();
      expect(state.presets.length).toBe(1); // Only Eclipse Default
      expect(state.activePresetId).toBe(null);
      expect(state.isLoading).toBe(false);
    });
  });

  // ============================================================================
  // Eclipse Default Preset
  // ============================================================================
  describe("Eclipse Default Preset", () => {
    it("should always have Eclipse Default after reset", () => {
      const { reset, presets } = useSunshinePresetStore.getState();

      reset();

      const updatedPresets = useSunshinePresetStore.getState().presets;
      const eclipseDefault = updatedPresets.find(
        (p) => p.id === "eclipse-default"
      );

      expect(eclipseDefault).toBeDefined();
    });

    it("Eclipse Default should have correct display config", () => {
      const { getPresetById } = useSunshinePresetStore.getState();

      const eclipseDefault = getPresetById("eclipse-default");

      expect(eclipseDefault?.display.mode).toBe("enable");
      expect(eclipseDefault?.display.resolutionStrategy).toBe("moonlight");
      expect(eclipseDefault?.display.fps).toBe(60);
      expect(eclipseDefault?.display.bitrate).toBe(35); // DEFAULT_BITRATE
    });

    it("Eclipse Default should have correct audio config", () => {
      const { getPresetById } = useSunshinePresetStore.getState();

      const eclipseDefault = getPresetById("eclipse-default");

      expect(eclipseDefault?.audio.mode).toBe("moonlight");
    });

    it("Eclipse Default should have correct network config", () => {
      const { getPresetById } = useSunshinePresetStore.getState();

      const eclipseDefault = getPresetById("eclipse-default");

      expect(eclipseDefault?.network.upnp).toBe(false);
    });

    it("Eclipse Default should have correct input config", () => {
      const { getPresetById } = useSunshinePresetStore.getState();

      const eclipseDefault = getPresetById("eclipse-default");

      expect(eclipseDefault?.inputs.keyboard).toBe(true);
      expect(eclipseDefault?.inputs.mouse).toBe(true);
      expect(eclipseDefault?.inputs.gamepad).toBe(true);
    });

    it("Eclipse Default should have balanced encoder profile (Story 12.7)", () => {
      const { getPresetById } = useSunshinePresetStore.getState();
      const eclipseDefault = getPresetById("eclipse-default");

      expect(eclipseDefault?.display.encoderProfile).toBe("balanced");
    });
  });

  // ============================================================================
  // Encoder Profile (Story 12.7)
  // ============================================================================
  describe("Encoder Profile (Story 12.7)", () => {
    it("should add a preset with default encoder profile (balanced)", () => {
      const { addPreset } = useSunshinePresetStore.getState();
      const newPreset = addPreset({ name: "Test Encoder Default" });

      expect(newPreset.display.encoderProfile).toBe("balanced");
    });

    it("should add a preset with custom encoder profile", () => {
      const { addPreset } = useSunshinePresetStore.getState();
      const newPreset = addPreset({
        name: "Low Latency Gaming",
        display: { encoderProfile: "low_latency" },
      });

      expect(newPreset.display.encoderProfile).toBe("low_latency");
    });

    it("should add a preset with quality encoder profile", () => {
      const { addPreset } = useSunshinePresetStore.getState();
      const newPreset = addPreset({
        name: "Cinema Quality",
        display: { encoderProfile: "quality" },
      });

      expect(newPreset.display.encoderProfile).toBe("quality");
    });

    it("should update encoder profile on existing preset", async () => {
      const { addPreset, updatePreset, getPresetById } = useSunshinePresetStore.getState();
      const preset = addPreset({ name: "Updateable" });

      await updatePreset(preset.id, {
        display: { encoderProfile: "quality" },
      });

      const updated = useSunshinePresetStore.getState().getPresetById(preset.id);
      expect(updated?.display.encoderProfile).toBe("quality");
    });

    it("should preserve encoder profile when updating other fields", async () => {
      const { addPreset, updatePreset } = useSunshinePresetStore.getState();
      const preset = addPreset({
        name: "Keep Profile",
        display: { encoderProfile: "low_latency" },
      });

      await updatePreset(preset.id, {
        display: { bitrate: 80 },
      });

      const updated = useSunshinePresetStore.getState().getPresetById(preset.id);
      expect(updated?.display.encoderProfile).toBe("low_latency");
      expect(updated?.display.bitrate).toBe(80);
    });
  });
});
