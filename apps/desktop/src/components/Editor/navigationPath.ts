export function resolveNavigablePath(
  path: string,
  resolvePath: (targetRaw: string) => string | undefined
): string {
  const trimmed = path.trim();
  if (!trimmed) return path;
  if (trimmed.endsWith('.md')) return trimmed;

  return resolvePath(trimmed) ?? trimmed;
}
