import { Buffer } from 'buffer';
import matter from 'gray-matter';

// Polyfill Buffer for environments (React Native) where it is not defined
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

export interface FrontmatterResult<T = { [key: string]: any }> {
  data: T;
  content: string;
}

/**
 * Parses frontmatter from markdown content.
 */
export function parseFrontmatter<T = { [key: string]: any }>(text: string): FrontmatterResult<T> {
  try {
    const parsed = matter(text);
    return {
      data: parsed.data as T,
      content: parsed.content
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error parsing frontmatter:', msg);
    // Fallback if parsing fails: return empty data and full text as content
    return { data: {} as T, content: text };
  }
}

/**
 * Updates frontmatter fields and re-stringifies the content.
 * @param fullText The original full markdown text.
 * @param updater A function that receives the current data object and modifies it.
 * @returns The new full markdown text with updated frontmatter.
 */
export function updateFrontmatter<T = { [key: string]: any }>(
  fullText: string,
  updater: (data: T) => void
): string {
  try {
    let parsed;
    try {
      parsed = matter(fullText);
    } catch (err) {
      // If the existing frontmatter is malformed, fall back to treating the whole text as content
      // so we can rebuild a valid frontmatter block.
      parsed = {
        data: {} as T,
        content: fullText
      };
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Invalid frontmatter encountered, rebuilding with updater. Reason:', msg);
    }

    // Create a clone or modify in place
    updater(parsed.data as T);

    // Re-stringify
    // matter.stringify takes (content, data)
    // Note: parsed.content has the body without frontmatter.
    return matter.stringify(parsed.content, parsed.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error updating frontmatter:', msg);
    return fullText;
  }
}
