/**
 * SunshineEventMonitor - Story 9.5 (AC7)
 *
 * Monitoring de l'état de streaming Sunshine avec polling.
 * Détecte les transitions d'état et émet des événements internes.
 *
 * IMPORTANT: Utilise le fichier d'état Eclipse (%TEMP%\eclipse_state.json)
 * créé par le script DO et supprimé par le script UNDO pour une détection
 * fiable et synchronisée avec Sunshine.
 */
import { EventEmitter } from 'events';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { SunshineClient } from '../../src/infrastructure/sunshine';
import { SunshineStatus } from '../../src/domain/types';
import { getCredentialStorage } from '../../src/infrastructure/storage/credential-storage';
import type { Credentials } from '../../src/domain/types';

// Fichier d'état créé par eclipse-do.ps1 et supprimé par eclipse-undo.ps1
const ECLIPSE_STATE_FILE = path.join(os.tmpdir(), 'eclipse_state.json');

export type StreamState = 'idle' | 'streaming' | 'paused';

interface StreamStartedEvent {
  deviceName?: string;
}

const CREDENTIALS_KEY = 'sunshine-credentials';

export class SunshineEventMonitor extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private currentState: StreamState = 'idle';
  private pollingInterval = 4000; // 4 secondes (dans la plage 3-5 sec de l'AC7)
  private sunshineClient: SunshineClient;
  private running = false;

  constructor() {
    super();
    this.sunshineClient = new SunshineClient();
  }

  /**
   * Démarre le monitoring avec polling
   */
  start(): void {
    if (this.running) return;

    this.running = true;

    // Check immédiat au démarrage (via setTimeout(0) pour cohérence avec fake timers)
    setTimeout(() => this.checkState(), 0);

    // Puis polling régulier
    this.intervalId = setInterval(() => this.checkState(), this.pollingInterval);
  }

  /**
   * Arrête le monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
  }

  /**
   * Retourne l'état courant du streaming
   */
  getCurrentState(): StreamState {
    return this.currentState;
  }

  /**
   * Vérifie si le monitor est en cours d'exécution
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Charge les credentials pour l'authentification Sunshine
   */
  private async loadCredentials(): Promise<void> {
    try {
      const storage = getCredentialStorage();
      if (storage.isAvailable()) {
        const credsJson = await storage.load(CREDENTIALS_KEY);
        if (credsJson) {
          const creds = JSON.parse(credsJson) as Credentials;
          this.sunshineClient.setCredentials(creds.username, creds.password);
        }
      }
    } catch (error) {
      console.warn('[SunshineEventMonitor] Failed to load credentials:', error);
    }
  }

  /**
   * Vérifie l'état de Sunshine et gère les transitions.
   *
   * LOGIQUE DE DÉTECTION (synchronisée avec scripts DO/UNDO):
   * - Le script DO crée %TEMP%\eclipse_state.json quand le stream démarre
   * - Le script UNDO supprime ce fichier quand le stream se termine vraiment
   * - On vérifie l'existence de ce fichier pour une détection fiable
   */
  private async checkState(): Promise<void> {
    try {
      await this.loadCredentials();

      // Méthode fiable: vérifier le fichier d'état créé par les scripts DO/UNDO
      const newState = this.detectStreamStateFromFile();

      // Debug logging
      console.log(`[SunshineEventMonitor] State file exists: ${existsSync(ECLIPSE_STATE_FILE)}, State: ${this.currentState} → ${newState}`);

      if (newState !== this.currentState) {
        this.handleStateChange(this.currentState, newState);
        this.currentState = newState;
      }
    } catch (error) {
      // Sunshine peut être temporairement indisponible, on log mais on continue
      console.warn('[SunshineEventMonitor] Failed to check Sunshine state:', error);
    }
  }

  /**
   * Détecte l'état du stream via le fichier d'état Eclipse.
   *
   * - Fichier présent → stream actif (DO script a été exécuté)
   * - Fichier absent → pas de stream (UNDO script a été exécuté ou jamais de stream)
   *
   * Cette méthode est synchronisée avec les notifications Sunshine car
   * les scripts DO/UNDO sont exécutés par Sunshine au même moment.
   */
  private detectStreamStateFromFile(): StreamState {
    try {
      if (existsSync(ECLIPSE_STATE_FILE)) {
        return 'streaming';
      }
      return 'idle';
    } catch (error) {
      console.warn('[SunshineEventMonitor] Failed to check state file:', error);
      return 'idle';
    }
  }

  /**
   * @deprecated Utiliser detectStreamStateFromFile() à la place
   * Mappe un SunshineStatus vers un StreamState (basé sur les logs - moins fiable)
   */
  private mapStatusToState(status: SunshineStatus): StreamState {
    switch (status) {
      case SunshineStatus.STREAMING:
        return 'streaming';
      case SunshineStatus.ONLINE:
      case SunshineStatus.OFFLINE:
      case SunshineStatus.AUTH_REQUIRED:
      case SunshineStatus.UNKNOWN:
      default:
        return 'idle';
    }
  }

  /**
   * Gère les transitions d'état et émet les événements appropriés
   */
  private handleStateChange(oldState: StreamState, newState: StreamState): void {
    console.log(`[SunshineEventMonitor] State change: ${oldState} → ${newState}`);

    // idle → streaming
    if (oldState === 'idle' && newState === 'streaming') {
      const event: StreamStartedEvent = {
        deviceName: undefined, // TODO: récupérer le nom de l'appareil si disponible
      };
      this.emit('stream-started', event);
    }

    // streaming → paused
    if (oldState === 'streaming' && newState === 'paused') {
      this.emit('stream-paused');
    }

    // paused → streaming
    if (oldState === 'paused' && newState === 'streaming') {
      this.emit('stream-resumed');
    }

    // streaming/paused → idle
    if ((oldState === 'streaming' || oldState === 'paused') && newState === 'idle') {
      this.emit('stream-ended');
    }
  }
}

// Singleton pour utilisation globale
export const sunshineEventMonitor = new SunshineEventMonitor();
