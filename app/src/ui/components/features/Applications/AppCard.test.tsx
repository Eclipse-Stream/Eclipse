// Tests unitaires pour AppCard.tsx - Story 7.2
// Carte d'application Sunshine avec badges et actions

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppCard } from "./AppCard";
import type { SunshineApp } from "@domain/types";

describe("AppCard - Story 7.2", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const defaultApp: SunshineApp = {
    name: "Steam",
    cmd: "C:\\Program Files\\Steam\\steam.exe",
    "image-path": "data:image/png;base64,abc123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering
  // ============================================================================
  describe("Rendering", () => {
    it("should render app name", () => {
      render(<AppCard app={defaultApp} isEclipse={false} />);

      expect(screen.getByText("Steam")).toBeInTheDocument();
    });

    it("should render executable filename", () => {
      render(<AppCard app={defaultApp} isEclipse={false} />);

      expect(screen.getByText("steam.exe")).toBeInTheDocument();
    });

    it("should render app icon when image-path is base64", () => {
      render(<AppCard app={defaultApp} isEclipse={false} />);

      const img = screen.getByAltText("Steam");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "data:image/png;base64,abc123");
    });

    it("should render default icon when no image-path", () => {
      const appWithoutIcon: SunshineApp = { name: "Test App" };
      render(<AppCard app={appWithoutIcon} isEclipse={false} />);

      // Default AppWindow icon is rendered (can't easily test SVG, but no img)
      expect(screen.queryByAltText("Test App")).not.toBeInTheDocument();
    });

    it("should not render cmd filename when cmd is empty", () => {
      const appWithoutCmd: SunshineApp = { name: "Desktop" };
      render(<AppCard app={appWithoutCmd} isEclipse={false} />);

      expect(screen.getByText("Desktop")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Eclipse Badge
  // ============================================================================
  describe("Eclipse Badge", () => {
    it("should show 'Défaut' badge for Eclipse app", () => {
      render(<AppCard app={defaultApp} isEclipse={true} />);

      expect(screen.getByText("Défaut")).toBeInTheDocument();
    });

    it("should not show 'Défaut' badge for non-Eclipse apps", () => {
      render(<AppCard app={defaultApp} isEclipse={false} />);

      expect(screen.queryByText("Défaut")).not.toBeInTheDocument();
    });

    it("should show 'Eclipse' badge for Eclipse-managed apps", () => {
      render(
        <AppCard
          app={defaultApp}
          isEclipse={false}
          isEclipseManagedApp={true}
        />
      );

      expect(screen.getByText("Eclipse")).toBeInTheDocument();
    });

    it("should not show 'Eclipse' badge for non-managed apps", () => {
      render(
        <AppCard
          app={defaultApp}
          isEclipse={false}
          isEclipseManagedApp={false}
        />
      );

      expect(screen.queryByText("Eclipse")).not.toBeInTheDocument();
    });

    it("should not show 'Eclipse' badge on Eclipse app itself", () => {
      render(
        <AppCard
          app={defaultApp}
          isEclipse={true}
          isEclipseManagedApp={true}
        />
      );

      // Only show 'Défaut', not 'Eclipse' badge
      expect(screen.getByText("Défaut")).toBeInTheDocument();
      expect(screen.queryByText("Eclipse")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Actions
  // ============================================================================
  describe("Actions", () => {
    it("should render edit button when onEdit is provided", () => {
      render(
        <AppCard app={defaultApp} isEclipse={false} onEdit={mockOnEdit} />
      );

      expect(screen.getByTitle("Modifier")).toBeInTheDocument();
    });

    it("should render delete button when onDelete is provided", () => {
      render(
        <AppCard app={defaultApp} isEclipse={false} onDelete={mockOnDelete} />
      );

      expect(screen.getByTitle("Supprimer")).toBeInTheDocument();
    });

    it("should call onEdit when edit button is clicked", () => {
      render(
        <AppCard app={defaultApp} isEclipse={false} onEdit={mockOnEdit} />
      );

      fireEvent.click(screen.getByTitle("Modifier"));

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it("should call onDelete when delete button is clicked", () => {
      render(
        <AppCard app={defaultApp} isEclipse={false} onDelete={mockOnDelete} />
      );

      fireEvent.click(screen.getByTitle("Supprimer"));

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it("should not show action buttons for Eclipse app", () => {
      render(
        <AppCard
          app={defaultApp}
          isEclipse={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByTitle("Modifier")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Supprimer")).not.toBeInTheDocument();
    });

    it("should not render action buttons when no handlers provided", () => {
      render(<AppCard app={defaultApp} isEclipse={false} />);

      expect(screen.queryByTitle("Modifier")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Supprimer")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================
  describe("Accessibility", () => {
    it("should have title attribute on app name for truncation", () => {
      const longNameApp: SunshineApp = {
        name: "Very Long Application Name That Might Be Truncated",
        cmd: "app.exe",
      };
      render(<AppCard app={longNameApp} isEclipse={false} />);

      const nameElement = screen.getByTitle(
        "Very Long Application Name That Might Be Truncated"
      );
      expect(nameElement).toBeInTheDocument();
    });

    it("should have title attribute on cmd for truncation", () => {
      render(<AppCard app={defaultApp} isEclipse={false} />);

      expect(
        screen.getByTitle("C:\\Program Files\\Steam\\steam.exe")
      ).toBeInTheDocument();
    });
  });
});
