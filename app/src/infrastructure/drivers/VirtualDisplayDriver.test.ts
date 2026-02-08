// Test: VirtualDisplayDriver - Story 3.2
// Tests unitaires pour la gestion de l'écran virtuel

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Use vi.hoisted to ensure mocks are available before vi.mock factories run
const mocks = vi.hoisted(() => ({
  execFile: vi.fn(),
  readFile: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Mock node:child_process
vi.mock("node:child_process", () => ({
  default: { execFile: mocks.execFile },
  execFile: mocks.execFile,
}));

// Mock node:util - we need to wrap execFile in a promise
vi.mock("node:util", () => ({
  default: {
    promisify: (fn: typeof mocks.execFile) => {
      return (...args: any[]) => {
        return new Promise((resolve, reject) => {
          fn(...args, (error: Error | null, stdout: string, stderr: string) => {
            if (error) {
              const enhancedError = Object.assign(error, { stdout, stderr });
              reject(enhancedError);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });
      };
    },
  },
  promisify: (fn: typeof mocks.execFile) => {
    return (...args: any[]) => {
      return new Promise((resolve, reject) => {
        fn(...args, (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            const enhancedError = Object.assign(error, { stdout, stderr });
            reject(enhancedError);
          } else {
            resolve({ stdout, stderr });
          }
        });
      });
    };
  },
}));

// Mock node:fs
vi.mock("node:fs", () => ({
  default: {
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync,
    writeFileSync: mocks.writeFileSync,
    mkdirSync: mocks.mkdirSync,
    copyFileSync: mocks.copyFileSync,
    unlinkSync: mocks.unlinkSync,
  },
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync,
  writeFileSync: mocks.writeFileSync,
  mkdirSync: mocks.mkdirSync,
  copyFileSync: mocks.copyFileSync,
  unlinkSync: mocks.unlinkSync,
}));

// Mock node:fs/promises
vi.mock("node:fs/promises", () => ({
  default: { readFile: mocks.readFile },
  readFile: mocks.readFile,
}));

// Mock electron
vi.mock("electron", () => ({
  default: {
    app: {
      isPackaged: false,
      getAppPath: () => "C:\\TestApp",
      getPath: (name: string) => {
        if (name === "userData") return "C:\\Users\\Test\\AppData\\Roaming\\Eclipse";
        if (name === "temp") return "C:\\Users\\Test\\Temp";
        return "C:\\Test";
      },
    },
    screen: {
      getAllDisplays: () => [{ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } }],
    },
  },
  app: {
    isPackaged: false,
    getAppPath: () => "C:\\TestApp",
    getPath: (name: string) => {
      if (name === "userData") return "C:\\Users\\Test\\AppData\\Roaming\\Eclipse";
      if (name === "temp") return "C:\\Users\\Test\\Temp";
      return "C:\\Test";
    },
  },
  screen: {
    getAllDisplays: () => [{ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } }],
  },
}));

// Mock SunshinePathsService
vi.mock("../sunshine/SunshinePathsService", () => ({
  getSunshinePaths: () => ({
    logFile: "C:\\TestApp\\resources\\tools\\Sunshine\\config\\sunshine.log",
  }),
}));

// Import the module to test AFTER setting up mocks
import { VirtualDisplayDriver } from "./VirtualDisplayDriver";

describe("VirtualDisplayDriver - Story 3.2", () => {
  let driver: VirtualDisplayDriver;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default fs behavior
    mocks.existsSync.mockReturnValue(true);
    mocks.readFileSync.mockReturnValue('{"instanceId": "ROOT\\\\DISPLAY\\\\0001", "createdAt": "2026-01-01"}');
    mocks.readFile.mockResolvedValue("");

    // Default execFile behavior (devcon success)
    mocks.execFile.mockImplementation((_cmd: string, args: string[], callback: Function) => {
      const command = args[0];

      if (command === "find" || command === "findall") {
        callback(null, "ROOT\\DISPLAY\\0001    : Virtual Display Driver\n1 matching device(s) found.", "");
      } else if (command === "enable") {
        callback(null, "Enabled: ROOT\\DISPLAY\\0001", "");
      } else if (command === "disable") {
        callback(null, "Disabled: ROOT\\DISPLAY\\0001", "");
      } else if (command === "status") {
        callback(null, "ROOT\\DISPLAY\\0001\n    Name: Virtual Display Driver\n    Driver is running.", "");
      } else if (command === "hwids") {
        callback(null, "ROOT\\DISPLAY\\0001\n    {12345678-1234-1234-1234-123456789abc}", "");
      } else if (command === "install") {
        callback(null, "Device node created. Install is complete.", "");
      } else {
        callback(null, "OK", "");
      }
    });

    driver = new VirtualDisplayDriver();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("enable()", () => {
    it("should enable the virtual display using devcon enable", async () => {
      const result = await driver.enable();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify devcon was called with enable command
      expect(mocks.execFile).toHaveBeenCalledWith(
        expect.stringContaining("devcon.exe"),
        expect.arrayContaining(["enable"]),
        expect.any(Function)
      );
    });

    it("should return error if no Instance ID is configured", async () => {
      // No instance ID in config
      mocks.readFileSync.mockReturnValue('{"instanceId": null}');

      // Create a new driver instance with no config
      const noConfigDriver = new VirtualDisplayDriver();
      const result = await noConfigDriver.enable();

      expect(result.success).toBe(false);
      expect(result.error).toContain("driver Eclipse n'est pas installé");
    });

    it("should return error if driver instance no longer exists", async () => {
      // Make the "find" command return no matches
      mocks.execFile.mockImplementation((_cmd: string, args: string[], callback: Function) => {
        if (args[0] === "find") {
          callback(null, "0 matching device(s) found.", "");
        } else {
          callback(null, "OK", "");
        }
      });

      const result = await driver.enable();

      expect(result.success).toBe(false);
      expect(result.error).toContain("driver Eclipse a été supprimé");
    });
  });

  describe("disable()", () => {
    it("should disable virtual display using devcon disable", async () => {
      const result = await driver.disable();

      expect(result.success).toBe(true);
      expect(mocks.execFile).toHaveBeenCalledWith(
        expect.stringContaining("devcon.exe"),
        expect.arrayContaining(["disable"]),
        expect.any(Function)
      );
    });

    it("should return success if no Instance ID (nothing to disable)", async () => {
      mocks.readFileSync.mockReturnValue('{"instanceId": null}');
      const noConfigDriver = new VirtualDisplayDriver();

      const result = await noConfigDriver.disable();

      expect(result.success).toBe(true);
    });
  });

  describe("getStatus()", () => {
    it("should return 'enabled' if driver is running", async () => {
      mocks.execFile.mockImplementation((_cmd: string, args: string[], callback: Function) => {
        if (args[0] === "status") {
          callback(null, "ROOT\\DISPLAY\\0001\n    Name: Virtual Display Driver\n    Driver is running.", "");
        } else if (args[0] === "find") {
          callback(null, "1 matching device(s) found.", "");
        }
      });

      const status = await driver.getStatus();

      expect(status).toBe("enabled");
    });

    it("should return 'disabled' if driver is not running", async () => {
      mocks.execFile.mockImplementation((_cmd: string, args: string[], callback: Function) => {
        if (args[0] === "status") {
          callback(null, "ROOT\\DISPLAY\\0001\n    Name: Virtual Display Driver\n    Device is disabled.", "");
        } else if (args[0] === "find") {
          callback(null, "1 matching device(s) found.", "");
        }
      });

      const status = await driver.getStatus();

      expect(status).toBe("disabled");
    });

    it("should return 'disabled' if no Instance ID is configured", async () => {
      mocks.readFileSync.mockReturnValue('{"instanceId": null}');
      const noConfigDriver = new VirtualDisplayDriver();

      const status = await noConfigDriver.getStatus();

      expect(status).toBe("disabled");
    });
  });

  describe("getDeviceGUID()", () => {
    it("should return GUID from devcon hwids output", async () => {
      mocks.execFile.mockImplementation((_cmd: string, args: string[], callback: Function) => {
        if (args[0] === "status") {
          callback(null, "Driver is running.", "");
        } else if (args[0] === "hwids") {
          callback(null, "ROOT\\DISPLAY\\0001\n    Hardware IDs:\n        {12345678-1234-1234-1234-123456789abc}", "");
        } else if (args[0] === "find") {
          callback(null, "1 matching device(s) found.", "");
        }
      });

      const guid = await driver.getDeviceGUID();

      expect(guid).toBe("{12345678-1234-1234-1234-123456789abc}");
    });

    it("should return null if device is not enabled", async () => {
      mocks.execFile.mockImplementation((_cmd: string, args: string[], callback: Function) => {
        if (args[0] === "status") {
          callback(null, "Device is disabled.", "");
        } else if (args[0] === "find") {
          callback(null, "1 matching device(s) found.", "");
        }
      });

      const guid = await driver.getDeviceGUID();

      expect(guid).toBeNull();
    });
  });

  describe("initialize()", () => {
    it("should load existing driver config if Instance ID exists", async () => {
      mocks.readFileSync.mockReturnValue('{"instanceId": "ROOT\\\\DISPLAY\\\\0001", "createdAt": "2026-01-01"}');

      mocks.execFile.mockImplementation((_cmd: string, args: string[], callback: Function) => {
        if (args[0] === "find") {
          callback(null, "1 matching device(s) found.", "");
        }
      });

      const newDriver = new VirtualDisplayDriver();
      const result = await newDriver.initialize();

      expect(result.success).toBe(true);
      expect(result.wasInstalled).toBe(false); // Already installed
    });

    it("should install new driver if no Instance ID exists", async () => {
      mocks.existsSync.mockImplementation((p: any) => {
        // Config file doesn't exist, but other files do
        if (typeof p === "string" && p.includes("eclipse_vdd_config.json")) return false;
        return true;
      });
      mocks.readFileSync.mockReturnValue('{"instanceId": null}');

      let installCalled = false;
      mocks.execFile.mockImplementation((_cmd: string, args: string[], callback: Function) => {
        if (args[0] === "install") {
          installCalled = true;
          callback(null, "Device node created. Install is complete.", "");
        } else if (args[0] === "findall") {
          // After install, return the new instance
          if (installCalled) {
            callback(null, "ROOT\\DISPLAY\\0001    : Virtual Display Driver\n1 matching device(s) found.", "");
          } else {
            callback(null, "0 matching device(s) found.", "");
          }
        } else if (args[0] === "find") {
          callback(null, "0 matching device(s) found.", "");
        }
      });

      const newDriver = new VirtualDisplayDriver();
      const result = await newDriver.initialize();

      expect(result.success).toBe(true);
      expect(result.wasInstalled).toBe(true);
      expect(installCalled).toBe(true);
    });
  });

  describe("getEclipseInstanceId()", () => {
    it("should return the configured Instance ID after enable", async () => {
      // getEclipseInstanceId returns the cached value, which is loaded during enable/disable/initialize
      await driver.enable();
      expect(driver.getEclipseInstanceId()).toBe("ROOT\\DISPLAY\\0001");
    });

    it("should return null if no Instance ID configured", () => {
      mocks.readFileSync.mockReturnValue('{"instanceId": null}');
      const noConfigDriver = new VirtualDisplayDriver();

      expect(noConfigDriver.getEclipseInstanceId()).toBeNull();
    });
  });
});
