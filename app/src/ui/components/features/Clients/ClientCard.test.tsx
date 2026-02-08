// Tests unitaires pour ClientCard.tsx - Story 6.1 & 6.3
// Affichage d'un client Moonlight appairé avec bouton suppression

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClientCard } from "./ClientCard";
import type { MoonlightClient } from "@domain/types";

describe("ClientCard - Story 6.1", () => {
  const mockOnDelete = vi.fn();

  const defaultClient: MoonlightClient = {
    uuid: "test-uuid-123",
    name: "iPhone de Jean",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering
  // ============================================================================
  describe("Rendering", () => {
    it("should render client name", () => {
      render(<ClientCard client={defaultClient} onDelete={mockOnDelete} />);

      expect(screen.getByText("iPhone de Jean")).toBeInTheDocument();
    });

    it("should display Moonlight label", () => {
      render(<ClientCard client={defaultClient} onDelete={mockOnDelete} />);

      expect(screen.getByText("Moonlight")).toBeInTheDocument();
    });

    it("should render delete button", () => {
      render(<ClientCard client={defaultClient} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByTitle("Oublier cet appareil");
      expect(deleteButton).toBeInTheDocument();
    });

    it("should render different client names", () => {
      const steamDeck: MoonlightClient = {
        uuid: "steam-uuid",
        name: "Steam Deck",
      };
      render(<ClientCard client={steamDeck} onDelete={mockOnDelete} />);

      expect(screen.getByText("Steam Deck")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // User Interactions - Story 6.3
  // ============================================================================
  describe("User Interactions - Story 6.3", () => {
    it("should call onDelete with client when delete button is clicked", () => {
      render(<ClientCard client={defaultClient} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByTitle("Oublier cet appareil");
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(defaultClient);
    });

    it("should call onDelete with correct client data", () => {
      const specificClient: MoonlightClient = {
        uuid: "unique-uuid-456",
        name: "iPad Pro",
      };
      render(<ClientCard client={specificClient} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByTitle("Oublier cet appareil");
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith({
        uuid: "unique-uuid-456",
        name: "iPad Pro",
      });
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================
  describe("Accessibility", () => {
    it("should have accessible delete button with title", () => {
      render(<ClientCard client={defaultClient} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByTitle("Oublier cet appareil");
      expect(deleteButton).toBeInTheDocument();
    });

    it("should have clickable button", () => {
      render(<ClientCard client={defaultClient} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button");
      expect(deleteButton).not.toBeDisabled();
    });
  });
});
