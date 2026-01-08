export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`);
    this.name = 'FileNotFoundError';
  }
}

export class FileExistsError extends Error {
  constructor(path: string) {
    super(`File already exists: ${path}`);
    this.name = 'FileExistsError';
  }
}
