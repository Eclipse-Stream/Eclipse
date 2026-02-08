// VDD Constants - Centralisation des valeurs magiques
// Évite la dispersion des strings/chemins dans le code

/**
 * Hardware ID du driver VDD MttVDD
 */
export const VDD_HARDWARE_ID = "Root\\MttVDD";

/**
 * Nom du fichier de configuration Eclipse VDD
 */
export const VDD_CONFIG_FILE_NAME = "eclipse-vdd-config.json";

/**
 * Nom du fichier de configuration pour le device_id Sunshine
 */
export const VDD_DEVICE_ID_CONFIG_FILE = "vdd-config.json";

/**
 * @deprecated Utiliser getSunshinePaths().logFile depuis SunshinePathsService
 * Chemin des logs Sunshine - maintenant dynamique via Sunshine portable
 */
export const SUNSHINE_LOG_PATH = ""; // Deprecated - use SunshinePathsService

/**
 * Chemins système où le driver MttVDD lit sa configuration
 */
export const VDD_SETTINGS_SYSTEM_PATHS = [
  "C:\\VirtualDisplayDriver\\vdd_settings.xml",
  "C:\\VDD\\vdd_settings.xml",
] as const;

/**
 * Nom du fichier de settings VDD
 */
export const VDD_SETTINGS_FILE_NAME = "vdd_settings.xml";

/**
 * Délai d'attente pour que Sunshine détecte le VDD (en ms)
 */
export const SUNSHINE_DETECTION_DELAY_MS = 4000;

/**
 * Délai d'attente après activation du VDD pour la config Sunshine (en ms)
 */
export const VDD_ENABLE_DELAY_MS = 1500;

/**
 * Mots-clés pour identifier un écran virtuel (VDD) dans les labels
 */
export const VIRTUAL_DISPLAY_KEYWORDS = [
  "vdd",
  "virtual",
  "mtt",
  "parsec",
  "dummy",
  "headless",
  "amyuni",
  "indirect",
  "remote",
] as const;
