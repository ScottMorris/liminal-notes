import '@testing-library/jest-dom';

class MockWorker implements Partial<Worker> {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;

  constructor(_url?: string | URL, _options?: WorkerOptions) {}

  postMessage(_message: unknown): void {}

  terminate(): void {}

  addEventListener(): void {}

  removeEventListener(): void {}

  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

Object.defineProperty(globalThis, 'Worker', {
  writable: true,
  value: MockWorker as unknown as typeof Worker,
});
