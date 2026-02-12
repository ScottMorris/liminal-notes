import { describe, expect, it } from 'vitest';
import { createTitleBarMenuModel } from './TitleBar';

describe('createTitleBarMenuModel', () => {
  it('marks Always on Top as checked when enabled', () => {
    const model = createTitleBarMenuModel(false, true);
    const alwaysOnTop = model.sections[2]?.items[0];

    if (!alwaysOnTop || !('checked' in alwaysOnTop)) {
      throw new Error('Unexpected menu model shape');
    }

    expect(alwaysOnTop.id).toBe('always-on-top');
    expect(alwaysOnTop.checked).toBe(true);
  });

  it('marks Always on Top as unchecked when disabled', () => {
    const model = createTitleBarMenuModel(false, false);
    const alwaysOnTop = model.sections[2]?.items[0];

    if (!alwaysOnTop || !('checked' in alwaysOnTop)) {
      throw new Error('Unexpected menu model shape');
    }

    expect(alwaysOnTop.checked).toBe(false);
  });
});
