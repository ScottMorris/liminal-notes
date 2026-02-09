import { describe, expect, it, vi } from 'vitest';
import { createSingleFlightRunner, deriveVaultDisplayName } from './vaultPickerFlow';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('vaultPickerFlow', () => {
  it('derives vault name from POSIX path', () => {
    expect(deriveVaultDisplayName('/tmp/my-vault')).toBe('my-vault');
  });

  it('derives vault name from Windows path', () => {
    expect(deriveVaultDisplayName('C:\\Users\\Scott\\Notes')).toBe('Notes');
  });

  it('runs only one task while another task is in flight', async () => {
    const runSingleFlight = createSingleFlightRunner();
    const pending = deferred<void>();
    const task = vi.fn(async () => pending.promise);

    const firstRun = runSingleFlight(task);
    const secondRun = await runSingleFlight(task);

    expect(task).toHaveBeenCalledTimes(1);
    expect(secondRun).toBe(false);

    pending.resolve();
    await expect(firstRun).resolves.toBe(true);

    await expect(runSingleFlight(task)).resolves.toBe(true);
    expect(task).toHaveBeenCalledTimes(2);
  });
});
