// SunshineHealthChecker.ts - Vérifie la santé de Sunshine (Story 10.2)
// Détecte si Sunshine est présent, absent ou corrompu

import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export type SunshineHealthStatus = 'HEALTHY' | 'MISSING' | 'CORRUPTED';

export interface SunshineHealthResult {
  status: SunshineHealthStatus;
  missingFiles?: string[];
  sunshinePath?: string;
}

// Fichiers essentiels qui doivent être présents pour que Sunshine fonctionne
const ESSENTIAL_FILES = [
  'sunshine.exe',
  'config/sunshine.conf',
];

// Fichiers supplémentaires à vérifier (DLLs, assets critiques)
const CRITICAL_SUPPORT_FILES = [
  'zlib1.dll',
  'assets/apps.json',
];

export class SunshineHealthChecker {
  /**
   * Résout le chemin vers le dossier Sunshine (dev vs prod)
   */
  private getSunshinePath(): string {
    const isDev = !app.isPackaged;
    if (isDev) {
      return path.join(app.getAppPath(), 'resources', 'tools', 'Sunshine');
    } else {
      return path.join(process.resourcesPath, 'resources', 'tools', 'Sunshine');
    }
  }

  /**
   * Vérifie si un fichier existe
   */
  private fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Vérifie l'installation de Sunshine
   * @returns Le statut de santé et les fichiers manquants le cas échéant
   */
  checkSunshineInstallation(): SunshineHealthResult {
    const sunshinePath = this.getSunshinePath();
    console.log('[SunshineHealthChecker] Checking Sunshine at:', sunshinePath);

    // Vérifier si le dossier existe
    if (!this.fileExists(sunshinePath)) {
      console.log('[SunshineHealthChecker] Sunshine folder MISSING');
      return {
        status: 'MISSING',
        sunshinePath,
        missingFiles: ['<entire folder>'],
      };
    }

    // Vérifier les fichiers essentiels
    const missingFiles: string[] = [];

    for (const file of ESSENTIAL_FILES) {
      const filePath = path.join(sunshinePath, file);
      if (!this.fileExists(filePath)) {
        console.log('[SunshineHealthChecker] Missing essential file:', file);
        missingFiles.push(file);
      }
    }

    // Si des fichiers essentiels manquent, c'est MISSING
    if (missingFiles.length > 0) {
      console.log('[SunshineHealthChecker] Sunshine MISSING - essential files not found');
      return {
        status: 'MISSING',
        sunshinePath,
        missingFiles,
      };
    }

    // Vérifier les fichiers de support critiques
    const missingSupportFiles: string[] = [];
    for (const file of CRITICAL_SUPPORT_FILES) {
      const filePath = path.join(sunshinePath, file);
      if (!this.fileExists(filePath)) {
        console.log('[SunshineHealthChecker] Missing support file:', file);
        missingSupportFiles.push(file);
      }
    }

    // Si des fichiers de support manquent, c'est CORRUPTED
    if (missingSupportFiles.length > 0) {
      console.log('[SunshineHealthChecker] Sunshine CORRUPTED - support files missing');
      return {
        status: 'CORRUPTED',
        sunshinePath,
        missingFiles: missingSupportFiles,
      };
    }

    // Tout est OK
    console.log('[SunshineHealthChecker] Sunshine HEALTHY');
    return {
      status: 'HEALTHY',
      sunshinePath,
    };
  }

  /**
   * Vérifie rapidement si Sunshine est installé (pour le mode dégradé)
   */
  isSunshineInstalled(): boolean {
    const result = this.checkSunshineInstallation();
    return result.status === 'HEALTHY';
  }
}

// Export singleton instance
export const sunshineHealthChecker = new SunshineHealthChecker();
