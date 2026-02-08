// Infrastructure Layer - Sunshine Cold Start Service
// Story 11-4: Automatic credential generation and injection for first launch
// Uses Sunshine CLI: sunshine.exe --creds username password

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { getSunshinePaths } from "./SunshinePathsService";
import { getCredentialStorage } from "../storage/credential-storage";

const execFileAsync = promisify(execFile);

const CREDENTIALS_KEY = "sunshine-credentials";
const DEFAULT_USERNAME = "eclipse";

export interface ColdStartResult {
  success: boolean;
  wasFirstLaunch: boolean;
  error?: string;
}

/**
 * Service de gestion du Cold Start Sunshine
 * Détecte le premier lancement et génère/injecte automatiquement les credentials
 */
export class SunshineColdStartService {
  private static instance: SunshineColdStartService;

  private constructor() {}

  static getInstance(): SunshineColdStartService {
    if (!SunshineColdStartService.instance) {
      SunshineColdStartService.instance = new SunshineColdStartService();
    }
    return SunshineColdStartService.instance;
  }

  /**
   * Vérifie si c'est un cold start (premier lancement sans credentials)
   * Conditions:
   * 1. Pas de credentials stockés dans safeStorage
   * 2. OU sunshine.conf n'existe pas
   */
  async isColdStart(): Promise<boolean> {
    try {
      // Check if we have stored credentials
      const storage = getCredentialStorage();
      if (storage.isAvailable()) {
        const storedCreds = await storage.load(CREDENTIALS_KEY);
        if (storedCreds) {
          console.log("[ColdStart] Credentials already exist in storage");
          return false;
        }
      }

      // Check if sunshine.conf exists
      const paths = getSunshinePaths();
      if (!fs.existsSync(paths.configFile)) {
        console.log("[ColdStart] sunshine.conf not found - cold start detected");
        return true;
      }

      // Config exists but no credentials - still cold start
      console.log("[ColdStart] Config exists but no stored credentials - cold start");
      return true;
    } catch (error) {
      console.error("[ColdStart] Error checking cold start state:", error);
      return true; // Assume cold start on error
    }
  }

  /**
   * Génère un mot de passe fort basé sur UUID
   */
  private generatePassword(): string {
    // Use UUID v4 which provides good randomness
    // Format: 8-4-4-4-12 = 36 chars, remove dashes = 32 chars
    return randomUUID().replace(/-/g, "");
  }

  /**
   * Exécute sunshine.exe --creds pour définir les credentials
   */
  private async setCredentialsViaCLI(username: string, password: string): Promise<boolean> {
    try {
      const paths = getSunshinePaths();
      
      console.log(`[ColdStart] Setting credentials via CLI: username=${username}`);
      
      // sunshine.exe --creds username password
      const result = await execFileAsync(paths.sunshineExe, [
        "--creds",
        username,
        password
      ], {
        timeout: 30000 // 30 seconds timeout
      });

      console.log("[ColdStart] CLI output:", result.stdout);
      if (result.stderr) {
        console.warn("[ColdStart] CLI stderr:", result.stderr);
      }

      return true;
    } catch (error: any) {
      // execFile may throw even on success if exit code is non-zero
      // Check if credentials were actually set by looking at stdout
      if (error.stdout && error.stdout.includes("credentials")) {
        console.log("[ColdStart] Credentials likely set despite error:", error.stdout);
        return true;
      }
      
      console.error("[ColdStart] Failed to set credentials via CLI:", error);
      return false;
    }
  }

  /**
   * Sauvegarde les credentials dans le stockage sécurisé
   */
  private async saveCredentials(username: string, password: string): Promise<boolean> {
    try {
      const storage = getCredentialStorage();
      if (!storage.isAvailable()) {
        console.error("[ColdStart] Secure storage not available");
        return false;
      }

      const credsJson = JSON.stringify({ username, password });
      await storage.save(CREDENTIALS_KEY, credsJson);
      
      console.log("[ColdStart] Credentials saved to secure storage");
      return true;
    } catch (error) {
      console.error("[ColdStart] Failed to save credentials:", error);
      return false;
    }
  }

  /**
   * Exécute le processus de cold start complet:
   * 1. Génère un username/password
   * 2. Injecte via CLI sunshine --creds
   * 3. Sauvegarde dans safeStorage
   */
  async performColdStart(): Promise<ColdStartResult> {
    try {
      // Check if this is actually a cold start
      const isCold = await this.isColdStart();
      if (!isCold) {
        return { success: true, wasFirstLaunch: false };
      }

      console.log("[ColdStart] Performing cold start initialization...");

      // Generate credentials
      const username = DEFAULT_USERNAME;
      const password = this.generatePassword();

      console.log(`[ColdStart] Generated credentials: user=${username}, pass=***`);

      // Set credentials via CLI
      const cliSuccess = await this.setCredentialsViaCLI(username, password);
      if (!cliSuccess) {
        return {
          success: false,
          wasFirstLaunch: true,
          error: "Failed to set credentials via Sunshine CLI"
        };
      }

      // Save credentials to secure storage
      const saveSuccess = await this.saveCredentials(username, password);
      if (!saveSuccess) {
        return {
          success: false,
          wasFirstLaunch: true,
          error: "Failed to save credentials to secure storage"
        };
      }

      console.log("[ColdStart] Cold start completed successfully");
      return { success: true, wasFirstLaunch: true };

    } catch (error) {
      console.error("[ColdStart] Cold start failed:", error);
      return {
        success: false,
        wasFirstLaunch: true,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

// Export singleton
export const sunshineColdStartService = SunshineColdStartService.getInstance();
