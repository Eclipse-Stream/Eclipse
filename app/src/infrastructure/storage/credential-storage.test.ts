import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as path from "path";

// Define mocks BEFORE vi.mock() calls (hoisting issue)
const mockMkdir = vi.fn();
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockIsEncryptionAvailable = vi.fn();
const mockEncryptString = vi.fn();
const mockDecryptString = vi.fn();
const mockGetPath = vi.fn();

vi.mock("fs/promises", () => ({
  default: {
    mkdir: mockMkdir,
    readFile: mockReadFile,
    writeFile: mockWriteFile,
  },
  mkdir: mockMkdir,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));

vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: mockIsEncryptionAvailable,
    encryptString: mockEncryptString,
    decryptString: mockDecryptString,
  },
  app: {
    getPath: mockGetPath,
  },
}));

// Import AFTER mocks
const { CredentialStorage } = await import("./credential-storage");

describe("CredentialStorage", () => {
  let storage: CredentialStorage;
  const mockUserDataPath = "/mock/appdata";
  const mockStorageDir = path.join(mockUserDataPath, "Eclipse");
  const mockStorageFile = path.join(mockStorageDir, "credentials.enc");

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPath.mockReturnValue(mockUserDataPath);
    mockIsEncryptionAvailable.mockReturnValue(true);
    storage = new CredentialStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isAvailable", () => {
    it("should return true when safeStorage is available", () => {
      mockIsEncryptionAvailable.mockReturnValue(true);
      expect(storage.isAvailable()).toBe(true);
    });

    it("should return false when safeStorage is not available", () => {
      mockIsEncryptionAvailable.mockReturnValue(false);
      expect(storage.isAvailable()).toBe(false);
    });
  });

  describe("save", () => {
    it("should encrypt and save credentials to file", async () => {
      const mockEncryptedBuffer = Buffer.from("encrypted-data");
      mockEncryptString.mockReturnValue(mockEncryptedBuffer);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue("{}");

      await storage.save("test-key", "test-value");

      // Verify mkdir was called
      expect(mockMkdir).toHaveBeenCalledWith(mockStorageDir, {
        recursive: true,
      });

      // Verify encryption was called
      expect(mockEncryptString).toHaveBeenCalledWith("test-value");

      // Verify writeFile was called with base64 encoded data
      expect(mockWriteFile).toHaveBeenCalledWith(
        mockStorageFile,
        expect.any(String),
        "utf-8"
      );
    });

    it("should throw error if safeStorage is not available", async () => {
      mockIsEncryptionAvailable.mockReturnValue(false);
      storage = new CredentialStorage();

      await expect(storage.save("test-key", "test-value")).rejects.toThrow(
        "Encryption not available"
      );
    });

    it("should handle multiple keys in the same file", async () => {
      const mockEncryptedBuffer = Buffer.from("encrypted-data");
      mockEncryptString.mockReturnValue(mockEncryptedBuffer);
      mockMkdir.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ "other-key": "other-data" })
      );
      mockWriteFile.mockResolvedValue(undefined);

      await storage.save("test-key", "test-value");

      // Verify existing data is preserved
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);
      expect(writtenData).toHaveProperty("other-key");
      expect(writtenData).toHaveProperty("test-key");
    });
  });

  describe("load", () => {
    it("should load and decrypt credentials from file", async () => {
      const mockEncryptedData = Buffer.from("encrypted-data").toString(
        "base64"
      );
      const mockDecryptedValue = "decrypted-value";

      mockReadFile.mockResolvedValue(
        JSON.stringify({ "test-key": mockEncryptedData })
      );
      mockDecryptString.mockReturnValue(mockDecryptedValue);

      const result = await storage.load("test-key");

      expect(result).toBe(mockDecryptedValue);
      expect(mockReadFile).toHaveBeenCalledWith(mockStorageFile, "utf-8");
      expect(mockDecryptString).toHaveBeenCalledWith(
        Buffer.from(mockEncryptedData, "base64")
      );
    });

    it("should return null if key does not exist", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({}));

      const result = await storage.load("non-existent-key");

      expect(result).toBeNull();
    });

    it("should return null if file does not exist", async () => {
      mockReadFile.mockRejectedValue({ code: "ENOENT" });

      const result = await storage.load("test-key");

      expect(result).toBeNull();
    });

    it("should throw error for other file read errors", async () => {
      mockReadFile.mockRejectedValue(new Error("Permission denied"));

      await expect(storage.load("test-key")).rejects.toThrow(
        "Permission denied"
      );
    });

    it("should throw error if safeStorage is not available", async () => {
      mockIsEncryptionAvailable.mockReturnValue(false);
      storage = new CredentialStorage();

      await expect(storage.load("test-key")).rejects.toThrow(
        "Encryption not available"
      );
    });
  });

  describe("delete", () => {
    it("should delete key from storage file", async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({ "test-key": "data", "other-key": "other-data" })
      );
      mockWriteFile.mockResolvedValue(undefined);

      await storage.delete("test-key");

      const writeCall = mockWriteFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);
      expect(writtenData).not.toHaveProperty("test-key");
      expect(writtenData).toHaveProperty("other-key");
    });

    it("should not throw if key does not exist", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({}));
      mockWriteFile.mockResolvedValue(undefined);

      await expect(storage.delete("non-existent-key")).resolves.not.toThrow();
    });

    it("should not throw if file does not exist", async () => {
      mockReadFile.mockRejectedValue({ code: "ENOENT" });

      await expect(storage.delete("test-key")).resolves.not.toThrow();
    });
  });

  describe("Integration: save -> load cycle", () => {
    it("should preserve value through save/load cycle", async () => {
      const testKey = "integration-test";
      const testValue = "my-secret-password-123";
      let storageData: any = {};

      // Mock file system to store data in memory
      mockMkdir.mockResolvedValue(undefined);
      mockReadFile.mockImplementation(() => {
        return JSON.stringify(storageData);
      });
      mockWriteFile.mockImplementation((path: string, data: string) => {
        storageData = JSON.parse(data);
        return Promise.resolve();
      });

      // Mock encryption/decryption to be reversible
      mockEncryptString.mockImplementation((str: string) =>
        Buffer.from(str, "utf-8")
      );
      mockDecryptString.mockImplementation((buf: Buffer) =>
        buf.toString("utf-8")
      );

      // Save
      await storage.save(testKey, testValue);

      // Load
      const loaded = await storage.load(testKey);

      expect(loaded).toBe(testValue);
    });
  });
});
