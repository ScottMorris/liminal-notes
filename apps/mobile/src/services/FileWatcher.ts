import { AppState, AppStateStatus } from 'react-native';
import { MobileSandboxVaultAdapter } from '../adapters/MobileSandboxVaultAdapter';
import { VaultFileEntry } from '@liminal-notes/vault-core/types';
import { DeviceEventEmitter } from 'react-native';

// Event types
export type FileWatcherEvent =
  | { type: 'created'; path: string }
  | { type: 'deleted'; path: string }
  | { type: 'modified'; path: string };

class FileWatcherService {
  private vault: MobileSandboxVaultAdapter;
  private fileSnapshot: Map<string, number>; // path -> mtime
  private intervalId: NodeJS.Timeout | null = null;
  private isScanning = false;
  private isInitialized = false;

  constructor() {
    this.vault = new MobileSandboxVaultAdapter();
    this.fileSnapshot = new Map();
  }

  /**
   * Initialize the watcher.
   * Loads initial state and sets up listeners.
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    await this.vault.init();
    await this.performScan(true); // Initial silent scan

    // App State Listener (Focus)
    AppState.addEventListener('change', this.handleAppStateChange);

    // Periodic Interval (every 30s)
    this.startInterval();
  }

  private startInterval() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        this.performScan();
      }
    }, 30000);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // Immediate scan on focus
      this.performScan();
      // Restart interval to align with activity
      this.startInterval();
    } else if (nextAppState === 'background') {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }
  };

  /**
   * Scans the vault and compares with snapshot to detect changes.
   */
  async performScan(silent = false) {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      const files = await this.vault.listFiles();
      const currentMap = new Map<string, number>();

      files.forEach(f => {
        // Only track files, not directories, for modification purposes
        // Although directory creation is interesting, we focus on files for now.
        if (f.type === 'file') {
             currentMap.set(f.id, f.mtimeMs || 0);
        }
      });

      if (!silent) {
          this.diff(this.fileSnapshot, currentMap);
      }

      this.fileSnapshot = currentMap;

    } catch (e) {
      console.warn('[FileWatcher] Scan failed:', e);
    } finally {
      this.isScanning = false;
    }
  }

  private diff(prev: Map<string, number>, curr: Map<string, number>) {
    // Detect Created & Modified
    for (const [path, mtime] of curr.entries()) {
      const prevMtime = prev.get(path);

      if (prevMtime === undefined) {
        // Created
        this.emit('created', path);
      } else if (mtime > prevMtime) {
        // Modified
        this.emit('modified', path);
      }
    }

    // Detect Deleted
    for (const path of prev.keys()) {
      if (!curr.has(path)) {
        this.emit('deleted', path);
      }
    }
  }

  private emit(type: 'created' | 'deleted' | 'modified', path: string) {
    // console.log(`[FileWatcher] ${type}: ${path}`);
    DeviceEventEmitter.emit('vault:file-event', { type, path });
  }

  // Allow manual trigger (e.g., after internal save to update snapshot without emitting)
  // Or actually, internal save *should* update snapshot to avoid false positive on next scan?
  // Yes, if we save internally, file mtime changes. Next scan will see it as "modified".
  // Ideally, the internal write operation should update this service's snapshot.
  async notifyInternalWrite(path: string) {
      try {
        const stats = await this.vault.stat(path);
        if (stats.isFile && stats.mtimeMs) {
            this.fileSnapshot.set(path, stats.mtimeMs);
        }
      } catch {}
  }
}

export const fileWatcher = new FileWatcherService();
