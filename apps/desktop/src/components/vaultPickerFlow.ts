export function deriveVaultDisplayName(path: string): string {
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.split("/").pop() || "Vault";
}

export function createSingleFlightRunner() {
  let inFlight = false;

  return async (task: () => Promise<void>): Promise<boolean> => {
    if (inFlight) {
      return false;
    }

    inFlight = true;
    try {
      await task();
      return true;
    } finally {
      inFlight = false;
    }
  };
}
