export const STORAGE_KEYS = {
    ACTIVE_VAULT: 'liminal_active_vault',
    PINNED_ITEMS: 'liminal_pinned_items',
    RECENT_ITEMS: 'liminal_recent_items',
} as const;

export const vaultScopedKey = (baseKey: string, vaultId?: string | null): string =>
    vaultId ? `${baseKey}::${vaultId}` : baseKey;
