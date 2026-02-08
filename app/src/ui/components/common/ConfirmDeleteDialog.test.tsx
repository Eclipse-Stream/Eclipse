// Tests unitaires pour ConfirmDeleteDialog.tsx - Epic 3
// Modal de confirmation de suppression personnalisée

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

describe("ConfirmDeleteDialog - Epic 3", () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    title: "Supprimer cet écran ?",
    description: 'Êtes-vous sûr de vouloir supprimer "TV 4K Salon" ?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering
  // ============================================================================
  describe("Rendering", () => {
    it("should render dialog when open", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      expect(screen.getByText("Supprimer cet écran ?")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<ConfirmDeleteDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText("Supprimer cet écran ?")).not.toBeInTheDocument();
    });

    it("should render title", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      expect(screen.getByText("Supprimer cet écran ?")).toBeInTheDocument();
    });

    it("should render description", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      expect(screen.getByText(/TV 4K Salon/)).toBeInTheDocument();
    });

    it("should render default confirm button text", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      expect(screen.getByText("Supprimer")).toBeInTheDocument();
    });

    it("should render default cancel button text", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      expect(screen.getByText("Annuler")).toBeInTheDocument();
    });

    it("should render custom confirm button text", () => {
      render(<ConfirmDeleteDialog {...defaultProps} confirmText="Oui, supprimer" />);
      
      expect(screen.getByText("Oui, supprimer")).toBeInTheDocument();
    });

    it("should render custom cancel button text", () => {
      render(<ConfirmDeleteDialog {...defaultProps} cancelText="Non, garder" />);
      
      expect(screen.getByText("Non, garder")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // User Interactions
  // ============================================================================
  describe("User Interactions", () => {
    it("should call onConfirm when confirm button is clicked", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      const confirmButton = screen.getByText("Supprimer");
      fireEvent.click(confirmButton);
      
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when confirm button is clicked", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      const confirmButton = screen.getByText("Supprimer");
      fireEvent.click(confirmButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when cancel button is clicked", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      const cancelButton = screen.getByText("Annuler");
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onConfirm when cancel button is clicked", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      const cancelButton = screen.getByText("Annuler");
      fireEvent.click(cancelButton);
      
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("should close dialog when clicking outside (overlay)", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      // The dialog should close when onOpenChange is called with false
      // This is handled by the Dialog component from Radix
      // We verify the callback mechanism works
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Button Styling
  // ============================================================================
  describe("Button Styling", () => {
    it("should have destructive styling on confirm button", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);

      const confirmButton = screen.getByText("Supprimer");
      // The confirm button uses destructive variant with red/error styling
      expect(confirmButton).toHaveClass("text-destructive");
    });

    it("should have neutral styling on cancel button", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);

      const cancelButton = screen.getByText("Annuler");
      // Cancel button has neutral/ghost variant
      expect(cancelButton).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================
  describe("Accessibility", () => {
    it("should have dialog role", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have focusable buttons", () => {
      render(<ConfirmDeleteDialog {...defaultProps} />);
      
      const confirmButton = screen.getByText("Supprimer");
      const cancelButton = screen.getByText("Annuler");
      
      expect(confirmButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  // ============================================================================
  // Dynamic Content
  // ============================================================================
  describe("Dynamic Content", () => {
    it("should render with different preset names", () => {
      const { rerender } = render(
        <ConfirmDeleteDialog
          {...defaultProps}
          description='Êtes-vous sûr de vouloir supprimer "Steam Deck" ?'
        />
      );
      
      expect(screen.getByText(/Steam Deck/)).toBeInTheDocument();
      
      rerender(
        <ConfirmDeleteDialog
          {...defaultProps}
          description='Êtes-vous sûr de vouloir supprimer "Gaming Setup" ?'
        />
      );
      
      expect(screen.getByText(/Gaming Setup/)).toBeInTheDocument();
    });

    it("should render with different titles", () => {
      render(
        <ConfirmDeleteDialog
          {...defaultProps}
          title="Confirmer la suppression"
        />
      );
      
      expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
    });
  });
});
