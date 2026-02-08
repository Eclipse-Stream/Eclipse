// Tests unitaires pour ClientsList.tsx - Story 6.1, 6.3
// Liste des clients Moonlight appairés

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClientsList } from "./ClientsList";
import { useClientStore, useAppStore } from "@application/stores";
import type { MoonlightClient } from "@domain/types";

// Mock stores
vi.mock("@application/stores", () => ({
  useClientStore: vi.fn(),
  useAppStore: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ClientsList - Story 6.1", () => {
  const mockFetchClients = vi.fn();
  const mockUnpairClient = vi.fn();

  const defaultClients: MoonlightClient[] = [
    { uuid: "uuid-1", name: "iPhone" },
    { uuid: "uuid-2", name: "Steam Deck" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: Sunshine ONLINE, clients loaded
    vi.mocked(useAppStore).mockReturnValue("ONLINE");
    vi.mocked(useClientStore).mockReturnValue({
      clients: defaultClients,
      isLoadingClients: false,
      clientsError: null,
      fetchClients: mockFetchClients,
      unpairClient: mockUnpairClient,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Sunshine Offline State
  // ============================================================================
  describe("Sunshine Offline State", () => {
    it("should show waiting message when Sunshine is offline", () => {
      vi.mocked(useAppStore).mockReturnValue("OFFLINE");

      render(<ClientsList />);

      expect(screen.getByText("En attente de Sunshine...")).toBeInTheDocument();
    });

    it("should show waiting message when Sunshine requires auth", () => {
      vi.mocked(useAppStore).mockReturnValue("AUTH_REQUIRED");

      render(<ClientsList />);

      expect(screen.getByText("En attente de Sunshine...")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe("Loading State", () => {
    it("should show loading indicator when fetching clients", () => {
      vi.mocked(useClientStore).mockReturnValue({
        clients: [],
        isLoadingClients: true,
        clientsError: null,
        fetchClients: mockFetchClients,
        unpairClient: mockUnpairClient,
      });

      render(<ClientsList />);

      expect(screen.getByText("Chargement des appareils...")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Error State
  // ============================================================================
  describe("Error State", () => {
    it("should display error message when fetch fails", () => {
      vi.mocked(useClientStore).mockReturnValue({
        clients: [],
        isLoadingClients: false,
        clientsError: "Impossible de récupérer les clients",
        fetchClients: mockFetchClients,
        unpairClient: mockUnpairClient,
      });

      render(<ClientsList />);

      expect(screen.getByText("Impossible de récupérer les clients")).toBeInTheDocument();
    });

    it("should show retry button on error", () => {
      vi.mocked(useClientStore).mockReturnValue({
        clients: [],
        isLoadingClients: false,
        clientsError: "Erreur",
        fetchClients: mockFetchClients,
        unpairClient: mockUnpairClient,
      });

      render(<ClientsList />);

      expect(screen.getByText("Réessayer")).toBeInTheDocument();
    });

    it("should call fetchClients when retry is clicked", () => {
      vi.mocked(useClientStore).mockReturnValue({
        clients: [],
        isLoadingClients: false,
        clientsError: "Erreur",
        fetchClients: mockFetchClients,
        unpairClient: mockUnpairClient,
      });

      render(<ClientsList />);

      const retryButton = screen.getByText("Réessayer");
      fireEvent.click(retryButton);

      expect(mockFetchClients).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Empty State (AC3)
  // ============================================================================
  describe("Empty State - AC3", () => {
    it("should show empty state message when no clients", () => {
      vi.mocked(useClientStore).mockReturnValue({
        clients: [],
        isLoadingClients: false,
        clientsError: null,
        fetchClients: mockFetchClients,
        unpairClient: mockUnpairClient,
      });

      render(<ClientsList />);

      expect(screen.getByText("Aucun appareil appairé")).toBeInTheDocument();
    });

    it("should show pairing button in empty state", () => {
      vi.mocked(useClientStore).mockReturnValue({
        clients: [],
        isLoadingClients: false,
        clientsError: null,
        fetchClients: mockFetchClients,
        unpairClient: mockUnpairClient,
      });

      render(<ClientsList />);

      expect(screen.getByText("Appairer")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Clients List (AC2)
  // ============================================================================
  describe("Clients List - AC2", () => {
    it("should render all clients", () => {
      render(<ClientsList />);

      expect(screen.getByText("iPhone")).toBeInTheDocument();
      expect(screen.getByText("Steam Deck")).toBeInTheDocument();
    });

    it("should render refresh button", () => {
      render(<ClientsList />);

      expect(screen.getByTitle("Rafraîchir")).toBeInTheDocument();
    });

    it("should render pairing button", () => {
      render(<ClientsList />);

      expect(screen.getByText("Appairer")).toBeInTheDocument();
    });

    it("should call fetchClients when refresh is clicked", () => {
      render(<ClientsList />);

      const refreshButton = screen.getByTitle("Rafraîchir");
      fireEvent.click(refreshButton);

      expect(mockFetchClients).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Delete Flow (Story 6.3)
  // ============================================================================
  describe("Delete Flow - Story 6.3", () => {
    it("should show confirmation dialog when delete is clicked", async () => {
      render(<ClientsList />);

      // Click delete on first client
      const deleteButtons = screen.getAllByTitle("Oublier cet appareil");
      fireEvent.click(deleteButtons[0]);

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/Oublier iPhone/)).toBeInTheDocument();
      });
    });

    it("should close confirmation dialog when cancelled", async () => {
      render(<ClientsList />);

      // Open dialog
      const deleteButtons = screen.getAllByTitle("Oublier cet appareil");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Oublier iPhone/)).toBeInTheDocument();
      });

      // Cancel
      const cancelButton = screen.getByText("Annuler");
      fireEvent.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText(/Oublier iPhone/)).not.toBeInTheDocument();
      });
    });

    it("should call unpairClient when deletion is confirmed", async () => {
      mockUnpairClient.mockResolvedValue({ success: true });

      render(<ClientsList />);

      // Open dialog
      const deleteButtons = screen.getAllByTitle("Oublier cet appareil");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Oublier iPhone/)).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByText("Oublier");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUnpairClient).toHaveBeenCalledWith("uuid-1");
      });
    });
  });
});
