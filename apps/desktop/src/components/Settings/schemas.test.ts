import { describe, expect, it } from 'vitest';
import { getSections } from './schemas';
import { DEFAULT_FONT_SIZE } from '../../settings/defaults';

const getAppearanceRows = (isLinux: boolean) => {
  const sections = getSections([], '0.1.0', new Set<string>(), isLinux);
  const appearance = sections.find((section) => section.id === 'appearance');
  expect(appearance).toBeDefined();
  return appearance!.groups[0].rows;
};

const getEditorSection = () => {
  const sections = getSections([], '0.1.0', new Set<string>(), false);
  const editor = sections.find((section) => section.id === 'editor');
  expect(editor).toBeDefined();
  return editor!;
};

const getDeveloperSection = () => {
  const sections = getSections([], '0.1.0', new Set<string>(), false);
  const developer = sections.find((section) => section.id === 'developer');
  expect(developer).toBeDefined();
  return developer!;
};

describe('settings appearance schema', () => {
  it('hides system accent control on non-Linux', () => {
    const rows = getAppearanceRows(false);
    expect(rows.some((row) => row.id === 'system-accent')).toBe(false);
  });

  it('shows system accent control on Linux with Canadian spelling', () => {
    const rows = getAppearanceRows(true);
    const accentRow = rows.find((row) => row.id === 'system-accent');
    expect(accentRow).toBeDefined();
    expect(accentRow?.label).toBe('Use system accent colour');
    expect(accentRow?.description).toContain('accent colour');
  });

  it('sets font size slider default to app default font size', () => {
    const rows = getAppearanceRows(false);
    const fontSizeRow = rows.find((row) => row.id === 'font-size');
    expect(fontSizeRow).toBeDefined();
    expect(fontSizeRow?.controls[0].kind).toBe('slider');
    expect(fontSizeRow?.controls[0].defaultValue).toBe(DEFAULT_FONT_SIZE);
  });
});

describe('settings editor schema', () => {
  it('defaults show line numbers to disabled', () => {
    const editor = getEditorSection();
    const behaviourGroup = editor.groups.find((group) => group.id === 'behaviour');
    const lineNumberRow = behaviourGroup?.rows.find((row) => row.id === 'show-line-numbers');
    expect(lineNumberRow).toBeDefined();
    expect(lineNumberRow?.controls[0].key).toBe('editor.showLineNumbers');
    expect(lineNumberRow?.controls[0].defaultValue).toBe(false);
  });

  it('includes highlight active line control with default false', () => {
    const editor = getEditorSection();
    const behaviourGroup = editor.groups.find((group) => group.id === 'behaviour');
    expect(behaviourGroup).toBeDefined();

    const activeLineRow = behaviourGroup?.rows.find((row) => row.id === 'highlight-active-line');
    expect(activeLineRow).toBeDefined();
    expect(activeLineRow?.controls[0].key).toBe('editor.highlightActiveLine');
    expect(activeLineRow?.controls[0].defaultValue).toBe(false);
  });

  it('defaults word wrap to enabled', () => {
    const editor = getEditorSection();
    const behaviourGroup = editor.groups.find((group) => group.id === 'behaviour');
    const wordWrapRow = behaviourGroup?.rows.find((row) => row.id === 'word-wrap');
    expect(wordWrapRow).toBeDefined();
    expect(wordWrapRow?.controls[0].key).toBe('editor.wordWrap');
    expect(wordWrapRow?.controls[0].defaultValue).toBe(true);
  });

  it('defaults spellcheck to enabled', () => {
    const editor = getEditorSection();
    const spellcheckGroup = editor.groups.find((group) => group.id === 'spellcheck');
    const spellcheckRow = spellcheckGroup?.rows.find((row) => row.id === 'spellcheck-enabled');
    expect(spellcheckRow).toBeDefined();
    expect(spellcheckRow?.controls[0].key).toBe('editor.spellcheck.enabled');
    expect(spellcheckRow?.controls[0].defaultValue).toBe(true);
  });
});

describe('settings developer schema', () => {
  it('includes show front matter toggle defaulting to disabled', () => {
    const developer = getDeveloperSection();
    const visibilityGroup = developer.groups.find((group) => group.id === 'developer-visibility');
    const showFrontmatterRow = visibilityGroup?.rows.find((row) => row.id === 'show-frontmatter');
    expect(showFrontmatterRow).toBeDefined();
    expect(showFrontmatterRow?.controls[0].key).toBe('developer.showFrontmatter');
    expect(showFrontmatterRow?.controls[0].defaultValue).toBe(false);
  });
});
