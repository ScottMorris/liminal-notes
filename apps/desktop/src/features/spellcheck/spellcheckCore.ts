// Types (mirrored from worker)
export type SpellcheckWorker = Worker;

interface SpellcheckResponse {
  type: string;
  [key: string]: any;
}

class SpellcheckCore {
  private worker: Worker;
  private pendingRequests = new Map<string, (data: SpellcheckResponse) => void>();
  private listeners = new Set<(event: SpellcheckResponse) => void>();

  constructor() {
    this.worker = new Worker(new URL('../../workers/spellcheck.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.worker.onmessage = (event) => {
      const { id } = event.data;

      // Handle callbacks
      if (id && this.pendingRequests.has(id)) {
        this.pendingRequests.get(id)!(event.data);
        this.pendingRequests.delete(id);
      }

      // Notify listeners
      this.listeners.forEach(l => l(event.data));
    };
  }

  public check(text: string, ignoredWords: string[]): Promise<any> {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(7);
      this.pendingRequests.set(id, (data) => {
        resolve(data);
      });

      this.worker.postMessage({
        type: 'check',
        id,
        text,
        ignoredWords
      });
    });
  }

  public getSuggestions(word: string): Promise<string[]> {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(7);
      this.pendingRequests.set(id, (data) => {
        resolve(data.suggestions);
      });

      this.worker.postMessage({
        type: 'suggest',
        id,
        word
      });
    });
  }

  public addWord(word: string) {
    this.worker.postMessage({
      type: 'add',
      word
    });
  }

  public terminate() {
    this.worker.terminate();
  }
}

export const spellcheckCore = new SpellcheckCore();
