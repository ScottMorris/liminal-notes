import matter from 'gray-matter';

export interface FrontmatterResult {
  data: { [key: string]: any };
  content: string;
}

/**
 * Parses frontmatter from markdown content.
 */
export function parseFrontmatter(text: string): FrontmatterResult {
  try {
    const parsed = matter(text);
    return {
      data: parsed.data,
      content: parsed.content
    };
  } catch (err) {
    console.error('Error parsing frontmatter:', err);
    // Fallback if parsing fails: return empty data and full text as content
    return { data: {}, content: text };
  }
}

/**
 * Updates frontmatter fields and re-stringifies the content.
 * @param fullText The original full markdown text.
 * @param updater A function that receives the current data object and modifies it.
 * @returns The new full markdown text with updated frontmatter.
 */
export function updateFrontmatter(
  fullText: string,
  updater: (data: { [key: string]: any }) => void
): string {
  try {
    const parsed = matter(fullText);

    // Create a clone or modify in place
    updater(parsed.data);

    // Re-stringify
    // matter.stringify takes (content, data)
    // Note: parsed.content has the body without frontmatter.
    return matter.stringify(parsed.content, parsed.data);
  } catch (err) {
    console.error('Error updating frontmatter:', err);
    return fullText;
  }
}
