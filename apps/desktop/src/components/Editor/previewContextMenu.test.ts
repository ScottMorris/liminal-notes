import { describe, expect, it, vi } from 'vitest';
import { createPreviewContextMenuModel } from './previewContextMenu';

describe('createPreviewContextMenuModel', () => {
  it('creates copy actions enabled when selection exists', () => {
    const copyText = vi.fn();
    const copyHtml = vi.fn();

    const model = createPreviewContextMenuModel(true, { copyText, copyHtml });
    const copyItem = model.sections[0]?.items[0];
    const copyHtmlItem = model.sections[0]?.items[1];

    expect(copyItem && 'disabled' in copyItem ? copyItem.disabled : undefined).toBe(false);
    expect(copyHtmlItem && 'disabled' in copyHtmlItem ? copyHtmlItem.disabled : undefined).toBe(false);

    if (!copyItem || !copyHtmlItem || !('action' in copyItem) || !('action' in copyHtmlItem)) {
      throw new Error('Unexpected menu item shape');
    }

    copyItem.action?.();
    copyHtmlItem.action?.();

    expect(copyText).toHaveBeenCalledTimes(1);
    expect(copyHtml).toHaveBeenCalledTimes(1);
  });

  it('disables copy actions when selection is empty', () => {
    const model = createPreviewContextMenuModel(false, {
      copyText: vi.fn(),
      copyHtml: vi.fn()
    });

    const copyItem = model.sections[0]?.items[0];
    const copyHtmlItem = model.sections[0]?.items[1];

    expect(copyItem && 'disabled' in copyItem ? copyItem.disabled : undefined).toBe(true);
    expect(copyHtmlItem && 'disabled' in copyHtmlItem ? copyHtmlItem.disabled : undefined).toBe(true);
  });
});
