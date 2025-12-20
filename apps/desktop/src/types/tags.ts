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
