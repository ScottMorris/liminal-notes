import { describe, expect, it } from 'vitest';
import { createTitleBarMenuModel } from './TitleBar';

describe('createTitleBarMenuModel', () => {
  it('uses checked checkbox icon when Always on Top is enabled', () => {
    const model = createTitleBarMenuModel(false, true);
    const alwaysOnTop = model.sections[2]?.items[0];

    if (!alwaysOnTop) {
      throw new Error('Unexpected menu model shape');
    }

    expect(alwaysOnTop.id).toBe('always-on-top');
    expect(alwaysOnTop.icon).toBe('checkbox-checked');
  });

  it('uses empty checkbox icon when Always on Top is disabled', () => {
    const model = createTitleBarMenuModel(false, false);
    const alwaysOnTop = model.sections[2]?.items[0];

    if (!alwaysOnTop) {
      throw new Error('Unexpected menu model shape');
    }

    expect(alwaysOnTop.icon).toBe('checkbox-empty');
  });
});
