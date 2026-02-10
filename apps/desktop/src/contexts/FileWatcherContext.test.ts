import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerFileWatchListeners } from './FileWatcherContext';

type Handler = (event: { payload: { path: string } }) => Promise<void> | void;

describe('registerFileWatchListeners', () => {
  const updateSearch = vi.fn(async () => {});
  const removeSearch = vi.fn(async () => {});
  const updateLinks = vi.fn(async () => {});
  const removeLinks = vi.fn(async () => {});

  const callbacks = new Map<string, Handler>();
  const unlistenMocks: Array<ReturnType<typeof vi.fn>> = [];

  const listenSpy = vi.fn(async (eventName: string, callback: Handler) => {
    callbacks.set(eventName, callback);
    const unlisten = vi.fn();
    unlistenMocks.push(unlisten);
    return unlisten;
  });
  const listenFn = listenSpy as unknown as Parameters<typeof registerFileWatchListeners>[0];

  beforeEach(() => {
    callbacks.clear();
    unlistenMocks.length = 0;
    listenSpy.mockClear();
    updateSearch.mockClear();
    removeSearch.mockClear();
    updateLinks.mockClear();
    removeLinks.mockClear();
  });

  it('updates and removes index entries for file events and cleans listeners on dispose', async () => {
    const cleanup = registerFileWatchListeners(listenFn, {
      updateSearch,
      removeSearch,
      updateLinks,
      removeLinks,
    });

    expect(listenSpy).toHaveBeenCalledTimes(3);
    expect(callbacks.has('vault:file-created')).toBe(true);
    expect(callbacks.has('vault:file-changed')).toBe(true);
    expect(callbacks.has('vault:file-deleted')).toBe(true);

    await callbacks.get('vault:file-created')?.({ payload: { path: 'new.md' } });
    expect(updateSearch).toHaveBeenCalledWith('new.md');
    expect(updateLinks).toHaveBeenCalledWith('new.md');

    await callbacks.get('vault:file-changed')?.({ payload: { path: 'updated.md' } });
    expect(updateSearch).toHaveBeenCalledWith('updated.md');
    expect(updateLinks).toHaveBeenCalledWith('updated.md');

    await callbacks.get('vault:file-deleted')?.({ payload: { path: 'deleted.md' } });
    expect(removeSearch).toHaveBeenCalledWith('deleted.md');
    expect(removeLinks).toHaveBeenCalledWith('deleted.md');

    cleanup();
    await Promise.resolve();

    expect(unlistenMocks).toHaveLength(3);
    unlistenMocks.forEach((unlisten) => {
      expect(unlisten).toHaveBeenCalledTimes(1);
    });
  });
});
