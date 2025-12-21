import { TagId } from '../types/tags';

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
