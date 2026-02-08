// Tests unitaires pour ScreenPresetForm.tsx - Epic 3 / Story 3.3
// Dialog de création/édition de preset avec validation Zod

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ScreenPresetForm } from "./ScreenPresetForm";
import type { ScreenPreset } from "@domain/types";

describe("ScreenPresetForm - Story 3.3", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    editingPreset: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering
  // ============================================================================
  describe("Rendering", () => {
    it("should render dialog when open", () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      expect(screen.getByText("Créer un écran")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<ScreenPresetForm {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText("Créer un écran")).not.toBeInTheDocument();
    });

    it("should show edit title when editing", () => {
      const editingPreset: ScreenPreset = {
        id: "test-id",
        type: "preset",
        name: "Test Preset",
        deviceId: "{test-guid}",
        resolution: { width: 1920, height: 1080 },
        refreshRate: 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(<ScreenPresetForm {...defaultProps} editingPreset={editingPreset} />);
      
      expect(screen.getByText("Modifier l'écran")).toBeInTheDocument();
    });

    it("should render name input", () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      expect(screen.getByPlaceholderText(/TV 4K Salon/i)).toBeInTheDocument();
    });

    it("should render resolution select", () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      expect(screen.getByText("Résolution")).toBeInTheDocument();
    });

    it("should render refresh rate select", () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      expect(screen.getByText("Taux de rafraîchissement")).toBeInTheDocument();
    });

    it("should render preview section", () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      expect(screen.getByText("Aperçu:")).toBeInTheDocument();
    });

    it("should render action buttons", () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      expect(screen.getByText("Annuler")).toBeInTheDocument();
      expect(screen.getByText("Créer")).toBeInTheDocument();
    });

    it("should show Enregistrer button when editing", () => {
      const editingPreset: ScreenPreset = {
        id: "test-id",
        type: "preset",
        name: "Test",
        deviceId: "",
        resolution: { width: 1920, height: 1080 },
        refreshRate: 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(<ScreenPresetForm {...defaultProps} editingPreset={editingPreset} />);
      
      expect(screen.getByText("Enregistrer")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Form Initialization
  // ============================================================================
  describe("Form Initialization", () => {
    it("should initialize with empty name for new preset", () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/TV 4K Salon/i) as HTMLInputElement;
      expect(input.value).toBe("");
    });

    it("should initialize with preset data when editing", () => {
      const editingPreset: ScreenPreset = {
        id: "test-id",
        type: "preset",
        name: "My Custom Preset",
        deviceId: "{test-guid}",
        resolution: { width: 3840, height: 2160 },
        refreshRate: 120,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(<ScreenPresetForm {...defaultProps} editingPreset={editingPreset} />);
      
      const input = screen.getByPlaceholderText(/TV 4K Salon/i) as HTMLInputElement;
      expect(input.value).toBe("My Custom Preset");
    });

    it("should reset form when dialog closes and reopens", () => {
      const { rerender } = render(<ScreenPresetForm {...defaultProps} />);
      
      // Type something using fireEvent
      const input = screen.getByPlaceholderText(/TV 4K Salon/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Test Name" } });
      
      // Close dialog
      rerender(<ScreenPresetForm {...defaultProps} isOpen={false} />);
      
      // Reopen dialog
      rerender(<ScreenPresetForm {...defaultProps} isOpen={true} />);
      
      const newInput = screen.getByPlaceholderText(/TV 4K Salon/i) as HTMLInputElement;
      expect(newInput.value).toBe("");
    });
  });

  // ============================================================================
  // Validation (Zod Integration)
  // ============================================================================
  describe("Validation", () => {
    it("should show error for empty name", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const submitButton = screen.getByText("Créer");
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/2 caractères/i)).toBeInTheDocument();
      });
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should show error for name shorter than 2 characters", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/TV 4K Salon/i);
      fireEvent.change(input, { target: { value: "X" } });
      
      const submitButton = screen.getByText("Créer");
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/2 caractères/i)).toBeInTheDocument();
      });
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should show error for name longer than 30 characters", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/TV 4K Salon/i);
      fireEvent.change(input, { target: { value: "A".repeat(31) } });
      
      const submitButton = screen.getByText("Créer");
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/30 caractères/i)).toBeInTheDocument();
      });
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should clear error when user types", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      // Trigger error
      const submitButton = screen.getByText("Créer");
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/2 caractères/i)).toBeInTheDocument();
      });
      
      // Type valid name
      const input = screen.getByPlaceholderText(/TV 4K Salon/i);
      fireEvent.change(input, { target: { value: "Valid Name" } });
      
      // Error should be cleared
      expect(screen.queryByText(/2 caractères/i)).not.toBeInTheDocument();
    });

    it("should accept valid name with 2 characters", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/TV 4K Salon/i);
      fireEvent.change(input, { target: { value: "TV" } });
      
      const submitButton = screen.getByText("Créer");
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("should accept valid name with 30 characters", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/TV 4K Salon/i);
      fireEvent.change(input, { target: { value: "A".repeat(30) } });
      
      const submitButton = screen.getByText("Créer");
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("should trim whitespace from name", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/TV 4K Salon/i);
      fireEvent.change(input, { target: { value: "  Test Name  " } });
      
      const submitButton = screen.getByText("Créer");
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ name: "Test Name" })
        );
      });
    });
  });

  // ============================================================================
  // Form Submission
  // ============================================================================
  describe("Form Submission", () => {
    it("should call onSubmit with correct data", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/TV 4K Salon/i);
      fireEvent.change(input, { target: { value: "New Preset" } });
      
      const submitButton = screen.getByText("Créer");
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "New Preset",
          resolution: { width: 1920, height: 1080 }, // Default
          refreshRate: 60, // Default
        });
      });
    });

    it("should call onClose after successful submit", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/TV 4K Salon/i);
      fireEvent.change(input, { target: { value: "Test Preset" } });
      
      const submitButton = screen.getByText("Créer");
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("should not call onClose on validation error", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      // Submit with empty name
      const submitButton = screen.getByText("Créer");
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/2 caractères/i)).toBeInTheDocument();
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Cancel Button
  // ============================================================================
  describe("Cancel Button", () => {
    it("should call onClose when cancel is clicked", () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const cancelButton = screen.getByText("Annuler");
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should not call onSubmit when cancel is clicked", () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const cancelButton = screen.getByText("Annuler");
      fireEvent.click(cancelButton);
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Preview
  // ============================================================================
  describe("Preview", () => {
    it("should show default preview text when name is empty", () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      expect(screen.getByText(/Nom de l'écran - 1920x1080 @ 60Hz/)).toBeInTheDocument();
    });

    it("should update preview when name changes", async () => {
      render(<ScreenPresetForm {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/TV 4K Salon/i);
      fireEvent.change(input, { target: { value: "My TV" } });
      
      expect(screen.getByText(/My TV - 1920x1080 @ 60Hz/)).toBeInTheDocument();
    });
  });
});
