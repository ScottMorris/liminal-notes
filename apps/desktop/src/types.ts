export interface VaultConfig {
  root_path: string;
  name: string;
}

export interface FileEntry {
  path: string;
  is_dir: boolean;
  mtime?: number;
}

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

export type NotePath = string;

export interface Wikilink {
  source: NotePath;
  targetRaw: string;
  targetPath?: NotePath;
}

export interface LinkIndex {
  outbound: Map<NotePath, Wikilink[]>;
  backlinks: Map<NotePath, NotePath[]>;
}
