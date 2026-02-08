// Tests unitaires pour AppsGrid.tsx - Story 7.2
// Grille d'applications avec tri et badges

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppsGrid } from "./AppsGrid";
import type { SunshineApp } from "@domain/types";
import { APP_CONSTANTS } from "@domain/types";

// Mock store
vi.mock("@application/stores", () => ({
  useSunshineAppsStore: () => ({
    isEclipseManagedApp: (app: SunshineApp) =>
      app["prep-cmd"]?.some((cmd) => cmd.do?.includes("ECLIPSE_MANAGED_APP")),
  }),
}));

describe("AppsGrid - Story 7.2", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const eclipseApp: SunshineApp = {
    name: APP_CONSTANTS.ECLIPSE_APP_NAME,
    cmd: "",
  };

  const steamApp: SunshineApp = {
    name: "Steam",
    cmd: "steam.exe",
    "prep-cmd": [
      { do: 'cmd /c "rem ECLIPSE_MANAGED_APP"', undo: "" },
    ],
  };

  const blenderApp: SunshineApp = {
    name: "Blender",
    cmd: "blender.exe",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering
  // ============================================================================
  describe("Rendering", () => {
    it("should render all apps", () => {
      render(
        <AppsGrid
          apps={[eclipseApp, steamApp, blenderApp]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Eclipse app name and badge can both contain "Eclipse" - use title attr
      expect(screen.getByTitle(APP_CONSTANTS.ECLIPSE_APP_NAME)).toBeInTheDocument();
      expect(screen.getByText("Steam")).toBeInTheDocument();
      expect(screen.getByText("Blender")).toBeInTheDocument();
    });

    it("should render empty grid when no apps", () => {
      const { container } = render(
        <AppsGrid apps={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
      expect(grid?.children.length).toBe(0);
    });
  });

  // ============================================================================
  // Sorting
  // ============================================================================
  describe("Sorting", () => {
    it("should display Eclipse app first", () => {
      const { container } = render(
        <AppsGrid
          apps={[blenderApp, steamApp, eclipseApp]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const cards = container.querySelectorAll(".grid > div");
      expect(cards[0]).toHaveTextContent(APP_CONSTANTS.ECLIPSE_APP_NAME);
    });

    it("should sort other apps alphabetically", () => {
      const zApp: SunshineApp = { name: "Zoom", cmd: "zoom.exe" };
      const aApp: SunshineApp = { name: "Adobe", cmd: "adobe.exe" };

      const { container } = render(
        <AppsGrid
          apps={[zApp, eclipseApp, aApp]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const cards = container.querySelectorAll(".grid > div");
      expect(cards[0]).toHaveTextContent(APP_CONSTANTS.ECLIPSE_APP_NAME);
      expect(cards[1]).toHaveTextContent("Adobe");
      expect(cards[2]).toHaveTextContent("Zoom");
    });
  });

  // ============================================================================
  // Eclipse Badge Detection
  // ============================================================================
  describe("Eclipse Badge Detection", () => {
    it("should show 'Défaut' badge on Eclipse app", () => {
      render(
        <AppsGrid
          apps={[eclipseApp]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Défaut")).toBeInTheDocument();
    });

    it("should show 'Eclipse' badge on apps with Eclipse prep-cmd", () => {
      render(
        <AppsGrid
          apps={[steamApp]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Eclipse")).toBeInTheDocument();
    });

    it("should not show 'Eclipse' badge on regular apps", () => {
      render(
        <AppsGrid
          apps={[blenderApp]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByText("Eclipse")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Actions
  // ============================================================================
  describe("Actions", () => {
    it("should call onEdit with correct app", () => {
      render(
        <AppsGrid
          apps={[steamApp]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByTitle("Modifier"));

      expect(mockOnEdit).toHaveBeenCalledWith(steamApp);
    });

    it("should call onDelete with correct app", () => {
      render(
        <AppsGrid
          apps={[steamApp]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByTitle("Supprimer"));

      expect(mockOnDelete).toHaveBeenCalledWith(steamApp);
    });

    it("should not show delete button for Eclipse app", () => {
      render(
        <AppsGrid
          apps={[eclipseApp, steamApp]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Only one delete button (for Steam, not Eclipse)
      const deleteButtons = screen.getAllByTitle("Supprimer");
      expect(deleteButtons.length).toBe(1);
    });

    it("should not render action buttons when no handlers provided", () => {
      render(<AppsGrid apps={[steamApp, blenderApp]} />);

      expect(screen.queryByTitle("Modifier")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Supprimer")).not.toBeInTheDocument();
    });
  });
});
