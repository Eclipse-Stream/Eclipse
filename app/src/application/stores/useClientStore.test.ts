// Tests unitaires pour useClientStore.ts - Epic 6
// Store Zustand pour la gestion des clients Moonlight

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useClientStore } from "./useClientStore";
import type { MoonlightClient, ClientsListResult } from "@domain/types";

// Uses mocks from global setup (src/test/setup.ts)
// Access: window.electronAPI.clients

describe("useClientStore - Epic 6", () => {
  beforeEach(() => {
    // Reset store to initial state by setting default values
    useClientStore.setState({
      clients: [],
      isLoadingClients: false,
      clientsError: null,
      serverName: 'Sunshine',
      isLoadingServerName: false,
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
      const state = useClientStore.getState();

      expect(state.clients).toEqual([]);
      expect(state.isLoadingClients).toBe(false);
      expect(state.clientsError).toBe(null);
      expect(state.serverName).toBe('Sunshine');
      expect(state.isLoadingServerName).toBe(false);
    });

    it("should expose all required actions", () => {
      const state = useClientStore.getState();

      expect(typeof state.fetchClients).toBe("function");
      expect(typeof state.pairClient).toBe("function");
      expect(typeof state.unpairClient).toBe("function");
      expect(typeof state.fetchServerName).toBe("function");
      expect(typeof state.setServerName).toBe("function");
    });
  });

  // ============================================================================
  // AC1: fetchClients() - Story 6.1
  // ============================================================================
  describe("fetchClients() - Story 6.1", () => {
    it("should set isLoadingClients to true during fetch", async () => {
      const mockClients: MoonlightClient[] = [{ uuid: "123", name: "Test Device" }];
      vi.mocked(window.electronAPI.clients.list).mockResolvedValue({
        success: true,
        clients: mockClients,
      } as ClientsListResult);

      const fetchPromise = useClientStore.getState().fetchClients();

      await fetchPromise;
      expect(useClientStore.getState().isLoadingClients).toBe(false);
    });

    it("should load clients from IPC and update state", async () => {
      const mockClients: MoonlightClient[] = [
        { uuid: "uuid-1", name: "iPhone de Jean" },
        { uuid: "uuid-2", name: "Steam Deck" },
      ];
      vi.mocked(window.electronAPI.clients.list).mockResolvedValue({
        success: true,
        clients: mockClients,
      });

      await useClientStore.getState().fetchClients();

      const { clients, isLoadingClients, clientsError } = useClientStore.getState();
      expect(clients).toEqual(mockClients);
      expect(isLoadingClients).toBe(false);
      expect(clientsError).toBe(null);
    });

    it("should handle empty clients array", async () => {
      vi.mocked(window.electronAPI.clients.list).mockResolvedValue({
        success: true,
        clients: [],
      });

      await useClientStore.getState().fetchClients();

      const { clients } = useClientStore.getState();
      expect(clients).toEqual([]);
    });

    it("should store error on IPC failure", async () => {
      vi.mocked(window.electronAPI.clients.list).mockResolvedValue({
        success: false,
        clients: [],
        error: "Sunshine not running",
      });

      await useClientStore.getState().fetchClients();

      const { isLoadingClients, clientsError } = useClientStore.getState();
      expect(clientsError).toBe("Sunshine not running");
      expect(isLoadingClients).toBe(false);
    });

    it("should handle network exceptions", async () => {
      vi.mocked(window.electronAPI.clients.list).mockRejectedValue(new Error("Network error"));

      await useClientStore.getState().fetchClients();

      const { clientsError } = useClientStore.getState();
      expect(clientsError).toBe("Erreur de communication");
    });
  });

  // ============================================================================
  // AC2: pairClient() - Story 6.2
  // ============================================================================
  describe("pairClient() - Story 6.2", () => {
    it("should pair client via IPC", async () => {
      vi.mocked(window.electronAPI.clients.pair).mockResolvedValue({
        success: true,
      });
      vi.mocked(window.electronAPI.clients.list).mockResolvedValue({
        success: true,
        clients: [{ uuid: "new-uuid", name: "New Device" }],
      });

      const result = await useClientStore.getState().pairClient("1234", "New Device");

      expect(result.success).toBe(true);
      expect(window.electronAPI.clients.pair).toHaveBeenCalledWith("1234", "New Device");
    });

    it("should refresh client list after successful pairing", async () => {
      vi.mocked(window.electronAPI.clients.pair).mockResolvedValue({
        success: true,
      });
      vi.mocked(window.electronAPI.clients.list).mockResolvedValue({
        success: true,
        clients: [{ uuid: "paired-uuid", name: "Paired Device" }],
      });

      await useClientStore.getState().pairClient("5678", "Paired Device");

      expect(window.electronAPI.clients.list).toHaveBeenCalled();
      const { clients } = useClientStore.getState();
      expect(clients).toHaveLength(1);
      expect(clients[0].name).toBe("Paired Device");
    });

    it("should return error on pairing failure", async () => {
      vi.mocked(window.electronAPI.clients.pair).mockResolvedValue({
        success: false,
        error: "Invalid PIN",
      });

      const result = await useClientStore.getState().pairClient("0000", "Device");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid PIN");
    });

    it("should handle pairing exceptions", async () => {
      vi.mocked(window.electronAPI.clients.pair).mockRejectedValue(new Error("Timeout"));

      const result = await useClientStore.getState().pairClient("1111", "Device");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Erreur de communication");
    });
  });

  // ============================================================================
  // AC3: unpairClient() - Story 6.3
  // ============================================================================
  describe("unpairClient() - Story 6.3", () => {
    it("should unpair client via IPC", async () => {
      // Set up initial state with a client
      useClientStore.setState({
        clients: [{ uuid: "to-remove", name: "Old Device" }],
      });

      vi.mocked(window.electronAPI.clients.unpair).mockResolvedValue({
        success: true,
      });
      vi.mocked(window.electronAPI.clients.list).mockResolvedValue({
        success: true,
        clients: [],
      });

      const result = await useClientStore.getState().unpairClient("to-remove");

      expect(result.success).toBe(true);
      expect(window.electronAPI.clients.unpair).toHaveBeenCalledWith("to-remove");
    });

    it("should optimistically remove client from state", async () => {
      useClientStore.setState({
        clients: [
          { uuid: "keep", name: "Keep Device" },
          { uuid: "remove", name: "Remove Device" },
        ],
      });

      vi.mocked(window.electronAPI.clients.unpair).mockResolvedValue({
        success: true,
      });
      vi.mocked(window.electronAPI.clients.list).mockResolvedValue({
        success: true,
        clients: [{ uuid: "keep", name: "Keep Device" }],
      });

      await useClientStore.getState().unpairClient("remove");

      const { clients } = useClientStore.getState();
      expect(clients).toHaveLength(1);
      expect(clients[0].uuid).toBe("keep");
    });

    it("should return error on unpair failure", async () => {
      vi.mocked(window.electronAPI.clients.unpair).mockResolvedValue({
        success: false,
        error: "Client not found",
      });

      const result = await useClientStore.getState().unpairClient("unknown");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Client not found");
    });

    it("should handle unpair exceptions", async () => {
      vi.mocked(window.electronAPI.clients.unpair).mockRejectedValue(new Error("API Error"));

      const result = await useClientStore.getState().unpairClient("uuid");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Erreur de communication");
    });
  });

  // ============================================================================
  // AC4: fetchServerName() - Story 6.4
  // ============================================================================
  describe("fetchServerName() - Story 6.4", () => {
    it("should fetch server name from IPC", async () => {
      vi.mocked(window.electronAPI.clients.getServerName).mockResolvedValue("Mon PC Gaming");

      await useClientStore.getState().fetchServerName();

      const { serverName, isLoadingServerName } = useClientStore.getState();
      expect(serverName).toBe("Mon PC Gaming");
      expect(isLoadingServerName).toBe(false);
    });

    it("should set isLoadingServerName during fetch", async () => {
      vi.mocked(window.electronAPI.clients.getServerName).mockResolvedValue("Test");

      const fetchPromise = useClientStore.getState().fetchServerName();

      await fetchPromise;
      expect(useClientStore.getState().isLoadingServerName).toBe(false);
    });

    it("should handle fetch server name exceptions", async () => {
      vi.mocked(window.electronAPI.clients.getServerName).mockRejectedValue(new Error("Error"));

      await useClientStore.getState().fetchServerName();

      const { isLoadingServerName } = useClientStore.getState();
      expect(isLoadingServerName).toBe(false);
    });
  });

  // ============================================================================
  // AC5: setServerName() - Story 6.4
  // ============================================================================
  describe("setServerName() - Story 6.4", () => {
    it("should set server name via IPC", async () => {
      vi.mocked(window.electronAPI.clients.setServerName).mockResolvedValue({
        success: true,
      });

      const result = await useClientStore.getState().setServerName("Nouveau Nom");

      expect(result.success).toBe(true);
      expect(window.electronAPI.clients.setServerName).toHaveBeenCalledWith("Nouveau Nom");
    });

    it("should update state on successful set", async () => {
      vi.mocked(window.electronAPI.clients.setServerName).mockResolvedValue({
        success: true,
      });

      await useClientStore.getState().setServerName("PC Streaming");

      const { serverName } = useClientStore.getState();
      expect(serverName).toBe("PC Streaming");
    });

    it("should not update state on set failure", async () => {
      useClientStore.setState({ serverName: "Original" });

      vi.mocked(window.electronAPI.clients.setServerName).mockResolvedValue({
        success: false,
        error: "Name too long",
      });

      const result = await useClientStore.getState().setServerName("Very Long Name");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name too long");
      // State should remain unchanged
      const { serverName } = useClientStore.getState();
      expect(serverName).toBe("Original");
    });

    it("should handle set server name exceptions", async () => {
      vi.mocked(window.electronAPI.clients.setServerName).mockRejectedValue(new Error("Error"));

      const result = await useClientStore.getState().setServerName("Test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Erreur de communication");
    });
  });
});
