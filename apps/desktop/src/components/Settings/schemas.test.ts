import { describe, expect, it } from 'vitest';
import { getSections } from './schemas';
import { DEFAULT_FONT_SIZE } from '../../settings/defaults';

const getAppearanceRows = (isLinux: boolean) => {
  const sections = getSections([], '0.1.0', new Set<string>(), isLinux);
  const appearance = sections.find((section) => section.id === 'appearance');
  expect(appearance).toBeDefined();
  return appearance!.groups[0].rows;
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
