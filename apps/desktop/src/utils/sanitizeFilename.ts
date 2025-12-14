// Windows-safe filename sanitization
export function sanitizeFilename(name: string): string {
  // Regex explains:
  // - [<>:"/\\|?*\x00-\x1F]: Illegal characters in Windows (and generally unsafe)
  // - \s+: Replace all whitespace with single dash
  // - ^\.+: Remove leading dots (hidden files on Unix)
  // - substring(0, 255): Max filename length

  const sanitized = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid chars
    .trim()                                // Trim whitespace ends
    .replace(/\s+/g, '-')                  // Spaces to dashes
    .replace(/^\.+/, '');                  // No leading dots

  return sanitized.substring(0, 255);      // Max length
}
