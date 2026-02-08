/**
 * Script de nettoyage de la config Sunshine pour le packaging
 *
 * Ce script est appelé par le hook packageAfterCopy de Electron Forge.
 * Il nettoie la config Sunshine pour qu'elle soit propre pour un nouvel utilisateur :
 * - Réinitialise sunshine.conf avec des valeurs minimales
 * - Vide apps.json (l'app Eclipse sera créée au premier lancement)
 * - Supprime les fichiers d'état et flags de setup
 * - Supprime les certificats (seront régénérés au premier lancement)
 * - Supprime les backups et logs
 *
 * L'app Eclipse fait le setup complet au premier lancement via main.ts :
 * - ensureSunshineNameInitialized() : Initialise le nom
 * - ensureSystemTrayDisabled() : Désactive le tray
 * - ensureEclipseScriptsExist() : Crée les scripts dans %APPDATA%/Eclipse
 * - ensureEclipseAppExists() : Crée l'app Eclipse avec les bons chemins
 * - applyEclipseDefaultPreset() : Applique le preset par défaut
 */

const fs = require('fs');
const path = require('path');

/**
 * Template minimal pour sunshine.conf
 * Toutes les autres valeurs seront configurées par Eclipse au premier lancement
 */
const SUNSHINE_CONF_TEMPLATE = `# Eclipse Sunshine Configuration - Clean Template
# All settings will be configured by Eclipse on first launch

# Minimum required settings (pre-configured for Eclipse)
upnp = disabled
system_tray = disabled

# Display settings will be configured after VDD detection
# Credentials will be set via user onboarding
# App "Eclipse" will be created at first launch
`;

/**
 * Template minimal pour apps.json
 * L'app Eclipse sera ajoutée par ensureEclipseAppExists() au premier lancement
 */
const APPS_JSON_TEMPLATE = {
  apps: [],
  env: {}
};

/**
 * Fichiers à supprimer (données personnelles ou état runtime)
 */
const FILES_TO_DELETE = [
  'eclipse_setup_complete.flag',  // Flag de setup - doit être recréé
  'sunshine_state.json',          // État runtime
  'sunshine.log',                 // Logs
];

/**
 * Patterns de fichiers à supprimer (backups, etc.)
 */
const PATTERNS_TO_DELETE = [
  /^sunshine\.conf\.backup\./,    // Backups de config
];

/**
 * Dossiers à supprimer entièrement (seront régénérés)
 */
const FOLDERS_TO_DELETE = [
  'credentials',  // Certificats SSL - régénérés au premier lancement
];

/**
 * Nettoie la config Sunshine dans le dossier spécifié
 * @param {string} configDir - Chemin vers le dossier config de Sunshine
 */
function cleanSunshineConfig(configDir) {
  console.log('[CleanSunshineConfig] Cleaning Sunshine config at:', configDir);

  if (!fs.existsSync(configDir)) {
    console.log('[CleanSunshineConfig] Config directory does not exist, skipping');
    return;
  }

  // 1. Réinitialiser sunshine.conf
  const sunshineConfPath = path.join(configDir, 'sunshine.conf');
  console.log('[CleanSunshineConfig] Resetting sunshine.conf');
  fs.writeFileSync(sunshineConfPath, SUNSHINE_CONF_TEMPLATE, 'utf-8');

  // 2. Réinitialiser apps.json
  const appsJsonPath = path.join(configDir, 'apps.json');
  console.log('[CleanSunshineConfig] Resetting apps.json');
  fs.writeFileSync(appsJsonPath, JSON.stringify(APPS_JSON_TEMPLATE, null, 2), 'utf-8');

  // 3. Supprimer les fichiers spécifiques
  for (const file of FILES_TO_DELETE) {
    const filePath = path.join(configDir, file);
    if (fs.existsSync(filePath)) {
      try {
        console.log('[CleanSunshineConfig] Deleting:', file);
        fs.unlinkSync(filePath);
      } catch (err) {
        // Fichier peut être verrouillé si Sunshine tourne (en dev)
        // En packaging, ce ne sera pas le cas
        console.log('[CleanSunshineConfig] Could not delete (may be locked):', file, err.code);
      }
    }
  }

  // 4. Supprimer les fichiers matchant les patterns
  const files = fs.readdirSync(configDir);
  for (const file of files) {
    for (const pattern of PATTERNS_TO_DELETE) {
      if (pattern.test(file)) {
        const filePath = path.join(configDir, file);
        try {
          console.log('[CleanSunshineConfig] Deleting (pattern match):', file);
          fs.unlinkSync(filePath);
        } catch (err) {
          console.log('[CleanSunshineConfig] Could not delete:', file, err.code);
        }
        break;
      }
    }
  }

  // 5. Supprimer les dossiers
  for (const folder of FOLDERS_TO_DELETE) {
    const folderPath = path.join(configDir, folder);
    if (fs.existsSync(folderPath)) {
      try {
        console.log('[CleanSunshineConfig] Deleting folder:', folder);
        fs.rmSync(folderPath, { recursive: true, force: true });
      } catch (err) {
        console.log('[CleanSunshineConfig] Could not delete folder:', folder, err.code);
      }
    }
  }

  console.log('[CleanSunshineConfig] Cleanup complete!');
}

// Si exécuté directement (pour tests manuels)
if (require.main === module) {
  const configDir = process.argv[2] || path.join(__dirname, '..', 'resources', 'tools', 'Sunshine', 'config');
  cleanSunshineConfig(configDir);
}

module.exports = { cleanSunshineConfig };
