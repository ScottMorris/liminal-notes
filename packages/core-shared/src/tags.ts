export type TagId = string; // kebab-case

export type TagSource = 'human' | 'folder' | 'ai';

export interface Tag {
  id: TagId;
  displayName: string;
  color?: string;
  createdAt: number;
  aiAutoApprove?: boolean;
}

export interface TagMeta {
  source: TagSource;
  // Optional timestamp or confidence can be added later
}

// Map of tagId -> TagMeta
export type TagProvenance = Record<TagId, TagMeta>;

export interface TagIndexEntry {
  tags: TagId[];
  mtime?: number;
}

// Map of notePath -> TagIndexEntry
export type TagIndex = Record<string, TagIndexEntry>;

export interface TagCatalogue {
    tags: Record<TagId, Tag>;
}

export function normalizeTagId(input: string): TagId {
    return input
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric chars (except hyphen)
        .replace(/-+/g, '-') // Collapse multiple hyphens
        .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens
}

export function deriveTagsFromPath(path: string): TagId[] {
    // Remove filename
    const parts = path.split('/');
    parts.pop(); // Remove filename

    // Filter out empty parts (e.g. leading slash result)
    return parts
        .filter(p => p.length > 0)
        .map(normalizeTagId)
        .filter(t => t.length > 0);
}

// Helper to convert TagId to a friendly display name (if no explicit display name exists)
export function humanizeTagId(tagId: TagId): string {
    return tagId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
