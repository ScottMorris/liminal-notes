export interface VaultConfig {
  root_path: string;
  name: string;
}

export interface FileEntry {
  path: string;
  is_dir: boolean;
}

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}
