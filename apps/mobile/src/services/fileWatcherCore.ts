import { VaultAdapter } from '@liminal-notes/vault-core/types';

export type FileWatcherEvent =
  | { type: 'created'; path: string }
  | { type: 'deleted'; path: string }
  | { type: 'modified'; path: string };

export interface AppStateLike {
  currentState: string;
  addEventListener: (event: 'change', callback: (nextAppState: string) => void) => unknown;
}

export interface EventEmitterLike {
  emit: (eventName: string, payload: FileWatcherEvent) => void;
}

export class FileWatcherServiceCore {
  private vault: VaultAdapter | null = null;
  private activeVaultId: string | null = null;
  private fileSnapshot: Map<string, number>; // path -> mtime
  private intervalId: NodeJS.Timeout | null = null;
  private isScanning = false;
  private isInitialized = false;

  constructor(
    private appState: AppStateLike,
    private emitter: EventEmitterLike
  ) {
    this.fileSnapshot = new Map();
  }

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.appState.addEventListener('change', this.handleAppStateChange);
    this.startInterval();
  }

  async bindVault(vault: VaultAdapter | null, vaultId: string | null) {
    const changed = this.vault !== vault || this.activeVaultId !== vaultId;
    this.vault = vault;
    this.activeVaultId = vaultId;

    if (!changed) return;

    this.fileSnapshot.clear();
    if (!this.vault) return;

    if (this.vault.init) {
      await this.vault.init();
    }

    await this.performScan(true);
  }

  private startInterval() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      if (this.appState.currentState === 'active') {
        void this.performScan();
      }
    }, 30000);
  }

  private handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active') {
      void this.performScan();
      this.startInterval();
    } else if (nextAppState === 'background') {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }
  };

  async performScan(silent = false) {
    if (this.isScanning || !this.vault) return;
    this.isScanning = true;

    try {
      const files = await this.vault.listFiles();
      const currentMap = new Map<string, number>();

      files.forEach(f => {
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
    for (const [path, mtime] of curr.entries()) {
      const prevMtime = prev.get(path);

      if (prevMtime === undefined) {
        this.emit('created', path);
      } else if (mtime > prevMtime) {
        this.emit('modified', path);
      }
    }

    for (const path of prev.keys()) {
      if (!curr.has(path)) {
        this.emit('deleted', path);
      }
    }
  }

  private emit(type: 'created' | 'deleted' | 'modified', path: string) {
    this.emitter.emit('vault:file-event', { type, path });
  }

  async notifyInternalWrite(path: string) {
    try {
      if (!this.vault?.stat) return;
      const stats = await this.vault.stat(path);
      if (stats.isFile && stats.mtimeMs) {
        this.fileSnapshot.set(path, stats.mtimeMs);
      }
    } catch {}
  }
}
