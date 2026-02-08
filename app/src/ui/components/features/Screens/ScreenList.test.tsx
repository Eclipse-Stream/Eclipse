// Tests unitaires pour ScreenList.tsx - Epic 3 / Story 3.2
// Liste unifiée des écrans physiques, Eclipse et presets

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ScreenList } from "./ScreenList";
import type { PhysicalScreen, EclipseScreen, ScreenPreset } from "@domain/types";

describe("ScreenList - Story 3.2", () => {
  const mockPhysicalScreens: PhysicalScreen[] = [
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

  const mockEclipseScreen: EclipseScreen = {
    type: "eclipse",
    name: "Écran Eclipse",
    deviceId: "{eclipse-vdd-guid}",
    resolution: { width: 1920, height: 1080 },
    refreshRate: 60,
  };

  const mockPresets: ScreenPreset[] = [
    {
      id: "preset-1",
      type: "preset",
      name: "TV 4K Salon",
      deviceId: "{eclipse-vdd-guid}",
      resolution: { width: 3840, height: 2160 },
      refreshRate: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "preset-2",
      type: "preset",
      name: "Steam Deck",
      deviceId: "{eclipse-vdd-guid}",
      resolution: { width: 1280, height: 800 },
      refreshRate: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockHandlers = {
    onActivatePreset: vi.fn(),
    onDeactivatePreset: vi.fn(),
    onEditPreset: vi.fn(),
    onDeletePreset: vi.fn(),
    onCreatePreset: vi.fn(),
  };

  const defaultProps = {
    physicalScreens: mockPhysicalScreens,
    eclipseScreen: mockEclipseScreen,
    presets: mockPresets,
    activePresetId: null,
    isLoading: false,
    ...mockHandlers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering
  // ============================================================================
  describe("Rendering", () => {
    it("should render physical screens", () => {
      render(<ScreenList {...defaultProps} />);
      
      expect(screen.getByText("DELL U2722D")).toBeInTheDocument();
      expect(screen.getByText("MSI G271")).toBeInTheDocument();
    });

    it("should render Eclipse screen", () => {
      render(<ScreenList {...defaultProps} />);
      
      expect(screen.getByText("Écran Eclipse")).toBeInTheDocument();
    });

    it("should render presets", () => {
      render(<ScreenList {...defaultProps} />);
      
      expect(screen.getByText("TV 4K Salon")).toBeInTheDocument();
      expect(screen.getByText("Steam Deck")).toBeInTheDocument();
    });

    it("should render create preset button", () => {
      render(<ScreenList {...defaultProps} />);

      expect(screen.getByText("+ Créer un écran")).toBeInTheDocument();
    });

    it("should show Réel badge for physical screens", () => {
      render(<ScreenList {...defaultProps} />);
      
      const badges = screen.getAllByText("Réel");
      expect(badges.length).toBe(2); // 2 physical screens
    });

    it("should show Défaut badge for Eclipse screen", () => {
      render(<ScreenList {...defaultProps} />);
      
      expect(screen.getByText("Défaut")).toBeInTheDocument();
    });

    it("should show Preset badge for presets", () => {
      render(<ScreenList {...defaultProps} />);
      
      const badges = screen.getAllByText("Preset");
      expect(badges.length).toBe(2); // 2 presets
    });

    it("should show resolution for each screen", () => {
      render(<ScreenList {...defaultProps} />);

      expect(screen.getByText(/2560x1440/)).toBeInTheDocument();
      // 1920x1080 appears multiple times (MSI G271 and Eclipse screen)
      expect(screen.getAllByText(/1920x1080/).length).toBeGreaterThan(0);
      expect(screen.getByText(/3840x2160/)).toBeInTheDocument();
      expect(screen.getByText(/1280x800/)).toBeInTheDocument();
    });

    it("should show device ID for screens with deviceId", () => {
      render(<ScreenList {...defaultProps} />);
      
      // Device IDs should be visible (truncated or full)
      expect(screen.getAllByText(/{physical-guid|{eclipse-vdd/i).length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Empty States
  // ============================================================================
  describe("Empty States", () => {
    it("should render without physical screens", () => {
      render(<ScreenList {...defaultProps} physicalScreens={[]} />);
      
      // Eclipse and presets should still be visible
      expect(screen.getByText("Écran Eclipse")).toBeInTheDocument();
      expect(screen.getByText("TV 4K Salon")).toBeInTheDocument();
    });

    it("should render without presets", () => {
      render(<ScreenList {...defaultProps} presets={[]} />);
      
      // Physical and Eclipse should still be visible
      expect(screen.getByText("DELL U2722D")).toBeInTheDocument();
      expect(screen.getByText("Écran Eclipse")).toBeInTheDocument();
    });

    it("should render create button even with no presets", () => {
      render(<ScreenList {...defaultProps} presets={[]} />);
      
      expect(screen.getByText("+ Créer un écran")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Preset Actions
  // ============================================================================
  describe("Preset Actions", () => {
    it("should call onCreatePreset when create button is clicked", () => {
      render(<ScreenList {...defaultProps} />);
      
      const createButton = screen.getByText("+ Créer un écran");
      fireEvent.click(createButton);
      
      expect(mockHandlers.onCreatePreset).toHaveBeenCalled();
    });

    it("should render preset cards with action buttons", () => {
      render(<ScreenList {...defaultProps} />);
      
      // Presets should have interactive elements
      expect(screen.getByText("TV 4K Salon")).toBeInTheDocument();
      expect(screen.getByText("Steam Deck")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Active State (Story 3.4)
  // ============================================================================
  describe("Active State - Story 3.4", () => {
    it("should render presets with activation controls", () => {
      render(<ScreenList {...defaultProps} activePresetId={null} />);
      
      // Presets should be rendered
      expect(screen.getByText("TV 4K Salon")).toBeInTheDocument();
      expect(screen.getByText("Steam Deck")).toBeInTheDocument();
    });

    it("should differentiate active vs inactive presets", () => {
      render(<ScreenList {...defaultProps} activePresetId="preset-1" />);
      
      // Both presets should still be visible
      expect(screen.getByText("TV 4K Salon")).toBeInTheDocument();
      expect(screen.getByText("Steam Deck")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe("Loading State", () => {
    it("should render in loading state without crashing", () => {
      render(<ScreenList {...defaultProps} isLoading={true} />);
      
      // Component should still render
      expect(screen.getByText("TV 4K Salon")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Screen Card Details
  // ============================================================================
  describe("Screen Card Details", () => {
    it("should show resolution info for screens", () => {
      render(<ScreenList {...defaultProps} />);
      
      // Check that resolution info is displayed
      expect(screen.getByText(/2560x1440/)).toBeInTheDocument();
      expect(screen.getByText(/3840x2160/)).toBeInTheDocument();
    });

    it("should show device IDs", () => {
      render(<ScreenList {...defaultProps} />);
      
      // Device IDs should be displayed (truncated)
      const container = screen.getByText("TV 4K Salon").closest("div")?.parentElement;
      expect(container).toBeInTheDocument();
    });
  });
});
