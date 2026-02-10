import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerFileTreeRefreshListeners } from './FileTree';

describe('registerFileTreeRefreshListeners', () => {
  const callbacks = new Map<string, () => void>();
  const unlistenMocks: Array<ReturnType<typeof vi.fn>> = [];
  const onRefresh = vi.fn(async () => {});

  const listenSpy = vi.fn(async (event: string, handler: () => void) => {
    callbacks.set(event, handler);
    const unlisten = vi.fn();
    unlistenMocks.push(unlisten);
    return unlisten;
  });

  beforeEach(() => {
    callbacks.clear();
    unlistenMocks.length = 0;
    onRefresh.mockClear();
    listenSpy.mockClear();
  });

  it('subscribes to created and deleted events only', async () => {
    const cleanup = registerFileTreeRefreshListeners(listenSpy, onRefresh);

    expect(listenSpy).toHaveBeenCalledTimes(2);
    expect(callbacks.has('vault:file-created')).toBe(true);
    expect(callbacks.has('vault:file-deleted')).toBe(true);
    expect(callbacks.has('vault:file-modified')).toBe(false);

    callbacks.get('vault:file-created')?.();
    callbacks.get('vault:file-deleted')?.();

    expect(onRefresh).toHaveBeenCalledTimes(2);

    cleanup();
    await Promise.resolve();

    expect(unlistenMocks).toHaveLength(2);
    unlistenMocks.forEach((unlisten) => {
      expect(unlisten).toHaveBeenCalledTimes(1);
    });
  });
});
